import { useCallback, useRef, useState } from 'react';
import VirtualUtils, { VirtualWindow } from '../../utils/virtual/virtualUtils';
import { useEventCallback } from '../a11y/callbacks';
import { useIsomorphicLayoutEffect } from '../effects';

export interface UseVirtualizationOptions {
  /** How many rows there are in total — not how many are rendered. */
  count: number;
  /** The scrolling element: what it shows at once is the viewport, and its own rows are the pitch. */
  scrollerRef: React.RefObject<HTMLElement | null>;
  /** The pitch of a row, when it should be declared rather than measured. */
  itemHeight?: number;
  /** What the scroller shows, when it should be declared rather than measured. */
  viewHeight?: number;
  overscan?: number;
  threshold?: number;
  /** Forces windowing on or off. Left off, it follows the row count against `threshold`. */
  enabled?: boolean;
  /** The row the keyboard is on. Always rendered, whatever the scroll position says. */
  activeIndex?: number;
}

export interface UseVirtualizationResult extends VirtualWindow {
  /** Whether the list is being windowed at all. `false` means render every row and ignore the rest. */
  virtualized: boolean;
  /** Goes on the element that holds the rendered rows — the one the pitch is measured from. */
  contentRef: (element: HTMLElement | null) => void;
  /** Goes on the scrolling element. */
  onScroll: (event: React.UIEvent<HTMLElement>) => void;
}

/**
 * Renders a window of a long list instead of all of it, over the framework-free arithmetic in
 * `VirtualUtils`. The two measurements it needs are taken from the DOM rather than declared, so a row
 * restyled by the caller still windows correctly; until something has been laid out (a first render, or
 * a test environment that computes none) the defaults in the model stand in.
 */
export default function useVirtualization(options: UseVirtualizationOptions): UseVirtualizationResult {
  const { count, scrollerRef, itemHeight, viewHeight, overscan, threshold, enabled, activeIndex } = options;

  // Where the list is scrolled to, and which row was highlighted when it got there. The second half is
  // what stops the highlight pinning the window: a wheel scroll away from the active row has to move the
  // list, and only a highlight that has moved *since* the scroll gets to drag the window back to it.
  const [scroll, setScroll] = useState({ top: 0, at: -1 });
  const [measured, setMeasured] = useState({ itemHeight: 0, viewHeight: 0 });
  const contentEl = useRef<HTMLElement | null>(null);

  const contentRef = useCallback((element: HTMLElement | null) => {
    contentEl.current = element;
  }, []);

  const virtualized = VirtualUtils.shouldVirtualize(count, enabled, threshold);

  const measure = useEventCallback(() => {
    const scroller = scrollerRef.current;
    const content = contentEl.current;
    if (!scroller || !content) return;

    const rows = content.children;
    const first = rows[0] as HTMLElement | undefined;
    const second = rows[1] as HTMLElement | undefined;

    // The *pitch*, not the height: a gap, a margin or a border between two rows is part of the step the
    // window is sliced on, and two adjacent rows are what read it back whatever drew it.
    const pitch = second ? second.offsetTop - first!.offsetTop : (first?.offsetHeight ?? 0);
    const view = scroller.clientHeight;

    // Returning the same object when nothing moved is what keeps a measurement out of a render loop.
    setMeasured((current) =>
      current.itemHeight === pitch && current.viewHeight === view ? current : { itemHeight: pitch, viewHeight: view },
    );
  });

  useIsomorphicLayoutEffect(() => {
    if (!virtualized) return;

    measure();
    if (typeof ResizeObserver === 'undefined') return;

    const scroller = scrollerRef.current;
    if (!scroller) return;

    // The scroller, whose height is the viewport. Not the content, whose height this hook writes.
    const observer = new ResizeObserver(measure);
    observer.observe(scroller);

    return () => observer.disconnect();
  }, [virtualized, count, measure, scrollerRef]);

  const onScroll = useEventCallback((event: React.UIEvent<HTMLElement>) => {
    setScroll({ top: event.currentTarget.scrollTop, at: activeIndex ?? -1 });
  });

  const slice = VirtualUtils.windowFor({
    count,
    itemHeight: itemHeight ?? (measured.itemHeight > 0 ? measured.itemHeight : VirtualUtils.DEFAULT_ITEM_HEIGHT),
    viewHeight: viewHeight ?? (measured.viewHeight > 0 ? measured.viewHeight : VirtualUtils.DEFAULT_VIEW_HEIGHT),
    scrollTop: scroll.top,
    overscan,
    activeIndex: activeIndex === scroll.at ? -1 : activeIndex,
  });

  if (!virtualized) {
    return { startIndex: 0, endIndex: count, offsetY: 0, totalHeight: 0, virtualized, contentRef, onScroll };
  }

  return { ...slice, virtualized, contentRef, onScroll };
}
