import { describe, expect, it } from 'vitest';
import { ignoreLogs } from '../../../../dev/tests';
import { DataGridProps, GridDefinition } from '../contracts/dataGridContract';
import GridModel from './gridModel';
import { DEFAULT_LIST_BREAKPOINT } from './listModel';

interface Order {
  id: number;
  customer: string;
  status: string;
  country: string;
  total: number;
  date: string;
  note: string;
}

const data: Order[] = Array.from({ length: 45 }, (_, i) => ({
  id: i + 1,
  customer: `Customer ${i + 1}`,
  status: i % 3 === 0 ? 'Shipped' : 'Pending',
  country: i % 2 === 0 ? 'Japan' : 'Spain',
  total: (i + 1) * 10,
  date: '2026-03-01',
  note: '',
}));

const def: GridDefinition<Order> = {
  rowKey: 'id',
  columns: [
    { key: 'customer', header: 'Customer' },
    { key: 'status', header: 'Status', filterable: { type: 'multiselect' } },
    { key: 'country', header: 'Country' },
    { key: 'total', header: 'Total', align: 'end', filterable: { type: 'number' } },
    { key: 'date', header: 'Date' },
    { key: 'note', header: 'Note', filterable: true },
    { key: 'id', header: 'Id' },
  ],
};

function getGrid(overrides?: Partial<DataGridProps<Order>>, defOverrides?: Partial<GridDefinition<Order>>) {
  return new GridModel<Order>({ data, def: { ...def, ...defOverrides }, ...overrides });
}

const keys = (columns: { key: unknown }[]) => columns.map((c) => c.key);

