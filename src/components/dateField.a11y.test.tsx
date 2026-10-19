import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '../../dev/a11y/axe';
import { expectFocusOn, keyboard } from '../../dev/a11y/keyboard';
import { configureDates, DateSettings } from '../utils/date/settings';
import Button from './button';
import DateField from './dateField';

/**
 * A date field is a group of spin buttons, one per part of the date, in the reader's order — the pattern React
 * Aria's DateField and the spin button APG describes. Every segment is its own tab stop, and the value a key
 * produces is asserted through what a reader has: `aria-valuenow` and `aria-valuetext`.
 */
describe('DateField accessibility', () => {
  let previous: DateSettings;
  beforeEach(() => {
    previous = configureDates({ locale: 'en-US', timeZone: 'UTC' });
  });
  afterEach(() => {
    cleanup();
    configureDates({ locale: previous.locale, timeZone: previous.timeZone });
  });

  function Example(props: Partial<React.ComponentProps<typeof DateField>> = {}) {
    return (
      <>
        <Button>Before</Button>
        <DateField label="Due" defaultValue="2026-10-19" {...props} />
        <Button>After</Button>
      </>
    );
  }

  const segment = (type: string) => document.querySelector<HTMLElement>(`[data-segment="${type}"]`)!;
  const valueOf = (type: string) => segment(type).getAttribute('aria-valuenow');

  it('has no axe violations, empty and filled', async () => {
    const { container } = render(
      <>
        <DateField label="Empty" />
        <DateField type="datetime" zone="utc" label="Filled" defaultValue="2026-10-19T14:30:00Z" />
      </>,
    );

    await expectNoAxeViolations(container);
  });

  it('has no axe violations while disabled or invalid', async () => {
    const { container } = render(
      <>
        <DateField label="Disabled" disabled defaultValue="2026-10-19" />
        <DateField label="Late" min="2027-01-01" defaultValue="2026-10-19" />
      </>,
    );

    await expectNoAxeViolations(container);
  });

  it('Tab — every segment is its own tab stop, in the order the locale writes them', async () => {
    const keys = keyboard();
    render(<Example />);

    await keys.pressTab();
    await keys.pressTab();
    expectFocusOn(segment('month'));
    await keys.pressTab();
    expectFocusOn(segment('day'));
    await keys.pressTab();
    expectFocusOn(segment('year'));
    await keys.pressTab();
    expectFocusOn(screen.getByRole('button', { name: 'After' }));
  });

  it('Left / Right — the previous or next segment', async () => {
    const keys = keyboard();
    render(<Example />);

    await keys.click(segment('day'));
    await keys.pressArrow('Right');
    expectFocusOn(segment('year'));
    await keys.pressArrow('Left');
    await keys.pressArrow('Left');
    expectFocusOn(segment('month'));
  });

  it('Up / Down — one more or one less, wrapping round the range', async () => {
    const keys = keyboard();
    render(<Example defaultValue="2026-12-31" />);

    await keys.click(segment('month'));
    await keys.pressArrow('Up');
    expect(valueOf('month')).toBe('1');
    expect(segment('month')).toHaveAttribute('aria-valuetext', '1 – January');
    await keys.pressArrow('Down');
    expect(valueOf('month')).toBe('12');
  });

  it('PageUp / PageDown — a bigger step', async () => {
    const keys = keyboard();
    render(<Example />);

    await keys.click(segment('day'));
    await keys.press('PageUp');
    expect(valueOf('day')).toBe('26');
    await keys.press('PageDown');
    expect(valueOf('day')).toBe('19');
  });

  it('Home / End — the lowest and highest value', async () => {
    const keys = keyboard();
    render(<Example />);

    await keys.click(segment('day'));
    await keys.press('End');
    expect(valueOf('day')).toBe('31');
    await keys.press('Home');
    expect(valueOf('day')).toBe('1');
  });

  it('0-9 — types, and moves on once no further digit fits', async () => {
    const keys = keyboard();
    render(<Example defaultValue={null} />);

    await keys.click(segment('month'));
    await keys.type('4');
    expectFocusOn(segment('day'));
    await keys.type('7');
    expectFocusOn(segment('year'));
    expect(valueOf('month')).toBe('4');
  });

  it('A / P — AM or PM', async () => {
    const keys = keyboard();
    render(<DateField type="time" label="Opens" defaultValue="09:00" />);

    await keys.click(segment('dayPeriod'));
    await keys.type('p');
    expect(segment('dayPeriod')).toHaveAttribute('aria-valuetext', 'PM');
    await keys.type('a');
    expect(segment('dayPeriod')).toHaveAttribute('aria-valuetext', 'AM');
  });

  it('Backspace — the digit, then the segment, then the segment before', async () => {
    const keys = keyboard();
    render(<Example />);

    await keys.click(segment('day'));
    await keys.press('Backspace');
    expect(segment('day')).toHaveAttribute('aria-valuetext', 'Empty');
    await keys.press('Backspace');
    expectFocusOn(segment('month'));
  });
});
