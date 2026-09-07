import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';
import { generatedRulesOf, makeEngine, renderStyles } from '../../dev/engineHarness';
import { BoxStyleProps } from '../types';
import { cssStyles } from './boxStyles';
import { BoxStyle, BoxStyleValue } from './coreTypes';

/**
 * The numeric formatters are the library's commonest surprise: three dividers are in play and nothing but
 * these tests pins them down. Each family states its divider once and holds every prop that belongs to
 * it, so a prop that changes family fails here.
 */
const spacingDivider4 = [
  ['p', 'padding'],
  ['px', 'padding-inline'],
  ['py', 'padding-block'],
  ['pt', 'padding-top'],
  ['pr', 'padding-right'],
  ['pb', 'padding-bottom'],
  ['pl', 'padding-left'],
  ['m', 'margin'],
  ['mx', 'margin-inline'],
  ['my', 'margin-block'],
  ['mt', 'margin-top'],
  ['mr', 'margin-right'],
  ['mb', 'margin-bottom'],
  ['ml', 'margin-left'],
  ['gap', 'gap'],
  ['rowGap', 'row-gap'],
  ['columnGap', 'column-gap'],
  ['top', 'top'],
  ['right', 'right'],
  ['bottom', 'bottom'],
  ['left', 'left'],
  ['inset', 'inset'],
  ['width', 'width'],
  ['minWidth', 'min-width'],
  ['maxWidth', 'max-width'],
  ['height', 'height'],
  ['minHeight', 'min-height'],
  ['maxHeight', 'max-height'],
  ['borderRadius', 'border-radius'],
] as const;

const pixelDirect = [
  ['b', 'border-width'],
  ['bx', 'border-inline-width'],
  ['by', 'border-block-width'],
  ['bt', 'border-top-width'],
  ['br', 'border-right-width'],
  ['bb', 'border-bottom-width'],
  ['bl', 'border-left-width'],
  ['lineHeight', 'line-height'],
  ['letterSpacing', 'letter-spacing'],
  ['outlineOffset', 'outline-offset'],
] as const;

const unitlessNumber = [
  ['flexGrow', 'flex-grow'],
  ['flexShrink', 'flex-shrink'],
  ['order', 'order'],
  ['gridColumnStart', 'grid-column-start'],
  ['gridColumnEnd', 'grid-column-end'],
  ['gridRowStart', 'grid-row-start'],
  ['gridRowEnd', 'grid-row-end'],
] as const;

function generatedRulesFor(props: BoxStyleProps, engineId: string) {
  const engine = makeEngine(engineId);
  renderStyles(engine, props);

  return generatedRulesOf(engine);
}

