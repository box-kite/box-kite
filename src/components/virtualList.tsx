import { Fragment, Key, Ref, RefAttributes, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useEventCallback, useLatest } from '../react/a11y/callbacks';
import boxComponent from '../react/boxComponent';
import { useIsomorphicLayoutEffect } from '../react/effects';
import { ComponentsAndVariants } from '../types';
import { scrollParentOf } from '../utils/scroll/scrollUtils';
import MeasuredWindow from '../utils/virtual/measuredWindow';
import List, { ListProps } from './list';

export interface VirtualListRange {
  /** The first item rendered. */
  startIndex: number;
  /** One past the last item rendered. */
  endIndex: number;
}

export interface VirtualListProps<TItem, TKey extends keyof ComponentsAndVariants = 'list'> extends Omit<ListProps<TKey>, 'children'> {
  /** Every item, however many — only the ones near the screen are rendered. */
  items: readonly TItem[];
  /** Who an item is: stable across renders, since an item's measured height is kept under it. */
  itemKey: (item: TItem, index: number) => Key;
  /** Draws one item: a `List.Item`, a `SwipeItem` — one `<li>` per item, and nothing around it. */
  children: (item: TItem, index: number) => React.ReactNode;
  /** What an item is taken to measure before it has been drawn, in px. Default 57, a `md` item and its divider. */
  estimateSize?: number;
  /** Items kept either side of what is on screen, so a fast scroll has something to show. Default 6. */
  overscan?: number;
  /** How many items render before anything is measured — on a server, and in the first frame. Default 20. */
  initialCount?: number;
  /** Fires when the rendered range moves. The way to fetch more: load the next page when `endIndex` nears the end. */
  onRangeChange?: (range: VirtualListRange) => void;
  /** What scrolls the list, when it is not the nearest scrolling ancestor — or, with none, the page. */
  scrollerRef?: React.RefObject<HTMLElement | null>;
}

/**
 * A list too long to render whole — a mailbox, a contact book, a log. Only the items near the screen are in
 * the DOM; the rest is space.
 *
 * ```tsx
 * <VirtualList items={messages} itemKey={(message) => message.id}>
 *   {(message) => (
 *     <List.Item>
 *       <List.Content><List.Title lines={1}>{message.subject}</List.Title></List.Content>
 *     </List.Item>
 *   )}
 * </VirtualList>
 * ```
 *
 * **It is a `List`** — every look and every part — that draws a window of its items. **Items keep their own
 * height**: each one drawn is measured, and kept by its `itemKey`, so a one-line item and a three-line one
 * mix and an item that grows (an image loading, a description opening) moves what is below it. Until an
 * item has been drawn it counts as `estimateSize`, so the scrollbar is right to within the estimate and gets
 * righter as the list is read.
 *
 * **The scroller is found, not declared**: the nearest ancestor that scrolls, or the page itself — which on a
 * phone is usually what scrolls a list. `scrollerRef` names one when that guess is wrong.
 *
 * The space above and below the window is the list's own padding, an inline style (a value per scroll
 * position). Groups and sticky labels need the whole list and do not window; a `SortableList` is for a list
 * short enough to hold whole.
 *
 * @a11y Each rendered item carries `aria-setsize` and `aria-posinset`, so a screen reader says "12 of 4,000"
 * rather than counting the twenty in the DOM.
 * @a11y The item focus is in stays rendered while the list scrolls away from it, so Tab carries on from
 * where it was; and since Tab scrolls its target into view, the window follows the keyboard down the list.
 * @a11y Find-in-page cannot see an item that is not rendered. A list that has to be searchable that way is
 * one to render whole — or to give a search field of its own.
 */
