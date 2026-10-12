import { describe, expect, it } from 'vitest';
import { ignoreLogs } from '../../../../dev/tests';
import { GridDefinition } from '../contracts/dataGridContract';
import GridModel from './gridModel';

interface Person {
  firstName: string;
  lastName: string;
  age: number;
}

const data: Person[] = [{ firstName: 'John', lastName: 'Doe', age: 20 }];

function getGrid(def?: Partial<GridDefinition<Person>>) {
  return new GridModel<Person>({
    data,
    def: { columns: [{ key: 'firstName', header: 'First' }, { key: 'lastName' }, { key: 'age' }], ...def },
  });
}

describe('ColumnVisibilityModel', () => {
  ignoreLogs();

  it('lists only user data columns, with header-or-key labels', () => {
    const cv = getGrid({ showRowNumber: true, rowSelection: true }).columnVisibility;
    expect(cv.entries.map((e) => e.id)).toEqual(['firstName', 'lastName', 'age']);
    expect(cv.entries.map((e) => e.label)).toEqual(['First', 'lastName', 'age']);
    expect(cv.total).toBe(3);
  });

  it('reports all selected with nothing hidden initially', () => {
    const cv = getGrid().columnVisibility;
    expect(cv.selectedIds).toEqual(['firstName', 'lastName', 'age']);
    expect(cv.hiddenCount).toBe(0);
    expect(cv.hasHidden).toBe(false);
  });

  it('setVisibility hides the columns not listed (and only toggles what changed)', () => {
    const grid = getGrid();
    grid.columnVisibility.setVisibility(['firstName']);

    expect(grid.columnVisibility.selectedIds).toEqual(['firstName']);
    expect(grid.columnVisibility.hiddenCount).toBe(2);
    expect(grid.columnVisibility.hasHidden).toBe(true);
    expect(grid.hiddenColumns.has('lastName')).toBe(true);
    expect(grid.hiddenColumns.has('age')).toBe(true);
    expect(grid.hiddenColumns.has('firstName')).toBe(false);
  });

  it('setVisibility can re-show a hidden column', () => {
    const grid = getGrid();
    grid.columnVisibility.setVisibility(['firstName']);
    grid.columnVisibility.setVisibility(['firstName', 'lastName', 'age']);

    expect(grid.columnVisibility.hiddenCount).toBe(0);
    expect(grid.hiddenColumns.size).toBe(0);
  });

  it('searches label and group, ignoring case, and cuts the result into runs per group', () => {
    const grid = new GridModel<Person>({
      data,
      def: {
        columns: [
          {
            key: 'name',
            header: 'Name',
            columns: [
              { key: 'firstName', header: 'First' },
              { key: 'lastName', header: 'Last' },
            ],
          },
          { key: 'age', header: 'Age' },
        ],
      },
    });
    const cv = grid.columnVisibility;

    expect(cv.entries.map((e) => e.group)).toEqual(['Name', 'Name', undefined]);
    expect(cv.search('  FIR ').map((e) => e.id)).toEqual(['firstName']);
    expect(cv.search('name').map((e) => e.id)).toEqual(['firstName', 'lastName']);
    expect(cv.sections(cv.entries).map((s) => [s.group, s.entries.length])).toEqual([
      ['Name', 2],
      [undefined, 1],
    ]);
  });

  it('setAll shows or hides only the entries it is given', () => {
    const cv = getGrid().columnVisibility;

    cv.setAll(false, cv.search('name'));
    // 'First' is the label, so only the column labelled by its key matches.
    expect(cv.selectedIds).toEqual(['firstName', 'age']);
    expect(cv.visibleCount).toBe(2);

    cv.setAll(true);
    expect(cv.hiddenCount).toBe(0);
  });
});
