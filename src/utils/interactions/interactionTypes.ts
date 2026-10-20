/**
 * What `Box.onInteraction` hears, as types. Every value and every detail arrives as plain JSON — the channel copies
 * it on the way out — so an event can go to a log, a beacon or `JSON.stringify` as it stands.
 */

/** A value as it arrives: what `JSON.parse` could have produced. */
export type InteractionJson = string | number | boolean | null | InteractionJson[] | { [key: string]: InteractionJson };

type Key = string | number;
type Open = { openChange: boolean };
type CellRange = { startRow: number; endRow: number; columns: Key[] };

/** Every change a component reports, by its namespace and then its type: the value each one carries. */
export interface ComponentInteractions {
  accordion: { valueChange: string[] };
  alertDialog: Open;
  approval: { decisionChange: 'approved' | 'rejected' };
  calendar: { valueChange: InteractionJson; pageChange: string; viewChange: 'day' | 'month' | 'year' };
  collapsible: Open;
  combobox: Open & { valueChange: InteractionJson };
  dashboard: { layoutCommit: InteractionJson; grab: string; grabCancel: string };
  datagrid: {
    sortingChange: { columnKey: Key; direction: 'ASC' | 'DESC' };
    globalFilterChange: string;
    columnFiltersChange: { [columnKey: string]: InteractionJson };
    paginationChange: { page: number; pageSize: number };
    selectedRowKeysChange: Key[];
    expandedRowKeysChange: Key[];
    expandedTreeKeysChange: Key[];
    rangeChange: CellRange;
    copy: CellRange;
    cellEditStart: InteractionJson;
    cellEdit: InteractionJson;
    cellEditCancel: InteractionJson;
    cellEditReject: InteractionJson;
    paste: InteractionJson[];
    columnPinChange: 'START' | 'END';
    columnVisibilityChange: boolean;
    columnResize: number;
    groupingChange: Key[];
    groupExpandedChange: boolean;
    selectionViewChange: boolean;
    export: 'csv' | 'xlsx';
    retry: undefined;
    recordChange: Key | null;
    sheetChange: string | null;
    selectModeChange: boolean;
    showMore: number;
  };
  dateField: { valueChange: string | null };
  datePicker: Open & { valueChange: string | null };
  dateRangePicker: { valueChange: { start: string; end: string } | null };
  dialog: Open;
  dropdown: Open & { valueChange: InteractionJson[] };
  form: { submit: string[] };
  menu: Open;
  'menu.checkboxItem': { checkedChange: boolean };
  'menu.item': { select: string };
  'menu.radioGroup': { valueChange: string };
  'menu.sub': Open;
  popover: Open;
  radioGroup: { valueChange: string };
  reasoning: Open;
  slider: { valueCommit: number | number[] };
  sortableList: { orderChange: string[]; orderCommit: string[]; grab: string; grabCancel: string };
  swipeItem: { openChange: 'start' | 'end' | null; fullSwipe: 'start' | 'end' };
  tabs: { valueChange: string };
  timeZoneSelect: Open & { valueChange: string };
  toaster: { show: string; update: string; dismiss: string; action: string };
  toolCall: Open;
  widget: { refresh: string };
}

export type InteractionComponent = keyof ComponentInteractions;
export type InteractionType<C extends InteractionComponent> = keyof ComponentInteractions[C] & string;

/** Which component and which of its changes: what a component names about itself. */
export type InteractionSource = { [C in InteractionComponent]: { component: C; type: InteractionType<C> } }[InteractionComponent];

interface InteractionBase {
  /** Why, in the component's own words: the `reason` its callback is given. */
  reason?: string;
  /** Whatever else the callback is told (`rowKey`, `columnKey`, `oldValue`…), as plain JSON. */
  details?: { [key: string]: InteractionJson };
  /** `'app'` when the code did it — a ref call, a timer, a `toast()` — rather than the person on the page. */
  source: 'user' | 'app';
  /** The DOM event behind it, when there was one: passed by the component, or the one being dispatched. */
  event?: Event;
  /** The element it happened on: the control that handled the event, else the component's own. */
  target?: Element;
  /** `performance.now()`, so it lines up with `event.timeStamp`. */
  timeStamp: number;
  /** `Date.now()`: when it happened, for a log on another machine. */
  time: number;
}

/** A change a component reports — `kind: 'change'`, so `component` and `type` narrow `value`. */
export type ComponentInteraction = {
  [C in InteractionComponent]: {
    [T in InteractionType<C>]: InteractionBase & { kind: 'change'; component: C; type: T; value?: ComponentInteractions[C][T] };
  }[InteractionType<C>];
}[InteractionComponent];

/**
 * A click or a change on anything a component styled, named by its `data-bk` (`Box.configure({ componentAttribute: true })`).
 * `value` is a checkbox's or a radio's `checked`, never what was typed; `details.interactive` says whether a control was hit.
 */
export interface DomInteraction extends InteractionBase {
  kind: 'dom';
  component: string;
  type: 'click' | 'change';
  value?: boolean;
}

/** A moment the app reported itself with `Box.reportInteraction`. */
export interface CustomInteraction extends InteractionBase {
  kind: 'custom';
  component: string;
  type: string;
  value?: InteractionJson;
}

export type InteractionEvent = ComponentInteraction | DomInteraction | CustomInteraction;

export type InteractionListener = (event: InteractionEvent) => void;

/** What `Box.reportInteraction` takes: `event` may be React's synthetic one, and anything not JSON is dropped on the way out. */
export interface InteractionReport {
  component: string;
  type: string;
  reason?: string;
  value?: unknown;
  details?: Record<string, unknown>;
  event?: unknown;
  target?: Element;
  /** Default: `'app'` for the reasons `imperative`, `programmatic` and `timeout`, `'user'` otherwise. */
  source?: 'user' | 'app';
}
