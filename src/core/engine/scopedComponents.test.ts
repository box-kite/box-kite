import { describe, expect, expectTypeOf, it } from 'vitest';
import { makeEngine, renderStyles } from '../../../dev/engineHarness';
import { MergeComponentsAndVariants } from '../../types';
import createComponents from '../extends/componentsRegistry';

// C12: a design that belongs to a subtree. The registry is passed per resolve; nothing is registered globally.
describe('scoped components', () => {
  const pill = createComponents({ card: { styles: { p: 4, borderRadius: 999 } } } as never);
  const square = createComponents({ card: { styles: { p: 2, borderRadius: 0 } } } as never);

  it('resolves one component name to a different class list per registry', () => {
    const engine = makeEngine('scoped-two-designs');
    engine.components({ card: { styles: { p: 8 } } } as never);

    const resolve = (registry?: typeof pill) => engine.resolveClassNames({ component: 'card' } as never, false, registry).classNames;

    expect(resolve(pill)).toEqual(['_b', 'p-4', 'borderRadius-999']);
    expect(resolve(square)).toEqual(['_b', 'p-2', 'borderRadius-0']);
    expect(resolve()).toEqual(['_b', 'p-8']);
  });

  it('keeps the caller’s props over the design', () => {
    const engine = makeEngine('scoped-props-win');

    expect(engine.resolveClassNames({ component: 'card', p: 6 } as never, false, pill).classNames).toEqual([
      '_b',
      'p-6',
      'borderRadius-999',
    ]);
  });

  it('starts from the app’s registrations by default, and follows a later Box.components() call', () => {
    const engine = makeEngine('scoped-global-base');
    const rounded = createComponents({ card: { styles: { borderRadius: 2 } } } as never);
    engine.components({ card: { styles: { m: 4 } } } as never);

    expect(engine.resolveClassNames({ component: 'card' } as never, false, rounded).classNames).toEqual(['_b', 'm-4', 'borderRadius-2']);

    engine.components({ card: { styles: { m: 8 } } } as never);

    expect(engine.resolveClassNames({ component: 'card' } as never, false, rounded).classNames).toEqual(['_b', 'm-8', 'borderRadius-2']);
  });

  it('ignores the app’s registrations on a builtin base, and chains onto another registry', () => {
    const engine = makeEngine('scoped-builtin-base');
    engine.components({ card: { styles: { m: 4 } } } as never);
    const isolated = createComponents({ card: { styles: { p: 4 } } } as never, { base: 'builtin' });
    const chained = createComponents({ card: { styles: { color: 'red-500' } } } as never, { base: isolated });

    expect(engine.resolveClassNames({ component: 'card' } as never, false, isolated).classNames).toEqual(['_b', 'p-4']);
    expect(engine.resolveClassNames({ component: 'card' } as never, false, chained).classNames).toEqual(['_b', 'p-4', 'color-red-500']);
  });

  it('identifies a registry by its content, so one built in render is one cache entry', () => {
    const a = createComponents({ card: { styles: { p: 4 } } } as never);
    const b = createComponents({ card: { styles: { p: 4 } } } as never);

    expect(a.id).toBe(b.id);
    expect(createComponents({ card: { styles: { p: 4 } } } as never, { base: 'builtin' }).id).not.toBe(a.id);
  });

  it('shares one cache entry for a Box that names no component', () => {
    const engine = makeEngine('scoped-no-component');

    expect(engine.resolveClassNames({ p: 4 }, false, pill).signature).toBe(engine.resolveClassNames({ p: 4 }, false).signature);
    expect(engine.resolveClassNames({ component: 'card' } as never, false, pill).signature).not.toBe(
      engine.resolveClassNames({ component: 'card' } as never, false, square).signature,
    );
  });

  it('applies the registry through classNames() too', () => {
    const engine = makeEngine('scoped-class-names');

    expect(engine.classNames({ component: 'card' } as never, { components: square })).toBe('_b p-2 borderRadius-0');
  });
});

// Bug #258: a built-in `extends` was resolved only inside components(), and resolving deleted the key.
describe('extends', () => {
  it('resolves a built-in extends with no Box.components() call', () => {
    const engine = makeEngine('extends-builtin');

    expect(renderStyles(engine, { component: 'gauge' } as never)).toEqual(renderStyles(engine, { component: 'progressRing' } as never));
  });

  it('carries a later override of the base into the component built on it', () => {
    const engine = makeEngine('extends-later-override');
    engine.components({ base: { styles: { p: 4 } }, derived: { extends: 'base', styles: { m: 4 } } } as never);
    engine.components({ base: { styles: { p: 8 } } } as never);

    expect(renderStyles(engine, { component: 'derived' } as never)).toEqual(['_b', 'p-8', 'm-4']);
  });

  it('resolves a chain and survives a cycle', () => {
    const engine = makeEngine('extends-chain');
    engine.components({
      a: { styles: { p: 4 } },
      b: { extends: 'a', styles: { m: 4 } },
      c: { extends: 'b', styles: { color: 'red-500' } },
      x: { extends: 'y', styles: { p: 1 } },
      y: { extends: 'x', styles: { m: 1 } },
    } as never);

    expect(renderStyles(engine, { component: 'c' } as never)).toEqual(['_b', 'p-4', 'm-4', 'color-red-500']);
    expect(renderStyles(engine, { component: 'x' } as never)).toContain('p-1');
  });
});

describe('MergeComponentsAndVariants', () => {
  it('gives a component two designs define both variant sets', () => {
    const _pill = createComponents({ button: { variants: { pill: {} } }, card: { variants: { flat: {} } } });
    const _ghost = createComponents({ button: { variants: { ghost: {} } } });

    type Merged = MergeComponentsAndVariants<[typeof _pill, typeof _ghost]>;

    expectTypeOf<Merged['button']>().toEqualTypeOf<'pill' | 'ghost'>();
    expectTypeOf<Merged['card']>().toEqualTypeOf<'flat'>();
  });
});
