import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ignoreLogs } from '../../dev/tests';
import DataGrid from './dataGrid';
import { CellEdit, DataGridHandle, DataGridProps, GridDefinition } from './dataGrid/contracts/dataGridContract';

interface Person {
  id: number;
  firstName: string;
  age: number;
  active: boolean;
}

const data: Person[] = [
  { id: 1, firstName: 'John', age: 30, active: true },
  { id: 2, firstName: 'Jane', age: 25, active: false },
];

const baseDef: GridDefinition<Person> = {
  rowKey: 'id',
  columns: [
    { key: 'firstName', header: 'First Name', editable: true },
    { key: 'age', header: 'Age', editable: true },
    { key: 'active', header: 'Active' },
  ],
};

function renderGrid(def?: Partial<GridDefinition<Person>>, props?: Partial<DataGridProps<Person>>) {
  return render(<DataGrid data={data} def={{ ...baseDef, ...def }} {...props} />);
}

/** The cell at a row and column of the body, by its ARIA coordinates. */
function cellAt(row: number, column: number): HTMLElement {
  const rows = screen.getAllByRole('row');

  return rows[row].querySelectorAll<HTMLElement>('[role="gridcell"]')[column];
}

/** Focus a body cell the way clicking one does, which is what a keystroke then arrives on. */
function focusCell(row: number, column: number): HTMLElement {
  const cell = cellAt(row, column);
  // Inside act: focusing moves the roving tab stop, and the keystroke after it reads the handler from
  // the render that move caused — outside it the grid still thinks focus is on the header.
  act(() => cell.focus());

  return cell;
}

