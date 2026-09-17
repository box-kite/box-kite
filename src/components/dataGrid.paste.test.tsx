import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatViolations, runAxe } from '../../dev/a11y/axe';
import { ignoreLogs } from '../../dev/tests';
import DataGrid from './dataGrid';
import { DataGridPaste, DataGridProps, GridDefinition } from './dataGrid/contracts/dataGridContract';

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
    { key: 'firstName', header: 'First Name', editable: true },
    { key: 'age', header: 'Age', editable: true },
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

/** Focus a body cell the way clicking one does, inside `act` so the keystroke after it is heard. */
function focusCell(row: number, column: number): HTMLElement {
  const cell = cellAt(row, column);
  act(() => cell.focus());

  return cell;
}

/** Ctrl+V, as the browser delivers it: the text is on the event, and the grid takes it from there. */
function pasteInto(element: HTMLElement, text: string): boolean {
  let handled = false;

  act(() => {
    handled = !fireEvent.paste(element, { clipboardData: { getData: () => text } });
  });

  return handled;
}

/** What a cell shows. The grid does not own `data`, so an accepted paste is only readable here. */
function textAt(row: number, column: number): string {
  return cellAt(row, column).textContent ?? '';
}

describe('DataGrid paste', () => {
  ignoreLogs();

  afterEach(cleanup);

  it('fills from the current cell, across the columns and on down the rows', () => {
    renderGrid();
    focusCell(1, 0);

    pasteInto(cellAt(1, 0), 'Ida\t11\r\nJon\t12');

    expect(textAt(1, 0)).toBe('Ida');
    expect(textAt(1, 1)).toBe('11');
    expect(textAt(2, 0)).toBe('Jon');
    expect(textAt(2, 1)).toBe('12');
  });

  it('fills the block that is marked, tiling a clipboard smaller than it', () => {
    renderGrid();
    const cell = focusCell(1, 0);

    act(() => void fireEvent.keyDown(cell, { key: 'ArrowDown', shiftKey: true }));
    pasteInto(cell, 'Ida');

    expect(textAt(1, 0)).toBe('Ida');
    expect(textAt(2, 0)).toBe('Ida');
    expect(textAt(3, 0)).toBe('Ada');
  });

  it('marks the cells a refusal landed on, and says so to a screen reader', () => {
    const onPaste = vi.fn();
    renderGrid({ onCellEdit: (edit) => (edit.value === 'Jon' ? 'No Jons here' : undefined) }, { onPaste });
    const cell = focusCell(1, 0);

    act(() => void fireEvent.keyDown(cell, { key: 'ArrowDown', shiftKey: true }));
    pasteInto(cell, 'Ida\r\nJon');

    expect(textAt(1, 0)).toBe('Ida');
    expect(textAt(2, 0)).toBe('Jane');
    expect(cellAt(2, 0)).toHaveAttribute('aria-invalid', 'true');
    // The ring is the `isInvalid` variant with no editor open behind it: red is what says which cell.
    expect(cellAt(2, 0).className).toContain('outlineColor-red-500');
    expect(cellAt(1, 0)).not.toHaveAttribute('aria-invalid');

    const [result] = onPaste.mock.lastCall as [DataGridPaste<Person>];
    expect(result.rejected).toEqual([expect.objectContaining({ error: 'No Jons here' })]);
  });

  it('leaves a paste inside an open editor to the editor', () => {
    const onPaste = vi.fn();
    renderGrid({}, { onPaste });
    const cell = focusCell(1, 0);

    act(() => void fireEvent.keyDown(cell, { key: 'Enter' }));
    expect(screen.getByRole('textbox')).toBeInTheDocument();

    // The editor's own paste bubbles up through the grid, which has to hand it back or the block under
    // it is filled while a value is being typed.
    expect(pasteInto(screen.getByRole('textbox'), 'Ida')).toBe(false);
    expect(onPaste).not.toHaveBeenCalled();
  });

  it('does nothing at all on a grid nothing can be written to', () => {
    const onPaste = vi.fn();
    renderGrid({ columns: [{ key: 'firstName' }, { key: 'age' }, { key: 'city' }] }, { onPaste });

    expect(pasteInto(focusCell(1, 0), 'Ida')).toBe(false);
    expect(onPaste).not.toHaveBeenCalled();
    expect(textAt(1, 0)).toBe('John');
  });

  it('has no axe violations with a refusal marked', async () => {
    renderGrid({ onCellEdit: () => 'No' });
    pasteInto(focusCell(1, 0), 'Ida');

    expect(cellAt(1, 0)).toHaveAttribute('aria-invalid', 'true');

    const violations = await runAxe(document.body);
    expect(formatViolations(violations), violations.length + ' violation(s) on a refused paste').toBe('');
  }, 20_000);
});
