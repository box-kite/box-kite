import { describe, expect, it, vi } from 'vitest';
import { ColumnType, DataGridProps, GridDefinition } from '../contracts/dataGridContract';
import GridModel from './gridModel';
import GroupRowModel from './groupRowModel';

interface TestRow {
  id: number;
  name: string;
  country: string;
  amount: number;
  note: string | null;
}

const createTestData = (): TestRow[] => [
  { id: 1, name: 'John', country: 'USA', amount: 10, note: 'a' },
  { id: 2, name: 'Jane', country: 'UK', amount: 20, note: null },
  { id: 3, name: 'Bob', country: 'USA', amount: 35, note: 'c' },
  { id: 4, name: 'Alice', country: 'UK', amount: 5, note: 'd' },
];

const columns = (overrides: Partial<ColumnType<TestRow>> = {}): ColumnType<TestRow>[] => [
  { key: 'name', header: 'Name' },
  { key: 'country', header: 'Country' },
  { key: 'amount', header: 'Amount', ...overrides },
  { key: 'note', header: 'Note' },
];

const createGridModel = (def: Partial<GridDefinition<TestRow>> = {}, props: Partial<DataGridProps<TestRow>> = {}): GridModel<TestRow> =>
  new GridModel({ data: createTestData(), def: { columns: columns({ aggregate: 'sum' }), ...def }, ...props }, vi.fn());

const amountOf = (grid: GridModel<TestRow>, key = 'amount') => grid.aggregation.footerCells.value.find((c) => c.column.key === key)!.value;

/** The group row a grid grouped by `country` holds for that value. */
const groupRow = (grid: GridModel<TestRow>, value: string): GroupRowModel<TestRow> =>
  grid.rows.value.find((r) => (r as GroupRowModel<TestRow>).groupValue === value) as GroupRowModel<TestRow>;

describe('GridModel aggregation', () => {
  describe('the built-in functions', () => {
    const valueOf = (aggregate: ColumnType<TestRow>['aggregate']) => amountOf(createGridModel({ columns: columns({ aggregate }) }));

    it('sums, averages and takes the extremes of the numbers in the column', () => {
      expect(valueOf('sum')).toBe(70);
      expect(valueOf('avg')).toBe(17.5);
      expect(valueOf('min')).toBe(5);
      expect(valueOf('max')).toBe(35);
    });

    it('counts rows rather than values, so a blank is still a row', () => {
      const grid = createGridModel({ columns: columns().map((c) => (c.key === 'note' ? { ...c, aggregate: 'count' as const } : c)) });

      expect(amountOf(grid, 'note')).toBe(4);
    });

    it('rounds an average to two decimals', () => {
      const data: TestRow[] = [1, 2, 2].map((amount, id) => ({ id, name: 'a', country: 'x', amount, note: null }));
      const grid = new GridModel<TestRow>({ data, def: { columns: columns({ aggregate: 'avg' }) } }, vi.fn());

      expect(amountOf(grid)).toBe(1.67);
    });

    it('answers null rather than zero when the column holds no number at all', () => {
      const grid = createGridModel({ columns: columns().map((c) => (c.key === 'note' ? { ...c, aggregate: 'sum' as const } : c)) });

      expect(amountOf(grid, 'note')).toBeNull();
    });

    it('hands a custom function the values and the rows they came from', () => {
      const seen: { values: unknown[]; rows: TestRow[] }[] = [];
      const grid = createGridModel({
        columns: columns({
          aggregate: (values, rows) => {
            seen.push({ values, rows });
            return `${rows.length} rows`;
          },
        }),
      });

      expect(amountOf(grid)).toBe('4 rows');
      expect(seen[0].values).toEqual([10, 20, 35, 5]);
      expect(seen[0].rows).toHaveLength(4);
    });
  });

  describe('the grand total', () => {
    it('covers only the rows the filters left', () => {
      const grid = createGridModel({ footer: true, globalFilter: true });
      grid.setGlobalFilter('USA');

      expect(amountOf(grid)).toBe(45);
    });

    it('is rendered only when something asks for it and something aggregates', () => {
      expect(createGridModel({ footer: true }).aggregation.hasFooter).toBe(true);
      expect(createGridModel({}).aggregation.hasFooter).toBe(false);
      expect(createGridModel({ footer: true, columns: columns() }).aggregation.hasFooter).toBe(false);
    });

    it('labels the first data column that is not aggregating', () => {
      const grid = createGridModel({ footer: true });

      expect(grid.aggregation.footerLabelColumn?.key).toBe('name');
      expect(grid.aggregation.footerLabel).toBe('Total');
    });

    it('takes a label of its own, and drops it when the label is empty', () => {
      expect(createGridModel({ footer: { label: 'All teams' } }).aggregation.footerLabel).toBe('All teams');
      expect(createGridModel({ footer: {} }).aggregation.footerLabel).toBeUndefined();
    });
  });

  describe('on a group row', () => {
    it('aggregates the rows under the group, not the whole grid', () => {
      const grid = createGridModel();
      grid.toggleGrouping('country');

      const cell = groupRow(grid, 'USA').cells.find((c) => c.column.key === 'amount')!;

      expect(cell.cellKind).toBe('aggregate');
      expect(cell.aggregate!.value).toBe(45);
      expect(cell.aggregate!.scope).toBe('group');
    });

    it('stops the label cell spanning at the first aggregated column, so a value sits under its own heading', () => {
      const grid = createGridModel();
      grid.toggleGrouping('country');

      const row = groupRow(grid, 'USA');

      // The grouping cell plus `name`; `amount` aggregates and `note` follows it, so both draw their own.
      expect(row.groupingColumnGridColumn).toBe(2);
      expect(row.cells.map((c) => c.cellKind)).toEqual(['grouping', 'hidden', 'aggregate', 'spacer']);
    });

    it('spans every column when nothing aggregates, exactly as it did before', () => {
      const grid = createGridModel({ columns: columns() });
      grid.toggleGrouping('country');

      const row = groupRow(grid, 'USA');

      expect(row.groupingColumnGridColumn).toBe(4);
      expect(row.cells.map((c) => c.cellKind)).toEqual(['grouping', 'hidden', 'hidden', 'hidden']);
    });

    it('gives the grouping cell a width matching the span it actually covers', () => {
      const grid = createGridModel();
      grid.toggleGrouping('country');

      const groupingColumn = grid.columns.value.visibleLeafs.find((c) => c.isGrouping)!;
      const spanned = grid.groupingSpan.value.reduce((sum, c) => sum + (c.inlineWidth ?? 0), 0);

      expect(grid.groupingSpan.value.map((c) => c.key)).toEqual(['grouping-cell', 'name']);
      expect(grid.sizes.value[groupingColumn.groupColumnWidthVarName]).toBe(`${spanned}px`);
    });
  });
});
