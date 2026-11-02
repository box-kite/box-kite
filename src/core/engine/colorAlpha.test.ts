import { describe, expect, it } from 'vitest';
import { generatedRulesOf, makeEngine, renderStyles, ruleList, rulesOf } from '../../../dev/engineHarness';

/**
 * The opacity modifier as the engine sees it: one more value on the colour props, formatted through
 * `color-mix` so the alpha lands on the *variable* — which is what keeps it themed, hoverable and shared.
 */
describe('a colour with an opacity modifier', () => {
  it('mixes the token with transparent and keeps the modifier in the class name', () => {
    const engine = makeEngine('alpha-basic');

    const classNames = renderStyles(engine, { bgColor: 'blue-500/40' });

    expect(classNames).toEqual(['_b', 'bgColor-blue-500/40']);
    expect(ruleList(engine)).toEqual([
      '.bgColor-blue-500\\/40{background-color:color-mix(in oklab, var(--blue-500,oklch(62.3% .214 259.8)) 40%, transparent)}',
    ]);
  });

  it('shares one variable with the plain token, and declares none', () => {
    const engine = makeEngine('alpha-variable');

    renderStyles(engine, { bgColor: 'red-500' });
    renderStyles(engine, { color: 'red-500/50' });

    expect(rulesOf(engine).split('var(--red-500,oklch(63.7% .237 25.3))')).toHaveLength(3);
    expect(rulesOf(engine)).not.toContain('--red-500:');
  });

  it('is a value, so every colour prop takes it', () => {
    const engine = makeEngine('alpha-every-prop');

    renderStyles(engine, { color: 'sky-500/10', borderColor: 'sky-500/20', outlineColor: 'sky-500/30' });
    renderStyles(engine, { fill: 'sky-500/40', stroke: 'sky-500/50' }, true);

    expect(ruleList(engine)).toEqual([
      '.color-sky-500\\/10{color:color-mix(in oklab, var(--sky-500,oklch(68.5% .169 237.3)) 10%, transparent)}',
      '.borderColor-sky-500\\/20{border-color:color-mix(in oklab, var(--sky-500,oklch(68.5% .169 237.3)) 20%, transparent)}',
      '.outlineColor-sky-500\\/30{outline-color:color-mix(in oklab, var(--sky-500,oklch(68.5% .169 237.3)) 30%, transparent)}',
      '.fill-sky-500\\/40{fill:color-mix(in oklab, var(--sky-500,oklch(68.5% .169 237.3)) 40%, transparent)}',
      '.stroke-sky-500\\/50{stroke:color-mix(in oklab, var(--sky-500,oklch(68.5% .169 237.3)) 50%, transparent)}',
    ]);
  });

  it('nests like any other value', () => {
    const engine = makeEngine('alpha-nesting');

    renderStyles(engine, { md: { hover: { bgColor: 'black/60' } }, theme: { dark: { bgColor: 'white/10' } } });

    expect(ruleList(engine)).toEqual([
      '@scope (.dark) to ([data-theme]){:scope .theme-dark-bgColor-white\\/10{background-color:color-mix(in oklab, var(--white,#fff) 10%, transparent)}}',
      '@media (min-width: 768px){.md-hover-bgColor-black\\/60:hover{background-color:color-mix(in oklab, var(--black,#000) 60%, transparent)}}',
    ]);
  });

  it('emits neither a rule nor a class name for a colour it does not know', () => {
    const engine = makeEngine('alpha-unknown');

    expect(renderStyles(engine, { bgColor: 'bleu-500/40' } as never)).toEqual(['_b']);
    expect(renderStyles(engine, { bgColor: 'blue-500/140' } as never)).toEqual(['_b']);
    expect(generatedRulesOf(engine)).toBe('');
  });

  it('applies to a variable somebody declared with extend()', () => {
    const engine = makeEngine('alpha-extended');

    engine.extend({ brand: '#123456' }, {}, {});

    expect(renderStyles(engine, { bgColor: 'brand/25' } as never)).toEqual(['_b', 'bgColor-brand/25']);
    expect(ruleList(engine)).toEqual(['.bgColor-brand\\/25{background-color:color-mix(in oklab, var(--brand) 25%, transparent)}']);
    expect(rulesOf(engine)).toContain('--brand: #123456;');
  });

  // Bug #308: `vars` knew only the palette, so an `extend()` token reached the custom property as plain text.
  it('resolves every colour in a custom property exactly as the fill prop resolves it', () => {
    const resolved = (props: object, isSvg = false) => {
      const engine = makeEngine(`alpha-vars-like-fill-${Object.keys(props)[0]}-${JSON.stringify(props).replace(/\W/g, '')}`);
      engine.extend({ brand: '#123456' }, {}, {});
      renderStyles(engine, props as never, isSvg);
      const [rule] = ruleList(engine);

      return rule.slice(rule.indexOf(':') + 1, -1);
    };

    for (const paint of ['teal-500', 'teal-500/35', 'brand', 'brand/35', 'var(--brand)', 'var(--chart-1)', 'url(#sky)', 'CanvasText']) {
      expect(resolved({ vars: { x: paint } }).replace(/^--x:/, ''), paint).toBe(resolved({ fill: paint }, true).replace(/^fill:/, ''));
    }
  });

  // Bug #309: a hand-written `var(--brand)` was written out but never declared, so it named nothing.
  it('declares an extend() variable that a reference or another variable names', () => {
    const fill = makeEngine('alpha-reference-declared');
    fill.extend({ brand: '#123456' }, {}, {});
    renderStyles(fill, { fill: 'var(--brand)' } as never, true);
    expect(rulesOf(fill)).toContain('--brand: #123456;');

    const nested = makeEngine('alpha-variable-in-variable');
    nested.extend({ brand: '#123456', 'brand-soft': 'color-mix(in oklab, var(--brand) 50%, white)' }, {}, {});
    renderStyles(nested, { bgColor: 'brand-soft' } as never);
    expect(rulesOf(nested)).toContain('--brand: #123456;');
  });

  it('resolves an extend() token in css as a custom property does', () => {
    const engine = makeEngine('alpha-css-extended');
    engine.extend({ brand: '#123456' }, {}, {});

    renderStyles(engine, { css: { outlineColor: 'brand/50' } });

    expect(ruleList(engine)).toEqual(['.css-outlineColor-brand\\/50{outline-color:color-mix(in oklab, var(--brand) 50%, transparent)}']);
  });

  it('applies to a custom property too, so markup this library never renders gets the same value', () => {
    const engine = makeEngine('alpha-vars');

    renderStyles(engine, { vars: { 'color-revenue': 'violet-500/30' } });

    expect(ruleList(engine)).toEqual([
      '.vars-color-revenue-violet-500\\/30{--color-revenue:color-mix(in oklab, var(--violet-500,oklch(60.6% .25 292.7)) 30%, transparent)}',
    ]);
  });
});
