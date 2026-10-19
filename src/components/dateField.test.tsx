import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { configureDates, DateSettings } from '../utils/date/settings';
import DateField from './dateField';

let previous: DateSettings;
beforeEach(() => {
  previous = configureDates({ locale: 'en-US', timeZone: 'Europe/Berlin' });
});
afterEach(() => {
  cleanup();
  configureDates({ locale: previous.locale, timeZone: previous.timeZone });
});

const segments = () => screen.getAllByRole('spinbutton');
const press = (element: Element, key: string, init: KeyboardEventInit = {}) => fireEvent.keyDown(element, { key, ...init });
const type = (keys: string) => {
  for (const key of keys) press(document.activeElement!, key);
};

describe('DateField', () => {
  it('lays the segments out in the locale order, named in its language', () => {
    render(<DateField label="Birthday" locale="ro-MD" />);

    expect(screen.getByRole('group', { name: 'Birthday' })).toBeInTheDocument();
    expect(segments().map((segment) => segment.getAttribute('data-segment'))).toEqual(['day', 'month', 'year']);
    expect(segments()[0]).toHaveAccessibleName(/, Birthday$/);
    expect(segments()[0]).toHaveAttribute('aria-valuetext', 'Empty');
  });

  it('types a date segment by segment, moving on by itself, and reports its readings', () => {
    const onValueChange = vi.fn();
    render(<DateField label="Due" onValueChange={onValueChange} />);

    act(() => segments()[0].focus());
    type('4');
    expect(document.activeElement).toBe(segments()[1]);
    type('19');
    expect(document.activeElement).toBe(segments()[2]);
    type('2026');

    expect(onValueChange).toHaveBeenLastCalledWith(
      '2026-04-19',
      expect.objectContaining({ reason: 'keyboard', utc: '2026-04-18T22:00:00Z', local: '2026-04-19' }),
    );
    expect(segments().map((segment) => segment.textContent)).toEqual(['04', '19', '2026']);
    expect(segments()[0]).toHaveAttribute('aria-valuetext', '4 – April');
  });

  it('steps with the arrows, wrapping, and starts an empty segment at today', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(Date.UTC(2026, 9, 19, 12));
    render(<DateField label="Due" defaultValue="2026-12-31" />);

    press(segments()[0], 'ArrowUp');
    expect(segments()[0]).toHaveTextContent('01');
    press(segments()[1], 'ArrowDown');
    expect(segments()[1]).toHaveTextContent('30');
    press(segments()[1], 'End');
    expect(segments()[1]).toHaveTextContent('31');
    vi.useRealTimers();
  });

  it('takes a digit back, then the segment, then moves to the one before', () => {
    const onValueChange = vi.fn();
    render(<DateField label="Due" defaultValue="2026-10-19" onValueChange={onValueChange} />);

    act(() => segments()[1].focus());
    press(segments()[1], 'Backspace');
    expect(segments()[1]).toHaveTextContent('dd');
    expect(onValueChange).toHaveBeenLastCalledWith(null, expect.objectContaining({ utc: null }));
    press(segments()[1], 'Backspace');
    expect(document.activeElement).toBe(segments()[0]);
  });

  it('is a 12-hour clock where the locale reads one, with AM and PM typed', () => {
    const onValueChange = vi.fn();
    render(<DateField type="time" label="Opens" onValueChange={onValueChange} />);

    expect(segments().map((segment) => segment.getAttribute('data-segment'))).toEqual(['hour', 'minute', 'dayPeriod']);
    act(() => segments()[0].focus());
    type('230p');
    expect(onValueChange).toHaveBeenLastCalledWith('14:30:00', expect.objectContaining({ utc: null, local: '14:30:00' }));
  });

  it('writes a date-time as the instant it names on its zone', () => {
    const onValueChange = vi.fn();
    render(<DateField type="datetime" zone="utc" locale="ro-MD" label="Runs" onValueChange={onValueChange} />);

    act(() => segments()[0].focus());
    type('19102026');
    type('1430');
    expect(onValueChange).toHaveBeenLastCalledWith(
      '2026-10-19T14:30:00Z',
      expect.objectContaining({ utc: '2026-10-19T14:30:00Z', local: '2026-10-19T16:30:00' }),
    );
    expect(screen.getByText('UTC')).toBeInTheDocument();
  });

  it('keeps a wall clock with no zone when asked', () => {
    const onValueChange = vi.fn();
    render(
      <DateField type="datetime" zone="none" hourCycle={24} label="Alarm" defaultValue="2026-10-19T07:00" onValueChange={onValueChange} />,
    );

    press(segments()[3], 'ArrowUp');
    expect(onValueChange).toHaveBeenLastCalledWith('2026-10-19T08:00:00', expect.anything());
  });

  it('shows a controlled instant on the field zone and follows a new value', () => {
    function Harness() {
      const [value, setValue] = useState<string | null>('2026-10-19T11:30:00Z');

      return (
        <>
          <DateField type="datetime" zone="America/New_York" hourCycle={24} label="At" value={value} onValueChange={setValue} />
          <button onClick={() => setValue('2026-01-02T00:00:00Z')}>later</button>
        </>
      );
    }
    render(<Harness />);

    expect(segments().map((segment) => segment.textContent)).toEqual(['10', '19', '2026', '07', '30']);
    fireEvent.click(screen.getByText('later'));
    expect(segments().map((segment) => segment.textContent)).toEqual(['01', '01', '2026', '19', '00']);
  });

  it('reads a pasted date in the reader order', () => {
    const onValueChange = vi.fn();
    render(<DateField label="Due" locale="en-GB" onValueChange={onValueChange} />);

    fireEvent.paste(segments()[0], { clipboardData: { getData: () => '03/04/2026' } });
    expect(onValueChange).toHaveBeenLastCalledWith('2026-04-03', expect.objectContaining({ reason: 'paste' }));
  });

  it('posts the canonical value, and stops an empty required form', () => {
    const { container } = render(
      <form>
        <DateField label="Due" name="due" defaultValue="2026-10-19" />
        <DateField label="Start" name="start" required />
      </form>,
    );

    expect(container.querySelector('input[name="due"]')).toHaveValue('2026-10-19');
    const required = container.querySelector<HTMLInputElement>('input[name="start"]')!;
    expect(required).toBeRequired();
    expect(required.checkValidity()).toBe(false);
  });

  it('marks a value outside the bounds or on an unavailable day invalid', () => {
    const { rerender } = render(<DateField label="Due" defaultValue="2026-10-19" min="2026-11-01" />);
    expect(screen.getByRole('group')).toHaveAttribute('aria-invalid', 'true');

    rerender(<DateField label="Due" defaultValue="2026-10-19" isDateUnavailable={(day) => day.endsWith('19')} key="b" />);
    expect(screen.getByRole('group')).toHaveAttribute('aria-invalid', 'true');
  });

  it('ignores typing while read-only and cannot be reached while disabled', () => {
    const onValueChange = vi.fn();
    const { rerender } = render(<DateField label="Due" readOnly defaultValue="2026-10-19" onValueChange={onValueChange} />);
    press(segments()[0], 'ArrowUp');
    expect(onValueChange).not.toHaveBeenCalled();

    rerender(<DateField label="Due" disabled defaultValue="2026-10-19" />);
    expect(segments()[0]).toHaveAttribute('tabindex', '-1');
    expect(segments()[0]).toHaveAttribute('aria-disabled', 'true');
  });
});
