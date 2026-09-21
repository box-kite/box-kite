import { BoxStyleValue } from './coreTypes';

/**
 * Scroll-driven animations: the grammar behind `animationTimeline`, the `animationRange` trio and the
 * two timeline declarations. An animation's progress comes from a scroll position rather than a clock,
 * so there is no rAF loop, no scroll listener and no state — the browser drives it off the compositor.
 *
 * The one thing to know before reading further: **a scroll-driven animation has no duration**, so
 * `--transitionTime` cannot stop it and `prefers-reduced-motion` reaches it only through an explicit
 * `motionReduce={{ animation: 'none' }}`. Every other kind of motion in this library stops itself.
 */
namespace Timelines {
  // A timeline is named by a `<dashed-ident>`, so the `--` is not optional in CSS — it is optional here
  // and added on the way out, the way an anchor's name is.
  const identifier = /^(--)?[a-zA-Z_][\w-]*$/;

  /** Keywords a name must never swallow: `animationTimeline="auto"` is the keyword, not `--auto`. */
  const reserved = new Set(['none', 'auto', 'normal', 'inherit', 'initial', 'revert', 'revert-layer', 'unset']);

  /** Whether a value names a timeline — the `match` every name-taking definition shares. */
  export function isName(value: BoxStyleValue): boolean {
    if (typeof value !== 'string') return false;

    const trimmed = value.trim();

    return !reserved.has(trimmed) && identifier.test(trimmed);
  }

  /** A name as CSS spells it: `page` and `--page` both reach `--page`, so both spellings name one timeline. */
  export function dashedName(value: string): string {
    const trimmed = value.trim();

    return trimmed.startsWith('--') ? trimmed : `--${trimmed}`;
  }

  /** Which axis of the scroller drives the timeline. `block`/`inline` are the writing mode's. */
  export const axes = ['block', 'inline', 'x', 'y'] as const;

  export type Axis = (typeof axes)[number];

  /** Which scroller `scroll()` takes: the nearest ancestor that scrolls, the document, or this element. */
  const scrollers = ['nearest', 'root', 'self'] as const;

  const isAxis = (part: string) => (axes as readonly string[]).includes(part);

  const isScroller = (part: string) => (scrollers as readonly string[]).includes(part);

  // A length-percentage, or a bare `0` — the one number CSS takes with no unit. A `calc()` and friends
  // are accepted whole: what they compute to is the browser's business, and a malformed one is its own
  // declaration to drop.
  const lengthPercentage = /^-?(\d+\.?\d*|\.\d+)(%|[a-z]+)$/i;

  const mathFunction = /^(calc|min|max|clamp|round)\([^{};]*\)$/i;

  /**
   * Split on whitespace *outside* brackets, so a `calc(100% - 2rem)` stays one token — splitting on
   * every space is what made a calculated offset unreadable. An unbalanced value tokenizes to nothing,
   * which every caller then rejects.
   */
  function tokens(value: string): string[] {
    const parts: string[] = [];
    let depth = 0;
    let current = '';

    for (const char of value.trim()) {
      if (char === '(') depth += 1;
      if (char === ')') depth -= 1;

      if (depth === 0 && /\s/.test(char)) {
        if (current) parts.push(current);
        current = '';
        continue;
      }

      current += char;
    }

    if (current) parts.push(current);

    return depth === 0 ? parts : [];
  }

  function isLength(part: string): boolean {
    return part === '0' || lengthPercentage.test(part) || mathFunction.test(part);
  }

  /**
   * An anonymous timeline: `scroll()` is the nearest scrollport's progress, `view()` this element's
   * progress through it. Both take their arguments **in any order and any number**, which is what the
   * `||` in the grammar means, so `scroll(block root)` and `scroll(root block)` are one value.
   */
  function isAnonymous(value: string): boolean {
    const view = value.startsWith('view(');
    if (!view && !value.startsWith('scroll(')) return false;
    if (!value.endsWith(')')) return false;

    const inner = value.slice(value.indexOf('(') + 1, -1).trim();
    if (inner === '') return true;

    const parts = tokens(inner);
    if (parts.length === 0) return false;
    // `view()`'s second argument is an inset of one or two lengths, so its part count is not bounded at two.
    if (!view && parts.length > 2) return false;

    let axisSeen = false;
    let otherSeen = false;

    for (const part of parts) {
      if (isAxis(part) && !axisSeen) {
        axisSeen = true;
        continue;
      }

      // Everything that is not the axis is the scroller (a keyword) or the inset (up to two lengths).
      if (view ? part === 'auto' || isLength(part) : isScroller(part) && !otherSeen) {
        otherSeen = true;
        continue;
      }

      return false;
    }

    return true;
  }

  /** What `animationTimeline` takes: a name of yours, or a timeline the browser makes up on the spot. */
  export type Timeline = `scroll(${string})` | `view(${string})` | (string & NonNullable<unknown>);

  export const timeline = '' as Timeline;

  /** Whether a value is an anonymous timeline — a separate `match` from the name, so the two stay distinguishable. */
  export function isAnonymousTimeline(value: BoxStyleValue): boolean {
    return typeof value === 'string' && isAnonymous(value.trim());
  }

  /** `scroll()`/`view()` with its arguments spaced canonically, so extra whitespace is not a second declaration. */
  export function anonymousValue(value: string): string {
    const trimmed = value.trim();
    const fn = trimmed.slice(0, trimmed.indexOf('('));
    const inner = tokens(trimmed.slice(trimmed.indexOf('(') + 1, -1)).join(' ');

    return `${fn}(${inner})`;
  }

