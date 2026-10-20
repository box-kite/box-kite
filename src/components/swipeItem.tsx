import { createContext, Ref, RefAttributes, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { BoxProps, useBoxElement } from '../box';
import { useEventCallback, useLatest } from '../react/a11y/callbacks';
import useControllableState, { ChangeDetails, ChangeHandler } from '../react/a11y/useControllableState';
import boxComponent from '../react/boxComponent';
import { useIsomorphicLayoutEffect } from '../react/effects';
import { ComponentsAndVariants } from '../types';
import AnimationUtils from '../utils/animation/animationUtils';
import { clearSelection, isEventInside, isRtl } from '../utils/dom/domUtils';
import { documentOrNull } from '../utils/environment/environmentUtils';
import SwipeUtils, { SwipeSide, SwipeTrays } from '../utils/swipe/swipeUtils';
import List from './list';
import { ITEM_FRAME, ITEM_ROW, ITEM_SIZES, ListItemSize, withDefaults } from './list/listItemParts';

export type { SwipeSide };
export { SwipeUtils };

/** Why a tray opened or closed. A swipe, focus reaching a tray's button, a press elsewhere, Escape, an action chosen. */
export type SwipeReason = 'swipe' | 'focus' | 'outside-pointer' | 'escape' | 'action';

export interface SwipeItemProps<TKey extends keyof ComponentsAndVariants = 'list.item'> extends Omit<BoxProps<'li', TKey>, 'open'> {
  /** The item's parts, exactly as in a `List.Item`: `List.Media`, `List.Content`, `List.End`, `List.Actions`. */
  children?: React.ReactNode;
  /** `SwipeItem.Action`s under the inline start edge — a swipe towards the end of the line reveals them. The first is outermost. */
  startActions?: React.ReactNode;
  /** `SwipeItem.Action`s under the inline end edge — a swipe towards the start reveals them. The first is outermost. */
  endActions?: React.ReactNode;
  /** A swipe carried most of the way across performs the outermost action instead of stopping at the tray — iOS's archive. */
  fullSwipe?: boolean;
  /** Which tray is open. Controlled; `null` is closed. */
  open?: SwipeSide | null;
  /** Which tray is open to begin with. */
  defaultOpen?: SwipeSide | null;
  /** Which tray is open now, and why: a `swipe`, `focus`, an `outside-pointer` press, `escape`, or an `action` chosen. */
  onOpenChange?: ChangeHandler<SwipeSide | null, SwipeReason>;
  /** The item's spacing, as on `List.Item`. */
  size?: ListItemSize;
  /** Lets the item's parts wrap onto a second line, as on `List.Item`. */
  wrap?: boolean;
  /** Tints the item as chosen, as on `List.Item`. */
  selected?: boolean;
  /** Ends the item with a chevron, as on `List.Item`. */
  chevron?: boolean;
}

export interface SwipeActionProps<TKey extends keyof ComponentsAndVariants = 'swipeItem.action'> extends Omit<
  BoxProps<'button', TKey>,
  'tag'
> {
  /** What it does, in a word: "Archive", "Delete". It is the button's name. */
  children?: React.ReactNode;
  /** An icon over the label. Decoration — the label names the button. */
  icon?: React.ReactNode;
  /** Runs the command. The tray closes after it unless `closeOnSelect` is `false`. */
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  /** Whether choosing the action closes the tray. Default `true`. */
  closeOnSelect?: boolean;
}

interface Drag {
  pointerId: number;
  x: number;
  y: number;
  rest: number;
  intent: 'swipe' | 'scroll' | null;
  /** The recent samples along the line, for the release velocity. */
  samples: SwipeUtils.Sample[];
}

interface TrayContextValue {
  side: SwipeSide;
  armed: boolean;
  close: (details: ChangeDetails<SwipeReason>) => void;
}

const TrayContext = createContext<TrayContextValue | null>(null);

const NO_TRAYS: SwipeTrays = { start: 0, end: 0 };

/**
 * A list item that slides aside to show the commands under it — Mail's archive and delete.
 *
 * ```tsx
 * <List>
 *   <SwipeItem
 *     fullSwipe
 *     endActions={<SwipeItem.Action variant="danger" onClick={() => remove(id)}>Delete</SwipeItem.Action>}
 *   >
 *     <List.Content>
 *       <List.Title><List.Action props={{ href: `/inbox/${id}` }}>Ada Lovelace</List.Action></List.Title>
 *     </List.Content>
 *   </SwipeItem>
 * </List>
 * ```
 *
 * **It is a `List.Item`** — same parts, same sizes, same look — whose row slides along the line while a tray
 * of `SwipeItem.Action`s opens in the space it leaves. Nothing sits *under* the row, so the row needs no
 * background of its own and keeps whatever the list paints. A tray past half open opens, short of it closes,
 * and a flick goes the way it was going; with `fullSwipe`, carrying it most of the way across performs the
 * outermost action. A press on an open item closes it rather than following the item's action.
 *
 * **The row's offset is an inline style**, the one here — a value per frame of a drag, which a class would
 * make a rule per frame that is never freed. It is the `Slider` exception, for the same reason.
 *
 * @a11y A swipe is a shortcut, not the only way in. The actions are real buttons in the tab order, after the
 * item's own action, and focus reaching one opens its tray — so a keyboard and a screen reader find them
 * without swiping. A path-based gesture still needs a non-path way for a pointer (WCAG 2.5.1): offer the same
 * commands where a press reaches them too, on the item's own page or in a `Menu` in `List.Actions`.
 * @keyboard Tab — Reaches the tray's actions after the item's own, opening the tray they are in.
 * @keyboard Escape — Closes an open tray and returns focus to the item's action.
 */
function SwipeItemImpl<TKey extends keyof ComponentsAndVariants = 'list.item'>(props: SwipeItemProps<TKey>, ref: Ref<HTMLLIElement>) {
  const {
    size = 'md',
    wrap = false,
    selected = false,
    chevron = false,
    startActions,
    endActions,
    fullSwipe = false,
    open,
    defaultOpen = null,
    onOpenChange,
    variant,
    children,
    props: tagProps,
    ...restProps
  } = props;

  const itemRef = useRef<HTMLLIElement | null>(null);
  const startRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const suppressClick = useRef(false);

  const [current, setOpen] = useControllableState<SwipeSide | null, SwipeReason>({
    value: open,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
    interaction: { component: 'swipeItem', type: 'openChange' },
  });
  const [live, setLive] = useState<number | null>(null);
  const [full, setFull] = useState<SwipeSide | null>(null);
  const [geometry, setGeometry] = useState({ trays: NO_TRAYS, width: 0, rtl: false });
  const latest = useLatest(geometry);

  const setRefs = useCallback(
    (element: HTMLLIElement | null) => {
      itemRef.current = element;
      if (typeof ref === 'function') ref(element);
      else if (ref) (ref as React.RefObject<HTMLLIElement | null>).current = element;
    },
    [ref],
  );

  /** The trays' natural widths, the item's and the direction — read off the DOM whenever a tray is about to move. */
  const measure = useEventCallback(() => {
    const trayWidth = (tray: HTMLDivElement | null) => (tray?.firstElementChild as HTMLElement | null)?.offsetWidth ?? 0;
    const next = {
      trays: { start: startActions ? trayWidth(startRef.current) : 0, end: endActions ? trayWidth(endRef.current) : 0 },
      width: itemRef.current?.offsetWidth ?? 0,
      rtl: isRtl(itemRef.current),
    };
    const known = latest.current!;
    const same =
      known.trays.start === next.trays.start && known.trays.end === next.trays.end && known.width === next.width && known.rtl === next.rtl;
    if (!same) setGeometry(next);

    return next;
  });

  // An item opened from outside — a controlled `open`, a default — has to know how far to open.
  useIsomorphicLayoutEffect(() => {
    if (current) measure();
  }, [current, measure]);

  const close = useEventCallback((details: ChangeDetails<SwipeReason>) => setOpen(null, details));

  // A press anywhere else closes it, the way an open row in Mail closes when another is touched.
  useEffect(() => {
    const document = documentOrNull();
    if (!current || !document) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!isEventInside(event, [itemRef])) close({ reason: 'outside-pointer', event });
    };
    document.addEventListener('pointerdown', handlePointerDown, true);

    return () => document.removeEventListener('pointerdown', handlePointerDown, true);
  }, [current, close]);

  // A full swipe slides the row the whole way across, then presses the outermost action once it gets there.
  useEffect(() => {
    if (!full) return;

    const tray = (full === 'start' ? startRef : endRef).current;
    const row = itemRef.current?.firstElementChild;
    const wait = row && typeof getComputedStyle === 'function' ? AnimationUtils.activeDuration(getComputedStyle(row)) : 0;
    const timer = setTimeout(() => {
      setFull(null);
      tray?.querySelector<HTMLButtonElement>('[data-swipe-action]')?.click();
    }, wait + AnimationUtils.SETTLE_FRAME);

    return () => clearTimeout(timer);
  }, [full]);

  const handlePointerDown = useEventCallback((event: React.PointerEvent<HTMLDivElement>) => {
    suppressClick.current = false;
    if (event.button !== 0 || full || (!startActions && !endActions)) return;

    const { trays } = measure()!;
    drag.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      rest: SwipeUtils.restOffset(current, trays),
      intent: null,
      samples: [{ t: event.timeStamp, x: event.clientX }],
    };
  });

  const handlePointerMove = useEventCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const held = drag.current;
    if (!held || held.pointerId !== event.pointerId || held.intent === 'scroll') return;

    const dx = event.clientX - held.x;
    if (!held.intent) {
      held.intent = SwipeUtils.intent(dx, event.clientY - held.y);
      if (held.intent !== 'swipe') return;

      event.currentTarget.setPointerCapture?.(event.pointerId);
      clearSelection(event.currentTarget);
    }

    const { trays, width, rtl } = latest.current!;
    held.samples = SwipeUtils.track(held.samples, { t: event.timeStamp, x: event.clientX });
    setLive(SwipeUtils.offsetFor(held.rest, rtl ? -dx : dx, trays, width, fullSwipe));
  });

  const handlePointerUp = useEventCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const held = drag.current;
    if (!held || held.pointerId !== event.pointerId) return;

    drag.current = null;
    if (held.intent !== 'swipe' || live === null) return;

    event.currentTarget.releasePointerCapture?.(event.pointerId);
    // The press that ends a swipe is not a press on whatever the pointer happens to be over.
    suppressClick.current = true;

    const { trays, width, rtl } = latest.current!;
    const velocity = SwipeUtils.velocity(held.samples) * (rtl ? -1 : 1);
    const rest =
      event.type === 'pointercancel' ? { open: current, full: null } : SwipeUtils.settle(live, velocity, trays, width, fullSwipe);

    setLive(null);
    if (rest.full) {
      setFull(rest.full);
      setOpen(null, { reason: 'swipe', event });
    } else {
      setOpen(rest.open, { reason: 'swipe', event });
    }
  });

  const handleClickCapture = useEventCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (suppressClick.current) {
      suppressClick.current = false;
      event.preventDefault();
      event.stopPropagation();

      return;
    }

    // An open row is closed by a press on it, rather than pressed: the press was most likely aimed at closing it.
    if (current) {
      event.preventDefault();
      event.stopPropagation();
      close({ reason: 'outside-pointer', event });
    }
  });

  const handleFocus = useEventCallback((event: React.FocusEvent<HTMLLIElement>) => {
    const side = startRef.current?.contains(event.target) ? 'start' : endRef.current?.contains(event.target) ? 'end' : null;
    if (side && side !== current) {
      measure();
      setOpen(side, { reason: 'focus', event });
    }
  });

  const handleBlur = useEventCallback((event: React.FocusEvent<HTMLLIElement>) => {
    const next = event.relatedTarget as Node | null;
    if (current && (!next || !itemRef.current?.contains(next))) close({ reason: 'focus', event });
  });

  const handleKeyDown = useEventCallback((event: React.KeyboardEvent<HTMLLIElement>) => {
    if (event.key !== 'Escape' || !current || event.defaultPrevented) return;

    event.preventDefault();
    close({ reason: 'escape', event });
    itemRef.current?.querySelector<HTMLElement>('[data-list-action]')?.focus();
  });

  const { trays, width, rtl } = geometry;
  const offset = live ?? (full ? (full === 'start' ? width : -width) : SwipeUtils.restOffset(current, trays));
  const armed = live !== null ? SwipeUtils.armed(live, trays, width, fullSwipe) : full;
  const dragging = live !== null;

  const tray = (side: SwipeSide, actions: React.ReactNode) => (
    <SwipeTray
      side={side}
      trayRef={side === 'start' ? startRef : endRef}
      width={side === 'start' ? Math.max(0, offset) : Math.max(0, -offset)}
      dragging={dragging}
    >
      <TrayContext.Provider value={{ side, armed: armed === side, close }}>{actions}</TrayContext.Provider>
    </SwipeTray>
  );

  return useBoxElement<'li'>(
    {
      tag: 'li',
      component: 'list.item',
      ...withDefaults({ ...ITEM_FRAME, css: { ...ITEM_FRAME.css, overflow: 'clip' } }, restProps),
      variant: [variant, { selected }],
      props: { ...tagProps, onFocus: handleFocus, onBlur: handleBlur, onKeyDown: handleKeyDown },
      children: (
        <>
          <SwipeRow
            size={size}
            wrap={wrap}
            dragging={dragging}
            translate={offset === 0 ? undefined : `${Math.round(rtl ? -offset : offset)}px`}
            handlers={{
              onPointerDown: handlePointerDown,
              onPointerMove: handlePointerMove,
              onPointerUp: handlePointerUp,
              onPointerCancel: handlePointerUp,
              onClickCapture: handleClickCapture,
              // A link's own drag would take the pointer away from the swipe.
              onDragStart: (event: React.DragEvent) => event.preventDefault(),
            }}
          >
            {children}
            {chevron && <List.Chevron />}
          </SwipeRow>
          {startActions ? tray('start', startActions) : null}
          {endActions ? tray('end', endActions) : null}
        </>
      ),
    } as never,
    setRefs,
  );
}

