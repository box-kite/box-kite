import { describe, expect, it, vi } from 'vitest';
import { ignoreLogs } from '../../../../dev/tests';
import { DataGridProps, GridDefinition } from '../contracts/dataGridContract';
import GridModel from './gridModel';

interface Order {
  id: number;
  customer: string;
  total: number;
}

const orders: Order[] = Array.from({ length: 50 }, (_, i) => ({ id: i + 1, customer: `Customer ${i + 1}`, total: (i + 1) * 10 }));

const def: GridDefinition<Order> = {
  rowKey: 'id',
  columns: [
    { key: 'customer', header: 'Customer', filterable: true },
    { key: 'total', header: 'Total' },
  ],
  globalFilter: true,
  rowSelection: true,
  rowDetail: { content: () => null },
  visibleRowsCount: 10,
};

const paginatedDef: GridDefinition<Order> = { ...def, pagination: { totalCount: 50 } };

function createGrid(overrides?: Partial<DataGridProps<Order>>, gridDef = def) {
  return new GridModel<Order>({ data: orders.slice(0, 10), def: gridDef, ...overrides }, vi.fn());
}

describe('GridModel change callbacks', () => {
  ignoreLogs();

  describe('selection', () => {
    it('reports the selection and why it changed, and still fires the older event', () => {
      const onSelectedRowKeysChange = vi.fn();
      const onSelectionChange = vi.fn();
      const grid = createGrid({ onSelectedRowKeysChange, onSelectionChange });

      grid.toggleRowSelection(2);
      expect(onSelectedRowKeysChange).toHaveBeenCalledWith([2], { reason: 'select' });
      expect(onSelectionChange).toHaveBeenCalledWith({
        action: 'select',
        affectedRowKeys: [2],
        selectedRowKeys: [2],
        isAllSelected: false,
      });

      grid.toggleRowSelection(2);
      expect(onSelectedRowKeysChange).toHaveBeenLastCalledWith([], { reason: 'deselect' });
    });

    it('tells the header checkbox apart from a row', () => {
      const onSelectedRowKeysChange = vi.fn();
      const grid = createGrid({ onSelectedRowKeysChange });

      grid.toggleSelectAllRows();
      expect(onSelectedRowKeysChange).toHaveBeenLastCalledWith(expect.arrayContaining([1, 10]), { reason: 'select-all' });

      grid.toggleSelectAllRows();
      expect(onSelectedRowKeysChange).toHaveBeenLastCalledWith([], { reason: 'clear' });
    });
  });

  describe('sorting', () => {
    it('reports the sort as one value, and undefined once it is cleared', () => {
      const onSortingChange = vi.fn();
      const onSortChange = vi.fn();
      const grid = createGrid({ onSortingChange, onSortChange });

      grid.setSortColumn('customer');
      expect(onSortingChange).toHaveBeenCalledWith({ columnKey: 'customer', direction: 'ASC' }, { reason: 'sort' });
      expect(onSortChange).toHaveBeenCalledWith('customer', 'ASC');

      grid.setSortColumn('customer');
      expect(onSortingChange).toHaveBeenLastCalledWith({ columnKey: 'customer', direction: 'DESC' }, { reason: 'sort' });

      // The third press clears it: no column, so no sort — whatever direction the older pair reports.
      grid.setSortColumn('customer');
      expect(onSortingChange).toHaveBeenLastCalledWith(undefined, { reason: 'clear' });
      expect(onSortChange).toHaveBeenLastCalledWith(undefined, 'ASC');
    });
  });

  describe('pagination', () => {
    it('reports both pager values with a reason, beside the two older callbacks', () => {
      const onPaginationChange = vi.fn();
      const onPageChange = vi.fn();
      const onPageSizeChange = vi.fn();
      const grid = createGrid({ onPaginationChange, onPageChange, onPageSizeChange }, paginatedDef);

      grid.changePage(3);
      expect(onPaginationChange).toHaveBeenCalledWith({ page: 3, pageSize: 10 }, { reason: 'page' });
      expect(onPageChange).toHaveBeenCalledWith(3, 10);

      grid.changePageSize(25);
      expect(onPaginationChange).toHaveBeenLastCalledWith({ page: 1, pageSize: 25 }, { reason: 'page-size' });
      expect(onPageSizeChange).toHaveBeenCalledWith(25);
      expect(onPageChange).toHaveBeenLastCalledWith(1, 25);
    });

    it('says which query sent the pager back to the first page', () => {
      const onPaginationChange = vi.fn();
      const grid = createGrid({ onPaginationChange }, paginatedDef);

      grid.changePage(3);
      grid.setGlobalFilter('customer 4');
      expect(onPaginationChange).toHaveBeenLastCalledWith({ page: 1, pageSize: 10 }, { reason: 'filter' });

      grid.changePage(3);
      grid.setSortColumn('total');
      expect(onPaginationChange).toHaveBeenLastCalledWith({ page: 1, pageSize: 10 }, { reason: 'sort' });
    });
  });

  describe('filters and detail rows', () => {
    it('tells a filter that was set apart from one that was emptied', () => {
      const onColumnFiltersChange = vi.fn();
      const grid = createGrid({ onColumnFiltersChange });

      grid.setColumnFilter('customer', { type: 'text', value: 'Customer 1' });
      expect(onColumnFiltersChange).toHaveBeenCalledWith({ customer: { type: 'text', value: 'Customer 1' } }, { reason: 'filter' });

      grid.setColumnFilter('customer', undefined);
      expect(onColumnFiltersChange).toHaveBeenLastCalledWith({}, { reason: 'clear' });
    });

    it('says whether a detail row was opened or shut', () => {
      const onExpandedRowKeysChange = vi.fn();
      const grid = createGrid({ onExpandedRowKeysChange });

      grid.toggleDetailRow(3);
      expect(onExpandedRowKeysChange).toHaveBeenCalledWith([3], { reason: 'expand' });

      grid.toggleDetailRow(3);
      expect(onExpandedRowKeysChange).toHaveBeenLastCalledWith([], { reason: 'collapse' });
    });
  });

  describe('server state', () => {
    it('carries what moved beside the snapshot', () => {
      const onServerStateChange = vi.fn();
      const grid = createGrid({ onServerStateChange }, paginatedDef);

      grid.setGlobalFilter('customer 4');
      expect(onServerStateChange).toHaveBeenLastCalledWith(expect.objectContaining({ globalFilterValue: 'customer 4' }), {
        reason: 'filter',
      });

      grid.setSortColumn('total');
      expect(onServerStateChange).toHaveBeenLastCalledWith(expect.objectContaining({ sortColumn: 'total' }), { reason: 'sort' });

      grid.changePage(2);
      expect(onServerStateChange).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }), { reason: 'page' });
    });
  });

  // Bug #154: a handler used to mean "the caller owns this", so a grid given one without the value prop
  // beside it fired the callback and then did nothing at all.
  describe('a handler is a listener, not ownership', () => {
    it('filters when given only onGlobalFilterChange', () => {
      const grid = createGrid({ onGlobalFilterChange: vi.fn() });

      grid.setGlobalFilter('customer 4');
      expect(grid.globalFilterValue).toBe('customer 4');
      expect(grid.filteredData).toHaveLength(1);
    });

    it('paginates when given only onPageChange or onPageSizeChange', () => {
      const grid = createGrid({ onPageChange: vi.fn(), onPageSizeChange: vi.fn() }, paginatedDef);

      grid.changePage(3);
      expect(grid.page).toBe(3);

      grid.changePageSize(25);
      expect(grid.pageSize).toBe(25);
      expect(grid.page).toBe(1);
    });

    it('expands when given only onExpandedRowKeysChange', () => {
      const grid = createGrid({ onExpandedRowKeysChange: vi.fn() });

      grid.toggleDetailRow(3);
      expect(grid.expandedDetailRows.has(3)).toBe(true);
    });

    it('still lets the value prop win', () => {
      const grid = createGrid({ globalFilterValue: 'customer 1', onGlobalFilterChange: vi.fn(), page: 2 }, paginatedDef);

      grid.setGlobalFilter('customer 4');
      grid.changePage(4);

      expect(grid.globalFilterValue).toBe('customer 1');
      expect(grid.page).toBe(2);
    });
  });
});
