import { describe, expect, it } from 'vitest';
import Transforms from './transforms';

/** The `transform-origin` grammar, as Chrome, Firefox and WebKit parse it (measured, not read off the spec). */
describe('Transforms.isOrigin', () => {
  it('takes one keyword, length, percentage or fraction', () => {
    for (const value of ['center', 'top', 'left', '50%', '-25%', '1/2', '48px', '2rem', '0']) {
      expect(Transforms.isOrigin(value)).toBe(true);
    }
  });

  it('takes two keywords in either order when they name different axes', () => {
    expect(Transforms.isOrigin('top left')).toBe(true);
    expect(Transforms.isOrigin('left top')).toBe(true);
    expect(Transforms.isOrigin('center bottom')).toBe(true);
    expect(Transforms.isOrigin('center center')).toBe(true);
    expect(Transforms.isOrigin('left right')).toBe(false);
    expect(Transforms.isOrigin('top bottom')).toBe(false);
  });

  // With a length in the pair the order is fixed: horizontal, then vertical.
  it('reads a pair with a length horizontal first', () => {
    expect(Transforms.isOrigin('48px 48px')).toBe(true);
    expect(Transforms.isOrigin('left 1/3')).toBe(true);
    expect(Transforms.isOrigin('25% bottom')).toBe(true);
    expect(Transforms.isOrigin('top 10px')).toBe(false);
    expect(Transforms.isOrigin('10px left')).toBe(false);
  });

  it('takes a third position only as a length', () => {
    expect(Transforms.isOrigin('center center 5px')).toBe(true);
    expect(Transforms.isOrigin('10px 20px 5px')).toBe(true);
    expect(Transforms.isOrigin('center center 50%')).toBe(false);
    expect(Transforms.isOrigin('center center left')).toBe(false);
  });

  // background-position's offset form: every browser refuses it here, so a class for it would paint nothing.
  it('refuses the four-value offset form and anything that is not a position', () => {
    expect(Transforms.isOrigin('right 10px bottom 5px')).toBe(false);
    expect(Transforms.isOrigin('middle')).toBe(false);
    expect(Transforms.isOrigin('10')).toBe(false);
    expect(Transforms.isOrigin('1/0')).toBe(false);
    expect(Transforms.isOrigin('center; color: red')).toBe(false);
    expect(Transforms.isOrigin('')).toBe(false);
    expect(Transforms.isOrigin(4)).toBe(false);
  });
});

describe('Transforms.origin', () => {
  it('spells a fraction out as its percentage and leaves the rest as written', () => {
    expect(Transforms.origin('1/2 1/4')).toBe('50% 25%');
    expect(Transforms.origin('left -1/2 4px')).toBe('left -50% 4px');
    expect(Transforms.origin(' top  left ')).toBe('top left');
  });
});
