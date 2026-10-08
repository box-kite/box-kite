import { BoxStyle } from './coreTypes';

/**
 * What the engine says, in development, when a prop does not do what it was written to do. Each message
 * names the value, what it rendered, and the line to write instead, because an agent acts on it in-loop.
 */
namespace Diagnostics {
  const MILLISECONDS = new Set(['animationDuration', 'animationDelay', 'transitionDuration', 'transitionDelay']);
  // `opacity` itself is 0–1; only the backdrop function is a percentage.
  const PERCENTAGES = new Set([
    'backdropOpacity',
    ...['Brightness', 'Contrast', 'Grayscale', 'Invert', 'Saturate', 'Sepia'].flatMap((name) => [name.toLowerCase(), `backdrop${name}`]),
  ]);
  // Not `target`: on Box that is the `:target` pseudo-class key, so the engine never asks.
  const ATTRIBUTES = new Set(['href', 'src', 'alt', 'rel', 'htmlFor', 'role', 'tabIndex', 'download', 'srcSet']);
  const LISTED = 12;

  /** The prop as JSX writes it: `fontSize={4}`, `bgColor="bleu-500"`. */
  export function written(key: string, value: unknown): string {
    if (typeof value === 'string') return `${key}=${JSON.stringify(value)}`;
    if (typeof value === 'object' && value !== null) {
      const json = JSON.stringify(value) ?? '';
      return `${key}={${json.length > 60 ? `${json.slice(0, 57)}...` : json}}`;
    }

    return `${key}={${String(value)}}`;
  }

  /**
   * A number the registry accepts but that almost certainly meant another unit — the divider footgun. Null
   * when it reads as deliberate: every threshold sits below the smallest value anybody renders on purpose.
   */
  export function misread(key: string, value: unknown): string | null {
    if (typeof value !== 'number' || !(value > 0)) return null;
    // `1.1 * 100` is 110.00000000000001.
    const scaled = (factor: number) => +(value * factor).toFixed(2);

    if (key === 'fontSize' && value < 8) {
      const meant = scaled(value <= 2 ? 16 : 4);
      return `${written(key, value)} is ${value}px text: fontSize's divider is 16, not the spacing scale's 4, so the number is the pixel size. For ${meant}px write ${written(key, meant)}.`;
    }
    if (key === 'lineHeight' && value < 8) {
      return `${written(key, value)} is a ${value}px line: lineHeight is direct pixels, not the unitless multiple CSS also takes. Write the pixels (lineHeight={24} is 24px), lineHeight="font-size" for a multiple of 1, or css={{ lineHeight: ${value} }} for any other multiple.`;
    }
    if (MILLISECONDS.has(key) && value < 10) {
      return `${written(key, value)} is ${value}ms: times are milliseconds, not seconds. For ${value}s write ${written(key, scaled(1000))}.`;
    }
    if (PERCENTAGES.has(key) && value <= 2) {
      return `${written(key, value)} is ${value}%: a filter's number is a percentage, not the multiplier CSS also takes. For ${scaled(100)}% write ${written(key, scaled(100))}.`;
    }

    return null;
  }

  /** Why a value wrote nothing, and what the prop takes instead. */
  export function rejected(key: string, value: unknown, definitions: readonly BoxStyle[] | undefined): string {
    const head = `${written(key, value)} wrote no CSS: ${key} does not take that value, so the prop was dropped along with its class.`;
    if (!definitions) return head;

    const literals = definitions.flatMap((definition) =>
      Array.isArray(definition.values) && !Array.isArray(definition.values[0]) ? (definition.values as readonly unknown[]) : [],
    );
    const close =
      typeof value === 'string'
        ? nearest(
            value,
            literals.filter((literal): literal is string => typeof literal === 'string'),
          )
        : [];
    if (close.length) return `${head} Did you mean ${close.map((candidate) => JSON.stringify(candidate)).join(' or ')}?`;

    const shown = literals.slice(0, literals.length > LISTED ? 6 : LISTED).map((literal) => JSON.stringify(literal));
    const takes = [
      definitions.some((definition) => typeof definition.values === 'number') ? 'a number' : '',
      literals.length > LISTED ? `one of its ${literals.length} named values (${shown.join(', ')}, ...)` : '',
      literals.length && literals.length <= LISTED ? `one of ${shown.join(', ')}` : '',
      definitions.some((definition) => definition.match || definition.declarations) ? 'a value its own grammar defines' : '',
    ].filter(Boolean);

    return takes.length ? `${head} It takes ${takes.join(', or ')}.` : head;
  }

  /** A top-level key that is an HTML attribute: it typechecks, and Box forwards nothing but `props`. */
  export function attribute(key: string): string | null {
    if (!ATTRIBUTES.has(key) && !/^(data|aria)-|^on[A-Z]/.test(key)) return null;

    return `${key} is an HTML attribute, not a style prop, so at the top level it was dropped: write props={{ ${/^[A-Za-z]+$/.test(key) ? key : JSON.stringify(key)}: ... }}.`;
  }

  function nearest(value: string, candidates: string[]): string[] {
    const limit = Math.max(1, Math.floor(value.length / 4));

    return candidates
      .map((candidate) => ({ candidate, distance: distance(value, candidate) }))
      .filter((entry) => entry.distance <= limit)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3)
      .map((entry) => entry.candidate);
  }

  function distance(a: string, b: string): number {
    const row = Array.from({ length: b.length + 1 }, (_, index) => index);

    for (let i = 1; i <= a.length; i += 1) {
      let previous = row[0];
      row[0] = i;

      for (let j = 1; j <= b.length; j += 1) {
        const current = row[j];
        row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
        previous = current;
      }
    }

    return row[b.length];
  }
}

export default Diagnostics;
