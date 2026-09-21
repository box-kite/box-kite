import { describe, expect, it } from 'vitest';
import { generatedRulesOf, makeEngine, renderStyles } from '../../dev/engineHarness';
import { BoxStyleProps } from '../types';
import Timelines from './timelines';

/** The timeline name grammar: a dashed-ident in CSS, with the `--` optional on the way in. */
describe('Timelines.isName', () => {
  it('takes a name with or without its dashes', () => {
    expect(Timelines.isName('page')).toBe(true);
    expect(Timelines.isName('--page')).toBe(true);
    expect(Timelines.isName('_card-2')).toBe(true);
  });

  it('rejects what cannot be an ident, so nothing unbalanced reaches rule text', () => {
    expect(Timelines.isName('')).toBe(false);
    expect(Timelines.isName('2page')).toBe(false);
    expect(Timelines.isName('my page')).toBe(false);
    expect(Timelines.isName('scroll()')).toBe(false);
    expect(Timelines.isName(4)).toBe(false);
  });

  // `anchorName="none"` writes `--none` for want of this, which is why the keywords are excluded here
  // rather than left to the order the definitions happen to be declared in (bug #195).
  it('never swallows a keyword the prop takes on its own', () => {
    for (const keyword of ['none', 'auto', 'normal', 'inherit', 'initial', 'revert', 'unset']) {
      expect(Timelines.isName(keyword)).toBe(false);
    }
  });

  it('spells both forms the same way, so one timeline is one class', () => {
    expect(Timelines.dashedName('page')).toBe('--page');
    expect(Timelines.dashedName('--page')).toBe('--page');
  });
});

/** `scroll()` and `view()`, whose arguments come in any order — which is what the `||` in the grammar means. */
describe('Timelines.isAnonymousTimeline', () => {
  it('takes a bare call, an axis, a scroller, and the two in either order', () => {
    for (const value of ['scroll()', 'scroll(block)', 'scroll(root)', 'scroll(root block)', 'scroll(block root)', 'scroll(self y)']) {
      expect(Timelines.isAnonymousTimeline(value)).toBe(true);
    }
  });

  it('takes a view timeline with an axis and an inset of one or two lengths', () => {
    for (const value of ['view()', 'view(block)', 'view(auto)', 'view(inline 20%)', 'view(y 10px 20px)', 'view(20% 20%)']) {
      expect(Timelines.isAnonymousTimeline(value)).toBe(true);
    }
  });

  it('rejects an unknown keyword, a repeated one and an unbalanced call', () => {
    for (const value of [
      'scroll(page)',
      'scroll(block inline)',
      'scroll(root nearest)',
      'scroll(',
      'scroll(root block y)',
      'view(nearest)',
    ]) {
      expect(Timelines.isAnonymousTimeline(value)).toBe(false);
    }
  });

  it('spaces the arguments canonically, so two spellings share one class', () => {
    expect(Timelines.anonymousValue('scroll( root   block )')).toBe('scroll(root block)');
    expect(Timelines.anonymousValue('view()')).toBe('view()');
  });
});

/**
 * A range is read greedily, the way the browser reads it: `cover 20%` is one end at a fifth of the cover
 * range, not two ends. The shorthand takes two of them, the longhands exactly one.
 */
describe('Timelines range values', () => {
  it('takes a name, an offset into one, a plain length and `normal`', () => {
    for (const value of ['normal', 'cover', 'entry', 'exit-crossing', 'entry 25%', 'cover 100px', '20%', '0']) {
      expect(Timelines.isRangeEdge(value)).toBe(true);
    }
  });

  it('rejects a name that is not one of the six, and a second end on a longhand', () => {
    for (const value of ['covered', 'entry exit', 'entry 0% entry 100%', '20% 80%', 'entry 25', '']) {
      expect(Timelines.isRangeEdge(value)).toBe(false);
    }
  });

  it('takes one end or two on the shorthand', () => {
    for (const value of ['entry', 'entry exit', 'entry 0% entry 100%', 'cover 20%', '20% 80%', 'normal normal']) {
      expect(Timelines.isRangeValue(value)).toBe(true);
    }
  });

  it('rejects a third end, so a typo emits nothing rather than half a range', () => {
    expect(Timelines.isRangeValue('entry exit cover')).toBe(false);
    expect(Timelines.isRangeValue('entry 0% entry 100% exit')).toBe(false);
  });

  it('takes a calculated offset whole — what it computes to is the browser‘s business', () => {
    expect(Timelines.isRangeEdge('entry calc(100% - 2rem)')).toBe(true);
    expect(Timelines.isRangeEdge('entry calc(100%; color:red)')).toBe(false);
  });
});

/** The two shorthand declarations: a name, and optionally the axis it follows. */
describe('Timelines.isTimelineShorthand', () => {
  it('takes a name alone or a name and an axis', () => {
    for (const value of ['page', '--page', 'page block', 'card inline', 'card x', 'card y']) {
      expect(Timelines.isTimelineShorthand(value)).toBe(true);
    }
  });

  // `block` is not in that list on purpose: it is a legal *name*, and `scrollTimeline="block"` declares
  // a timeline called `--block` rather than naming an axis with no timeline.
  it('rejects a keyword, an unknown axis and a third token', () => {
    for (const value of ['none', 'page sideways', 'page block inline', '']) {
      expect(Timelines.isTimelineShorthand(value)).toBe(false);
    }
  });

  it('dashes the name, so both spellings reach one timeline', () => {
    expect(Timelines.timelineShorthandValue('page block')).toBe('--page block');
    expect(Timelines.timelineShorthandValue('--page')).toBe('--page');
  });
});

