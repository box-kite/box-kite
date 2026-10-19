import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ignoreLogs } from '../../dev/tests';
import { configureDates, DateSettings } from '../utils/date/settings';
import DataGrid from './dataGrid';
import { GridDefinition } from './dataGrid/contracts/dataGridContract';
import { loadDateParts } from './dataGrid/useDateParts';

/** The narrow and thin no-break spaces ICU writes beside AM/PM and a range dash, built from code points so no source line carries one. */
const SPACES = new RegExp(`[${String.fromCharCode(0x202f, 0xa0, 0x2009)}]`, 'g');

interface Order {
  id: number;
  due: string;
  placed: Date;
  slot: string;
}

const data: Order[] = [
  { id: 1, due: '2026-10-19', placed: new Date(Date.UTC(2026, 9, 19, 22, 30)), slot: '09:30:00' },
  { id: 2, due: '2026-11-02', placed: new Date(Date.UTC(2026, 10, 2, 8, 0)), slot: '14:00:00' },
];

const def: GridDefinition<Order> = {
  rowKey: 'id',
  columns: [
    { key: 'due', header: 'Due', editable: true, dateFormat: 'date', filterable: { type: 'date' } },
    { key: 'placed', header: 'Placed' },
    { key: 'slot', header: 'Slot', editable: true, dateFormat: 'time' },
  ],
};

function cellAt(row: number, column: number): HTMLElement {
  return screen.getAllByRole('row')[row].querySelectorAll<HTMLElement>('[role="gridcell"]')[column];
}

// The grid fetches its date parts the first time it needs them; a test wants them before the first render.
beforeAll(async () => {
  await loadDateParts();
});

let previous: DateSettings;
beforeEach(() => {
  previous = configureDates({ locale: 'en-US', timeZone: 'Europe/Berlin' });
});
afterEach(() => {
  cleanup();
  configureDates({ locale: previous.locale, timeZone: previous.timeZone });
});

