import { describe, expect, it, vi } from 'vitest';
import { ColumnType, DataGridProps, GridDefinition } from '../contracts/dataGridContract';
import GridModel from './gridModel';

interface TestRow {
  id: number;
  name: string;
  country: string;
  amount: number;
}

const data: TestRow[] = [
  { id: 1, name: 'John', country: 'USA', amount: 10 },
  { id: 2, name: 'Jane', country: 'UK', amount: 20 },
  { id: 3, name: 'Bob', country: 'USA', amount: 35 },
  { id: 4, name: 'Alice', country: 'UK', amount: 5 },
];

const columns: ColumnType<TestRow>[] = [
  { key: 'name', header: 'Name' },
  { key: 'country', header: 'Country' },
  { key: 'amount', header: 'Amount', aggregate: 'sum' },
];

const createGrid = (def: Partial<GridDefinition<TestRow>> = {}, props: Partial<DataGridProps<TestRow>> = {}): GridModel<TestRow> =>
  new GridModel({ data, def: { columns, ...def }, ...props }, vi.fn());

/** The values of every row of a given kind, which is what most of these assertions are about. */
const valuesOf = (grid: GridModel<TestRow>, kind?: 'group' | 'data' | 'footer') =>
  grid.exporter
    .table()
    .rows.filter((row) => !kind || row.kind === kind)
    .map((row) => row.values);

