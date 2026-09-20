import { describe, expect, it } from 'vitest';
import { makeEngine, renderStyles, ruleList, rulesOf } from '../../../dev/engineHarness';

/**
 * The device and the reader as props: `pointerCoarse`/`pointerFine`, `motionReduce`, `forcedColors` and
 * `contrastMore` fill the same slot a breakpoint does — one `@media` block around one rule — so
 * everything a breakpoint composes with composes with them too, and the cascade puts them after every
 * breakpoint.
 */
describe('device and accessibility media features', () => {
  it('wraps each feature in its own media query', () => {
    const engine = makeEngine('media-features-basics');

    const classNames = renderStyles(engine, {
      motionReduce: { transition: 'none' },
      forcedColors: { borderColor: 'gray-500' },
      contrastMore: { color: 'gray-900' },
    });

    expect(classNames).toEqual(['_b', 'motionReduce-transition-none', 'forcedColors-borderColor-gray-500', 'contrastMore-color-gray-900']);
    expect(ruleList(engine)).toEqual([
      '@media (prefers-reduced-motion: reduce){.motionReduce-transition-none{transition-property:none}}',
      '@media (forced-colors: active){.forcedColors-borderColor-gray-500{border-color:var(--gray-500)}}',
      '@media (prefers-contrast: more){.contrastMore-color-gray-900{color:var(--gray-900)}}',
    ]);
  });

  it('asks what the pointer can do, and ranks the answer below what the reader asked for', () => {
    const engine = makeEngine('media-features-pointer');

    renderStyles(engine, { pointerFine: { p: 1 }, contrastMore: { p: 3 }, pointerCoarse: { p: 2 } });

    // A touch target is a fact about the device; a preference is about the person, and wins where both apply.
    expect(ruleList(engine)).toEqual([
      '@media (pointer: coarse){.pointerCoarse-p-2{padding:0.5rem}}',
      '@media (pointer: fine){.pointerFine-p-1{padding:0.25rem}}',
      '@media (prefers-contrast: more){.contrastMore-p-3{padding:0.75rem}}',
    ]);
  });

  it('nests pseudo-classes and pseudo-elements the way a breakpoint does', () => {
    const engine = makeEngine('media-features-pseudo');

    renderStyles(engine, { motionReduce: { hover: { opacity: 1 }, before: { transition: 'none' } } });

    // The `content` comes with the `::before` and lands in the same block: a generated element renders
    // nothing without one, and it exists in exactly the states it was styled in.
    expect(ruleList(engine)).toEqual([
      '@media (prefers-reduced-motion: reduce){.motionReduce-hover-opacity-1:hover{opacity:1}}',
      '@media (prefers-reduced-motion: reduce){.motionReduce-before-transition-none::before{transition-property:none}}',
      "@media (prefers-reduced-motion: reduce){.motionReduce-before-content-empty::before{content:''}}",
    ]);
  });

  it('nests a theme, so a preference and a theme can disagree', () => {
    const engine = makeEngine('media-features-theme');

    renderStyles(engine, { forcedColors: { theme: { dark: { borderColor: 'white' } } } });

    expect(ruleList(engine)).toEqual([
      '@media (forced-colors: active){@scope (.dark) to ([data-theme]){:scope .forcedColors-theme-dark-borderColor-white{border-color:var(--white)}}}',
    ]);
  });

  it('nests a group selector', () => {
    const engine = makeEngine('media-features-group');

    renderStyles(engine, { contrastMore: { hoverGroup: { card: { color: 'black' } } } });

    expect(ruleList(engine)).toEqual([
      '@media (prefers-contrast: more){.card:hover .contrastMore-hover-card-color-black{color:var(--black)}}',
    ]);
  });

  it('ranks a preference after every breakpoint, whatever order the props arrive in', () => {
    const engine = makeEngine('media-features-cascade');

    renderStyles(engine, { motionReduce: { p: 1 }, xxl: { p: 2 }, p: 3 });

    // Rule order is cascade order in every sink: the preference wins against the widest screen.
    expect(ruleList(engine)).toEqual([
      '.p-3{padding:0.75rem}',
      '@media (min-width: 1536px){.xxl-p-2{padding:0.5rem}}',
      '@media (prefers-reduced-motion: reduce){.motionReduce-p-1{padding:0.25rem}}',
    ]);
  });

  it('turns off every Box transition under reduced motion, with no opt-in', () => {
    const engine = makeEngine('media-features-default');

    renderStyles(engine, { p: 4 });

    // `._b` transitions on these two variables, so zeroing them stops the whole library moving.
    expect(rulesOf(engine)).toContain('@media (prefers-reduced-motion: reduce){:root{--transitionTime: 0s;--svgTransitionTime: 0s;}}');
  });

  it('lets a component opt motion back in, later in the cascade than the variable that removed it', () => {
    const engine = makeEngine('media-features-opt-in');

    renderStyles(engine, { transitionDuration: 200, motionReduce: { transitionDuration: 150 } });

    const css = rulesOf(engine);
    expect(css.indexOf('--transitionTime: 0s')).toBeLessThan(
      css.indexOf('@media (prefers-reduced-motion: reduce){.motionReduce-transitionDuration-150'),
    );
  });

  it('gives each feature its own cascade layer in element mode', () => {
    const engine = makeEngine('media-features-layers', { sink: 'element' });

    const { styleElements } = engine.resolveClassNames({ motionReduce: { p: 4 } }, false);

    // Rank 20, base36 'k': after the five breakpoints, the twelve container-query slots and the pointer pair.
    expect(styleElements!.at(-1)!.css).toMatch(/^@layer rbk\.p\w+\{@media \(prefers-reduced-motion: reduce\)\{\.motionReduce-p-4\{/);
    expect(styleElements![0].css.startsWith('@layer rb,')).toBe(true);
  });
});
