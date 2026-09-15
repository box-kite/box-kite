import { describe, expect, it, vi } from 'vitest';
import { ignoreLogs } from '../../../../dev/tests';
import { DataGridProps, DataSourceRequest, DataSourceResult, GridDefinition, Key } from '../contracts/dataGridContract';
import GridModel from './gridModel';
import GroupRowModel from './groupRowModel';
import RowModel from './rowModel';
import SourceGroupRowModel, { groupPathKey } from './sourceGroupRowModel';

interface Order {
  id: number;
  country: string;
  city: string;
  total: number;
}

/**
 * A server that really groups. Three countries of two cities of five orders each — small enough to write
 * out, deep enough that a level under a level is exercised, and it answers `groupCounts` so the labels
 * have a number in them.
 */
const COUNTRIES = ['Japan', 'Kenya', 'Norway'];
const CITIES: Record<string, string[]> = { Japan: ['Kyoto', 'Osaka'], Kenya: ['Kisumu', 'Nairobi'], Norway: ['Bergen', 'Oslo'] };
const PER_CITY = 5;

const ORDERS: Order[] = COUNTRIES.flatMap((country, c) =>
  CITIES[country].flatMap((city, t) =>
    Array.from({ length: PER_CITY }, (_, i) => ({ id: c * 100 + t * 10 + i, country, city, total: (i + 1) * 10 })),
  ),
);

const leavesIn = (groupKeys: Key[]): Order[] =>
  ORDERS.filter(
    (order) =>
      (groupKeys[0] === undefined || order.country === groupKeys[0]) && (groupKeys[1] === undefined || order.city === groupKeys[1]),
  );

/** What a grouping server answers: group rows carrying the level's own column, a count and a total. */
function answer(request: DataSourceRequest<Order>): DataSourceResult<Order> {
  const { groupBy, groupKeys, startRow, endRow } = request;
  const leaves = leavesIn(groupKeys);

  if (groupKeys.length === groupBy.length) {
    return { rows: leaves.slice(startRow, endRow), totalCount: leaves.length };
  }

  const column = groupBy[groupKeys.length] as keyof Order;
  const values = [...new Set(leaves.map((order) => order[column] as Key))];
  const rows = values.map((value) => {
    const under = leaves.filter((order) => (order[column] as Key) === value);

    // A group row is a row of the same shape: the level's own column, plus whatever it totals.
    return { ...under[0], [column]: value, total: under.reduce((sum, order) => sum + order.total, 0) } as Order;
  });

  return {
    rows: rows.slice(startRow, endRow),
    totalCount: rows.length,
    groupCounts: values.slice(startRow, endRow).map((value) => leaves.filter((order) => (order[column] as Key) === value).length),
  };
}

function createSource(grouping = true) {
  const requests: DataSourceRequest<Order>[] = [];
  const getRows = vi.fn((request: DataSourceRequest<Order>) => {
    requests.push(request);

    return Promise.resolve(answer(request));
  });

  return { getRows, grouping, blockSize: 50, requests };
}

const baseDef = (def: Partial<GridDefinition<Order>> = {}): GridDefinition<Order> => ({
  rowKey: 'id',
  columns: [
    { key: 'country', header: 'Country' },
    { key: 'city', header: 'City' },
    { key: 'total', header: 'Total', aggregate: 'sum' },
  ],
  visibleRowsCount: 10,
  ...def,
});

function createGrid(def: GridDefinition<Order>, overrides?: Partial<DataGridProps<Order>>) {
  return new GridModel<Order>({ def, ...overrides }, vi.fn());
}

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/** Group by those columns, then fetch whatever the first screenful covers. */
async function group(grid: GridModel<Order>, ...columns: Key[]) {
  columns.forEach((column) => grid.toggleGrouping(column));
  grid.source.request(0, 30);
  await flush();
}

/** Open a group by its path, the way pressing its chevron does, and let the level answer. */
async function open(grid: GridModel<Order>, ...groupKeys: Key[]) {
  grid.toggleGroupRow(groupPathKey(groupKeys));
  grid.source.request(0, 30);
  await flush();
}

const rowAt = (grid: GridModel<Order>, index: number) => grid.rows.value[index];
const labels = (grid: GridModel<Order>) =>
  Array.from({ length: grid.rows.value.length }, (_, i) => {
    const row = rowAt(grid, i);

    return row instanceof GroupRowModel ? row.label : `· ${(row as RowModel<Order>).data.id}`;
  });

