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

// Bug #165: two levels deep, the numbers counted child groups and read the inner groups' keys before their parent existed.
describe('GroupRowModel numbering, two levels deep', () => {
  ignoreLogs();

  const people: Person[] = [
    { firstName: 'A', day: 1, month: 1 },
    { firstName: 'B', day: 1, month: 2 },
    { firstName: 'C', day: 2, month: 2 },
    { firstName: 'D', day: 2, month: 2 },
  ];

  function nested(groupDefaultExpanded?: boolean) {
    return new GridModel<Person>(
      { data: people, def: { ...def, rowKey: 'firstName', groupBy: ['day', 'month'], groupDefaultExpanded } },
      () => {},
    );
  }

  const numbers = (grid: GridModel<Person>) => grid.flatRows.value.map((row) => (row.kind === 'detail' ? null : row.rowIndex));
  const sequence = (length: number) => Array.from({ length }, (_, index) => index);

  it('numbers the nine display rows 0…8 when everything is open', () => {
    const grid = nested(true);

    expect(grid.flatRows.value).toHaveLength(9);
    expect(numbers(grid)).toEqual(sequence(9));
  });

  it('numbers the display rows in order with the inner groups open and closed in every combination', () => {
    for (let mask = 0; mask < 8; mask++) {
      const grid = nested(true);
      const inner = grid.rows.value.flatMap((group) => (group as GroupRowModel<Person>).rows as GroupRowModel<Person>[]);
      inner.forEach((group, bit) => {
        if (mask & (1 << bit)) grid.toggleGroupRow(group.key, true);
      });

      const shown = 9 - [1, 1, 2].reduce((hidden, size, bit) => hidden + (mask & (1 << bit) ? size : 0), 0);
      expect(grid.flatRows.value, `mask ${mask}`).toHaveLength(shown);
      expect(numbers(grid), `mask ${mask}`).toEqual(sequence(shown));
    }
  });

  it('opens an inner group by hand and numbers what it reveals', () => {
    const grid = nested();
    const outer = grid.rows.value[0] as GroupRowModel<Person>;
    grid.toggleGroupRow(outer.key, false);
    const inner = (grid.rows.value[0] as GroupRowModel<Person>).rows[1] as GroupRowModel<Person>;
    grid.toggleGroupRow(inner.key, false);

    expect(grid.flatRows.value.map((row) => row.key)).toEqual([outer.key, 'day1month1', inner.key, 'B', 'day2']);
    expect(numbers(grid)).toEqual(sequence(5));
  });

  it('the row number column copies what the rows show', () => {
    const grid = new GridModel<Person>(
      {
        data: people,
        def: {
          ...def,
          rowKey: 'firstName',
          groupBy: ['day', 'month'],
          groupDefaultExpanded: true,
          showRowNumber: true,
          rangeSelection: true,
        },
      },
      () => {},
    );
    const rowNumber = grid.columns.value.visibleLeafs.findIndex((column) => column.isRowNumber);

    grid.range.setCurrent(0, rowNumber);
    grid.range.setCurrent(8, rowNumber, true);

    expect(grid.range.values().map(([value]) => value)).toEqual(sequence(9).map((index) => index + 1));
  });
});