describe('Timelines.isInset and isScope', () => {
  it('takes one or two of `auto` and a length as an inset', () => {
    for (const value of ['auto', '20%', '10px 20px', 'auto 20%']) expect(Timelines.isInset(value)).toBe(true);
    for (const value of ['', '20', '10px 20px 30px', 'cover']) expect(Timelines.isInset(value)).toBe(false);
  });

  it('takes a comma-separated list of names as a scope and dashes every one', () => {
    expect(Timelines.isScope('page')).toBe(true);
    expect(Timelines.isScope('page, --card')).toBe(true);
    expect(Timelines.isScope('page, none')).toBe(false);
    expect(Timelines.scopeValue('page,--card')).toBe('--page, --card');
  });
});

/** A view transition name is a `<custom-ident>` — *not* dashed, which is the one name here that is not. */
describe('Timelines.isTransitionName', () => {
  it('takes an ident and leaves it alone', () => {
    expect(Timelines.isTransitionName('header')).toBe(true);
    expect(Timelines.isTransitionName('-card')).toBe(true);
  });

  it('rejects the keywords the prop takes on its own, so none of them becomes a name', () => {
    for (const keyword of ['none', 'auto', 'match-element', '2header', 'a b']) {
      expect(Timelines.isTransitionName(keyword)).toBe(false);
    }
  });

  it('takes a space-separated list as a class', () => {
    expect(Timelines.isTransitionClass('card')).toBe(true);
    expect(Timelines.isTransitionClass('card wide')).toBe(true);
    expect(Timelines.isTransitionClass('card none')).toBe(false);
  });
});

function rulesFor(props: BoxStyleProps, id: string): string {
  const engine = makeEngine(`timelines-${id}`);
  renderStyles(engine, props);

  return generatedRulesOf(engine);
}

/** What the props actually write, which is the half a grammar test cannot see. */
describe('the scroll-driven animation props', () => {
  it.each([
    ['animationTimeline', 'scroll()', 'animation-timeline:scroll()'],
    ['animationTimeline', 'scroll(root block)', 'animation-timeline:scroll(root block)'],
    ['animationTimeline', 'page', 'animation-timeline:--page'],
    ['animationTimeline', 'auto', 'animation-timeline:auto'],
    ['animationRange', 'entry 0% entry 100%', 'animation-range:entry 0% entry 100%'],
    ['animationRangeStart', 'entry 25%', 'animation-range-start:entry 25%'],
    ['animationRangeEnd', 'cover', 'animation-range-end:cover'],
    ['scrollTimeline', 'page block', 'scroll-timeline:--page block'],
    ['scrollTimelineName', 'page', 'scroll-timeline-name:--page'],
    ['scrollTimelineAxis', 'inline', 'scroll-timeline-axis:inline'],
    ['viewTimeline', 'card', 'view-timeline:--card'],
    ['viewTimelineInset', '20%', 'view-timeline-inset:20%'],
    ['timelineScope', 'page, card', 'timeline-scope:--page, --card'],
    ['viewTransitionName', 'header', 'view-transition-name:header'],
    ['viewTransitionClass', 'card wide', 'view-transition-class:card wide'],
  ] as const)('%s={%s} writes %s', (prop, value, declaration) => {
    expect(rulesFor({ [prop]: value } as BoxStyleProps, `${prop}-${value}`)).toContain(declaration);
  });

  it.each([
    ['animationTimeline', 'scroll(page)'],
    ['animationTimeline', 'scroll(block inline)'],
    ['animationRange', 'entry exit cover'],
    ['viewTimelineInset', '20'],
    ['timelineScope', '2page'],
    ['viewTransitionName', '2header'],
  ] as const)('%s={%s} emits no rule at all', (prop, value) => {
    expect(rulesFor({ [prop]: value } as BoxStyleProps, `bad-${prop}-${value}`)).toBe('');
  });

  /**
   * The CSS `animation` shorthand resets `animation-timeline` to `auto`, so a timeline declared before it
   * is silently undone. The registry's declaration order is the cascade order, which is what settles it —
   * this is the test that fails if the props are ever reordered.
   */
  it('puts the timeline after the `animation` shorthand, which would otherwise reset it', () => {
    const rules = rulesFor({ animation: 'spin', animationTimeline: 'scroll()' }, 'shorthand-order');

    expect(rules.indexOf('animation:spin')).toBeLessThan(rules.indexOf('animation-timeline:'));
    expect(rules.indexOf('animation:spin')).toBeGreaterThan(-1);
  });

  it('puts the range longhands after the shorthand that also sets them', () => {
    const rules = rulesFor({ animationRange: 'cover', animationRangeStart: 'entry' }, 'range-order');

    expect(rules.indexOf('animation-range:')).toBeLessThan(rules.indexOf('animation-range-start:'));
  });

  // The canonical form is the *declaration*, not the class name — a class name is built from the value as
  // written, so the two spellings are two classes naming one timeline rather than one shared class.
  it('writes the same declaration for both spellings of a name', () => {
    const engine = makeEngine('timelines-both-spellings');
    renderStyles(engine, { scrollTimelineName: '--page' });
    renderStyles(engine, { scrollTimelineName: 'page' });

    expect(generatedRulesOf(engine).match(/scroll-timeline-name:--page/g)).toHaveLength(2);
  });
});
