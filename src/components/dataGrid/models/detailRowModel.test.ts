import { describe, expect, it } from 'vitest';
import { ignoreLogs } from '../../../../dev/tests';
import { GridDefinition } from '../contracts/dataGridContract';
import DetailRowModel from './detailRowModel';
import GridModel from './gridModel';
import RowModel from './rowModel';

interface Order {
  id: number;
  customer: string;
  total: number;
}

const data: Order[] = [
  { id: 1, customer: 'Alice', total: 100 },
  { id: 2, customer: 'Bob', total: 200 },
  { id: 3, customer: 'Charlie', total: 300 },
];

const def: GridDefinition<Order> = {
  rowKey: 'id',
  columns: [
    { key: 'customer', header: 'Customer' },
    { key: 'total', header: 'Total' },
  ],
  rowDetail: {
    content: () => null,
    height: 150,
  },
};

function getGrid(overrides?: Partial<GridDefinition<Order>>) {
  return new GridModel<Order>({ data, def: { ...def, ...overrides } }, () => {});
}

describe('DetailRowModel', () => {
  ignoreLogs();

  it('key is prefixed with detail-', () => {
    const grid = getGrid();
    const row = grid.rows.value[0] as RowModel<Order>;
    const detail = new DetailRowModel(grid, row);
    expect(detail.key).toBe('detail-1');
  });

  it('height uses static config value', () => {
    const grid = getGrid();
    const row = grid.rows.value[0] as RowModel<Order>;
    const detail = new DetailRowModel(grid, row);
    expect(detail.height).toBe(150);
  });

  it('height defaults to auto when not configured', () => {
    const grid = getGrid({ rowDetail: { content: () => null } });
    const row = grid.rows.value[0] as RowModel<Order>;
    const detail = new DetailRowModel(grid, row);
    expect(detail.height).toBe('auto');
    expect(detail.heightForOffset).toBe(200);
  });

  it('height supports function config', () => {
    const grid = getGrid({
      rowDetail: {
        content: () => null,
        height: (order) => order.total + 50,
      },
    });
    const row = grid.rows.value[0] as RowModel<Order>;
    const detail = new DetailRowModel(grid, row);
    expect(detail.height).toBe(150); // 100 + 50
  });

  it('count is 0', () => {
    const grid = getGrid();
    const row = grid.rows.value[0] as RowModel<Order>;
    const detail = new DetailRowModel(grid, row);
    expect(detail.count).toBe(0);
  });

  it('flatRows returns array with self', () => {
    const grid = getGrid();
    const row = grid.rows.value[0] as RowModel<Order>;
    const detail = new DetailRowModel(grid, row);
    expect(detail.flatRows).toEqual([detail]);
  });

  it('allRows returns empty array', () => {
    const grid = getGrid();
    const row = grid.rows.value[0] as RowModel<Order>;
    const detail = new DetailRowModel(grid, row);
    expect(detail.allRows).toEqual([]);
  });
});

