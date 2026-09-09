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

  it('spells both forms the same way, so they share one class', () => {
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
