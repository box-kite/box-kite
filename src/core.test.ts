import { describe, expect, it } from 'vitest';
import { generatedRulesIn, ruleListIn } from '../dev/engineHarness';
import { BoxStyleProps, createStyleEngine, createThemeController, defaultThemeName, getSystemTheme, StyleEngine } from './core';

/**
 * The `@box-kite/core` entry, used the way the docs and `examples/vanilla` use it: an
 * engine, a class name, a DOM element. No React is imported in this file — if the engine ever
 * needs it again, this suite is where it shows up as a failure rather than as a subtle regression.
 */

/** An engine with readable class names and a text sink, so rules can be asserted verbatim. */
function makeEngine(styleElementId: string) {
  return createStyleEngine({ classNames: 'readable', sink: 'textContent', styleElementId });
}

/** The vanilla usage: an element in the document whose class list came from Box props. */
function render(engine: StyleEngine, props: BoxStyleProps) {
  const element = document.createElement('div');
  element.className = engine.classNames(props);
  document.body.append(element);
  engine.flushSync();

  return element;
}

/**
 * Props registered at runtime — a new prop from `extend()`, a name from `components()` — carry no
 * static type until a consumer augments the module, which is a build-time step a vanilla app has
 * no reason to take. The values are still checked where it counts: by the rules they generate.
 */
function runtimeProps(props: Record<string, unknown>): BoxStyleProps {
  return props as BoxStyleProps;
}

describe('core entry', () => {
  it('turns props into a class attribute and the CSS behind it', () => {
    const engine = makeEngine('core-basic');

    const element = render(engine, { p: 4, bgColor: 'red-500' });

    expect(element.className).toBe('_b p-4 bgColor-red-500');
    expect(ruleListIn(engine.getStyles())).toEqual(['.p-4{padding:1rem}', '.bgColor-red-500{background-color:var(--red-500)}']);
  });

  it('resolves pseudo-classes, breakpoints and themes through the same call', () => {
    const engine = makeEngine('core-groups');

    const element = render(engine, { hover: { p: 4 }, md: { p: 8 }, theme: { dark: { color: 'white' } } });

    expect(element.className).toBe('_b hover-p-4 md-p-8 theme-dark-color-white');
    expect(ruleListIn(engine.getStyles())).toEqual([
      '.hover-p-4:hover{padding:1rem}',
      '@scope (.dark) to ([data-theme]){:scope .theme-dark-color-white{color:var(--white)}}',
      '@media (min-width: 768px){.md-p-8{padding:2rem}}',
    ]);
  });

  it('reuses one class and one rule across elements', () => {
    const engine = makeEngine('core-dedupe');

    const first = render(engine, { p: 4 });
    const second = render(engine, { p: 4 });

    expect(second.className).toBe(first.className);
    expect(ruleListIn(engine.getStyles())).toEqual(['.p-4{padding:1rem}']);
  });

  it('takes custom variables and props through extend()', () => {
    const engine = makeEngine('core-extend');

    engine.extend(
      { brand: '#6d28d9' },
      { elevation: [{ styleName: 'box-shadow', values: ['flat'] as const, valueFormat: () => 'none' }] },
      { bgColor: [{ styleName: 'background-color', values: ['brand'] as const, valueFormat: (value, get) => get(value) }] },
    );

    const element = render(engine, runtimeProps({ bgColor: 'brand', elevation: 'flat' }));

    expect(element.className).toBe('_b bgColor-brand elevation-flat');
    expect(engine.getStyles()).toContain('--brand: #6d28d9;');
    expect(ruleListIn(engine.getStyles())).toEqual(['.bgColor-brand{background-color:var(--brand)}', '.elevation-flat{box-shadow:none}']);
  });

  it('takes component defaults and variants through components()', () => {
    const engine = makeEngine('core-components');

    engine.components({
      panel: {
        styles: { p: 4 },
        variants: { accent: { b: 2 } },
      },
    });

    const element = render(engine, runtimeProps({ component: 'panel', variant: 'accent' }));

    // The component's own styles first, then the variant's — so a variant can override a default.
    expect(element.className).toBe('_b p-4 b-2');
  });

  it('keeps two engines independent', () => {
    const one = makeEngine('core-isolated-one');
    const two = makeEngine('core-isolated-two');

    one.extend({}, { elevation: [{ styleName: 'box-shadow', values: ['flat'] as const, valueFormat: () => 'none' }] }, {});

    render(one, runtimeProps({ p: 4, elevation: 'flat' }));
    render(two, { m: 2 });

    expect(ruleListIn(one.getStyles())).toEqual(['.p-4{padding:1rem}', '.elevation-flat{box-shadow:none}']);
    expect(ruleListIn(two.getStyles())).toEqual(['.m-2{margin:0.5rem}']);
  });

  it('writes to a real stylesheet with no configuration at all', () => {
    // What a browser gets by default: no options, so the sink follows the environment (cssom) and
    // class names are hashed. Nothing here flushes — the engine schedules that for itself.
    const engine = createStyleEngine();

    const element = document.createElement('div');
    element.className = engine.classNames({ p: 4 });

    expect(element.className).not.toContain('undefined');
    expect(element.className.split(' ')).toHaveLength(2);
    expect(engine.getStyles()).toContain('padding: 1rem');
  });

  it('resolves svg class names on request', () => {
    const engine = makeEngine('core-svg');

    expect(engine.classNames({ p: 4 }, { svg: true }).split(' ')[0]).toBe('_s');
    expect(engine.classNames({ p: 4 }).split(' ')[0]).toBe('_b');
  });

  it('refuses to hand back class names whose CSS goes nowhere', () => {
    // Element mode writes to no sink: the rules come back as descriptors for an adapter to render.
    // A vanilla caller ignoring them would get correct class names and no styles at all.
    const engine = createStyleEngine({ sink: 'element', styleElementId: 'core-element-mode' });

    expect(() => engine.classNames({ p: 4 })).toThrow(/element mode/);
    expect(engine.resolveClassNames({ p: 4 }, false).styleElements).toBeDefined();
  });

  it('ships no empty :root block when nothing used a variable', () => {
    const withVariable = makeEngine('core-root-vars');
    const without = makeEngine('core-root-bare');

    render(withVariable, { bgColor: 'red-500' });
    render(without, { p: 4 });

    expect(withVariable.getStyles()).toContain(':root{--red-500:');
    expect(without.getStyles()).not.toContain(':root{}');
  });

  it('serves static CSS and resets between runs', () => {
    const engine = makeEngine('core-static');

    render(engine, { p: 4 });
    expect(generatedRulesIn(engine.getStyles())).toContain('.p-4{padding:1rem}');

    engine.clear();
    expect(generatedRulesIn(engine.getStyles())).toBe('');
  });

  it('exposes the theme runtime that theme props expect', () => {
    const controller = createThemeController({ target: null, theme: 'dark' });

    expect(controller.theme).toBe('dark');
    expect(typeof getSystemTheme()).toBe('string');
    expect(defaultThemeName).toBe('light');

    controller.destroy();
  });
});
