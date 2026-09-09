import { BoxStyleValue } from './coreTypes';
import Variables from './variables';

/**
 * CSS anchor positioning: the grammar behind `anchorName`, `positionAnchor`, `positionArea` and the
 * `positionTry*` pair. A floating layer says which element it hangs off and which cell of the 3x3 grid
 * around it to sit in, and the browser does the placing — no measuring, no scroll listener, no state.
 *
 * The value sets here were measured in Chrome 152, not read off the spec: `position-area()` as a
 * fallback and `inset-area` as the property name are both absent, and a bare `anchor-name: a` is
 * rejected where `--a` is taken.
 */
namespace Anchors {
  /** An anchor's name, written with or without the `--` the way a `vars` key is. */
  export type Name = string;

  // `anchor-name` takes a `<dashed-ident>`, so the `--` is not optional in CSS — it is optional here,
  // and added on the way out. The rest is what the ident grammar takes.
  const anchorName = /^(--)?[a-zA-Z_][\w-]*$/;

  /** Whether a value may name an anchor — the `anchorName`/`positionAnchor` props' `match`. */
  export function isName(value: BoxStyleValue): boolean {
    return typeof value === 'string' && anchorName.test(value);
  }

  /** A name as CSS spells it: `trigger` and `--trigger` both reach `--trigger`, so a translation of the markup needs no second rule. */
  export function dashedName(value: string): string {
    return value.startsWith('--') ? value : `--${value}`;
  }

  /**
   * The six families of `position-area` keywords. A value is one keyword or two, and **the two have to
   * come from the same family**: `top inline-start` and `start left` are rejected by the browser, so they
   * are rejected here. `center` and `span-all` are neutral and belong to all of them.
   */
  const neutral = ['center', 'span-all'] as const;
  const physicalBlock = ['top', 'bottom', 'span-top', 'span-bottom'] as const;
  const physicalInline = ['left', 'right', 'span-left', 'span-right'] as const;
  const logicalBlock = ['block-start', 'block-end', 'span-block-start', 'span-block-end'] as const;
  const logicalInline = ['inline-start', 'inline-end', 'span-inline-start', 'span-inline-end'] as const;
  const selfBlock = ['self-block-start', 'self-block-end', 'span-self-block-start', 'span-self-block-end'] as const;
  const selfInline = ['self-inline-start', 'self-inline-end', 'span-self-inline-start', 'span-self-inline-end'] as const;
  const shorthand = ['start', 'end', 'span-start', 'span-end'] as const;
  const selfShorthand = ['self-start', 'self-end', 'span-self-start', 'span-self-end'] as const;
  const yAxis = ['y-start', 'y-end', 'span-y-start', 'span-y-end'] as const;
  const xAxis = ['x-start', 'x-end', 'span-x-start', 'span-x-end'] as const;

  type Neutral = (typeof neutral)[number];

  /**
   * One `position-area` value. Block axis first, inline axis second — the order `borderRadiusStartStart`
   * already reads in, and one order rather than both because `top left` and `left top` place a box
   * identically and would otherwise be two classes for one result.
   */
  export type Area =
    | Neutral
    | 'none'
    | (typeof physicalBlock)[number]
    | (typeof physicalInline)[number]
    | (typeof logicalBlock)[number]
    | (typeof logicalInline)[number]
    | (typeof selfBlock)[number]
    | (typeof selfInline)[number]
    | (typeof shorthand)[number]
    | (typeof selfShorthand)[number]
    | (typeof yAxis)[number]
    | (typeof xAxis)[number]
    | `${(typeof physicalBlock)[number] | Neutral} ${(typeof physicalInline)[number] | Neutral}`
    | `${(typeof logicalBlock)[number] | Neutral} ${(typeof logicalInline)[number] | Neutral}`
    | `${(typeof selfBlock)[number] | Neutral} ${(typeof selfInline)[number] | Neutral}`
    | `${(typeof shorthand)[number] | Neutral} ${(typeof shorthand)[number] | Neutral}`
    | `${(typeof selfShorthand)[number] | Neutral} ${(typeof selfShorthand)[number] | Neutral}`
    | `${(typeof yAxis)[number] | Neutral} ${(typeof xAxis)[number] | Neutral}`;

  // Each family as the pair of sides it allows, so a two-keyword value is checked against one row.
  const families: readonly [readonly string[], readonly string[]][] = [
    [physicalBlock, physicalInline],
    [logicalBlock, logicalInline],
    [selfBlock, selfInline],
    [shorthand, shorthand],
    [selfShorthand, selfShorthand],
    [yAxis, xAxis],
  ];

  const singles = new Set<string>(['none', ...neutral, ...families.flatMap(([block, inline]) => [...block, ...inline])]);

  /** Whether a value is a `position-area` — the prop's `match`, and the browser's own rule. */
  export function isArea(value: BoxStyleValue): boolean {
    if (typeof value !== 'string') return false;

    const parts = value.trim().split(/\s+/);
    if (parts.length === 1) return singles.has(parts[0]!);
    if (parts.length !== 2) return false;

    const [block, inline] = parts as [string, string];
    const isNeutral = (part: string) => (neutral as readonly string[]).includes(part);

    // A neutral keyword joins whichever family the other half names; two of them are `center span-all`.
    return families.some(([blockSide, inlineSide]) => {
      return (blockSide.includes(block) || isNeutral(block)) && (inlineSide.includes(inline) || isNeutral(inline));
    });
  }

  /** What `positionTryFallbacks` takes: the three flips, a `@position-try` name, or a list of either. */
  export type TryFallbacks = 'none' | Flip | `${Flip} ${Flip}` | (string & NonNullable<unknown>);

