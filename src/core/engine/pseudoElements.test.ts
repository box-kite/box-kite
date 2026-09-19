import { describe, expect, it } from 'vitest';
import { generatedRulesOf, makeEngine, renderStyles } from '../../../dev/engineHarness';
import { BoxStyleProps } from '../../types';
import { pseudoClasses, pseudoClassesOfWeight, pseudoClassesWeight, pseudoElements } from '../boxStyles';

/**
 * How a nested pseudo-element becomes a compound selector. CSS holds at most one and requires it last;
 * mixed into the pseudo-class list they were assembled in declaration order, so `checked: { before: … }`
 * came out as the invalid `::before:checked` and the browser dropped the whole rule — class on the
 * element, rule in the stylesheet, and the switch's thumb did not move. Note the two shapes below: at the
 * top level a `pseudo2` key is `boolean | [state, styles]`, in a component style a plain object.
 */
describe('a pseudo-element in a compound selector', () => {
  it('goes last when it is nested inside a pseudo-class declared before it', () => {
    const engine = makeEngine('pseudo-checked-before');

    renderStyles(engine, { checked: [false, { before: { translateX: 4 } }] });

    expect(generatedRulesOf(engine)).toContain(
      ':checked::before{--boxTranslateX:1rem;translate:var(--boxTranslateX, 0) var(--boxTranslateY, 0)}',
    );
  });

  it('does the same for a component style, where the nesting is a plain object', () => {
    const engine = makeEngine('pseudo-component-shape');

    // The shape `Box.components({ switch: { styles: { checked: { before: … } } } })` produces.
    renderStyles(engine, { checked: { before: { translateX: 4 } } } as unknown as BoxStyleProps);

    expect(generatedRulesOf(engine)).toContain(
      ':checked::before{--boxTranslateX:1rem;translate:var(--boxTranslateX, 0) var(--boxTranslateY, 0)}',
    );
  });

  it('leaves the order alone when the pseudo-class is already declared first', () => {
    const engine = makeEngine('pseudo-hover-before');

    renderStyles(engine, { hover: { before: { translateX: 2 } } });

    expect(generatedRulesOf(engine)).toContain(
      ':hover::before{--boxTranslateX:0.5rem;translate:var(--boxTranslateX, 0) var(--boxTranslateY, 0)}',
    );
  });

  it.each([
    ['checked', ':checked::before'],
    ['indeterminate', ':indeterminate::before'],
    ['required', ':required::before'],
    ['disabled', '[disabled]::before'],
    ['selected', '[aria-selected="true"]::before'],
  ])('orders ::before after :%s, every one of which is declared after the element', (key, expected) => {
    const engine = makeEngine(`pseudo-order-${key}`);

    renderStyles(engine, { [key]: [false, { before: { opacity: 0.5 } }] } as BoxStyleProps);

    expect(generatedRulesOf(engine)).toContain(`${expected}{opacity:0.5}`);
  });

  it('keeps every pseudo-class in the selector, in their declared order, with the element after them', () => {
    const engine = makeEngine('pseudo-many');

    renderStyles(engine, { hover: { checked: { before: { opacity: 0.5 } } } });

    expect(generatedRulesOf(engine)).toContain(':hover:checked::before{opacity:0.5}');
  });

  it('orders a themed nesting the same way — the theme is an ancestor, the element still last', () => {
    const engine = makeEngine('pseudo-theme');

    renderStyles(engine, { theme: { dark: { checked: { before: { opacity: 0.5 } } } } });

    const rules = generatedRulesOf(engine);

    expect(rules).toContain(
      '@scope (.dark) to ([data-theme]){:scope .checked-before-theme-dark-opacity-0\\.5:checked::before{opacity:0.5}}',
    );
    expect(rules).not.toContain('::before:checked');
  });

  /**
   * A group's pseudo-classes belong to the *ancestor*, so appending the element with them produced
   * `.card:hover::before .x` — a descendant of a pseudo-element, which matches nothing at all. The
   * element belongs on the target, after its variants.
   */
  it('puts the element on the target rather than on the group whose state it hangs off', () => {
    const engine = makeEngine('pseudo-group');

    renderStyles(engine, { hoverGroup: { card: { after: { opacity: 0.5 } } } });

    const rules = generatedRulesOf(engine);

    expect(rules).toContain('.card:hover .after-hover-card-opacity-0\\.5::after{opacity:0.5}');
    expect(rules).not.toContain(':hover::after .');
  });

  it('does the same when a theme and a group are both in front of it', () => {
    const engine = makeEngine('pseudo-theme-group');

    renderStyles(engine, { theme: { dark: { hoverGroup: { card: { after: { opacity: 0.5 } } } } } });

    expect(generatedRulesOf(engine)).toContain(
      '@scope (.dark) to ([data-theme]){:scope .card:hover .after-theme-dark-hover-card-opacity-0\\.5::after{opacity:0.5}}',
    );
  });

  it('sits after a variant on the same element, in both nesting directions', () => {
    const engine = makeEngine('pseudo-variants');

    renderStyles(engine, {
      dataAttr: { 'state=open': { before: { opacity: 1 } } },
      after: { ariaAttr: { selected: { opacity: 0.5 } } },
    });

    const rules = generatedRulesOf(engine);

    expect(rules).toContain('[data-state="open"]::before{opacity:1}');
    expect(rules).toContain('[aria-selected="true"]::after{opacity:0.5}');
  });

  it('nests inside a breakpoint and inside `startingStyle`', () => {
    const engine = makeEngine('pseudo-media-starting');

    renderStyles(engine, { md: { before: { opacity: 1 } }, after: { startingStyle: { opacity: 0 } } });

    const rules = generatedRulesOf(engine);

    expect(rules).toContain('@media (min-width: 768px){.md-before-opacity-1::before{opacity:1}}');
    expect(rules).toContain('@starting-style{.starting-after-opacity-0::after{opacity:0!important}}');
  });

  it.each([
    ['after', '::after'],
    ['placeholder', '::placeholder'],
    ['selection', '::selection'],
    ['marker', '::marker'],
    ['firstLine', '::first-line'],
    ['firstLetter', '::first-letter'],
    ['backdrop', '::backdrop'],
    ['fileButton', '::file-selector-button'],
    // The name `placeholder` had before C2, kept working because it was published.
    ['placeholderStyles', '::placeholder'],
  ])('writes %s as %s', (key, expected) => {
    const engine = makeEngine(`pseudo-element-${key}`);

    renderStyles(engine, { [key]: { color: 'red-500' } } as BoxStyleProps);

    expect(generatedRulesOf(engine)).toContain(`${expected}{color:var(--red-500)}`);
  });

  /**
   * `::marker` belongs to the list *item* and `::selection` to whatever holds the text, but the prop is
   * written on the `<Ul>` or the `<P>`: a rule naming only the element itself styled no marker at all,
   * measured in Chrome. Both selectors, the way Tailwind's `marker:`/`selection:` variants emit them.
   */
  it.each([
    ['marker', '::marker'],
    ['selection', '::selection'],
  ])('names the descendants too for %s, which belongs to one', (key, element) => {
    const engine = makeEngine(`pseudo-descendants-${key}`);

    renderStyles(engine, { [key]: { color: 'red-500' } } as BoxStyleProps);

    expect(generatedRulesOf(engine)).toContain(`.${key}-color-red-500 *${element},.${key}-color-red-500${element}{color:var(--red-500)}`);
  });

  it('keeps the ancestor out of the descendant form, so a group still means the group', () => {
    const engine = makeEngine('pseudo-descendants-group');

    renderStyles(engine, { hoverGroup: { card: { marker: { color: 'red-500' } } } });

    expect(generatedRulesOf(engine)).toContain(
      '.card:hover .marker-hover-card-color-red-500 *::marker,.card:hover .marker-hover-card-color-red-500::marker{color:var(--red-500)}',
    );
  });

  it('leaves the other seven naming only the element itself', () => {
    const engine = makeEngine('pseudo-no-descendants');

    renderStyles(engine, { before: { opacity: 1 }, placeholder: { color: 'red-500' } });

    expect(generatedRulesOf(engine)).not.toContain(' *::before');
    expect(generatedRulesOf(engine)).not.toContain(' *::placeholder');
  });

  it('drops a second pseudo-element rather than emitting one that matches nothing', () => {
    const engine = makeEngine('pseudo-two-elements');

    // A type error; the guard is for a merged component style and for JavaScript callers.
    renderStyles(engine, { before: { after: { opacity: 0.5 } } } as unknown as BoxStyleProps);

    const rules = generatedRulesOf(engine);

    expect(rules).not.toContain('::before::after');
    expect(rules).not.toContain('opacity:0.5');
  });

  it('never emits a pseudo-element anywhere but the end', () => {
    const engine = makeEngine('pseudo-none-mid');

    renderStyles(engine, {
      checked: [false, { before: { translateX: 4 } }],
      disabled: [false, { after: { opacity: 0.5 } }],
      hover: { before: { opacity: 0.5 } },
      hoverGroup: { card: { marker: { color: 'red-500' } } },
    });

    // A pseudo-element followed by anything but the start of the declaration block is the shape
    // that gets a rule thrown away, whatever the rest of the selector happens to be.
    expect(generatedRulesOf(engine)).not.toMatch(/::(before|after|placeholder|marker)[^{,\s]/);
  });

  it('reaches a server render, where no effect ever runs', () => {
    const engine = makeEngine('pseudo-ssr', { sink: 'string' });

    engine.resolveClassNames({ before: { content: 'New', color: 'red-500' } }, false);

    const css = engine.getStyles();

    expect(css).toContain('::before{content:"New"}');
    expect(css).toContain('::before{color:var(--red-500)}');
  });
});

/** The `content` a generated element needs before it renders at all — supplied unless the caller says otherwise. */
describe('the implicit content of ::before and ::after', () => {
  it.each(['before', 'after'])('gives %s an empty content, since without one it generates no box', (key) => {
    const engine = makeEngine(`pseudo-implicit-${key}`);

    renderStyles(engine, { [key]: { width: 4 } } as BoxStyleProps);

    expect(generatedRulesOf(engine)).toContain(`::${key}{content:''}`);
  });

  it('leaves a declared content alone, `none` included', () => {
    const engine = makeEngine('pseudo-declared-content');

    renderStyles(engine, { before: { content: 'none' } });

    const rules = generatedRulesOf(engine);

    expect(rules).toContain('::before{content:none}');
    expect(rules).not.toContain("content:''");
  });

  it('adds nothing to the elements that are not generated', () => {
    const engine = makeEngine('pseudo-no-implicit');

    renderStyles(engine, { marker: { color: 'red-500' }, selection: { color: 'red-500' } });

    expect(generatedRulesOf(engine)).not.toContain('content');
  });

  it('follows the nesting, so a pseudo-element declared only under a state still renders', () => {
    const engine = makeEngine('pseudo-implicit-nested');

    renderStyles(engine, { hover: { before: { width: 4 } } });

    expect(generatedRulesOf(engine)).toContain(":hover::before{content:''}");
  });
});

/**
 * A weight is a bitmask of the pseudo-*class* keys a rule nests under. It used to index a table of every
 * subset — 2²² arrays built at import time, whether a page styled anything or not — and it is decoded on
 * demand now, so what these assert is that the decoding is the same list in the same order.
 */
describe('pseudo-class weights', () => {
  it('decodes one weight into its keys, in declaration order', () => {
    expect(pseudoClassesOfWeight(0)).toEqual([]);
    expect(pseudoClassesOfWeight(pseudoClassesWeight.hover)).toEqual(['hover']);
    // Declaration order, not the order the props were written in: `hover` is declared before `checked`.
    expect(pseudoClassesOfWeight(pseudoClassesWeight.checked + pseudoClassesWeight.hover)).toEqual(['hover', 'checked']);
  });

  it('holds every key at once, which is the combination the old table cost 1.5 GB to hold', () => {
    const everyKey = Object.keys(pseudoClasses) as (keyof typeof pseudoClasses)[];
    const everyWeight = everyKey.reduce((sum, key) => sum + pseudoClassesWeight[key], 0);

    expect(pseudoClassesOfWeight(everyWeight)).toEqual(everyKey);
  });

  it('leaves room in the mask, which is 32 bits wide and holds one key per bit', () => {
    expect(Object.keys(pseudoClasses).length).toBeLessThan(31);
    // The pseudo-elements cost the mask nothing at all: they are a slot on the context, not a bit.
    expect(Object.keys(pseudoElements).some((key) => key in pseudoClasses)).toBe(false);
  });
});
