import { describe, expect, it } from 'vitest';
import { makeEngine, renderStyles, ruleList } from '../../../dev/engineHarness';

/**
 * The grid cell's ring is the one component style whose *selector* is the point: it marks the cell the
 * grid is on (bug #64), and a mark a copy acts on cannot be a state of the focus. No browser test
 * catches it — jsdom computes no outline — but the rule text the engine writes does.
 */
describe('datagrid.body.cell current-cell ring', () => {
  it('is a plain class, so the mark outlives the focus that put it there', () => {
    const engine = makeEngine('datagrid-cell-current-ring');

    renderStyles(engine, { component: 'datagrid.body.cell', variant: { isCurrentCell: true } } as never);
    const ring = ruleList(engine).filter((rule) => rule.includes('outline'));

    expect(ring.length).toBeGreaterThan(0);

    for (const rule of ring) {
      // Neither half of the interim rule may come back: `:focus-visible` never matches a pointer at all,
      // and `:focus-within` goes out with the focus, leaving a copy with nothing to act on.
      expect(rule).not.toContain(':focus');
    }
  });

  it('draws nothing until the model says a cell is current', () => {
    const engine = makeEngine('datagrid-cell-no-ring');

    renderStyles(engine, { component: 'datagrid.body.cell' } as never);

    expect(ruleList(engine).filter((rule) => rule.includes('outline'))).toHaveLength(0);
  });
});
