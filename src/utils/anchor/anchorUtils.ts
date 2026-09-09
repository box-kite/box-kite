/**
 * Where a floating layer goes, twice over: as the `position-area` the browser reads, and as the
 * coordinates a browser without anchor positioning has to be given. One model rather than two, so the
 * two paths cannot drift — the fallback is the CSS placement worked out by hand.
 *
 * Framework-free and layout-free: every function here takes rectangles and returns numbers, which is what
 * makes the flip and the shift testable without a DOM (jsdom computes no layout at all).
 */

/** Which side of the anchor the layer sits on. `top`/`bottom` are the block axis, `start`/`end` the inline one. */
export type AnchorSide = 'top' | 'bottom' | 'start' | 'end';

/** Where along that side the layer lines up. */
export type AnchorAlign = 'start' | 'center' | 'end';

/** A box in viewport coordinates — what `getBoundingClientRect()` gives, narrowed to what placing needs. */
export interface AnchorRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface PlacementOptions {
  side: AnchorSide;
  align: AnchorAlign;
  /** The gap between anchor and layer, in pixels. */
  offset: number;
  /** Whether a side that does not fit may be swapped for its opposite. */
  flip: boolean;
  /** Whether the inline axis runs right to left, which is what `start`/`end` mean. */
  rtl: boolean;
}

/**
 * The twelve `position-area` values a side and an alignment can name — spelled out rather than derived,
 * so the compiler can see that each one is a value the `positionArea` prop takes.
 */
export type AnchorArea =
  | 'block-start span-all'
  | 'block-start span-inline-start'
  | 'block-start span-inline-end'
  | 'block-end span-all'
  | 'block-end span-inline-start'
  | 'block-end span-inline-end'
  | 'span-all inline-start'
  | 'span-block-start inline-start'
  | 'span-block-end inline-start'
  | 'span-all inline-end'
  | 'span-block-start inline-end'
  | 'span-block-end inline-end';

/** Where the fallback puts the layer: viewport coordinates, and the side it settled on after flipping. */
export interface Placement {
  top: number;
  left: number;
  side: AnchorSide;
}

const opposite: Record<AnchorSide, AnchorSide> = { top: 'bottom', bottom: 'top', start: 'end', end: 'start' };

/** Whether a side runs along the block axis, which is the axis the offset and the flip act on. */
function isBlock(side: AnchorSide): boolean {
  return side === 'top' || side === 'bottom';
}

/**
 * The `position-area` for a side and an alignment — and the counter-intuitive half of the grammar, since
 * an alignment is written as the span *away* from it: a layer whose start edge meets the anchor's start
 * edge occupies the centre cell and the one after it, which is `span-inline-end`. Measured in Chrome 152.
 *
 * `center` is `span-all` rather than the `center` cell on purpose: the centre cell is only as wide as the
 * anchor, so a layer wider than its anchor overflows it on the cross axis, and an overflow no flip can fix
 * disqualifies every fallback position (the trap `positionTryFallbacks` documents).
 */
export function areaFor(side: AnchorSide, align: AnchorAlign): AnchorArea {
  const block = isBlock(side);
  const primary = block ? (side === 'top' ? 'block-start' : 'block-end') : side === 'start' ? 'inline-start' : 'inline-end';
  const crossAxis = block ? 'inline' : 'block';
  const cross = align === 'center' ? 'span-all' : `span-${crossAxis}-${align === 'start' ? 'end' : 'start'}`;

  // Block axis first, whichever axis the side is on: the canonical order the `positionArea` grammar takes.
  return (block ? `${primary} ${cross}` : `${cross} ${primary}`) as AnchorArea;
}

/** The flip that keeps the layer on its own axis: the block one for a side above or below, the inline one beside. */
export function flipFor(side: AnchorSide): 'flip-block' | 'flip-inline' {
  return isBlock(side) ? 'flip-block' : 'flip-inline';
}

/** How much room a side has between the anchor and the edge of the viewport. */
function room(anchor: AnchorRect, side: AnchorSide, viewport: AnchorRect, rtl: boolean): number {
  const physical = physicalSide(side, rtl);

  if (physical === 'top') return anchor.top - viewport.top;
  if (physical === 'bottom') return viewport.top + viewport.height - (anchor.top + anchor.height);
  if (physical === 'left') return anchor.left - viewport.left;

  return viewport.left + viewport.width - (anchor.left + anchor.width);
}

/** A logical side as the physical one it resolves to, which is all the arithmetic below can work in. */
function physicalSide(side: AnchorSide, rtl: boolean): 'top' | 'bottom' | 'left' | 'right' {
  if (side === 'top' || side === 'bottom') return side;

  return (side === 'start') === rtl ? 'right' : 'left';
}

/** Keeps a span of `length` inside `[start, start + available]` when it can, and against the near edge when it cannot. */
function clamp(value: number, length: number, start: number, available: number): number {
  return Math.max(start, Math.min(value, start + available - length));
}

/**
 * The fallback's whole answer: flip to the opposite side when the requested one has no room and the
 * opposite has more, then shift along the cross axis to stay in the viewport. The two are the entire
 * middleware stack a positioning library sells, and they are twelve lines because the browser is doing
 * neither here — this runs only where `anchor-name` is not supported.
 */
export function place(anchor: AnchorRect, layer: AnchorRect, viewport: AnchorRect, options: PlacementOptions): Placement {
  const { align, offset, flip, rtl } = options;
  const needed = (isBlock(options.side) ? layer.height : layer.width) + offset;
  const flipped =
    flip && room(anchor, options.side, viewport, rtl) < needed && room(anchor, opposite[options.side], viewport, rtl) >= needed;
  const side = flipped ? opposite[options.side] : options.side;
  const physical = physicalSide(side, rtl);

  const main = {
    top: anchor.top - layer.height - offset,
    bottom: anchor.top + anchor.height + offset,
    left: anchor.left - layer.width - offset,
    right: anchor.left + anchor.width + offset,
  }[physical];

  // The cross axis, aligned against the anchor and then clamped into the viewport — the `shift` half.
  const block = isBlock(side);
  const crossStart = block ? anchor.left : anchor.top;
  const crossSize = block ? anchor.width : anchor.height;
  const crossLength = block ? layer.width : layer.height;
  // Only the inline axis has a reading order, so `align="start"` is the left edge above or below an
  // anchor in a left-to-right page and the right edge in a right-to-left one — and always the top beside it.
  const nearEdge = (align === 'start') !== (block && rtl);
  const cross =
    align === 'center' ? crossStart + crossSize / 2 - crossLength / 2 : nearEdge ? crossStart : crossStart + crossSize - crossLength;

  const clampedCross = block
    ? clamp(cross, layer.width, viewport.left, viewport.width)
    : clamp(cross, layer.height, viewport.top, viewport.height);

  return block ? { top: main, left: clampedCross, side } : { top: clampedCross, left: main, side };
}