interface SwipeRowProps {
  size: ListItemSize;
  wrap: boolean;
  dragging: boolean;
  translate?: string;
  handlers: Record<string, unknown>;
  children?: React.ReactNode;
}

/** The part that slides: the item's row, carrying its covering action with it. */
function SwipeRow({ size, wrap, dragging, translate, handlers, children }: SwipeRowProps) {
  return useBoxElement({
    component: 'swipeItem.row',
    ...ITEM_ROW,
    ...ITEM_SIZES[size],
    ...(wrap ? { flexWrap: 'wrap' } : {}),
    position: 'relative',
    // The page keeps the vertical pan; the sideways one is the swipe's.
    css: { touchAction: 'pan-y' },
    variant: { dragging },
    style: translate ? { translate } : undefined,
    props: handlers,
    children,
  } as never);
}

interface SwipeTrayProps {
  side: SwipeSide;
  trayRef: React.RefObject<HTMLDivElement | null>;
  width: number;
  dragging: boolean;
  children?: React.ReactNode;
}

/**
 * Exactly as wide as the space the row has left, so nothing is ever under the row. The actions inside sit
 * against the outer edge and are clipped from the inner one, which is how the outermost appears first.
 */
function SwipeTray({ side, trayRef, width, dragging, children }: SwipeTrayProps) {
  const inner = useBoxElement({
    display: 'flex',
    d: side === 'end' ? 'row-reverse' : 'row',
    position: 'absolute',
    top: 0,
    bottom: 0,
    ...(side === 'start' ? { insetStart: 0 } : { insetEnd: 0 }),
    minWidth: 'fit',
    css: { width: 'max-content' },
    children,
  } as never);

  return useBoxElement(
    {
      component: 'swipeItem.tray',
      position: 'absolute',
      top: 0,
      bottom: 0,
      ...(side === 'start' ? { insetStart: 0 } : { insetEnd: 0 }),
      overflow: 'hidden',
      variant: { dragging },
      style: { width: `${Math.round(width)}px` },
      children: inner,
    } as never,
    trayRef as never,
  );
}

