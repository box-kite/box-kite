import { describe, expect, it, vi } from 'vitest';
import { ignoreLogs } from '../../../../dev/tests';
import { DataGridProps, DataSourceRequest, DataSourceResult, GridDefinition } from '../contracts/dataGridContract';
import DetailRowModel from './detailRowModel';
import GridModel from './gridModel';
import RowModel from './rowModel';
import SourceRowModel from './sourceRowModel';

interface Order {
  id: number;
  customer: string;
  total: number;
}

const TOTAL = 1_000;

const orderAt = (index: number): Order => ({ id: index + 1, customer: `Customer ${index + 1}`, total: (index + 1) * 10 });

/** A datasource that answers immediately, and records every request it was asked. */
function createSource(overrides: Partial<DataSourceResult<Order>> = {}) {
  const requests: DataSourceRequest<Order>[] = [];

  const getRows = vi.fn((request: DataSourceRequest<Order>): Promise<DataSourceResult<Order>> => {
    requests.push(request);

    const rows = Array.from({ length: Math.max(0, Math.min(request.endRow, TOTAL) - request.startRow) }, (_, i) =>
      orderAt(request.startRow + i),
    );

    return Promise.resolve({ rows, totalCount: TOTAL, ...overrides });
  });

  return { getRows, requests };
}

/** A datasource whose answers are settled by hand, so an out-of-order reply can be arranged. */
function createDeferredSource() {
  const pending: { request: DataSourceRequest<Order>; resolve: (result: DataSourceResult<Order>) => void; reject: (e: unknown) => void }[] =
    [];

  const getRows = vi.fn(
    (request: DataSourceRequest<Order>) =>
      new Promise<DataSourceResult<Order>>((resolve, reject) => {
        pending.push({ request, resolve, reject });
      }),
  );

  return { getRows, pending };
}

const baseDef = (def: Partial<GridDefinition<Order>> = {}): GridDefinition<Order> => ({
  rowKey: 'id',
  columns: [
    { key: 'customer', header: 'Customer' },
    { key: 'total', header: 'Total' },
  ],
  visibleRowsCount: 10,
  ...def,
});

function createGrid(def: GridDefinition<Order>, overrides?: Partial<DataGridProps<Order>>) {
  const props: DataGridProps<Order> = { def, ...overrides };

  return new GridModel(props, vi.fn());
}

/** The grid's row list is a union with group rows; nothing here groups, so every row is a data row. */
const dataRow = <T>(grid: GridModel<T>, index: number) => grid.rows.value[index] as RowModel<T>;

/** How many row models the source has actually built — the point of the lazy list. */
const countModels = <T>(grid: GridModel<T>) => {
  let total = 0;
  (grid.source as unknown as { models: Map<string, Map<number, unknown>> }).models.forEach((byIndex) => (total += byIndex.size));

  return total;
};

