import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { formatViolations, runAxe } from '../../dev/a11y/axe';
import { ignoreLogs } from '../../dev/tests';
import DataGrid from './dataGrid';
import { DataGridHandle, DataSourceRequest, DataSourceResult, GridDefinition } from './dataGrid/contracts/dataGridContract';

interface Row {
  id: number;
  name: string;
  country: string;
}

const TOTAL = 500;

const rowAt = (index: number): Row => ({ id: index + 1, name: `Name ${index + 1}`, country: index % 2 ? 'UK' : 'USA' });

function createSource() {
  const requests: DataSourceRequest<Row>[] = [];

  const getRows = vi.fn((request: DataSourceRequest<Row>): Promise<DataSourceResult<Row>> => {
    requests.push(request);

    const rows = Array.from({ length: Math.max(0, Math.min(request.endRow, TOTAL) - request.startRow) }, (_, i) =>
      rowAt(request.startRow + i),
    );

    return Promise.resolve({ rows, totalCount: TOTAL });
  });

  return { getRows, requests };
}

/** A server that answers a group level: two countries, and the rows inside one of them. */
function createGroupingSource() {
  const requests: DataSourceRequest<Row>[] = [];
  const all = Array.from({ length: TOTAL }, (_, i) => rowAt(i));

  const getRows = vi.fn((request: DataSourceRequest<Row>): Promise<DataSourceResult<Row>> => {
    requests.push(request);

    if (request.groupBy.length === 0) return Promise.resolve({ rows: all.slice(request.startRow, request.endRow), totalCount: TOTAL });

    if (request.groupKeys.length === 0) {
      // A group row is a row with the grouped column set; the count comes down beside it.
      const countries = ['USA', 'UK'];

      return Promise.resolve({
        rows: countries.map((country) => ({ ...all[0], country })),
        totalCount: countries.length,
        groupCounts: countries.map((country) => all.filter((row) => row.country === country).length),
      });
    }

    const leaves = all.filter((row) => row.country === request.groupKeys[0]);

    return Promise.resolve({ rows: leaves.slice(request.startRow, request.endRow), totalCount: leaves.length });
  });

  return { getRows, requests };
}

const def = (overrides: Partial<GridDefinition<Row>> = {}): GridDefinition<Row> => ({
  rowKey: 'id',
  columns: [
    { key: 'name', header: 'Name' },
    { key: 'country', header: 'Country' },
  ],
  visibleRowsCount: 5,
  ...overrides,
});

