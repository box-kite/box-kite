import { useCallback, useRef, useState } from 'react';
import Box from '../../box';
import { ClassNameType } from '../../core';
import useVirtualization from '../../react/hooks/useVirtualization';
import { BoxStyleProps } from '../../types';
import { AnchorSide } from '../../utils/anchor/anchorUtils';
import ComboboxUtils, { ComboboxRow, ComboboxRowDef } from '../../utils/combobox/comboboxUtils';
import { ElementLike } from '../../utils/dom/domUtils';
import Flex from '../flex';
import Overlay from '../overlay';
import { PresenceHandle } from '../presence';

/** How a long list is windowed, or `false` to render every row of it however many there are. */
export interface ComboboxVirtualize {
  /** The pitch of a row, when it should be declared rather than measured off the rendered ones. */
  itemHeight?: number;
  /** Rows kept either side of what is visible. */
  overscan?: number;
  /** How many rows it takes before windowing starts. */
  threshold?: number;
}

export interface ComboboxListboxProps<TRow> {
  /** Which way the popup is going, from the `<Presence>` that owns its mount. */
  presence: PresenceHandle;
  /** Every row the listbox shows, already in keyboard order. */
  rows: ComboboxRow<TRow>[];
  def: ComboboxRowDef<TRow>;
  /** Custom row rendering. The label is still what is searched and what the field shows. */
  display?: (row: TRow) => React.ReactNode;
  selection: TRow[];
  multiple: boolean;
  /** The row the keyboard is on, or `-1` when it is on none of them. */
  activeIndex: number;
  optionId: (index: number) => string;
  rowRef: (index: number) => (element: HTMLElement | null) => void;
  onSelect: (index: number, event: React.SyntheticEvent) => void;
  /** The shell the popup hangs off: the field and its chips. */
  anchorRef: ElementLike;
  /** The layer element — what the dismissal hook treats as *inside* the popup. */
  popupRef: React.Ref<HTMLDivElement>;
  listboxId: string;
  labelledBy: string;
  /** Options are on their way. Says so rather than claiming the list is empty. */
  loading?: boolean;
  loadingText: React.ReactNode;
  emptyText: React.ReactNode;
  /** What the create row reads. Given the query, since the row it would make is not shown. */
  createLabel: (query: string) => React.ReactNode;
  /** Render only the rows on screen. On above the threshold by default; `false` never. */
  virtualize?: boolean | ComboboxVirtualize;
  variant: ClassNameType;
  itemsProps?: BoxStyleProps;
}

/**
 * The popup: a `listbox` while it has options, and a status message when it has none. A message is
 * announced rather than offered as something to choose, which is why the role changes rather than an
 * unselectable option standing in for it.
 */
function rolesFor(hasOptions: boolean, multiple: boolean, loading: boolean, labelledBy: string): Record<string, unknown> {
  if (!hasOptions) return { role: 'status' };

  return {
    role: 'listbox',
    'aria-labelledby': labelledBy,
    // Only when true: `false` is the default, and saying it on every single-select listbox is noise.
    ...(multiple ? { 'aria-multiselectable': true } : {}),
    // The list on screen is about to be replaced, which is worth knowing before reading it out.
    ...(loading ? { 'aria-busy': true } : {}),
  };
}

