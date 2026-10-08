import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatViolations, runAxe } from '../../dev/a11y/axe';
import { fixtures } from '../../dev/a11y/fixtures';
import { ignoreLogs, warningsSettled } from '../../dev/tests';

/**
 * Every component, rendered the way its docs show it, put through axe. The gate is two-sided: an
 * unlisted rule that fires fails the build, and a listed rule that no longer fires fails it too, so the
 * ledger cannot turn into excuses. What it cannot notice is *missing* semantics — a listbox built from
 * bare `<div>`s looks clean — which is what the APG keyboard tests beside this file are for.
 */
describe('Component accessibility (axe)', () => {
  ignoreLogs();

  afterEach(() => {
    cleanup();
  });

  it.each(fixtures)(
    '$name',
    async (fixture) => {
      const warn = vi.spyOn(console, 'warn');
      render(fixture.render());
      fixture.setup?.();

      // document.body, not the render container: Tooltip and the Dropdown popup render through a
      // portal, and a container-scoped scan would quietly skip exactly the markup under test.
      const violations = await runAxe(document.body);

      // A development warning from the engine means a component handed Box a prop Box dropped.
      await warningsSettled();
      const dropped = warn.mock.calls.map(([message]) => String(message)).filter((message) => message.startsWith('[box-kite]'));
      warn.mockRestore();
      expect(dropped, `${fixture.name}: the engine warned while rendering it`).toEqual([]);
      const known = fixture.knownViolations ?? {};

      const unexpected = violations.filter((violation) => !(violation.id in known));
      expect(formatViolations(unexpected), `${fixture.name}: ${unexpected.length} unrecorded accessibility violation(s)`).toBe('');

      const fired = new Set(violations.map((violation) => violation.id));
      const noLongerFiring = Object.keys(known).filter((rule) => !fired.has(rule));
      expect(noLongerFiring, `${fixture.name}: these rules pass now — delete them from knownViolations in dev/a11y/fixtures.tsx`).toEqual(
        [],
      );
      // Well past the default 5s, for the 10,000-row DataGrid: building that many row models and
      // then walking the whole document with axe is seconds of work on a loaded CI box, and the
      // sweep is a correctness gate rather than a performance one.
    },
    30_000,
  );
});
