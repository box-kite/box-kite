import { createContext, CSSProperties, FunctionComponent, ReactNode, useContext, useId, useMemo, useRef, useState } from 'react';
import Box, { BoxProps } from '../box';
import { useEventCallback, useLatest } from '../react/a11y/callbacks';
import useControllableState, { ChangeDetails, ChangeHandler } from '../react/a11y/useControllableState';
import { ComponentsAndVariants } from '../types';
import DashboardUtils, { DashboardItem, DashboardLayout, DashboardStep } from '../utils/dashboard/dashboardUtils';
import { isRtl } from '../utils/dom/domUtils';
import { Circle, Path, Svg } from './svg';
import VisuallyHidden from './visuallyHidden';

export type { DashboardItem, DashboardLayout };
export { DashboardUtils };

/**
 * Why a layout changed. The *device* is not a reason here — a drag and an arrow key both move a widget,
 * and `details.event` says which one did it; what a consumer acts on differently is move against resize.
 */
export type DashboardReason = 'move' | 'resize' | 'imperative';

/** The container sizes columns are declared against — the `cq` scale, since a dashboard queries its own width. */
export type DashboardSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

/** One column count, or one per container size. The largest is the space the layout is written in. */
export type DashboardColumns = number | Partial<Record<DashboardSize, number>>;

/** Which of a widget's two handles is being used. A move changes where it is; a resize changes how big. */
type HandleKind = 'move' | 'resize';

const SIZES: DashboardSize[] = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl'];

const HEADINGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const;

/** Where a widget goes, in the shape Box takes it: one placement per column space the grid declares. */
interface Placement {
  gridColumnStart: number;
  gridColumnEnd: number;
  gridRowStart: number;
  gridRowEnd: number;
}

type QueryStyles = NonNullable<BoxProps<'div'>['cq']>;

interface WidgetPlacement {
  /** Reading order, so a stacked dashboard flows the way the arranged one reads rather than the way it was written. */
  order: number;
  /** Pinned: it has no handles at all, rather than handles that refuse. */
  fixed: boolean;
  /** The narrowest declared arrangement, which is also what a container smaller than every declared size gets. */
  placement?: Placement;
  /** One placement per larger container size — the projections, chosen by the browser rather than measured. */
  query?: QueryStyles;
}

/** What is being held, by whichever of the two means. `pointer` absent is the keyboard holding it. */
interface Held {
  id: string;
  kind: HandleKind;
  name: string;
  /** What the widget was before it was picked up, and the layout to put back when Escape cancels. */
  origin: DashboardItem;
  before: DashboardLayout;
  pointer?: { id: number; x: number; y: number; step: DashboardStep; rtl: boolean };
}

