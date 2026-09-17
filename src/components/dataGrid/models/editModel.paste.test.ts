import { describe, expect, it, vi } from 'vitest';
import { ignoreLogs } from '../../../../dev/tests';
import { DataGridPaste, GridDefinition } from '../contracts/dataGridContract';
import GridModel from './gridModel';
import RowModel from './rowModel';

interface Row {
  id: string;
  name: string;
  score: number;
  active: boolean;
  city: string;
}

const data: Row[] = [
  { id: 'a', name: 'Ada', score: 10, active: true, city: 'Oslo' },
  { id: 'b', name: 'Ben', score: 20, active: false, city: 'Oslo' },
  { id: 'c', name: 'Cleo', score: 30, active: true, city: 'Riga' },
];

function makeGrid(def: Partial<GridDefinition<Row>> = {}, props: Record<string, unknown> = {}) {
  return new GridModel<Row>(
    {
      data,
      def: {
        rowKey: 'id',
        rangeSelection: true,
        columns: [{ key: 'name', editable: true }, { key: 'score', editable: true }, { key: 'active', editable: true }, { key: 'city' }],
        ...def,
      },
      ...props,
    },
    () => {},
  );
}

/** The clipboard reaching the grid, through the one entry point a browser uses. */
function paste(grid: GridModel<Row>, text: string): void {
  grid.range.onPaste({
    clipboardData: { getData: () => text },
    preventDefault: () => {},
  } as unknown as React.ClipboardEvent);
}

/** One cell's rendered value — where an accepted paste has to be readable, and nowhere else. */
function shown(grid: GridModel<Row>, row: number, column: number): unknown {
  return (grid.flatRows.value[row] as RowModel<Row>).cells[column].value;
}

