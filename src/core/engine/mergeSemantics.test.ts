import { describe, expect, it } from 'vitest';
import { generatedRulesOf, makeEngine, renderStyles, rulesOf } from '../../../dev/engineHarness';
import defaultBoxComponents, { Components } from '../extends/boxComponents';

/**
 * `Box.extend()` and `Box.components()` are the two calls a consuming app makes at startup, often
 * more than once — one call per feature module. What a second call does to the first one's
 * registrations was never specified; these tests fix the answer at "accumulate".
 */
describe('Box.components() accumulates', () => {
  it('keeps components registered by an earlier call', () => {
    const engine = makeEngine('merge-components-accumulate');

    engine.components({ alpha: { styles: { p: 4 } } });
    engine.components({ beta: { styles: { m: 4 } } });

    expect(engine.getComponentsStyles()['alpha']?.styles).toEqual({ p: 4 });
    expect(engine.getComponentsStyles()['beta']?.styles).toEqual({ m: 4 });
  });

  it('lets a later call override styles of a component it already holds', () => {
    const engine = makeEngine('merge-components-override');

    engine.components({ gamma: { styles: { p: 4, m: 4 } } });
    engine.components({ gamma: { styles: { p: 8 } } });

    expect(engine.getComponentsStyles()['gamma']?.styles).toEqual({ p: 8, m: 4 });
  });

  it('lets a later call extend a component the earlier call registered', () => {
    const engine = makeEngine('merge-components-extend');

    engine.components({ base: { styles: { p: 4, bgColor: 'red-500' } } });
    engine.components({ derived: { extends: 'base', styles: { p: 8 } } });

    expect(engine.getComponentsStyles()['derived']?.styles).toEqual({ p: 8, bgColor: 'red-500' });
  });

  it('keeps the built-in defaults available and unmodified', () => {
    const engine = makeEngine('merge-components-defaults');

    engine.components({ delta: { styles: { p: 4 } } });

    expect(engine.getComponentsStyles()['datagrid']).toBeDefined();
    expect((defaultBoxComponents as Components)['delta']).toBeUndefined();
  });

  it('applies an accumulated component to a rendered Box', () => {
    const engine = makeEngine('merge-components-render');

    engine.components({ first: { styles: { p: 4 } } });
    engine.components({ second: { styles: { m: 4 } } });

    expect(renderStyles(engine, { component: 'first' } as never)).toEqual(['_b', 'p-4']);
    expect(renderStyles(engine, { component: 'second' } as never)).toEqual(['_b', 'm-4']);
  });

  it('invalidates the class cache so a Box rendered before the call picks the defaults up', () => {
    const engine = makeEngine('merge-components-cache');

    expect(renderStyles(engine, { component: 'late' } as never)).toEqual(['_b']);

    engine.components({ late: { styles: { p: 4 } } });

    expect(renderStyles(engine, { component: 'late' } as never)).toEqual(['_b', 'p-4']);
  });
});

describe('Box.extend() accumulates variables', () => {
  it('keeps variables declared by an earlier call', () => {
    const engine = makeEngine('merge-vars-accumulate');

    engine.extend({ 'brand-one': '#111111' }, {}, {});
    engine.extend({ 'brand-two': '#222222' }, {}, {});

    renderStyles(engine, { bgColor: 'brand-one', color: 'brand-two' } as never);

    const rules = rulesOf(engine);
    expect(rules).toContain('--brand-one: #111111;');
    expect(rules).toContain('--brand-two: #222222;');
  });

  it('lets a later call redefine a variable', () => {
    const engine = makeEngine('merge-vars-override');

    engine.extend({ brand: '#111111' }, {}, {});
    engine.extend({ brand: '#222222' }, {}, {});

    renderStyles(engine, { bgColor: 'brand' } as never);

    expect(rulesOf(engine)).toContain('--brand: #222222;');
  });

  it('declares each variable in :root exactly once', () => {
    const engine = makeEngine('merge-vars-once');

    engine.extend({ brand: '#111111' }, {}, {});
    renderStyles(engine, { bgColor: 'brand' } as never);
    renderStyles(engine, { color: 'brand' } as never);

    expect(rulesOf(engine).split('--brand:')).toHaveLength(2);
  });
});

