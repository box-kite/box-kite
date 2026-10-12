import { describe, expect, it } from 'vitest';
import { ignoreLogs } from '../../../../dev/tests';
import { GridDefinition } from '../contracts/dataGridContract';
import GridModel from './gridModel';

interface Person {
  id: number;
  firstName: string;
}

const data: Person[] = [
  { id: 1, firstName: 'A' },
  { id: 2, firstName: 'B' },
];

const def: GridDefinition<Person> = {
  rowKey: 'id',
  columns: [{ key: 'firstName' }],
};

function getGrid() {
  return new GridModel<Person>({ data, def }, () => {});
}

describe('RowModel', () => {
  ignoreLogs();

  it('generates key using rowKey', () => {
    const grid = getGrid();
    const row = grid.rows.value[0];
    expect(row.key).toEqual(1);
  });

  it('selected reflects grid.selectedRows', () => {
    const grid = getGrid();
    const row = grid.rows.value[0];
    grid.toggleRowSelection(row.key);
    expect(row.selected).toBe(true);
  });

  it('cells count equals visible leaf columns', () => {
    const grid = getGrid();
    const row = grid.rows.value[0];
    expect(row.cells.length).toEqual(grid.columns.value.visibleLeafs.length);
  });

  // Bug #254: a server row is kept across renders, so one instance has to follow the columns.
  it('one instance follows the visible columns after they change', () => {
    const grid = new GridModel<Person>({ data, def: { ...def, columns: [{ key: 'id' }, { key: 'firstName' }] } }, () => {});
    const row = grid.rows.value[0];
    expect(row.cells).toHaveLength(2);

    grid.toggleColumnVisibility('id');
    expect(row.cells.map((c) => c.column.key)).toEqual(['firstName']);

    grid.toggleColumnVisibility('id');
    expect(row.cells.map((c) => c.column.key)).toEqual(['id', 'firstName']);
  });

  it('flatRows returns array with self when no rowDetail', () => {
    const grid = getGrid();
    const row = grid.rows.value[0];
    expect(row.flatRows).toEqual([row]);
    expect(row.allRows).toBe(row);
  });

  it('flatRows returns self and detail row when expanded with rowDetail', () => {
    const grid = new GridModel<Person>(
      {
        data,
        def: { ...def, rowDetail: { content: () => null } },
      },
      () => {},
    );
    const row = grid.rows.value[0];

    // Not expanded yet
    expect(row.flatRows).toHaveLength(1);
    expect(row.expanded).toBe(false);

    // Expand the row
    grid.toggleDetailRow(row.key);
    const newRow = grid.rows.value[0];
    expect(newRow.expanded).toBe(true);
    expect(newRow.flatRows).toHaveLength(2);
    expect(newRow.flatRows[0]).toBe(newRow);
    expect(newRow.flatRows[1].key).toBe(`detail-${newRow.key}`);
  });
});
