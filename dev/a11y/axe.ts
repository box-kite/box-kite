import axe, { ElementContext, Result, RunOptions } from 'axe-core';

/**
 * Rules switched off for every run here, so a pass never claims more than it checked. `color-contrast`
 * samples rendered pixels, which happy-dom cannot produce (it is a browser or a manual check), and
 * `region` is a property of a *page* — these tests render a fragment with no `<main>` around it.
 */
export const DEFAULT_DISABLED_RULES = ['color-contrast', 'region'];

export interface AxeOptions {
  /** Extra rule ids to switch off for this run, on top of {@link DEFAULT_DISABLED_RULES}. */
  disableRules?: string[];
}

function ruleOptions({ disableRules = [] }: AxeOptions = {}): RunOptions {
  const rules: RunOptions['rules'] = {};

  for (const rule of [...DEFAULT_DISABLED_RULES, ...disableRules]) {
    rules[rule] = { enabled: false };
  }

  // Only violations are asked for: `incomplete` needs a human, `passes` and `inapplicable` are
  // noise here, and skipping them keeps a sweep over every component around a second.
  // `selectors: false`: the report quotes each node's HTML, and building a selector from a class like `colors-amber-400,rose-600` throws in happy-dom.
  return { rules, resultTypes: ['violations'], selectors: false };
}

/** Every axe violation in `container`, in axe's own order (most impactful first). */
export async function runAxe(container: ElementContext, options?: AxeOptions): Promise<Result[]> {
  const results = await axe.run(container, ruleOptions(options));

  return results.violations;
}

/** The rule ids that fired, sorted — what a fixture's known-violations ledger is compared against. */
export async function axeViolationIds(container: ElementContext, options?: AxeOptions): Promise<string[]> {
  const violations = await runAxe(container, options);

  return violations.map((violation) => violation.id).sort();
}

/**
 * A violation as a reviewer needs to read it: the rule, who it hurts, the offending markup and the
 * page that explains the fix. axe's own `failureSummary` carries the "fix any of the following"
 * detail, so it is quoted rather than paraphrased.
 */
export function formatViolations(violations: Result[]): string {
  return violations
    .map((violation) => {
      const nodes = violation.nodes.map((node) => `    ${node.html}\n${(node.failureSummary ?? '').replace(/^/gm, '      ')}`).join('\n');

      return `  ${violation.id} (${violation.impact ?? 'unknown impact'}) — ${violation.help}\n  ${violation.helpUrl}\n${nodes}`;
    })
    .join('\n\n');
}

/** Fails with the full axe report if anything in `container` violates a rule. */
export async function expectNoAxeViolations(container: ElementContext, options?: AxeOptions): Promise<void> {
  const violations = await runAxe(container, options);

  if (violations.length > 0) {
    throw new Error(`Expected no accessibility violations, found ${violations.length}:\n\n${formatViolations(violations)}`);
  }
}
