import { describe, expect, it } from 'vitest';
import { generatedRulesOf, makeEngine, renderStyles, ruleList, rulesOf } from '../../../dev/engineHarness';

/** The composed declaration every shadow layer writes, whichever one of them set its own property. */
const composed =
  'box-shadow:var(--boxInsetShadow, 0 0 #0000),var(--boxInsetRing, 0 0 #0000),var(--boxRing, 0 0 #0000),var(--boxShadow, 0 0 #0000)';

/**
 * `bgGradient` as the engine sees it: a record value, so the class name is built out of the whole shape
 * and the rule out of the stops — which are palette values like any other.
 */
describe('a gradient', () => {
  it('writes background-image and names itself after the shape it was written as', () => {
    const engine = makeEngine('gradient-basic');

    const classNames = renderStyles(engine, { bgGradient: { linear: 'r', colors: ['blue-500', 'pink-500'] } });

    expect(classNames).toEqual(['_b', 'bgGradient-linear-r_colors-blue-500,pink-500']);
    expect(ruleList(engine)).toEqual([
      '.bgGradient-linear-r_colors-blue-500\\,pink-500{background-image:linear-gradient(to right,var(--blue-500,oklch(62.3% .214 259.8)),var(--pink-500,oklch(65.6% .241 354.3)))}',
    ]);
  });

  it('writes the variable behind every stop with its value, declaring none', () => {
    const engine = makeEngine('gradient-variables');

    renderStyles(engine, { bgGradient: { linear: 'b', colors: ['blue-500', 'blue-500/40'] } });

    expect(rulesOf(engine).split('var(--blue-500,oklch(62.3% .214 259.8))')).toHaveLength(3);
    expect(rulesOf(engine)).not.toContain('--blue-500:');
  });

  it('emits neither a rule nor a class name for a gradient the grammar rejects', () => {
    const engine = makeEngine('gradient-rejected');

    expect(renderStyles(engine, { bgGradient: { linear: 'r', colors: ['bleu-500' as never, 'pink-500'] } })).toEqual(['_b']);
    expect(renderStyles(engine, { bgGradient: { linear: 'r', colors: ['blue-500'] } })).toEqual(['_b']);
    expect(ruleList(engine)).toEqual([]);
  });

  it('nests the way any other value does', () => {
    const engine = makeEngine('gradient-nesting');

    renderStyles(engine, { hover: { bgGradient: { linear: 'r', colors: ['blue-500', 'pink-500'] } } });

    expect(generatedRulesOf(engine)).toContain(
      ':hover{background-image:linear-gradient(to right,var(--blue-500,oklch(62.3% .214 259.8)),var(--pink-500,oklch(65.6% .241 354.3)))}',
    );
  });

  it('shares one class with another element asking for the same gradient', () => {
    const engine = makeEngine('gradient-shared');

    const first = renderStyles(engine, { bgGradient: { conic: 45, colors: ['red-500', 'yellow-500'] } });
    const second = renderStyles(engine, { bgGradient: { conic: 45, colors: ['red-500', 'yellow-500'] } });

    expect(second).toEqual(first);
    expect(ruleList(engine)).toHaveLength(1);
  });
});

/**
 * The four shadow layers: each sets its own custom property and all four write the same composed
 * `box-shadow`, so a ring and an elevation coexist instead of the last rule winning.
 */
