import { describe, expect, it } from 'vitest';
import { ignoreLogs } from '../../../../dev/tests';
import { GridDefinition } from '../contracts/dataGridContract';
import GridModel from './gridModel';
import GroupRowModel from './groupRowModel';

interface Person {
  firstName: string;
  day: number;
  month: number;
}

const data: Person[] = [
  { firstName: 'A', day: 1, month: 1 },
  { firstName: 'B', day: 1, month: 2 },
  { firstName: 'C', day: 2, month: 2 },
];

const def: GridDefinition<Person> = {
  columns: [{ key: 'firstName' }, { key: 'day' }, { key: 'month' }],
};

function getGrid() {
  return new GridModel<Person>({ data, def }, () => {});
}

describe('GroupRowModel', () => {
  ignoreLogs();

  it('creates group rows with correct key and count', () => {
    const grid = getGrid();
    grid.toggleGrouping('day');
    const groupRow = grid.rows.value[0] as GroupRowModel<Person>;
    expect(groupRow.count).toBe(2);
    expect(groupRow.key).toContain('day');
  });

  // Bug #254: a server group row is kept across renders, so one instance has to follow the columns.
  it('one instance follows the visible columns after they change', () => {
    const grid = getGrid();
    grid.toggleGrouping('day');
    const groupRow = grid.rows.value[0] as GroupRowModel<Person>;
    const before = groupRow.cells.length;

    grid.toggleColumnVisibility('month');

    expect(groupRow.cells.length).toBe(before - 1);
    expect(groupRow.cells.map((c) => c.column)).toEqual(grid.columns.value.visibleLeafs);
    expect(groupRow.renderedCells.every(({ cell }) => groupRow.cells.includes(cell))).toBe(true);
  });

  it('depth increases for nested grouping', () => {
    const grid = getGrid();
    grid.toggleGrouping('day');
    grid.toggleGrouping('month');
    const parentGroup = grid.rows.value[0] as GroupRowModel<Person>;
    const childGroup = parentGroup.rows[0] as GroupRowModel<Person>;
    expect(parentGroup.depth).toBe(0);
    expect(childGroup.depth).toBe(1);
  });

  it('expanded toggles with grid.toggleGroupRow', () => {
    const grid = getGrid();
    grid.toggleGrouping('day');
    const groupRow = grid.rows.value[0] as GroupRowModel<Person>;
    expect(groupRow.expanded).toBe(false);
    grid.toggleGroupRow(groupRow.key);
    expect(groupRow.expanded).toBe(true);
  });

  it('selected and indeterminate reflect child selection', () => {
    const grid = getGrid();
    grid.toggleGrouping('day');
    const groupRow = grid.rows.value[0] as GroupRowModel<Person>;

    // select one child -> indeterminate
    const childRowKey = groupRow.rows[0].key as string | number;
    grid.toggleRowSelection(childRowKey);
    expect(groupRow.selected).toBe(false);
    expect(groupRow.indeterminate).toBe(true);

    // select all children -> selected
    const allKeys = groupRow.allRows.map((r) => r.key);
    grid.toggleRowsSelection(allKeys);
    expect(groupRow.selected).toBe(true);
    expect(groupRow.indeterminate).toBe(false);
  });
});