describe('DataGrid data source', () => {
  ignoreLogs();

  it('fetches its own rows on mount and renders them', async () => {
    const source = createSource();

    render(<DataGrid def={def({ dataSource: { ...source, blockSize: 20 } })} />);

    await waitFor(() => expect(screen.getByText('Name 1')).toBeInTheDocument());

    expect(source.requests[0]).toMatchObject({ startRow: 0, endRow: 20, page: 1, pageSize: 20 });
    // The count is the server's, so the grid numbers every row it has not fetched too.
    expect(screen.getByRole('grid')).toHaveAttribute('aria-rowcount', String(TOTAL + 1));
  });

  it('marks the rows it has not got yet as busy, and fills them when the block lands', async () => {
    const source = createSource();

    render(<DataGrid def={def({ dataSource: { ...source, blockSize: 20 } })} />);

    // Before the first block resolves every rendered row is a placeholder.
    expect(screen.getAllByRole('row').some((row) => row.getAttribute('aria-busy') === 'true')).toBe(true);

    await waitFor(() => expect(screen.getByText('Name 1')).toBeInTheDocument());

    const rendered = screen.getAllByRole('row').filter((row) => row.getAttribute('aria-rowindex') === '2');
    expect(rendered[0]).not.toHaveAttribute('aria-busy');
  });

  it('re-asks with the sort the header press applied', async () => {
    const user = userEvent.setup();
    const source = createSource();

    render(<DataGrid def={def({ dataSource: source })} />);
    await waitFor(() => expect(screen.getByText('Name 1')).toBeInTheDocument());

    // The sort handler sits on the header's own label, not on the `columnheader` box around it.
    await user.click(screen.getByText('Name'));

    await waitFor(() => expect(source.requests.length).toBeGreaterThan(1));
    expect(source.requests.at(-1)).toMatchObject({ startRow: 0, sort: { columnKey: 'name', direction: 'ASC' } });
  });

  it('shows what failed, and asks again when Retry is pressed', async () => {
    const user = userEvent.setup();
    let attempt = 0;

    const getRows = vi.fn(() => {
      attempt++;
      return attempt === 1 ? Promise.reject(new Error('502 Bad Gateway')) : Promise.resolve({ rows: [rowAt(0)], totalCount: 1 });
    });

    render(<DataGrid def={def({ dataSource: { getRows } })} />);

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('502 Bad Gateway'));

    await user.click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => expect(screen.getByText('Name 1')).toBeInTheDocument());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('refresh() on the grid ref throws the blocks away and asks again', async () => {
    const source = createSource();
    const ref = createRef<DataGridHandle>();

    render(<DataGrid ref={ref} def={def({ dataSource: source })} />);
    await waitFor(() => expect(screen.getByText('Name 1')).toBeInTheDocument());

    const before = source.requests.length;
    ref.current!.refresh();

    await waitFor(() => expect(source.requests.length).toBeGreaterThan(before));
  });

  it('groups on the server: the menu comes back, and a group fetches its children when it opens', async () => {
    const user = userEvent.setup();
    const source = createGroupingSource();

    render(<DataGrid def={def({ dataSource: { ...source, grouping: true }, visibleRowsCount: 10 })} />);
    await waitFor(() => expect(screen.getByText('Name 1')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Column options for Country' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Group by Country' }));

    // Two groups where there were five hundred rows, and the request said which column to group by.
    await waitFor(() => expect(screen.getByText('USA (250)')).toBeInTheDocument());
    expect(screen.getByText('UK (250)')).toBeInTheDocument();
    expect(source.requests.at(-1)).toMatchObject({ groupBy: ['country'], groupKeys: [] });
    expect(screen.queryByText('Name 1')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /USA \(250\)/ }));

    // Only now is a row under it asked for, and only that group's rows come back.
    await waitFor(() => expect(screen.getByText('Name 1')).toBeInTheDocument());
    expect(source.requests.at(-1)).toMatchObject({ groupBy: ['country'], groupKeys: ['USA'] });
    expect(screen.queryByText('Name 2')).not.toBeInTheDocument();
  });

  // The axe sweep's fixtures can only render a grid that has never been grouped — grouping is reached
  // through the column menu — so a *group row* has never been through it. This is where one is.
  it('a grouped server grid, with a group open, has no accessibility violations', async () => {
    const user = userEvent.setup();
    const source = createGroupingSource();

    render(
      <DataGrid def={def({ dataSource: { ...source, grouping: true }, rowSelection: true, title: 'People', visibleRowsCount: 10 })} />,
    );
    await waitFor(() => expect(screen.getByText('Name 1')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Column options for Country' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Group by Country' }));
    await waitFor(() => expect(screen.getByText('USA (250)')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /USA \(250\)/ }));
    await waitFor(() => expect(screen.getByText('Name 1')).toBeInTheDocument());

    const violations = await runAxe(document.body);
    expect(formatViolations(violations), `${violations.length} violation(s) on a grid with an open server group`).toBe('');
  }, 20_000);

  it('offers no Group by while the server has not said it answers a group level', async () => {
    const user = userEvent.setup();
    const source = createSource();

    render(<DataGrid def={def({ dataSource: source })} />);
    await waitFor(() => expect(screen.getByText('Name 1')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Column options for Country' }));

    expect(await screen.findByRole('menuitem', { name: 'Sort Ascending' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Group by Country' })).not.toBeInTheDocument();
  });

  it('pages through the datasource when `def.pagination` is beside it', async () => {
    const user = userEvent.setup();
    const source = createSource();

    render(<DataGrid def={def({ dataSource: source, pagination: {}, bottomBar: true, visibleRowsCount: 10 })} />);

    await waitFor(() => expect(screen.getByText('Name 1')).toBeInTheDocument());
    expect(source.requests[0]).toMatchObject({ startRow: 0, endRow: 10, page: 1 });

    await user.click(screen.getByRole('button', { name: /next page/i }));

    await waitFor(() => expect(screen.getByText('Name 11')).toBeInTheDocument());
    expect(source.requests.at(-1)).toMatchObject({ startRow: 10, endRow: 20, page: 2 });
  });
});
