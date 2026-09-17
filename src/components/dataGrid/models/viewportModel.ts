import GridModel from './gridModel';

/** Which way the reader is going. The rendered buffer is only worth its cost in the direction of travel. */
export type ScrollDirection = 'down' | 'up';

/** Everything the window needs of a scroll: where the rows are, and which way they are moving. */
export interface ScrollPosition {
  top: number;
  direction: ScrollDirection;
}

/** Windowing parameters for the virtualized body. Rows are sliced by the adapter from these. */
export interface ViewportWindow {
  /** Index of the first row to render. */
  startIndex: number;
  /** Number of rows to render starting at `startIndex`. */
  take: number;
  /** Pixel offset to translate the rendered slice down to its scroll position. */
  translateY: number;
  /** Total scrollable height of all rows. */
  totalHeight: number;
  /** Fixed viewport height, or undefined when rendering all rows. */
  viewHeight: number | undefined;
}

/**
 * Headless virtualization: given a scrollTop, computes which rows are visible and how
 * to position them. Pure math — `scrollTop` is owned by the adapter (so scrolling does
 * not notify the store / re-render the whole grid).
 */
export default class ViewportModel<TRow> {
  static readonly DEFAULT_VISIBLE_ROWS_COUNT = 10;
  /**
   * Rows rendered outside the viewport, and the reason the two numbers differ: the buffer is cover for
   * the frame between a scroll and the render that answers it, so it is only ever needed ahead. Twenty
   * each way rendered fifty-eight rows around an eighteen-row viewport, and cost seven times the fling
   * of a grid rendering twenty-eight (bug #178).
   */
  static readonly ROWS_AHEAD = 12;
  static readonly ROWS_BEHIND = 4;
  /** The row a scroll cuts through at the top, and the fifth of one `viewHeight` adds at the bottom. */
  private static readonly PARTIAL_ROWS = 2;

  /**
   * Which way the reader is going, given where they were. A scroll that stops keeps the direction it
   * arrived in: the cover belongs ahead of the fling that is about to carry on, not behind it.
   */
  static directionOf(from: number, to: number, last: ScrollDirection): ScrollDirection {
    if (to === from) return last;

    return to > from ? 'down' : 'up';
  }

  constructor(public readonly grid: GridModel<TRow>) {}

  public get showAll(): boolean {
    return this.grid.props.def.visibleRowsCount === 'all';
  }

  public get hasDetailRows(): boolean {
    return !!this.grid.props.def.rowDetail;
  }

  public get isEmpty(): boolean {
    // A datasource's rows arrive over time, so "there is nothing here" is the row list rather than
    // `data` — which it never fills.
    if (this.grid.source.enabled) return this.grid.flatRows.value.length === 0;

    return this.grid.data.length === 0;
  }

  /** Number of rows the viewport shows at once (all rows when `visibleRowsCount === 'all'`). */
  public get visibleRowsCount(): number {
    if (this.showAll) return this.grid.flatRows.value.length;
    const vrc = this.grid.props.def.visibleRowsCount;
    return typeof vrc === 'number' ? vrc : ViewportModel.DEFAULT_VISIBLE_ROWS_COUNT;
  }

  /**
   * Rows a PageUp/PageDown moves. Deliberately not `visibleRowsCount`, which is every row when
   * `visibleRowsCount === 'all'` — a Page key that jumps to the end of the grid is the End key.
   */
  public get pageRows(): number {
    const vrc = this.grid.props.def.visibleRowsCount;

    return typeof vrc === 'number' ? vrc : ViewportModel.DEFAULT_VISIBLE_ROWS_COUNT;
  }

  public get viewHeight(): number | undefined {
    if (this.showAll) return undefined;
    const { rowHeight } = this.grid;
    return rowHeight * this.visibleRowsCount + rowHeight / 5;
  }

  public get totalHeight(): number {
    return this.hasDetailRows ? this.grid.rowOffsets.value.totalHeight : this.grid.flatRows.value.length * this.grid.rowHeight;
  }

  /** Height to reserve for the empty/no-data state. */
  public get emptyHeight(): number {
    return this.viewHeight ?? this.grid.rowHeight * ViewportModel.DEFAULT_VISIBLE_ROWS_COUNT;
  }

  /** Where a row sits inside the scrolled body — what a keyboard jump scrolls to. */
  public rowTop(index: number): number {
    if (this.hasDetailRows) return this.grid.rowOffsets.value.offsets[index] ?? 0;

    return index * this.grid.rowHeight;
  }

  /** Binary search for the first row whose offset is <= scrollTop (variable-height rows). */
  private findStartIndex(offsets: number[], scrollTop: number): number {
    let lo = 0;
    let hi = offsets.length - 1;

    while (lo < hi) {
      const mid = (lo + hi + 1) >>> 1;
      if (offsets[mid] <= scrollTop) {
        lo = mid;
      } else {
        hi = mid - 1;
      }
    }

    return lo;
  }

  public window(scrollTop: number, direction: ScrollDirection = 'down'): ViewportWindow {
    const length = this.grid.flatRows.value.length;

    if (this.showAll) {
      return { startIndex: 0, take: length, translateY: 0, totalHeight: this.totalHeight, viewHeight: undefined };
    }

    const { rowHeight } = this.grid;
    const { ROWS_AHEAD, ROWS_BEHIND, PARTIAL_ROWS } = ViewportModel;
    const behind = direction === 'down' ? ROWS_BEHIND : ROWS_AHEAD;
    const { offsets } = this.grid.rowOffsets.value;

    const first = this.hasDetailRows ? this.findStartIndex(offsets, scrollTop) : Math.floor(scrollTop / rowHeight);
    const startIndex = Math.max(0, first - behind);

    const translateY = this.hasDetailRows ? (offsets[startIndex] ?? 0) : startIndex * rowHeight;
    // The window is the same size whichever way it is going — only where it sits moves — so a reversal
    // re-renders the rows that changed rather than the whole body.
    const take = this.visibleRowsCount + PARTIAL_ROWS + ROWS_BEHIND + ROWS_AHEAD;

    return { startIndex, take, translateY, totalHeight: this.totalHeight, viewHeight: this.viewHeight };
  }
}