describe('numeric dividers', () => {
  describe('spacing scale — divider 4, so 4 is 1rem', () => {
    it.each(spacingDivider4)('%s emits %s divided by 4', (prop, styleName) => {
      expect(generatedRulesFor({ [prop]: 4 }, `divider4-${prop}`)).toContain(`{${styleName}:1rem}`);
      expect(generatedRulesFor({ [prop]: 2 }, `divider4-half-${prop}`)).toContain(`{${styleName}:0.5rem}`);
    });
  });

  describe('direct pixels — the number is the pixel count', () => {
    it.each(pixelDirect)('%s emits %s in px', (prop, styleName) => {
      expect(generatedRulesFor({ [prop]: 1 }, `px-${prop}`)).toContain(`{${styleName}:1px}`);
      expect(generatedRulesFor({ [prop]: 24 }, `px-24-${prop}`)).toContain(`{${styleName}:24px}`);
    });
  });

  it('emits an outline width with the style that makes it draw', () => {
    // Not in the list above: a width alone draws nothing, so the prop declares `solid` beside it (bug #54).
    expect(generatedRulesFor({ outline: 2 }, 'px-outline')).toContain('{outline-width:2px;outline-style:solid}');
  });

  describe('unitless numbers — passed through as declared', () => {
    it.each(unitlessNumber)('%s emits %s unitless', (prop, styleName) => {
      expect(generatedRulesFor({ [prop]: 2 }, `raw-${prop}`)).toContain(`{${styleName}:2}`);
    });

    it('keeps fontWeight unitless', () => {
      expect(generatedRulesFor({ fontWeight: 600 }, 'raw-fontWeight')).toContain('{font-weight:600}');
    });
  });

  describe('fontSize — divider 16, so the number is roughly the pixel size', () => {
    it('divides by 16 rather than by the spacing divider', () => {
      expect(generatedRulesFor({ fontSize: 16 }, 'fontSize-16')).toContain('{font-size:1rem}');
      expect(generatedRulesFor({ fontSize: 14 }, 'fontSize-14')).toContain('{font-size:0.875rem}');
      expect(generatedRulesFor({ fontSize: 4 }, 'fontSize-4')).toContain('{font-size:0.25rem}');
    });
  });

  describe('borderRadius belongs to the spacing scale, not to the pixel family', () => {
    // Called out on its own because it is the prop the docs have historically got wrong.
    it.each([
      ['borderRadius', 'border-radius'],
      ['borderRadiusTopLeft', 'border-top-left-radius'],
    ])('%s divides by 4', (prop, styleName) => {
      expect(generatedRulesFor({ [prop]: 8 }, `radius-${prop}`)).toContain(`{${styleName}:2rem}`);
    });
  });

  describe('fraction and keyword sizes', () => {
    it('converts fraction tokens to percentages', () => {
      expect(generatedRulesFor({ width: '1/2' }, 'frac-width')).toContain('{width:50%}');
      expect(generatedRulesFor({ p: '1/3' }, 'frac-p')).toContain(`{padding:${(1 / 3) * 100}%}`);
    });

    it('accepts negative fractions on the inset props', () => {
      // Only the inset and translate props declare the negative fraction scale; the spacing props
      // take negative numbers instead. See the roadmap bug ledger for that asymmetry.
      expect(generatedRulesFor({ top: '-1/4' }, 'frac-top')).toContain('{top:-25%}');
      expect(generatedRulesFor({ translateX: '-1/2' }, 'frac-translate')).toContain(
        '{--boxTranslateX:-50%;translate:var(--boxTranslateX, 0) var(--boxTranslateY, 0)}',
      );
      expect(generatedRulesFor({ mt: -4 }, 'neg-mt')).toContain('{margin-top:-1rem}');
    });

    it('maps the size keywords', () => {
      expect(generatedRulesFor({ width: 'fit' }, 'kw-width-fit')).toContain('{width:100%}');
      expect(generatedRulesFor({ width: 'fit-screen' }, 'kw-width-screen')).toContain('{width:100vw}');
      expect(generatedRulesFor({ height: 'fit-screen' }, 'kw-height-screen')).toContain('{height:100vh}');
    });

    it('accepts a raw percentage string', () => {
      expect(generatedRulesFor({ width: '33%' }, 'pct-width')).toContain('{width:33%}');
    });
  });
});

/**
 * Every value a prop declares must reach CSS. A definition whose `values` no longer match what
 * `generateRule` looks for produces no rule at all, silently, so this walks the whole registry.
 */

/**
 * Candidates offered to a definition that declares `match`: the walk uses the first one it says yes to,
 * which also proves the predicate accepts anything at all. A new `match` definition needs its shape here.
 */
const matchCandidates = [
  'url(#sample)',
  'var(--sample)',
  '50%',
  'none',
  4,
  { 'sample-var': 'red-500' },
  'linear(0,1)',
  'red-500/50',
  'sample',
  '16/9',
  // Last, so every definition already served keeps the candidate it was matching: a gradient is the one
  // record with a shape of its own, and `bgGradient` is the only definition that accepts it.
  { linear: 'r', colors: ['red-500', 'blue-500'] },
] as const;

/** A sample value as text, so a record reads as itself rather than as `[object Object]`. */
function label(value: unknown): string {
  return typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value);
}

/** A sample value as the class name the engine builds from it — records included. */
function classNameValue(value: unknown): string {
  if (Array.isArray(value)) return value.join('_');
  if (typeof value === 'object' && value !== null) {
    return Object.entries(value)
      .map(([name, entry]) => `${name}-${entry}`)
      .join('_');
  }

  return String(value);
}

/**
 * The declarations a definition is expected to emit. Normally its `styleName`s — an easing writes two of
 * them and still names one; a definition that writes its own and names none (`vars`, the translate axes)
 * builds the property names out of the value.
 */
function styleNamesOf(def: BoxStyle, prop: string, value: unknown): string[] {
  if (def.declarations && !def.styleName) {
    // Ask the definition what it writes rather than guessing: its property names come out of the value
    // (`vars`), or out of the definition itself (an outline's style, an axis of the composed `translate`).
    return def
      .declarations(value as BoxStyleValue, (name) => `var(--${name})`)
      .split(';')
      .map((declaration) => declaration.split(':')[0]);
  }

  return Array.isArray(def.styleName) ? def.styleName : [def.styleName ?? prop];
}

