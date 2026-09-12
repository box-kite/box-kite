import { describe, expect, it, vi } from 'vitest';
import { ignoreLogs } from '../../../../dev/tests';
import { DataGridProps, GridDefinition } from '../contracts/dataGridContract';
import GridModel from './gridModel';
import RowModel from './rowModel';

interface Order {
  id: number;
  customer: string;
  total: number;
}

const allOrders: Order[] = Array.from({ length: 50 }, (_, i) => ({
  id: i + 1,
  customer: `Customer ${i + 1}`,
  total: (i + 1) * 10,
}));

const baseDef: GridDefinition<Order> = {
  rowKey: 'id',
  columns: [
    { key: 'customer', header: 'Customer' },
    { key: 'total', header: 'Total' },
  ],
  bottomBar: true,
  visibleRowsCount: 10,
  pagination: { totalCount: 50 },
};

function createGrid(overrides?: Partial<DataGridProps<Order>>) {
  const props: DataGridProps<Order> = {
    data: allOrders.slice(0, 10), // first page
    def: baseDef,
    ...overrides,
  };
  return new GridModel(props, vi.fn());
}

describe('GridModel Pagination', () => {
  ignoreLogs();

  it('isPaginated returns true when pagination is configured', () => {
    const grid = createGrid();
    expect(grid.isPaginated).toBe(true);
  });

  it('isPaginated returns false when pagination is not configured', () => {
    const grid = createGrid({ def: { ...baseDef, pagination: undefined } });
    expect(grid.isPaginated).toBe(false);
  });

  it('paginationState computes correctly', () => {
    const grid = createGrid();
    const state = grid.paginationState!;
    expect(state.page).toBe(1);
    expect(state.pageSize).toBe(10); // from visibleRowsCount
    expect(state.totalItems).toBe(50);
    expect(state.totalPages).toBe(5);
  });

  it('pageSize defaults to visibleRowsCount', () => {
    const grid = createGrid();
    expect(grid.pageSize).toBe(10);
  });

  it('pageSize uses pagination.pageSize when provided', () => {
    const grid = createGrid({
      def: { ...baseDef, pagination: { totalCount: 50, pageSize: 20 } },
    });
    expect(grid.pageSize).toBe(20);
    expect(grid.paginationState!.totalPages).toBe(3); // ceil(50/20)
  });

  it('pageSize defaults to 10 when visibleRowsCount is not a number', () => {
    const grid = createGrid({
      def: { ...baseDef, visibleRowsCount: 'all', pagination: { totalCount: 50 } },
    });
    expect(grid.pageSize).toBe(10);
  });

  it('changePage updates internal page state (uncontrolled)', () => {
    const grid = createGrid();
    expect(grid.page).toBe(1);

    grid.changePage(3);
    expect(grid.page).toBe(3);
  });

  it('changePage clamps to valid range', () => {
    const grid = createGrid();

    grid.changePage(0); // below min
    expect(grid.page).toBe(1); // stays at 1

    grid.changePage(100); // above max
    expect(grid.page).toBe(5); // clamped to totalPages
  });

  it('changePage calls onPageChange callback (controlled)', () => {
    const onPageChange = vi.fn();
    const grid = createGrid({ page: 1, onPageChange });

    grid.changePage(2);
    expect(onPageChange).toHaveBeenCalledWith(2, 10);
  });

  it('changePage does not fire when page is unchanged', () => {
    const onPageChange = vi.fn();
    const grid = createGrid({ page: 1, onPageChange });

    grid.changePage(1);
    expect(onPageChange).not.toHaveBeenCalled();
  });

  it('controlled page prop overrides internal state', () => {
    const grid = createGrid({ page: 3 });
    expect(grid.page).toBe(3);
  });

  it('skips client-side filtering when paginated', () => {
    const grid = createGrid({
      def: { ...baseDef, globalFilter: true },
    });

    // Set a global filter that would normally filter rows
    grid.setGlobalFilter('Customer 1');

    // filteredData should return all data (server handles filtering)
    expect(grid.filteredData).toHaveLength(10); // all page data, not filtered
  });

  it('skips client-side sorting when paginated', () => {
    const data = [
      { id: 3, customer: 'Charlie', total: 30 },
      { id: 1, customer: 'Alice', total: 10 },
      { id: 2, customer: 'Bob', total: 20 },
    ];
    const grid = createGrid({ data });

    grid.setSortColumn('customer');

    // Rows should maintain original order (server handles sorting)
    const rows = grid.rows.value as RowModel<Order>[];
    expect(rows[0].data.customer).toBe('Charlie');
    expect(rows[1].data.customer).toBe('Alice');
    expect(rows[2].data.customer).toBe('Bob');
  });

  it('sort state is tracked even when paginated (for header indicators)', () => {
    const grid = createGrid();
    grid.setSortColumn('customer');

    expect(grid.sortColumn).toBe('customer');
    expect(grid.sortDirection).toBe('ASC');
  });

  it('onSortChange callback fires when sort changes', () => {
    const onSortChange = vi.fn();
    const grid = createGrid({ onSortChange });

    grid.setSortColumn('customer');
    expect(onSortChange).toHaveBeenCalledWith('customer', 'ASC');

    grid.setSortColumn('customer');
    expect(onSortChange).toHaveBeenCalledWith('customer', 'DESC');
  });

  it('filterStats uses totalCount when paginated', () => {
    const grid = createGrid();
    const stats = grid.filterStats;
    expect(stats.filtered).toBe(50);
    expect(stats.total).toBe(50);
  });

  it('totalPages is at least 1 even when totalCount is 0', () => {
    const grid = createGrid({
      data: [],
      def: { ...baseDef, pagination: { totalCount: 0 } },
    });
    expect(grid.paginationState!.totalPages).toBe(1);
  });

  // ========== Sort resets page ==========

  it('sort change resets page to 1 (uncontrolled)', () => {
    const grid = createGrid();
    grid.changePage(3);
    expect(grid.page).toBe(3);

    grid.setSortColumn('customer');
    expect(grid.page).toBe(1);
  });

  it('sort change calls onPageChange with page 1 (controlled)', () => {
    const onPageChange = vi.fn();
    const grid = createGrid({ page: 3, onPageChange });

    grid.setSortColumn('customer');
    expect(onPageChange).toHaveBeenCalledWith(1, 10);
  });

  it('sort change does not reset page when already on page 1', () => {
    const onPageChange = vi.fn();
    const grid = createGrid({ page: 1, onPageChange });

    grid.setSortColumn('customer');
    expect(onPageChange).not.toHaveBeenCalled();
  });

  // ========== Global filter resets page ==========

  it('global filter change resets page to 1 (uncontrolled)', () => {
    const grid = createGrid({ def: { ...baseDef, globalFilter: true } });
    grid.changePage(3);
    expect(grid.page).toBe(3);

    grid.setGlobalFilter('test');
    expect(grid.page).toBe(1);
  });

  it('global filter change calls onPageChange with page 1 (controlled)', () => {
    const onPageChange = vi.fn();
    const grid = createGrid({ page: 3, onPageChange, def: { ...baseDef, globalFilter: true } });

    grid.setGlobalFilter('test');
    expect(onPageChange).toHaveBeenCalledWith(1, 10);
  });

  // ========== Page size change ==========

  it('changePageSize updates internal pageSize (uncontrolled)', () => {
    const grid = createGrid();
    expect(grid.pageSize).toBe(10);

    grid.changePageSize(25);
    expect(grid.pageSize).toBe(25);
  });

  it('changePageSize resets page to 1 (uncontrolled)', () => {
    const grid = createGrid();
    grid.changePage(3);
    expect(grid.page).toBe(3);

    grid.changePageSize(25);
    expect(grid.page).toBe(1);
  });

  it('changePageSize calls onPageSizeChange callback (controlled)', () => {
    const onPageSizeChange = vi.fn();
    const grid = createGrid({ onPageSizeChange });

    grid.changePageSize(25);
    expect(onPageSizeChange).toHaveBeenCalledWith(25);
  });

  it('changePageSize calls onPageChange with page 1 and new size (controlled)', () => {
    const onPageChange = vi.fn();
    const grid = createGrid({ page: 2, onPageChange });

    grid.changePageSize(25);
    expect(onPageChange).toHaveBeenCalledWith(1, 25);
  });

  it('changePageSize does not fire when size is unchanged', () => {
    const onPageSizeChange = vi.fn();
    const grid = createGrid({ onPageSizeChange });

    grid.changePageSize(10); // same as default
    expect(onPageSizeChange).not.toHaveBeenCalled();
  });

  it('controlled pageSize prop overrides internal state', () => {
    const grid = createGrid({ pageSize: 25 });
    expect(grid.pageSize).toBe(25);
  });

  it('pageSizeOptions returns options from pagination config', () => {
    const grid = createGrid({ def: { ...baseDef, pagination: { totalCount: 50, pageSizeOptions: [10, 25, 50] } } });
    expect(grid.pageSizeOptions).toEqual([10, 25, 50]);
  });

  it('pageSizeOptions returns undefined when not configured', () => {
    const grid = createGrid();
    expect(grid.pageSizeOptions).toBeUndefined();
  });

  it('changePageSize fires onServerStateChange with new pageSize and page 1', () => {
    const onServerStateChange = vi.fn();
    const grid = createGrid({ onServerStateChange });
    grid.changePage(3);

    grid.changePageSize(25);
    expect(onServerStateChange).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, pageSize: 25 }), { reason: 'page-size' });
  });

  // ========== Column filter resets page ==========

  it('column filter change resets page to 1 (uncontrolled)', () => {
    const grid = createGrid();
    grid.changePage(3);
    expect(grid.page).toBe(3);

    grid.setColumnFilter('customer', { type: 'text', value: 'test' });
    expect(grid.page).toBe(1);
  });

  it('column filter change calls onPageChange with page 1 (controlled)', () => {
    const onPageChange = vi.fn();
    const grid = createGrid({ page: 3, onPageChange });

    grid.setColumnFilter('customer', { type: 'text', value: 'test' });
    expect(onPageChange).toHaveBeenCalledWith(1, 10);
  });
});
