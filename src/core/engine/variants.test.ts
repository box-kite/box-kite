import { describe, expect, it } from 'vitest';
import { makeEngine, renderStyles, ruleList } from '../../../dev/engineHarness';
import { StyleEngine } from './styleEngine';

/**
 * The fourth kind of nesting: a selector fragment on the element's *own* compound selector. Unlike a
 * theme or a group it puts nothing in front of the class, and unlike `startingStyle` it wraps nothing
 * around the rule — which is why everything else composes with it in either direction.
 */
describe('attribute and relational variants', () => {
  it('hangs a data attribute off the element that carries it', () => {
    const engine = makeEngine('variants-data');

    const classNames = renderStyles(engine, { dataAttr: { 'state=open': { color: 'red-500' }, loading: { opacity: 0.5 } } });

    expect(classNames).toEqual(['_b', 'dataAttr-state=open-color-red-500', 'dataAttr-loading-opacity-0.5']);
    expect(ruleList(engine)).toEqual([
      '.dataAttr-loading-opacity-0\\.5[data-loading]{opacity:0.5}',
      '.dataAttr-state\\=open-color-red-500[data-state="open"]{color:var(--red-500)}',
    ]);
  });

  it('writes aria, :has() and :not() onto the same compound selector', () => {
    const engine = makeEngine('variants-aria-has-not');

    renderStyles(engine, { ariaAttr: { selected: { bgColor: 'sky-500' } }, has: { ':checked': { b: 1 } }, not: { hover: { opacity: 1 } } });

    expect(ruleList(engine)).toEqual([
      '.has-\\:checked-b-1:has(:checked){border-width:1px}',
      '.not-hover-opacity-1:not(:hover){opacity:1}',
      '.ariaAttr-selected-bgColor-sky-500[aria-selected="true"]{background-color:var(--sky-500)}',
    ]);
  });

  it('needs no cascade rank of its own: the extra compound outranks the plain class', () => {
    const engine = makeEngine('variants-specificity');

    // `.a[data-state="open"]` is 0,2,0 against `.b`'s 0,1,0, so the variant wins wherever both apply —
    // which is what lets a variant rule share a cascade layer with the base rule it overrides.
    renderStyles(engine, { color: 'slate-500', dataAttr: { 'state=open': { color: 'red-500' } } });

    expect(ruleList(engine)).toEqual([
      '.color-slate-500{color:var(--slate-500)}',
      '.dataAttr-state\\=open-color-red-500[data-state="open"]{color:var(--red-500)}',
    ]);
  });

  it('takes a pseudo-class and a breakpoint in either direction', () => {
    const engine = makeEngine('variants-nesting');

    renderStyles(engine, { md: { dataAttr: { 'state=open': { hover: { color: 'red-500' } } } } });
    renderStyles(engine, { md: { hover: { dataAttr: { 'state=open': { bgColor: 'red-500' } } } } });

    // The media query wraps, the pseudo-class and the attribute join the compound selector, and the
    // class name is built from the set rather than the order the props were written in.
    expect(ruleList(engine)).toEqual([
      '@media (min-width: 768px){.md-hover-dataAttr-state\\=open-color-red-500[data-state="open"]:hover{color:var(--red-500)}}',
      '@media (min-width: 768px){.md-hover-dataAttr-state\\=open-bgColor-red-500[data-state="open"]:hover{background-color:var(--red-500)}}',
    ]);
  });

  it('resolves two variants to one class whichever order they were written in', () => {
    const engine = makeEngine('variants-order');

    const first = renderStyles(engine, { dataAttr: { 'state=open': { not: { hover: { opacity: 1 } } } } });
    const second = renderStyles(engine, { not: { hover: { dataAttr: { 'state=open': { opacity: 1 } } } } });

    expect(first).toEqual(second);
    expect(ruleList(engine)).toEqual(['.dataAttr-state\\=open-not-hover-opacity-1[data-state="open"]:not(:hover){opacity:1}']);
  });

  it('starts an entrance from a variant, with the block still outermost', () => {
    const engine = makeEngine('variants-starting');

    renderStyles(engine, { dataAttr: { 'state=open': { startingStyle: { opacity: 0 } } } });

    expect(ruleList(engine)).toEqual([
      '@starting-style{.starting-dataAttr-state\\=open-opacity-0[data-state="open"]{opacity:0!important}}',
    ]);
  });

  it('lands on the styled element, not the theme or group ancestor in front of it', () => {
    const engine = makeEngine('variants-ancestors');

    renderStyles(engine, {
      theme: { dark: { dataAttr: { 'state=open': { color: 'red-500' } } } },
      hoverGroup: { card: { dataAttr: { on: { opacity: 1 } } } },
    });

    expect(ruleList(engine)).toEqual([
      '.card:hover .dataAttr-on-hover-card-opacity-1[data-on]{opacity:1}',
      '@scope (.dark) to ([data-theme]){:scope .dataAttr-state\\=open-theme-dark-color-red-500[data-state="open"]{color:var(--red-500)}}',
    ]);
  });

  it('drops a key the grammar rejects whole — no rule and no class name', () => {
    const engine = makeEngine('variants-invalid');

    // The same failure mode as a prop value nothing matches: a typo is invisible rather than a broken
    // selector, and nothing is left carrying a class with no rule behind it.
    const classNames = renderStyles(engine, {
      dataAttr: { 'bad name': { color: 'red-500' } },
      has: { 'a{color:red}': { opacity: 0 } },
      not: { nonsense: { opacity: 0 } },
    } as never);

    expect(classNames).toEqual(['_b']);
    expect(ruleList(engine)).toEqual([]);
  });

  it('shares a cascade layer with the rule it overrides, in element mode', () => {
    const engine: StyleEngine = makeEngine('variants-element-mode', { sink: 'element' });

    const { styleElements } = engine.resolveClassNames({ color: 'slate-500', dataAttr: { 'state=open': { color: 'red-500' } } }, false);
    const layers = styleElements!.slice(1).map((element) => /^@layer ([^{]+)\{/.exec(element.css)![1]);

    // A variant gets no layer of its own on purpose: it is the same property in the same media rank,
    // so the extra compound in the selector is what settles it — element order stays irrelevant.
    expect(layers[0]).toBe(layers[1]);
  });

  it('shares one rule between every Box asking for the same variant', () => {
    const engine = makeEngine('variants-dedupe');

    renderStyles(engine, { dataAttr: { 'state=open': { opacity: 1 } }, color: 'red-500' });
    renderStyles(engine, { dataAttr: { 'state=open': { opacity: 1 } }, color: 'sky-500' });

    expect(ruleList(engine).filter((rule) => rule.includes('[data-state'))).toEqual([
      '.dataAttr-state\\=open-opacity-1[data-state="open"]{opacity:1}',
    ]);
  });
});