function sampleFor(def: BoxStyle): { value: unknown; label: string } | undefined {
  const values = def.values as unknown;

  if (def.match) {
    const accepted = matchCandidates.find((candidate) => def.match?.(candidate));

    return accepted === undefined ? undefined : { value: accepted, label: `match ${label(accepted)}` };
  }

  if (typeof values === 'number') return { value: 4, label: 'number' };
  if (typeof values === 'string') return { value: '50%', label: 'percent string' };

  if (Array.isArray(values)) {
    if (values.length === 0) return undefined;

    if (Array.isArray(values[0])) {
      const tuple = (values as unknown[][]).map((allowed) => allowed[0]);

      return { value: tuple, label: `tuple ${tuple.join('_')}` };
    }

    return { value: values[0], label: `${values[0]}` };
  }

  return undefined;
}

const definitions = Object.entries(cssStyles).flatMap(([prop, defs]) =>
  (defs as BoxStyle[]).map((def, index) => {
    const sample = sampleFor(def);

    return { prop, index, sample, styleNames: styleNamesOf(def, prop, sample?.value) };
  }),
);

describe('every declared prop value produces a rule', () => {
  // This number used to be the eleventh hand-written copy of the figure, which is how C5 raised it here
  // and left the npm description claiming 165 (bug #114) — the first drift being bug #71's '~144' against
  // a registry of 117. The ten copies are read out of the files now, so adding a prop fails until they agree.
  const PROP_COUNT = 212;

  // A file that stops quoting the figure fails too, so a rewording is noticed rather than silently exempt.
  const quotingFiles = [
    'README.md',
    'AGENTS.md',
    'CONTRIBUTING.md',
    'ARTICLE.md',
    'package.json',
    'src/BOX_KITE_AI_CONTEXT.md',
    '.claude/skills/box-kite/SKILL.md',
    'marketplace-skill/skills/box-kite/SKILL.md',
    'pages/site/site.ts',
    'pages/pages/aiContextPage.tsx',
  ];

  // `186 typed CSS props`, `186 CSS properties`, `**186** props`: the number, any emphasis, then the noun.
  const quotedCount = /(\d{2,4})\**\s+(?:typed\s+)?(?:CSS\s+)?(?:propert(?:y|ies)|props?)\b/g;

  it('holds exactly the number of props the docs claim', () => {
    expect(Object.keys(cssStyles).length).toBe(PROP_COUNT);
    expect(definitions.length).toBeGreaterThan(PROP_COUNT);
  });

  it.each(quotingFiles)('%s quotes the count the registry holds', (file) => {
    const quoted = [...readFileSync(resolve(process.cwd(), file), 'utf8').matchAll(quotedCount)].map((match) => Number(match[1]));

    expect(quoted.length).toBeGreaterThan(0);
    expect([...new Set(quoted)]).toEqual([PROP_COUNT]);
  });

  it('declares at least one value definition for every prop', () => {
    expect(Object.entries(cssStyles).filter(([, defs]) => (defs as BoxStyle[]).length === 0)).toEqual([]);
  });

  it('produces a usable sample value for every definition', () => {
    expect(definitions.filter((d) => !d.sample).map((d) => `${d.prop}[${d.index}]`)).toEqual([]);
  });

  it.each(definitions.filter((d) => d.sample).map((d) => [`${d.prop}[${d.index}] = ${d.sample?.label}`, d] as const))(
    '%s',
    (_name, { prop, index, sample, styleNames }) => {
      const engine = makeEngine(`registry-${prop}-${index}`);
      const value = sample?.value;
      const classNames = renderStyles(engine, { [prop]: value } as BoxStyleProps);
      const rules = generatedRulesOf(engine);

      // A class name is only emitted when a rule backs it, so both halves must be present.
      expect(classNames).toContain(`${prop}-${classNameValue(value)}`);
      for (const styleName of styleNames) {
        expect(rules).toContain(`${styleName}:`);
      }
    },
  );
});

/**
 * The SVG paint and stroke tier: the numbers are user units rather than any of the dividers above, and
 * `vectorEffect` is the one prop in the registry that rewrites its own selector.
 */