describe('a variable declared through extend() is a usable value', () => {
  it('works on the colour props without declaring an extended prop type', () => {
    const engine = makeEngine('merge-vars-colour');

    engine.extend({ 'brand-primary': '#ff6600' }, {}, {});

    expect(renderStyles(engine, { bgColor: 'brand-primary' } as never)).toEqual(['_b', 'bgColor-brand-primary']);
    expect(generatedRulesOf(engine)).toContain('.bgColor-brand-primary{background-color:var(--brand-primary)}');
    expect(rulesOf(engine)).toContain('--brand-primary: #ff6600;');
  });

  it('works on every prop whose values resolve through a variable', () => {
    const engine = makeEngine('merge-vars-props');

    engine.extend({ token: '#abcdef' }, {}, {});
    renderStyles(engine, { color: 'token', borderColor: 'token', shadow: 'token', bgImage: 'token' } as never);

    const rules = generatedRulesOf(engine);
    expect(rules).toContain('.color-token{color:var(--token)}');
    expect(rules).toContain('.borderColor-token{border-color:var(--token)}');
    // A shadow is a layer now, so a variable lands in the layer's own property and the composed
    // declaration reads it alongside the other three.
    expect(rules).toContain('.shadow-token{--boxShadow:var(--token);box-shadow:var(--boxInsetShadow,');
    expect(rules).toContain('.bgImage-token{background-image:var(--token)}');
  });

  it('does not accept a variable on a prop with a closed value list', () => {
    const engine = makeEngine('merge-vars-closed');

    engine.extend({ token: '#abcdef' }, {}, {});

    expect(renderStyles(engine, { display: 'token' } as never)).toEqual(['_b']);
    expect(generatedRulesOf(engine)).toBe('');
  });

  it('turns a value that matched nothing into a supported one once it is declared', () => {
    const engine = makeEngine('merge-vars-retry');

    // Rule generation is memoized per prop/value, so a value rejected before the variable existed
    // has to be reconsidered after extend() rather than staying rejected for the process lifetime.
    expect(renderStyles(engine, { bgColor: 'late-token' } as never)).toEqual(['_b']);

    engine.extend({ 'late-token': '#123456' }, {}, {});

    expect(renderStyles(engine, { bgColor: 'late-token' } as never)).toEqual(['_b', 'bgColor-late-token']);
    expect(generatedRulesOf(engine)).toContain('.bgColor-late-token{background-color:var(--late-token)}');
  });

  it('still supports the explicit extended-prop-type form the docs show', () => {
    const engine = makeEngine('merge-vars-explicit');

    engine.extend(
      { 'brand-explicit': '#00ff00' },
      {},
      {
        bgColor: [
          {
            values: ['brand-explicit'] as const,
            styleName: 'background-color',
            valueFormat: (value: string, getVariableValue: (name: string) => string) => getVariableValue(value),
          },
        ],
      },
    );

    renderStyles(engine, { bgColor: 'brand-explicit' } as never);
    expect(generatedRulesOf(engine)).toContain('.bgColor-brand-explicit{background-color:var(--brand-explicit)}');
  });
});