  type Flip = 'flip-block' | 'flip-inline' | 'flip-start';

  const flips = new Set(['flip-block', 'flip-inline', 'flip-start']);

  /**
   * Whether a value is a `position-try-fallbacks` list: comma-separated positions, each one flip
   * keywords or a `--name`. Validated because a name lands in rule text, and judged whole the way a
   * gradient is — one unusable position makes the order of the rest meaningless.
   */
  export function isTryFallbacks(value: BoxStyleValue): boolean {
    if (typeof value !== 'string') return false;

    const trimmed = value.trim();
    if (trimmed === 'none') return true;

    const positions = trimmed.split(',');

    return positions.every((position) => {
      const parts = position.trim().split(/\s+/).filter(Boolean);
      if (parts.length === 0) return false;

      // A dashed name is a whole position on its own; the flips are the only things that combine.
      return parts.length === 1 && parts[0]!.startsWith('--') ? anchorName.test(parts[0]!) : parts.every((part) => flips.has(part));
    });
  }

  /** What `anchor-size()` measures on the anchor. `block`/`inline` are the writing mode's axes. */
  const sizes = ['width', 'height', 'block', 'inline', 'self-block', 'self-inline'] as const;

  /** Which edge of the anchor an `anchor()` inset resolves to. `inside`/`outside` are relative to the layer's own side. */
  const insetSides = ['top', 'right', 'bottom', 'left', 'start', 'end', 'self-start', 'self-end', 'center', 'inside', 'outside'] as const;

  // An `anchor()` edge may also be a percentage along the anchor's side — `anchor(50%)` is its middle.
  const percentage = /^-?\d+(\.\d+)?%$/;

  /**
   * A length taken from the anchor: `anchor-size(width)` is how a popup matches its trigger without
   * measuring one. The anchor name and the fallback are both optional — `anchor-size(trigger width, 10rem)`
   * names an anchor other than `positionAnchor`'s and a length for when it has none.
   */
  export type SizeValue = `anchor-size(${(typeof sizes)[number]})` | `anchor-size(${string})`;

  /** One edge of the anchor as an inset: `top="anchor(bottom)"` puts the layer's top on the anchor's bottom. */
  export type InsetValue = `anchor(${(typeof insetSides)[number]})` | `anchor(${string})`;

  export const sizeValue = '' as SizeValue;

  export const insetValue = '' as InsetValue;

  const isSize = (part: string) => (sizes as readonly string[]).includes(part);

  const isSide = (part: string) => (insetSides as readonly string[]).includes(part) || percentage.test(part);

  interface Parsed {
    /** The anchor named inside the function, when it names one rather than taking `positionAnchor`'s. */
    name?: string;
    /** The axis an `anchor-size()` measures, or the edge an `anchor()` resolves to. */
    keyword?: string;
    /** The length used when there is no anchor to measure. */
    fallback?: string;
  }

  /**
   * `anchor-size(trigger width, 10rem)` taken apart. The fallback is everything after the first comma,
   * since it may be a `clamp()` carrying commas of its own, and a lone keyword is the anchor's *name*
   * only when it is not one of the function's own — which is the whole ambiguity in the grammar.
   */
  function parse(value: string, fn: string, keyword: (part: string) => boolean): Parsed | null {
    const trimmed = value.trim();
    if (!trimmed.startsWith(`${fn}(`) || !trimmed.endsWith(')')) return null;

    const inner = trimmed.slice(fn.length + 1, -1);
    const comma = inner.indexOf(',');
    const head = (comma === -1 ? inner : inner.slice(0, comma)).trim().split(/\s+/).filter(Boolean);
    const fallback = comma === -1 ? undefined : inner.slice(comma + 1).trim();

    if (fallback !== undefined && !Variables.isUsableValue(fallback)) return null;
    if (head.length > 2 || head.some((part) => part.includes('('))) return null;
    if (head.length === 2) return { name: head[0], keyword: head[1], fallback };
    if (head.length === 0) return { fallback };

    return keyword(head[0]!) ? { keyword: head[0], fallback } : { name: head[0], fallback };
  }

  /** Whether what was parsed is what the browser takes: an identifier for the name, one of the set for the keyword. */
  function usable(parsed: Parsed | null, keyword: (part: string) => boolean, keywordRequired: boolean): boolean {
    if (!parsed) return false;
    if (parsed.name !== undefined && !isName(parsed.name)) return false;
    if (parsed.keyword === undefined) return !keywordRequired;

    return keyword(parsed.keyword);
  }

  /** Whether a value is an `anchor-size()` — the size props' `match`. With no axis it is the layer's own. */
  export function isSizeValue(value: BoxStyleValue): boolean {
    return typeof value === 'string' && usable(parse(value, 'anchor-size', isSize), isSize, false);
  }

  /** Whether a value is an `anchor()` — the inset props' `match`. The edge is required: CSS rejects a bare `anchor()`. */
  export function isInsetValue(value: BoxStyleValue): boolean {
    return typeof value === 'string' && usable(parse(value, 'anchor', isSide), isSide, true);
  }

  /** An `anchor-size()`/`anchor()` as CSS spells it: the name dashed, the spacing canonical, so every spelling emits one declaration. */
  export function functionValue(value: string): string {
    const size = value.trim().startsWith('anchor-size(');
    const fn = size ? 'anchor-size' : 'anchor';
    const parsed = parse(value, fn, size ? isSize : isSide);
    if (!parsed) return value;

    const head = [parsed.name === undefined ? undefined : dashedName(parsed.name), parsed.keyword].filter(Boolean).join(' ');

    return `${fn}(${head}${parsed.fallback === undefined ? '' : `, ${parsed.fallback}`})`;
  }
}

export default Anchors;
