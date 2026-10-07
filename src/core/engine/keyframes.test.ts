import { describe, expect, it, vi } from 'vitest';
import { generatedRulesOf, makeEngine, renderStyles, rulesOf } from '../../../dev/engineHarness';
import { createStyleEngine } from './styleEngine';

/**
 * `Box.keyframes()` is the engine's `@keyframes` registry: the steps are Box props, so a sequence gets
 * the same dividers, colour tokens and composed longhands a rule does — and nothing is written until a
 * rule names it, which is what keeps four unused presets out of every page.
 */
describe('keyframes', () => {
  const composedTranslate = 'translate:var(--boxTranslateX, 0) var(--boxTranslateY, 0)';

  it('writes a sequence only once something names it', () => {
    const engine = makeEngine('keyframes-lazy');
    engine.keyframes({ fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } } });

    renderStyles(engine, { p: 4 });
    expect(rulesOf(engine)).not.toContain('@keyframes');

    renderStyles(engine, { animationName: 'fadeIn' });
    expect(rulesOf(engine)).toContain('@keyframes fadeIn{from{opacity:0}to{opacity:1}}');
    expect(generatedRulesOf(engine)).toContain('.animationName-fadeIn{animation-name:fadeIn}');
  });

  it('resolves every step as Box props — the divider, the colour token, the composed translate', () => {
    const engine = makeEngine('keyframes-steps');
    engine.keyframes({
      slide: {
        from: { translateX: -4, bgColor: 'sky-500' },
        '50%': { translateY: '1/2' },
        to: { translateX: 0 },
      },
    });

    renderStyles(engine, { animationName: 'slide' });

    expect(rulesOf(engine)).toContain(
      `@keyframes slide{from{--boxTranslateX:-1rem;${composedTranslate};background-color:var(--sky-500,oklch(68.5% .169 237.3))}` +
        `50%{--boxTranslateY:50%;${composedTranslate}}to{--boxTranslateX:0rem;${composedTranslate}}}`,
    );
    // The token behind the step carries its value like any other, so nothing reaches `:root`.
    expect(rulesOf(engine)).not.toContain('--sky-500:');
  });

  it('runs a preset with nothing registered by hand', () => {
    const engine = makeEngine('keyframes-preset');

    renderStyles(engine, { animation: 'spin' });

    expect(generatedRulesOf(engine)).toContain('.animation-spin{animation:spin calc(4 * var(--transitionTime)) linear infinite}');
    expect(rulesOf(engine)).toContain('@keyframes spin{to{rotate:360deg}}');
  });

  it('lets a preset carry an easing per step', () => {
    const engine = makeEngine('keyframes-preset-easing');

    renderStyles(engine, { animation: 'bounce' });

    expect(rulesOf(engine)).toContain(
      `@keyframes bounce{from{--boxTranslateY:-25%;${composedTranslate};animation-timing-function:cubic-bezier(0.8, 0, 1, 1)}`,
    );
  });

  /**
   * Without the registration the two axes are universal-syntax custom properties, which animate
   * *discretely*: the DataGrid's bar stayed at -100% for its whole cycle and jumped to 250% at the end.
   * A transition works either way — it reads the substituted `translate` — so only an animation catches it.
   */
  it('registers the translate axes, so a sequence moving them interpolates', () => {
    const engine = makeEngine('keyframes-property');

    renderStyles(engine, { animation: 'bounce' });

    const css = rulesOf(engine);
    expect(css).toContain('@property --boxTranslateX{syntax: "<length-percentage>";inherits: false;initial-value: 0;}');
    expect(css).toContain('@property --boxTranslateY{syntax: "<length-percentage>";inherits: false;initial-value: 0;}');
  });

  it('emits no sequence for a name it does not know, and keeps the rule', () => {
    const engine = makeEngine('keyframes-unknown');

    renderStyles(engine, { animationName: 'drawn-in-somebody-elses-stylesheet' });

    expect(generatedRulesOf(engine)).toContain('{animation-name:drawn-in-somebody-elses-stylesheet}');
    expect(rulesOf(engine)).not.toContain('@keyframes');
  });

  it('writes a sequence once however many rules name it', () => {
    const engine = makeEngine('keyframes-dedupe');

    renderStyles(engine, { animation: 'pulse' });
    renderStyles(engine, { animation: 'pulse', hover: { animation: 'pulse' } });
    renderStyles(engine, { animationName: 'pulse' });

    expect(rulesOf(engine).match(/@keyframes pulse/g)).toHaveLength(1);
  });

  it('skips a name that is not a CSS identifier', () => {
    const engine = makeEngine('keyframes-bad-name');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    engine.keyframes({ 'fade in': { to: { opacity: 1 } } });
    renderStyles(engine, { animationName: 'fade in' });

    expect(warn).toHaveBeenCalledWith(expect.stringContaining("skipped 'fade in'"));
    expect(rulesOf(engine)).not.toContain('@keyframes');
    warn.mockRestore();
  });

  it('rewrites a sequence redefined after something used it', () => {
    const engine = makeEngine('keyframes-redefine');
    engine.keyframes({ appear: { to: { opacity: 0.5 } } });
    renderStyles(engine, { animationName: 'appear' });

    engine.keyframes({ appear: { to: { opacity: 1 } } });
    engine.flushSync();

    expect(rulesOf(engine)).toContain('@keyframes appear{to{opacity:1}}');
  });

  it('comes back after clear(), with the rules that named it', () => {
    const engine = makeEngine('keyframes-clear');

    renderStyles(engine, { animation: 'ping' });
    engine.clear();
    expect(rulesOf(engine)).not.toContain('@keyframes ping');

    renderStyles(engine, { animation: 'ping' });
    expect(rulesOf(engine)).toContain('@keyframes ping{75%{scale:2;opacity:0}to{scale:2;opacity:0}}');
  });

  it('reaches a server render with no DOM at all', () => {
    const engine = createStyleEngine({ classNames: 'readable', sink: 'string', styleElementId: 'keyframes-ssr' });
    engine.keyframes({ fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } } });

    engine.classNames({ animationName: 'fadeIn', animationDuration: 300 });

    const css = engine.getStyles();
    expect(css).toContain('@keyframes fadeIn{from{opacity:0}to{opacity:1}}');
    expect(css).toContain('{animation-duration:300ms}');
  });

  it('rides the base element in element mode, where every Box carries it', () => {
    const engine = createStyleEngine({ classNames: 'readable', sink: 'element', styleElementId: 'keyframes-element' });

    const { styleElements } = engine.resolveClassNames({ animation: 'spin' }, false);

    expect(styleElements?.[0].css).toContain('@keyframes spin{to{rotate:360deg}}');
  });
});
