import { describe, expect, it } from 'vitest';
import { generatedRulesOf, makeEngine, renderStyles, ruleList } from '../../dev/engineHarness';
import { BoxStyleProps } from '../types';
import Css from './css';

function generatedRulesFor(props: BoxStyleProps, engineId: string) {
  const engine = makeEngine(engineId);
  renderStyles(engine, props);

  return generatedRulesOf(engine);
}

/**
 * `css` is the escape hatch, and the point of it is that it is *not* an inline style: the object lands in a
 * class through the same pipeline as every other prop, so it nests, dedupes, sorts and renders on a server.
 */
describe('css — the typed escape hatch', () => {
  it('writes a property this library has no prop for, into a class', () => {
    const engine = makeEngine('css-one');
    const classNames = renderStyles(engine, { css: { mixBlendMode: 'multiply' } });

    expect(classNames).toContain('css-mixBlendMode-multiply');
    expect(generatedRulesOf(engine)).toContain('.css-mixBlendMode-multiply{mix-blend-mode:multiply}');
  });

  it('takes several declarations at once, in the order they were written', () => {
    expect(
      generatedRulesFor({ css: { scrollSnapType: 'x mandatory', objectPosition: 'top', isolation: 'isolate' } }, 'css-many'),
    ).toContain('{scroll-snap-type:x mandatory;object-position:top;isolation:isolate}');
  });

  it('spells a vendor prefix the way React does, and a hyphenated or custom name as it stands', () => {
    expect(generatedRulesFor({ css: { WebkitLineClamp: 2, MozAppearance: 'none', msOverflowStyle: 'none' } }, 'css-vendor')).toContain(
      '{-webkit-line-clamp:2;-moz-appearance:none;-ms-overflow-style:none}',
    );
    expect(generatedRulesFor({ css: { 'mix-blend-mode': 'screen', '--rows': 3 } as Css.Declarations }, 'css-hyphen')).toContain(
      '{mix-blend-mode:screen;--rows:3}',
    );
  });

  // The value grammar is `vars`': one rule to learn, and the hatch stays themed.
  it('resolves a colour token, and a token with an opacity modifier, the way vars does', () => {
    expect(generatedRulesFor({ css: { outlineColor: 'sky-500', textDecorationColor: 'rose-400/60' } }, 'css-token')).toContain(
      '{outline-color:var(--sky-500);text-decoration-color:color-mix(in oklab, var(--rose-400) 60%, transparent)}',
    );
  });

  it('writes a number out as it stands — the unitless properties are the ones that take one', () => {
    expect(generatedRulesFor({ css: { zIndex: 3, lineHeight: 1.5, flexGrow: 2, opacity: 0.5 } }, 'css-number')).toContain(
      '{z-index:3;line-height:1.5;flex-grow:2;opacity:0.5}',
    );
  });

  it('nests in a pseudo-class, a breakpoint, a theme, a variant and a pseudo-element like any other prop', () => {
    expect(generatedRulesFor({ hover: { css: { mixBlendMode: 'multiply' } } }, 'css-hover')).toContain(
      '.hover-css-mixBlendMode-multiply:hover{mix-blend-mode:multiply}',
    );
    expect(generatedRulesFor({ md: { css: { objectPosition: 'top' } } }, 'css-md')).toContain(
      '.md-css-objectPosition-top{object-position:top}',
    );
    expect(generatedRulesFor({ theme: { dark: { css: { mixBlendMode: 'screen' } } } }, 'css-theme')).toContain(
      '@scope (.dark) to ([data-theme]){:scope .theme-dark-css-mixBlendMode-screen{mix-blend-mode:screen}}',
    );
    expect(generatedRulesFor({ dataAttr: { 'state=open': { css: { isolation: 'isolate' } } } }, 'css-variant')).toContain(
      '[data-state="open"]{isolation:isolate}',
    );
    expect(generatedRulesFor({ before: { css: { mixBlendMode: 'multiply' } } }, 'css-before')).toContain(
      '.before-css-mixBlendMode-multiply::before{mix-blend-mode:multiply}',
    );
  });

  it('starts from a css declaration too, marked important like every starting declaration', () => {
    // The class name is escaped for the selector — `(`, `)` and `%` are not identifier characters.
    expect(generatedRulesFor({ startingStyle: { css: { clipPath: 'inset(0 50%)', objectPosition: 'top' } } }, 'css-starting')).toContain(
      String.raw`@starting-style{.starting-css-clipPath-inset\(0_50\%\)_objectPosition-top{clip-path:inset(0 50%)!important;object-position:top!important}}`,
    );
  });

  // The reason it is declared last in the registry: the hatch is the override, so on one element it has to win.
  it('sorts after the typed prop, so it wins the property both name on the same element', () => {
    const engine = makeEngine('css-order');
    renderStyles(engine, { css: { padding: '3px 7px' }, p: 4 });

    const rules = ruleList(engine);

    expect(rules.indexOf('.p-4{padding:1rem}')).toBeGreaterThan(-1);
    expect(rules.indexOf('.css-padding-3px_7px{padding:3px 7px}')).toBeGreaterThan(rules.indexOf('.p-4{padding:1rem}'));
  });

  it('shares one rule between two Boxes writing the same object', () => {
    const engine = makeEngine('css-shared');
    const first = renderStyles(engine, { css: { mixBlendMode: 'multiply' } });
    const second = renderStyles(engine, { css: { mixBlendMode: 'multiply' }, p: 4 });

    expect(second).toContain(first[first.length - 1]);
    expect(generatedRulesOf(engine).match(/mix-blend-mode/g)).toHaveLength(1);
  });

  it('is a step of a keyframes sequence like any other prop', () => {
    const engine = makeEngine('css-keyframes');
    engine.keyframes({ tilt: { from: { css: { rotate: '0deg' } }, to: { css: { rotate: '3deg' } } } });
    renderStyles(engine, { animationName: 'tilt' });

    expect(generatedRulesOf(engine)).toContain('@keyframes tilt{from{rotate:0deg}to{rotate:3deg}}');
  });

  // A value ending its own declaration would let the rest of the string be read as CSS, so the entry is
  // refused — that entry, not the record — and a record with nothing usable in it produces no class at all.
  it('drops an entry that could break out of the rule, or whose name is not a property name', () => {
    const engine = makeEngine('css-injection');
    const classNames = renderStyles(engine, {
      // Through `unknown`, because csstype types this one as a closed set — the runtime check is what is under test.
      css: { isolation: 'isolate', mixBlendMode: 'red;}body{display:none', 'bad name': 'x', '': 'y' } as unknown as Css.Declarations,
    });

    expect(classNames.filter((name) => name.startsWith('css-'))).toHaveLength(1);
    expect(generatedRulesOf(engine)).toContain('{isolation:isolate}');
    expect(generatedRulesOf(engine)).not.toContain('display:none');
    expect(renderStyles(makeEngine('css-empty'), { css: {} }).filter((name) => name.startsWith('css-'))).toEqual([]);
    expect(renderStyles(makeEngine('css-all-bad'), { css: { color: 'a;b' } }).filter((name) => name.startsWith('css-'))).toEqual([]);
  });

  it('is typed as far as csstype can take it', () => {
    // A number is written out as it stands, so a length refuses one — `width:100` is not CSS — while a
    // unitless property takes it and every property name autocompletes.
    const typed: BoxStyleProps = { css: { zIndex: 3, width: 0, mixBlendMode: 'multiply', display: 'contents' } };
    // @ts-expect-error — a length wants its unit written out.
    const untyped: BoxStyleProps = { css: { width: 100 } };
    // @ts-expect-error — a property csstype does not know is a typo until proven otherwise.
    const misspelt: BoxStyleProps = { css: { mixBlendMod: 'multiply' } };

    expect([typed, untyped, misspelt]).toHaveLength(3);
  });
});

describe('Css.toPropertyName', () => {
  it.each([
    ['backgroundColor', 'background-color'],
    ['WebkitLineClamp', '-webkit-line-clamp'],
    ['MozAppearance', '-moz-appearance'],
    ['msOverflowStyle', '-ms-overflow-style'],
    ['color', 'color'],
    ['background-color', 'background-color'],
    ['--rows', '--rows'],
  ])('%s → %s', (name, expected) => {
    expect(Css.toPropertyName(name)).toBe(expected);
  });
});
