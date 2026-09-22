import { describe, expect, it } from 'vitest';
import usedRules, { classesIn, CssRuleLike } from './playgroundCss';

/**
 * A style rule as a browser reports it. The empty `cssRules` is the point: since nested CSS shipped, every
 * `CSSStyleRule` carries one, so a walk that tests for it before the selector reads the whole sheet as
 * at-rules. The fixture keeps it, because a fixture without it cannot catch that.
 */
function style(selector: string, declarations: string): CssRuleLike {
  return { selectorText: selector, cssText: `${selector} { ${declarations} }`, cssRules: [] };
}

function group(prelude: string, rules: CssRuleLike[]): CssRuleLike {
  return { cssText: `${prelude} { … }`, cssRules: rules };
}

describe('classesIn', () => {
  it('names every class a selector mentions', () => {
    expect(classesIn('.a.b:hover .c')).toEqual(['a', 'b', 'c']);
    expect(classesIn('._5fvq33q8gdlb')).toEqual(['_5fvq33q8gdlb']);
    expect(classesIn(':root')).toEqual([]);
  });
});

describe('usedRules', () => {
  const sheet: CssRuleLike[] = [
    style(':root', '--sky-500: oklch(68.5% .169 237.3)'),
    style('._used', 'padding: 1rem'),
    style('._other', 'margin: 1rem'),
    group('@media (min-width: 48rem)', [style('._used', 'padding: 2rem')]),
    group('@scope (.dark) to ([data-theme])', [style('._used', 'color: white')]),
  ];

  it('keeps the rules that style a class the demo carries', () => {
    const rules = usedRules(sheet, new Set(['_used']));

    expect(rules.map((rule) => rule.selector)).toEqual(['._used', '._used', '._used']);
    expect(rules[0].declarations).toBe('padding: 1rem');
  });

  it('names the at-rules a kept rule sits inside, outermost first', () => {
    const rules = usedRules(sheet, new Set(['_used']));

    expect(rules.map((rule) => rule.context)).toEqual([[], ['@media (min-width: 48rem)'], ['@scope (.dark) to ([data-theme])']]);
  });

  it('leaves out a rule for a class nothing carries, and a rule with no class at all', () => {
    expect(usedRules(sheet, new Set(['_other'])).map((rule) => rule.selector)).toEqual(['._other']);
    expect(usedRules(sheet, new Set()).length).toBe(0);
  });

  it('keeps the keyframes a kept rule names, and drops the ones nothing does', () => {
    const rules = usedRules(
      [
        style('._used', 'animation-name: spin'),
        { name: 'spin', cssText: '@keyframes spin { from { rotate: 0deg } }' },
        { name: 'pulse', cssText: '@keyframes pulse { from { opacity: 1 } }' },
      ],
      new Set(['_used']),
    );

    expect(rules.map((rule) => rule.selector)).toEqual(['._used', '@keyframes spin']);
  });
});
