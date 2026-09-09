import { describe, expect, it } from 'vitest';
import Anchors from './anchors';

/** The anchor name grammar: a dashed-ident in CSS, with the `--` optional on the way in. */
describe('Anchors.isName', () => {
  it('takes a name with or without its dashes', () => {
    expect(Anchors.isName('trigger')).toBe(true);
    expect(Anchors.isName('--trigger')).toBe(true);
    expect(Anchors.isName('_menu-button-2')).toBe(true);
  });

  it('rejects what cannot be an ident, so nothing unbalanced reaches rule text', () => {
    expect(Anchors.isName('')).toBe(false);
    expect(Anchors.isName('2trigger')).toBe(false);
    expect(Anchors.isName('my trigger')).toBe(false);
    expect(Anchors.isName('trigger)')).toBe(false);
    expect(Anchors.isName('--a --b')).toBe(false);
    expect(Anchors.isName(4)).toBe(false);
  });

  it('spells both forms the same way, so a name written either way reaches the same anchor', () => {
    expect(Anchors.dashedName('trigger')).toBe('--trigger');
    expect(Anchors.dashedName('--trigger')).toBe('--trigger');
  });
});

/**
 * The `position-area` grammar, as measured in Chrome 152 rather than read off the spec: two keywords
 * from one family, block axis first, with `center`/`span-all` neutral.
 */
describe('Anchors.isArea', () => {
  it('takes a single keyword from any family', () => {
    for (const single of ['center', 'span-all', 'none', 'top', 'left', 'block-end', 'inline-start', 'self-block-start', 'start', 'x-end']) {
      expect(Anchors.isArea(single)).toBe(true);
    }
  });

  it('takes two keywords from one family, block axis first', () => {
    for (const pair of [
      'top left',
      'bottom span-right',
      'block-end inline-start',
      'span-block-start inline-end',
      'self-block-end self-inline-start',
      'start end',
      'span-self-start self-end',
      'y-start x-end',
    ]) {
      expect(Anchors.isArea(pair)).toBe(true);
    }
  });

  it('lets a neutral keyword join whichever family the other half names', () => {
    expect(Anchors.isArea('block-end center')).toBe(true);
    expect(Anchors.isArea('center left')).toBe(true);
    expect(Anchors.isArea('top span-all')).toBe(true);
    expect(Anchors.isArea('center center')).toBe(true);
  });

  it('refuses two families in one value, the way the browser does', () => {
    expect(Anchors.isArea('top inline-start')).toBe(false);
    expect(Anchors.isArea('block-start left')).toBe(false);
    expect(Anchors.isArea('top start')).toBe(false);
    expect(Anchors.isArea('start left')).toBe(false);
    expect(Anchors.isArea('start self-start')).toBe(false);
    expect(Anchors.isArea('x-start y-start')).toBe(false);
  });

  it('refuses two keywords from the same axis, and anything that is not one or two of them', () => {
    expect(Anchors.isArea('top bottom')).toBe(false);
    expect(Anchors.isArea('left right')).toBe(false);
    expect(Anchors.isArea('block-start block-end')).toBe(false);
    expect(Anchors.isArea('top left center')).toBe(false);
    expect(Anchors.isArea('')).toBe(false);
    expect(Anchors.isArea('above')).toBe(false);
    expect(Anchors.isArea(4)).toBe(false);
  });
});

/** The fallback list: flips that combine, `@position-try` names that do not, judged whole. */
describe('Anchors.isTryFallbacks', () => {
  it('takes the three flips, alone and combined into one position', () => {
    expect(Anchors.isTryFallbacks('flip-block')).toBe(true);
    expect(Anchors.isTryFallbacks('flip-inline')).toBe(true);
    expect(Anchors.isTryFallbacks('flip-start')).toBe(true);
    expect(Anchors.isTryFallbacks('flip-block flip-inline')).toBe(true);
    expect(Anchors.isTryFallbacks('flip-block flip-inline flip-start')).toBe(true);
  });

  it('takes a comma-separated list, tried in order', () => {
    expect(Anchors.isTryFallbacks('flip-block, flip-inline')).toBe(true);
    expect(Anchors.isTryFallbacks('flip-block, flip-inline, flip-block flip-inline')).toBe(true);
    expect(Anchors.isTryFallbacks('--wide, flip-block')).toBe(true);
    expect(Anchors.isTryFallbacks('none')).toBe(true);
  });

  it('takes a `@position-try` name only as a whole position', () => {
    expect(Anchors.isTryFallbacks('--wide')).toBe(true);
    // A name is not a keyword, so it cannot combine with one inside a single position.
    expect(Anchors.isTryFallbacks('flip-block --wide')).toBe(false);
  });

  it('drops the whole value when one position is unusable, the way a gradient is judged', () => {
    expect(Anchors.isTryFallbacks('flip-block, flip-sideways')).toBe(false);
    expect(Anchors.isTryFallbacks('flip-block,')).toBe(false);
    expect(Anchors.isTryFallbacks('flip-block, --2wide')).toBe(false);
    expect(Anchors.isTryFallbacks('')).toBe(false);
    expect(Anchors.isTryFallbacks('normal')).toBe(false);
    expect(Anchors.isTryFallbacks(4)).toBe(false);
  });
});

