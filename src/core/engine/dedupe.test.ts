import { describe, expect, it } from 'vitest';
import { generatedRulesOf, makeEngine, renderStyles, ruleList, rulesOf } from '../../../dev/engineHarness';
import { createStyleEngine } from './styleEngine';

/**
 * The engine's whole efficiency claim is that identical prop values collapse to one class and one
 * rule, and that rules land in an order that keeps the cascade predictable. Both are invisible in
 * component tests, so they are pinned down here.
 */
describe('atomic rules', () => {
  it('emits one rule per prop/value pair no matter how many Boxes use it', () => {
    const engine = makeEngine('dedupe-single');

    const first = renderStyles(engine, { p: 4 });
    const second = renderStyles(engine, { p: 4, m: 2 });
    const third = renderStyles(engine, { p: 4 });

    expect(first).toEqual(['_b', 'p-4']);
    expect(second).toEqual(['_b', 'p-4', 'm-2']);
    expect(third).toEqual(first);
    // `m` is declared before `p` in the registry, so it sorts first even though `.p-4` was
    // written a flush earlier — position follows declaration order, not arrival order.
    expect(ruleList(engine)).toEqual(['.m-2{margin:0.5rem}', '.p-4{padding:1rem}']);
  });

  it('keeps one declaration per rule so classes compose instead of overwriting', () => {
    const engine = makeEngine('dedupe-atomic');

    renderStyles(engine, { p: 4, m: 2, bgColor: 'red-500', display: 'flex' });

    const rules = ruleList(engine);
    expect(rules).toHaveLength(4);
    for (const rule of rules) {
      expect(rule).not.toContain(';');
    }
  });

  it('treats different values of the same prop as different rules', () => {
    const engine = makeEngine('dedupe-values');

    renderStyles(engine, { p: 4 });
    renderStyles(engine, { p: 8 });

    expect(ruleList(engine)).toEqual(['.p-4{padding:1rem}', '.p-8{padding:2rem}']);
  });

  it('separates the same value across breakpoints and pseudo classes', () => {
    const engine = makeEngine('dedupe-variants');

    const classNames = renderStyles(engine, { p: 4, hover: { p: 4 }, sm: { p: 4 } });

    expect(classNames).toEqual(['_b', 'p-4', 'hover-p-4', 'sm-p-4']);
    expect(ruleList(engine)).toEqual([
      '.p-4{padding:1rem}',
      '.hover-p-4:hover{padding:1rem}',
      '@media (min-width: 640px){.sm-p-4{padding:1rem}}',
    ]);
  });

  it('emits a rule per pseudo-class combination, weighted by the combination', () => {
    const engine = makeEngine('dedupe-pseudo');

    const classNames = renderStyles(engine, { hover: { p: 4, focus: { p: 4 } } });

    expect(classNames).toEqual(['_b', 'hover-p-4', 'hover-focus-p-4']);
    // `focus` maps to `:focus-within` so a Box can style itself from a focused descendant.
    expect(generatedRulesOf(engine)).toContain('.hover-focus-p-4:hover:focus-within{padding:1rem}');
  });

  it('serves an identical prop object from the class cache without re-emitting rules', () => {
    const engine = makeEngine('dedupe-cache');

    renderStyles(engine, { p: 4, m: 2 });
    const before = generatedRulesOf(engine);
    renderStyles(engine, { p: 4, m: 2 });

    expect(generatedRulesOf(engine)).toBe(before);
  });

  it('re-emits everything after clear(), which is what SSG relies on', () => {
    const engine = makeEngine('dedupe-clear');

    renderStyles(engine, { p: 4 });
    engine.clear();
    const element = document.getElementById(engine.styleElementId);
    if (element) element.textContent = '';
    renderStyles(engine, { p: 4 });

    expect(rulesOf(engine)).toContain('.p-4{padding:1rem}');
    // The base rules come back too — clear() resets the initialization flag.
    expect(rulesOf(engine)).toContain('._b{display: block;');
  });
});

describe('rule ordering', () => {
  it('orders rules by prop declaration order, not by the order props were written', () => {
    const engine = makeEngine('order-declaration');

    // `b` is declared near the top of the registry, `p` far below it.
    renderStyles(engine, { p: 4, b: 1 });

    const rules = generatedRulesOf(engine);
    expect(rules.indexOf('.b-1{')).toBeLessThan(rules.indexOf('.p-4{'));
  });

  it('inserts a later rule at its declaration position in the stylesheet (cssom sink)', () => {
    // Every sink has to place a rule by its sort key rather than append it (see styleSink.test.ts);
    // this is the same guarantee checked against a real stylesheet, which is what a browser uses.
    const engine = createStyleEngine({ classNames: 'readable', sink: 'cssom', styleElementId: 'order-cssom' });

    engine.resolveClassNames({ p: 4 }, false);
    engine.flushSync();
    engine.resolveClassNames({ b: 1 }, false);
    engine.flushSync();

    const sheet = (document.getElementById('order-cssom') as HTMLStyleElement).sheet;
    const generated = [...(sheet?.cssRules ?? [])]
      .map((rule) => rule.cssText)
      .filter((text) => text.startsWith('.b-') || text.startsWith('.p-'));

    expect(generated).toHaveLength(2);
    expect(generated[0]).toContain('.b-1');
    expect(generated[1]).toContain('.p-4');
  });

  it('puts breakpoint rules after the unprefixed ones so they win the cascade', () => {
    const engine = makeEngine('order-breakpoints');

    renderStyles(engine, { xl: { p: 4 }, sm: { p: 2 }, p: 1 });

    expect(ruleList(engine)).toEqual([
      '.p-1{padding:0.25rem}',
      '@media (min-width: 640px){.sm-p-2{padding:0.5rem}}',
      '@media (min-width: 1280px){.xl-p-4{padding:1rem}}',
    ]);
  });

  it('wraps every breakpoint in its own min-width query', () => {
    const engine = makeEngine('order-media');

    renderStyles(engine, { sm: { p: 1 }, md: { p: 1 }, lg: { p: 1 }, xl: { p: 1 } });

    expect(ruleList(engine)).toEqual([
      '@media (min-width: 640px){.sm-p-1{padding:0.25rem}}',
      '@media (min-width: 768px){.md-p-1{padding:0.25rem}}',
      '@media (min-width: 1024px){.lg-p-1{padding:0.25rem}}',
      '@media (min-width: 1280px){.xl-p-1{padding:0.25rem}}',
    ]);
  });

  it('writes the base rules once, ahead of everything generated from props', () => {
    const engine = makeEngine('order-base');

    renderStyles(engine, { p: 4 });
    renderStyles(engine, { m: 4 });

    const all = rulesOf(engine);
    expect(all.indexOf('._b{display: block;')).toBeLessThan(all.indexOf('.p-4{'));
    expect(all.split('._b{display: block;')).toHaveLength(2);
  });
});

