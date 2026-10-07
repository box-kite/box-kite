import { HTMLStyleElement } from 'happy-dom';
import { describe, expect, it } from 'vitest';
import BoxExtends from '../extends/boxExtends';
import { createStyleEngine, StyleEngine, StyleEngineOptions } from './styleEngine';

function makeEngine(styleElementId: string, options: StyleEngineOptions = {}) {
  return createStyleEngine({ classNames: 'readable', sink: 'textContent', styleElementId, ...options });
}

function rulesOf(engine: StyleEngine) {
  const element = document.getElementById(engine.styleElementId) as unknown as HTMLStyleElement | null;

  return element?.innerText ?? '';
}

function renderStyles(engine: StyleEngine, props: Parameters<StyleEngine['resolveClassNames']>[0]) {
  const { classNames } = engine.resolveClassNames(props, false);
  engine.flushSync();

  return classNames;
}

describe('createStyleEngine', () => {
  it('gives each engine its own style element', () => {
    const a = makeEngine('engine-a-element');
    const b = makeEngine('engine-b-element');

    expect(a.styleElementId).toBe('engine-a-element');
    expect(b.styleElementId).toBe('engine-b-element');
    expect(a.styleElementId).not.toBe(b.styleElementId);
  });

  it('names engines uniquely when no element id is given', () => {
    expect(makeEngine('explicit').styleElementId).toBe('explicit');
    expect(createStyleEngine().styleElementId).not.toBe(createStyleEngine().styleElementId);
  });

  it('generates independent stylesheets in the same process', () => {
    const a = makeEngine('engine-independent-a');
    const b = makeEngine('engine-independent-b');

    expect(renderStyles(a, { p: 4 })).toContain('p-4');
    expect(renderStyles(b, { m: 8 })).toContain('m-8');

    // Each engine's rules land in its own element and nowhere else.
    expect(rulesOf(a)).toContain('.p-4{padding:1rem}');
    expect(rulesOf(a)).not.toContain('margin:2rem');
    expect(rulesOf(b)).toContain('.m-8{margin:2rem}');
    expect(rulesOf(b)).not.toContain('padding:1rem');
  });

  it('keeps rule ordering per engine — a busy engine does not shift another engine indexes', () => {
    const a = makeEngine('engine-order-a');
    const b = makeEngine('engine-order-b');

    renderStyles(a, { p: 1, m: 1, bgColor: 'red-500' });
    renderStyles(b, { p: 1 });

    // b only ever saw one rule, so its sheet holds exactly that one dynamic rule.
    expect(rulesOf(b)).toContain('.p-1{padding:0.25rem}');
    expect(rulesOf(b)).not.toContain('.m-1');
  });

  it('isolates clear() to the engine it is called on', () => {
    const a = makeEngine('engine-clear-a');
    const b = makeEngine('engine-clear-b');

    renderStyles(a, { p: 5 });
    renderStyles(b, { p: 6 });

    a.clear();

    // b keeps both its rules and its cached class list; a re-registers on the next render.
    expect(rulesOf(b)).toContain('.p-6{padding:1.5rem}');
    expect(renderStyles(a, { p: 5 })).toContain('p-5');
    expect(rulesOf(a)).toContain('.p-5{padding:1.25rem}');
  });

  it('isolates extend() — an extended prop exists only on the engine that declared it', () => {
    const a = makeEngine('engine-extend-a');
    const b = makeEngine('engine-extend-b');

    a.extend({}, { engineOnlyProp: [{ values: 0, styleName: 'opacity' }] }, {});

    expect(renderStyles(a, { engineOnlyProp: 3 } as never)).toContain('engineOnlyProp-3');
    expect(rulesOf(a)).toContain('.engineOnlyProp-3{opacity:3}');

    // b never learned the prop, so it is not a style key there: no class, no rule.
    expect(renderStyles(b, { engineOnlyProp: 3 } as never)).not.toContain('engineOnlyProp-3');
    expect(rulesOf(b)).not.toContain('opacity:3');
  });

  it('sorts extended props after the built-ins instead of collapsing them to index 0', () => {
    const engine = makeEngine('engine-extend-sort');

    engine.extend({}, { engineSortProp: [{ values: 0, styleName: 'z-index' }] }, {});
    // A built-in prop and an extended one registered in the same pass: the extended rule must
    // come last, matching its declaration order, rather than sorting to the front with index 0.
    renderStyles(engine, { engineSortProp: 5, m: 3 } as never);

    const rules = rulesOf(engine);
    expect(rules).toContain('z-index:5');
    expect(rules.indexOf('.m-3{')).toBeLessThan(rules.indexOf('.engineSortProp-5{'));
  });

  it('isolates components() and leaves the shared defaults untouched', () => {
    const a = makeEngine('engine-components-a');
    const b = makeEngine('engine-components-b');

    a.components({ engineOnlyComponent: { styles: { p: 2 } } });

    expect(a.getComponentsStyles()['engineOnlyComponent']).toBeDefined();
    expect(b.getComponentsStyles()['engineOnlyComponent']).toBeUndefined();
    // The default engine (what `Box.components` writes to) must not see it either.
    expect(BoxExtends.getComponentsStyles()['engineOnlyComponent']).toBeUndefined();
  });

  it('keeps variables per engine', () => {
    const a = makeEngine('engine-vars-a');
    const b = makeEngine('engine-vars-b');

    a.getVariableValue('red-500');
    a.flushSync();
    b.flushSync();

    expect(rulesOf(a)).toContain('--red-500');
    expect(rulesOf(b)).not.toContain('--red-500');
  });

  it('applies configure() only to the engine it is called on', () => {
    const a = makeEngine('engine-configure-a');
    const b = makeEngine('engine-configure-b');

    a.configure({ classNames: 'hashed' });

    expect(renderStyles(a, { p: 9 })).not.toContain('p-9');
    expect(renderStyles(b, { p: 9 })).toContain('p-9');
  });

  // The cache key every render builds before it can look anything up; a collision serves the wrong class list.
  describe('the style signature', () => {
    const signatureOf = (engine: StyleEngine, props: object) => engine.resolveClassNames(props as never, false).signature;

    it('keeps a number and the same digits as a string apart', () => {
      const engine = makeEngine('signature-types');

      expect(signatureOf(engine, { p: 4 })).not.toBe(signatureOf(engine, { p: '4' }));
      expect(signatureOf(engine, { flex1: true })).not.toBe(signatureOf(engine, { flex1: 'true' }));
    });

    it('lets no string value forge the key after it', () => {
      const engine = makeEngine('signature-forgery');
      expect(renderStyles(engine, { content: 'a', color: 'red-500' })).toContain('color-red-500');

      // Each spelling of what a naive encoding would write for `color` after `content`.
      for (const content of ['a";color:"red-500', 'a;color:7"red-500', 'a;color:red-500']) {
        expect(renderStyles(engine, { content })).not.toContain('color-red-500');
      }
    });

    it('ignores what is not a style prop', () => {
      const engine = makeEngine('signature-non-style');

      expect(signatureOf(engine, { p: 4, children: 'one', props: { id: 'a' }, className: 'x' })).toBe(
        signatureOf(engine, { p: 4, children: 'two', props: { id: 'b' }, className: 'y' }),
      );
    });

    it('takes in a prop extend() adds, and every nesting key', () => {
      const engine = makeEngine('signature-extend');
      expect(signatureOf(engine, { signatureProp: 1 })).toBe(signatureOf(engine, { signatureProp: 2 }));

      engine.extend({}, { signatureProp: [{ values: 0, styleName: 'order' }] }, {});

      expect(signatureOf(engine, { signatureProp: 1 })).not.toBe(signatureOf(engine, { signatureProp: 2 }));
      for (const key of ['hover', 'before', 'md', 'motionReduce', 'cq', 'group', 'hoverGroup', 'theme', 'startingStyle', 'dataAttr']) {
        expect(signatureOf(engine, { [key]: { p: 1 } }), key).not.toBe(signatureOf(engine, { [key]: { p: 2 } }));
      }
    });
  });

  /**
   * `transition: all` on every Box is a default, not a law: an engine can name a narrower group or
   * declare nothing at all, which is what a consumer that owns its own transitions wants.
   *
   * The longhands, not the shorthand. A group is a *list* of properties, and `transition: a, b var(--t)`
   * parses as two transitions of which only the last has a duration — so every property but the final one
   * sat at 0s (bug #109). Invisible while the default was the single-item `all`.
   */
  describe('the base transition is configurable', () => {
    it('narrows the base class to one property group', () => {
      const engine = makeEngine('engine-transition-group', { transition: 'colors' });

      renderStyles(engine, { p: 4 });

      expect(rulesOf(engine)).toContain('transition-property: color, background-color');
      expect(rulesOf(engine)).not.toContain('transition-property: all');
    });

    it('declares no transition at all when told to', () => {
      const engine = makeEngine('engine-transition-off', { transition: false });

      renderStyles(engine, { p: 4 });

      expect(rulesOf(engine)).not.toContain('transition:');
    });

    it('rewrites the base block when configured after the first render', () => {
      const engine = makeEngine('engine-transition-late');

      renderStyles(engine, { p: 4 });
      engine.configure({ transition: false });
      renderStyles(engine, { p: 4 });

      const css = rulesOf(engine);
      expect(css).not.toContain('transition:');
      // The rules that were already written come back with it — a reconfigure is a clear().
      expect(css).toContain('.p-4{padding:1rem}');
    });
  });
});
