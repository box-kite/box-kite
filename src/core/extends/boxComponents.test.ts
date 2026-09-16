import { describe, expect, it } from 'vitest';
import { makeEngine, renderStyles, ruleList } from '../../../dev/engineHarness';

/**
 * The grid cell's ring is the one component style whose *selector* is the point: it marks the cell a
 * press chose (bug #64), and it must not mark a cell whose widget was pressed. Neither half survives a
 * browser test — jsdom computes no outline — but the rule text the engine writes does.
 */
describe('datagrid.body.cell focus ring', () => {
  it('is the cell holding focus, not a widget inside it', () => {
    const engine = makeEngine('datagrid-cell-focus-ring');

    renderStyles(engine, { component: 'datagrid.body.cell' } as never);
    const ring = ruleList(engine).filter((rule) => rule.includes('outline'));

    expect(ring.length).toBeGreaterThan(0);

    for (const rule of ring) {
      // Bare `:focus-within` lights the cell up from a selection checkbox or a tree chevron it holds,
      // over that widget's own ring; `:focus-visible` never matches a pointer at all, which was #64.
      expect(rule).toContain(':not(:has(:focus)):focus-within');
      expect(rule).not.toContain(':focus-visible');
    }
  });
});