describe('SVG paint and stroke props', () => {
  it.each([
    ['fill', 'red-500', 'fill:var(--red-500)'],
    ['stroke', 'blue-600', 'stroke:var(--blue-600)'],
    ['fillOpacity', 0.5, 'fill-opacity:0.5'],
    ['strokeOpacity', 0.8, 'stroke-opacity:0.8'],
    ['fillRule', 'evenodd', 'fill-rule:evenodd'],
    ['strokeLinecap', 'round', 'stroke-linecap:round'],
    ['strokeLinejoin', 'bevel', 'stroke-linejoin:bevel'],
    ['paintOrder', 'stroke', 'paint-order:stroke'],
    ['shapeRendering', 'crispEdges', 'shape-rendering:crispEdges'],
  ] as const)('%s emits %s', (prop, value, declaration) => {
    expect(generatedRulesFor({ [prop]: value }, `svg-${prop}`)).toContain(`{${declaration}}`);
  });

  describe('lengths are SVG user units — no divider, no unit', () => {
    it.each([
      ['strokeWidth', 'stroke-width'],
      ['strokeMiterlimit', 'stroke-miterlimit'],
      ['strokeDasharray', 'stroke-dasharray'],
      ['strokeDashoffset', 'stroke-dashoffset'],
    ] as const)('%s passes the number through', (prop, styleName) => {
      expect(generatedRulesFor({ [prop]: 2 }, `svg-unit-${prop}`)).toContain(`{${styleName}:2}`);
      expect(generatedRulesFor({ [prop]: 1.5 }, `svg-unit-half-${prop}`)).toContain(`{${styleName}:1.5}`);
    });

    it('takes a percentage of the path length for the dash offset', () => {
      expect(generatedRulesFor({ strokeDashoffset: '40%' }, 'svg-dashoffset-pct')).toContain('{stroke-dashoffset:40%}');
    });
  });

  describe('a dash pattern is a number or a string', () => {
    it('reads a single number as the dash and the gap alike', () => {
      expect(generatedRulesFor({ strokeDasharray: 8 }, 'svg-dash-number')).toContain('{stroke-dasharray:8}');
    });

    // A space in a value used to split the readable class name in two, so the class attribute held
    // neither of the names the rule was written for and the dashes never appeared.
    it('keeps a multi-length pattern in one class name', () => {
      const engine = makeEngine('svg-dash-pattern');
      const classNames = renderStyles(engine, { strokeDasharray: '8 4' });

      expect(classNames).toContain('strokeDasharray-8_4');
      expect(classNames.every((name) => !name.includes(' '))).toBe(true);
      expect(generatedRulesOf(engine)).toContain('.strokeDasharray-8_4{stroke-dasharray:8 4}');
    });
  });

  /**
   * Paint the document defines rather than this library: a gradient, a pattern, a variable a chart declared.
   * Before these definitions existed the only spelling was `props={{ fill: 'url(#sky)' }}` — an attribute,
   * and so outside the theme, the breakpoints and every pseudo-class.
   */
  describe('a paint server or a variable is a value, not an attribute', () => {
    it('passes a paint server through untouched', () => {
      const engine = makeEngine('svg-paint-server');
      const classNames = renderStyles(engine, { fill: 'url(#sky)' }, true);

      expect(classNames).toContain('fill-url(#sky)');
      expect(generatedRulesOf(engine)).toContain('{fill:url(#sky)}');
    });

    // The colour definition resolves its value to `var(--token)`, so a variable reaching that
    // definition would come out as `var(--var(--chart-1))`. It has to match this one instead.
    it('does not resolve a variable somebody else declared', () => {
      expect(generatedRulesFor({ stroke: 'var(--chart-1)' }, 'svg-paint-variable')).toContain('{stroke:var(--chart-1)}');
    });

    it('clips to a path the document defines', () => {
      expect(generatedRulesFor({ clipPath: 'url(#frame)' }, 'svg-clip-url')).toContain('{clip-path:url(#frame)}');
    });

    it('keeps the token lists working — they are matched first', () => {
      expect(generatedRulesFor({ fill: 'red-500' }, 'svg-paint-token')).toContain('{fill:var(--red-500)}');
      expect(generatedRulesFor({ clipPath: 'inset(50%)' }, 'svg-clip-inset')).toContain('{clip-path:inset(50%)}');
    });

    // The whole reason the definition carries a `match`: a scalar `values` is matched by `typeof`
    // alone, so without one every string would reach CSS verbatim (bug #31's shape).
    it.each(['banana', 'url(#a b)', 'url(#a)  url(#b)', 'var(x)', 'url(#)'])('emits nothing for %o', (value) => {
      const engine = makeEngine(`svg-paint-reject-${value}`);
      const classNames = renderStyles(engine, { fill: value } as BoxStyleProps, true);

      expect(classNames).toEqual(['_s']);
      expect(generatedRulesOf(engine)).toBe('');
    });

    it('nests under a pseudo-class and a theme like any other value', () => {
      expect(generatedRulesFor({ hover: { fill: 'url(#sky)' } }, 'svg-paint-hover')).toContain(
        String.raw`.hover-fill-url\(\#sky\):hover{fill:url(#sky)}`,
      );
      expect(generatedRulesFor({ theme: { dark: { fill: 'var(--chart-1)' } } }, 'svg-paint-theme')).toContain(
        String.raw`.dark .theme-dark-fill-var\(--chart-1\){fill:var(--chart-1)}`,
      );
    });
  });

  describe('vectorEffect reaches the shapes inside the element', () => {
    // vector-effect is the only SVG paint property that is not inherited, so a value on an <svg>
    // would otherwise style nothing at all.
    it('targets the element and its descendants', () => {
      const engine = makeEngine('svg-vector-effect');
      const classNames = renderStyles(engine, { vectorEffect: 'non-scaling-stroke' }, true);

      expect(classNames).toContain('vectorEffect-non-scaling-stroke');
      expect(generatedRulesOf(engine)).toContain(
        '.vectorEffect-non-scaling-stroke,.vectorEffect-non-scaling-stroke *{vector-effect:non-scaling-stroke}',
      );
    });

    it('keeps both halves of the selector under a pseudo-class', () => {
      expect(generatedRulesFor({ hover: { vectorEffect: 'non-scaling-stroke' } }, 'svg-vector-effect-hover')).toContain(
        '.hover-vectorEffect-non-scaling-stroke:hover,.hover-vectorEffect-non-scaling-stroke:hover *{vector-effect:non-scaling-stroke}',
      );
    });

    it('keeps both halves of the selector under a theme', () => {
      expect(generatedRulesFor({ theme: { dark: { vectorEffect: 'none' } } }, 'svg-vector-effect-theme')).toContain(
        '.dark .theme-dark-vectorEffect-none,.dark .theme-dark-vectorEffect-none *{vector-effect:none}',
      );
    });
  });

  it('nests under a theme, a pseudo-class and a breakpoint like any other prop', () => {
    expect(generatedRulesFor({ theme: { dark: { fill: 'slate-100' } } }, 'svg-theme')).toContain(
      '.dark .theme-dark-fill-slate-100{fill:var(--slate-100)}',
    );
    expect(generatedRulesFor({ hover: { stroke: 'red-500' } }, 'svg-hover')).toContain(
      '.hover-stroke-red-500:hover{stroke:var(--red-500)}',
    );
    expect(generatedRulesFor({ md: { strokeWidth: 3 } }, 'svg-breakpoint')).toContain('.md-strokeWidth-3{stroke-width:3}');
  });
});

