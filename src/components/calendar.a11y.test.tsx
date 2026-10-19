import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { expectNoAxeViolations } from '../../dev/a11y/axe';
import { expectFocusOn, keyboard } from '../../dev/a11y/keyboard';
import { configureDates, DateSettings } from '../utils/date/settings';
import Calendar from './calendar';

/**
 * The calendar grid of APG's date picker dialog: https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/datepicker-dialog/
 * One tab stop for the grid, the focused day roving through it, and the choice reported through
 * `aria-selected` on the gridcell.
 */
describe('Calendar accessibility', () => {
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

  const day = (date: string) => document.querySelector<HTMLElement>(`[data-date="${date}"]`)!;

  it('has no axe violations, one day or a range', async () => {
    const { container } = render(
      <>
        <Calendar label="Due" defaultValue="2026-10-21" />
        <Calendar label="Stay" mode="range" defaultValue={{ start: '2026-10-19', end: '2026-10-23' }} weekNumbers />
      </>,
    );

    await expectNoAxeViolations(container);
  });

  it('Tab — the grid is one tab stop, on the focused day', async () => {
    const keys = keyboard();
    render(<Calendar label="Due" />);

    await keys.pressTab();
    expectFocusOn(screen.getByRole('button', { name: 'Previous' }));
    await keys.pressTab();
    await keys.pressTab();
    await keys.pressTab();
    expectFocusOn(day('2026-10-19'));
    await keys.pressTab();
    expectFocusOn(document.body);
  });

  it('Left / Right / Up / Down — a day and a week', async () => {
    const keys = keyboard();
    render(<Calendar label="Due" />);

    await keys.click(day('2026-10-19'));
    await keys.pressArrow('Right');
    expectFocusOn(day('2026-10-20'));
    await keys.pressArrow('Left');
    await keys.pressArrow('Left');
    expectFocusOn(day('2026-10-18'));
    await keys.pressArrow('Down');
    expectFocusOn(day('2026-10-25'));
    await keys.pressArrow('Up');
    expectFocusOn(day('2026-10-18'));
  });

  it('Home / End — the ends of the week', async () => {
    const keys = keyboard();
    render(<Calendar label="Due" />);

    await keys.click(day('2026-10-21'));
    await keys.press('Home');
    expectFocusOn(day('2026-10-18'));
    await keys.press('End');
    expectFocusOn(day('2026-10-24'));
  });

  it('PageUp / PageDown — a month, and with Shift a year', async () => {
    const keys = keyboard();
    render(<Calendar label="Due" />);

    await keys.click(day('2026-10-19'));
    await keys.press('PageDown');
    expectFocusOn(day('2026-11-19'));
    await keys.press('PageUp');
    expectFocusOn(day('2026-10-19'));
    await keys.press('Shift>}{PageUp}{/Shift');
    expectFocusOn(day('2025-10-19'));
  });

  it('Enter / Space — chooses the focused day', async () => {
    const keys = keyboard();
    render(<Calendar label="Due" />);

    await keys.click(day('2026-10-19'));
    await keys.pressArrow('Right');
    await keys.press('Enter');
    expect(day('2026-10-20').closest('td')).toHaveAttribute('aria-selected', 'true');
    await keys.pressArrow('Right');
    await keys.press(' ');
    expect(day('2026-10-21').closest('td')).toHaveAttribute('aria-selected', 'true');
  });
});
