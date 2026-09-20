import { describe, expect, it } from 'vitest';
import { makeEngine, renderStyles, ruleList } from '../../../dev/engineHarness';
import { BoxStyleProps } from '../../types';

/**
 * What goes in front of the element's own selector. A parent is a *list* on the walk's context, which is
 * what lets a theme, a group and the element's own states all be about different elements in one rule —
 * they used to share the pseudo-class mask, and a state nested inside a group silently became the
 * group's (bug #115).
 */
describe('group and peer', () => {
  it('hangs the rule off an ancestor in a state', () => {
    const engine = makeEngine('groups-basics');

    const classNames = renderStyles(engine, { group: { hover: { opacity: 1 }, 'card/focusVisible': { bgColor: 'sky-500' } } });

    expect(classNames).toEqual(['_b', 'hover-group-opacity-1', 'focusVisible-card-bgColor-sky-500']);
    expect(ruleList(engine)).toEqual([
      '.group:hover .hover-group-opacity-1{opacity:1}',
      '.card:focus-visible .focusVisible-card-bgColor-sky-500{background-color:var(--sky-500)}',
    ]);
  });

  it('reaches a preceding sibling instead, which is the whole of `peer`', () => {
    const engine = makeEngine('groups-peer');

    renderStyles(engine, { peer: { checked: { color: 'sky-500' }, 'agree/invalid': { color: 'red-500' } } });

    expect(ruleList(engine)).toEqual([
      '.peer:checked~.peer-checked-peer-color-sky-500{color:var(--sky-500)}',
      '.agree:user-invalid~.peer-invalid-agree-color-red-500{color:var(--red-500)}',
    ]);
  });

  it('takes a state this library never sets, on the ancestor', () => {
    const engine = makeEngine('groups-attributes');

    renderStyles(engine, { group: { 'row/data-state=open': { rotate: 90 }, 'row/aria-selected': { bgColor: 'sky-100' } } });

    expect(ruleList(engine)).toEqual([
      '.row[data-state="open"] .data-state\\=open-row-rotate-90{rotate:90deg}',
      '.row[aria-selected="true"] .aria-selected-row-bgColor-sky-100{background-color:var(--sky-100)}',
    ]);
  });

  it("keeps the element's own states on the element", () => {
    const engine = makeEngine('groups-own-state');

    renderStyles(engine, { group: { 'card/hover': { hover: { opacity: 1 }, not: { hover: { opacity: 0.5 } } } } });

    // The whole point of the parents list: `.card:hover .x:hover` is a different rule from
    // `.card:hover:hover .x`, and only the first is what the nesting says.
    expect(ruleList(engine)).toEqual([
      '.card:hover .hover-hover-card-opacity-1:hover{opacity:1}',
      '.card:hover .not-hover-hover-card-opacity-0\\.5:not(:hover){opacity:0.5}',
    ]);
  });

  it('rewrites the five original spellings into the same parent, and shares their class', () => {
    const engine = makeEngine('groups-legacy');

    const legacy = renderStyles(engine, { hoverGroup: { card: { opacity: 1 } } });
    const general = renderStyles(engine, { group: { 'card/hover': { opacity: 1 } } });

    expect(legacy).toEqual(general);
    // One rule, not two identical ones under different class names.
    expect(ruleList(engine)).toEqual(['.card:hover .hover-card-opacity-1{opacity:1}']);
  });

  it('puts a theme in front of a group, in nesting order', () => {
    const engine = makeEngine('groups-theme');

    renderStyles(engine, { theme: { dark: { group: { 'card/hover': { color: 'white' } }, peer: { checked: { color: 'black' } } } } });

    expect(ruleList(engine)).toEqual([
      '@scope (.dark) to ([data-theme]){:scope .card:hover .theme-dark-hover-card-color-white{color:var(--white)}}',
      '@scope (.dark) to ([data-theme]){:scope .peer:checked~.theme-dark-peer-checked-peer-color-black{color:var(--black)}}',
    ]);
  });

  it('nests inside a breakpoint, a container query and a preference', () => {
    const engine = makeEngine('groups-queries');

    renderStyles(engine, {
      md: { group: { 'card/hover': { p: 1 } } },
      cq: { lg: { group: { 'card/hover': { p: 2 } } } },
      pointerCoarse: { group: { 'card/hover': { p: 3 } } },
    });

    expect(ruleList(engine)).toEqual([
      '@media (min-width: 768px){.card:hover .md-hover-card-p-1{padding:0.25rem}}',
      '@container (min-width: 32rem){.card:hover .cq-lg-hover-card-p-2{padding:0.5rem}}',
      '@media (pointer: coarse){.card:hover .pointerCoarse-hover-card-p-3{padding:0.75rem}}',
    ]);
  });

  it('drops a key the grammar rejects, whole', () => {
    const engine = makeEngine('groups-rejected');

    const classNames = renderStyles(engine, {
      group: { 'card/nonsense': { opacity: 0.5 }, 'bad name/hover': { opacity: 0.5 } },
    } as unknown as BoxStyleProps);

    // No rule and no class name, the way an unmatched prop value produces neither.
    expect(classNames).toEqual(['_b']);
    expect(ruleList(engine)).toEqual([]);
  });

  it('has nobody to name in a global rule, so a group is dropped there', () => {
    const engine = makeEngine('groups-global');

    // A theme is the exception: its class lands on the same element, so it compounds onto the selector.
    engine.addGlobalStyles({ theme: { dark: { bgColor: 'gray-900' } }, group: { 'card/hover': { bgColor: 'red-500' } } }, 'html');
    engine.flushSync();

    expect(ruleList(engine)).toEqual(['html.dark{background-color:var(--gray-900)}']);
  });
});