/**
 * The SVG text and geometry tier. The geometry props are the reason it exists: they are real CSS in SVG 2,
 * so a shape transitions with no JavaScript — but only while the numbers stay in the user units the
 * `viewBox` sets up, which three of the four numeric families here would break.
 */
describe('SVG text and geometry props', () => {
  describe('geometry lengths are user units — no divider, no unit', () => {
    it.each([['cx'], ['cy'], ['r'], ['rx'], ['ry'], ['x'], ['y']] as const)('%s passes the number through', (prop) => {
      expect(generatedRulesFor({ [prop]: 12 }, `svg-geom-${prop}`)).toContain(`{${prop}:12}`);
      expect(generatedRulesFor({ [prop]: 0.5 }, `svg-geom-half-${prop}`)).toContain(`{${prop}:0.5}`);
    });

    it.each([['cx'], ['cy'], ['r'], ['rx'], ['ry'], ['x'], ['y']] as const)('%s takes a percentage of the viewport', (prop) => {
      expect(generatedRulesFor({ [prop]: '50%' }, `svg-geom-pct-${prop}`)).toContain(`{${prop}:50%}`);
    });

    // A rect can sit left of or above its viewBox origin, so the geometry props are the only
    // numeric family besides the inset props that has to survive a minus sign in a class name.
    it.each([['x'], ['y'], ['cx'], ['cy']] as const)('%s accepts a negative position', (prop) => {
      const engine = makeEngine(`svg-geom-neg-${prop}`);
      const classNames = renderStyles(engine, { [prop]: -8 });

      expect(classNames).toContain(`${prop}--8`);
      expect(generatedRulesOf(engine)).toContain(`.${prop}--8{${prop}:-8}`);
    });

    it('lets a rect corner radius follow the other axis', () => {
      expect(generatedRulesFor({ rx: 'auto' }, 'svg-rx-auto')).toContain('{rx:auto}');
      expect(generatedRulesFor({ ry: 'auto' }, 'svg-ry-auto')).toContain('{ry:auto}');
    });

    // borderRadius is on the spacing scale (÷4) and rx is not. They read alike and mean different
    // numbers, which is exactly the confusion the user-units rule exists to prevent.
    it('does not share the spacing scale with borderRadius', () => {
      expect(generatedRulesFor({ borderRadius: 8, rx: 8 }, 'svg-rx-vs-radius')).toContain('{rx:8}');
      expect(generatedRulesFor({ borderRadius: 8, rx: 8 }, 'svg-rx-vs-radius2')).toContain('{border-radius:2rem}');
    });
  });

  it('anchors text against the position its element declares', () => {
    expect(generatedRulesFor({ textAnchor: 'middle' }, 'svg-text-anchor')).toContain('{text-anchor:middle}');
    expect(generatedRulesFor({ textAnchor: 'end' }, 'svg-text-anchor-end')).toContain('{text-anchor:end}');
  });

  describe('dominantBaseline reaches the text inside the element', () => {
    // dominant-baseline is the second SVG property CSS does not inherit (vectorEffect is the
    // other), so a value on an <svg> would otherwise style nothing at all.
    it('targets the element and its descendants', () => {
      const engine = makeEngine('svg-dominant-baseline');
      const classNames = renderStyles(engine, { dominantBaseline: 'central' }, true);

      expect(classNames).toContain('dominantBaseline-central');
      expect(generatedRulesOf(engine)).toContain('.dominantBaseline-central,.dominantBaseline-central *{dominant-baseline:central}');
    });

    it('keeps both halves of the selector under a pseudo-class and a theme', () => {
      expect(generatedRulesFor({ hover: { dominantBaseline: 'hanging' } }, 'svg-baseline-hover')).toContain(
        '.hover-dominantBaseline-hanging:hover,.hover-dominantBaseline-hanging:hover *{dominant-baseline:hanging}',
      );
      expect(generatedRulesFor({ theme: { dark: { dominantBaseline: 'middle' } } }, 'svg-baseline-theme')).toContain(
        '.dark .theme-dark-dominantBaseline-middle,.dark .theme-dark-dominantBaseline-middle *{dominant-baseline:middle}',
      );
    });
  });

  it('moves geometry under a pseudo-class, which is the whole zero-JS animation', () => {
    expect(generatedRulesFor({ r: 20, hover: { r: 28 } }, 'svg-grow')).toContain('.hover-r-28:hover{r:28}');
    expect(generatedRulesFor({ md: { cx: 40 } }, 'svg-geom-breakpoint')).toContain('.md-cx-40{cx:40}');
  });
});

