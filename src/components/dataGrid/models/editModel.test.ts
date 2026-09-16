import { describe, expect, it, vi } from 'vitest';
import { ignoreLogs } from '../../../../dev/tests';
import { CellEdit, GridDefinition } from '../contracts/dataGridContract';
import GridModel from './gridModel';
import RowModel from './rowModel';

interface Row {
  id: string;
  name: string;
  score: number;
  active: boolean;
}

const data: Row[] = [
  { id: 'a', name: 'Ada', score: 10, active: true },
  { id: 'b', name: 'Ben', score: 20, active: false },
  { id: 'c', name: 'Cleo', score: 30, active: true },
];

function makeGrid(def: Partial<GridDefinition<Row>> = {}, props: Record<string, unknown> = {}) {
  return new GridModel<Row>(
    {
      data,
      def: {
        rowKey: 'id',
        columns: [{ key: 'name', editable: true }, { key: 'score', editable: true }, { key: 'active' }],
        ...def,
      },
      ...props,
    },
    () => {},
  );
}

/** The body rows, which is what the coordinates `beginAt` takes are over. */
function rows(grid: GridModel<Row>): RowModel<Row>[] {
  return grid.flatRows.value as RowModel<Row>[];
}

/** One cell's rendered value, which is what an edit is supposed to change. */
function shown(grid: GridModel<Row>, row: number, column: number): unknown {
  return rows(grid)[row].cells[column].value;
}