describe('EditModel paste', () => {
  ignoreLogs();

  it('fills from the current cell, down and to the right, when nothing is marked', () => {
    const grid = makeGrid();

    grid.range.setCurrent(0, 0);
    paste(grid, 'Ida\t11\r\nJon\t12');

    expect(shown(grid, 0, 0)).toBe('Ida');
    expect(shown(grid, 0, 1)).toBe(11);
    expect(shown(grid, 1, 0)).toBe('Jon');
    expect(shown(grid, 1, 1)).toBe(12);
  });

  it('tiles a short clipboard across a longer block', () => {
    const grid = makeGrid();

    grid.range.setCurrent(0, 0);
    grid.range.setCurrent(2, 0, true);
    paste(grid, 'Ida');

    expect([shown(grid, 0, 0), shown(grid, 1, 0), shown(grid, 2, 0)]).toEqual(['Ida', 'Ida', 'Ida']);
  });

  it('spills past a block the clipboard is bigger than, and stops at the edge of the grid', () => {
    const grid = makeGrid();

    grid.range.setCurrent(2, 0);
    paste(grid, 'Ida\t11\r\nJon\t12\r\nKit\t13');

    // One row left below the current cell, so two of the three rows have nowhere to go.
    expect(shown(grid, 2, 0)).toBe('Ida');
    expect(shown(grid, 2, 1)).toBe(11);
    expect(grid.edits.edits).toHaveLength(2);
  });

  it('reads a value as the kind the cell already holds, and refuses one that cannot be', () => {
    const onPaste = vi.fn();
    const grid = makeGrid({}, { onPaste });

    grid.range.setCurrent(0, 1);
    grid.range.setCurrent(1, 2, true);
    paste(grid, '11\tfalse\r\nmany\ttrue');

    expect(shown(grid, 0, 1)).toBe(11);
    expect(shown(grid, 0, 2)).toBe(false);
    expect(shown(grid, 1, 2)).toBe(true);
    // `many` is not a number, so the cell keeps the value it had and says which one refused it.
    expect(shown(grid, 1, 1)).toBe(20);

    const [result] = onPaste.mock.lastCall as [DataGridPaste<Row>];
    expect(result.rejected).toEqual([expect.objectContaining({ rowKey: 'b', columnKey: 'score', error: 'Wrong kind of value' })]);
    expect(grid.edits.isRejected('b', 'score')).toBe(true);
  });

  it('asks `def.onCellEdit` about every cell, and a refusal skips that cell alone', () => {
    const onCellEdit = vi.fn((edit: { value: unknown }) => (edit.value === 'Jon' ? 'No Jons here' : undefined));
    const onPaste = vi.fn();
    const grid = makeGrid({ onCellEdit }, { onPaste });

    grid.range.setCurrent(0, 0);
    paste(grid, 'Ida\r\nJon\r\nKit');

    expect(onCellEdit).toHaveBeenCalledTimes(3);
    expect([shown(grid, 0, 0), shown(grid, 1, 0), shown(grid, 2, 0)]).toEqual(['Ida', 'Ben', 'Kit']);

    const [result] = onPaste.mock.lastCall as [DataGridPaste<Row>];
    expect(result.applied.map((edit) => edit.value)).toEqual(['Ida', 'Kit']);
    expect(result.rejected).toEqual([expect.objectContaining({ rowKey: 'b', error: 'No Jons here' })]);
  });

  it('counts the cells nothing can be written to rather than asking about them', () => {
    const onCellEdit = vi.fn();
    const onPaste = vi.fn();
    const grid = makeGrid({ onCellEdit }, { onPaste });

    // Two columns, one of them read-only: only the editable half is ever judged.
    grid.range.setCurrent(0, 2);
    grid.range.setCurrent(0, 3, true);
    paste(grid, 'true\tBergen');

    expect(onCellEdit).toHaveBeenCalledTimes(1);

    const [result] = onPaste.mock.lastCall as [DataGridPaste<Row>];
    expect(result.skipped).toBe(1);
    expect(shown(grid, 0, 3)).toBe('Oslo');
  });

  it('reports the block once, whatever it held, and reads the values it wrote', () => {
    const onPaste = vi.fn();
    const onCellEditsChange = vi.fn();
    const grid = makeGrid({}, { onPaste, onCellEditsChange });

    grid.range.setCurrent(0, 0);
    paste(grid, 'Ida\t11\r\nJon\t12');

    expect(onPaste).toHaveBeenCalledTimes(1);
    expect(onCellEditsChange).toHaveBeenCalledTimes(1);
    expect(onCellEditsChange).toHaveBeenLastCalledWith(expect.arrayContaining([expect.objectContaining({ value: 'Ida' })]), {
      reason: 'paste',
    });

    const [result] = onPaste.mock.lastCall as [DataGridPaste<Row>];
    expect(result.range).toEqual(expect.objectContaining({ startRow: 0, endRow: 1, columns: ['name', 'score'] }));
    expect(result.range.values()).toEqual([
      ['Ida', 11],
      ['Jon', 12],
    ]);
  });

  it('a value that did not change is not an edit, so pasting a column back over itself costs nothing', () => {
    const onPaste = vi.fn();
    const grid = makeGrid({}, { onPaste });

    grid.range.setCurrent(0, 0);
    grid.range.setCurrent(2, 0, true);
    paste(grid, 'Ada\r\nBen\r\nCleo');

    expect(grid.edits.edits).toEqual([]);

    const [result] = onPaste.mock.lastCall as [DataGridPaste<Row>];
    expect(result.applied).toEqual([]);
    expect(result.rejected).toEqual([]);
  });

  it('keeps a `select` to its own options, and the value it holds rather than the spelling', () => {
    const onPaste = vi.fn();
    const grid = makeGrid(
      {
        columns: [
          { key: 'name', editable: true },
          { key: 'score', editable: true, editor: { type: 'select', options: [{ value: 10 }, { value: 99 }] } },
        ],
      },
      { onPaste },
    );

    grid.range.setCurrent(0, 1);
    grid.range.setCurrent(1, 1, true);
    paste(grid, '99\r\n77');

    expect(shown(grid, 0, 1)).toBe(99);
    expect(shown(grid, 1, 1)).toBe(20);

    const [result] = onPaste.mock.lastCall as [DataGridPaste<Row>];
    expect(result.rejected).toHaveLength(1);
  });

  it('awaits an asynchronous judgement and settles the whole block at once', async () => {
    const onPaste = vi.fn();
    const onCellEdit = vi.fn((edit: { value: unknown }) => Promise.resolve(edit.value === 'Jon' ? 'No Jons here' : undefined));
    const grid = makeGrid({ onCellEdit }, { onPaste });

    grid.range.setCurrent(0, 0);
    paste(grid, 'Ida\r\nJon');

    expect(onPaste).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(onPaste).toHaveBeenCalledTimes(1));

    expect(shown(grid, 0, 0)).toBe('Ida');
    expect(shown(grid, 1, 0)).toBe('Ben');
  });

  it('drops a batch that was overtaken, so a second paste is the only one that lands', async () => {
    const onPaste = vi.fn();
    const onCellEdit = vi.fn(() => Promise.resolve());
    const grid = makeGrid({ onCellEdit }, { onPaste });

    grid.range.setCurrent(0, 0);
    paste(grid, 'Ida');
    paste(grid, 'Kit');

    await vi.waitFor(() => expect(onPaste).toHaveBeenCalledTimes(1));
    expect(shown(grid, 0, 0)).toBe('Kit');
  });

  it('gives the refusals up when the host takes the edits off the grid hands', () => {
    const grid = makeGrid();

    grid.range.setCurrent(0, 1);
    paste(grid, 'many');
    expect(grid.edits.isRejected('a', 'score')).toBe(true);

    grid.edits.clearEdits();
    expect(grid.edits.isRejected('a', 'score')).toBe(false);
  });

  it('gives one cell refusal up when the editor is opened on it', () => {
    const grid = makeGrid();

    grid.range.setCurrent(0, 1);
    paste(grid, 'many');

    const row = grid.flatRows.value[0] as RowModel<Row>;
    grid.edits.begin(row, grid.columns.value.visibleLeafs[1], 10);

    expect(grid.edits.isRejected('a', 'score')).toBe(false);
  });
});