/**
 * The one prop whose declarations are named by its value. Everything else about it is ordinary, which is
 * the point: it lands in a class, so it nests in a theme and a breakpoint and two subtrees share one rule.
 */
describe('vars — a CSS variable is a Box prop', () => {
  it('declares a custom property, resolving a colour token to the variable behind it', () => {
    const engine = makeEngine('vars-colour');
    const classNames = renderStyles(engine, { vars: { 'color-revenue': 'sky-500' } });

    expect(classNames).toContain('vars-color-revenue-sky-500');
    expect(generatedRulesOf(engine)).toContain('.vars-color-revenue-sky-500{--color-revenue:var(--sky-500)}');
  });

  it('writes any other value out as it stands, and takes several at once', () => {
    expect(generatedRulesFor({ vars: { 'chart-gap': '4px', 'chart-rows': 3, 'color-x': 'var(--chart-1)' } }, 'vars-many')).toContain(
      '{--chart-gap:4px;--chart-rows:3;--color-x:var(--chart-1)}',
    );
  });

  it('accepts a name spelled with its leading --', () => {
    expect(generatedRulesFor({ vars: { '--color-x': 'emerald-500' } }, 'vars-prefixed')).toContain('{--color-x:var(--emerald-500)}');
  });

  // The reason the whole step needs no second styling system: the variables a chart reads flip with
  // the theme through the same ancestor-scoped selector every other prop uses.
  it('flips with the theme and with a breakpoint', () => {
    expect(generatedRulesFor({ theme: { dark: { vars: { 'color-x': 'sky-400' } } } }, 'vars-theme')).toContain(
      '.dark .theme-dark-vars-color-x-sky-400{--color-x:var(--sky-400)}',
    );
    expect(generatedRulesFor({ md: { vars: { 'chart-gap': '8px' } } }, 'vars-breakpoint')).toContain(
      '.md-vars-chart-gap-8px{--chart-gap:8px}',
    );
  });

  it('shares one rule between two Boxes declaring the same variables', () => {
    const engine = makeEngine('vars-shared');
    const first = renderStyles(engine, { vars: { 'color-x': 'rose-500' } });
    const second = renderStyles(engine, { vars: { 'color-x': 'rose-500' }, p: 4 });

    expect(second).toContain(first[first.length - 1]);
    expect(generatedRulesOf(engine).match(/--color-x/g)).toHaveLength(1);
  });

  // A value ending its own declaration would let the rest of the string be read as CSS, so the
  // definition refuses it — and an unmatched value produces no class name either.
  it('refuses a value that could break out of the rule, and a name that is not an identifier', () => {
    const engine = makeEngine('vars-injection');
    const classNames = renderStyles(engine, { vars: { 'color-x': 'red;}body{display:none' } });

    expect(classNames.filter((name) => name.startsWith('vars-'))).toEqual([]);
    expect(generatedRulesOf(engine)).not.toContain('display:none');
    expect(renderStyles(makeEngine('vars-bad-name'), { vars: { 'color x': 'red-500' } }).filter((n) => n.startsWith('vars-'))).toEqual([]);
  });
});

