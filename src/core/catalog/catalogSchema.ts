/**
 * One prop's registry entry as JSON Schema. The registry is the authority on what a prop accepts, so the
 * schema is read off it rather than written down — a value added to a prop is in the catalog the moment it
 * is in the library, and a prop added by `Box.extend()` needs no regeneration at all.
 */
import Anchors from '../anchors';
import { BoxStyle, BoxStyleValue } from '../coreTypes';
import Palette from '../palette';
import Variables from '../variables';
import { CatalogSchema } from './catalogTypes';

/** A character that would otherwise mean something in a regular expression, so an alternation stays one. */
function escape(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\/-]/g, '\\$&');
}

/** `0`–`100`, the range `Palette.alphaOf` checks — the opacity half of `blue-500/40`. */
const ALPHA = String.raw`(?:100|\d{1,2}(?:\.\d+)?)`;

/** How many of an open prop's listed values are kept as illustration — a hint, not the list. */
const EXAMPLES = 8;

/**
 * A grammar a `match` stands for, as a pattern. A definition carrying one has a template `values`, so
 * `typeof` alone would take every string and the catalog would promise nothing — which is the whole point
 * of a generated UI that cannot invent a colour. Keyed by the predicate itself, so renaming one is caught
 * by the tests that assert the pattern rather than silently widening the prop back to `string`.
 */
const grammars: [(value: BoxStyleValue) => boolean, string, string[]][] = [
  [Variables.isPercentString, String.raw`^-?\d+(?:\.\d+)?%$`, ['50%', '-25%']],
  [Variables.isRatio, String.raw`^\d+(?:\.\d+)?\/\d+(?:\.\d+)?$`, ['4/3', '16/9']],
  [Variables.isReference, String.raw`^(?:url\(#[^)]+\)|var\(--[^)]+\))$`, ['url(#sky)', 'var(--chart-1)']],
  [Anchors.isSizeValue, String.raw`^anchor-size\([^)]+\)$`, ['anchor-size(width)']],
  [Anchors.isInsetValue, String.raw`^anchor\([^)]+\)$`, ['anchor(bottom)']],
];

/** What one definition contributes: its listed values, and whether it opens the prop up beyond them. */
interface Contribution {
  enums: BoxStyleValue[];
  numeric: boolean;
  patterns: [string, string[]][];
  /** A definition with neither a list nor a grammar: the prop takes any string, and cannot be constrained. */
  open: boolean;
  object: boolean;
}

function contribute(definitions: BoxStyle[]): Contribution {
  const contribution: Contribution = { enums: [], numeric: false, patterns: [], open: false, object: false };

  for (const definition of definitions) {
    const { values, match } = definition;
    const grammar = match && grammars.find(([predicate]) => predicate === match);

    if (Array.isArray(values)) contribution.enums.push(...(values as BoxStyleValue[]));
    else if (values === 0) contribution.numeric = true;
    else if (grammar) contribution.patterns.push([grammar[1], grammar[2]]);
    else if (typeof values === 'object' && values !== null) contribution.object = true;
    else if (typeof values === 'string') contribution.open = true;
  }

  return contribution;
}

/** A list of values as the narrowest schema that holds them: one type where they share one, a union otherwise. */
function fromEnum(values: BoxStyleValue[]): CatalogSchema {
  const members = [...new Set(values.filter((value) => typeof value !== 'object') as (string | number | boolean)[])];
  const types = new Set(members.map((member) => typeof member));

  return types.size === 1 ? { type: [...types][0] as 'string', enum: members } : { enum: members };
}

/**
 * An alternation of names, with the families folded back up: 295 literals become `(?:red|…|slate)-(?:50|…
 * |950)` plus the keywords. Twelve times shorter, and it is also the readable form — a generator reading
 * the pattern sees the palette's shape rather than a wall of tokens.
 */
function alternation(names: string[]): string {
  const steps = new Set<string>(Palette.steps.map(String));
  const families = new Map<string, string[]>();
  const rest: string[] = [];

  for (const name of names) {
    const cut = name.lastIndexOf('-');
    const step = cut > 0 && name.slice(cut + 1);

    if (step && steps.has(step)) families.set(name.slice(0, cut), [...(families.get(name.slice(0, cut)) ?? []), step]);
    else rest.push(name);
  }

  // Grouped by the steps a family actually has, so a family with a step missing is still exact.
  const groups = new Map<string, string[]>();

  for (const [family, own] of families) groups.set(own.join('|'), [...(groups.get(own.join('|')) ?? []), family]);

  return [...[...groups].map(([own, group]) => `(?:${group.map(escape).join('|')})-(?:${own})`), ...rest.map(escape)].join('|');
}

/** Whether a prop takes colours: the one family whose listed values and whose grammar are the same names. */
export function isColor(definitions: BoxStyle[]): boolean {
  return definitions.some((definition) => definition.match === Palette.isAlpha);
}

/**
 * Every colour a colour prop accepts, as one schema: the palette and `Box.extend()`'s variables, each of
 * them optionally carrying the opacity modifier. Shared through a component's `$defs` rather than repeated
 * on all twenty-six colour props — inlined, one component serialized to 112 KB of the same alternation.
 */
export function color(colors: string[]): CatalogSchema {
  return {
    type: 'string',
    pattern: `^(?:${alternation(colors)})(?:\\/${ALPHA})?$`,
    examples: ['sky-500', 'blue-500/40'],
    description: 'A palette token, optionally with an opacity: `blue-500/40`.',
  };
}

/**
 * The schema for one prop. A colour prop is `$ref`-ed at the component that holds it, so the names are not
 * this function's business; everything else is read straight off what the registry accepts.
 */
export function styleProp(definitions: BoxStyle[], description?: string): CatalogSchema {
  const { enums, numeric, patterns, open, object } = contribute(definitions);
  const prose = description ? { description } : {};
  const strings = enums.filter((value) => typeof value === 'string') as string[];
  const alternatives: CatalogSchema[] = [];

  // An open definition takes every string, so it swallows the listed values and the grammars beside it: an
  // `anyOf` still holding those would read as a constraint the prop does not have. They stay as `examples`,
  // which is what a list is once it has stopped being exhaustive.
  if (open) {
    const rest = enums.filter((value) => typeof value !== 'string');

    alternatives.push({ type: 'string', ...(strings.length ? { examples: strings.slice(0, EXAMPLES) } : {}) });
    if (rest.length) alternatives.push(fromEnum(rest));
  } else {
    if (enums.length) alternatives.push(fromEnum(enums));
    for (const [pattern, examples] of patterns) alternatives.push({ type: 'string', pattern, examples });
  }

  if (numeric) alternatives.push({ type: 'number' });
  if (object) alternatives.push({ type: 'object' });

  if (!alternatives.length) return { ...prose };
  if (alternatives.length === 1) return { ...alternatives[0], ...prose };

  return { anyOf: alternatives, ...prose };
}
