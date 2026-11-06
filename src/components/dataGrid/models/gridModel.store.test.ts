import { describe, expect, it, vi } from 'vitest';
import { ignoreLogs } from '../../../../dev/tests';
import ArrayUtils from '../../../utils/array/arrayUtils';
import { DataGridProps, GridDefinition } from '../contracts/dataGridContract';
import GridModel from './gridModel';

interface Person {
  firstName: string;
  lastName: string;
}

const data: Person[] = [
  { firstName: 'A', lastName: 'X' },
  { firstName: 'B', lastName: 'Y' },
];

const def: GridDefinition<Person> = { columns: [{ key: 'firstName' }, { key: 'lastName' }] };

function getGrid(props?: Partial<DataGridProps<Person>>) {
  return new GridModel<Person>({ data, def, ...props });
}

describe('GridModel store', () => {
  ignoreLogs();

  it('notifies subscribers and increments the snapshot on mutation', () => {
    const grid = getGrid();
    const listener = vi.fn();
    grid.subscribe(listener);

    const before = grid.getSnapshot();
    grid.setSortColumn('firstName');

    expect(listener).toHaveBeenCalledTimes(1);
    expect(grid.getSnapshot()).toBe(before + 1);
  });

  it('getSnapshot is stable between mutations', () => {
    const grid = getGrid();
    const a = grid.getSnapshot();
    const b = grid.getSnapshot();
    expect(a).toBe(b);
  });

  it('unsubscribe stops further notifications', () => {
    const grid = getGrid();
    const listener = vi.fn();
    const unsubscribe = grid.subscribe(listener);

    grid.setSortColumn('firstName');
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    grid.setSortColumn('lastName');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('supports multiple independent subscribers', () => {
    const grid = getGrid();
    const a = vi.fn();
    const b = vi.fn();
    grid.subscribe(a);
    grid.subscribe(b);

    grid.notify();
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it('registers the optional constructor onChange listener', () => {
    const onChange = vi.fn();
    const grid = new GridModel<Person>({ data, def }, onChange);

    grid.notify();
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  describe('setProps', () => {
    it('is a no-op (no memo rebuild) when the same props object is passed', () => {
      const grid = getGrid();
      const rows = grid.rows.value; // prime cache
      grid.setProps(grid.props);
      expect(grid.rows.value).toBe(rows); // same cached instance, not recomputed
    });

    it('rebuilds rows when the data prop changes', () => {
      const grid = getGrid();
      const rows = grid.rows.value;

      const newData: Person[] = [{ firstName: 'C', lastName: 'Z' }];
      grid.setProps({ data: newData, def });

      expect(grid.rows.value).not.toBe(rows);
      expect(grid.rows.value).toHaveLength(1);
    });

    it('rebuilds columns when the def prop changes', () => {
      const grid = getGrid();
      const columns = grid.columns.value;

      grid.setProps({ data, def: { columns: [{ key: 'firstName' }] } });

      expect(grid.columns.value).not.toBe(columns);
      expect(grid.columns.value.userVisibleLeafs).toHaveLength(1);
    });

    it('does not notify subscribers (render-time sync)', () => {
      const grid = getGrid();
      const listener = vi.fn();
      grid.subscribe(listener);

      grid.setProps({ data: [{ firstName: 'C', lastName: 'Z' }], def });
      expect(listener).not.toHaveBeenCalled();
    });
  });
});

describe('an inline def costs no re-sort (E11)', () => {
  ignoreLogs();

  const people: Person[] = [
    { firstName: 'C', lastName: 'Z' },
    { firstName: 'A', lastName: 'X' },
    { firstName: 'B', lastName: 'Y' },
  ];

  it('a def that is a new object with the same content keeps the sorted, searched row models', () => {
    const grid = new GridModel<Person>({ data: people, def: { ...def, globalFilter: true } });
    grid.setSortColumn('firstName');
    grid.filter.setGlobalFilter('a');
    const rows = grid.rows.value;
    const matches = vi.spyOn(grid, 'rowMatchesFilters');
    const sortBy = vi.spyOn(ArrayUtils, 'sortBy');

    grid.setProps({ data: people, def: { ...def, globalFilter: true } });

    expect(grid.rows.value).toBe(rows);
    expect(matches).not.toHaveBeenCalled();
    expect(sortBy).not.toHaveBeenCalled();
    sortBy.mockRestore();
  });

  it('still answers what it reads: a new search, a new sort and a new rowKey', () => {
    const grid = new GridModel<Person>({ data: people, def: { ...def, globalFilter: true } });
    const names = () => grid.rows.value.map((row) => (row as { data: Person }).data.firstName);
    grid.setSortColumn('firstName');
    expect(names()).toEqual(['A', 'B', 'C']);

    grid.setProps({ data: people, def: { ...def, globalFilter: true } });
    grid.filter.setGlobalFilter('b');
    expect(names()).toEqual(['B']);

    grid.filter.setGlobalFilter('');
    grid.setSortColumn('firstName', 'DESC');
    expect(names()).toEqual(['C', 'B', 'A']);

    const keys = grid.rows.value.map((row) => row.key);
    grid.setProps({ data: people, def: { ...def, globalFilter: true, rowKey: 'lastName' } });
    expect(grid.rows.value.map((row) => row.key)).not.toEqual(keys);
    expect(grid.rows.value.map((row) => row.key)).toEqual(['Z', 'Y', 'X']);
  });
});

describe('a width change redraws the header and no row (E11)', () => {
  ignoreLogs();

  const versions = (grid: GridModel<Person>) => grid.flatRows.value.map((row, index) => grid.rowVersion(row, index));

  it('the grid growing wider', () => {
    const grid = getGrid();
    grid.setContainerWidth(600);
    const rows = versions(grid);
    const { headerVersion } = grid;
    const listener = vi.fn();
    grid.subscribe(listener);

    grid.setContainerWidth(900);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(versions(grid)).toEqual(rows);
    expect(grid.headerVersion).not.toBe(headerVersion);
  });

  it('a column resize ending', () => {
    const grid = getGrid();
    const rows = versions(grid);
    const { headerVersion } = grid;
    const column = ArrayUtils.findOrThrow(grid.columns.value.leafs, (c) => c.key === 'firstName');

    column.beginResize(100);
    column.applyResize(160);
    column.endResize();

    expect(versions(grid)).toEqual(rows);
    expect(grid.headerVersion).not.toBe(headerVersion);
  });
});
