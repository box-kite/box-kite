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
    expect(ruleList(engine)).toEqual(['.bgColor-blue-500\\/40{background-color:color-mix(in oklab, var(--blue-500) 40%, transparent)}']);
  });

  it('shares one variable with the plain token, declared once', () => {
    const engine = makeEngine('alpha-variable');

    renderStyles(engine, { bgColor: 'red-500' });
    renderStyles(engine, { color: 'red-500/50' });

    expect(rulesOf(engine).split('--red-500:')).toHaveLength(2);
    expect(rulesOf(engine)).toContain('--red-500: oklch(63.7% .237 25.3);');
  });

  it('is a value, so every colour prop takes it', () => {
    const engine = makeEngine('alpha-every-prop');

    renderStyles(engine, { color: 'sky-500/10', borderColor: 'sky-500/20', outlineColor: 'sky-500/30' });
    renderStyles(engine, { fill: 'sky-500/40', stroke: 'sky-500/50' }, true);

    expect(ruleList(engine)).toEqual([
      '.color-sky-500\\/10{color:color-mix(in oklab, var(--sky-500) 10%, transparent)}',
      '.borderColor-sky-500\\/20{border-color:color-mix(in oklab, var(--sky-500) 20%, transparent)}',
      '.outlineColor-sky-500\\/30{outline-color:color-mix(in oklab, var(--sky-500) 30%, transparent)}',
      '.fill-sky-500\\/40{fill:color-mix(in oklab, var(--sky-500) 40%, transparent)}',
      '.stroke-sky-500\\/50{stroke:color-mix(in oklab, var(--sky-500) 50%, transparent)}',
    ]);
  });

  it('nests like any other value', () => {
    const engine = makeEngine('alpha-nesting');

    renderStyles(engine, { md: { hover: { bgColor: 'black/60' } }, theme: { dark: { bgColor: 'white/10' } } });

    expect(ruleList(engine)).toEqual([
      '@scope (.dark) to ([data-theme]){:scope .theme-dark-bgColor-white\\/10{background-color:color-mix(in oklab, var(--white) 10%, transparent)}}',
      '@media (min-width: 768px){.md-hover-bgColor-black\\/60:hover{background-color:color-mix(in oklab, var(--black) 60%, transparent)}}',
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

  it('applies to a custom property too, so markup this library never renders gets the same value', () => {
    const engine = makeEngine('alpha-vars');

    renderStyles(engine, { vars: { 'color-revenue': 'violet-500/30' } });

    expect(ruleList(engine)).toEqual([
      '.vars-color-revenue-violet-500\\/30{--color-revenue:color-mix(in oklab, var(--violet-500) 30%, transparent)}',
    ]);
  });
});