describe('ExportModel', () => {
  describe('the columns', () => {
    it('are the visible data columns, with their headers and their widths in characters', () => {
      const table = createGrid().exporter.table();

      expect(table.columns.map((c) => c.header)).toEqual(['Name', 'Country', 'Amount']);
      expect(table.columns.every((c) => c.width > 0)).toBe(true);
    });

    it('leave out the row number, the selection box and the expander, which hold no data', () => {
      const grid = createGrid({ showRowNumber: true, rowSelection: true, rowDetail: { content: () => null } });

      expect(grid.exporter.table().columns.map((c) => c.key)).toEqual(['name', 'country', 'amount']);
    });

    it('leave out a column the reader hid', () => {
      const grid = createGrid();
      grid.toggleColumnVisibility('country');

      expect(grid.exporter.table().columns.map((c) => c.key)).toEqual(['name', 'amount']);
    });

    // Grouping hides the column it groups by — its values moved to the group rows — so a file that
    // honoured "visible columns" literally would come out with no Country in it at all.
    it('keep a column that is hidden only because the grid is grouped by it', () => {
      const grid = createGrid();
      grid.toggleGrouping('country');

      expect(grid.columns.value.visibleLeafs.some((c) => c.key === 'country')).toBe(false);
      expect(grid.exporter.table().columns.map((c) => c.key)).toEqual(['name', 'country', 'amount']);
    });

    it('are the ones named, in the order named, when the caller names them', () => {
      const table = createGrid().exporter.table({ columns: ['amount', 'name', 'nope'] });

      expect(table.columns.map((c) => c.key)).toEqual(['amount', 'name']);
      expect(table.rows[0].values).toEqual([10, 'John']);
    });

    it('carry the number format the column declared', () => {
      const grid = createGrid({ columns: columns.map((c) => (c.key === 'amount' ? { ...c, exportFormat: '#,##0.00' } : c)) });

      expect(grid.exporter.table().columns.map((c) => c.format)).toEqual([undefined, undefined, '#,##0.00']);
    });
  });

  describe('the rows', () => {
    it('are what the filters and the sort left, in the order the grid shows them', () => {
      const grid = createGrid();
      grid.setSortColumn('amount', 'DESC');

      expect(valuesOf(grid, 'data').map((values) => values[2])).toEqual([35, 20, 10, 5]);
    });

    it('hold the raw field, not what a Cell renderer drew — an export runs no React', () => {
      const grid = createGrid({ columns: columns.map((c) => (c.key === 'name' ? { ...c, Cell: () => null } : c)) });

      expect(valuesOf(grid, 'data')[0][0]).toBe('John');
    });

    it("hold a column's own `exportValue` where it has one", () => {
      const grid = createGrid({
        columns: columns.map((c) => (c.key === 'name' ? { ...c, exportValue: (row: TestRow) => `${row.name} (${row.country})` } : c)),
      });

      expect(valuesOf(grid, 'data')[0][0]).toBe('John (USA)');
    });

    it('drop a row a filter removed', () => {
      const grid = createGrid({ globalFilter: true });
      grid.setGlobalFilter('UK');

      expect(valuesOf(grid, 'data')).toHaveLength(2);
    });
  });

  describe('a grouped grid', () => {
    const grouped = () => {
      const grid = createGrid();
      grid.toggleGrouping('country');

      return grid;
    };

    it('writes a row per group, carrying its value in the column it groups by', () => {
      const groups = valuesOf(grouped(), 'group');

      expect(groups.map((values) => values[1])).toEqual(['USA', 'UK']);
    });

    it('totals each group in the columns that aggregate, and leaves the rest blank', () => {
      const groups = valuesOf(grouped(), 'group');

      expect(groups[0]).toEqual([null, 'USA', 45]);
      expect(groups[1]).toEqual([null, 'UK', 25]);
    });

    it('puts its rows one level deeper than the group above them', () => {
      const grid = grouped();
      grid.rows.value.forEach((row) => grid.toggleGroupRow(row.key));

      expect(grid.exporter.table().rows.map((row) => [row.kind, row.level])).toEqual([
        ['group', 0],
        ['data', 1],
        ['data', 1],
        ['group', 0],
        ['data', 1],
        ['data', 1],
      ]);
    });

    // A collapsed group still exports its rows: an outline can be opened, and a file missing half its
    // data because of how the screen was left is not the grid.
    it('marks a collapsed group collapsed and its rows hidden, rather than dropping them', () => {
      const table = grouped().exporter.table();

      expect(table.rows.filter((row) => row.kind === 'data')).toHaveLength(4);
      expect(table.rows.filter((row) => row.collapsed)).toHaveLength(2);
      expect(table.rows.filter((row) => row.hidden)).toHaveLength(4);
    });

    it('flattens to one level when the groups are turned off', () => {
      const table = grouped().exporter.table({ groups: false });

      expect(table.rows.every((row) => row.kind === 'data' && row.level === 0)).toBe(true);
      expect(table.rows).toHaveLength(4);
    });
  });

  describe('the grand totals', () => {
    it('are written when the grid has a footer, over the rows the filters left', () => {
      const grid = createGrid({ footer: true, globalFilter: true });
      grid.setGlobalFilter('UK');

      expect(valuesOf(grid, 'footer')).toEqual([['Total', null, 25]]);
    });

    it('are absent without one, and present when the caller asks for one anyway', () => {
      expect(valuesOf(createGrid(), 'footer')).toHaveLength(0);
      expect(
        createGrid()
          .exporter.table({ footer: true })
          .rows.filter((row) => row.kind === 'footer'),
      ).toHaveLength(1);
      expect(
        createGrid({ footer: true })
          .exporter.table({ footer: false })
          .rows.filter((row) => row.kind === 'footer'),
      ).toHaveLength(0);
    });

    it('write no label where the grid renders one instead of naming it', () => {
      const grid = createGrid({ footer: { label: null } });

      expect(valuesOf(grid, 'footer')).toEqual([[null, null, 70]]);
    });
  });

  describe('the file name', () => {
    it('is what was asked for, then the grid title, then a fallback', () => {
      expect(createGrid().exporter.fileName({ fileName: 'q1' })).toBe('q1');
      expect(createGrid({ title: 'Revenue' }).exporter.fileName()).toBe('Revenue');
      expect(createGrid().exporter.fileName()).toBe('export');
      // A title that is markup names nothing, so the fallback stands.
      expect(createGrid({ title: 123 }).exporter.fileName()).toBe('export');
    });
  });
});
