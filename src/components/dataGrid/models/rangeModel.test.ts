import { describe, expect, it, vi } from 'vitest';
import { ignoreLogs } from '../../../../dev/tests';
import { CellRange, GridDefinition } from '../contracts/dataGridContract';
import GridModel from './gridModel';
import { fromTsv, toTsv } from './rangeModel';

interface Row {
  id: string;
  name: string;
  score: number;
  city: string;
}

const data: Row[] = [
  { id: 'a', name: 'Ada', score: 10, city: 'Oslo' },
  { id: 'b', name: 'Ben', score: 20, city: 'Oslo' },
  { id: 'c', name: 'Cleo', score: 30, city: 'Riga' },
];

function makeGrid(def: Partial<GridDefinition<Row>> = {}, props: Record<string, unknown> = {}) {
  return new GridModel<Row>(
    {
      data,
      def: {
        rowKey: 'id',
        rangeSelection: true,
        columns: [{ key: 'name' }, { key: 'score' }, { key: 'city' }],
        ...def,
      },
      ...props,
    },
    () => {},
  );
}

describe('RangeModel', () => {
  ignoreLogs();

  it('is off until the definition asks for it, and the current cell is not', () => {
    const plain = makeGrid({ rangeSelection: undefined });

    expect(plain.range.enabled).toBe(false);

    plain.range.setCurrent(1, 1);
    expect(plain.range.isCurrent(1, 1)).toBe(true);
    expect(plain.range.hasSelection).toBe(false);
  });

  it('a lone current cell is a cursor rather than a selection', () => {
    const grid = makeGrid();

    grid.range.setCurrent(0, 0);

    expect(grid.range.bounds).toEqual({ startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 });
    expect(grid.range.hasSelection).toBe(false);
    expect(grid.range.isSelected(0, 0)).toBe(false);
  });

  it('extending keeps the anchor and normalizes the rectangle in both directions', () => {
    const grid = makeGrid();

    grid.range.setCurrent(2, 2);
    grid.range.setCurrent(0, 1, true);

    expect(grid.range.bounds).toEqual({ startRow: 0, endRow: 2, startColumn: 1, endColumn: 2 });
    expect(grid.range.hasSelection).toBe(true);
    expect(grid.range.isSelected(1, 1)).toBe(true);
    expect(grid.range.isSelected(1, 0)).toBe(false);
    // The corner that moved is still the current one, which is what the next extension grows from.
    expect(grid.range.isCurrent(0, 1)).toBe(true);
  });

  it('a move without the modifier collapses the block onto the cell it landed on', () => {
    const grid = makeGrid();

    grid.range.setCurrent(0, 0);
    grid.range.setCurrent(2, 2, true);
    grid.range.setCurrent(1, 1);

    expect(grid.range.hasSelection).toBe(false);
    expect(grid.range.bounds).toEqual({ startRow: 1, endRow: 1, startColumn: 1, endColumn: 1 });
  });

  it('a focus that lands where the model already is leaves an extended block alone', () => {
    const grid = makeGrid();

    grid.range.setCurrent(0, 0);
    grid.range.setCurrent(2, 1, true);
    // What a Shift+press does: the block is extended before the browser focuses the cell it landed on.
    grid.range.syncCurrent(2, 1);

    expect(grid.range.hasSelection).toBe(true);

    // A focus arriving anywhere else is a move nobody asked to extend.
    grid.range.syncCurrent(0, 2);
    expect(grid.range.hasSelection).toBe(false);
  });

  it('a press starts a drag and every cell entered extends it, until the release', () => {
    const grid = makeGrid();

    grid.range.press(0, 0, false);
    expect(grid.range.isDragging).toBe(true);

    grid.range.dragTo(1, 1);
    expect(grid.range.bounds).toEqual({ startRow: 0, endRow: 1, startColumn: 0, endColumn: 1 });

    grid.range.endDrag();
    grid.range.dragTo(2, 2);
    expect(grid.range.bounds).toEqual({ startRow: 0, endRow: 1, startColumn: 0, endColumn: 1 });
  });

  it('a press with the modifier extends instead, and starts no drag', () => {
    const grid = makeGrid();

    grid.range.press(0, 0, false);
    grid.range.endDrag();
    grid.range.press(2, 2, true);

    expect(grid.range.isDragging).toBe(false);
    expect(grid.range.bounds).toEqual({ startRow: 0, endRow: 2, startColumn: 0, endColumn: 2 });
  });

  it('reports the block, the columns it covers and the values in it', () => {
    const onRangeChange = vi.fn();
    const grid = makeGrid({}, { onRangeChange });

    grid.range.setCurrent(0, 0);
    grid.range.setCurrent(1, 1, true);

    expect(onRangeChange).toHaveBeenLastCalledWith(expect.objectContaining({ startRow: 0, endRow: 1, columns: ['name', 'score'] }), {
      reason: 'extend',
    });

    const [range] = onRangeChange.mock.lastCall as [CellRange];
    expect(range.values()).toEqual([
      ['Ada', 10],
      ['Ben', 20],
    ]);
  });

  it('says so when the block is given up', () => {
    const onRangeChange = vi.fn();
    const grid = makeGrid({}, { onRangeChange });

    grid.range.setCurrent(0, 0);
    grid.range.clear();

    expect(onRangeChange).toHaveBeenLastCalledWith(undefined, { reason: 'clear' });
    expect(grid.range.bounds).toBeUndefined();
  });

  it('reads a value the way an export does: the column says, and an accepted edit wins', () => {
    const grid = makeGrid({
      columns: [{ key: 'name' }, { key: 'score', exportValue: (row) => row.score * 2 }, { key: 'city' }],
    });

    grid.range.setCurrent(0, 0);
    grid.range.setCurrent(0, 1, true);

    expect(grid.range.values()).toEqual([['Ada', 20]]);
  });

  it('a group row carries its own value and nothing else', () => {
    const grid = makeGrid({ groupBy: ['city'], groupDefaultExpanded: true });

    grid.range.setCurrent(0, 0);
    grid.range.setCurrent(1, 2, true);

    // Grouping puts one spanning cell in front of the columns and takes `city` off the screen, so the
    // group's own value is in the first column and the rows under it hold nothing there.
    expect(grid.range.values()[0]).toEqual(['Oslo', null, null]);
    expect(grid.range.values()[1]).toEqual([null, 'Ada', 10]);
  });

  it('the row number is a value worth copying, and the grid own columns hold none', () => {
    const grid = makeGrid({ showRowNumber: true, rowSelection: true });

    grid.range.setCurrent(1, 0);
    grid.range.setCurrent(1, 2, true);

    expect(grid.range.values()).toEqual([[2, null, 'Ben']]);
  });
});

