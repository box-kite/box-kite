// Type-only: a value from `VirtualUtils` would make it a module two components share, and so one everybody loads.
import type { VirtualWindow } from './virtualUtils';

function clamp(value: number, low: number, high: number): number {
  return Math.min(Math.max(value, low), high);
}

/**
 * Windowing for a list whose rows each have their own height — `<VirtualList>`'s, where `VirtualUtils` is the
 * fixed pitch a listbox has. Its own module so neither consumer carries the other's arithmetic.
 */
namespace MeasuredWindow {
  /** Rows either side of the screen when the caller names none. */
  export const DEFAULT_OVERSCAN = 4;

  /** How far a focused row outside the window may be from it and still be kept rendered, so focus is not dropped. */
  export const PIN_REACH = 50;

  /** Where each row of a list whose rows differ in height starts: `count + 1` entries, the last being the total. */
  export function offsetsOf(sizes: readonly number[]): number[] {
    const offsets = new Array<number>(sizes.length + 1);
    offsets[0] = 0;
    for (let index = 0; index < sizes.length; index++) offsets[index + 1] = offsets[index] + sizes[index];

    return offsets;
  }

  /** The first row whose bottom edge is below `y`: a binary search, since a long list asks on every frame of a scroll. */
  function rowAt(offsets: readonly number[], y: number): number {
    let low = 0;
    let high = offsets.length - 2;
    while (low < high) {
      const mid = (low + high) >> 1;
      if (offsets[mid + 1] <= y) low = mid + 1;
      else high = mid;
    }

    return Math.max(0, low);
  }

  export interface MeasuredWindowOptions {
    /** From `offsetsOf`. */
    offsets: readonly number[];
    /** The part of the list on screen, in px from the list's own top edge. Either end may be outside the list. */
    viewStart: number;
    viewEnd: number;
    overscan?: number;
    /** A row that has to stay rendered — the one focus is in — or `-1`. */
    pin?: number;
  }

  /** The rows to render for a list whose rows each have their own height, and the space above and below them. */
  export function measuredWindow(options: MeasuredWindowOptions): VirtualWindow {
    const { offsets, viewStart, viewEnd, overscan = DEFAULT_OVERSCAN, pin = -1 } = options;
    const count = offsets.length - 1;
    const totalHeight = offsets[count] ?? 0;
    if (count <= 0) return { startIndex: 0, endIndex: 0, offsetY: 0, totalHeight: 0 };

    let startIndex = clamp(rowAt(offsets, Math.max(0, viewStart)) - overscan, 0, count - 1);
    // The screen's bottom edge is exclusive: a row starting exactly there is not on it.
    let endIndex = clamp(rowAt(offsets, Math.max(0, viewEnd - 0.5)) + 1 + overscan, startIndex + 1, count);

    // Unmounting the row focus is in sends focus to the body, and the next Tab starts from the top of the page.
    if (pin >= 0 && pin < count) {
      if (pin < startIndex && startIndex - pin <= PIN_REACH) startIndex = pin;
      else if (pin >= endIndex && pin - endIndex < PIN_REACH) endIndex = pin + 1;
    }

    return { startIndex, endIndex, offsetY: offsets[startIndex], totalHeight };
  }
}

export default MeasuredWindow;
