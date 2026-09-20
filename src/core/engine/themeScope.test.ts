import { describe, expect, it } from 'vitest';
import { makeEngine, renderStyles, ruleList } from '../../../dev/engineHarness';

/**
 * A theme is an ancestor class, so two themes nested in one page produce two rules of the same
 * specificity — and before bug #189 the one written last won, whichever was nearer. `@scope` is what
 * settles it: the block ends at the next element declaring a theme, so a local `<Box.Theme>` owns its
 * subtree and nothing outside it reaches in. The cascade itself is browser-measured; what is pinned
 * here is the rule text those measurements were made against.
 */
describe('a theme reaches exactly the subtree it owns', () => {
  it('ends the block at the next element declaring a theme', () => {
    const engine = makeEngine('theme-scope-basics');

    const classNames = renderStyles(engine, { theme: { dark: { bgColor: 'slate-950' }, light: { bgColor: 'white' } } });

    // The class names are the ones an ancestor selector produced: what changed is where the rule reaches.
    expect(classNames).toEqual(['_b', 'theme-dark-bgColor-slate-950', 'theme-light-bgColor-white']);
    expect(ruleList(engine)).toEqual([
      '@scope (.dark) to ([data-theme]){:scope .theme-dark-bgColor-slate-950{background-color:var(--slate-950)}}',
      '@scope (.light) to ([data-theme]){:scope .theme-light-bgColor-white{background-color:var(--white)}}',
    ]);
  });

  it('keeps the element between the theme and the state it is in', () => {
    const engine = makeEngine('theme-scope-states');

    renderStyles(engine, { theme: { dark: { hover: { opacity: 1 }, group: { 'card/hover': { opacity: 0.5 } } } } });

    expect(ruleList(engine)).toEqual([
      '@scope (.dark) to ([data-theme]){:scope .hover-theme-dark-opacity-1:hover{opacity:1}}',
      '@scope (.dark) to ([data-theme]){:scope .card:hover .theme-dark-hover-card-opacity-0\\.5{opacity:0.5}}',
    ]);
  });

  it('goes inside the media block and outside the starting rule, which is the order they nest in', () => {
    const engine = makeEngine('theme-scope-order');

    renderStyles(engine, { md: { theme: { dark: { color: 'white' } } }, theme: { dark: { startingStyle: { opacity: 0 } } } });

    expect(ruleList(engine)).toEqual([
      '@media (min-width: 768px){@scope (.dark) to ([data-theme]){:scope .md-theme-dark-color-white{color:var(--white)}}}',
      '@scope (.dark) to ([data-theme]){@starting-style{:scope .starting-theme-dark-opacity-0{opacity:0!important}}}',
    ]);
  });

  it('stays a compound on a global rule, where the theme is the element itself', () => {
    const engine = makeEngine('theme-scope-global');

    // `html` cannot sit inside another theme, so there is nothing for a scope to cut — and `html.dark`
    // is the element carrying the theme rather than an ancestor of it.
    engine.addGlobalStyles({ theme: { dark: { bgColor: 'gray-900' } } }, 'html');
    engine.flushSync();

    expect(ruleList(engine)).toEqual(['html.dark{background-color:var(--gray-900)}']);
  });
});