describe('GridModel row detail integration', () => {
  ignoreLogs();

  it('adds expand column when rowDetail is configured', () => {
    const grid = getGrid();
    const expandCol = grid.columns.value.visibleLeafs.find((c) => c.key === 'row-detail-cell');
    expect(expandCol).toBeDefined();
  });

  it('does not add expand column when rowDetail is not configured', () => {
    const grid = getGrid({ rowDetail: undefined });
    const expandCol = grid.columns.value.visibleLeafs.find((c) => c.key === 'row-detail-cell');
    expect(expandCol).toBeUndefined();
  });

  it('toggleDetailRow expands and collapses rows', () => {
    const grid = getGrid();
    const row = grid.rows.value[0];

    expect(grid.expandedDetailRows.has(row.key)).toBe(false);
    expect(grid.flatRows.value).toHaveLength(3); // 3 data rows

    grid.toggleDetailRow(row.key);
    expect(grid.expandedDetailRows.has(row.key)).toBe(true);
    expect(grid.flatRows.value).toHaveLength(4); // 3 data rows + 1 detail row

    grid.toggleDetailRow(row.key);
    expect(grid.expandedDetailRows.has(row.key)).toBe(false);
    expect(grid.flatRows.value).toHaveLength(3);
  });

  it('multiple rows can be expanded', () => {
    const grid = getGrid();

    grid.toggleDetailRow(1);
    grid.toggleDetailRow(2);

    expect(grid.flatRows.value).toHaveLength(5); // 3 data + 2 detail
    expect(grid.expandedDetailRows.has(1)).toBe(true);
    expect(grid.expandedDetailRows.has(2)).toBe(true);
  });

  it('detail row appears after parent row in flatRows', () => {
    const grid = getGrid();
    grid.toggleDetailRow(1);

    const flatRows = grid.flatRows.value;
    expect(flatRows[0].key).toBe(1); // parent row
    expect(flatRows[1].key).toBe('detail-1'); // detail row
    expect(flatRows[1]).toBeInstanceOf(DetailRowModel);
    expect(flatRows[2].key).toBe(2); // next row
  });

  it('rowOffsets computes correct offsets with detail rows', () => {
    const grid = getGrid();

    // No detail rows: all uniform height
    let { offsets, totalHeight } = grid.rowOffsets.value;
    expect(offsets).toEqual([0, 48, 96]);
    expect(totalHeight).toBe(144); // 3 * 48

    // Expand row 1 (height: 150)
    grid.toggleDetailRow(1);
    ({ offsets, totalHeight } = grid.rowOffsets.value);
    expect(offsets).toEqual([0, 48, 198, 246]); // [0, 48, 48+150, 48+150+48]
    expect(totalHeight).toBe(294); // 48 + 150 + 48 + 48
  });

  it('controlled expandedRowKeys works', () => {
    const grid = new GridModel<Order>({ data, def, expandedRowKeys: [1, 3] }, () => {});

    expect(grid.expandedDetailRows.has(1)).toBe(true);
    expect(grid.expandedDetailRows.has(2)).toBe(false);
    expect(grid.expandedDetailRows.has(3)).toBe(true);
    expect(grid.flatRows.value).toHaveLength(5); // 3 data + 2 detail
  });

  it('expand column excluded from userVisibleLeafs', () => {
    const grid = getGrid();
    const expandCol = grid.columns.value.userVisibleLeafs.find((c) => c.key === 'row-detail-cell');
    expect(expandCol).toBeUndefined();
  });

  describe('reveal', () => {
    it('an expand records the reveal, and it is taken exactly once', () => {
      const grid = getGrid();
      grid.toggleDetailRow(2);

      expect(grid.takeDetailReveal(2)).toBe(true);
      expect(grid.takeDetailReveal(2)).toBe(false);
    });

    it('another row does not take it, and does not clear it either', () => {
      const grid = getGrid();
      grid.toggleDetailRow(2);

      expect(grid.takeDetailReveal(1)).toBe(false);
      expect(grid.takeDetailReveal(2)).toBe(true);
    });

    it('a collapse records nothing', () => {
      const grid = getGrid();
      grid.toggleDetailRow(2);
      grid.toggleDetailRow(2);

      expect(grid.takeDetailReveal(2)).toBe(false);
    });

    // A request nothing consumed would otherwise scroll the next time that row happened to render.
    it('a second toggle drops a request the first one left unread', () => {
      const grid = getGrid();
      grid.toggleDetailRow(1);
      grid.toggleDetailRow(3);

      expect(grid.takeDetailReveal(1)).toBe(false);
      expect(grid.takeDetailReveal(3)).toBe(true);
    });

    it('scrollIntoView: false records nothing', () => {
      const grid = getGrid({ rowDetail: { content: () => null, height: 150, scrollIntoView: false } });
      grid.toggleDetailRow(2);

      expect(grid.takeDetailReveal(2)).toBe(false);
    });
  });
});