export default function ComboboxListbox<TRow>(props: ComboboxListboxProps<TRow>) {
  const { presence, rows, def, display, selection, multiple, activeIndex, optionId, rowRef, onSelect } = props;
  const { anchorRef, popupRef, listboxId, labelledBy, loading, loadingText, emptyText, createLabel, variant, itemsProps } = props;
  const { virtualize } = props;
  const { present, ref: contentRef, props: presenceProps } = presence;
  const keyFor = (row: TRow) => ComboboxUtils.keyOf(def, row);

  // Which way it went, from the browser rather than from a guess about the viewport. It arrives too late
  // for the entrance and in good time for the exit, which is the whole of what `closedUp` is.
  const [openUp, setOpenUp] = useState(false);
  const handleSideChange = useCallback((side: AnchorSide) => setOpenUp(side === 'top'), []);

  // The popup is the scrolling element as well as the transitioning one, so the two refs on it are
  // merged by hand — the only place the listbox needs an element for itself.
  const scrollerRef = useRef<HTMLElement | null>(null);
  const setScrollerRef = useCallback(
    (element: HTMLDivElement | null) => {
      scrollerRef.current = element;
      contentRef(element);
    },
    [contentRef],
  );

  const tuning = typeof virtualize === 'object' ? virtualize : {};
  const {
    virtualized,
    startIndex,
    endIndex,
    offsetY,
    totalHeight,
    contentRef: windowRef,
    onScroll,
  } = useVirtualization({
    count: rows.length,
    scrollerRef,
    enabled: typeof virtualize === 'boolean' ? virtualize : undefined,
    activeIndex,
    ...tuning,
  });

  const visibleRows = virtualized ? rows.slice(startIndex, endIndex) : rows;

  const renderRow = (row: ComboboxRow<TRow>, offset: number) => {
    // The *absolute* index, never the one in the slice: it is what `aria-activedescendant` names, what
    // the roving hook holds a ref under, and what a press reports back.
    const index = virtualized ? startIndex + offset : offset;
    const selected = row.kind === 'option' && ComboboxUtils.isSelected(selection, row.row, keyFor);
    const disabled = ComboboxUtils.isRowDisabled(def, row);

    return (
      <Flex
        key={row.kind === 'option' ? keyFor(row.row) : 'create'}
        ref={rowRef(index)}
        component="combobox.item"
        // `highlighted` is where the keyboard is, and a listbox driven by `aria-activedescendant`
        // has to draw that itself: nothing in it holds DOM focus, so `:focus-within` never fires.
        variant={[variant, { create: row.kind === 'create', highlighted: index === activeIndex }] as never}
        // Writes `aria-selected` as well as styling it, which is what makes the role legal.
        selected={selected}
        ai="center"
        gap={2}
        id={optionId(index)}
        props={{
          role: 'option',
          // A windowed listbox holds fifty of ten thousand options, so the count a screen reader can
          // see is the slice. These two are what make it the whole list again.
          ...(virtualized ? { 'aria-setsize': rows.length, 'aria-posinset': index + 1 } : {}),
          // Focusable it is not, so the arrows never land here — but a row that cannot be chosen
          // still has to say so, and `aria-disabled` is what APG asks for over the attribute.
          ...(disabled ? { 'aria-disabled': true } : {}),
          // A press on a row must not take focus off the field, or the next keystroke goes nowhere.
          onMouseDown: (event: React.MouseEvent) => event.preventDefault(),
          onClick: (event: React.MouseEvent) => !disabled && onSelect(index, event),
        }}
      >
        {row.kind === 'create' ? createLabel(row.query) : (display?.(row.row) ?? ComboboxUtils.labelOf(def, row.row))}
      </Flex>
    );
  };

  return (
    <Overlay ref={popupRef} anchor={anchorRef} side="bottom" align="start" offset={0.5} matchWidth onSideChange={handleSideChange}>
      <Box
        ref={setScrollerRef}
        component="combobox.items"
        {...itemsProps}
        variant={[variant, { closed: !present && !openUp, closedUp: !present && openUp }] as never}
        id={listboxId}
        props={{
          ...rolesFor(rows.length > 0, multiple, loading === true, labelledBy),
          ...presenceProps,
          ...(virtualized ? { onScroll } : {}),
        }}
      >
        {virtualized ? (
          <Box
            ref={windowRef}
            component="combobox.window"
            variant={variant as never}
            // The whole list's height is what gives the scrollbar its range, and the padding above the
            // slice is what puts it where it belongs. Both are per-scroll numbers, so neither is a class.
            style={{ height: totalHeight, paddingTop: offsetY }}
          >
            {visibleRows.map(renderRow)}
          </Box>
        ) : (
          visibleRows.map(renderRow)
        )}

        {rows.length === 0 && (
          <Box component="combobox.message" variant={variant as never}>
            {loading ? loadingText : emptyText}
          </Box>
        )}
      </Box>
    </Overlay>
  );
}
