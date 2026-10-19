import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { configureDates, DateSettings } from '../utils/date/settings';
import Calendar from './calendar';

let previous: DateSettings;
beforeEach(() => {
  previous = configureDates({ locale: 'en-US', timeZone: 'Europe/Berlin' });
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(Date.UTC(2026, 9, 19, 12));
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  configureDates({ locale: previous.locale, timeZone: previous.timeZone });
});

const day = (date: string) => document.querySelector<HTMLElement>(`[data-date="${date}"]`)!;
const grid = () => screen.getByRole('grid');

describe('Calendar', () => {
  it('draws six weeks from the locale first day, today marked', () => {
    render(<Calendar label="Due" />);

    expect(screen.getByRole('button', { name: 'October 2026' })).toBeInTheDocument();
    expect(screen.getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
    expect(screen.getAllByRole('row')).toHaveLength(7);
    expect(day('2026-10-19').closest('td')).toHaveAttribute('aria-current', 'date');
    expect(day('2026-10-19')).toHaveAttribute('tabindex', '0');
    expect(day('2026-10-19')).toHaveAccessibleName('Monday, October 19, 2026');
  });

  it('starts the week where the locale does', () => {
    render(<Calendar locale="ro-MD" />);
    expect(screen.getAllByRole('columnheader')[0]).toHaveAttribute('abbr', 'luni');
  });

  it('moves on APG keys, paging the month', () => {
    const onFocusedDateChange = vi.fn();
    render(<Calendar defaultFocusedDate="2026-10-31" onFocusedDateChange={onFocusedDateChange} />);

    fireEvent.keyDown(grid(), { key: 'ArrowRight' });
    expect(screen.getByRole('button', { name: 'November 2026' })).toBeInTheDocument();
    expect(document.activeElement).toBe(day('2026-11-01'));
    fireEvent.keyDown(grid(), { key: 'PageUp', shiftKey: true });
    expect(document.activeElement).toBe(day('2025-11-01'));
    fireEvent.keyDown(grid(), { key: 'End' });
    expect(document.activeElement).toBe(day('2025-11-01'));
    expect(onFocusedDateChange).toHaveBeenLastCalledWith('2025-11-01', expect.objectContaining({ reason: 'keyboard' }));
  });

  it('chooses a day by press or by key', () => {
    const onValueChange = vi.fn();
    render(<Calendar onValueChange={onValueChange} />);

    fireEvent.click(day('2026-10-21'));
    expect(onValueChange).toHaveBeenLastCalledWith('2026-10-21', expect.objectContaining({ reason: 'select' }));
    expect(day('2026-10-21').closest('td')).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(grid(), { key: 'ArrowDown' });
    fireEvent.keyDown(grid(), { key: 'Enter' });
    expect(onValueChange).toHaveBeenLastCalledWith('2026-10-28', expect.anything());
  });

  it('refuses a day outside the bounds and an unavailable one', () => {
    const onValueChange = vi.fn();
    render(
      <Calendar min="2026-10-10" max="2026-10-25" isDateUnavailable={(date) => date === '2026-10-20'} onValueChange={onValueChange} />,
    );

    expect(day('2026-10-09').closest('td')).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(day('2026-10-09'));
    fireEvent.click(day('2026-10-20'));
    expect(onValueChange).not.toHaveBeenCalled();

    act(() => day('2026-10-19').focus());
    fireEvent.keyDown(grid(), { key: 'PageDown' });
    expect(document.activeElement).toBe(day('2026-10-25'));
  });

  it('picks a range in either order, and refuses one across a blocked day', () => {
    const onValueChange = vi.fn();
    render(<Calendar mode="range" isDateUnavailable={(date) => date === '2026-10-15'} onValueChange={onValueChange} />);

    fireEvent.click(day('2026-10-23'));
    expect(onValueChange).not.toHaveBeenCalled();
    fireEvent.click(day('2026-10-19'));
    expect(onValueChange).toHaveBeenLastCalledWith(
      { start: '2026-10-19', end: '2026-10-23' },
      expect.objectContaining({ reason: 'select' }),
    );
    expect(day('2026-10-21').closest('td')).toHaveAttribute('aria-selected', 'true');

    fireEvent.click(day('2026-10-12'));
    fireEvent.click(day('2026-10-17'));
    expect(onValueChange).toHaveBeenCalledTimes(1);
  });

  it('zooms out to the months and the years from the title', () => {
    render(<Calendar defaultFocusedDate="2026-10-19" />);

    fireEvent.click(screen.getByRole('button', { name: 'October 2026' }));
    fireEvent.click(screen.getByRole('button', { name: '2026' }));
    expect(screen.getByRole('button', { name: '2016 – 2027' })).toBeInTheDocument();
    for (let page = 0; page < 3; page++) fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
    fireEvent.click(screen.getByRole('button', { name: '1990' }));
    fireEvent.click(screen.getByRole('button', { name: 'Mar' }));
    expect(screen.getByRole('button', { name: 'March 1990' })).toBeInTheDocument();
  });

  it('numbers the weeks and shows two months side by side', () => {
    render(<Calendar months={2} weekNumbers defaultFocusedDate="2026-10-19" />);

    expect(screen.getAllByRole('grid')).toHaveLength(2);
    expect(screen.getByText('October 2026 – November 2026')).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByText('November 2026')).toBeInTheDocument();
    expect(screen.getAllByRole('rowheader')[0]).toHaveTextContent('40');
  });
});
