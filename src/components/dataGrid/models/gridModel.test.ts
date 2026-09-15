import { describe, expect, it, suite, vi } from 'vitest';
import { ignoreLogs } from '../../../../dev/tests';
import ArrayUtils from '../../../utils/array/arrayUtils';
import { GridDefinition } from '../contracts/dataGridContract';
import GridModel, { DEFAULT_ROW_NUMBER_COLUMN_WIDTH, ROW_DETAIL_CELL_KEY, ROW_NUMBER_CELL_KEY } from './gridModel';
import GroupRowModel from './groupRowModel';
import RowModel from './rowModel';

interface Person {
  firstName: string;
  lastName: string;
  age: number;
  day: number;
  month: number;
  year: number;
  visits: number;
  status: string;
  progress: number;
}

const testData: Person[] = [
  { firstName: 'John', lastName: 'Doe', age: 20, day: 3, month: 5, year: 2000, visits: 23, status: 'OK', progress: 2 },
  { firstName: 'Joe', lastName: 'Smith', age: 22, day: 24, month: 11, year: 2002, visits: 3, status: 'Fail', progress: 4 },
];

describe('GridModel', () => {
  ignoreLogs();

  const gridDefinition: GridDefinition<Person> = {
    columns: [
      {
        key: 'employee',
        columns: [
          { key: 'age', columns: [{ key: 'day' }, { key: 'month' }, { key: 'year' }] },
          { key: 'name', columns: [{ key: 'firstName' }, { key: 'lastName' }] },
        ],
      },
      {
        key: 'visits',
      },
      {
        key: 'status',
      },
      {
        key: 'progress',
      },
    ],
  };

  function getGridModel(props?: { gridDef?: Partial<GridDefinition<Person>>; data?: Partial<Person>[] }) {
    const { gridDef, data } = props ?? {};

    const def = { ...gridDefinition, ...gridDef };

    return new GridModel<Person>(
      {
        def,
        data: (data ?? testData) as Person[],
      },
      () => {},
    );
  }

  suite('simple usage', () => {
    it('creates header Columns', () => {
      const grid = getGridModel({ gridDef: { columns: [{ key: 'firstName' }] } });

      expect(grid.headerRows.value).toHaveLength(1);
      // 1 user column (no empty cell with flexible sizing)
      expect(grid.headerRows.value.at(0)).toHaveLength(1);
    });

    it('creates no rows when no data', () => {
      const grid = getGridModel({ gridDef: { columns: [{ key: 'firstName' }] }, data: [] });

      expect(grid.rows.value).toHaveLength(0);
    });

    it('creates row model for each data item', () => {
      const data: Partial<Person>[] = [
        { firstName: 'John' },
        { firstName: 'John1' },
        { firstName: 'John2' },
        { firstName: 'John3' },
        { firstName: 'John4' },
      ];
      const grid = getGridModel({ gridDef: { columns: [{ key: 'firstName' }] }, data });

      expect(grid.rows.value).toHaveLength(5);
    });
  });

  suite('when pin columns', () => {
    it('calculates correct left distance', () => {
      const grid = getGridModel();

      const yearColumn = ArrayUtils.findOrThrow(grid.columns.value.flat, (c) => c.key === 'year');
      const firstNameColumn = ArrayUtils.findOrThrow(grid.columns.value.flat, (c) => c.key === 'firstName');

      expect(yearColumn.startOffset).to.eq(400);
      expect(firstNameColumn.startOffset).to.eq(600);
    });

    it('calculates correct end distance', () => {
      const grid = getGridModel();

      const firstNameColumn = ArrayUtils.findOrThrow(grid.columns.value.flat, (c) => c.key === 'firstName');
      const monthColumn = ArrayUtils.findOrThrow(grid.columns.value.flat, (c) => c.key === 'month');

      expect(firstNameColumn.endOffset).to.eq(grid.DEFAULT_COLUMN_WIDTH_PX * 1); // lastName
      expect(monthColumn.endOffset).to.eq(grid.DEFAULT_COLUMN_WIDTH_PX * 3); // year, firstName, lastName
    });

    it('moves parent header to the right pin position', () => {
      const grid = getGridModel({ gridDef: { columns: [{ key: 'parent', columns: [{ key: 'firstName' }] }] } });
      grid.pinColumn('firstName', 'START');

      const parentColumns = grid.columns.value.flat.filter((c) => c.key === 'parent');
      expect(parentColumns).toHaveLength(1);
    });

    it('moves parent header to the right pin position', () => {
      const grid = getGridModel({ gridDef: { columns: [{ key: 'parent', columns: [{ key: 'firstName' }] }] } });

      grid.pinColumn('parent', 'START');
      grid.pinColumn('firstNameSTART');

      const parentColumn = ArrayUtils.findOrThrow(grid.columns.value.flat, (c) => c.key === 'parent');
      expect(parentColumn.pin).toBeUndefined();

      const parentColumns = grid.columns.value.flat.filter((c) => c.key === 'parent');
      expect(parentColumns).toHaveLength(1);
    });
  });

  suite('when group by column', () => {
    const data: Partial<Person>[] = [
      { firstName: 'John', day: 20, month: 3 },
      { firstName: 'John1', day: 20, month: 3 },
      { firstName: 'John2', day: 20, month: 4 },
      { firstName: 'John3', day: 21, month: 5 },
      { firstName: 'John4', day: 21, month: 6 },
    ];

    it('groups data by day', () => {
      const grid = getGridModel({ data });

      grid.toggleGrouping('day');

      expect(grid.flatRows.value).toHaveLength(2);
      expect(grid.flatRows.value.at(0) instanceof GroupRowModel).toBeTruthy();
      expect((grid.flatRows.value.at(0) as GroupRowModel<Person>).rows).toHaveLength(3);

      expect(grid.flatRows.value.at(1) instanceof GroupRowModel).toBeTruthy();
      expect((grid.flatRows.value.at(1) as GroupRowModel<Person>).rows).toHaveLength(2);
    });

    it('groups data by day and expand', () => {
      const grid = getGridModel({ data });

      grid.toggleGrouping('day');
      grid.toggleGroupRow(grid.rows.value[0].key);

      expect(grid.flatRows.value).toHaveLength(5);
      expect(grid.flatRows.value.at(0) instanceof GroupRowModel).toBeTruthy();
      expect(grid.flatRows.value.at(1) instanceof RowModel).toBeTruthy();
      expect(grid.flatRows.value.at(2) instanceof RowModel).toBeTruthy();
      expect(grid.flatRows.value.at(3) instanceof RowModel).toBeTruthy();
      expect(grid.flatRows.value.at(4) instanceof GroupRowModel).toBeTruthy();
    });

    it('groups data by day and month', () => {
      const grid = getGridModel({ data });

      grid.toggleGrouping('day');
      grid.toggleGrouping('month');

      expect(grid.rows.value).toHaveLength(2);

      expect(grid.rows.value.at(0) instanceof GroupRowModel).toBeTruthy();
      expect((grid.rows.value.at(0) as GroupRowModel<Person>).rows).toHaveLength(2);
      expect((grid.rows.value.at(0) as GroupRowModel<Person>).rows.at(0) instanceof GroupRowModel).toBeTruthy();
      expect(((grid.rows.value.at(0) as GroupRowModel<Person>).rows.at(0) as GroupRowModel<Person>).rows).toHaveLength(2);
      expect((grid.rows.value.at(0) as GroupRowModel<Person>).rows.at(1) instanceof GroupRowModel).toBeTruthy();
      expect(((grid.rows.value.at(0) as GroupRowModel<Person>).rows.at(1) as GroupRowModel<Person>).rows).toHaveLength(1);

      expect(grid.rows.value.at(1) instanceof GroupRowModel).toBeTruthy();
      expect((grid.rows.value.at(1) as GroupRowModel<Person>).rows).toHaveLength(2);
      expect((grid.rows.value.at(1) as GroupRowModel<Person>).rows.at(0) instanceof GroupRowModel).toBeTruthy();
      expect(((grid.rows.value.at(1) as GroupRowModel<Person>).rows.at(0) as GroupRowModel<Person>).rows).toHaveLength(1);
      expect((grid.rows.value.at(1) as GroupRowModel<Person>).rows.at(1) instanceof GroupRowModel).toBeTruthy();
      expect(((grid.rows.value.at(1) as GroupRowModel<Person>).rows.at(1) as GroupRowModel<Person>).rows).toHaveLength(1);
    });

    it('starts grouped by `def.groupBy`, with the grouped column hidden', () => {
      const grid = getGridModel({ data, gridDef: { groupBy: ['day'], columns: [{ key: 'day' }, { key: 'firstName' }] } });

      expect(grid.flatRows.value).toHaveLength(2);
      expect(grid.flatRows.value.at(0) instanceof GroupRowModel).toBeTruthy();
      expect(grid.hiddenColumns.has('day')).toBe(true);
    });

    it('`groupDefaultExpanded` opens the groups nobody has touched, and a collapse still wins', () => {
      const grid = getGridModel({
        data,
        gridDef: { groupBy: ['day'], groupDefaultExpanded: true, columns: [{ key: 'day' }, { key: 'firstName' }] },
      });

      expect(grid.flatRows.value).toHaveLength(7);

      const first = grid.rows.value[0] as GroupRowModel<Person>;
      first.toggleRow();

      expect(first.expanded).toBe(false);
      expect(grid.flatRows.value).toHaveLength(4);
    });

    it('`groupDefaultExpanded` takes a depth', () => {
      const grid = getGridModel({
        data,
        gridDef: { groupBy: ['day', 'month'], groupDefaultExpanded: 1, columns: [{ key: 'day' }, { key: 'month' }, { key: 'firstName' }] },
      });

      // The two day groups are open and the month groups inside them are not.
      expect(grid.flatRows.value.filter((row) => row instanceof GroupRowModel)).toHaveLength(6);
      expect(grid.flatRows.value.filter((row) => row instanceof RowModel)).toHaveLength(0);
    });

    it('the menu still takes it from there', () => {
      const grid = getGridModel({ data, gridDef: { groupBy: ['day'], columns: [{ key: 'day' }, { key: 'firstName' }] } });

      grid.unGroupAll();

      expect(grid.groupColumns.size).toBe(0);
      expect(grid.hiddenColumns.has('day')).toBe(false);
    });

    it('resets hidden columns when ungrouping all', () => {
      const grid = getGridModel({ data, gridDef: { columns: [{ key: 'day' }, { key: 'firstName' }] } });

      grid.toggleGrouping('day');
      expect(grid.hiddenColumns.has('day')).toBe(true);

      grid.unGroupAll();

      expect(grid.hiddenColumns.has('day')).toBe(false);
      const dayColumn = grid.columns.value.leafs.find((c) => c.key === 'day');
      expect(dayColumn?.isVisible).toBe(true);

      // Ensure header rows are recalculated and include the day column
      const headerLevel0 = grid.headerRows.value.at(0)!;
      expect(headerLevel0.some((c) => c.key === 'day')).toBe(true);

      // Ensure grid template columns recalculated (uses max-content for columns)
      const gtc = grid.gridTemplateColumns.value;
      expect(typeof gtc).toBe('string');
      expect(gtc.includes('max-content')).toBe(true);
    });
  });

  suite('selection events', () => {
    it('emits selection change on select-all and deselect', () => {
      const onSelectionChange = vi.fn();
      const grid = getGridModel({ gridDef: { rowSelection: true, columns: [{ key: 'firstName' }] }, data: testData });

      grid.props.onSelectionChange = onSelectionChange;

      grid.toggleSelectAllRows();
      expect(onSelectionChange).toHaveBeenCalledTimes(1);
      const selectEvent = onSelectionChange.mock.calls.at(-1)![0];
      expect(selectEvent.action).toBe('select');
      expect(selectEvent.isAllSelected).toBe(true);
      expect(selectEvent.selectedRowKeys).toHaveLength(testData.length);

      const firstKey = grid.getRowKey(testData[0] as Person);
      grid.toggleRowsSelection([firstKey]);

      expect(onSelectionChange).toHaveBeenCalledTimes(2);
      const deselectEvent = onSelectionChange.mock.calls.at(-1)![0];
      expect(deselectEvent.action).toBe('deselect');
      expect(deselectEvent.isAllSelected).toBe(false);
      expect(deselectEvent.selectedRowKeys).not.toContain(firstKey);
    });
  });

  suite('when sort column', () => {
    it('sets the sort column', () => {
      const grid = getGridModel();

      grid.setSortColumn('firstName');

      expect(grid.sortColumn).toEqual('firstName');
      expect(grid.sortDirection).toEqual('ASC');
    });

    it('changes sort direction', () => {
      const grid = getGridModel();

      grid.setSortColumn('firstName');
      grid.setSortColumn('firstName');

      expect(grid.sortColumn).toEqual('firstName');
      expect(grid.sortDirection).toEqual('DESC');
    });

    it('clears sort column', () => {
      const grid = getGridModel();

      grid.setSortColumn('firstName');
      grid.setSortColumn('firstName');
      grid.setSortColumn('firstName');

      expect(grid.sortColumn).toBeUndefined();
    });

    it('sets the sort column and sort direction', () => {
      const grid = getGridModel();

      grid.setSortColumn('firstName', 'ASC');
      expect(grid.sortColumn).toEqual('firstName');
      expect(grid.sortDirection).toEqual('ASC');

      grid.setSortColumn('firstName', 'ASC');
      expect(grid.sortColumn).toEqual('firstName');
      expect(grid.sortDirection).toEqual('ASC');

      grid.setSortColumn('firstName', 'DESC');
      expect(grid.sortColumn).toEqual('firstName');
      expect(grid.sortDirection).toEqual('DESC');

      grid.setSortColumn('age', 'DESC');
      expect(grid.sortColumn).toEqual('age');
      expect(grid.sortDirection).toEqual('DESC');

      grid.setSortColumn('firstName', undefined);
      expect(grid.sortColumn).toBeUndefined();
      expect(grid.sortDirection).toBeUndefined();
    });
  });

  suite('when showRowNumber column', () => {
    it('adds row number column', () => {
      const grid = getGridModel({ gridDef: { showRowNumber: true } });

      // 8 user columns + 1 row number column (no empty cell with flexible sizing)
      expect(grid.columns.value.visibleLeafs).toHaveLength(9);

      const rowNumberColumn = grid.columns.value.visibleLeafs.find((x) => x.key === ROW_NUMBER_CELL_KEY);
      expect(rowNumberColumn).toBeDefined();
      expect(rowNumberColumn?.inlineWidth).toBe(DEFAULT_ROW_NUMBER_COLUMN_WIDTH);
    });

    it('should be at first position', () => {
      const grid = getGridModel({ gridDef: { showRowNumber: true } });

      const rowNumberColumnIndex = grid.columns.value.visibleLeafs.findIndex((x) => x.key === ROW_NUMBER_CELL_KEY);
      expect(rowNumberColumnIndex).toEqual(0);
    });

    it('uses custom options', () => {
      const grid = getGridModel({ gridDef: { showRowNumber: { pinned: true, width: 129 } } });

      const rowNumberColumn = grid.columns.value.visibleLeafs.find((x) => x.key === ROW_NUMBER_CELL_KEY);
      expect(rowNumberColumn).toBeDefined();

      expect(rowNumberColumn?.inlineWidth).toEqual(129);
      expect(rowNumberColumn?.pin).toEqual('START');
    });
  });

  suite('when rowDetail', () => {
    it('adds expand column with empty header by default', () => {
      const grid = getGridModel({
        gridDef: { columns: [{ key: 'firstName' }], rowDetail: { content: () => null } },
      });

      const expandColumn = grid.columns.value.visibleLeafs.find((x) => x.key === ROW_DETAIL_CELL_KEY);
      expect(expandColumn).toBeDefined();
      expect(expandColumn?.header).toBe('');
    });

    it('uses custom expandColumnHeader', () => {
      const grid = getGridModel({
        gridDef: { columns: [{ key: 'firstName' }], rowDetail: { content: () => null, expandColumnHeader: 'Details' } },
      });

      const expandColumn = grid.columns.value.visibleLeafs.find((x) => x.key === ROW_DETAIL_CELL_KEY);
      expect(expandColumn?.header).toBe('Details');
    });

    it('expand column defaults to width 50', () => {
      const grid = getGridModel({
        gridDef: { columns: [{ key: 'firstName' }], rowDetail: { content: () => null } },
      });

      const expandColumn = grid.columns.value.visibleLeafs.find((x) => x.key === ROW_DETAIL_CELL_KEY);
      expect(expandColumn?.inlineWidth).toBe(50);
    });

    it('expand column uses custom expandColumnWidth', () => {
      const grid = getGridModel({
        gridDef: { columns: [{ key: 'firstName' }], rowDetail: { content: () => null, expandColumnWidth: 80 } },
      });

      const expandColumn = grid.columns.value.visibleLeafs.find((x) => x.key === ROW_DETAIL_CELL_KEY);
      expect(expandColumn?.inlineWidth).toBe(80);
    });

    it('expand column is excluded from userVisibleLeafs', () => {
      const grid = getGridModel({
        gridDef: { columns: [{ key: 'firstName' }], rowDetail: { content: () => null } },
      });

      expect(grid.columns.value.userVisibleLeafs.some((c) => c.key === ROW_DETAIL_CELL_KEY)).toBe(false);
    });
  });

  suite('resizerStyle', () => {
    it('defaults to visible', () => {
      const grid = getGridModel();
      expect(grid.resizerStyle).toBe('visible');
    });

    it('respects hover setting', () => {
      const grid = getGridModel({ gridDef: { resizerStyle: 'hover' } });
      expect(grid.resizerStyle).toBe('hover');
    });

    it('respects hidden setting', () => {
      const grid = getGridModel({ gridDef: { resizerStyle: 'hidden' } });
      expect(grid.resizerStyle).toBe('hidden');
    });
  });

  suite('viewportWidth CSS variable', () => {
    it('includes --viewport-width in sizes when container width is set', () => {
      const grid = getGridModel({ gridDef: { columns: [{ key: 'firstName' }] } });
      grid.setContainerWidth(800);

      expect(grid.sizes.value['--viewport-width']).toBe('800px');
    });

    it('does not include --viewport-width when container width is 0', () => {
      const grid = getGridModel({ gridDef: { columns: [{ key: 'firstName' }] } });

      expect(grid.sizes.value['--viewport-width']).toBeUndefined();
    });

    it('updates --viewport-width when container is resized', () => {
      const grid = getGridModel({ gridDef: { columns: [{ key: 'firstName' }] } });
      grid.setContainerWidth(800);
      expect(grid.sizes.value['--viewport-width']).toBe('800px');

      grid.setContainerWidth(1200);
      expect(grid.sizes.value['--viewport-width']).toBe('1200px');
    });
  });
});