describe('DataGrid dates', () => {
  ignoreLogs();

  it('writes dates in the reader words and zone, a Date included', () => {
    render(<DataGrid data={data} def={def} />);

    const body = (row: number) => [0, 1, 2].map((column) => cellAt(row, column).textContent?.replace(SPACES, ' '));
    expect(body(2)).toEqual(['Oct 19, 2026', 'Oct 20, 2026, 12:30 AM', '9:30 AM']);
  });

  it('opens a DateField on a date cell and commits what is typed', () => {
    const onCellEdit = vi.fn();
    render(<DataGrid data={data} def={{ ...def, onCellEdit }} />);

    const cell = cellAt(2, 0);
    act(() => cell.focus());
    fireEvent.keyDown(cell, { key: 'Enter' });

    const field = screen.getByRole('group', { name: 'Edit Due' });
    const segments = field.querySelectorAll<HTMLElement>('[role="spinbutton"]');
    expect(document.activeElement).toBe(segments[0]);
    fireEvent.keyDown(segments[1], { key: 'ArrowUp' });
    fireEvent.keyDown(segments[1], { key: 'Enter' });

    expect(onCellEdit).toHaveBeenCalledWith(expect.objectContaining({ columnKey: 'due', value: '2026-10-20', oldValue: '2026-10-19' }));
    expect(cellAt(2, 0)).toHaveTextContent('Oct 20, 2026');
  });

  it('infers a time editor from an ISO time', () => {
    const onCellEdit = vi.fn();
    render(<DataGrid data={data} def={{ ...def, onCellEdit }} />);

    const cell = cellAt(2, 2);
    act(() => cell.focus());
    fireEvent.keyDown(cell, { key: 'Enter' });
    expect(screen.getByRole('group', { name: 'Edit Slot' }).querySelectorAll('[role="spinbutton"]')).toHaveLength(3);
  });

  it('filters by day on the reader calendar', () => {
    render(<DataGrid data={data} def={def} />);

    const filter = screen.getByRole('group', { name: 'Filter Due' });
    const segments = filter.querySelectorAll<HTMLElement>('[role="spinbutton"]');
    act(() => segments[0].focus());
    for (const key of '11022026') fireEvent.keyDown(document.activeElement!, { key });

    const rows = screen.getAllByRole('row').filter((row) => row.querySelector('[role="gridcell"]'));
    expect(rows.map((row) => row.querySelector('[role="gridcell"]')?.textContent)).toContain('Nov 2, 2026');
    expect(rows.map((row) => row.querySelector('[role="gridcell"]')?.textContent)).not.toContain('Oct 19, 2026');
  });

  it('writes an edited date-time back in the shape it came in', () => {
    const onCellEdit = vi.fn();
    const rows = data.map((row) => ({ ...row, seen: '2026-10-18T10:34:00Z' }));
    render(
      <DataGrid
        data={rows}
        def={{
          rowKey: 'id',
          onCellEdit,
          columns: [
            { key: 'placed', header: 'Placed', editable: true },
            { key: 'seen', header: 'Seen', editable: true },
          ],
        }}
      />,
    );

    for (const column of [0, 1]) {
      const cell = cellAt(1, column);
      act(() => cell.focus());
      fireEvent.keyDown(cell, { key: 'Enter' });
      const day = screen.getByRole('group', { name: /^Edit/ }).querySelectorAll<HTMLElement>('[role="spinbutton"]')[1];
      fireEvent.keyDown(day, { key: 'ArrowUp' });
      fireEvent.keyDown(day, { key: 'Enter' });
    }

    const [[placed], [seen]] = onCellEdit.mock.calls as [{ value: unknown }][];
    expect(placed.value).toBeInstanceOf(Date);
    expect((placed.value as Date).toISOString()).toBe('2026-10-20T22:30:00.000Z');
    expect(seen.value).toBe('2026-10-19T10:34:00Z');
  });

  it('picks the filter day on a calendar, out of the page tab order, and clears it', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(Date.UTC(2026, 9, 19, 12));
    render(<DataGrid data={data} def={def} />);
    const dueColumn = () => screen.getAllByRole('row').map((row) => row.querySelector('[role="gridcell"]')?.textContent);

    const button = screen.getByRole('button', { name: 'Choose date' });
    expect(button).toHaveAttribute('tabindex', '-1');
    fireEvent.click(button);
    fireEvent.click(document.querySelector<HTMLElement>('[data-date="2026-10-19"]')!);
    expect(dueColumn()).toContain('Oct 19, 2026');
    expect(dueColumn()).not.toContain('Nov 2, 2026');

    // Clearing empties the whole filter, not only the field it sits in.
    fireEvent.click(screen.getByRole('button', { name: 'Clear the Due filter' }));
    expect(dueColumn()).toEqual(expect.arrayContaining(['Oct 19, 2026', 'Nov 2, 2026']));
    vi.useRealTimers();
  });

  it('bounds each end of a span by the other', () => {
    render(<DataGrid data={data} def={{ ...def, columns: [{ ...def.columns[0], filterable: { type: 'date', min: '2026-01-01' } }] }} />);

    fireEvent.click(screen.getByLabelText('Comparison for Due'));
    fireEvent.click(screen.getByRole('option', { name: '↔' }));
    const from = screen.getByRole('group', { name: 'Filter Due from' });
    act(() => from.querySelector<HTMLElement>('[role="spinbutton"]')!.focus());
    for (const key of '10192026') fireEvent.keyDown(document.activeElement!, { key });

    const to = screen.getByRole('group', { name: 'Filter Due to' });
    act(() => to.querySelector<HTMLElement>('[role="spinbutton"]')!.focus());
    for (const key of '10012026') fireEvent.keyDown(document.activeElement!, { key });
    expect(to).toHaveAttribute('aria-invalid', 'true');
  });
});