describe('variables', () => {
  it('declares each used variable once in :root', () => {
    const engine = makeEngine('vars-once');
    engine.extend({ brand: '#123456', accent: '#654321' }, {}, {});

    renderStyles(engine, { bgColor: 'brand' } as never);
    renderStyles(engine, { color: 'brand', borderColor: 'accent' } as never);

    const all = rulesOf(engine);
    expect(all.split('--brand:')).toHaveLength(2);
    expect(all).toContain('--accent: #654321;');
    expect(generatedRulesOf(engine)).toContain('.bgColor-brand{background-color:var(--brand)}');
  });

  it('adds variables discovered after the first flush', () => {
    const engine = makeEngine('vars-late');
    engine.extend({ brand: '#123456' }, {}, {});

    renderStyles(engine, { p: 4 });
    expect(rulesOf(engine)).not.toContain('--brand');

    renderStyles(engine, { bgColor: 'brand' } as never);
    expect(rulesOf(engine)).toContain('--brand: #123456;');
  });

  // A `:root` insert after the first paint recalculates every element (bug #205), so a palette token
  // carries its value as the fallback instead.
  it('declares no palette token at all', () => {
    const engine = makeEngine('vars-palette');

    renderStyles(engine, { p: 4 });
    renderStyles(engine, { bgColor: 'red-500', color: 'blue-500/40' });

    expect(rulesOf(engine)).not.toContain('--red-500:');
    expect(rulesOf(engine)).not.toContain('--blue-500:');
    expect(generatedRulesOf(engine)).toContain('.bgColor-red-500{background-color:var(--red-500,oklch(63.7% .237 25.3))}');
  });

  it('gives a hand-written palette reference its value, and leaves anybody else’s alone', () => {
    const engine = makeEngine('vars-references');
    engine.extend({ stripes: 'linear-gradient(var(--violet-300) 10%,var(--chart-1) 0)' }, {}, {});

    renderStyles(engine, { fill: 'var(--sky-500)', stroke: 'var(--chart-1)', vars: { x: 'var(--rose-400)' } });
    engine.getVariableValue('stripes');
    engine.flushSync();

    expect(generatedRulesOf(engine)).toContain('{fill:var(--sky-500,oklch(68.5% .169 237.3))}');
    expect(generatedRulesOf(engine)).toContain('{stroke:var(--chart-1)}');
    expect(generatedRulesOf(engine)).toContain('{--x:var(--rose-400,oklch(71.2% .194 13.4))}');
    expect(rulesOf(engine)).toContain('--stripes: linear-gradient(var(--violet-300,oklch(81.1% .111 293.6)) 10%,var(--chart-1) 0);');
  });

  it('declares a palette token a user variable overrides, and resolves a self-reference without recursing', () => {
    const engine = makeEngine('vars-override');
    engine.extend({ 'red-500': '#f00', 'blue-500': 'var(--blue-500)' }, {}, {});

    renderStyles(engine, { bgColor: 'red-500', color: 'blue-500' });

    expect(generatedRulesOf(engine)).toContain('.bgColor-red-500{background-color:var(--red-500)}');
    expect(rulesOf(engine)).toContain('--red-500: #f00;');
    expect(rulesOf(engine)).toContain('--blue-500: var(--blue-500);');
  });
});

describe('unsupported values', () => {
  it('emits neither a rule nor a class name for a value the prop does not declare', () => {
    const engine = makeEngine('unsupported-value');

    const classNames = renderStyles(engine, { bgColor: 'not-a-colour' } as never);

    expect(classNames).toEqual(['_b']);
    expect(generatedRulesOf(engine)).toBe('');
  });

  it('keeps every later Box consistent with the first one', () => {
    const engine = makeEngine('unsupported-repeat');

    renderStyles(engine, { bgColor: 'not-a-colour' } as never);
    // Rule generation is memoized by prop/value, so the second Box must reach the same verdict
    // rather than getting a class name whose rule was never emitted.
    const classNames = renderStyles(engine, { bgColor: 'not-a-colour', p: 4 } as never);

    expect(classNames).toEqual(['_b', 'p-4']);
  });

  it('ignores unknown props entirely', () => {
    const engine = makeEngine('unsupported-prop');

    expect(renderStyles(engine, { notAProp: 4 } as never)).toEqual(['_b']);
    expect(generatedRulesOf(engine)).toBe('');
  });
});
