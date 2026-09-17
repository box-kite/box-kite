import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatViolations, runAxe } from '../../dev/a11y/axe';
import { ignoreLogs } from '../../dev/tests';
import DataGrid from './dataGrid';
import { CellRange, DataGridProps, GridDefinition } from './dataGrid/contracts/dataGridContract';

interface Person {
  id: number;
  firstName: string;
  age: number;
  city: string;
}

const data: Person[] = [
  { id: 1, firstName: 'John', age: 30, city: 'Oslo' },
  { id: 2, firstName: 'Jane', age: 25, city: 'Oslo' },
  { id: 3, firstName: 'Ada', age: 36, city: 'Riga' },
];

const baseDef: GridDefinition<Person> = {
  rowKey: 'id',
  rangeSelection: true,
  columns: [
    { key: 'firstName', header: 'First Name' },
    { key: 'age', header: 'Age' },
    { key: 'city', header: 'City' },
  ],
};

function renderGrid(def?: Partial<GridDefinition<Person>>, props?: Partial<DataGridProps<Person>>) {
  return render(<DataGrid data={data} def={{ ...baseDef, ...def }} {...props} />);
}

/** The cell at a row and column of the body, by its ARIA coordinates — row 0 being the header. */
function cellAt(row: number, column: number): HTMLElement {
  const rows = screen.getAllByRole('row');

  return rows[row].querySelectorAll<HTMLElement>('[role="gridcell"],[role="columnheader"]')[column];
}

/** Focus a body cell the way clicking one does. Inside `act`, or the keystroke after it reads the
 *  handler from the render before the tab stop moved. */
function focusCell(row: number, column: number): HTMLElement {
  const cell = cellAt(row, column);
  act(() => cell.focus());

  return cell;
}

/**
 * Whether the cell wears the current-cell ring. The class list is what says so: a variant's name is not
 * in the DOM, and the outline is the one declaration only `isCurrentCell` and an open editor emit.
 */
function isMarked(cell: HTMLElement): boolean {
  return cell.className.includes('outlineColor-indigo-500');
}

/** What the grid writes when the copy event reaches it. */
function copyFrom(cell: HTMLElement): string | undefined {
  let written: string | undefined;
  const clipboardData = { setData: (_type: string, value: string) => void (written = value) };

  fireEvent.copy(cell, { clipboardData });

  return written;
}