/** One command in a tray: a label, and an icon over it if there is one. */
function SwipeAction<TKey extends keyof ComponentsAndVariants = 'swipeItem.action'>(
  props: SwipeActionProps<TKey>,
  ref: Ref<HTMLButtonElement>,
) {
  const { icon, onClick, closeOnSelect = true, variant, children, props: tagProps, ...restProps } = props;
  const tray = useContext(TrayContext);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    if (closeOnSelect && !event.defaultPrevented) tray?.close({ reason: 'action', event });
  };

  return useBoxElement<'button'>(
    {
      tag: 'button',
      component: 'swipeItem.action',
      display: 'flex',
      d: 'column',
      ai: 'center',
      jc: 'center',
      gap: 1,
      px: 4,
      minWidth: 18,
      flexGrow: 1,
      flexShrink: 0,
      fontSize: 14,
      lineHeight: 18,
      fontWeight: 500,
      cursor: 'pointer',
      ...restProps,
      variant: [variant, { armed: tray?.armed ?? false }],
      props: { type: 'button', 'data-swipe-action': '', ...tagProps, onClick: handleClick },
      children: icon ? (
        <>
          <SwipeActionIcon>{icon}</SwipeActionIcon>
          {children}
        </>
      ) : (
        children
      ),
    } as never,
    ref,
  );
}

function SwipeActionIcon({ children }: { children?: React.ReactNode }) {
  return useBoxElement({ tag: 'span', display: 'flex', props: { 'aria-hidden': true }, children } as never);
}

interface SwipeItemType {
  <TKey extends keyof ComponentsAndVariants = 'list.item'>(props: SwipeItemProps<TKey> & RefAttributes<HTMLLIElement>): React.ReactNode;
  /** One command in a tray. `variant` is `accent`, `warning` or `danger`; unset, it is neutral. */
  Action: <TKey extends keyof ComponentsAndVariants = 'swipeItem.action'>(
    props: SwipeActionProps<TKey> & RefAttributes<HTMLButtonElement>,
  ) => React.ReactNode;
  displayName?: string;
}

const SwipeItem = boxComponent(SwipeItemImpl, 'SwipeItem') as unknown as SwipeItemType;
SwipeItem.Action = boxComponent(SwipeAction, 'SwipeItem.Action') as SwipeItemType['Action'];

export default SwipeItem;