  /**
   * The six named parts of a view timeline. `cover` is the whole pass across the scrollport, `contain`
   * the part where the element fits inside it, and `entry`/`exit` the two ends of that pass.
   */
  export const rangeNames = ['cover', 'contain', 'entry', 'exit', 'entry-crossing', 'exit-crossing'] as const;

  const isRangeName = (part: string) => (rangeNames as readonly string[]).includes(part);

  /**
   * One end of a range: `normal`, an offset, or a named part with an offset into it. Greedy, the way the
   * browser reads it — `cover 20%` is one end at a fifth of the cover range, not two ends.
   */
  function takeRangePart(parts: string[], index: number): number {
    const part = parts[index];
    if (part === undefined) return -1;
    if (part === 'normal') return index + 1;
    if (isLength(part)) return index + 1;
    if (!isRangeName(part)) return -1;

    const offset = parts[index + 1];

    return offset !== undefined && isLength(offset) ? index + 2 : index + 1;
  }

  /** Whether a value is a range — `ends` is 1 for each longhand and 2 for the shorthand that sets both. */
  function isRange(value: BoxStyleValue, ends: number): boolean {
    if (typeof value !== 'string') return false;

    const parts = tokens(value);
    if (parts.length === 0) return false;

    let index = 0;

    for (let taken = 0; taken < ends && index < parts.length; taken += 1) {
      index = takeRangePart(parts, index);
      if (index === -1) return false;
    }

    return index === parts.length;
  }

  /** What one end of a range takes. A bare name is that whole part of the pass. */
  export type RangeEdge =
    (typeof rangeNames)[number] | 'normal' | `${(typeof rangeNames)[number]} ${string}` | (string & NonNullable<unknown>);

  /** What the shorthand takes: one end, or both of them. */
  export type Range = RangeEdge | `${string} ${string}`;

  export const rangeEdge = '' as RangeEdge;

  export const range = '' as Range;

  /** The `match` for `animationRangeStart`/`animationRangeEnd`. */
  export function isRangeEdge(value: BoxStyleValue): boolean {
    return isRange(value, 1);
  }

  /** The `match` for the `animationRange` shorthand. */
  export function isRangeValue(value: BoxStyleValue): boolean {
    return isRange(value, 2);
  }

  /** A range with its tokens spaced canonically, so `entry  0%` and `entry 0%` write one declaration. */
  export function rangeValue(value: string): string {
    return tokens(value).join(' ');
  }

  /** What the `scrollTimeline`/`viewTimeline` shorthands take: a name, and optionally the axis. */
  export type TimelineShorthand = `${string} ${Axis}` | (string & NonNullable<unknown>);

  export const timelineShorthand = '' as TimelineShorthand;

  /** Whether a value is `<name> <axis>?` — the shorthands' `match`. The name is required; the axis is not. */
  export function isTimelineShorthand(value: BoxStyleValue): boolean {
    if (typeof value !== 'string') return false;

    const parts = tokens(value);
    if (parts.length === 0 || parts.length > 2 || !isName(parts[0]!)) return false;

    return parts.length === 1 || isAxis(parts[1]!);
  }

  /** The shorthand with its name dashed, so `scrollTimeline="page block"` and `"--page block"` agree. */
  export function timelineShorthandValue(value: string): string {
    const [name, axis] = tokens(value) as [string, string?];

    return axis === undefined ? dashedName(name) : `${dashedName(name)} ${axis}`;
  }

  /** What `viewTimelineInset` takes: `auto`, a length, or one of each for the two ends. */
  export type Inset = 'auto' | (string & NonNullable<unknown>);

  export const inset = '' as Inset;

  /** The `match` for `viewTimelineInset`: one or two of `auto`/a length. */
  export function isInset(value: BoxStyleValue): boolean {
    if (typeof value !== 'string') return false;

    const parts = tokens(value);

    return parts.length >= 1 && parts.length <= 2 && parts.every((part) => part === 'auto' || isLength(part));
  }

  /**
   * What `timelineScope` takes: the names this element makes reachable. A timeline is otherwise visible
   * only to the declaring element's descendants, so a progress bar outside the article it tracks needs
   * their common ancestor to declare the scope.
   */
  export function isScope(value: BoxStyleValue): boolean {
    if (typeof value !== 'string') return false;

    const names = value.split(',');

    return names.length > 0 && names.every((name) => isName(name));
  }

  /** A scope list with every name dashed and one space after each comma. */
  export function scopeValue(value: string): string {
    return value
      .split(',')
      .map((name) => dashedName(name))
      .join(', ');
  }

  // A view transition is named by a `<custom-ident>`, which is *not* dashed — unlike every other name here.
  const customIdent = /^-?[a-zA-Z_][\w-]*$/;

  /** Whether a value names a view transition, or a class of them. `none` and `auto` are the browser's own. */
  export function isTransitionName(value: BoxStyleValue): boolean {
    if (typeof value !== 'string') return false;

    const trimmed = value.trim();

    return !reserved.has(trimmed) && trimmed !== 'match-element' && customIdent.test(trimmed);
  }

  /** Whether a value is a `view-transition-class` list: one or more custom idents. */
  export function isTransitionClass(value: BoxStyleValue): boolean {
    if (typeof value !== 'string') return false;

    const parts = tokens(value);

    return parts.length > 0 && parts.every((part) => isTransitionName(part));
  }
}

export default Timelines;