function VirtualListImpl<TItem, TKey extends keyof ComponentsAndVariants = 'list'>(
  props: VirtualListProps<TItem, TKey>,
  ref: Ref<HTMLUListElement>,
) {
  const {
    items,
    itemKey,
    children,
    estimateSize = 57,
    overscan = 6,
    initialCount = 20,
    onRangeChange,
    scrollerRef,
    vars,
    css,
    props: tagProps,
    ...restProps
  } = props;

  const listRef = useRef<HTMLUListElement | null>(null);
  // Kept by key, so an item measured once keeps its height through a sort, a filter or an insert above it.
  const [sizes, setSizes] = useState<ReadonlyMap<Key, number>>(() => new Map());
  const [, setTick] = useState(0);
  const [range, setRange] = useState<VirtualListRange>({ startIndex: 0, endIndex: Math.min(initialCount, items.length) });
  const [pin, setPin] = useState(-1);
  const rangeHandler = useEventCallback(onRangeChange);

  const setRefs = useCallback(
    (element: HTMLUListElement | null) => {
      listRef.current = element;
      if (typeof ref === 'function') ref(element);
      else if (ref) (ref as React.RefObject<HTMLUListElement | null>).current = element;
    },
    [ref],
  );

  const keys = useMemo(() => items.map((item, index) => itemKey(item, index)), [items, itemKey]);
  const offsets = useMemo(() => MeasuredWindow.offsetsOf(keys.map((key) => sizes.get(key) ?? estimateSize)), [keys, sizes, estimateSize]);
  const latest = useLatest({ offsets, pin, overscan, count: items.length });

  // Fewer items than the window reached — a filter, a delete — pulls the window back inside the list.
  const startIndex = Math.min(range.startIndex, Math.max(0, items.length - 1));
  const endIndex = Math.min(Math.max(range.endIndex, startIndex), items.length);
  const total = offsets[items.length];

  /** Which items the screen shows now, read off the list's place under the scroller. */
  const update = useEventCallback(() => {
    const list = listRef.current;
    const { offsets: known, pin: pinned, overscan: around, count } = latest.current!;
    if (!list || count === 0) return;

    const scroller = scrollerRef?.current ?? scrollParentOf(list);
    const view = list.ownerDocument.defaultView;
    const top = scroller ? scroller.getBoundingClientRect().top + scroller.clientTop : 0;
    const height = scroller ? scroller.clientHeight : (view?.innerHeight ?? 0);
    const listTop = list.getBoundingClientRect().top + list.clientTop;
    const next = MeasuredWindow.measuredWindow({
      offsets: known,
      viewStart: top - listTop,
      viewEnd: top - listTop + height,
      overscan: around,
      pin: pinned,
    });

    setRange((current) =>
      current.startIndex === next.startIndex && current.endIndex === next.endIndex
        ? current
        : { startIndex: next.startIndex, endIndex: next.endIndex },
    );
  });

  // The items just drawn, measured: a height that changed is a new set of offsets, and so maybe a new window.
  useIsomorphicLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;

    let measured: Map<Key, number> | null = null;
    let above = 0;
    const scroller = scrollerRef?.current ?? scrollParentOf(list);
    const viewTop = scroller ? scroller.getBoundingClientRect().top : 0;
    const gap = parseFloat(getComputedStyle(list).rowGap) || 0;
    Array.from(list.children).forEach((child, index) => {
      const position = startIndex + index;
      const key = keys[position];
      if (key === undefined) return;

      child.setAttribute('aria-setsize', String(items.length));
      child.setAttribute('aria-posinset', String(position + 1));

      // A height of zero is an environment that lays nothing out, not an empty item: the estimate stands.
      const rect = child.getBoundingClientRect();
      const size = rect.height + gap;
      const known = sizes.get(key) ?? estimateSize;
      if (rect.height > 0 && sizes.get(key) !== size) {
        measured ??= new Map(sizes);
        measured.set(key, size);
        // Above the screen, a height that differs from what was counted for it pushed what is on screen along.
        if (rect.bottom <= viewTop) above += size - known;
      }
    });

    // Scrolled by exactly that much, before the paint, so what is on screen stays put — or the window would chase it.
    if (above !== 0) {
      // `instant`, or a page's `scroll-behavior: smooth` would turn the correction into a glide.
      const target = scroller ?? list.ownerDocument.defaultView;
      const top = scroller ? scroller.scrollTop : ((target as Window | null)?.scrollY ?? 0);
      target?.scrollTo({ top: top + above, behavior: 'instant' });
    }

    if (measured) setSizes(measured);
    else update();
  });

  // A later change of height — an image arriving, a description opening — is a measurement too.
  useEffect(() => {
    const list = listRef.current;
    if (!list || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(() => setTick((current) => current + 1));
    Array.from(list.children).forEach((child) => observer.observe(child));

    return () => observer.disconnect();
  }, [range, keys]);

  // Scrolling, and the scroller changing size, move the window. One read per frame however many events arrive.
  useEffect(() => {
    const list = listRef.current;
    const view = list?.ownerDocument.defaultView;
    if (!list || !view) return;

    const scroller = scrollerRef?.current ?? scrollParentOf(list);
    const target: HTMLElement | Window = scroller ?? view;
    let frame = 0;
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(() => ((frame = 0), update()));
    };

    target.addEventListener('scroll', schedule, { passive: true });
    view.addEventListener('resize', schedule);
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule);
    if (scroller) observer?.observe(scroller);

    return () => {
      cancelAnimationFrame(frame);
      target.removeEventListener('scroll', schedule);
      view.removeEventListener('resize', schedule);
      observer?.disconnect();
    };
  }, [scrollerRef, update]);

  useEffect(() => {
    rangeHandler({ startIndex: range.startIndex, endIndex: range.endIndex });
  }, [range, rangeHandler]);

  const handleFocus = (event: React.FocusEvent<HTMLUListElement>) => {
    const list = listRef.current;
    const item = Array.from(list?.children ?? []).findIndex((child) => child.contains(event.target));
    if (item >= 0) setPin(startIndex + item);
  };

  const handleBlur = (event: React.FocusEvent<HTMLUListElement>) => {
    if (!listRef.current?.contains(event.relatedTarget as Node | null)) setPin(-1);
  };

  const rendered: React.ReactNode[] = [];
  for (let index = startIndex; index < endIndex; index++) {
    rendered.push(<Fragment key={keys[index]}>{children(items[index], index)}</Fragment>);
  }

  return (
    <List
      ref={setRefs}
      {...(restProps as ListProps)}
      // The first item drawn keeps its divider unless it is the first item.
      vars={startIndex > 0 ? { ...vars, 'list-first-divider': 'block' } : vars}
      // The scroll correction is the list's own; the browser's anchoring would make it twice. And the space above and
      // below must not transition, as every Box's `all` would have it — the window would slide instead of being there.
      css={{ ...css, overflowAnchor: 'none' }}
      transition="none"
      style={{ paddingBlockStart: `${offsets[startIndex]}px`, paddingBlockEnd: `${Math.max(0, total - offsets[endIndex])}px` }}
      props={{ ...tagProps, onFocus: handleFocus, onBlur: handleBlur }}
    >
      {rendered}
    </List>
  );
}

type VirtualListType = (<TItem, TKey extends keyof ComponentsAndVariants = 'list'>(
  props: VirtualListProps<TItem, TKey> & RefAttributes<HTMLUListElement>,
) => React.ReactNode) & { displayName?: string };

const VirtualList = boxComponent(VirtualListImpl, 'VirtualList') as unknown as VirtualListType;

export default VirtualList;