describe('DataGrid cell editing', () => {
  ignoreLogs();
  afterEach(cleanup);

  it('Enter on an editable cell opens the editor and Enter again commits', () => {
    const onCellEdit = vi.fn();
    renderGrid({ onCellEdit });
    const cell = focusCell(1, 0);

    fireEvent.keyDown(cell, { key: 'Enter' });

    const input = screen.getByRole('textbox', { name: 'Edit First Name' });
    expect((input as HTMLInputElement).value).toBe('John');

    fireEvent.change(input, { target: { value: 'Johnny' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onCellEdit).toHaveBeenCalledWith(
      expect.objectContaining({ rowKey: 1, columnKey: 'firstName', value: 'Johnny', oldValue: 'John' }),
    );
    expect(screen.queryByRole('textbox', { name: 'Edit First Name' })).toBeNull();
    expect(cellAt(1, 0).textContent).toContain('Johnny');
  });

  it('F2 opens the editor too, and Escape leaves the value alone', () => {
    renderGrid();
    const cell = focusCell(1, 0);

    fireEvent.keyDown(cell, { key: 'F2' });

    const input = screen.getByRole('textbox', { name: 'Edit First Name' });
    fireEvent.change(input, { target: { value: 'Nobody' } });
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(screen.queryByRole('textbox', { name: 'Edit First Name' })).toBeNull();
    expect(cellAt(1, 0).textContent).toContain('John');
  });

  it('a printable key opens the editor on that character', () => {
    renderGrid();
    const cell = focusCell(1, 0);

    fireEvent.keyDown(cell, { key: 'Z' });

    expect((screen.getByRole('textbox', { name: 'Edit First Name' }) as HTMLInputElement).value).toBe('Z');
  });

  it('a column that is not editable takes no keystroke', () => {
    renderGrid();
    const cell = focusCell(1, 2);

    fireEvent.keyDown(cell, { key: 'Enter' });
    fireEvent.keyDown(cell, { key: 'Z' });

    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('a double press opens the editor, and the press before it left the cell current', () => {
    renderGrid();
    const cell = focusCell(1, 0);

    fireEvent.doubleClick(cell);

    expect((screen.getByRole('textbox', { name: 'Edit First Name' }) as HTMLInputElement).value).toBe('John');
    expect(cell.getAttribute('tabindex')).toBe('0');
  });

  it('a double press on a column that is not editable opens nothing and still leaves the cell current', () => {
    renderGrid();
    const cell = focusCell(1, 2);

    fireEvent.doubleClick(cell);

    expect(screen.queryByRole('textbox')).toBeNull();
    expect(cell.getAttribute('tabindex')).toBe('0');
  });

  it('a double press landing on a widget in the cell belongs to the widget', () => {
    renderGrid({
      columns: [
        {
          key: 'firstName',
          header: 'First Name',
          editable: true,
          Cell: ({ cell }) => <button type="button">{String(cell.value)}</button>,
        },
        ...baseDef.columns.slice(1),
      ],
    });
    focusCell(1, 0);

    fireEvent.doubleClick(screen.getByRole('button', { name: 'John' }));

    expect(screen.queryByRole('textbox', { name: 'Edit First Name' })).toBeNull();
  });

  it('a number column opens a number field and commits a number', () => {
    const onCellEdit = vi.fn();
    renderGrid({ onCellEdit });
    const cell = focusCell(1, 1);

    fireEvent.keyDown(cell, { key: 'Enter' });

    const input = screen.getByRole('spinbutton', { name: 'Edit Age' });
    fireEvent.change(input, { target: { value: '31' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onCellEdit).toHaveBeenCalledWith(expect.objectContaining({ value: 31, oldValue: 30 }));
  });

  it('Tab commits and opens the next editable cell', () => {
    renderGrid();
    fireEvent.keyDown(focusCell(1, 0), { key: 'Enter' });

    const input = screen.getByRole('textbox', { name: 'Edit First Name' });
    fireEvent.change(input, { target: { value: 'Johnny' } });
    fireEvent.keyDown(input, { key: 'Tab' });

    expect(screen.getByRole('spinbutton', { name: 'Edit Age' })).toBeTruthy();
    expect(cellAt(1, 0).textContent).toContain('Johnny');
  });

  it('Shift+Tab steps back to the cell before it', () => {
    renderGrid();
    fireEvent.keyDown(focusCell(2, 0), { key: 'Enter' });

    const input = screen.getByRole('textbox', { name: 'Edit First Name' });
    fireEvent.keyDown(input, { key: 'Tab', shiftKey: true });

    expect(screen.getByRole('spinbutton', { name: 'Edit Age' })).toBeTruthy();
  });

  it('a refused value keeps the editor open and says why', () => {
    renderGrid({ onCellEdit: () => 'Name is taken' });
    fireEvent.keyDown(focusCell(1, 0), { key: 'Enter' });

    const input = screen.getByRole('textbox', { name: 'Edit First Name' });
    fireEvent.change(input, { target: { value: 'Jane' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    const alert = screen.getByRole('alert');
    expect(alert.textContent).toBe('Name is taken');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe(alert.id);
    expect(cellAt(1, 0).textContent).not.toContain('Jane');
  });

  it('Tab out of a refused value is refused too', () => {
    renderGrid({ onCellEdit: () => 'Name is taken' });
    fireEvent.keyDown(focusCell(1, 0), { key: 'Enter' });

    const input = screen.getByRole('textbox', { name: 'Edit First Name' });
    fireEvent.change(input, { target: { value: 'Jane' } });
    fireEvent.keyDown(input, { key: 'Tab' });

    expect(screen.getByRole('textbox', { name: 'Edit First Name' })).toBeTruthy();
    expect(screen.queryByRole('spinbutton', { name: 'Edit Age' })).toBeNull();
  });

  it('a checkbox column commits on the change', () => {
    const onCellEdit = vi.fn();
    renderGrid({ onCellEdit, columns: [...baseDef.columns.slice(0, 2), { key: 'active', header: 'Active', editable: true }] });
    fireEvent.keyDown(focusCell(1, 2), { key: 'Enter' });

    const checkbox = screen.getByRole('checkbox', { name: 'Edit Active' });
    fireEvent.click(checkbox);

    expect(onCellEdit).toHaveBeenCalledWith(expect.objectContaining({ columnKey: 'active', value: false, oldValue: true }));
    expect(screen.queryByRole('checkbox', { name: 'Edit Active' })).toBeNull();
  });

  it('a select column offers the options it was given', () => {
    renderGrid({
      columns: [
        {
          key: 'firstName',
          header: 'First Name',
          editable: true,
          editor: { type: 'select', options: [{ value: 'John' }, { value: 'Jo' }] },
        },
        ...baseDef.columns.slice(1),
      ],
    });
    fireEvent.keyDown(focusCell(1, 0), { key: 'Enter' });

    expect(screen.getByRole('combobox', { name: 'Edit First Name' })).toBeTruthy();
  });

  it('an EditCell of your own drives the same three calls', () => {
    const onCellEdit = vi.fn();
    renderGrid({
      onCellEdit,
      columns: [
        {
          key: 'firstName',
          header: 'First Name',
          editable: true,
          EditCell: ({ cell }) => (
            <button type="button" onClick={() => (cell.setDraft('Custom'), cell.commitEdit())}>
              set
            </button>
          ),
        },
        ...baseDef.columns.slice(1),
      ],
    });
    fireEvent.keyDown(focusCell(1, 0), { key: 'Enter' });
    fireEvent.click(screen.getByRole('button', { name: 'set' }));

    expect(onCellEdit).toHaveBeenCalledWith(expect.objectContaining({ value: 'Custom' }));
  });

  it('reports the edit stream and hands it back on clearEdits', async () => {
    const onCellEditsChange = vi.fn<(edits: CellEdit<Person>[], details: { reason: string }) => void>();
    const ref = createRef<DataGridHandle>();
    render(<DataGrid ref={ref} data={data} def={baseDef} onCellEditsChange={onCellEditsChange} />);

    fireEvent.keyDown(focusCell(1, 0), { key: 'Enter' });
    const input = screen.getByRole('textbox', { name: 'Edit First Name' });
    fireEvent.change(input, { target: { value: 'Johnny' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onCellEditsChange).toHaveBeenCalledWith([expect.objectContaining({ value: 'Johnny' })], { reason: 'edit' });

    ref.current?.clearEdits();

    await waitFor(() => expect(cellAt(1, 0).textContent).toContain('John'));
    expect(onCellEditsChange).toHaveBeenLastCalledWith([], { reason: 'clear' });
  });

  it('a press elsewhere commits, the way a spreadsheet does', () => {
    const onCellEdit = vi.fn();
    renderGrid({ onCellEdit });
    fireEvent.keyDown(focusCell(1, 0), { key: 'Enter' });

    const input = screen.getByRole('textbox', { name: 'Edit First Name' });
    fireEvent.change(input, { target: { value: 'Johnny' } });
    fireEvent.blur(input);

    expect(onCellEdit).toHaveBeenCalledWith(expect.objectContaining({ value: 'Johnny' }));
  });
});