/** Let every already-resolved promise run its handlers. */
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe('DataSourceModel', () => {
  ignoreLogs();

  it('is inert without a datasource', () => {
    const grid = createGrid(baseDef(), { data: [orderAt(0)] });

    expect(grid.source.enabled).toBe(false);
    expect(grid.source.isLoading).toBe(false);
    grid.source.request(0, 50);
    expect(grid.source.rowCount).toBe(0);
  });

  it('fetches the blocks covering the range it is asked for, and no others', async () => {
    const source = createSource();
    const grid = createGrid(baseDef({ dataSource: { ...source, blockSize: 100 } }));

    grid.source.request(0, 30);
    await flush();

    expect(source.requests).toHaveLength(1);
    expect(source.requests[0]).toMatchObject({ startRow: 0, endRow: 100, page: 1, pageSize: 100 });

    // Still inside block 0 — nothing new is wanted.
    grid.source.request(10, 60);
    await flush();
    expect(source.requests).toHaveLength(1);

    // Straddles the boundary, so both blocks are.
    grid.source.request(90, 140);
    await flush();
    expect(source.requests.map((r) => r.startRow)).toEqual([0, 100]);
  });

  it('takes the server count, and lays out every row whether or not it has arrived', async () => {
    const source = createSource();
    const grid = createGrid(baseDef({ dataSource: source }));

    grid.source.request(0, 30);
    await flush();

    expect(grid.source.totalCount).toBe(TOTAL);
    expect(grid.source.rowCount).toBe(TOTAL);
    expect(grid.rows.value).toHaveLength(TOTAL);
    expect(dataRow(grid, 0).data).toEqual(orderAt(0));
    expect(dataRow(grid, 0).placeholder).toBe(false);
    // Block 1 has not been asked for, so its rows are there but empty.
    expect(grid.rows.value[500]).toBeInstanceOf(SourceRowModel);
    expect(dataRow(grid, 500).placeholder).toBe(true);
  });

  it('keys a row by its position until it arrives, and by its data afterwards', async () => {
    const source = createSource();
    const grid = createGrid(baseDef({ dataSource: { ...source, blockSize: 10 } }));

    const row = grid.rows.value[7] as RowModel<Order>;

    expect(row.key).toBe('rb-placeholder-7');
    expect(row.selected).toBe(false);
    expect(row.expanded).toBe(false);

    grid.source.request(0, 10);
    await flush();

    // The same model, and not one of it was rebuilt: the values are read through the cache.
    expect(grid.rows.value[7]).toBe(row);
    expect(row.key).toBe(orderAt(7).id);
    expect(row.data).toEqual(orderAt(7));
  });

  it('builds a model only for the rows somebody looks at', async () => {
    const source = createSource();
    const grid = createGrid(baseDef({ dataSource: source }));

    grid.source.request(0, 30);
    await flush();

    const rows = grid.rows.value;
    expect(rows).toHaveLength(TOTAL);

    // A million rows laid out; four of them are objects. Iterating the list is what materializes it,
    // which is why nothing in the grid does.
    [0, 10, 500, TOTAL - 1].forEach((index) => expect(rows[index]).toBeInstanceOf(SourceRowModel));
    expect(countModels(grid)).toBe(4);
  });

  it('follows the rows when the source answers no count, and stops at a short block', async () => {
    const getRows = vi.fn((request: DataSourceRequest<Order>) =>
      Promise.resolve({ rows: request.startRow === 0 ? Array.from({ length: 10 }, (_, i) => orderAt(i)) : [] }),
    );
    const grid = createGrid(baseDef({ dataSource: { getRows, blockSize: 10 } }));

    grid.source.request(0, 10);
    await flush();

    // A full block, so there may be more: one block of room to scroll into.
    expect(grid.source.totalCount).toBeUndefined();
    expect(grid.source.rowCount).toBe(20);

    grid.source.request(10, 20);
    await flush();

    // The second block came back empty — that is the end of the data.
    expect(grid.source.rowCount).toBe(10);
  });

  it('renders the page rather than the result set when the grid is paginated', async () => {
    const source = createSource();
    const grid = createGrid(baseDef({ dataSource: source, pagination: {}, visibleRowsCount: 25 }));

    expect(grid.source.blockSize).toBe(25);

    grid.source.request(0, 0);
    await flush();

    expect(source.requests[0]).toMatchObject({ startRow: 0, endRow: 25, page: 1, pageSize: 25 });
    expect(grid.rows.value).toHaveLength(25);
    // The count comes off the response, so `def.pagination` need not carry one.
    expect(grid.paginationState).toMatchObject({ page: 1, pageSize: 25, totalItems: TOTAL, totalPages: 40 });

    grid.changePage(3);
    grid.source.request(0, 0);
    await flush();

    expect(source.requests[1]).toMatchObject({ startRow: 50, endRow: 75, page: 3 });
    expect(dataRow(grid, 0).data).toEqual(orderAt(50));
  });

  it('keeps the blocks across a page change, so a page already fetched costs no round trip', async () => {
    const source = createSource();
    const grid = createGrid(baseDef({ dataSource: source, pagination: {}, visibleRowsCount: 10 }));

    grid.source.request(0, 0);
    await flush();
    grid.changePage(2);
    grid.source.request(0, 0);
    await flush();
    grid.changePage(1);
    grid.source.request(0, 0);
    await flush();

    expect(source.getRows).toHaveBeenCalledTimes(2);
  });

  it('carries the sort and the filters into the request', async () => {
    const source = createSource();
    const grid = createGrid(baseDef({ dataSource: source, globalFilter: true }));

    grid.setSortColumn('total', 'DESC');
    grid.setGlobalFilter('acme');
    grid.setColumnFilter('customer', { type: 'text', value: 'Ltd' });

    grid.source.request(0, 30);
    await flush();

    expect(source.requests.at(-1)).toMatchObject({
      sort: { columnKey: 'total', direction: 'DESC' },
      globalFilter: 'acme',
      columnFilters: { customer: { type: 'text', value: 'Ltd' } },
    });
  });

  it('drops the cache when the query changes, and keeps it when only the page does', async () => {
    const source = createSource();
    const grid = createGrid(baseDef({ dataSource: source }));

    grid.source.request(0, 30);
    await flush();
    expect(grid.source.rowAt(0)).toEqual(orderAt(0));

    const before = grid.source.queryVersion;
    grid.setSortColumn('total', 'ASC');

    expect(grid.source.queryVersion).toBe(before + 1);
    expect(grid.source.rowAt(0)).toBeUndefined();
    // The count is deliberately kept: dropping it collapses the scrollbar on every keystroke.
    expect(grid.source.rowCount).toBe(TOTAL);
  });

  it('drops a reply to a question nobody is asking any more', async () => {
    const deferred = createDeferredSource();
    const grid = createGrid(baseDef({ dataSource: { getRows: deferred.getRows } }));

    grid.source.request(0, 30);
    const stale = deferred.pending[0];

    grid.setSortColumn('total', 'ASC');
    grid.source.request(0, 30);
    const fresh = deferred.pending[1];

    // The old request's answer arrives last, which is exactly the race worth losing.
    fresh.resolve({ rows: [orderAt(500)], totalCount: 1 });
    await flush();
    stale.resolve({ rows: [orderAt(0)], totalCount: TOTAL });
    await flush();

    expect(grid.source.rowAt(0)).toEqual(orderAt(500));
    expect(grid.source.totalCount).toBe(1);
  });

  it('aborts the request a superseded query left in flight', () => {
    const deferred = createDeferredSource();
    const grid = createGrid(baseDef({ dataSource: { getRows: deferred.getRows } }));

    grid.source.request(0, 30);
    expect(deferred.pending[0].request.signal.aborted).toBe(false);

    grid.setGlobalFilter('acme');

    expect(deferred.pending[0].request.signal.aborted).toBe(true);
  });

  it('reports a failed block, and retries every one of them', async () => {
    const deferred = createDeferredSource();
    const grid = createGrid(baseDef({ dataSource: { getRows: deferred.getRows, blockSize: 10 } }));

    grid.source.request(0, 10);
    deferred.pending[0].reject(new Error('502 Bad Gateway'));
    await flush();

    expect(grid.source.error).toBeInstanceOf(Error);
    expect(grid.source.statusAt(0)).toBe('error');
    expect(grid.source.isLoading).toBe(false);

    grid.source.retry();

    expect(grid.source.statusAt(0)).toBe('loading');
    expect(grid.source.error).toBeUndefined();

    deferred.pending[1].resolve({ rows: [orderAt(0)], totalCount: 1 });
    await flush();

    expect(grid.source.rowAt(0)).toEqual(orderAt(0));
  });

  it('does not report an abort as a failure', async () => {
    const deferred = createDeferredSource();
    const grid = createGrid(baseDef({ dataSource: { getRows: deferred.getRows } }));

    grid.source.request(0, 30);
    const inFlight = deferred.pending[0];

    grid.setGlobalFilter('acme');
    inFlight.reject(new DOMException('Aborted', 'AbortError'));
    await flush();

    expect(grid.source.error).toBeUndefined();
  });

  it('drops the blocks furthest from the viewport once there are too many', async () => {
    const source = createSource();
    const grid = createGrid(baseDef({ dataSource: { ...source, blockSize: 10, maxBlocks: 3 } }));

    for (let block = 0; block < 5; block++) {
      grid.source.request(block * 10, block * 10 + 10);
      await flush();
    }

    expect(grid.source.statusAt(0)).toBe('missing');
    expect(grid.source.statusAt(10)).toBe('missing');
    expect(grid.source.statusAt(20)).toBe('loaded');
    expect(grid.source.statusAt(40)).toBe('loaded');

    // Scrolling back asks for it again rather than showing a hole.
    grid.source.request(0, 10);
    await flush();
    expect(grid.source.statusAt(0)).toBe('loaded');
  });

  it('reads nothing from `data`, and a select-all reaches only what is loaded', async () => {
    const source = createSource();
    const grid = createGrid(baseDef({ dataSource: { ...source, blockSize: 10 }, rowSelection: true }), {
      data: [orderAt(900)],
    });

    grid.source.request(0, 10);
    await flush();

    expect(grid.loadedRows).toHaveLength(10);
    expect(dataRow(grid, 0).data).toEqual(orderAt(0));

    grid.toggleSelectAllRows();

    expect(grid.selectedRows.size).toBe(10);
    expect(grid.allRowsSelected).toBe(true);
  });

  it('puts an open detail panel after its own row, and leaves the rest of the million alone', async () => {
    const source = createSource();
    const grid = createGrid(baseDef({ dataSource: { ...source, blockSize: 10 }, rowDetail: { content: () => null } }));

    grid.source.request(0, 10);
    await flush();

    expect(grid.flatRows.value).toHaveLength(TOTAL);

    grid.toggleDetailRow(orderAt(3).id);

    const flat = grid.flatRows.value;
    expect(flat).toHaveLength(TOTAL + 1);
    expect((flat[3] as RowModel<Order>).data).toEqual(orderAt(3));
    expect(flat[4]).toBeInstanceOf(DetailRowModel);
    expect((flat[4] as DetailRowModel<Order>).parentRow.key).toBe(orderAt(3).id);
    // Everything below it has moved down one, and nothing above it has moved.
    expect((flat[5] as RowModel<Order>).rowIndex).toBe(4);
  });

  it('offsets the rows below an open panel by its height, without walking the result set', async () => {
    const source = createSource();
    const grid = createGrid(
      baseDef({ dataSource: { ...source, blockSize: 10 }, rowDetail: { content: () => null, height: 120 }, rowHeight: 40 }),
    );

    grid.source.request(0, 10);
    await flush();
    grid.toggleDetailRow(orderAt(1).id);

    const { offsets, totalHeight } = grid.rowOffsets.value;

    expect(offsets[0]).toBe(0);
    expect(offsets[1]).toBe(40);
    expect(offsets[2]).toBe(80); // the panel
    expect(offsets[3]).toBe(200); // the row after it, pushed down by the panel's 120
    expect(totalHeight).toBe(TOTAL * 40 + 120);
  });

  it('refresh() throws the cache away and asks again', async () => {
    const source = createSource();
    const grid = createGrid(baseDef({ dataSource: source }));

    grid.source.request(0, 30);
    await flush();
    expect(source.getRows).toHaveBeenCalledTimes(1);

    grid.refresh();
    grid.source.request(0, 30);
    await flush();

    expect(source.getRows).toHaveBeenCalledTimes(2);
  });
});
