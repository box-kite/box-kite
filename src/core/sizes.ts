/**
 * The size every built-in control, item and row is drawn at: `compact`, `normal` (the default) or `large`.
 * A size is two variables, `--control-height` and `--control-font-size`, so it inherits — a `variant="compact"`
 * on a menu reaches every item in it, and `Box.sizes({ size: 'compact' })` on a form reaches every field.
 * What each size *is* is three more pairs (`--control-height-compact`…), which a project declares once.
 */
namespace Sizes {
  export const names = ['compact', 'normal', 'large'] as const;
  export type Name = (typeof names)[number];

  const heights: Record<Name, string> = { compact: '2rem', normal: '2.5rem', large: '3rem' };
  const fontSizes: Record<Name, string> = { compact: '0.8125rem', normal: '0.875rem', large: '1rem' };

  const height = (name: Name) => `var(--control-height-${name},${heights[name]})`;
  const fontSize = (name: Name) => `var(--control-font-size-${name},${fontSizes[name]})`;

  /** The values `height`/`minHeight` take: the size in force, or one of the three by name. */
  export const heightValues = ['control', 'control-compact', 'control-normal', 'control-large'] as const;
  /** The values `fontSize` takes, the same four. */
  export const fontSizeValues = heightValues;

  // `control` is whichever size an ancestor (or the element itself) chose, and `normal` where none did.
  export function heightValue(value: string): string {
    return value === 'control' ? `var(--control-height,${height('normal')})` : height(value.slice(8) as Name);
  }

  export function fontSizeValue(value: string): string {
    return value === 'control' ? `var(--control-font-size,${fontSize('normal')})` : fontSize(value.slice(8) as Name);
  }

  /** The `vars` a size variant writes: this element and everything inside it is drawn at that size. */
  export function choose(name: Name): Record<string, string> {
    return { 'control-height': height(name), 'control-font-size': fontSize(name) };
  }

  /** One size of a project's scale: a height on the ÷4 spacing scale, or the height and the text size. */
  export type Size = number | string | { height?: number | string; fontSize?: number | string };

  export interface Options extends Partial<Record<Name, Size>> {
    /** Which of the three this subtree is drawn at. */
    size?: Name;
  }

  /**
   * `vars={Box.sizes({ compact: 8, normal: 9, large: 11 })}` on the app's root: what the three sizes are in this
   * project. A number is the ÷4 scale for a height and ÷16 for a text size; a string is CSS as it stands.
   */
  export function define(options: Options): Record<string, string> {
    const record: Record<string, string> = {};

    for (const name of names) {
      const size = options[name];
      if (size === undefined) continue;

      const { height: h, fontSize: f } = typeof size === 'object' ? size : { height: size, fontSize: undefined };
      if (h !== undefined) record[`control-height-${name}`] = typeof h === 'number' ? `${h / 4}rem` : h;
      if (f !== undefined) record[`control-font-size-${name}`] = typeof f === 'number' ? `${f / 16}rem` : f;
    }

    return options.size ? { ...record, ...choose(options.size) } : record;
  }
}

export default Sizes;
