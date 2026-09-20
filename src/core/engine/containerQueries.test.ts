import { describe, expect, it } from 'vitest';
import { makeEngine, renderStyles, ruleList } from '../../../dev/engineHarness';

/**
 * Container queries: the `cq` nesting key fills the same one slot a breakpoint does — one at-rule block
 * per rule — so everything a breakpoint composes with composes with it, and the cascade puts a question
 * about the element's own container after every viewport width and before every user preference.
 */
describe('container queries', () => {
  it('makes an element a container, named or not', () => {
    const engine = makeEngine('container-establish');

    const classNames = renderStyles(engine, { container: true });
    const named = renderStyles(engine, { container: 'sidebar' });

    expect(classNames).toEqual(['_b', 'container-true']);
    expect(named).toEqual(['_b', 'container-sidebar']);
    expect(ruleList(engine)).toEqual([
      '.container-true{container-type:inline-size}',
      '.container-sidebar{container:sidebar / inline-size}',
    ]);
  });

  it('takes the longhands too, and the shorthand loses to them', () => {
    const engine = makeEngine('container-longhands');

    renderStyles(engine, { container: 'panel', containerName: 'panel', containerType: 'size' });

    // Declaration order is cascade order, and the shorthand is declared first: the type is the longhand's.
    expect(ruleList(engine)).toEqual([
      '.container-panel{container:panel / inline-size}',
      '.containerName-panel{container-name:panel}',
      '.containerType-size{container-type:size}',
    ]);
  });

  it('emits nothing for a name that is not a custom-ident', () => {
    const engine = makeEngine('container-bad-name');

    // The name lands in an at-rule prelude, so `not` there would compile to a query nobody wrote.
    expect(renderStyles(engine, { container: 'not' })).toEqual(['_b']);
    expect(renderStyles(engine, { containerName: 'my sidebar' })).toEqual(['_b']);
    expect(ruleList(engine)).toEqual([]);
  });

  it('wraps a size in an @container block', () => {
    const engine = makeEngine('container-sizes');

    const classNames = renderStyles(engine, { cq: { xs: { p: 1 }, md: { p: 4 }, xxl: { p: 8 } } });

    expect(classNames).toEqual(['_b', 'cq-xs-p-1', 'cq-md-p-4', 'cq-xxl-p-8']);
    expect(ruleList(engine)).toEqual([
      '@container (min-width: 20rem){.cq-xs-p-1{padding:0.25rem}}',
      '@container (min-width: 28rem){.cq-md-p-4{padding:1rem}}',
      '@container (min-width: 42rem){.cq-xxl-p-8{padding:2rem}}',
    ]);
  });

  it('writes a max key as the complement of its size, so the two never both match', () => {
    const engine = makeEngine('container-max');

    renderStyles(engine, { cq: { maxSm: { d: 'column' } } });

    expect(ruleList(engine)).toEqual(['@container not (min-width: 24rem){.cq-maxSm-d-column{flex-direction:column}}']);
  });

  it('addresses a named container, and escapes the slash in the selector', () => {
    const engine = makeEngine('container-named-query');

    const classNames = renderStyles(engine, { cq: { 'sidebar/lg': { color: 'red-500' } } });

    expect(classNames).toEqual(['_b', 'cq-sidebar/lg-color-red-500']);
    expect(ruleList(engine)).toEqual(['@container sidebar (min-width: 32rem){.cq-sidebar\\/lg-color-red-500{color:var(--red-500)}}']);
  });

  it('drops a block whose key the grammar rejects', () => {
    const engine = makeEngine('container-bad-keys');

    // An unknown size, a name that is not an ident, and a reserved word: no rule and no class name,
    // the way an unmatched prop value produces neither.
    const classNames = renderStyles(engine, {
      cq: { huge: { p: 4 }, 'my sidebar/md': { p: 4 }, 'and/md': { p: 4 } },
    } as never);

    expect(classNames).toEqual(['_b']);
    expect(ruleList(engine)).toEqual([]);
  });

  it('cannot collide with the breakpoint of the same name', () => {
    const engine = makeEngine('container-vs-breakpoint');

    const classNames = renderStyles(engine, { md: { p: 2 }, cq: { md: { p: 4 } } });

    // Two classes, two rules — and the container query lands after the breakpoint, because a question
    // about the element's own container is the more local statement.
    expect(classNames).toEqual(['_b', 'md-p-2', 'cq-md-p-4']);
    expect(ruleList(engine)).toEqual([
      '@media (min-width: 768px){.md-p-2{padding:0.5rem}}',
      '@container (min-width: 28rem){.cq-md-p-4{padding:1rem}}',
    ]);
  });

  it('ranks the sizes ascending and the max keys descending, before every preference', () => {
    const engine = makeEngine('container-ranks');

    // Written in the order least likely to come out right on its own.
    renderStyles(engine, {
      motionReduce: { p: 6 },
      cq: { maxSm: { p: 5 }, xl: { p: 3 }, maxXl: { p: 4 }, sm: { p: 2 } },
      p: 1,
    });

    expect(ruleList(engine)).toEqual([
      '.p-1{padding:0.25rem}',
      '@container (min-width: 24rem){.cq-sm-p-2{padding:0.5rem}}',
      '@container (min-width: 36rem){.cq-xl-p-3{padding:0.75rem}}',
      // The narrower `max` matches fewer containers, so it has to win where two of them overlap.
      '@container not (min-width: 36rem){.cq-maxXl-p-4{padding:1rem}}',
      '@container not (min-width: 24rem){.cq-maxSm-p-5{padding:1.25rem}}',
      '@media (prefers-reduced-motion: reduce){.motionReduce-p-6{padding:1.5rem}}',
    ]);
  });

  it('nests everything a breakpoint nests', () => {
    const engine = makeEngine('container-nesting');

    renderStyles(engine, {
      cq: {
        md: {
          hover: { opacity: 1 },
          before: { content: 'New' },
          dataAttr: { 'state=open': { color: 'white' } },
          theme: { dark: { bgColor: 'black' } },
          hoverGroup: { card: { color: 'red-500' } },
          startingStyle: { opacity: 0 },
        },
      },
    });

    expect(ruleList(engine)).toEqual([
      '@container (min-width: 28rem){.cq-md-hover-opacity-1:hover{opacity:1}}',
      '@container (min-width: 28rem){.cq-md-dataAttr-state\\=open-color-white[data-state="open"]{color:var(--white)}}',
      '@container (min-width: 28rem){.card:hover .cq-md-hover-card-color-red-500{color:var(--red-500)}}',
      '@container (min-width: 28rem){@scope (.dark) to ([data-theme]){:scope .cq-md-theme-dark-bgColor-black{background-color:var(--black)}}}',
      '@container (min-width: 28rem){.cq-md-before-content-New::before{content:"New"}}',
      '@container (min-width: 28rem){@starting-style{.cq-md-starting-opacity-0{opacity:0!important}}}',
    ]);
  });

  it('is a component style like any other', () => {
    const engine = makeEngine('container-components');

    engine.components({ card: { styles: { p: 4, cq: { md: { d: 'row' } } } } } as never);
    const classNames = renderStyles(engine, { component: 'card' } as never);

    expect(classNames).toEqual(['_b', 'p-4', 'cq-md-d-row']);
    expect(ruleList(engine)).toEqual(['.p-4{padding:1rem}', '@container (min-width: 28rem){.cq-md-d-row{flex-direction:row}}']);
  });
});
