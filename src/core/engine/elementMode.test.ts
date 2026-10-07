import { describe, expect, it } from 'vitest';
import { makeEngine } from '../../../dev/engineHarness';
import { createStyleEngine, StyleEngine } from './styleEngine';
import { StyleElementDescriptor } from './styleSink';

/**
 * Element mode: the engine writes nowhere and hands each rule back as a `<style href precedence>`
 * descriptor for the adapter to render. Two things make that safe, and both are pinned here:
 * cascade layers, so the order React happens to insert the elements in cannot change the cascade,
 * and content-hashed names, so a class resolved in one process matches the one another resolves.
 */

/** The `@layer` order statement, which is the first thing in the base element: one name per query rank. */
function layerStatement(css: string): string[] {
  return css.slice(css.indexOf(' ') + 1, css.indexOf(';')).split(',');
}

/** The prop order declared *inside* one rank's layer — the same statement, repeated once per rank. */
function propOrderIn(css: string, rank: string): string[] {
  return new RegExp(`@layer ${rank}\\{@layer ([^;]+);\\}`).exec(css)![1].split(',');
}

/** The layer a rule element was wrapped in, as its rank layer and the prop sub-layer inside it. */
function layerOf(element: StyleElementDescriptor): [string, string] {
  return /^@layer ([^{]+)\{/.exec(element.css)![1].split('.') as [string, string];
}

function elementsOf(engine: StyleEngine, props: Parameters<StyleEngine['resolveClassNames']>[0]) {
  const { classNames, styleElements } = engine.resolveClassNames(props, false);

  return { classNames, base: styleElements![0], rules: styleElements!.slice(1) };
}

describe('element mode', () => {
  it('hands back the base element first, with the reset inside the first layer', () => {
    const { base } = elementsOf(makeEngine('elements-base', { sink: 'element' }), { p: 4 });

    expect(base.precedence).toBe('rb-base');
    expect(base.href).toMatch(/^rb-base-[0-9a-z]+$/);
    expect(base.css.startsWith('@layer rb,')).toBe(true);
    // Unlayered CSS beats every layer, so the reset has to be layered too — otherwise
    // `._b{padding:0}` would win against `.p-4{padding:1rem}`.
    expect(base.css).toContain('@layer rb{:root{');
    expect(base.css).toContain('._b{display: block;');
  });

  it('hands back one element per rule, in cascade order', () => {
    const { rules } = elementsOf(makeEngine('elements-rules', { sink: 'element' }), { px: 2, p: 4 });

    // Layer names are derived from prop declaration order, so they are matched by shape: what the
    // test is about is that `p` comes back before `px`, each in a layer of its own.
    expect(rules[0].css).toMatch(/^@layer rb0\.p\w+\{\.p-4\{padding:1rem\}\}$/);
    expect(rules[1].css).toMatch(/^@layer rb0\.p\w+\{\.px-2\{padding-inline:0\.5rem\}\}$/);
    expect(rules.every((rule) => rule.precedence === 'rb')).toBe(true);
    expect(rules.every((rule) => rule.href.startsWith('rb-'))).toBe(true);
  });

  it('layers a shorthand ahead of the longhand that must override it', () => {
    // `p` and `px` both write padding, and today's cascade resolves them by prop declaration
    // order. A hoisted element cannot rely on its position in `<head>`, so the layer statements are
    // what has to carry that order — for two props in the same rank, the rank's own inner statement.
    const { base, rules } = elementsOf(makeEngine('elements-order', { sink: 'element' }), { px: 2, p: 4 });
    const [shorthand, longhand] = rules.map(layerOf);
    const props = propOrderIn(base.css, shorthand[0]);

    expect(shorthand[0]).toBe(longhand[0]);
    expect(props.indexOf(shorthand[1])).toBeLessThan(props.indexOf(longhand[1]));
  });

  it('layers every breakpoint after every base rule', () => {
    const { base, rules } = elementsOf(makeEngine('elements-breakpoint', { sink: 'element' }), { p: 4, sm: { px: 2 } });
    const layers = layerStatement(base.css);
    const [normal, responsive] = rules;

    expect(responsive.css).toMatch(/^@layer rb1\.p\w+\{@media \(min-width: 640px\)\{\.sm-px-2\{padding-inline:0\.5rem\}\}\}$/);
    // The rank is the outer layer, so a breakpoint outranks every base rule whatever prop it is about.
    expect(layers.indexOf(layerOf(responsive)[0])).toBeGreaterThan(layers.indexOf(layerOf(normal)[0]));
    // The responsive rule sorts after the base one whatever order the two Boxes rendered in.
    expect(responsive.sortKey).toBeGreaterThan(normal.sortKey);
  });

  it('names classes and hrefs from their content, so two processes agree', () => {
    const first = createStyleEngine({ sink: 'element', styleElementId: 'elements-stable-1' });
    const second = createStyleEngine({ sink: 'element', styleElementId: 'elements-stable-2' });

    const a = elementsOf(first, { p: 4 });
    // The second engine resolves a different Box first, so a counter-based name would drift.
    elementsOf(second, { m: 2 });
    const b = elementsOf(second, { p: 4 });

    expect(a.classNames[1]).toMatch(/^_[0-9a-z]+$/);
    expect(b.classNames).toEqual(a.classNames);
    expect(b.rules[0].href).toBe(a.rules[0].href);
    expect(b.rules[0].css).toBe(a.rules[0].css);
    expect(elementsOf(second, { p: 8 }).rules[0].href).not.toBe(a.rules[0].href);
  });

  it('keeps handing back a rule an earlier Box already generated', () => {
    const engine = makeEngine('elements-shared', { sink: 'element' });
    const first = elementsOf(engine, { p: 4 });
    const second = elementsOf(engine, { p: 4, m: 2 });

    // React dedupes by href, so every Box renders every element its classes need — a rule is not
    // consumed by the first Box that happened to need it.
    expect(second.rules.map((rule) => rule.href)).toContain(first.rules[0].href);
  });

  it('re-versions the base element when a variable is resolved later', () => {
    const engine = makeEngine('elements-variables', { sink: 'element' });
    engine.extend({ brand: '#123456' }, {}, {});
    const first = elementsOf(engine, { p: 4 });
    const second = elementsOf(engine, { bgColor: 'brand' } as never);

    expect(second.base.href).not.toBe(first.base.href);
    expect(second.base.css).toContain('--brand');
    expect(first.base.css).not.toContain('--brand');
  });

  it('still returns the whole stylesheet as text, so server rendering keeps working', () => {
    const engine = makeEngine('elements-styles', { sink: 'element' });
    elementsOf(engine, { p: 4 });

    const css = engine.getStyles();

    expect(css).toContain('@layer rb{:root{');
    expect(css).toMatch(/@layer rb0\.p\w+\{\.p-4\{padding:1rem\}\}/);
  });

  it('hands back global styles as elements too', () => {
    const engine = makeEngine('elements-global', { sink: 'element' });
    const elements = engine.addGlobalStyles({ p: 4 }, 'html')!;

    expect(elements[0].precedence).toBe('rb-base');
    expect(elements[1].css).toMatch(/^@layer rb0\.p\w+\{html\{padding:1rem\}\}$/);
  });

  it('starts over after clear(), the way a server does between requests', () => {
    const engine = makeEngine('elements-clear', { sink: 'element' });
    const first = elementsOf(engine, { p: 4 });

    engine.clear();

    const second = elementsOf(engine, { p: 4 });

    // Content-addressed, so the same props come back identical — but everything was regenerated:
    // request two gets its own base element and its own rule elements, not leftovers.
    expect(second.rules.map((rule) => rule.href)).toEqual(first.rules.map((rule) => rule.href));
    expect(second.base.href).toBe(first.base.href);
    expect(engine.getStyles()).toMatch(/@layer rb0\.p\w+\{\.p-4\{padding:1rem\}\}/);
  });

  it('produces no elements — and no layers — in every other mode', () => {
    const engine = makeEngine('elements-off');
    const { styleElements } = engine.resolveClassNames({ p: 4 }, false);

    expect(styleElements).toBeUndefined();
    expect(engine.addGlobalStyles({ p: 4 }, 'html')).toBeUndefined();
    engine.flushSync();
    expect(engine.getStyles()).toContain('.p-4{padding:1rem}');
    expect(engine.getStyles()).not.toContain('@layer');
  });
});