/**
 * The animation and transition family: times are milliseconds, `transition` names a group of properties
 * rather than one, and the transform props are longhands so two of them compose instead of colliding.
 */
describe('animation and transition props', () => {
  const composedTranslate = 'translate:var(--boxTranslateX, 0) var(--boxTranslateY, 0)';

  it.each([
    ['animationDuration', 'animation-duration'],
    ['animationDelay', 'animation-delay'],
    ['transitionDelay', 'transition-delay'],
  ])('%s is a number of milliseconds', (prop, styleName) => {
    expect(generatedRulesFor({ [prop]: 1100 }, `ms-${prop}`)).toContain(`{${styleName}:1100ms}`);
  });

  it('expands a transition group into the properties it stands for', () => {
    expect(generatedRulesFor({ transition: 'colors' }, 'transition-colors')).toContain(
      '{transition-property:color, background-color, border-color, outline-color, text-decoration-color, fill, stroke}',
    );
    expect(generatedRulesFor({ transition: 'transform' }, 'transition-transform')).toContain(
      '{transition-property:transform, translate, rotate, scale}',
    );
    expect(generatedRulesFor({ transition: 'all' }, 'transition-all')).toContain('{transition-property:all}');
  });

  it('takes a computed easing curve beside the keywords', () => {
    expect(generatedRulesFor({ transitionTimingFunction: 'cubic-bezier(0.4,0,0.6,1)' }, 'easing-bezier')).toContain(
      '{transition-timing-function:cubic-bezier(0.4,0,0.6,1)}',
    );
    // A `linear()` curve is a value, not a special case — and the one easing that carries a fallback under it.
    expect(generatedRulesFor({ animationTimingFunction: 'linear(0,0.5,1)' }, 'easing-linear')).toContain(
      '{animation-timing-function:ease-out;animation-timing-function:linear(0,0.5,1)}',
    );
  });

  /**
   * A spring is a curve and a duration, and both props take the same four names. The curve is sampled
   * once per name; the duration is in `--transitionTime` units, so reduced motion stops a spring too.
   */
  describe('spring presets', () => {
    it('writes the sampled curve, with ease-out underneath it for the browsers without linear()', () => {
      const rule = generatedRulesFor({ transitionTimingFunction: 'spring-snappy' }, 'spring-curve');

      expect(rule).toContain('{transition-timing-function:ease-out;transition-timing-function:linear(0,0.074,');
      expect(rule).toContain(',1.008,1)}');
    });

    it.each([
      ['spring', '2.16'],
      ['spring-gentle', '2.64'],
      ['spring-bouncy', '3.52'],
      ['spring-snappy', '1.68'],
    ] as const)('%s takes %s of --transitionTime to settle', (name, units) => {
      expect(generatedRulesFor({ transitionDuration: name }, `spring-duration-${name}`)).toContain(
        `{transition-duration:calc(${units} * var(--transitionTime))}`,
      );
      expect(generatedRulesFor({ animationDuration: name }, `spring-animation-${name}`)).toContain(
        `{animation-duration:calc(${units} * var(--transitionTime))}`,
      );
    });

    it('leaves a duration in milliseconds alone, spring or not', () => {
      expect(generatedRulesFor({ transitionDuration: 580 }, 'ms-transitionDuration')).toContain('{transition-duration:580ms}');
    });

    it('is one shared class per name, whatever names it', () => {
      const engine = makeEngine('spring-shared');
      const classNames = renderStyles(engine, { transitionTimingFunction: 'spring-bouncy', animationTimingFunction: 'spring-bouncy' });

      expect(classNames).toEqual(['_b', 'transitionTimingFunction-spring-bouncy', 'animationTimingFunction-spring-bouncy']);
    });
  });

  // The template type rejects it at compile time too — the cast is what a JavaScript caller does.
  it('refuses an easing that is not one', () => {
    const engine = makeEngine('easing-typo');
    const classNames = renderStyles(engine, { transitionTimingFunction: 'cubic-bezierish' } as unknown as BoxStyleProps);

    expect(classNames).toEqual(['_b']);
    expect(generatedRulesOf(engine)).not.toContain('cubic-bezierish');
  });

  it('composes the two translate axes, which used to overwrite each other', () => {
    const engine = makeEngine('translate-composition');
    const classNames = renderStyles(engine, { translateX: 4, translateY: -2 });
    const rules = generatedRulesOf(engine);

    expect(classNames).toEqual(['_b', 'translateX-4', 'translateY--2']);
    expect(rules).toContain(`.translateX-4{--boxTranslateX:1rem;${composedTranslate}}`);
    expect(rules).toContain(`.translateY--2{--boxTranslateY:-0.5rem;${composedTranslate}}`);
  });

  it('keeps scale and rotate on their own properties, so a transform is three independent props', () => {
    expect(generatedRulesFor({ scale: 1.05 }, 'scale-up')).toContain('{scale:1.05}');
    expect(generatedRulesFor({ rotate: 360 }, 'rotate-full')).toContain('{rotate:360deg}');
  });

  it('lets the properties that cannot interpolate transition anyway', () => {
    // `display` and `overlay` flip at the *end* of the transition instead of the start, which is what
    // holds a top-layer element in the DOM long enough to animate out of it.
    expect(generatedRulesFor({ transitionBehavior: 'allow-discrete' }, 'behavior-discrete')).toContain(
      '{transition-behavior:allow-discrete}',
    );
  });

  it('opts a subtree into interpolating a size keyword, which is what makes height: auto animate', () => {
    // Inherited, so it belongs on the container: every size inside it becomes animatable at once.
    expect(generatedRulesFor({ interpolateSize: 'allow-keywords' }, 'interpolate-size')).toContain('{interpolate-size:allow-keywords}');
  });
});