describe('ListModel', () => {
  ignoreLogs();

  describe('when the grid is a list', () => {
    it('is a table until something has measured it', () => {
      expect(getGrid().list.active).toBe(false);
    });

    it('follows its own width across the breakpoint', () => {
      const { list } = getGrid();

      list.setWidth(DEFAULT_LIST_BREAKPOINT - 1);
      expect(list.active).toBe(true);

      list.setWidth(DEFAULT_LIST_BREAKPOINT);
      expect(list.active).toBe(false);
    });

    it('takes its breakpoint from def.list', () => {
      const { list } = getGrid({}, { list: { breakpoint: 800 } });

      list.setWidth(700);
      expect(list.active).toBe(true);
    });

    it('is told to redraw only when the breakpoint is crossed', () => {
      const grid = getGrid();
      let renders = 0;
      grid.subscribe(() => renders++);

      grid.list.setWidth(300);
      grid.list.setWidth(320);
      grid.list.setWidth(900);

      expect(renders).toBe(2);
    });

    it("lets layout: 'table' and 'list' choose for good", () => {
      const table = getGrid({}, { layout: 'table' }).list;
      table.setWidth(300);
      expect(table.active).toBe(false);

      expect(getGrid({}, { layout: 'list' }).list.active).toBe(true);
    });
  });

  describe('which column goes where', () => {
    it('reads a title, an end value, four fields and the rest as detail off the columns alone', () => {
      const { title, end, kicker, subtitle, fields, detail } = getGrid().list.layout.value;

      expect(title?.key).toBe('customer');
      // The first end-aligned column sits opposite the title.
      expect(end?.key).toBe('total');
      expect(kicker).toBeUndefined();
      expect(subtitle).toEqual([]);
      expect(keys(fields)).toEqual(['status', 'country', 'date', 'note']);
      expect(keys(detail)).toEqual(['id']);
    });

    it('takes every role a column names for itself', () => {
      const { title, end, kicker, subtitle, fields, detail } = getGrid(
        {},
        {
          columns: [
            { key: 'customer', list: 'subtitle' },
            { key: 'id', list: 'title' },
            { key: 'date', list: 'kicker' },
            { key: 'status', list: 'end' },
            { key: 'total', align: 'end', list: 'detail' },
            { key: 'country', list: 'hidden' },
            { key: 'note', list: 'field' },
          ],
        },
      ).list.layout.value;

      expect(title?.key).toBe('id');
      expect(kicker?.key).toBe('date');
      expect(end?.key).toBe('status');
      expect(keys(subtitle)).toEqual(['customer']);
      expect(keys(fields)).toEqual(['note']);
      expect(keys(detail)).toEqual(['total']);
    });

    it('caps the fields at def.list.fields', () => {
      const { fields, detail } = getGrid({}, { list: { fields: 1 } }).list.layout.value;

      expect(keys(fields)).toEqual(['status']);
      expect(keys(detail)).toEqual(['country', 'date', 'note', 'id']);
    });

    it('leaves out a grouped column, which its group header already says', () => {
      const { title, fields, detail } = getGrid({}, { groupBy: ['country'] }).list.layout.value;

      expect([title, ...fields, ...detail].map((c) => c?.key)).not.toContain('country');
    });

    it('lists every column it draws in column order for the record view', () => {
      expect(keys(getGrid().list.recordColumns)).toEqual(['customer', 'status', 'country', 'total', 'date', 'note', 'id']);
    });
  });

  describe('how many items', () => {
    it('draws a batch of twenty, and "Show more" adds the next', () => {
      const { list } = getGrid();

      expect(list.visibleItems).toHaveLength(20);
      expect(list.hasMore).toBe(true);
      expect(list.nextBatch).toBe(20);

      list.showMore();
      list.showMore();
      expect(list.visibleItems).toHaveLength(45);
      expect(list.hasMore).toBe(false);
    });

    it('starts again from one batch when the question changes', () => {
      const grid = getGrid();
      grid.list.showMore();
      expect(grid.list.visibleItems).toHaveLength(40);

      grid.setSortColumn('total', 'DESC');
      expect(grid.list.visibleItems).toHaveLength(20);
    });

    it('keeps what was shown when a group opens, which changes the rows and not the question', () => {
      const grid = getGrid({}, { groupBy: ['status'], list: { batchSize: 2 } });
      expect(grid.list.visibleItems.map((i) => i.row.kind)).toEqual(['group', 'group']);

      grid.toggleGroupRow(grid.list.visibleItems[0].row.key);
      grid.list.showMore();
      grid.toggleGroupRow(grid.list.visibleItems[1].row.key);

      expect(grid.list.visibleItems).toHaveLength(4);
    });

    it('draws the whole page when the grid is paginated', () => {
      const { list } = getGrid({}, { pagination: { totalCount: 450 } });

      expect(list.visibleItems).toHaveLength(45);
      expect(list.hasMore).toBe(false);
    });

    it('hands each entry its index in the grid rows, past an open detail panel', () => {
      const grid = getGrid({ expandedRowKeys: [1] }, { rowDetail: { content: () => null } });

      expect(grid.list.visibleItems.slice(0, 2).map((i) => i.index)).toEqual([0, 2]);
    });
  });

  describe('selecting', () => {
    it('is a mode only a grid with row selection has', () => {
      const plain = getGrid().list;
      plain.setSelecting(true);
      expect(plain.selecting).toBe(false);

      const selectable = getGrid({}, { rowSelection: true }).list;
      selectable.setSelecting(true);
      expect(selectable.selecting).toBe(true);
    });

    it('gives each row a checkbox id that is the grid’s own and survives any key', () => {
      const first = getGrid();
      const second = getGrid();
      first.setIdentifier('grid-a');
      second.setIdentifier('grid-b');

      expect(first.list.checkboxId(1)).not.toBe(second.list.checkboxId(1));
      expect(first.list.checkboxId('a b/c')).toBe('grid-a-pick-a%20b%2Fc');
    });
  });

  describe('sheets and filters', () => {
    it('opens one sheet at a time', () => {
      const { list } = getGrid();

      list.openSheet('sort');
      expect(list.sheet).toBe('sort');
      list.openSheet('filter');
      expect(list.sheet).toBe('filter');
      list.openSheet(null);
      expect(list.sheet).toBeNull();
    });

    it('offers the sortable and the filterable columns', () => {
      const { list } = getGrid(
        {},
        {
          columns: [
            { key: 'customer', sortable: false },
            { key: 'total', filterable: { type: 'number' } },
          ],
        },
      );

      expect(keys(list.sortableColumns)).toEqual(['total']);
      expect(keys(list.filterableColumns)).toEqual(['total']);
    });

    it('says each filter in force in words', () => {
      const { list } = getGrid({
        columnFilters: {
          note: { type: 'text', value: 'ali' },
          total: { type: 'number', operator: 'gte', value: 30 },
          status: { type: 'multiselect', values: ['Shipped', 'Pending', null] },
        },
      });

      expect(list.activeFilters.map((f) => `${f.label}: ${f.value}`)).toEqual([
        'Status: Shipped, Pending +1',
        'Total: ≥ 30',
        'Note: “ali”',
      ]);
    });

    it('writes a range as one', () => {
      const { list } = getGrid({ columnFilters: { total: { type: 'number', operator: 'between', value: 20, valueTo: 40 } } });

      expect(list.activeFilters[0].value).toBe('20–40');
    });

    it('knows which column is sorted', () => {
      const grid = getGrid();
      expect(grid.list.sortedColumn).toBeUndefined();

      grid.setSortColumn('total', 'ASC');
      expect(grid.list.sortedColumn?.key).toBe('total');
    });
  });

  describe('the record view', () => {
    it('opens on a row and steps through the rows in the order the list shows them', () => {
      const grid = getGrid();
      grid.setSortColumn('total', 'DESC');
      const [first] = grid.list.visibleItems;

      grid.list.openRecord(first.row as never, first.index);
      expect(grid.list.record?.key).toBe(45);
      expect(grid.list.recordPosition).toEqual({ position: 1, total: 45 });
      expect(grid.list.hasPreviousRecord).toBe(false);

      grid.list.stepRecord(1);
      expect(grid.list.record?.key).toBe(44);
      expect(grid.list.recordPosition).toEqual({ position: 2, total: 45 });

      grid.list.closeRecord();
      expect(grid.list.record).toBeUndefined();
    });

    it('steps over group headers and detail panels, and counts rows only', () => {
      const grid = getGrid(
        { expandedRowKeys: [1] },
        { rowDetail: { content: () => null }, groupBy: ['country'], groupDefaultExpanded: true },
      );
      const firstRow = grid.list.visibleItems.find((i) => i.row.kind === 'row')!;

      grid.list.openRecord(firstRow.row as never, firstRow.index);
      grid.list.stepRecord(1);

      expect(grid.list.record?.kind).toBe('row');
      expect(grid.list.recordPosition).toEqual({ position: 2, total: 45 });
    });

    it('draws as far as the record it stepped to, so closing lands beside an item that exists', () => {
      const grid = getGrid({}, { list: { batchSize: 2 } });
      const [, second] = grid.list.visibleItems;

      grid.list.openRecord(second.row as never, second.index);
      grid.list.stepRecord(1);
      grid.list.stepRecord(1);

      expect(grid.list.visibleItems).toHaveLength(4);
    });

    it('finds the row again when the list moves under it', () => {
      const grid = getGrid({}, { rowDetail: { content: () => null } });
      const [, second] = grid.list.visibleItems;
      grid.list.openRecord(second.row as never, second.index);

      // A panel opening above pushes the row one place down.
      grid.toggleDetailRow(1);

      expect(grid.list.record?.key).toBe(2);
    });
  });
});