describe('toTsv', () => {
  it('separates cells with a tab and rows with a CRLF', () => {
    expect(
      toTsv([
        ['Ada', 10],
        ['Ben', 20],
      ]),
    ).toBe('Ada\t10\r\nBen\t20');
  });

  it('writes an empty field for a value there is none of', () => {
    expect(toTsv([[null, undefined, 0, false]])).toBe('\t\t0\tfalse');
  });

  it('quotes a field carrying a separator or a quote, and doubles the quote', () => {
    expect(toTsv([['a\tb']])).toBe('"a\tb"');
    expect(toTsv([['a\nb']])).toBe('"a\nb"');
    expect(toTsv([['say "hi"']])).toBe('"say ""hi"""');
  });

  it('writes a date as one a spreadsheet can read back', () => {
    expect(toTsv([[new Date(Date.UTC(2026, 8, 17))]])).toBe('2026-09-17T00:00:00.000Z');
  });
});

describe('fromTsv', () => {
  it('reads tabs as cells and either newline as a row, with CRLF counting once', () => {
    expect(fromTsv('Ada\t10\r\nBen\t20')).toEqual([
      ['Ada', '10'],
      ['Ben', '20'],
    ]);
    expect(fromTsv('a\nb')).toEqual([['a'], ['b']]);
    expect(fromTsv('a\rb')).toEqual([['a'], ['b']]);
  });

  it('ends the last row on a trailing newline rather than opening an empty one', () => {
    expect(fromTsv('a\tb\r\n')).toEqual([['a', 'b']]);
    expect(fromTsv('')).toEqual([]);
  });

  it('keeps an empty field, wherever in the row it is', () => {
    expect(fromTsv('a\t\tb\t')).toEqual([['a', '', 'b', '']]);
  });

  it('reads a quoted field as one, separators and all, and undoubles its quotes', () => {
    expect(fromTsv('"a\tb"\tc')).toEqual([['a\tb', 'c']]);
    expect(fromTsv('"a\r\nb"')).toEqual([['a\r\nb']]);
    expect(fromTsv('"say ""hi"""')).toEqual([['say "hi"']]);
  });

  it('is the writer the other way round, which is what makes the round trip hold', () => {
    const table = [
      ['a\tb', 'plain'],
      ['say "hi"', 'line\r\nbreak'],
    ];

    expect(fromTsv(toTsv(table))).toEqual(table);
  });
});