/**
 * What a value list accepts, and what it must not. Three of these props were an unvalidated catch-all —
 * `values` is a plain string, and a scalar `values` is matched by `typeof` alone.
 */
describe('what a value list accepts', () => {
  it('takes a percentage on the props that declare one', () => {
    expect(generatedRulesFor({ width: '50%' }, 'percent-width')).toContain('{width:50%}');
    expect(generatedRulesFor({ mt: '-12.5%' }, 'percent-negative')).toContain('{margin-top:-12.5%}');
  });

  it('emits nothing for a string that is not a percentage', () => {
    // It used to reach CSS verbatim — `width="banana"` became `width:banana` (bug #31). TypeScript
    // already rejected it, so what this closes is the JS consumer and the cast.
    const engine = makeEngine('percent-invalid');

    expect(renderStyles(engine, { width: 'banana' } as unknown as BoxStyleProps)).toEqual(['_b']);
    expect(generatedRulesOf(engine)).toBe('');
  });

  it('takes a negative fraction on a margin, the way the inset props already did', () => {
    // The spacing props took negative *numbers* and rejected `-1/4`, an asymmetry nothing announced (#32).
    expect(generatedRulesFor({ mt: '-1/4' }, 'negative-fraction-mt')).toContain('{margin-top:-25%}');
    expect(generatedRulesFor({ mx: '-1/2' }, 'negative-fraction-mx')).toContain('{margin-inline:-50%}');
  });

  it('takes a system colour on a colour prop, unformatted', () => {
    // Keywords rather than tokens: the one palette a forced-colors mode keeps, so `var(--ButtonText)`
    // would be exactly wrong (bug #65).
    expect(generatedRulesFor({ bgColor: 'ButtonFace' }, 'system-bg')).toContain('{background-color:ButtonFace}');
    expect(generatedRulesFor({ color: 'GrayText' }, 'system-color')).toContain('{color:GrayText}');
    expect(generatedRulesFor({ fill: 'CanvasText' }, 'system-fill')).toContain('{fill:CanvasText}');
  });

  it('keeps a dash array to lengths, so a list cannot become a rule of its own', () => {
    expect(generatedRulesFor({ strokeDasharray: '8 4' }, 'dash-valid')).toContain('{stroke-dasharray:8 4}');

    const engine = makeEngine('dash-invalid');
    expect(renderStyles(engine, { strokeDasharray: '8}html{display:none' } as BoxStyleProps)).toEqual(['_b']);
    expect(generatedRulesOf(engine)).toBe('');
  });
});
