import { describe, expect, it } from 'vitest';
import { makeEngine, renderStyles, ruleList } from '../../../dev/engineHarness';

/**
 * Anchor positioning as rule text. The props carry no runtime at all, so what the engine writes is the
 * whole feature — including the two normalisations that put both spellings of a name in the same
 * declaration: the optional `--`, and the canonical spacing inside `anchor()`/`anchor-size()`.
 */
describe('anchor positioning', () => {
  it('dashes a name on the way out, so either spelling reaches the same declaration', () => {
    const engine = makeEngine('anchor-names');

    renderStyles(engine, { anchorName: 'trigger' });
    renderStyles(engine, { anchorName: '--trigger' });

    // Two class names for one declaration: the class name is built from the value as written, not from
    // the CSS it formats to (bug #123). The rule is the same either way, which is what a consumer sees.
    expect(ruleList(engine)).toEqual(['.anchorName-trigger{anchor-name:--trigger}', '.anchorName---trigger{anchor-name:--trigger}']);
  });

  it('places a layer with the five props that need no measuring', () => {
    const engine = makeEngine('anchor-place');

    renderStyles(engine, {
      position: 'fixed',
      positionAnchor: 'trigger',
      positionArea: 'block-end span-all',
      positionTryFallbacks: 'flip-block',
      positionVisibility: 'anchors-visible',
    });

    expect(ruleList(engine)).toEqual([
      '.position-fixed{position:fixed}',
      '.positionAnchor-trigger{position-anchor:--trigger}',
      '.positionArea-block-end_span-all{position-area:block-end span-all}',
      '.positionTryFallbacks-flip-block{position-try-fallbacks:flip-block}',
      '.positionVisibility-anchors-visible{position-visibility:anchors-visible}',
    ]);
  });

  it('takes a length off the anchor on the sizing props', () => {
    const engine = makeEngine('anchor-size-values');

    renderStyles(engine, { minWidth: 'anchor-size(width)' });
    renderStyles(engine, { maxHeight: 'anchor-size(--trigger height, 20rem)' });

    // Registry order, not render order: `maxHeight` is declared before `minWidth`, so its rule sorts first.
    expect(ruleList(engine)).toEqual([
      '.maxHeight-anchor-size\\(--trigger_height\\,_20rem\\){max-height:anchor-size(--trigger height, 20rem)}',
      '.minWidth-anchor-size\\(width\\){min-width:anchor-size(width)}',
    ]);
  });

  it('takes an edge of the anchor on the inset props, physical and logical alike', () => {
    const engine = makeEngine('anchor-inset-values');

    renderStyles(engine, { top: 'anchor(bottom)', insetStart: 'anchor(trigger left)' });

    expect(ruleList(engine)).toEqual([
      '.top-anchor\\(bottom\\){top:anchor(bottom)}',
      '.insetStart-anchor\\(trigger_left\\){inset-inline-start:anchor(--trigger left)}',
    ]);
  });

  it('writes nothing for a value the browser would drop, so a typo is visible rather than silent', () => {
    const engine = makeEngine('anchor-rejects');

    const classNames = renderStyles(engine, {
      positionArea: 'top inline-start' as never,
      minWidth: 'anchor-size(--trigger depth)' as never,
      top: 'anchor()' as never,
    });

    expect(classNames).toEqual(['_b']);
    expect(ruleList(engine)).toEqual([]);
  });
});
