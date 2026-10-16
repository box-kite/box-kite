import { createContext, Ref, RefAttributes, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from 'react';
import { BoxProps, useBoxElement } from '../box';
import { useEventCallback, useLatest } from '../react/a11y/callbacks';
import { ChangeDetails, ChangeHandler } from '../react/a11y/useControllableState';
import boxComponent from '../react/boxComponent';
import { useIsomorphicLayoutEffect } from '../react/effects';
import { ComponentsAndVariants } from '../types';
import { scrollParentOf } from '../utils/scroll/scrollUtils';
import SortableUtils, { SortableSlot } from '../utils/sortable/sortableUtils';
import List, { ListItemProps, ListProps } from './list';
import { Circle, Svg } from './svg';
import VisuallyHidden from './visuallyHidden';

export { SortableUtils };

/** What moved an item. The device is the reason here, since a drag and the keyboard are told apart by what they announce. */
export type SortableReason = 'pointer' | 'keyboard';

export interface SortableChangeDetails extends ChangeDetails<SortableReason> {
  /** The item that moved. */
  value: string;
  /** Where it was, and where it is now, as indices into the order. */
  from: number;
  to: number;
}

export interface SortableListProps<TKey extends keyof ComponentsAndVariants = 'list'> extends ListProps<TKey> {
  /** The items: `SortableList.Item`s, each with a `value`, rendered in the order the app holds. */
  children?: React.ReactNode;
  /**
   * The new order, as the items' `value`s. Fires once for a drop and on every step the keyboard takes, so the
   * list moves as the arrows do. The app owns the order: render the items in it and the list follows.
   */
  onOrderChange?: ChangeHandler<string[], SortableReason, SortableChangeDetails>;
  /** The order once it has settled — a drop, or Enter after the arrows. The one to save. */
  onOrderCommit?: ChangeHandler<string[], SortableReason, SortableChangeDetails>;
}

export interface SortableItemProps<TKey extends keyof ComponentsAndVariants = 'list.item'> extends ListItemProps<TKey> {
  /** Who the item is in the order `onOrderChange` reports. Unique within the list. */
  value: string;
  /** What the handle and the announcements call the item: "Move Ada Lovelace". Defaults to `value`. */
  label?: string;
  /** Leaves the item where it is: its handle is disabled. Others may still move past it. */
  disabled?: boolean;
}

export interface SortableHandleProps<TKey extends keyof ComponentsAndVariants = 'sortableList.handle'> extends Omit<
  BoxProps<'button', TKey>,
  'tag'
> {
  /** What the handle shows. Six dots unless given something else; its name is "Move" and the item's `label` either way. */
  children?: React.ReactNode;
}

/** A drag in progress: where it started and the slots it is measured against. */
interface PointerHold {
  id: number;
  startY: number;
  startTop: number;
  lastY: number;
  slots: SortableSlot[];
  /** The order at the start, which the slots are indexed by. */
  order: string[];
  to: number;
}

interface Hold {
  value: string;
  name: string;
  /** The order when it was picked up — what Escape puts back. */
  origin: string[];
  pointer?: PointerHold;
}

/** A press on a handle that has not moved far enough to be a drag. */
interface Press {
  id: number;
  x: number;
  y: number;
  value: string;
  name: string;
}

interface SortableContextValue {
  heldOf(value: string): 'pointer' | 'keyboard' | undefined;
  translateOf(value: string): string | undefined;
  settling: boolean;
  instructionsId: string;
  handleProps(value: string, name: string): Record<string, unknown>;
}

interface ItemContextValue {
  value: string;
  name: string;
  disabled: boolean;
}

const SortableContext = createContext<SortableContextValue | null>(null);
const ItemContext = createContext<ItemContextValue | null>(null);

/** How close to the scroller's edge a drag has to come before the list scrolls under it, and how fast it then goes. */
const EDGE = 48;
const EDGE_SPEED = 12;

const ITEM_SELECTOR = ':scope > [data-sortable-value]';

function itemsOf(list: HTMLElement | null): HTMLElement[] {
  return list ? Array.from(list.querySelectorAll<HTMLElement>(ITEM_SELECTOR)) : [];
}

function orderOf(list: HTMLElement | null): string[] {
  return itemsOf(list).map((item) => item.dataset.sortableValue ?? '');
}

function topsOf(list: HTMLElement | null): Map<string, number> {
  return new Map(itemsOf(list).map((item) => [item.dataset.sortableValue ?? '', item.getBoundingClientRect().top]));
}

function same(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((entry, index) => entry === b[index]);
}

/**
 * A list put in order by hand — a playlist, the columns of a report, a set of priorities.
 *
 * ```tsx
 * <SortableList onOrderChange={(order) => setIds(order)}>
 *   {ids.map((id) => (
 *     <SortableList.Item key={id} value={id} label={names[id]}>
 *       <List.Content><List.Title>{names[id]}</List.Title></List.Content>
 *       <SortableList.Handle />
 *     </SortableList.Item>
 *   ))}
 * </SortableList>
 * ```
 *
 * **It is a `List`**, and each `SortableList.Item` a `List.Item`, so everything a list takes it takes. The
 * one part of its own is `SortableList.Handle`, the button a drag starts from — a handle rather than the
 * whole item, because the item already presses and a finger on it is how the page scrolls.
 *
 * **The app owns the order.** `onOrderChange` reports it as the items' `value`s, once for a drop and on every
 * step of the keyboard, and the list draws whatever order it is rendered in — so a refused move is simply
 * not applied. While a drag is under way nothing is reordered at all: the item follows the pointer and its
 * neighbours step aside, as inline translates (the one inline style here, a value per frame), and the order
 * changes once, on the drop, which then glides into place. Near the edge of whatever scrolls the list, the
 * list scrolls.
 *
 * @a11y Dragging is not a keyboard gesture, so the keyboard gets a **grab**: Enter or Space on a handle picks
 * the item up, the arrows move it, Enter drops it and Escape puts it back — DashboardGrid's model. Every
 * step is announced in a polite live region that is there before there is anything to say.
 * @a11y A press on a handle that does not drag picks the item up too, and while one is held a press on any
 * other item drops it there — the single-pointer way to reorder that WCAG 2.5.7 asks a drag to have.
 * @keyboard Enter, Space — Picks the item up, and drops it again.
 * @keyboard ArrowUp, ArrowDown — Moves a held item one place. Home and End move it to either end.
 * @keyboard Escape — Puts a held item back where it was picked up from.
 */
function SortableListImpl<TKey extends keyof ComponentsAndVariants = 'list'>(props: SortableListProps<TKey>, ref: Ref<HTMLUListElement>) {
  const { onOrderChange, onOrderCommit, children, variant, props: tagProps, ...restProps } = props;

  const listRef = useRef<HTMLUListElement | null>(null);
  const press = useRef<Press | null>(null);
  const flip = useRef<Map<string, number> | null>(null);
  const [held, setHeld] = useState<Hold | null>(null);
  const [travel, setTravel] = useState(0);
  const [settling, setSettling] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const instructionsId = `${useId()}-sortable`;
  const latest = useLatest(held);

  const changeHandler = useEventCallback(onOrderChange);
  const commitHandler = useEventCallback(onOrderCommit);

  const setRefs = useCallback(
    (element: HTMLUListElement | null) => {
      listRef.current = element;
      if (typeof ref === 'function') ref(element);
      else if (ref) (ref as React.RefObject<HTMLUListElement | null>).current = element;
    },
    [ref],
  );

  const positionOf = (order: readonly string[], value: string) => `position ${order.indexOf(value) + 1} of ${order.length}`;

  /** Ask for an order, remembering where everything is drawn now so the change can glide rather than jump. */
  const request = (next: string[], details: SortableChangeDetails) => {
    flip.current = topsOf(listRef.current);
    changeHandler(next, details);
  };

  // Whatever moved since `request` glides from where it was drawn to where it is now. The Web Animations API
  // rather than a transition, so it cannot fight the inline translate a drag leaves behind.
  useIsomorphicLayoutEffect(() => {
    const before = flip.current;
    if (!before) return;

    flip.current = null;
    for (const item of itemsOf(listRef.current)) {
      const top = before.get(item.dataset.sortableValue ?? '');
      const delta = top === undefined ? 0 : top - item.getBoundingClientRect().top;
      const duration = parseFloat(getComputedStyle(item).transitionDuration) * 1000 || 0;
      if (Math.abs(delta) < 1 || duration === 0 || typeof item.animate !== 'function') continue;

      item.animate([{ translate: `0 ${delta}px` }, { translate: '0 0' }], { duration, easing: 'ease-out' });
    }
  });

  // The commit that cleared the drag's translates ran without transitions; the next frame has them back.
  useEffect(() => {
    if (!settling) return;

    const frame = requestAnimationFrame(() => setSettling(false));

    return () => cancelAnimationFrame(frame);
  }, [settling]);

  // A held item whose element the app's reorder moved can lose focus with it; the keyboard is still holding it.
  useIsomorphicLayoutEffect(() => {
    if (!held || held.pointer) return;

    const handle = itemsOf(listRef.current)
      .find((item) => item.dataset.sortableValue === held.value)
      ?.querySelector<HTMLElement>('[data-sortable-handle]');
    if (handle && handle.ownerDocument.activeElement !== handle) handle.focus();
  });

  /** Where the drag is now: the pointer's travel in the list's own space, which a scroll under it changes too. */
  const follow = useEventCallback((grip: Hold, clientY: number) => {
    const pointer = grip.pointer;
    const list = listRef.current;
    if (!pointer || !list) return;

    pointer.lastY = clientY;
    const moved = clientY - list.getBoundingClientRect().top - (pointer.startY - pointer.startTop);
    const from = pointer.order.indexOf(grip.value);
    pointer.to = SortableUtils.targetIndex(pointer.slots, from, moved);
    setTravel(moved);
  });

  const lift = (event: React.PointerEvent<HTMLElement>, start: Press) => {
    const list = listRef.current;
    if (!list) return;

    const top = list.getBoundingClientRect().top;
    const items = itemsOf(list);
    const order = items.map((item) => item.dataset.sortableValue ?? '');
    const slots = items.map((item) => {
      const rect = item.getBoundingClientRect();

      return { top: rect.top - top, height: rect.height };
    });
    const grip: Hold = {
      value: start.value,
      name: start.name,
      origin: order,
      pointer: { id: start.id, startY: start.y, startTop: top, lastY: event.clientY, slots, order, to: order.indexOf(start.value) },
    };

    setHeld(grip);
    follow(grip, event.clientY);
  };

  // Near the scroller's edge the list scrolls, and the drag is re-read every frame since the list moved under it.
  const dragging = held?.pointer !== undefined;
  useEffect(() => {
    if (!dragging) return;

    const scroller = scrollParentOf(listRef.current);
    let frame = 0;
    const tick = () => {
      const grip = latest.current;
      if (grip?.pointer) {
        const y = grip.pointer.lastY;
        const top = scroller ? scroller.getBoundingClientRect().top : 0;
        const bottom = scroller ? scroller.getBoundingClientRect().bottom : window.innerHeight;
        const speed = y < top + EDGE ? -EDGE_SPEED : y > bottom - EDGE ? EDGE_SPEED : 0;
        if (speed) {
          (scroller ?? window).scrollBy(0, speed);
          follow(grip, y);
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [dragging, follow, latest]);

  const grab = (value: string, name: string, event: React.SyntheticEvent) => {
    const order = orderOf(listRef.current);
    setHeld({ value, name, origin: order });
    setAnnouncement(`${name} picked up at ${positionOf(order, value)}. Use the arrow keys to move it, Enter to drop it.`);
    event.preventDefault();
  };

  /** `order` is what a move in the same event asked for, which the DOM does not show until the app has rendered it. */
  const drop = (grip: Hold, event: React.SyntheticEvent, order = orderOf(listRef.current)) => {
    const index = order.indexOf(grip.value);
    setHeld(null);
    commitHandler(order, { reason: 'keyboard', event, value: grip.value, from: grip.origin.indexOf(grip.value), to: index });
    setAnnouncement(`${grip.name} dropped at ${positionOf(order, grip.value)}.`);
  };

  const cancel = useEventCallback((grip: Hold, event: React.SyntheticEvent | Event) => {
    const order = orderOf(listRef.current);
    setHeld(null);
    setTravel(0);
    if (!same(order, grip.origin)) {
      request(grip.origin, {
        reason: grip.pointer ? 'pointer' : 'keyboard',
        event,
        value: grip.value,
        from: order.indexOf(grip.value),
        to: grip.origin.indexOf(grip.value),
      });
    }
    setAnnouncement(`${grip.name} put back at ${positionOf(grip.origin, grip.value)}.`);
  });

  /** A held item moved to `to` by the keyboard or by a press on the item it should go to. */
  const moveTo = (grip: Hold, to: number, event: React.SyntheticEvent) => {
    const order = orderOf(listRef.current);
    const from = order.indexOf(grip.value);
    if (from < 0 || to === from) return order;

    const next = SortableUtils.move(order, from, to);
    request(next, { reason: 'keyboard', event, value: grip.value, from, to });
    setAnnouncement(`${grip.name}, ${positionOf(next, grip.value)}.`);

    return next;
  };

  const handlePointerDown = useEventCallback((event: React.PointerEvent<HTMLElement>, value: string, name: string) => {
    if (event.button !== 0 || event.defaultPrevented) return;

    // Text beside the handle would be selected by the drag, and focus belongs on the handle the drag started from.
    event.preventDefault();
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    press.current = { id: event.pointerId, x: event.clientX, y: event.clientY, value, name };
  });

  const handlePointerMove = useEventCallback((event: React.PointerEvent<HTMLElement>) => {
    const grip = latest.current;
    if (grip?.pointer && grip.pointer.id === event.pointerId) {
      follow(grip, event.clientY);

      return;
    }

    const start = press.current;
    if (!start || start.id !== event.pointerId) return;
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) < SortableUtils.SLOP) return;

    press.current = null;
    lift(event, start);
  });

  const handlePointerUp = useEventCallback((event: React.PointerEvent<HTMLElement>) => {
    const start = press.current;
    press.current = null;
    const grip = latest.current;

    // A press that never became a drag is a press on a button: the same as Enter.
    if (start && start.id === event.pointerId && event.type === 'pointerup') {
      // Another item's handle, while one is held, is a place to put it — which the click that follows says.
      if (grip && !grip.pointer) {
        if (grip.value === start.value) drop(grip, event);
      } else grab(start.value, start.name, event);

      return;
    }

    const pointer = grip?.pointer;
    if (!grip || !pointer || pointer.id !== event.pointerId) return;

    event.currentTarget.releasePointerCapture?.(event.pointerId);
    setSettling(true);

    if (event.type === 'pointercancel') {
      flip.current = topsOf(listRef.current);
      cancel(grip, event);

      return;
    }

    const from = pointer.order.indexOf(grip.value);
    const next = SortableUtils.move(pointer.order, from, pointer.to);
    const details: SortableChangeDetails = { reason: 'pointer', event, value: grip.value, from, to: pointer.to };
    flip.current = topsOf(listRef.current);
    setHeld(null);
    setTravel(0);
    if (pointer.to !== from) changeHandler(next, details);
    commitHandler(next, details);
    setAnnouncement(`${grip.name} dropped at ${positionOf(next, grip.value)}.`);
  });

  const handleKeyDown = useEventCallback((event: React.KeyboardEvent<HTMLElement>, value: string, name: string) => {
    if (event.defaultPrevented) return;

    const grip = latest.current;
    const holding = grip && grip.value === value && !grip.pointer ? grip : undefined;

    if (!holding) {
      if (event.key === 'Enter' || event.key === ' ') grab(value, name, event);

      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      cancel(holding, event);

      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      drop(holding, event);

      return;
    }

    const order = orderOf(listRef.current);
    const to = SortableUtils.keyTarget(event.key, order.indexOf(value), order.length);
    if (to === null) return;

    // The arrows scroll whatever the list is in, and a held item owns them.
    event.preventDefault();
    moveTo(holding, to, event);
  });

  // Focus leaving a held handle cancels the grab — unless it is the app's own reorder that moved it, which the
  // layout effect above has already put right by the time this looks.
  const handleBlur = useEventCallback((value: string) => {
    setTimeout(() => {
      const grip = latest.current;
      const list = listRef.current;
      if (!grip || grip.pointer || grip.value !== value || !list) return;

      const active = list.ownerDocument.activeElement as HTMLElement | null;
      if (active?.closest('[data-sortable-value]')?.getAttribute('data-sortable-value') !== value) cancel(grip, new Event('blur'));
    });
  });

  /** The item a press inside the list landed on, other than the one being held. */
  const targetOf = (event: React.SyntheticEvent): HTMLElement | null => {
    const grip = latest.current;
    if (!grip || grip.pointer || !(event.target instanceof Element)) return null;

    const item = event.target.closest<HTMLElement>('[data-sortable-value]');

    return item && item.parentElement === listRef.current && item.dataset.sortableValue !== grip.value ? item : null;
  };

  // While an item is held, a press on another one is where it goes: kept from moving focus, and from the item's action.
  const handleMouseDownCapture = (event: React.MouseEvent<HTMLUListElement>) => {
    if (targetOf(event)) event.preventDefault();
  };

  const handleClickCapture = (event: React.MouseEvent<HTMLUListElement>) => {
    const item = targetOf(event);
    const grip = latest.current;
    if (!item || !grip) return;

    event.preventDefault();
    event.stopPropagation();
    drop(grip, event, moveTo(grip, orderOf(listRef.current).indexOf(item.dataset.sortableValue ?? ''), event));
  };

  const context = useMemo<SortableContextValue>(() => {
    const pointer = held?.pointer;
    const from = pointer ? pointer.order.indexOf(held.value) : -1;

    return {
      heldOf: (value) => (held && held.value === value ? (held.pointer ? 'pointer' : 'keyboard') : undefined),
      translateOf: (value) => {
        if (!pointer) return undefined;
        if (value === held!.value) return `0 ${Math.round(travel)}px`;

        const shift = SortableUtils.shiftOf(pointer.slots, from, pointer.to, pointer.order.indexOf(value));

        return shift ? `0 ${shift}px` : undefined;
      },
      settling,
      instructionsId,
      handleProps: (value, name) => ({
        type: 'button',
        'data-sortable-handle': '',
        'aria-label': `Move ${name}`,
        'aria-pressed': held?.value === value,
        'aria-describedby': instructionsId,
        onPointerDown: (event: React.PointerEvent<HTMLElement>) => handlePointerDown(event, value, name),
        onPointerMove: handlePointerMove,
        onPointerUp: handlePointerUp,
        onPointerCancel: handlePointerUp,
        onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => handleKeyDown(event, value, name),
        onBlur: () => handleBlur(value),
      }),
    };
  }, [held, travel, settling, instructionsId, handlePointerDown, handlePointerMove, handlePointerUp, handleKeyDown, handleBlur]);

  return (
    <SortableContext.Provider value={context}>
      <List
        ref={setRefs}
        {...(restProps as ListProps)}
        variant={variant as never}
        userSelect={dragging ? 'none' : undefined}
        props={{ ...tagProps, onMouseDownCapture: handleMouseDownCapture, onClickCapture: handleClickCapture }}
      >
        {children}
      </List>
      {/* Outside the list: a `role="list"` may hold nothing but its items. */}
      <VisuallyHidden props={{ role: 'status' }}>{announcement}</VisuallyHidden>
      <VisuallyHidden id={instructionsId}>
        Press Enter or Space to pick the item up, the arrow keys to move it, Enter to drop it and Escape to put it back.
      </VisuallyHidden>
    </SortableContext.Provider>
  );
}

/** One item in the order: a `List.Item` that knows who it is. */
function SortableItem<TKey extends keyof ComponentsAndVariants = 'list.item'>(props: SortableItemProps<TKey>, ref: Ref<HTMLLIElement>) {
  const { value, label, disabled = false, variant, props: tagProps, ...restProps } = props;
  const sortable = useContext(SortableContext);
  const held = sortable?.heldOf(value);
  const translate = sortable?.translateOf(value);
  const item = useMemo(() => ({ value, name: label ?? value, disabled }), [value, label, disabled]);

  return (
    <ItemContext.Provider value={item}>
      <List.Item
        ref={ref}
        {...(restProps as ListItemProps)}
        variant={[variant, { lifted: held === 'pointer', grabbed: held === 'keyboard', settling: sortable?.settling ?? false }] as never}
        style={translate ? { translate } : undefined}
        props={{ ...tagProps, 'data-sortable-value': value } as never}
      />
    </ItemContext.Provider>
  );
}

/** The six dots every platform draws on a thing that can be picked up. */
function Grip() {
  return (
    <Svg viewBox="0 0 16 16" width="1rem" fill="currentColor">
      {[5, 11].flatMap((cx) => [3, 8, 13].map((cy) => <Circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={1.4} />))}
    </Svg>
  );
}

function SortableHandle<TKey extends keyof ComponentsAndVariants = 'sortableList.handle'>(
  props: SortableHandleProps<TKey>,
  ref: Ref<HTMLButtonElement>,
) {
  const { children, variant, props: tagProps, ...restProps } = props;
  const sortable = useContext(SortableContext);
  const item = useContext(ItemContext);
  const handle = item && sortable ? sortable.handleProps(item.value, item.name) : {};

  return useBoxElement<'button'>(
    {
      tag: 'button',
      component: 'sortableList.handle',
      display: 'flex',
      ai: 'center',
      jc: 'center',
      flexShrink: 0,
      width: 10,
      height: 10,
      // Above the action that covers the item, so a press here is the handle's.
      position: 'relative',
      zIndex: 1,
      // The browser's own pan would take the drag away from a finger.
      css: { touchAction: 'none' },
      ...restProps,
      variant: [variant, { grabbed: item ? sortable?.heldOf(item.value) !== undefined : false }],
      props: { ...handle, ...(item?.disabled ? { disabled: true } : {}), ...tagProps },
      children: children ?? <Grip />,
    } as never,
    ref,
  );
}

interface SortableListType {
  <TKey extends keyof ComponentsAndVariants = 'list'>(props: SortableListProps<TKey> & RefAttributes<HTMLUListElement>): React.ReactNode;
  /** One item in the order. Takes everything `List.Item` does, plus its `value`. */
  Item: <TKey extends keyof ComponentsAndVariants = 'list.item'>(
    props: SortableItemProps<TKey> & RefAttributes<HTMLLIElement>,
  ) => React.ReactNode;
  /** The button a drag starts from, and the one the keyboard picks the item up with. Six dots unless given children. */
  Handle: <TKey extends keyof ComponentsAndVariants = 'sortableList.handle'>(
    props: SortableHandleProps<TKey> & RefAttributes<HTMLButtonElement>,
  ) => React.ReactNode;
  displayName?: string;
}

const SortableList = boxComponent(SortableListImpl, 'SortableList') as unknown as SortableListType;
SortableList.Item = boxComponent(SortableItem, 'SortableList.Item') as SortableListType['Item'];
SortableList.Handle = boxComponent(SortableHandle, 'SortableList.Handle') as SortableListType['Handle'];

export default SortableList;
