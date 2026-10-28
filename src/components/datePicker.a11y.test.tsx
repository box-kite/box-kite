import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { expectNoAxeViolations } from '../../dev/a11y/axe';
import { expectFocusOn, keyboard } from '../../dev/a11y/keyboard';
import { ignoreLogs } from '../../dev/tests';
import { configureDates, DateSettings } from '../utils/date/settings';
import DatePicker, { DateRangePicker } from './datePicker';

/**
 * The picker is APG's date picker dialog around a segmented field: a button that says what it opens and what is
 * chosen, a dialog named by the picker, and focus on the chosen day when it opens. The tests run on the portal
 * path, which is what the test environment has; the top-layer half is browser-verified.
 */
describe('DatePicker accessibility', () => {
  ignoreLogs();

  let previous: DateSettings;
  beforeEach(() => {
    previous = configureDates({ locale: 'en-US', timeZone: 'UTC' });
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(Date.UTC(2026, 9, 19, 12));
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    configureDates({ locale: previous.locale, timeZone: previous.timeZone });
  });

  const button = (name: RegExp) => screen.getByRole('button', { name });

  it('has no axe violations, closed and open', async () => {
    const keys = keyboard();
    const { container } = render(<DatePicker label="Check-in" defaultValue="2026-10-21" clearable />);

    await expectNoAxeViolations(container);
    await keys.click(button(/^Choose date/));
    await expectNoAxeViolations(document.body);
  });

  it('Enter / Space — the button opens the panel, on the chosen day', async () => {
    const keys = keyboard();
    render(<DatePicker label="Check-in" defaultValue="2026-10-21" />);

    button(/^Choose date/).focus();
    await keys.press('Enter');
    expect(screen.getByRole('dialog', { name: 'Check-in' })).toBeInTheDocument();
    expectFocusOn(document.querySelector('[data-date="2026-10-21"]'));
    await keys.press('Escape');
    button(/^Choose date/).focus();
    await keys.press(' ');
    expect(screen.getByRole('dialog', { name: 'Check-in' })).toBeInTheDocument();
  });

  it('Escape — closes the panel and returns focus to the button', async () => {
    const keys = keyboard();
    render(<DatePicker label="Check-in" />);

    await keys.click(button(/^Choose date/));
    await keys.press('Escape');
    expect(screen.queryByRole('dialog')).toBeNull();
    expectFocusOn(button(/^Choose date/));
  });

  it('Up / Down — the time before or after, in the list of times', async () => {
    const keys = keyboard();
    render(<DatePicker type="time" label="Pickup" defaultValue="10:00" />);

    await keys.click(button(/^Choose time/));
    expectFocusOn(screen.getByRole('option', { selected: true }));
    await keys.pressArrow('Down');
    expect(document.activeElement).toHaveTextContent(/^10:30/);
    await keys.pressArrow('Up');
    await keys.pressArrow('Up');
    expect(document.activeElement).toHaveTextContent(/^9:30/);
    await keys.press('Enter');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('Up / Down / Home / End — only the times within min and max, and Enter picks the one highlighted', async () => {
    const keys = keyboard();
    const onValueChange = vi.fn();
    render(<DatePicker type="time" label="Delivery" min="18:30" max="19:30" step={15} onValueChange={onValueChange} />);

    await keys.click(button(/^Choose time/));
    // Nine o'clock is not on offer, so the list starts on its first time.
    expect(document.activeElement).toHaveTextContent(/^6:30/);
    await keys.press('End');
    expect(document.activeElement).toHaveTextContent(/^7:30/);
    await keys.pressArrow('Down');
    expect(document.activeElement).toHaveTextContent(/^7:30/);
    await keys.press('Home');
    expect(document.activeElement).toHaveTextContent(/^6:30/);
    await keys.pressArrow('Up');
    expect(document.activeElement).toHaveTextContent(/^6:30/);
    await keys.pressArrow('Down');
    await keys.press('Enter');
    expect(onValueChange).toHaveBeenLastCalledWith('18:45:00', expect.objectContaining({ reason: 'select' }));
  });

  it('Enter / Space — on a pickOnly field, opens the list from the one button; Escape hands focus back to it', async () => {
    const keys = keyboard();
    render(<DatePicker type="time" label="Delivery" pickOnly min="18:30" max="19:30" step={15} clearable defaultValue="18:30" />);

    await keys.pressTab();
    expectFocusOn(button(/^Delivery/));
    await keys.press('Enter');
    expectFocusOn(screen.getByRole('option', { selected: true }));
    await keys.press('Escape');
    expectFocusOn(button(/^Delivery/));
    await expectNoAxeViolations(document.body);
  });

  it('has no axe violations when no time is within min and max', async () => {
    render(<DatePicker type="time" label="Delivery" min="18:31" max="18:44" step={15} defaultOpen />);

    expect(screen.queryByRole('listbox')).toBeNull();
    await expectNoAxeViolations(document.body);
  });
});

describe('DateRangePicker accessibility', () => {
  ignoreLogs();

  let previous: DateSettings;
  beforeEach(() => {
    previous = configureDates({ locale: 'en-US', timeZone: 'UTC' });
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(Date.UTC(2026, 9, 19, 12));
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    configureDates({ locale: previous.locale, timeZone: previous.timeZone });
  });

  it('has no axe violations', async () => {
    const { container } = render(<DateRangePicker label="Stay" defaultValue={{ start: '2026-10-19', end: '2026-10-23' }} />);

    await expectNoAxeViolations(container);
  });

  it('Enter / Space — anchors the range and ends it; Escape drops a half-picked one, then closes', async () => {
    const keys = keyboard();
    render(<DateRangePicker label="Stay" />);

    screen.getByRole('button', { name: 'Choose dates' }).focus();
    await keys.press('Enter');
    expectFocusOn(document.querySelector('[data-date="2026-10-19"]'));
    await keys.press(' ');
    await keys.pressArrow('Right');
    await keys.press('Escape');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await keys.press('Enter');
    await keys.pressArrow('Right');
    await keys.pressArrow('Right');
    await keys.press('Enter');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('button', { name: /^Choose dates, Oct 20/ })).toBeInTheDocument();
  });
});