interface DashboardContextValue {
  editable: boolean;
  /** Where a widget goes, or `undefined` when the layout knows nothing about it. */
  placementOf(id: string): WidgetPlacement | undefined;
  heldOf(id: string): Held | undefined;
  /** The per-frame translate that keeps a dragged widget under the pointer. The one inline style here. */
  offsetOf(id: string): CSSProperties | undefined;
  /** The container query that hides a handle wherever the grid is showing a projection rather than the layout. */
  outsideAuthoring?: QueryStyles;
  handleProps(id: string, name: string, kind: HandleKind): Record<string, unknown>;
  instructionsId: string;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

type DashboardBoxProps<TKey extends keyof ComponentsAndVariants> = Omit<BoxProps<'div', TKey>, 'onChange'>;

export interface DashboardGridProps<TKey extends keyof ComponentsAndVariants = 'dashboard'> extends DashboardBoxProps<TKey> {
  /** The widgets. Each `<Widget id>` is placed by the layout item of that id; one with no item is left to flow. */
  children?: ReactNode;
  /** Controlled layout. Leave it out and the grid owns it. */
  layout?: DashboardLayout;
  /** What it starts as. The layout is normalized on the way in, so a generated one need not be tidy. */
  defaultLayout?: DashboardLayout;
  /** Fires on every cell a drag crosses and every arrow key, with the whole normalized layout. */
  onLayoutChange?: ChangeHandler<DashboardLayout, DashboardReason>;
  /** Fires once when the interaction ends — the place for the write a per-cell callback is too noisy for. */
  onLayoutCommit?: ChangeHandler<DashboardLayout, DashboardReason>;
  /**
   * How many columns, at one width or at several: `12`, or `{ xs: 1, md: 6, xxl: 12 }` — the default —
   * which is one column until the dashboard is 28rem wide, six from there and twelve from 42rem. Each is
   * a projection of the one layout, computed rather than measured, so the browser picks between classes;
   * the smallest count is also what a container narrower than every size named here gets.
   */
  columns?: DashboardColumns;
  /** The height of one row, on the ÷4 spacing scale. Default `24` — 6rem. */
  rowHeight?: number;
  /** Whether widgets can be moved and resized. The handles exist only in edit mode, and only where the layout's own columns are being rendered. */
  editable?: boolean;
  /** What the set of widgets is called. A list needs a name where a page holds more than one. */
  label?: string;
  /** The same, naming an element that already says it. */
  labelledBy?: string;
}

export interface WidgetProps<TKey extends keyof ComponentsAndVariants = 'widget'> extends BoxProps<'div', TKey> {
  /** Which layout item this widget is. Left out, it is chrome with no place — a card. */
  id?: string;
  /** What it shows. */
  children?: ReactNode;
  /** The title bar's heading. */
  title?: ReactNode;
  /** What the widget is called where a control has to say so — the handles' labels and the announcements. Defaults to a string `title`, then to `id`. */
  name?: string;
  /** A line under the title, for the question the widget answers rather than the noun it is named after. */
  description?: ReactNode;
  /** The end of the title bar: a menu, a filter, a link out. */
  actions?: ReactNode;
  /** The heading level the title renders at. Default `3`, since a dashboard is a section of a page. */
  level?: 2 | 3 | 4 | 5 | 6;
  /** Bars where the content will be, and `aria-busy` while they are showing. */
  loading?: boolean;
  /** What went wrong, shown in place of the content. With `onRefresh` it comes with a retry. */
  error?: ReactNode;
  /** There is nothing to show: `true` for the default line, or the words to use instead. */
  empty?: boolean | ReactNode;
  /** Fetch it again. A button in the title bar, and the retry an error state offers. */
  onRefresh?: () => void;
  /** The refresh button's accessible name. Default `Refresh <name>`. */
  refreshLabel?: string;
}

interface WidgetType {
  <TKey extends keyof ComponentsAndVariants = 'widget'>(props: WidgetProps<TKey>): React.ReactNode;
  displayName?: string;
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(Math.max(value, low), high);
}

/** The column spaces a grid renders, smallest container first. A number is one space at every width. */
function spacesOf(columns: DashboardColumns): { size?: DashboardSize; count: number }[] {
  if (typeof columns === 'number') return [{ count: clamp(Math.round(columns), DashboardUtils.MIN_COLUMNS, DashboardUtils.MAX_COLUMNS) }];

  const declared = SIZES.filter((size) => typeof columns[size] === 'number').map((size) => ({
    size,
    count: clamp(Math.round(columns[size] as number), DashboardUtils.MIN_COLUMNS, DashboardUtils.MAX_COLUMNS),
  }));

  return declared.length > 0 ? declared : [{ count: 12 }];
}

function placementOf(item: DashboardItem): Placement {
  return { gridColumnStart: item.x + 1, gridColumnEnd: item.x + 1 + item.w, gridRowStart: item.y + 1, gridRowEnd: item.y + 1 + item.h };
}

/** `md` → `maxMd`: the complement, which is every width the authoring space is not being rendered at. */
function complementOf(size: DashboardSize): string {
  return `max${size[0].toUpperCase()}${size.slice(1)}`;
}

/** What an arrow key means for a handle: one cell along the reading axis, or one row. */
function arrowFor(key: string, rtl: boolean): { x: number; y: number } | undefined {
  const forward = rtl ? -1 : 1;

  if (key === 'ArrowLeft') return { x: -forward, y: 0 };
  if (key === 'ArrowRight') return { x: forward, y: 0 };
  if (key === 'ArrowUp') return { x: 0, y: -1 };
  if (key === 'ArrowDown') return { x: 0, y: 1 };

  return undefined;
}

/** Where a widget is, in the words a reader hears: one-based, because column zero is not a place anybody names. */
function positionOf(item: DashboardItem): string {
  return `column ${item.x + 1}, row ${item.y + 1}`;
}

function sizeOf(item: DashboardItem): string {
  return `${item.w} ${item.w === 1 ? 'column' : 'columns'} by ${item.h} ${item.h === 1 ? 'row' : 'rows'}`;
}

/**
 * A dashboard the people using it can rearrange, and a model can write.
 *
 * ```tsx
 * <DashboardGrid layout={layout} onLayoutChange={setLayout} editable>
 *   <Widget id="revenue" title="Revenue">…</Widget>
 *   <Widget id="orders" title="Orders" loading>…</Widget>
 * </DashboardGrid>
 * ```
 *
 * **The layout is the artifact**, and it is plain JSON: a version, a column count and one `{ id, x, y, w, h }`
 * per widget, in cells. That is what a model emits under `DashboardUtils.SCHEMA`, what a drag reports back
 * and what a host stores — persistence is the app's, because only the app knows whether a dashboard belongs
 * to a user, a team or a URL.
 *
 * **Nothing is measured to lay it out.** A widget's place is `grid-column`/`grid-row`, which is a class, so
 * a layout of any size costs no inline style and no `ResizeObserver`; the narrower arrangements are
 * *projections* of the same layout, computed at render and chosen between by container queries. The one
 * inline style in the component is the translate that keeps a dragged widget under the pointer — a value
 * per frame, which a class would make a rule per frame that is never freed.
 *
 * **The layout is compacted upward**, so a widget cannot be parked in mid-air and two dashboards holding
 * the same widgets in the same places compare equal. A drop below a neighbour rises to meet it.
 *
 * **An arrangement can only be edited in the space it is written in.** Where the grid is rendering a
 * projection the handles are not there at all — hidden by the same container query that chose the
 * projection — because an edit made in six columns is not a layout in twelve, and writing one back would
 * quietly replace the other.
 *
 * @a11y The grid is a `role="list"` named by `label`, and each placed widget a `role="listitem"` — so a
 * reader is told how many widgets there are and which one this is, which a set of `region` landmarks
 * would drown out.
 * @a11y Moving and resizing are a **grab**: Enter or Space on a handle picks the widget up, the arrows
 * move it, Enter drops it and Escape puts it back. Every step is announced in a polite live region that
 * is there before there is anything to say.
 * @a11y The handles are real buttons with `aria-pressed` for the grabbed state and an `aria-describedby`
 * naming the instructions, rather than an HTML5 drag, which no screen reader drives.
 * @keyboard Enter, Space — Picks a widget up from either handle, and drops it again.
 * @keyboard Arrows — One cell, along the reading axis: in a right-to-left page ArrowLeft moves a widget
 * to the *right*. On the resize handle they add and remove a column or a row.
 * @keyboard Escape — Puts the widget back where it was picked up from, and the layout with it.
 */
function DashboardGridImpl<TKey extends keyof ComponentsAndVariants = 'dashboard'>(props: DashboardGridProps<TKey>) {
  const {
    children,
    layout,
    defaultLayout,
    onLayoutChange,
    onLayoutCommit,
    columns = { xs: 1, md: 6, xxl: 12 },
    rowHeight = 24,
    editable = false,
    label,
    labelledBy,
    props: tagProps,
    ...restProps
  } = props;

  const gridRef = useRef<HTMLDivElement>(null);
  const [held, setHeld] = useState<Held | null>(null);
  const [offset, setOffset] = useState<CSSProperties | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const instructionsId = `${useId()}-dashboard`;

  const [current, setCurrent] = useControllableState<DashboardLayout, DashboardReason>({
    value: layout,
    defaultValue: defaultLayout ?? { version: DashboardUtils.VERSION, columns: 12, items: [] },
    onChange: onLayoutChange,
  });

  // Normalized for rendering rather than on the way into state: a controlled consumer owns what it gave
  // us, and copying a tidied version back would be the second source of truth the contract forbids.
  const resolved = useMemo(() => DashboardUtils.normalize(current), [current]);
  const latest = useLatest(resolved);
  const commitHandler = useEventCallback(onLayoutCommit);

  // The declared spaces as one string, so a `columns` object written inline is not a new set every render —
  // and every projection below it recomputed with them.
  const columnsKey = typeof columns === 'number' ? String(columns) : SIZES.map((size) => columns[size] ?? '').join();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const spaces = useMemo(() => spacesOf(columns), [columnsKey]);
  const authoring = spaces[spaces.length - 1];

  /**
   * Every widget's place in every space, in one pass — the projections are arithmetic, not measurement.
   * They are all drawn on the *authoring* space's tracks, because a grid cannot container-query itself
   * (measured: the query resolves against an ancestor container, so a track count per size silently did
   * nothing). The smallest space is the plain placement and each larger one a container query over it.
   */
  const placements = useMemo(() => {
    const ranks = DashboardUtils.ranks(resolved);
    const map = new Map<string, WidgetPlacement>();

    for (const space of spaces) {
      const projected = space.count === authoring.count ? resolved : DashboardUtils.project(resolved, space.count);
      const scale = authoring.count / space.count;

      for (const item of projected.items) {
        const entry = map.get(item.id) ?? { order: ranks.get(item.id) ?? 0, fixed: item.fixed === true };
        // Scaled by its *edges*, so rounding can leave neither a gap nor an overlap.
        const place = placementOf({
          ...item,
          x: Math.round(item.x * scale),
          w: Math.round((item.x + item.w) * scale) - Math.round(item.x * scale),
        });

        if (space === spaces[0]) entry.placement = place;
        else entry.query = { ...entry.query, [space.size as DashboardSize]: place };

        map.set(item.id, entry);
      }
    }

    return map;
  }, [resolved, spaces, authoring.count]);

  const apply = useEventCallback((next: DashboardLayout, details: ChangeDetails<DashboardReason>) => {
    if (DashboardUtils.same(next, latest.current)) return;

    setCurrent(next, details);
  });

  /** The pixel one cell steps by, read off the widget being held rather than assumed from the props. */
  const stepFor = (element: HTMLElement, item: DashboardItem): DashboardStep => {
    const rect = element.getBoundingClientRect();
    const grid = gridRef.current;
    const style = grid && typeof getComputedStyle === 'function' ? getComputedStyle(grid) : undefined;
    const columnGap = Number.parseFloat(style?.columnGap ?? '') || 0;
    const rowGap = Number.parseFloat(style?.rowGap ?? '') || 0;

    return { x: (rect.width + columnGap) / item.w, y: (rect.height + rowGap) / item.h };
  };

  const widgetOf = (target: EventTarget | null): HTMLElement | null => {
    return target instanceof Element ? target.closest<HTMLElement>('[data-widget-id]') : null;
  };

  /** One cell crossed, from either device: the target is absolute, so a push that moved the widget is no drift. */
  const moveBy = (grip: Held, x: number, y: number, event: React.SyntheticEvent): DashboardLayout => {
    const next =
      grip.kind === 'move' ? DashboardUtils.moveTo(latest.current, grip.id, x, y) : DashboardUtils.resizeTo(latest.current, grip.id, x, y);

    apply(next, { reason: grip.kind, event });

    return next;
  };

  const handlePointerDown = useEventCallback((event: React.PointerEvent<HTMLElement>, id: string, name: string, kind: HandleKind) => {
    const item = DashboardUtils.itemOf(latest.current, id);
    const element = widgetOf(event.currentTarget);
    if (!editable || event.button !== 0 || event.defaultPrevented || !item || item.fixed || !element) return;

    // The browser moves focus as the default action of a press, after every handler — and a drag that
    // selects the title beside the handle reads as broken.
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    event.currentTarget.focus();

    setHeld({
      id,
      kind,
      name,
      origin: item,
      before: latest.current,
      pointer: { id: event.pointerId, x: event.clientX, y: event.clientY, step: stepFor(element, item), rtl: isRtl(element) },
    });
  });

  const handlePointerMove = useEventCallback((event: React.PointerEvent<HTMLElement>, id: string) => {
    if (!held?.pointer || held.id !== id) return;

    const { x, y, step, rtl } = held.pointer;
    const travelled = { x: event.clientX - x, y: event.clientY - y };
    const cells = DashboardUtils.cellsMoved(rtl ? -travelled.x : travelled.x, travelled.y, step);
    const origin = held.origin;

    const next =
      held.kind === 'move'
        ? moveBy(held, origin.x + cells.columns, origin.y + cells.rows, event)
        : moveBy(held, origin.w + cells.columns, origin.h + cells.rows, event);

    // What the pointer has travelled beyond the cells the widget actually took: the widget follows the
    // pointer exactly while the layout under it stays on the grid.
    const placed = DashboardUtils.itemOf(next, id);
    if (held.kind !== 'move' || !placed) return;

    const settled = { x: (placed.x - origin.x) * step.x * (rtl ? -1 : 1), y: (placed.y - origin.y) * step.y };
    setOffset({ translate: `${Math.round(travelled.x - settled.x)}px ${Math.round(travelled.y - settled.y)}px` });
  });

  const handlePointerUp = useEventCallback((event: React.PointerEvent<HTMLElement>, id: string) => {
    if (!held?.pointer || held.id !== id) return;

    const item = DashboardUtils.itemOf(latest.current, id);
    event.currentTarget.releasePointerCapture?.(held.pointer.id);
    setHeld(null);
    setOffset(null);
    commitHandler(latest.current, { reason: held.kind, event });

    if (item) {
      setAnnouncement(held.kind === 'move' ? `${held.name} moved to ${positionOf(item)}.` : `${held.name} resized to ${sizeOf(item)}.`);
    }
  });

  /** Put the widget back, layout and all — the one thing a cancelled grab has to be able to do. */
  const cancel = useEventCallback((grip: Held, event: React.SyntheticEvent) => {
    apply(grip.before, { reason: grip.kind, event });
    setHeld(null);
    setAnnouncement(`${grip.name} put back at ${positionOf(grip.origin)}.`);
  });

  const handleKeyDown = useEventCallback((event: React.KeyboardEvent<HTMLElement>, id: string, name: string, kind: HandleKind) => {
    if (!editable || event.defaultPrevented) return;

    const grip = held && held.id === id && held.kind === kind && !held.pointer ? held : undefined;
    const item = DashboardUtils.itemOf(latest.current, id);
    if (!item) return;

    if (!grip) {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      if (item.fixed) return;

      event.preventDefault();
      setHeld({ id, kind, name, origin: item, before: latest.current });
      setAnnouncement(
        kind === 'move'
          ? `${name} picked up at ${positionOf(item)}. Use the arrow keys to move it.`
          : `${name} held for resizing at ${sizeOf(item)}. Use the arrow keys to resize it.`,
      );

      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      cancel(grip, event);

      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setHeld(null);
      commitHandler(latest.current, { reason: kind, event });
      setAnnouncement(kind === 'move' ? `${name} dropped at ${positionOf(item)}.` : `${name} resized to ${sizeOf(item)}.`);

      return;
    }

    const arrow = arrowFor(event.key, isRtl(event.currentTarget));
    if (!arrow) return;

    // The arrows scroll whatever the dashboard is in, and a grabbed widget owns them.
    event.preventDefault();

    const next =
      kind === 'move' ? moveBy(grip, item.x + arrow.x, item.y + arrow.y, event) : moveBy(grip, item.w + arrow.x, item.h + arrow.y, event);
    const placed = DashboardUtils.itemOf(next, id);

    if (placed) setAnnouncement(kind === 'move' ? `${name}, ${positionOf(placed)}.` : `${name}, ${sizeOf(placed)}.`);
  });

  // A grab the keyboard is holding ends when focus leaves the handle, and ends by cancelling: a widget
  // dropped somewhere nobody looked at is harder to undo than one that never moved.
  const handleBlur = useEventCallback((event: React.FocusEvent<HTMLElement>, id: string, kind: HandleKind) => {
    if (held && held.id === id && held.kind === kind && !held.pointer) cancel(held, event);
  });

  const context = useMemo<DashboardContextValue>(
    () => ({
      editable,
      placementOf: (id) => placements.get(id),
      heldOf: (id) => (held && held.id === id ? held : undefined),
      offsetOf: (id) => (held && held.id === id && offset ? offset : undefined),
      outsideAuthoring: authoring.size ? ({ [complementOf(authoring.size)]: { display: 'none' } } as QueryStyles) : undefined,
      instructionsId,
      handleProps: (id, name, kind) => ({
        type: 'button',
        'aria-label': kind === 'move' ? `Move ${name}` : `Resize ${name}`,
        'aria-pressed': held && held.id === id && held.kind === kind ? true : false,
        'aria-describedby': instructionsId,
        onPointerDown: (event: React.PointerEvent<HTMLElement>) => handlePointerDown(event, id, name, kind),
        onPointerMove: (event: React.PointerEvent<HTMLElement>) => handlePointerMove(event, id),
        onPointerUp: (event: React.PointerEvent<HTMLElement>) => handlePointerUp(event, id),
        onPointerCancel: (event: React.PointerEvent<HTMLElement>) => handlePointerUp(event, id),
        onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => handleKeyDown(event, id, name, kind),
        onBlur: (event: React.FocusEvent<HTMLElement>) => handleBlur(event, id, kind),
      }),
    }),
    [
      editable,
      placements,
      held,
      offset,
      authoring.size,
      instructionsId,
      handlePointerDown,
      handlePointerMove,
      handlePointerUp,
      handleKeyDown,
      handleBlur,
    ],
  );

  const heldPlacement = held ? placements.get(held.id) : undefined;

  return (
    <DashboardContext.Provider value={context}>
      <Box
        ref={gridRef}
        component={'dashboard' as TKey}
        {...(restProps as DashboardBoxProps<TKey>)}
        variant={[restProps.variant, { dragging: held !== null }] as never}
        vars={{ 'dashboard-row': `${rowHeight / 4}rem` }}
        gridTemplateColumns={authoring.count}
        props={{ role: 'list', 'aria-label': label, 'aria-labelledby': labelledBy, ...tagProps }}
      >
        {children}
        {heldPlacement && (
          <Box
            component="dashboard.placeholder"
            order={heldPlacement.order}
            cq={heldPlacement.query}
            {...heldPlacement.placement}
            props={{ role: 'presentation', 'aria-hidden': true }}
          />
        )}
      </Box>
      {/* Both outside the grid rather than in it: a `role="list"` whose children are not all list items is
          a broken list, and one of these two is always rendered. */}
      <VisuallyHidden props={{ role: 'status' }}>{announcement}</VisuallyHidden>
      <VisuallyHidden id={instructionsId}>
        Press Enter or Space to pick the widget up, the arrow keys to move or resize it, Enter to drop it and Escape to put it back.
      </VisuallyHidden>
    </DashboardContext.Provider>
  );
}

/** The grip on the title bar, and the corner. Drawn here so a dashboard needs no icon set to be usable. */
function HandleIcon({ kind }: { kind: HandleKind }) {
  if (kind === 'resize') {
    return (
      <Svg viewBox="0 0 24 24" width="1rem" height="1rem" rtl={{ flip: 'xAxis' }} props={{ fill: 'none' }}>
        <Path d="M20 10 10 20M20 16l-4 4" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
      </Svg>
    );
  }

  return (
    <Svg viewBox="0 0 24 24" width="1rem" height="1rem">
      {[8, 12, 16].map((cy) => (
        <Circle key={cy} cx={9} cy={cy} r={1.4} fill="currentColor" />
      ))}
      {[8, 12, 16].map((cy) => (
        <Circle key={cy} cx={15} cy={cy} r={1.4} fill="currentColor" />
      ))}
    </Svg>
  );
}

function RefreshIcon() {
  return (
    <Svg viewBox="0 0 24 24" width="1rem" height="1rem" props={{ fill: 'none' }}>
      <Path d="M20 12a8 8 0 1 1-2.6-5.9M20 4v4h-4" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/**
 * The chrome round whatever a widget shows: a title bar, the states a panel fed by a request can be in,
 * and — inside a `DashboardGrid` — the handles that move and resize it.
 *
 * ```tsx
 * <Widget id="revenue" title="Revenue" description="Last 30 days" onRefresh={reload}>
 *   <Sparkline data={revenue} />
 * </Widget>
 * ```
 *
 * **`id` is what places it.** It names the layout item this widget fills; a widget with no `id`, or one
 * the layout says nothing about, is left to the grid's own flow — and outside a dashboard it is a card.
 *
 * **Four states, one body.** `loading` draws bars where the content will be and reports `aria-busy`,
 * `error` replaces it with the message and, where there is an `onRefresh`, a retry, and `empty` says so
 * in words rather than leaving a panel that looks broken. Anything else renders the children.
 *
 * @a11y The title is a real heading at `level` (default `3`), so a dashboard has an outline rather than
 * a page of anonymous boxes, and the widget is named by it.
 * @a11y `aria-busy` while it is loading, so a reader is told the panel is not finished rather than
 * reading the skeleton out as content.
 * @a11y An error is a `role="status"`: it arrives after the page settled, and interrupting is for
 * something the person did rather than something that failed on their behalf.
 */
function WidgetImpl<TKey extends keyof ComponentsAndVariants = 'widget'>(props: WidgetProps<TKey>) {
  const {
    id,
    children,
    title,
    name,
    description,
    actions,
    level = 3,
    loading = false,
    error,
    empty,
    onRefresh,
    refreshLabel,
    props: tagProps,
    ...restProps
  } = props;

  const dashboard = useContext(DashboardContext);
  const placement = id === undefined ? undefined : dashboard?.placementOf(id);
  const held = id === undefined ? undefined : dashboard?.heldOf(id);
  const label = name ?? (typeof title === 'string' ? title : undefined) ?? id ?? 'Widget';
  const editable = dashboard?.editable === true && placement !== undefined && !placement.fixed;

  const handle = (kind: HandleKind) =>
    editable && id !== undefined ? (
      <Box
        component="widget.handle"
        tag="button"
        variant={{ editable: true, grabbed: held?.kind === kind, corner: kind === 'resize' }}
        cq={dashboard?.outsideAuthoring}
        props={dashboard?.handleProps(id, label, kind)}
      >
        <HandleIcon kind={kind} />
      </Box>
    ) : null;

  const body = () => {
    if (loading) {
      return (
        <Box component="widget.skeleton" props={{ 'aria-hidden': true }}>
          {[80, 100, 60].map((width) => (
            <Box key={width} component="widget.skeleton.bar" width={`${width}%`} />
          ))}
        </Box>
      );
    }

    if (error) {
      return (
        <Box component="widget.message" variant={{ error: true }} props={{ role: 'status' }}>
          {error}
          {onRefresh && (
            <Box tag="button" component="widget.retry" props={{ type: 'button', onClick: onRefresh }}>
              Try again
            </Box>
          )}
        </Box>
      );
    }

    if (empty) return <Box component="widget.message">{empty === true ? 'Nothing to show yet.' : empty}</Box>;

    return children;
  };

  const bar = title !== undefined || description !== undefined || actions !== undefined || onRefresh !== undefined || editable;

  return (
    <Box
      component={'widget' as TKey}
      {...(restProps as BoxProps<'div', TKey>)}
      variant={
        [restProps.variant, { dragging: held?.pointer !== undefined, grabbed: held !== undefined && held.pointer === undefined }] as never
      }
      order={placement?.order}
      cq={placement?.query}
      {...placement?.placement}
      style={{ ...(id === undefined ? undefined : dashboard?.offsetOf(id)), ...restProps.style }}
      props={{
        role: placement ? 'listitem' : undefined,
        'aria-busy': loading || undefined,
        'data-widget-id': id,
        ...tagProps,
      }}
    >
      {bar && (
        <Box component="widget.header">
          {handle('move')}
          <Box component="widget.label">
            {/* The one place `tag` is right rather than a shortcut: the element *is* the heading level. */}
            {title !== undefined && (
              <Box component="widget.title" tag={HEADINGS[level - 1]}>
                {title}
              </Box>
            )}
            {description !== undefined && <Box component="widget.description">{description}</Box>}
          </Box>
          {onRefresh && (
            <Box
              component="widget.handle"
              tag="button"
              variant={{ editable: true }}
              props={{ type: 'button', 'aria-label': refreshLabel ?? `Refresh ${label}`, onClick: onRefresh }}
            >
              <RefreshIcon />
            </Box>
          )}
          {actions !== undefined && <Box component="widget.actions">{actions}</Box>}
        </Box>
      )}
      <Box component="widget.body">{body()}</Box>
      {handle('resize')}
    </Box>
  );
}

const DashboardGrid = DashboardGridImpl;
(DashboardGrid as FunctionComponent).displayName = 'DashboardGrid';

const Widget = WidgetImpl as WidgetType;
Widget.displayName = 'Widget';

export { Widget };

export default DashboardGrid;
