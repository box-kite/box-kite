import { describe, expect, it } from 'vitest';
import { generatedRulesOf, makeEngine, renderStyles, ruleList, rulesOf } from '../../../dev/engineHarness';

/** The composed declaration every `filter` layer writes, whichever one of them set its own property. */
const filter =
  'filter:var(--boxBlur,) var(--boxBrightness,) var(--boxContrast,) var(--boxGrayscale,) var(--boxHueRotate,) var(--boxInvert,) var(--boxSaturate,) var(--boxSepia,) var(--boxDropShadow,)';

/** And the same for `backdrop-filter`, which has no drop shadow and an `opacity` of its own. */
const backdrop =
  'backdrop-filter:var(--boxBackdropBlur,) var(--boxBackdropBrightness,) var(--boxBackdropContrast,) var(--boxBackdropGrayscale,) var(--boxBackdropHueRotate,) var(--boxBackdropInvert,) var(--boxBackdropOpacity,) var(--boxBackdropSaturate,) var(--boxBackdropSepia,)';

/**
 * A filter function is a prop of its own, and `filter` is one property whose value is a list — so each sets
 * a custom property and every one of them writes the same composed declaration.
 */
describe('a filter function', () => {
  it('sets its own layer and writes the composed filter', () => {
    const engine = makeEngine('filter-basic');

    const classNames = renderStyles(engine, { blur: 'md' });

    expect(classNames).toEqual(['_b', 'blur-md']);
    expect(ruleList(engine)).toEqual([`.blur-md{--boxBlur:blur(12px);${filter}}`]);
  });

  it('takes the scale or a radius in px, which are different values and different classes', () => {
    const engine = makeEngine('filter-blur-scale');

    renderStyles(engine, { blur: 'xxxl' });
    renderStyles(engine, { blur: 3 });

    expect(ruleList(engine)).toEqual([`.blur-xxxl{--boxBlur:blur(64px);${filter}}`, `.blur-3{--boxBlur:blur(3px);${filter}}`]);
  });

  it('takes a percentage as a number, and degrees where the function wants them', () => {
    const engine = makeEngine('filter-units');

    renderStyles(engine, { brightness: 110, saturate: 150, hueRotate: -90 });

    expect(generatedRulesOf(engine)).toContain('--boxBrightness:brightness(110%)');
    expect(generatedRulesOf(engine)).toContain('--boxSaturate:saturate(150%)');
    expect(generatedRulesOf(engine)).toContain('--boxHueRotate:hue-rotate(-90deg)');
  });

  it('composes with another one instead of replacing it', () => {
    const engine = makeEngine('filter-composes');

    const classNames = renderStyles(engine, { blur: 'sm', grayscale: 100 });

    // Two classes, two layers, and the same composed declaration in both — so whichever rule the cascade
    // takes last still reads every layer that was set.
    expect(classNames).toEqual(['_b', 'blur-sm', 'grayscale-100']);
    expect(ruleList(engine)).toEqual([
      `.blur-sm{--boxBlur:blur(8px);${filter}}`,
      `.grayscale-100{--boxGrayscale:grayscale(100%);${filter}}`,
    ]);
  });

  it('clears just its own function with none', () => {
    const engine = makeEngine('filter-none');

    renderStyles(engine, { blur: 'none' });

    // `initial` reverts a registered property to the guaranteed-invalid value it starts from, so the
    // composed `var()` falls back to nothing — for this function alone.
    expect(ruleList(engine)).toEqual([`.blur-none{--boxBlur:initial;${filter}}`]);
  });

  it('shares one class with another element asking for the same one', () => {
    const engine = makeEngine('filter-shared');

    expect(renderStyles(engine, { saturate: 150 })).toEqual(renderStyles(engine, { saturate: 150 }));
    expect(ruleList(engine)).toHaveLength(1);
  });

  it('nests the way any other value does', () => {
    const engine = makeEngine('filter-nesting');

    renderStyles(engine, { hover: { blur: 'xs' }, theme: { dark: { brightness: 120 } } });

    expect(generatedRulesOf(engine)).toContain(`:hover{--boxBlur:blur(4px);${filter}}`);
    expect(generatedRulesOf(engine)).toContain(`--boxBrightness:brightness(120%);${filter}`);
  });
});