describe('EditModel', () => {
  ignoreLogs();

  it('is off until a column says otherwise', () => {
    expect(makeGrid({ columns: [{ key: 'name' }] }).edits.enabled).toBe(false);
    expect(makeGrid().edits.enabled).toBe(true);
    expect(makeGrid({ editable: true, columns: [{ key: 'name' }] }).edits.enabled).toBe(true);
  });

  it('a column inherits the grid-wide default and can refuse it', () => {
    const grid = makeGrid({ editable: true, columns: [{ key: 'name' }, { key: 'score', editable: false }] });
    const [name, score] = grid.columns.value.visibleLeafs;

    expect(grid.edits.isEditable(rows(grid)[0], name)).toBe(true);
    expect(grid.edits.isEditable(rows(grid)[0], score)).toBe(false);
  });

  it('a predicate decides per row', () => {
    const grid = makeGrid({ columns: [{ key: 'name', editable: (row) => row.active }] });
    const [name] = grid.columns.value.visibleLeafs;

    expect(grid.edits.isEditable(rows(grid)[0], name)).toBe(true);
    expect(grid.edits.isEditable(rows(grid)[1], name)).toBe(false);
  });

  it('reads the editor off the value when the column names none', () => {
    const grid = makeGrid({ editable: true });
    const [name, score, active] = grid.columns.value.visibleLeafs;

    expect(grid.edits.editorFor(name, 'Ada').type).toBe('text');
    expect(grid.edits.editorFor(score, 10).type).toBe('number');
    expect(grid.edits.editorFor(active, true).type).toBe('checkbox');
  });

  it('a commit changes what the cell shows without touching the data', () => {
    const grid = makeGrid();

    grid.edits.beginAt(0, 0);
    grid.edits.setDraft('Adele');
    grid.edits.commit();

    expect(shown(grid, 0, 0)).toBe('Adele');
    expect(data[0].name).toBe('Ada');
    expect(grid.edits.edits).toEqual([{ rowKey: 'a', columnKey: 'name', row: data[0], value: 'Adele', oldValue: 'Ada' }]);
  });

  it('a cancel writes nothing', () => {
    const grid = makeGrid();

    grid.edits.beginAt(0, 0);
    grid.edits.setDraft('Adele');
    grid.edits.cancel();

    expect(shown(grid, 0, 0)).toBe('Ada');
    expect(grid.edits.edits).toEqual([]);
  });

  it('a value that did not change is not an edit', () => {
    const onCellEdit = vi.fn();
    const grid = makeGrid({ onCellEdit });

    grid.edits.beginAt(0, 0);
    grid.edits.commit();

    expect(onCellEdit).not.toHaveBeenCalled();
    expect(grid.edits.edits).toEqual([]);
    expect(grid.edits.isEditing('a', 'name')).toBe(false);
  });

  it('a string from onCellEdit keeps the editor open and writes nothing', () => {
    const grid = makeGrid({ onCellEdit: () => 'Too short' });

    grid.edits.beginAt(0, 0);
    grid.edits.setDraft('A');
    grid.edits.commit();

    expect(grid.edits.error).toBe('Too short');
    expect(grid.edits.isEditing('a', 'name')).toBe(true);
    expect(shown(grid, 0, 0)).toBe('Ada');
  });

  it('false rejects with the grid own wording, and typing clears the message', () => {
    const grid = makeGrid({ onCellEdit: () => false });

    grid.edits.beginAt(0, 0);
    grid.edits.setDraft('A');
    grid.edits.commit();

    expect(grid.edits.error).toBe('Invalid value');

    grid.edits.setDraft('Ab');

    expect(grid.edits.error).toBeUndefined();
  });

  it('awaits an async validator and applies its answer', async () => {
    let settle: (answer: void | string) => void = () => {};
    const grid = makeGrid({ onCellEdit: () => new Promise<void | string>((resolve) => (settle = resolve)) });

    grid.edits.beginAt(0, 0);
    grid.edits.setDraft('Adele');
    grid.edits.commit();

    expect(grid.edits.pending).toBe(true);
    expect(shown(grid, 0, 0)).toBe('Ada');

    settle(undefined);
    await Promise.resolve();

    expect(grid.edits.pending).toBe(false);
    expect(shown(grid, 0, 0)).toBe('Adele');
  });

  it('drops an async answer for an edit that was abandoned', async () => {
    let settle: (answer: void | string) => void = () => {};
    const grid = makeGrid({ onCellEdit: () => new Promise<void | string>((resolve) => (settle = resolve)) });

    grid.edits.beginAt(0, 0);
    grid.edits.setDraft('Adele');
    grid.edits.commit();
    grid.edits.cancel();

    settle(undefined);
    await Promise.resolve();

    expect(shown(grid, 0, 0)).toBe('Ada');
    expect(grid.edits.edits).toEqual([]);
  });

  it('a rejected promise is the message', async () => {
    const grid = makeGrid({ onCellEdit: () => Promise.reject(new Error('Name is taken')) });

    grid.edits.beginAt(0, 0);
    grid.edits.setDraft('Ben');
    grid.edits.commit();
    await Promise.resolve();
    await Promise.resolve();

    expect(grid.edits.error).toBe('Name is taken');
  });

  it('reports the whole stream, oldest first, and empties it on clearEdits', () => {
    const onCellEditsChange = vi.fn<(edits: CellEdit<Row>[], details: { reason: string }) => void>();
    const grid = makeGrid({}, { onCellEditsChange });

    grid.edits.beginAt(0, 0);
    grid.edits.setDraft('Adele');
    grid.edits.commit();
    grid.edits.beginAt(1, 1);
    grid.edits.setDraft(21);
    grid.edits.commit();

    expect(onCellEditsChange.mock.calls[1][0].map((edit) => edit.value)).toEqual(['Adele', 21]);
    expect(onCellEditsChange.mock.calls[1][1].reason).toBe('edit');

    grid.edits.clearEdits();

    expect(shown(grid, 0, 0)).toBe('Ada');
    expect(onCellEditsChange).toHaveBeenLastCalledWith([], { reason: 'clear' });
  });

  it('an edit does not re-sort the grid', () => {
    const grid = makeGrid({ columns: [{ key: 'name', editable: true, sortable: true }] });

    grid.setSortColumn('name', 'ASC');
    grid.edits.beginAt(0, 0);
    grid.edits.setDraft('Zoe');
    grid.edits.commit();

    expect(rows(grid).map((row) => row.key)).toEqual(['a', 'b', 'c']);
    expect(shown(grid, 0, 0)).toBe('Zoe');
  });

  it('an export writes the edited value', async () => {
    const grid = makeGrid();

    grid.edits.beginAt(0, 0);
    grid.edits.setDraft('Adele');
    grid.edits.commit();

    const table = grid.exporter.table({});

    expect(table.rows[0].values[0]).toBe('Adele');
  });

  describe('where Tab goes', () => {
    it('steps along the row and on into the next one', () => {
      const grid = makeGrid();

      expect(grid.edits.nextEditable(0, 0)).toEqual({ row: 0, column: 1 });
      expect(grid.edits.nextEditable(0, 1)).toEqual({ row: 1, column: 0 });
      expect(grid.edits.nextEditable(1, 0, true)).toEqual({ row: 0, column: 1 });
    });

    it('steps over a column that cannot be edited', () => {
      const grid = makeGrid({ columns: [{ key: 'name', editable: true }, { key: 'score' }, { key: 'active', editable: true }] });

      expect(grid.edits.nextEditable(0, 0)).toEqual({ row: 0, column: 2 });
    });

    it('has nowhere to go from the last editable cell', () => {
      const grid = makeGrid();

      expect(grid.edits.nextEditable(2, 1)).toBeUndefined();
      expect(grid.edits.nextEditable(0, 0, true)).toBeUndefined();
    });
  });
});
