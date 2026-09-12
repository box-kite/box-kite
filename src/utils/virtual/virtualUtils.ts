/** The slice of a long list that is actually rendered, and where it sits in the scroll space. */
export interface VirtualWindow {
  /** First row to render. */
  startIndex: number;
  /** One past the last row to render. */
  endIndex: number;
  /** How far down the slice starts, in pixels. */
  offsetY: number;
  /** What the whole list measures — what gives the scrollbar its range. */
  totalHeight: number;
}

export interface VirtualWindowOptions {
  count: number;
  /** The *pitch* of a row: its height plus whatever sits between two of them. */
  itemHeight: number;
  /** What the scrolling element shows at once. */
  viewHeight: number;
  scrollTop: number;
  /** Rows kept either side of what is visible, so a scroll has something to reveal. */
  overscan?: number;
  /** The row the keyboard is on, or `-1`. The window moves to hold it whatever the scroll says. */
  activeIndex?: number;
}

/**
 * Windowing with no React and no DOM in it: which rows of a long list to render for a given scroll
 * position, and where to put them. Pure arithmetic, so the answers are testable in an environment that
 * computes no layout — which is every environment this repo's tests run in.
 */
namespace VirtualUtils {
  /** Rows either side of the viewport. Four is about a frame of fast scrolling at this row height. */
  export const DEFAULT_OVERSCAN = 4;

  /** Below this a window costs more than it saves: the arithmetic, the wrapper and the scroll state. */
  export const DEFAULT_THRESHOLD = 100;

  /** What a row is taken to measure before anything has been measured — this library's own option height. */
  export const DEFAULT_ITEM_HEIGHT = 36;

  /** What the scroller is taken to show before anything has been measured — `combobox.items`' own height. */
  export const DEFAULT_VIEW_HEIGHT = 248;

  function clamp(value: number, low: number, high: number): number {
    return Math.min(Math.max(value, low), high);
  }

  /** Whether a list is long enough to be worth windowing. `enabled` is the caller overruling the count. */
  export function shouldVirtualize(count: number, enabled?: boolean, threshold: number = DEFAULT_THRESHOLD): boolean {
    return enabled ?? count > threshold;
  }

  /**
   * The rows to render for a scroll position. The window is a fixed number of rows that *moves*, rather
   * than one that stretches to reach the active row: Home on a ten-thousand-row list would otherwise
   * render all ten thousand, which is the cost the window exists to avoid.
   */
  export function windowFor(options: VirtualWindowOptions): VirtualWindow {
    const { count, itemHeight, viewHeight, scrollTop, overscan = DEFAULT_OVERSCAN, activeIndex = -1 } = options;

    // A pitch of zero is an environment that measured nothing, and dividing by it windows the list into
    // infinity. Render the lot: a list nobody can lay out is a list nobody is scrolling.
    if (count <= 0 || itemHeight <= 0) return { startIndex: 0, endIndex: Math.max(0, count), offsetY: 0, totalHeight: 0 };

    const visible = Math.max(1, Math.ceil(viewHeight / itemHeight));
    const span = Math.min(count, visible + overscan * 2);
    const last = count - span;

    let startIndex = clamp(Math.floor(scrollTop / itemHeight) - overscan, 0, last);

    // The highlight moves a render before the scroll that follows it, and `aria-activedescendant` naming
    // a row that was never rendered names nothing at all. So the window goes where the keyboard is and
    // the scroll catches up, rather than the other way round.
    if (activeIndex >= 0 && activeIndex < count) {
      if (activeIndex < startIndex) startIndex = clamp(activeIndex - overscan, 0, last);
      else if (activeIndex >= startIndex + span) startIndex = clamp(activeIndex + 1 + overscan - span, 0, last);
    }

    return { startIndex, endIndex: startIndex + span, offsetY: startIndex * itemHeight, totalHeight: count * itemHeight };
  }
}

export default VirtualUtils;