describe('DataGrid range selection', () => {
  ignoreLogs();
  afterEach(cleanup);

  it('marks a cell the pointer landed on, and keeps the mark once the grid loses focus', () => {
    renderGrid();
    const cell = focusCell(1, 1);

    expect(isMarked(cell)).toBe(true);

    // Bug #64: the ring used to be `:focus-visible`, so it went out with the focus and a copy had
    // nothing to act on. The mark is the model's now, and outlives the focus that put it there.
    act(() => cell.blur());
    expect(isMarked(cellAt(1, 1))).toBe(true);
  });

  it('carries the mark along with the arrow keys', () => {
    renderGrid();
    const cell = focusCell(1, 0);

    act(() => void fireEvent.keyDown(cell, { key: 'ArrowDown' }));

    expect(isMarked(cellAt(1, 0))).toBe(false);
    expect(isMarked(cellAt(2, 0))).toBe(true);
  });

  it('gives the mark up when the keyboard leaves the body', () => {
    renderGrid();
    const cell = focusCell(1, 0);

    act(() => void fireEvent.keyDown(cell, { key: 'ArrowUp' }));

    expect(isMarked(cellAt(1, 0))).toBe(false);
    expect(screen.queryAllByRole('gridcell', { selected: true })).toHaveLength(0);
  });

  it('a lone current cell is a cursor: nothing reports itself as selected', () => {
    renderGrid();
    focusCell(1, 1);

    expect(screen.queryAllByRole('gridcell', { selected: true })).toHaveLength(0);
  });

  it('Shift with an arrow key extends the block, and the cells in it say they are selected', () => {
    renderGrid();
    const cell = focusCell(1, 0);

    act(() => void fireEvent.keyDown(cell, { key: 'ArrowDown', shiftKey: true }));
    act(() => void fireEvent.keyDown(cellAt(2, 0), { key: 'ArrowRight', shiftKey: true }));

    expect(screen.getAllByRole('gridcell', { selected: true })).toHaveLength(4);
    expect(cellAt(1, 0)).toHaveAttribute('aria-selected', 'true');
    expect(cellAt(2, 1)).toHaveAttribute('aria-selected', 'true');
    expect(cellAt(1, 2)).not.toHaveAttribute('aria-selected');
    // The corner that moved keeps the ring; the rest of the block is tinted around it.
    expect(isMarked(cellAt(2, 1))).toBe(true);
    expect(isMarked(cellAt(1, 0))).toBe(false);
  });

  it('an arrow key without the modifier collapses the block again', () => {
    renderGrid();
    const cell = focusCell(1, 0);

    act(() => void fireEvent.keyDown(cell, { key: 'ArrowDown', shiftKey: true }));
    act(() => void fireEvent.keyDown(cellAt(2, 0), { key: 'ArrowRight' }));

    expect(screen.queryAllByRole('gridcell', { selected: true })).toHaveLength(0);
  });

  it('a drag marks the rectangle it covers, and stops marking once the pointer is up', () => {
    renderGrid();
    const start = cellAt(1, 0);

    fireEvent.pointerDown(start, { button: 0, pointerType: 'mouse' });
    fireEvent.pointerOver(cellAt(2, 1));

    expect(screen.getAllByRole('gridcell', { selected: true })).toHaveLength(4);
    // The ring, the tab stop and the corner a Shift+arrow would move next are one cell: an arrow key
    // after a drag carries on from where it ended rather than from where it was pressed.
    expect(isMarked(cellAt(2, 1))).toBe(true);
    expect(cellAt(2, 1)).toHaveAttribute('tabindex', '0');

    fireEvent.pointerUp(window);
    fireEvent.pointerOver(cellAt(3, 2));
    expect(screen.getAllByRole('gridcell', { selected: true })).toHaveLength(4);
  });

  it('a press with Shift extends from the anchor rather than starting again', () => {
    renderGrid();
    const start = cellAt(1, 0);

    fireEvent.pointerDown(start, { button: 0, pointerType: 'mouse' });
    fireEvent.pointerUp(window);
    fireEvent.pointerDown(cellAt(3, 1), { button: 0, pointerType: 'mouse', shiftKey: true });
    // The browser focuses the cell it landed on straight after, which must not undo the extension.
    focusCell(3, 1);

    expect(screen.getAllByRole('gridcell', { selected: true })).toHaveLength(6);
  });

  it('a touch is left to the grid, which scrolls with it', () => {
    renderGrid();

    fireEvent.pointerDown(cellAt(1, 0), { button: 0, pointerType: 'touch' });
    fireEvent.pointerOver(cellAt(2, 1));

    expect(screen.queryAllByRole('gridcell', { selected: true })).toHaveLength(0);
  });

  it('a press inside an open editor is the editor own, so a drag there selects its text', () => {
    renderGrid({ editable: true });
    const cell = focusCell(1, 0);

    act(() => void fireEvent.keyDown(cell, { key: 'Enter' }));
    const input = screen.getByRole('textbox', { name: 'Edit First Name' });

    fireEvent.pointerDown(input, { button: 0, pointerType: 'mouse' });
    fireEvent.pointerOver(cellAt(3, 2));

    expect(screen.queryAllByRole('gridcell', { selected: true })).toHaveLength(0);
    expect(screen.getByRole('textbox', { name: 'Edit First Name' })).toBe(input);
  });

  it('a double press still opens the editor on a grid that marks cells', () => {
    renderGrid({ editable: true });

    fireEvent.doubleClick(cellAt(1, 0));

    expect(screen.getByRole('textbox', { name: 'Edit First Name' })).toBeTruthy();
  });

  it('copies the block as the tab-separated text a spreadsheet pastes', () => {
    renderGrid();
    const cell = focusCell(1, 0);

    act(() => void fireEvent.keyDown(cell, { key: 'ArrowDown', shiftKey: true }));
    act(() => void fireEvent.keyDown(cellAt(2, 0), { key: 'ArrowRight', shiftKey: true }));

    expect(copyFrom(cellAt(2, 1))).toBe('John\t30\r\nJane\t25');
  });

  it('copies the current cell alone, which is what makes the single-cell copy free', () => {
    renderGrid();

    expect(copyFrom(focusCell(3, 2))).toBe('Riga');
  });

  it('writes nothing at all when no cell is current', () => {
    renderGrid();

    expect(copyFrom(screen.getAllByRole('row')[1])).toBeUndefined();
  });

  it('reports the block, the columns it covers and what is in it', () => {
    const onRangeChange = vi.fn();
    renderGrid({}, { onRangeChange });
    const cell = focusCell(1, 1);

    expect(onRangeChange).toHaveBeenLastCalledWith(expect.objectContaining({ startRow: 0, endRow: 0, columns: ['age'] }), {
      reason: 'select',
    });

    act(() => void fireEvent.keyDown(cell, { key: 'ArrowDown', shiftKey: true }));

    const [range] = onRangeChange.mock.lastCall as [CellRange];
    expect(onRangeChange).toHaveBeenLastCalledWith(expect.objectContaining({ startRow: 0, endRow: 1 }), { reason: 'extend' });
    expect(range.values()).toEqual([[30], [25]]);
  });

  it('marks the current cell without the opt-in, and marks no block with a drag', () => {
    renderGrid({ rangeSelection: undefined });
    const cell = focusCell(1, 1);

    expect(isMarked(cell)).toBe(true);

    fireEvent.pointerDown(cellAt(1, 0), { button: 0, pointerType: 'mouse' });
    fireEvent.pointerOver(cellAt(2, 1));

    expect(screen.queryAllByRole('gridcell', { selected: true })).toHaveLength(0);
    // Ctrl+C still has something to act on, which is the whole reason the mark is not an opt-in.
    expect(copyFrom(cell)).toBe('30');
  });

  it('has no axe violations with a block marked', async () => {
    renderGrid({ rowSelection: true });
    const cell = focusCell(1, 0);

    act(() => void fireEvent.keyDown(cell, { key: 'ArrowDown', shiftKey: true }));

    // The sweep in `a11y.test.tsx` renders its fixtures once, so a state that only exists after a
    // keystroke is invisible to it — the same reason a lazily-fetched tree level is checked here.
    const violations = await runAxe(document.body);
    expect(formatViolations(violations), violations.length + ' violation(s) on a marked block').toBe('');
  }, 20_000);
});
