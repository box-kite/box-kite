import { describe, expect, it } from 'vitest';
import Palette from './palette';

/** The packed table, expanded: twenty-six families and the two aliases, eleven steps each, in the notation the rules carry. */
describe('Palette.colors', () => {
  it('expands every family and step into an oklch() value', () => {
    const tokens = Object.keys(Palette.colors).filter((name) => /-\d+$/.test(name));

    expect(tokens).toHaveLength(28 * Palette.steps.length);
    expect(tokens.every((token) => /^oklch\([\d.]+% [\d.]+ ([\d.]+|none)\)$/.test(Palette.colors[token as Palette.Token]))).toBe(true);
  });

  it('keeps the values Tailwind publishes, missing hue included', () => {
    expect(Palette.colors['blue-500']).toBe('oklch(62.3% .214 259.8)');
    expect(Palette.colors['slate-950']).toBe('oklch(12.9% .042 264.7)');
    // A family with no hue at a step writes `none`, which is a component CSS treats as missing.
    expect(Palette.colors['neutral-500']).toBe('oklch(55.6% 0 none)');
  });

  it('keeps the keywords that are not palette tokens', () => {
    expect(Palette.colors.currentColor).toBe('currentColor');
    expect(Palette.colors.transparent).toBe('transparent');
    expect(Palette.colors.white).toBe('#fff');
    expect(Palette.colors.red).toBe('red');
    // A token since v1, so somebody's colour: dropping it would be a breaking change, not a cleanup.
    expect(Palette.colors.vi).toBe('#7949FF');
  });
});

/** The opacity modifier: `blue-500/40`, and everything that is not one. */
describe('Palette.isAlpha', () => {
  it('takes a colour it knows with a percentage', () => {
    expect(Palette.isAlpha('blue-500/40')).toBe(true);
    expect(Palette.isAlpha('black/50')).toBe(true);
    expect(Palette.isAlpha('currentColor/12.5')).toBe(true);
    expect(Palette.isAlpha('mauve-950/100')).toBe(true);
    expect(Palette.isAlpha('sky-500/0')).toBe(true);
  });

  it('rejects a colour it does not know, so a typo drops the rule rather than emitting one', () => {
    expect(Palette.isAlpha('bleu-500/40')).toBe(false);
    expect(Palette.isAlpha('blue-550/40')).toBe(false);
    // `none` is a value of the colour props, not a colour: there is nothing to mix.
    expect(Palette.isAlpha('none/40')).toBe(false);
  });

  it('rejects a modifier that is not a percentage', () => {
    expect(Palette.isAlpha('blue-500/101')).toBe(false);
    expect(Palette.isAlpha('blue-500/-10')).toBe(false);
    expect(Palette.isAlpha('blue-500/half')).toBe(false);
    expect(Palette.isAlpha('blue-500/')).toBe(false);
    expect(Palette.isAlpha('blue-500')).toBe(false);
    expect(Palette.isAlpha(40)).toBe(false);
  });
});

describe('Palette.mix', () => {
  it('mixes the variable with transparent, in oklab', () => {
    expect(Palette.mix('blue-500/40', (name) => `var(--${name})`)).toBe('color-mix(in oklab, var(--blue-500) 40%, transparent)');
  });

  it('reaches the variable rather than the value behind it, so the theme still applies', () => {
    const used: string[] = [];

    Palette.mix('sky-300/60', (name) => {
      used.push(name);
      return `var(--${name})`;
    });

    expect(used).toEqual(['sky-300']);
  });
});
