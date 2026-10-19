import { describe, expect, it } from 'vitest';
import { generatedRulesOf, makeEngine, renderStyles } from '../../../dev/engineHarness';
import Palette from '../palette';

const UNDER = ':is([data-design="ember"],[data-design="ember"] *)';
const NOT_NESTED =
  ':not(:where([data-design="ember"] [data-design]:not([data-design="ember"]),[data-design="ember"] [data-design]:not([data-design="ember"]) *))';

// A design chosen in CSS: `components(styles, { design })` applies under `data-design`, merged over the app's own.
describe('designs', () => {
  it('adds the design’s whole class list, each rule under the design’s selector', () => {
    const engine = makeEngine('design-classes');
    engine.components({ card: { styles: { p: 8, color: 'red-500' } } } as never);
    engine.components({ card: { styles: { p: 4 } } } as never, { design: 'ember' });

    expect(renderStyles(engine, { component: 'card' } as never)).toEqual([
      '_b',
      'p-8',
      'color-red-500',
      'design-ember-p-4',
      'design-ember-color-red-500',
    ]);
    expect(generatedRulesOf(engine)).toContain(`.design-ember-p-4${UNDER}${NOT_NESTED}{padding:1rem}`);
  });

  it('outranks every state of the app’s design by one class, so a themed base value loses to a plain design one', () => {
    const engine = makeEngine('design-specificity');
    engine.components({ card: { styles: { theme: { dark: { bgColor: 'gray-900' } } } } } as never);
    engine.components({ card: { styles: { bgColor: 'white', theme: { dark: { bgColor: 'stone-900' } } } } } as never, { design: 'ember' });

    renderStyles(engine, { component: 'card' } as never);
    const rules = generatedRulesOf(engine);

    expect(rules).toContain(`:scope .design-ember-theme-dark-bgColor-stone-900${UNDER}${NOT_NESTED}`);
  });

  it('keeps the caller’s props on top of the design', () => {
    const engine = makeEngine('design-props');
    engine.components({ card: { styles: { p: 4 } } } as never, { design: 'ember' });

    expect(renderStyles(engine, { component: 'card', p: 2 } as never)).toEqual(['_b', 'p-2']);
  });

  it('costs a component the design leaves alone nothing', () => {
    const engine = makeEngine('design-untouched');
    engine.components({ card: { styles: { p: 8 } }, chip: { styles: { p: 1 } } } as never);
    engine.components({ card: { styles: { p: 4 } } } as never, { design: 'ember' });

    expect(renderStyles(engine, { component: 'chip' } as never)).toEqual(['_b', 'p-1']);
    expect(renderStyles(engine, { p: 3 } as never)).toEqual(['_b', 'p-3']);
  });

  it('follows a later change to the app’s own components', () => {
    const engine = makeEngine('design-follows');
    engine.components({ card: { styles: { p: 4 } } } as never, { design: 'ember' });
    engine.components({ card: { styles: { m: 2 } } } as never);

    expect(renderStyles(engine, { component: 'card' } as never)).toEqual(['_b', 'm-2', 'design-ember-m-2', 'design-ember-p-4']);
  });

  it('refuses a name that cannot be an attribute value', () => {
    const engine = makeEngine('design-name');

    expect(() => engine.components({} as never, { design: 'ember"]' })).toThrow(/not a design name/);
  });
});

// A part extends like a component does, so a design's own dialog can reuse the button's tree.
describe('extends on a part', () => {
  it('merges the named component, or a part of one, under the part’s own styles', () => {
    const engine = makeEngine('extends-part');
    engine.components({
      chip: { styles: { p: 2, color: 'red-500' }, children: { icon: { styles: { m: 1 } } } },
      picker: { children: { trigger: { extends: 'chip', styles: { p: 4 } }, glyph: { extends: 'chip.icon', styles: { p: 1 } } } },
    } as never);

    expect(renderStyles(engine, { component: 'picker.trigger' } as never)).toEqual(['_b', 'p-4', 'color-red-500']);
    expect(renderStyles(engine, { component: 'picker.glyph' } as never)).toEqual(['_b', 'm-1', 'p-1']);
  });

  it('ends a cycle at the part as written', () => {
    const engine = makeEngine('extends-part-cycle');
    engine.components({ a: { children: { b: { extends: 'a.b', styles: { p: 2 } } } } } as never);

    expect(renderStyles(engine, { component: 'a.b' } as never)).toEqual(['_b', 'p-2']);
  });
});

describe('Box.palette', () => {
  it('points an alias at another family, step by step', () => {
    const record = Palette.point({ accent: 'orange' });

    expect(Object.keys(record)).toHaveLength(11);
    expect(record['accent-500']).toBe('orange-500');
  });

  it('takes a ramp of its own, and drops what it cannot point', () => {
    expect(Palette.point({ base: { 50: '#fafaf9', 950: 'stone-950' } })).toEqual({ 'base-50': '#fafaf9', 'base-950': 'stone-950' });
    expect(Palette.point({ accent: 'base' as never, ['brand' as never]: 'red' })).toEqual({});
  });

  it('resolves through `vars`, so a component drawn in the alias follows it', () => {
    const engine = makeEngine('palette-vars');
    renderStyles(engine, { vars: Palette.point({ accent: 'orange' }), bgColor: 'accent-500' } as never);
    const rules = generatedRulesOf(engine);

    expect(rules).toContain('--accent-500:var(--orange-500,oklch(70.5% .213 47.6))');
    expect(rules).toContain('background-color:var(--accent-500,oklch(58.5% .233 277.1))');
  });
});

// The two values a design kept reaching for and the registry did not have.
describe('values a design needs', () => {
  it('takes a gradient back off with none — the only way, since bgGradient wins background-image over bgImage', () => {
    const engine = makeEngine('gradient-none');
    renderStyles(engine, { bgGradient: 'none' } as never);

    expect(generatedRulesOf(engine)).toContain('{background-image:none}');
  });

  it('tracks in em by name, so a heading keeps its tightness at any size', () => {
    const engine = makeEngine('tracking-names');
    renderStyles(engine, { letterSpacing: 'tight' } as never);
    renderStyles(engine, { letterSpacing: 'widest' } as never);
    const rules = generatedRulesOf(engine);

    expect(rules).toContain('{letter-spacing:-0.025em}');
    expect(rules).toContain('{letter-spacing:0.1em}');
  });
});
