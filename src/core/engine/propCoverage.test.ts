import { describe, expect, it } from 'vitest';
import { makeEngine, renderStyles, ruleList } from '../../../dev/engineHarness';

/**
 * The prop-coverage sweep (C9): the long tail that had no prop at all, and the values the props that did
 * exist were missing. Nothing here is a new mechanism — that it needed none is the point of the step.
 */
describe('the alignment props', () => {
  it('align every item at once, on one axis or both', () => {
    const engine = makeEngine('coverage-place-items');

    renderStyles(engine, { placeItems: 'center' });
    renderStyles(engine, { justifyItems: 'start' });

    // Rules come out in registry order rather than call order: the cascade rank the engine sorts by.
    expect(ruleList(engine)).toEqual(['.justifyItems-start{justify-items:start}', '.placeItems-center{place-items:center}']);
  });

  // The alignment that cannot scroll a child out of reach, and the one value in the registry whose own
  // spelling carries a space: readable class names turn it into the underscore a tuple value already uses.
  it('take the overflow-safe alignments, whose space becomes an underscore in the class name', () => {
    const engine = makeEngine('coverage-safe');

    expect(renderStyles(engine, { ai: 'safe center' })).toEqual(['_b', 'ai-safe_center']);
    expect(ruleList(engine)).toEqual(['.ai-safe_center{align-items:safe center}']);
  });

  it('reach the positions the self props were missing', () => {
    const engine = makeEngine('coverage-self');

    renderStyles(engine, { alignSelf: 'self-end' });
    renderStyles(engine, { justifySelf: 'right' });

    expect(ruleList(engine)).toEqual(['.alignSelf-self-end{align-self:self-end}', '.justifySelf-right{justify-self:right}']);
  });
});

describe('aspectRatio', () => {
  it('names the two ratios worth naming', () => {
    const engine = makeEngine('coverage-ratio-names');

    renderStyles(engine, { aspectRatio: 'square' });
    renderStyles(engine, { aspectRatio: 'video' });

    expect(ruleList(engine)).toEqual(['.aspectRatio-square{aspect-ratio:1 / 1}', '.aspectRatio-video{aspect-ratio:16 / 9}']);
  });

  it('takes a ratio written compactly, and a division as the number it is', () => {
    const engine = makeEngine('coverage-ratio-values');

    renderStyles(engine, { aspectRatio: '4/3' });
    renderStyles(engine, { aspectRatio: 2 });

    expect(ruleList(engine)).toEqual(['.aspectRatio-4\\/3{aspect-ratio:4 / 3}', '.aspectRatio-2{aspect-ratio:2}']);
  });

  it('emits neither a rule nor a class name for something that is not a ratio', () => {
    const engine = makeEngine('coverage-ratio-rejected');

    expect(renderStyles(engine, { aspectRatio: '4:3' } as never)).toEqual(['_b']);
    expect(renderStyles(engine, { aspectRatio: '16/' } as never)).toEqual(['_b']);
    expect(ruleList(engine)).toEqual([]);
  });
});

describe('the inset props', () => {
  it('have a logical shorthand per axis, the way margin does', () => {
    const engine = makeEngine('coverage-inset-axes');

    renderStyles(engine, { insetX: 4 });
    renderStyles(engine, { insetY: '1/2' });

    expect(ruleList(engine)).toEqual(['.insetX-4{inset-inline:1rem}', '.insetY-1\\/2{inset-block:50%}']);
  });

  it('take the auto and the fractions only their longhands used to', () => {
    const engine = makeEngine('coverage-inset-values');

    renderStyles(engine, { inset: 'auto' });
    renderStyles(engine, { inset: '-1/2' });
    renderStyles(engine, { top: 'auto' });

    expect(ruleList(engine)).toEqual(['.top-auto{top:auto}', '.inset-auto{inset:auto}', '.inset--1\\/2{inset:-50%}']);
  });
});

describe('the native-control props', () => {
  it('tint what the page does not draw, from the palette and with its opacity modifier', () => {
    const engine = makeEngine('coverage-accent');

    renderStyles(engine, { accentColor: 'violet-500' });
    renderStyles(engine, { caretColor: 'sky-500/60' });

    expect(ruleList(engine)).toEqual([
      '.accentColor-violet-500{accent-color:var(--violet-500,oklch(60.6% .25 292.7))}',
      '.caretColor-sky-500\\/60{caret-color:color-mix(in oklab, var(--sky-500,oklch(68.5% .169 237.3)) 60%, transparent)}',
    ]);
  });

  it('declare the schemes an element is built for, and let a field size itself', () => {
    const engine = makeEngine('coverage-scheme');

    renderStyles(engine, { colorScheme: 'light dark' });
    renderStyles(engine, { fieldSizing: 'content' });

    expect(ruleList(engine)).toEqual(['.colorScheme-light_dark{color-scheme:light dark}', '.fieldSizing-content{field-sizing:content}']);
  });
});

describe('the hints', () => {
  it('reserve the scrollbar gutter before there is a scrollbar, and promote before the animation', () => {
    const engine = makeEngine('coverage-hints');

    renderStyles(engine, { scrollbarGutter: 'stable both-edges' });
    renderStyles(engine, { willChange: 'transform' });

    expect(ruleList(engine)).toEqual([
      '.willChange-transform{will-change:transform}',
      '.scrollbarGutter-stable_both-edges{scrollbar-gutter:stable both-edges}',
    ]);
  });
});
