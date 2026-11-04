import { describe, expect, it } from 'vitest';
import { generatedRulesOf, makeEngine, renderStyles } from '../../dev/engineHarness';
import Sizes from './sizes';

describe('Sizes', () => {
  it('reads the size in force, falling back to normal and then to its default', () => {
    expect(Sizes.heightValue('control')).toBe('var(--control-height,var(--control-height-normal,2.5rem))');
    expect(Sizes.fontSizeValue('control')).toBe('var(--control-font-size,var(--control-font-size-normal,0.875rem))');
    expect(Sizes.heightValue('control-compact')).toBe('var(--control-height-compact,2rem)');
    expect(Sizes.fontSizeValue('control-large')).toBe('var(--control-font-size-large,1rem)');
  });

  it('defines a project scale on the spacing and font dividers, or as CSS', () => {
    expect(Sizes.define({ compact: 8, normal: { height: 9, fontSize: 15 }, large: '3.25rem' })).toEqual({
      'control-height-compact': '2rem',
      'control-height-normal': '2.25rem',
      'control-font-size-normal': '0.9375rem',
      'control-height-large': '3.25rem',
    });
  });

  it('chooses a size for a subtree', () => {
    expect(Sizes.define({ size: 'compact' })).toEqual(Sizes.choose('compact'));
  });

  it('writes the variables through vars, untouched', () => {
    const engine = makeEngine('sizes-test');
    renderStyles(engine, { vars: Sizes.define({ normal: 9, size: 'compact' }) });

    const rules = generatedRulesOf(engine);
    expect(rules).toContain('--control-height-normal:2.25rem');
    expect(rules).toContain('--control-height:var(--control-height-compact,2rem)');
    expect(rules).toContain('--control-font-size:var(--control-font-size-compact,0.8125rem)');
  });
});
