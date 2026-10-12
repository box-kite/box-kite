import { describe, expect, it } from 'vitest';
import { ignoreLogs } from '../../../../dev/tests';
import ArrayUtils from '../../../utils/array/arrayUtils';
import { GridDefinition } from '../contracts/dataGridContract';
import GridModel, { ROW_NUMBER_CELL_KEY, ROW_SELECTION_CELL_KEY } from './gridModel';

interface Person {
  firstName: string;
  lastName: string;
  age: number;
}

const data: Person[] = [
  { firstName: 'John', lastName: 'Doe', age: 20 },
  { firstName: 'Jane', lastName: 'Smith', age: 22 },
];

function getGrid(def?: Partial<GridDefinition<Person>>) {
  return new GridModel<Person>({
    data,
    def: { columns: [{ key: 'firstName', header: 'First' }, { key: 'age' }], ...def },
  });
}

const leaf = (grid: GridModel<Person>, key: string | number) => ArrayUtils.findOrThrow(grid.columns.value.leafs, (c) => c.key === key);

describe('HeaderCellModel', () => {
  ignoreLogs();

  describe('label', () => {
    it('uses header when provided, else the key', () => {
      const grid = getGrid();
      expect(leaf(grid, 'firstName').headerCell.label).toBe('First');
      expect(leaf(grid, 'age').headerCell.label).toBe('age');
    });

    it('is null for row-number and selection columns', () => {
      const grid = getGrid({ showRowNumber: true, rowSelection: true });
      expect(leaf(grid, ROW_NUMBER_CELL_KEY).headerCell.label).toBeNull();
      expect(leaf(grid, ROW_SELECTION_CELL_KEY).headerCell.label).toBeNull();
    });

    it('resolves the grouped column header when exactly one group is active', () => {
      const grid = getGrid();
      grid.toggleGrouping('firstName');
      const grouping = ArrayUtils.findOrThrow(grid.columns.value.leafs, (c) => c.isGrouping);
      expect(grouping.headerCell.label).toBe('First');
    });

    it('is "Group" when more than one column is grouped', () => {
      const grid = getGrid();
      grid.toggleGrouping('firstName');
      grid.toggleGrouping('age');
      const grouping = ArrayUtils.findOrThrow(grid.columns.value.leafs, (c) => c.isGrouping);
      expect(grouping.headerCell.label).toBe('Group');
    });
  });

  describe('flags', () => {
    it('data columns are sortable / resizable / show the context menu by default', () => {
      const hc = leaf(getGrid(), 'firstName').headerCell;
      expect(hc.isSortable).toBe(true);
      expect(hc.showResizer).toBe(true);
      expect(hc.showContextMenu).toBe(true);
    });

    it('row-number column is not sortable and shows no resizer/menu', () => {
      const hc = leaf(getGrid({ showRowNumber: true }), ROW_NUMBER_CELL_KEY).headerCell;
      expect(hc.isSortable).toBe(false);
      expect(hc.showResizer).toBe(false);
      expect(hc.showContextMenu).toBe(false);
    });

    it('respects column-level sortable: false', () => {
      const grid = getGrid({ columns: [{ key: 'firstName', sortable: false }] });
      expect(leaf(grid, 'firstName').headerCell.isSortable).toBe(false);
    });
  });

  describe('isAtGridEnd', () => {
    it('is the last visible column, and moves when that one is hidden', () => {
      const grid = getGrid({ columns: [{ key: 'firstName' }, { key: 'lastName' }, { key: 'age' }] });
      expect(leaf(grid, 'age').headerCell.isAtGridEnd).toBe(true);
      expect(leaf(grid, 'lastName').headerCell.isAtGridEnd).toBe(false);

      grid.toggleColumnVisibility('age');
      expect(leaf(grid, 'lastName').headerCell.isAtGridEnd).toBe(true);
    });

    it('covers a group header ending at the edge', () => {
      const grid = getGrid({ columns: [{ key: 'firstName' }, { key: 'name', columns: [{ key: 'lastName' }, { key: 'age' }] }] });
      const group = ArrayUtils.findOrThrow(grid.columns.value.flat, (c) => c.key === 'name');
      expect(group.headerCell.isAtGridEnd).toBe(true);
    });

    it('is never an end-pinned column, whose resizer is on its start side', () => {
      const grid = getGrid({ columns: [{ key: 'firstName' }, { key: 'age', pin: 'END' }] });
      expect(leaf(grid, 'age').headerCell.isAtGridEnd).toBe(false);
    });
  });

  describe('sort context-menu availability', () => {
    it('offers asc + desc and no clear when unsorted', () => {
      const hc = leaf(getGrid(), 'firstName').headerCell;
      expect(hc.canSortAsc).toBe(true);
      expect(hc.canSortDesc).toBe(true);
      expect(hc.canClearSort).toBe(false);
    });

    it('after ASC: hides asc, offers desc + clear; reflects in isSorted/sortDirection', () => {
      const grid = getGrid();
      grid.setSortColumn('firstName', 'ASC');
      const hc = leaf(grid, 'firstName').headerCell;
      expect(hc.isSorted).toBe(true);
      expect(hc.sortDirection).toBe('ASC');
      expect(hc.canSortAsc).toBe(false);
      expect(hc.canSortDesc).toBe(true);
      expect(hc.canClearSort).toBe(true);
    });
  });

  describe('pin context-menu availability', () => {
    it('unpinned column can pin left/right but not unpin', () => {
      const hc = leaf(getGrid(), 'firstName').headerCell;
      expect(hc.canPinStart).toBe(true);
      expect(hc.canPinEnd).toBe(true);
      expect(hc.canUnpin).toBe(false);
    });

    it('left-pinned column cannot pin left and can unpin', () => {
      const grid = getGrid({ columns: [{ key: 'firstName', pin: 'START' }, { key: 'age' }] });
      const hc = leaf(grid, 'firstName').headerCell;
      expect(hc.canPinStart).toBe(false);
      expect(hc.canUnpin).toBe(true);
    });
  });

  describe('group context-menu availability', () => {
    it('data leaf can group by, grouping column can ungroup all', () => {
      const grid = getGrid();
      expect(leaf(grid, 'firstName').headerCell.canGroupBy).toBe(true);
      grid.toggleGrouping('firstName');
      const grouping = ArrayUtils.findOrThrow(grid.columns.value.leafs, (c) => c.isGrouping);
      expect(grouping.headerCell.canGroupBy).toBe(false);
      expect(grouping.headerCell.canUnGroupAll).toBe(true);
    });
  });
});
