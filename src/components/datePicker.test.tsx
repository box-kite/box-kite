import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ignoreLogs, installPopoverApi } from '../../dev/tests';
import { configureDates, DateSettings } from '../utils/date/settings';
import DatePicker, { DateRangePicker } from './datePicker';

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
const segments = () => screen.getAllByRole('spinbutton');

describe('DatePicker', () => {
  ignoreLogs();

  it('opens a calendar from the button, chooses a day and closes', () => {
    const onValueChange = vi.fn();
    const onOpenChange = vi.fn();
    render(<DatePicker label="Check-in" onValueChange={onValueChange} onOpenChange={onOpenChange} />);

    const button = screen.getByRole('button', { name: 'Choose date' });
    expect(button).toHaveAttribute('aria-haspopup', 'dialog');
    fireEvent.click(button);
    expect(screen.getByRole('dialog', { name: 'Check-in' })).toBeInTheDocument();

    fireEvent.click(day('2026-10-23'));
    expect(onValueChange).toHaveBeenLastCalledWith('2026-10-23', expect.objectContaining({ reason: 'select', local: '2026-10-23' }));
    expect(onOpenChange).toHaveBeenLastCalledWith(false, expect.objectContaining({ reason: 'select' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(segments().map((segment) => segment.textContent)).toEqual(['10', '23', '2026']);
    // Back on the button, rather than on the page: the day that had focus unmounted with the panel.
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Choose date, Oct 23, 2026' }));
  });

  it('keeps the field typed into and the calendar in step', () => {
    render(<DatePicker label="Check-in" defaultValue="2026-10-19" />);

    fireEvent.keyDown(segments()[1], { key: 'ArrowUp' });
    fireEvent.click(screen.getByRole('button', { name: /^Choose date/ }));
    expect(day('2026-10-20').closest('td')).toHaveAttribute('aria-selected', 'true');
  });

  it('moves on segment by segment as a date is typed, and takes a ref', () => {
    const ref = { current: null as HTMLDivElement | null };
    const onValueChange = vi.fn();
    render(<DatePicker ref={ref} label="Check-in" onValueChange={onValueChange} />);

    act(() => segments()[0].focus());
    for (const key of '10232026') fireEvent.keyDown(document.activeElement!, { key });
    expect(onValueChange).toHaveBeenLastCalledWith('2026-10-23', expect.objectContaining({ reason: 'keyboard' }));
    expect(ref.current).toHaveAttribute('role', 'group');
  });

  it('picks a time from a list of slots', () => {
    const onValueChange = vi.fn();
    render(<DatePicker type="time" label="Pickup" step={15} onValueChange={onValueChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Choose time' }));
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(96);
    fireEvent.click(screen.getByRole('option', { name: /^2:45[^0-9]PM/ }));
    expect(onValueChange).toHaveBeenLastCalledWith('14:45:00', expect.objectContaining({ reason: 'select' }));
  });

  it('builds a date-time from a day and a time, on its zone', () => {
    const onValueChange = vi.fn();
    render(<DatePicker type="datetime" zone="utc" label="Publish" onValueChange={onValueChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Choose date' }));
    fireEvent.click(day('2026-10-23'));
    expect(onValueChange).toHaveBeenLastCalledWith('2026-10-23T00:00:00Z', expect.anything());
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('option', { name: /^9:30[^0-9]AM/ }));
    expect(onValueChange).toHaveBeenLastCalledWith(
      '2026-10-23T09:30:00Z',
      expect.objectContaining({ utc: '2026-10-23T09:30:00Z', local: '2026-10-23T11:30:00' }),
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('offers presets and a clear button', () => {
    const onValueChange = vi.fn();
    render(<DatePicker label="Due" clearable presets={[{ label: 'Christmas', value: '2026-12-25' }]} onValueChange={onValueChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Choose date' }));
    fireEvent.click(screen.getByRole('button', { name: 'Christmas' }));
    expect(onValueChange).toHaveBeenLastCalledWith('2026-12-25', expect.objectContaining({ reason: 'preset' }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(onValueChange).toHaveBeenLastCalledWith(null, expect.objectContaining({ reason: 'clear' }));
  });

  it('is the platform popover where there is one, focusing the chosen day when it opens', () => {
    const uninstall = installPopoverApi();
    try {
      render(<DatePicker label="Check-in" defaultValue="2026-10-21" />);
      const panel = screen.getByRole('dialog', { hidden: true });
      expect(panel).toHaveAttribute('popover', 'auto');
      act(() => panel.showPopover());
      expect(document.activeElement).toBe(day('2026-10-21'));
    } finally {
      uninstall();
    }
  });
});

describe('DateRangePicker', () => {
  ignoreLogs();

  it('types both ends and reports the range once it is whole and in order', () => {
    const onValueChange = vi.fn();
    const { container } = render(<DateRangePicker label="Stay" startName="from" endName="to" onValueChange={onValueChange} />);

    expect(screen.getByRole('group', { name: 'Start date' })).toBeInTheDocument();
    act(() => segments()[0].focus());
    for (const key of '10192026') fireEvent.keyDown(document.activeElement!, { key });
    expect(onValueChange).not.toHaveBeenCalled();
    act(() => segments()[3].focus());
    for (const key of '10232026') fireEvent.keyDown(document.activeElement!, { key });
    expect(onValueChange).toHaveBeenLastCalledWith(
      { start: '2026-10-19', end: '2026-10-23' },
      expect.objectContaining({ reason: 'keyboard' }),
    );
    expect(container.querySelector('input[name="from"]')).toHaveValue('2026-10-19');
    expect(container.querySelector('input[name="to"]')).toHaveValue('2026-10-23');
  });

  it('picks a range on two months and closes', () => {
    const onValueChange = vi.fn();
    render(<DateRangePicker label="Stay" onValueChange={onValueChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Choose dates' }));
    expect(screen.getAllByRole('grid')).toHaveLength(2);
    fireEvent.click(day('2026-11-02'));
    fireEvent.click(day('2026-10-28'));
    expect(onValueChange).toHaveBeenLastCalledWith(
      { start: '2026-10-28', end: '2026-11-02' },
      expect.objectContaining({ reason: 'select' }),
    );
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(segments().map((segment) => segment.textContent)).toEqual(['10', '28', '2026', '11', '02', '2026']);
  });

  it('marks an end before its start invalid', () => {
    render(<DateRangePicker label="Stay" defaultValue={{ start: '2026-10-19', end: '2026-10-23' }} />);

    fireEvent.keyDown(segments()[4], { key: 'Home' });
    expect(screen.getByRole('group', { name: 'Stay' })).toHaveAttribute('aria-invalid', 'true');
  });
});