describe('Box.extend() accumulates props', () => {
  it('keeps props added by an earlier call', () => {
    const engine = makeEngine('merge-props-accumulate');

    engine.extend({}, { propOne: [{ values: 0, styleName: 'z-index' }] }, {});
    engine.extend({}, { propTwo: [{ values: 0, styleName: 'flex-basis' }] }, {});

    renderStyles(engine, { propOne: 1, propTwo: 2 } as never);

    const rules = generatedRulesOf(engine);
    expect(rules).toContain('z-index:1');
    expect(rules).toContain('flex-basis:2');
  });

  it('adds values to an existing prop ahead of the built-in definitions', () => {
    const engine = makeEngine('merge-props-values');

    engine.extend({}, {}, { display: [{ values: ['ruby'] as const, styleName: 'display' }] });

    renderStyles(engine, { display: 'ruby' } as never);
    expect(generatedRulesOf(engine)).toContain('.display-ruby{display:ruby}');

    // The built-in values keep working.
    renderStyles(engine, { display: 'flex' });
    expect(generatedRulesOf(engine)).toContain('.display-flex{display:flex}');
  });

  it('invalidates the class cache so a Box rendered before the call picks the prop up', () => {
    const engine = makeEngine('merge-props-cache');

    expect(renderStyles(engine, { lateProp: 3 } as never)).toEqual(['_b']);

    engine.extend({}, { lateProp: [{ values: 0, styleName: 'opacity' }] }, {});

    expect(renderStyles(engine, { lateProp: 3 } as never)).toEqual(['_b', 'lateProp-3']);
  });
});

// Bug #259: a theme rule outranks a plain class, so a component's `theme.dark` value beat the caller's prop.
describe('a caller’s prop holds in every theme', () => {
  const card = {
    styles: {
      bgColor: 'indigo-600',
      color: 'white',
      hover: { bgColor: 'indigo-700', theme: { dark: { bgColor: 'indigo-400' } } },
      vars: { accent: 'indigo-500', ring: 'indigo-300' },
      theme: { dark: { bgColor: 'indigo-500', color: 'slate-100', hover: { bgColor: 'indigo-400' }, vars: { accent: 'indigo-300' } } },
    },
  };

  function resolve(id: string, props: Record<string, unknown>) {
    const engine = makeEngine(id);
    engine.components({ themedCard: card } as never);

    return renderStyles(engine, { component: 'themedCard', ...props } as never);
  }

  it('drops the component’s themed value for a prop the caller set at the top level', () => {
    const classNames = resolve('merge-theme-top', { bgColor: 'red-500' });

    expect(classNames).toContain('bgColor-red-500');
    expect(classNames).not.toContain('theme-dark-bgColor-indigo-500');
    // What the caller did not mention keeps its dark value, and so does every state.
    expect(classNames).toContain('theme-dark-color-slate-100');
    expect(classNames).toContain('hover-theme-dark-bgColor-indigo-400');
  });

  it('works at a pseudo-class level, leaving the plain level alone', () => {
    const classNames = resolve('merge-theme-hover', { hover: { bgColor: 'red-700' } });

    expect(classNames).toContain('hover-bgColor-red-700');
    // theme.dark.hover and hover.theme.dark are one rule, and both are the caller's now.
    expect(classNames).not.toContain('hover-theme-dark-bgColor-indigo-400');
    expect(classNames).toContain('theme-dark-bgColor-indigo-500');
  });

  it('keeps a themed value the caller writes, and leaves the component alone when the caller says nothing', () => {
    expect(resolve('merge-theme-own', { bgColor: 'red-500', theme: { dark: { bgColor: 'red-900' } } })).toContain(
      'theme-dark-bgColor-red-900',
    );
    expect(resolve('merge-theme-none', {})).toContain('theme-dark-bgColor-indigo-500');
  });

  it('replaces a record prop entry by entry', () => {
    const classNames = resolve('merge-theme-vars', { vars: { accent: 'red-500' } }).join(' ');

    expect(classNames).not.toMatch(/theme-dark-vars[^ ]*accent/);
  });

  it('reads a pseudo2 boolean as the attribute it is, not as styles', () => {
    const engine = makeEngine('merge-theme-pseudo2');
    engine.components({ toggle: { styles: { theme: { dark: { disabled: { opacity: 0.5 } } } } } } as never);

    expect(renderStyles(engine, { component: 'toggle', disabled: true } as never).join(' ')).toMatch(/disabled-theme-dark-opacity/);
  });
});