describe('DataSourceModel grouping', () => {
  ignoreLogs();

  it('asks for the top level only, and the request names the columns it groups by', async () => {
    const source = createSource();
    const grid = createGrid(baseDef({ dataSource: source }));

    await group(grid, 'country');

    expect(source.requests).toHaveLength(1);
    expect(source.requests[0].groupBy).toEqual(['country']);
    expect(source.requests[0].groupKeys).toEqual([]);

    // Three groups, and not one of the thirty orders under them.
    expect(labels(grid)).toEqual(['Japan (10)', 'Kenya (10)', 'Norway (10)']);
  });

  it('fetches a group’s children only once it is opened, and splices them in after it', async () => {
    const source = createSource();
    const grid = createGrid(baseDef({ dataSource: source }));

    await group(grid, 'country');
    await open(grid, 'Kenya');

    const second = source.requests[source.requests.length - 1];
    expect(second.groupKeys).toEqual(['Kenya']);
    expect(second.groupBy).toEqual(['country']);

    // The ten Kenyan orders sit between Kenya and Norway; Japan is still one row.
    expect(labels(grid)).toEqual(['Japan (10)', 'Kenya (10)', ...leavesIn(['Kenya']).map((order) => `· ${order.id}`), 'Norway (10)']);
    expect(grid.source.rowCount).toBe(13);
  });

  it('nests a level under a level, and closing one takes its children with it', async () => {
    const source = createSource();
    const grid = createGrid(baseDef({ dataSource: source }));

    await group(grid, 'country', 'city');
    expect(labels(grid)).toEqual(['Japan (10)', 'Kenya (10)', 'Norway (10)']);

    await open(grid, 'Japan');
    expect(labels(grid)).toEqual(['Japan (10)', 'Kyoto (5)', 'Osaka (5)', 'Kenya (10)', 'Norway (10)']);

    await open(grid, 'Japan', 'Osaka');
    expect(labels(grid)).toEqual([
      'Japan (10)',
      'Kyoto (5)',
      'Osaka (5)',
      ...leavesIn(['Japan', 'Osaka']).map((order) => `· ${order.id}`),
      'Kenya (10)',
      'Norway (10)',
    ]);

    // Shutting Japan takes Osaka's rows with it — and the levels behind both are disposed of.
    grid.toggleGroupRow(groupPathKey(['Japan']));
    expect(labels(grid)).toEqual(['Japan (10)', 'Kenya (10)', 'Norway (10)']);
    expect(levelCount(grid)).toBe(1);
  });

  it('keeps a group open while the blocks under it come and go', async () => {
    const source = createSource();
    const grid = createGrid(baseDef({ dataSource: source }));

    await group(grid, 'country');
    await open(grid, 'Norway');

    const norway = rowAt(grid, 2) as SourceGroupRowModel<Order>;
    expect(norway).toBeInstanceOf(SourceGroupRowModel);

    // Keyed by the path, so the same group row is the same key however often its block is refetched.
    expect(norway.key).toBe(groupPathKey(['Norway']));
    expect(norway.groupKeys).toEqual(['Norway']);
    expect(norway.expanded).toBe(true);
  });

  it('takes the group totals off the row the server sent rather than adding up rows it has not got', async () => {
    const source = createSource();
    const grid = createGrid(baseDef({ dataSource: source }));

    await group(grid, 'country');

    const japan = rowAt(grid, 0) as GroupRowModel<Order>;
    const total = japan.cells.find((cell) => cell.column.key === 'total');

    // Ten orders of 10..50 twice over. Nothing under the group is in the browser, and the sum is right.
    expect(japan.allRows).toHaveLength(0);
    expect(total?.aggregate?.value).toBe(300);
  });

  it('fills in a total on a group row that was drawn before the server answered', async () => {
    const source = createSource();
    const grid = createGrid(baseDef({ dataSource: source }));

    grid.toggleGrouping('country');

    // The cell model is built here, while the row is still a skeleton — the order a real grid renders in.
    const cell = () => (grid.rows.value[0] as GroupRowModel<Order>).cells.find((c) => c.column.key === 'total');
    expect(cell()?.aggregate?.value).toBeNull();

    grid.source.request(0, 30);
    await flush();

    // The same cell model, and the total is the server's — read when it is asked for, not when it was built.
    expect(cell()?.aggregate?.value).toBe(300);
  });

  it('offers no select-all on a group whose rows it has never seen', async () => {
    const source = createSource();
    const grid = createGrid(baseDef({ dataSource: source, rowSelection: true }));

    await group(grid, 'country');

    const japan = rowAt(grid, 0) as GroupRowModel<Order>;
    expect(japan.selectable).toBe(false);
    expect(japan.selected).toBe(false);
    expect(japan.cells.find((cell) => cell.column.isRowSelection)?.cellKind).toBe('spacer');
  });

  it('draws a group nobody has answered for yet as a skeleton that cannot be opened', async () => {
    const source = createSource();
    const grid = createGrid(baseDef({ dataSource: source }));

    grid.toggleGrouping('country');

    const pending = rowAt(grid, 0) as SourceGroupRowModel<Order>;
    expect(pending.placeholder).toBe(true);
    expect(pending.label).toBe('');

    pending.toggleRow();
    expect(grid.expandedGroupRow.size).toBe(0);
  });

  it('starts the query again when the grouping changes, and shuts every open group', async () => {
    const source = createSource();
    const grid = createGrid(baseDef({ dataSource: source }));

    await group(grid, 'country');
    await open(grid, 'Japan');
    expect(grid.expandedGroupRow.size).toBe(1);

    const before = grid.source.queryVersion;
    grid.toggleGrouping('city');

    // Every cached block answered a question with a different GROUP BY in it.
    expect(grid.source.queryVersion).toBeGreaterThan(before);
    expect(grid.expandedGroupRow.size).toBe(0);

    grid.source.request(0, 30);
    await flush();
    expect(labels(grid)).toEqual(['Japan (10)', 'Kenya (10)', 'Norway (10)']);
  });

  it('reaches only the rows it holds: a shut group is not in a select-all or an export', async () => {
    const source = createSource();
    const grid = createGrid(baseDef({ dataSource: source }));

    await group(grid, 'country');
    expect(grid.loadedRows).toHaveLength(0);

    await open(grid, 'Kenya');
    expect(grid.loadedRows.map((order) => order.id)).toEqual(leavesIn(['Kenya']).map((order) => order.id));
  });

  it('never evicts the block holding the group row an open level hangs off', async () => {
    // Two blocks kept, and the *last* group opened, so nothing below it touches the top level's block
    // again: without the chain that block is the least recently wanted the moment the children are, and
    // evicting it would take all three group rows — and the level hanging off one of them — with it.
    const source = { ...createSource(), blockSize: 5, maxBlocks: 2 };
    const grid = createGrid(baseDef({ dataSource: source }));

    await group(grid, 'country');
    await open(grid, 'Norway');

    // Deep into Norway's own rows. The top level is nowhere in the range that is asked for.
    grid.source.request(8, 13);
    await flush();

    // The block that went is Norway's *first*, the one nothing asked for; all three group rows are
    // still drawn, so the level under Norway still has the row it hangs off.
    const drawn = labels(grid);
    expect(drawn.slice(0, 3)).toEqual(['Japan (10)', 'Kenya (10)', 'Norway (10)']);
    expect(drawn.slice(3, 8)).toEqual(Array(5).fill('· undefined'));
    expect(drawn.slice(8)).toEqual(
      leavesIn(['Norway'])
        .slice(5)
        .map((order) => `· ${order.id}`),
    );
    expect(levelCount(grid)).toBe(2);

    // And it was not refetched to stay there: the top level was asked once, for block 0.
    expect(source.requests.filter((request) => request.groupKeys.length === 0)).toHaveLength(1);
  });

  it('does not offer Group by where the server has not said it can answer a level', () => {
    const plain = createGrid(baseDef({ dataSource: { ...createSource(), grouping: false } }));
    const grouping = createGrid(baseDef({ dataSource: createSource() }));

    const menu = (grid: GridModel<Order>) => grid.columns.value.leafs.find((c) => c.key === 'country')!.contextMenuSections;

    expect(menu(plain).group).toBe(false);
    expect(menu(grouping).group).toBe(true);
    expect(grouping.source.groupBy).toEqual([]);
  });
});

/** How many levels the cache is holding — one per open group, plus the top. */
const levelCount = <T>(grid: GridModel<T>) => (grid.source as unknown as { levels: Map<string, unknown> }).levels.size;