/** Every layer is registered, and the registration is the whole reason a filter does not reach a child. */
describe('the filter layers', () => {
  it('are declared inherits: false in the base stylesheet', () => {
    const engine = makeEngine('filter-properties');

    renderStyles(engine, { blur: 'sm' });
    const css = rulesOf(engine);

    expect(css).toContain('@property --boxBlur{syntax: "*";inherits: false;}');
    expect(css).toContain('@property --boxDropShadow{syntax: "*";inherits: false;}');
    expect(css).toContain('@property --boxBackdropOpacity{syntax: "*";inherits: false;}');
    // Eighteen functions plus the drop shadow's colour, which rides with the other shadow colours.
    expect(css.match(/@property --box(?!TranslateX|TranslateY|Inset|Ring|Shadow|Text)/g)).toHaveLength(19);
  });
});

/** `drop-shadow` is a filter function rather than a `box-shadow` layer, and it takes a colour like the rest. */
describe('a drop shadow', () => {
  it('writes the filter and never box-shadow', () => {
    const engine = makeEngine('drop-shadow-basic');

    renderStyles(engine, { dropShadow: 'lg' });

    expect(ruleList(engine)).toEqual([
      `.dropShadow-lg{--boxDropShadow:drop-shadow(0 4px 4px var(--boxDropShadowColor, rgb(0 0 0 / .15)));${filter}}`,
    ]);
  });

  it('reads its colour through the fallback each step fills with its own alpha', () => {
    const engine = makeEngine('drop-shadow-color');

    renderStyles(engine, { dropShadow: 'sm', dropShadowColor: 'indigo-500/40' });

    expect(generatedRulesOf(engine)).toContain(
      '--boxDropShadowColor:color-mix(in oklab, var(--indigo-500,oklch(58.5% .233 277.1)) 40%, transparent)',
    );
  });

  it('composes with an elevation, which is a different property entirely', () => {
    const engine = makeEngine('drop-shadow-with-shadow');

    renderStyles(engine, { dropShadow: 'md', shadow: 'md' });

    const rules = generatedRulesOf(engine);
    expect(rules).toContain('--boxDropShadow:drop-shadow(');
    expect(rules).toContain('--boxShadow:0 4px 6px -1px');
  });
});

/** The nine backdrop props are the same nine functions on the property behind the element. */
describe('a backdrop filter', () => {
  it('writes backdrop-filter and leaves filter alone', () => {
    const engine = makeEngine('backdrop-basic');

    renderStyles(engine, { backdropBlur: 'sm', backdropSaturate: 180 });

    expect(ruleList(engine)).toEqual([
      `.backdropBlur-sm{--boxBackdropBlur:blur(8px);${backdrop}}`,
      `.backdropSaturate-180{--boxBackdropSaturate:saturate(180%);${backdrop}}`,
    ]);
  });

  it('has an opacity the filter side has no use for', () => {
    const engine = makeEngine('backdrop-opacity');

    renderStyles(engine, { backdropOpacity: 60 });

    expect(generatedRulesOf(engine)).toContain('--boxBackdropOpacity:opacity(60%)');
  });
});

/** A mask is the gradient grammar again, applied to the alpha channel that decides what is painted. */
describe('a mask', () => {
  it('takes a gradient record, stops resolved to the variables behind them', () => {
    const engine = makeEngine('mask-gradient');

    renderStyles(engine, { maskImage: { linear: 'b', colors: ['black', 'transparent'] } });

    expect(ruleList(engine)).toEqual([
      '.maskImage-linear-b_colors-black\\,transparent{mask-image:linear-gradient(to bottom,var(--black,#000),var(--transparent,transparent))}',
    ]);
  });

  it('takes a reference somebody else defined, and none', () => {
    const engine = makeEngine('mask-reference');

    expect(renderStyles(engine, { maskImage: 'url(#frame)' })).toEqual(['_b', 'maskImage-url(#frame)']);
    expect(renderStyles(engine, { maskImage: 'none' })).toEqual(['_b', 'maskImage-none']);
    expect(generatedRulesOf(engine)).toContain('{mask-image:url(#frame)}');
    expect(generatedRulesOf(engine)).toContain('{mask-image:none}');
  });

  it('emits neither a rule nor a class name for a gradient the grammar rejects', () => {
    const engine = makeEngine('mask-rejected');

    expect(renderStyles(engine, { maskImage: { linear: 'b', colors: ['blakc' as never, 'transparent'] } })).toEqual(['_b']);
    expect(ruleList(engine)).toEqual([]);
  });
});

/** `background-clip` is what turns a gradient into lettering, so it arrived with the gradients. */
describe('bgClip', () => {
  it('names a box, or the glyphs themselves', () => {
    const engine = makeEngine('bg-clip');

    renderStyles(engine, { bgClip: 'padding' });
    renderStyles(engine, { bgClip: 'text' });

    expect(ruleList(engine)).toEqual(['.bgClip-padding{background-clip:padding-box}', '.bgClip-text{background-clip:text}']);
  });
});
