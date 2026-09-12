/**
 * The chart palette, on its own so that `boxComponents.ts` can declare it without dragging the rest of
 * `ChartUtils` — the path builders and the trigonometry — into the bundle every Box already pays for.
 * `ChartUtils` re-exports all three, so the public names are unchanged.
 */

/**
 * The colours a chart uses when nobody names any. Tokens rather than raw colours, so they resolve
 * through the palette; six, because that is as many series as a tile can be told apart in — a seventh
 * wraps round rather than inventing a colour.
 */
export const PALETTE = ['sky-500', 'emerald-500', 'amber-500', 'violet-500', 'rose-500', 'cyan-500'] as const;

/** The same six for a dark background, where a 500 reads as muddy against near-black. */
export const DARK_PALETTE = ['sky-400', 'emerald-400', 'amber-400', 'violet-400', 'rose-400', 'cyan-400'] as const;

/** The numbered palette as custom properties: `{ 'chart-1': 'sky-500', … }`. */
export function paletteVariables(palette: readonly string[]): Record<string, string> {
  return palette.reduce<Record<string, string>>((acc, colour, index) => {
    acc[`chart-${index + 1}`] = colour;

    return acc;
  }, {});
}
