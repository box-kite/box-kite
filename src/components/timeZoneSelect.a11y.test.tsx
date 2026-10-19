import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { expectNoAxeViolations } from '../../dev/a11y/axe';
import { keyboard } from '../../dev/a11y/keyboard';
import { ignoreLogs } from '../../dev/tests';
import TimeZoneSelect from './timeZoneSelect';

/** The APG editable combobox, over the runtime's zones: what `Combobox` is, with a zone's IANA name as the value. */
describe('TimeZoneSelect accessibility', () => {
  ignoreLogs();
  afterEach(cleanup);

  const ZONES = ['UTC', 'Europe/Chisinau', 'Europe/Berlin', 'America/New_York'];

  it('has no axe violations', async () => {
    const { container } = render(<TimeZoneSelect label="Time zone" zones={ZONES} defaultValue="UTC" />);

    await expectNoAxeViolations(container);
  });

  it('Down / Up / Enter — opens, moves and chooses; Escape closes', async () => {
    const keys = keyboard();
    const onValueChange = vi.fn();
    render(<TimeZoneSelect label="Time zone" zones={ZONES} defaultValue={null} onValueChange={onValueChange} />);

    const field = screen.getByRole('combobox', { name: 'Time zone' });
    field.focus();
    await keys.type('europe');
    await keys.pressArrow('Down');
    await keys.pressArrow('Down');
    await keys.pressArrow('Up');
    await keys.press('Enter');
    expect(onValueChange).toHaveBeenLastCalledWith(expect.stringMatching(/^Europe\//), expect.objectContaining({ reason: 'select' }));

    await keys.pressArrow('Down');
    expect(field).toHaveAttribute('aria-expanded', 'true');
    await keys.press('Escape');
    expect(field).toHaveAttribute('aria-expanded', 'false');
  });
});