describe('the shadow layers', () => {
  it('puts a step of the scale in its own layer, painted with the colour that layer reads', () => {
    const engine = makeEngine('shadow-scale');

    const classNames = renderStyles(engine, { shadow: 'md' });

    expect(classNames).toEqual(['_b', 'shadow-md']);
    expect(ruleList(engine)).toEqual([
      `.shadow-md{--boxShadow:0 4px 6px -1px var(--boxShadowColor, rgb(0 0 0 / .1)),0 2px 4px -2px var(--boxShadowColor, rgb(0 0 0 / .1));${composed}}`,
    ]);
  });

  it('stacks all four, so each one contributes a layer rather than replacing the others', () => {
    const engine = makeEngine('shadow-stack');

    renderStyles(engine, { shadow: 'sm', insetShadow: 'sm', ring: 2, insetRing: 1 });

    const rules = ruleList(engine);
    expect(rules).toHaveLength(4);
    // Every one writes the same composed declaration, so whichever lands last still reads all four.
    expect(rules.every((rule) => rule.includes(composed))).toBe(true);
    expect(rules[2]).toBe(`.ring-2{--boxRing:0 0 0 2px var(--boxRingColor, currentColor);${composed}}`);
    expect(rules[3]).toBe(`.insetRing-1{--boxInsetRing:inset 0 0 0 1px var(--boxInsetRingColor, currentColor);${composed}}`);
  });

  it('clears just its own layer with `none`, leaving the others painting', () => {
    const engine = makeEngine('shadow-none');

    renderStyles(engine, { shadow: 'none', ring: 0 });

    expect(ruleList(engine)).toEqual([`.shadow-none{--boxShadow:0 0 #0000;${composed}}`, `.ring-0{--boxRing:0 0 #0000;${composed}}`]);
  });

  it('recolours a layer through a custom property, which shows nothing on its own', () => {
    const engine = makeEngine('shadow-colour');

    renderStyles(engine, { shadowColor: 'blue-500/40', ringColor: 'indigo-500', insetShadowColor: 'Canvas' });

    expect(ruleList(engine)).toEqual([
      '.shadowColor-blue-500\\/40{--boxShadowColor:color-mix(in oklab, var(--blue-500,oklch(62.3% .214 259.8)) 40%, transparent)}',
      '.insetShadowColor-Canvas{--boxInsetShadowColor:Canvas}',
      '.ringColor-indigo-500{--boxRingColor:var(--indigo-500,oklch(58.5% .233 277.1))}',
    ]);
  });

  it('keeps the three original presets, which carry their own colour', () => {
    const engine = makeEngine('shadow-presets');

    renderStyles(engine, { shadow: 'medium' });

    expect(ruleList(engine)).toEqual([`.shadow-medium{--boxShadow:var(--medium,rgba(0, 0, 0, 0.24) 0px 3px 8px);${composed}}`]);
  });

  it('registers every layer, which is what stops a child inheriting the elevation above it', () => {
    const engine = makeEngine('shadow-registered');

    renderStyles(engine, { shadow: 'sm' });

    // Universal syntax and no initial value: anything else makes the property always valid and the
    // `var()` fallback carrying each step of its own alpha unreachable.
    expect(rulesOf(engine)).toContain('@property --boxShadow{syntax: "*";inherits: false;}');
    expect(rulesOf(engine)).toContain('@property --boxRingColor{syntax: "*";inherits: false;}');
  });

  it('nests, so an elevation can belong to a hover or a breakpoint', () => {
    const engine = makeEngine('shadow-nesting');

    renderStyles(engine, { hover: { shadow: 'lg' } });

    expect(generatedRulesOf(engine)).toContain(':hover{--boxShadow:0 10px 15px -3px var(--boxShadowColor, rgb(0 0 0 / .1))');
  });
});

/** `text-shadow` is one property with one contributor, so it needs no composing — only a colour to read. */
describe('a text shadow', () => {
  it('writes the property directly, with a colour of its own', () => {
    const engine = makeEngine('text-shadow');

    renderStyles(engine, { textShadow: 'xs', textShadowColor: 'black/20' });

    expect(ruleList(engine)).toEqual([
      '.textShadow-xs{text-shadow:0px 1px 1px var(--boxTextShadowColor, rgb(0 0 0 / .2))}',
      '.textShadowColor-black\\/20{--boxTextShadowColor:color-mix(in oklab, var(--black,#000) 20%, transparent)}',
    ]);
  });

  it('turns off with `none`', () => {
    const engine = makeEngine('text-shadow-none');

    renderStyles(engine, { textShadow: 'none' });

    expect(ruleList(engine)).toEqual(['.textShadow-none{text-shadow:none}']);
  });
});