/**
 * `anchor-size()` and `anchor()`: the two functions that read a length off the anchor. Both were measured
 * in Chrome 152 — the fallback is comma-separated, a bare `anchor()` is rejected where `anchor-size()` is
 * not, and one keyword is the anchor's *name* when it is not one of the function's own.
 */
describe('Anchors.isSizeValue', () => {
  it('takes every axis, named or not, with or without a fallback', () => {
    for (const axis of ['width', 'height', 'block', 'inline', 'self-block', 'self-inline']) {
      expect(Anchors.isSizeValue(`anchor-size(${axis})`)).toBe(true);
      expect(Anchors.isSizeValue(`anchor-size(trigger ${axis})`)).toBe(true);
      expect(Anchors.isSizeValue(`anchor-size(--trigger ${axis}, 10rem)`)).toBe(true);
    }
  });

  it('takes the two forms that name no axis, which the browser reads as the layer’s own', () => {
    expect(Anchors.isSizeValue('anchor-size()')).toBe(true);
    expect(Anchors.isSizeValue('anchor-size(--trigger)')).toBe(true);
  });

  it('takes a fallback carrying commas of its own, since the split is on the first one', () => {
    expect(Anchors.isSizeValue('anchor-size(width, clamp(4rem, 50%, 20rem))')).toBe(true);
  });

  it('refuses an axis the browser has no name for, and anything that could end the declaration', () => {
    expect(Anchors.isSizeValue('anchor-size(--trigger depth)')).toBe(false);
    expect(Anchors.isSizeValue('anchor-size(width 10rem)')).toBe(false);
    expect(Anchors.isSizeValue('anchor-size(width, 10rem; color: red)')).toBe(false);
    expect(Anchors.isSizeValue('anchor-size(width')).toBe(false);
    expect(Anchors.isSizeValue('anchor(width)')).toBe(false);
    expect(Anchors.isSizeValue(4)).toBe(false);
  });
});

describe('Anchors.isInsetValue', () => {
  it('takes every edge, a percentage along one, and a named anchor', () => {
    for (const side of ['top', 'right', 'bottom', 'left', 'start', 'end', 'self-start', 'self-end', 'center', 'inside', 'outside']) {
      expect(Anchors.isInsetValue(`anchor(${side})`)).toBe(true);
      expect(Anchors.isInsetValue(`anchor(trigger ${side})`)).toBe(true);
    }

    expect(Anchors.isInsetValue('anchor(50%)')).toBe(true);
    expect(Anchors.isInsetValue('anchor(--trigger 50%, 0px)')).toBe(true);
  });

  it('needs the edge: an anchor with no side named is not a length', () => {
    expect(Anchors.isInsetValue('anchor()')).toBe(false);
    expect(Anchors.isInsetValue('anchor(--trigger)')).toBe(false);
    expect(Anchors.isInsetValue('anchor(middle)')).toBe(false);
  });
});

describe('Anchors.functionValue', () => {
  it('dashes the name and canonicalises the spacing, so every spelling writes one declaration', () => {
    expect(Anchors.functionValue('anchor-size(trigger width)')).toBe('anchor-size(--trigger width)');
    expect(Anchors.functionValue('anchor-size(  width  )')).toBe('anchor-size(width)');
    expect(Anchors.functionValue('anchor-size(--trigger)')).toBe('anchor-size(--trigger)');
    expect(Anchors.functionValue('anchor(trigger bottom,  8px )')).toBe('anchor(--trigger bottom, 8px)');
    expect(Anchors.functionValue('anchor(50%)')).toBe('anchor(50%)');
  });
});
