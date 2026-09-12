import { describe, expect, it } from 'vitest';
import VirtualUtils from './virtualUtils';

/** A viewport that shows 10 rows of 36px, so a window is 10 + 2 × 4 overscan = 18 rows wide. */
const view = { itemHeight: 36, viewHeight: 360 };
const SPAN = 18;

function windowFor(count: number, scrollTop: number, activeIndex?: number) {
  return VirtualUtils.windowFor({ count, scrollTop, activeIndex, ...view });
}

/**
 * The windowing with no React and no DOM in it: which rows a scroll position renders, and where the
 * slice sits. Every answer here is arithmetic, which is why it is testable where layout is not.
 */
describe('VirtualUtils', () => {
  describe('shouldVirtualize', () => {
    it('follows the count against the threshold', () => {
      expect(VirtualUtils.shouldVirtualize(100)).toBe(false);
      expect(VirtualUtils.shouldVirtualize(101)).toBe(true);
      expect(VirtualUtils.shouldVirtualize(30, undefined, 20)).toBe(true);
    });

    it('lets the caller overrule the count either way', () => {
      expect(VirtualUtils.shouldVirtualize(10_000, false)).toBe(false);
      expect(VirtualUtils.shouldVirtualize(3, true)).toBe(true);
    });
  });

  describe('windowFor', () => {
    it('renders the top of the list at rest, with overscan above it clamped away', () => {
      expect(windowFor(10_000, 0)).toEqual({ startIndex: 0, endIndex: SPAN, offsetY: 0, totalHeight: 360_000 });
    });

    it('moves the window down with the scroll, keeping its size', () => {
      const slice = windowFor(10_000, 3600);

      // 3600 / 36 is row 100, less the four rows of overscan kept above it.
      expect(slice.startIndex).toBe(96);
      expect(slice.endIndex - slice.startIndex).toBe(SPAN);
      expect(slice.offsetY).toBe(96 * 36);
    });

    it('stops at the end of the list rather than scrolling past it', () => {
      const slice = windowFor(1000, 1000 * 36);

      expect(slice.endIndex).toBe(1000);
      expect(slice.startIndex).toBe(1000 - SPAN);
    });

    it('renders every row of a list shorter than one window', () => {
      expect(windowFor(5, 0)).toEqual({ startIndex: 0, endIndex: 5, offsetY: 0, totalHeight: 180 });
    });

    it('renders the lot when nothing could be measured, rather than dividing by zero', () => {
      const slice = VirtualUtils.windowFor({ count: 40, itemHeight: 0, viewHeight: 0, scrollTop: 0 });

      expect(slice).toEqual({ startIndex: 0, endIndex: 40, offsetY: 0, totalHeight: 0 });
    });

    it('holds an empty list without going negative', () => {
      expect(windowFor(0, 0)).toEqual({ startIndex: 0, endIndex: 0, offsetY: 0, totalHeight: 0 });
    });
  });

  // `aria-activedescendant` naming a row that was never rendered names nothing at all, so the window
  // goes where the keyboard is and lets the scroll catch up.
  describe('the active row', () => {
    it('moves the window down to hold a highlight below it', () => {
      const slice = windowFor(10_000, 0, 500);

      expect(slice.startIndex).toBeLessThanOrEqual(500);
      expect(slice.endIndex).toBeGreaterThan(500);
      expect(slice.endIndex - slice.startIndex).toBe(SPAN);
    });

    it('moves the window up to hold a highlight above it', () => {
      const slice = windowFor(10_000, 36_000, 12);

      expect(slice.startIndex).toBe(8);
      expect(slice.endIndex).toBe(8 + SPAN);
    });

    it('keeps the window the same size, so Home on ten thousand rows renders eighteen', () => {
      const slice = windowFor(10_000, 300_000, 0);

      expect(slice.startIndex).toBe(0);
      expect(slice.endIndex - slice.startIndex).toBe(SPAN);
    });

    it('leaves the window where the scroll put it when the highlight is already inside', () => {
      expect(windowFor(10_000, 3600, 100)).toEqual(windowFor(10_000, 3600));
    });

    it('ignores a highlight on no row at all', () => {
      expect(windowFor(10_000, 3600, -1)).toEqual(windowFor(10_000, 3600));
    });

    it('converges: the scroll that follows a jump asks for the window already rendered', () => {
      const jumped = windowFor(10_000, 0, 500);
      // What `scrollIntoView({ block: 'nearest' })` leaves behind — the row at the bottom of the viewport.
      const settled = windowFor(10_000, (500 + 1) * 36 - 360);

      expect(settled.startIndex).toBe(jumped.startIndex);
    });
  });
});
