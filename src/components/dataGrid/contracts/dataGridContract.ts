import type { BoxProps } from '../../../box';
import type { ChangeHandler } from '../../../react/a11y/useControllableState';
import { ComponentsAndVariants } from '../../../types';
import type { SortDirection } from '../../../utils/array/arrayUtils';
import AggregateCellModel from '../models/aggregateCellModel';
import CellModel from '../models/cellModel';

export type { SortDirection };
export type Key = string | number;
/**
 * Which edge a column is pinned to, named by the reading order rather than by the screen: `START` is the
 * left edge of a left-to-right grid and the right edge of a right-to-left one, so a pinned column stays
 * where the reading starts under either `dir`. `LEFT`/`RIGHT` are the older spelling of the same two.
 */
export type PinPosition = 'START' | 'END';
/** What `pin` accepts — the logical pair, plus the physical names it used to be spelled with. */
export type PinPositionInput = PinPosition | 'LEFT' | 'RIGHT';

/** The logical side behind whichever spelling the caller used. */
export function pinPositionOf(pin?: PinPositionInput): PinPosition | undefined {
  if (!pin) return undefined;

  return pin === 'LEFT' ? 'START' : pin === 'RIGHT' ? 'END' : pin;
}
export const NO_PIN = 'NO_PIN';
export type SortColumnType<TRow> = { key: keyof TRow; dir: SortDirection };
export type KeysMatching<T, V> = { [K in keyof T]-?: T[K] extends V ? K : never }[keyof T];
export interface PaginationState {
  pageSize: number;
  page: number;
  totalItems: number;
  totalPages: number;
}
/** Server-side pagination configuration on GridDefinition */
export interface PaginationConfig {
  /**
   * Total number of items across all pages, from the server response. Required unless `def.dataSource`
   * is answering the count, in which case the grid already has it.
   */
  totalCount?: number;
  /** Page size override. If omitted, defaults to visibleRowsCount (or 10). */
  pageSize?: number;
  /** Options shown in the page size selector dropdown. If omitted, no selector is shown. */
  pageSizeOptions?: number[];
}

// ========== Server State ==========

/** Snapshot of all server-relevant grid state, passed to onServerStateChange */
export interface ServerState<TRow> {
  page: number;
  pageSize: number;
  sortColumn: Key | undefined;
  sortDirection: SortDirection | undefined;
  columnFilters: ColumnFilters<TRow>;
  globalFilterValue: string;
}

// ========== Data Source ==========

/**
 * What the grid asks its `def.dataSource` for: one block of rows, and the query they have to satisfy.
 * The range is given twice because the two halves of the world spell it differently — `startRow`/`endRow`
 * is an SQL `OFFSET`/`LIMIT`, `page`/`pageSize` is a REST pager, and they always describe the same block.
 */
export interface DataSourceRequest<TRow> {
  /** First row wanted, 0-based across the whole result set. */
  startRow: number;
  /** One past the last row wanted. `endRow - startRow` is never more than the block size. */
  endRow: number;
  /** The same block, 1-based, for an API that pages. */
  page: number;
  /** Rows per block — the page size when the grid is paginated, `blockSize` otherwise. */
  pageSize: number;
  /** Which column the grid is sorted by, or `undefined` when it is not sorted. */
  sort: DataGridSort | undefined;
  /** What the global filter box holds. Empty when it is not in use. */
  globalFilter: string;
  /** Every column filter still set, keyed by column. */
  columnFilters: ColumnFilters<TRow>;
  /**
   * Which columns the grid is grouping by, outermost first. Empty unless `dataSource.grouping` is on and
   * the user has grouped something; the column this block groups by is `groupBy[groupKeys.length]`.
   */
  groupBy: Key[];
  /**
   * The group this block sits inside, outermost value first — `[]` at the top. `['Japan']` asks for what
   * is inside the Japan group, `['Japan', 2021]` for the level under that. Shorter than `groupBy` and the
   * rows wanted are **group** rows, one per distinct value of `groupBy[groupKeys.length]`; the same length
   * and they are that group's leaf rows.
   */
  groupKeys: Key[];
  /**
   * Aborted when the query changes under a request still in flight — a new sort, a new filter, a page
   * the user left. Hand it to `fetch` and a superseded request costs nothing.
   */
  signal: AbortSignal;
}

/** What a `getRows` answers with. */
export interface DataSourceResult<TRow> {
  /** The block's rows, in order. Fewer than asked for means the end of the data. */
  rows: TRow[];
  /**
   * How many rows the query holds altogether — the scrollbar's length and the pager's last page. Answer
   * it once and the grid keeps it; omit it and the grid follows the rows instead, treating a short block
   * as the end, which is what an API that cannot count cheaply needs.
   */
  totalCount?: number;
  /**
   * For a group level: how many leaf rows each returned group holds, in the order `rows` came in. It is
   * what the group label puts in its brackets, and it is optional — a server that cannot count a group
   * cheaply omits it and the label is the value on its own.
   */
  groupCounts?: number[];
}

/**
 * Where the rows come from when the grid fetches them itself: sorting, filtering and paging become a
 * request rather than work done in the browser, so a table of a million rows costs the page one block.
 * `data` is not read at all while this is set.
 */
export interface DataSource<TRow> {
  /** Answers one block. Called again whenever the sort, the filters or the visible range change. */
  getRows: (request: DataSourceRequest<TRow>) => Promise<DataSourceResult<TRow>>;
  /**
   * Rows per request. Default: the page size when `def.pagination` is set, 100 otherwise. A block is the
   * unit of everything here — of a request, of the loading state, and of what a failure costs.
   */
  blockSize?: number;
  /**
   * How many blocks to keep. Past this the ones furthest from the viewport are dropped and fetched again
   * if the user scrolls back. Default: 40.
   */
  maxBlocks?: number;
  /**
   * Whether `getRows` honours `groupKeys` — which is what puts *Group by* back in the column menu. Off by
   * default, because a `getRows` that ignored the field would answer a group level with leaf rows and the
   * grid has no way to tell. With it on, opening a group is one more request rather than work in the
   * browser: the children of a group nobody has expanded are never in the page at all.
   */
  grouping?: boolean;
}

// ========== Change Reasons ==========

/**
 * Why a server-relevant thing changed. `'page'` and `'page-size'` are the pager; the other three are a
 * query that changed underneath it, which is also what sent the grid back to the first page.
 */
export type DataGridChangeReason = 'page' | 'page-size' | 'sort' | 'filter' | 'clear';
/** A filter was typed, or emptied — by the clear button or by deleting the last character. */
export type DataGridFilterReason = 'filter' | 'clear';
/** A column was sorted, or the sort was cleared (the third press on a header, and the menu's Clear Sort). */
export type DataGridSortReason = 'sort' | 'clear';
/** A detail row was opened or shut. */
export type DataGridExpandReason = 'expand' | 'collapse';
/** The same four `Dropdown` reports a selection under: the header checkbox is the `-all`/`clear` pair. */
export type DataGridSelectionReason = 'select' | 'deselect' | 'select-all' | 'clear';

/** Which column the grid is sorted by, and which way. `undefined` in a change means it is not sorted. */
export interface DataGridSort {
  columnKey: Key;
  direction: SortDirection;
}

/** Where the pager is. The two move together — a new page size always returns to page 1. */
export interface DataGridPagination {
  page: number;
  pageSize: number;
}

// ========== Filter Types ==========

/** Filter type for column-level filtering */
export type ColumnFilterType = 'text' | 'number' | 'multiselect';

/** Text filter configuration (fuzzy search) */
export interface TextFilterValue {
  type: 'text';
  value: string;
}

/** Number filter configuration with comparison operators */
export interface NumberFilterValue {
  type: 'number';
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'between';
  value: number;
  valueTo?: number; // For 'between' operator
}

/** Multi-select filter configuration */
export interface MultiselectFilterValue {
  type: 'multiselect';
  values: (string | number | boolean | null)[];
}

/** Union type for all filter values */
export type FilterValue = TextFilterValue | NumberFilterValue | MultiselectFilterValue;

/** Column filters record - maps column key to filter value */
export type ColumnFilters<TRow> = Partial<Record<keyof TRow | Key, FilterValue>>;

/** Filter configuration for a column */
export interface ColumnFilterConfig {
  type: ColumnFilterType;
  /** Placeholder text for input */
  placeholder?: string;
  /** For multiselect: custom options. If not provided, unique values are computed from data */
  options?: { label: string; value: string | number | boolean | null }[];
  /** For number: step value for input */
  step?: number;
  /** For number: min value */
  min?: number;
  /** For number: max value */
  max?: number;
}

// ========== Row Detail ==========

/** Configuration for expandable row detail panel */
export interface RowDetailConfig<TRow> {
  /** Render function for the detail content */
  content: (row: TRow) => React.ReactNode;
  /** Height of the detail row. 'auto' sizes to content. Default: 'auto' */
  height?: 'auto' | number | ((row: TRow) => number);
  /** Whether clicking the row also toggles expansion. Default: false */
  expandOnRowClick?: boolean;
  /** Pin the expand column to LEFT. Default: false */
  pinned?: boolean;
  /** Width of the expand column. Default: 50 */
  expandColumnWidth?: number;
  /** Header text for the expand column. Default: '' (empty) */
  expandColumnHeader?: string;
  /** Scroll a panel opened below the fold into view. Default: true */
  scrollIntoView?: boolean;
}

// ========== Tree Data ==========

/**
 * What a row's own state is before anybody has clicked anything: `true` opens every row, a number opens
 * down to that depth (`1` is the top level's children shown), and a list of keys opens exactly those.
 */
export type DefaultExpanded = boolean | number | Key[];

/**
 * Rows that hold rows. The tree is read off the data in one of two shapes — **nested**, where a row
 * carries its children (`childrenKey`/`getChildren`), or **flat**, where every row carries the path to
 * itself (`pathKey`/`getPath`) — and the grid does the rest: one column grows a chevron and an indent,
 * the rows underneath a shut one leave the list, and the grid becomes a `treegrid`.
 */
export interface TreeDataConfig<TRow> {
  /** Nested rows: the field a row's children live in. */
  childrenKey?: keyof TRow | Key;
  /** Nested rows, worked out rather than stored. Answer nothing for a leaf. */
  getChildren?: (row: TRow) => TRow[] | undefined | null;
  /** Flat rows: the field holding the path from the root to this row, its own segment last. */
  pathKey?: keyof TRow | Key;
  /** Flat rows, worked out: `['src', 'core', 'box.ts']` for a row three deep. */
  getPath?: (row: TRow) => Key[];
  /**
   * Which column carries the chevrons and the indent. Default: the first column of your own, which is
   * the one a tree is almost always read down.
   */
  column?: Key;
  /** How far one level indents, on the ÷4 spacing scale. Default: 4, which is 1rem a level. */
  indent?: number;
  /** Which rows are open before anything has been clicked. Default: nothing but the top level. */
  defaultExpanded?: DefaultExpanded;
  /**
   * Whether ticking a row ticks everything under it, and a row whose children are partly ticked reads as
   * indeterminate. Default: `'self'` — a checkbox selects the row it is on, which is what every other row
   * in the grid does.
   */
  selection?: 'self' | 'cascade';
}

// ========== Context Menu ==========

/** Controls which sections appear in the column header context menu */
export interface ContextMenuConfig {
  /** Show sort actions (Sort Ascending, Sort Descending, Clear Sort). Default: true */
  sort?: boolean;
  /** Show pin actions (pin to start, pin to end, unpin). Default: true */
  pin?: boolean;
  /** Show group actions (Group By, Un-Group All). Default: true */
  group?: boolean;
}

// ========== Aggregation ==========

/** What an aggregate comes out as. Formatting it is `AggregateCell`'s job, not the aggregation's. */
export type AggregateValue = number | string | null;

/**
 * The five built-in aggregations. `sum`, `avg`, `min` and `max` read the numbers in the column and skip
 * everything else, so a blank cell is not a zero; `count` counts rows rather than values, which is why it
 * is the one that never skips anything.
 */
export type AggregateName = 'sum' | 'avg' | 'min' | 'max' | 'count';

/**
 * An aggregation of your own. `values` is this column's value from every row in scope and `rows` are those
 * rows, so a weighted average can reach the column it weights by.
 */
export type AggregateFn<TRow> = (values: unknown[], rows: TRow[]) => AggregateValue;

/** What a column's `aggregate` takes: one of the five names, or a function. */
export type ColumnAggregate<TRow> = AggregateName | AggregateFn<TRow>;

/** Which rows an aggregate covered: one group row's, or every row the filters left. */
export type AggregateScope = 'group' | 'footer';

// ========== Export ==========

/** What both export formats take. */
export interface DataGridExportOptions {
  /** The file's name, without the extension. Default: the grid's `title`, or `export`. */
  fileName?: string;
  /** The columns to write, by key, in the order given. Default: every visible column, plus the grouped ones. */
  columns?: Key[];
  /** Write a row per group, with its totals. Default: true, which writes them wherever the grid is grouped. */
  groups?: boolean;
  /** Write the grand-total row. Default: whatever `def.footer` is. */
  footer?: boolean;
}

/** A CSV export. */
export interface DataGridCsvOptions extends DataGridExportOptions {
  /** The field separator. Default: `,`. */
  delimiter?: string;
  /**
   * Prefix a value beginning `=`, `+`, `-` or `@` with a quote, so a spreadsheet reads it as text rather
   * than running it. Default: true — a cell somebody typed is data, and a file that executes it is CSV
   * injection.
   */
  escapeFormulas?: boolean;
}

/** An Excel export. A workbook carries no theme, so its colours are written out rather than themed. */
export interface DataGridXlsxOptions extends DataGridExportOptions {
  /** The worksheet's name. Default: the grid's `title`, or `Sheet1`. */
  sheetName?: string;
  /** The header row's fill, as `RRGGBB`. Default: the grid header's own grey. */
  headerFill?: string;
  /** The header row's text colour, as `RRGGBB`. */
  headerColor?: string;
}

/** The export buttons in the top bar. `true` is both formats, named by the grid's title. */
export interface ExportConfig extends DataGridExportOptions {
  /** Show the CSV button. Default: true. */
  csv?: boolean;
  /** Show the Excel button. Default: true. */
  xlsx?: boolean;
}

/** One column of an exported file. */
export interface ExportColumn {
  key: Key;
  header: string;
  /** In characters — the unit a spreadsheet sizes a column in. */
  width: number;
  /** The number format its values are written with, from the column's `exportFormat`. */
  format?: string;
}

/** One row of an exported file, and where it sits in the grouping. */
export interface ExportRow {
  kind: 'group' | 'data' | 'footer';
  /** 0 at the top; a row under one group is 1, under two is 2 — Excel's outline level. */
  level: number;
  /** Whether the grid has the group above it collapsed. */
  hidden: boolean;
  /** Whether this row is the summary of a collapsed group. */
  collapsed: boolean;
  values: unknown[];
}

/** What an export writes, before either format has written it. */
export interface ExportTable {
  columns: ExportColumn[];
  rows: ExportRow[];
}

/**
 * What a `ref` on a `DataGrid` holds. The export methods load the writers on the first call, so a grid
 * nobody exports from carries none of that code.
 */
export interface DataGridHandle {
  /** The element the grid renders. */
  readonly element: HTMLDivElement | null;
  /** Download the grid as `.csv`. */
  exportCsv(options?: DataGridCsvOptions): Promise<void>;
  /** Download the grid as `.xlsx`. */
  exportXlsx(options?: DataGridXlsxOptions): Promise<void>;
  /**
   * Throw away the blocks `def.dataSource` has fetched and ask for them again. The grid already does
   * this whenever it changes the query itself; this is for the half it cannot see — a filter of the
   * page's own, a row somebody saved, a tenant that changed under the closure `getRows` lives in. Inert
   * without a datasource.
   */
  refresh(): void;
}

// ========== Column Type ==========

export interface ColumnType<TRow> {
  key: Key;
  header?: string;
  pin?: PinPositionInput;
  width?: number;
  columns?: ColumnType<TRow>[];
  /** `start`/`end` follow the reading order; `left`/`right` stay on the screen side they name. */
  align?: 'start' | 'end' | 'center' | 'left' | 'right';
  Cell?: React.ComponentType<{ cell: CellModel<TRow> }>;
  /**
   * Aggregate this column over the rows under each group row, and over the whole grid when `def.footer`
   * is on. One of the five built-in names, or a function.
   */
  aggregate?: ColumnAggregate<TRow>;
  /**
   * The value this column writes to an exported file. Default: the row's own field at `key` — which is
   * what a column drawn by a `Cell` renderer needs, since an export runs no React.
   */
  exportValue?: (row: TRow) => string | number | boolean | Date | null;
  /** The number format its values are written with in a spreadsheet, `'#,##0.00'` or `'yyyy-mm-dd'`. */
  exportFormat?: string;
  /** Renders this column's aggregate wherever one appears. Without it the value is rendered as it is. */
  AggregateCell?: React.ComponentType<{ cell: AggregateCellModel<TRow> }>;
  /** Enable filtering for this column. Set to true for default text filter, or provide config */
  filterable?: boolean | ColumnFilterConfig;
  /** Enable sorting for this column. If undefined, inherits from GridDefinition.sortable */
  sortable?: boolean;
  /** Enable resizing for this column. If undefined, inherits from GridDefinition.resizable */
  resizable?: boolean;
  /** If false, column stays fixed at its width and doesn't participate in flex distribution. Default: true */
  flexible?: boolean;
  /** Control the header context menu. false hides it entirely. Object controls individual sections. Inherits from GridDefinition.contextMenu if undefined. */
  contextMenu?: boolean | ContextMenuConfig;
}

export interface GridDefinition<TRow> {
  rowKey?: KeysMatching<TRow, Key> | ((rowData: TRow) => Key);
  columns: ColumnType<TRow>[];
  showRowNumber?: boolean | { pinned?: boolean; width?: number };
  rowSelection?: boolean | { pinned?: boolean };
  rowHeight?: number;
  /** Number of visible rows. Set to 'all' to render all rows without virtualization or vertical scrollbar. */
  visibleRowsCount?: number | 'all';
  topBar?: boolean;
  bottomBar?: boolean;
  /** Title displayed in the top bar */
  title?: React.ReactNode;
  /** Custom filters or actions rendered in the top bar */
  topBarContent?: React.ReactNode;
  /** Enable global filter with fuzzy search */
  globalFilter?: boolean;
  /** Keys of columns to search in global filter. If not provided, all columns are searched */
  globalFilterKeys?: (keyof TRow | Key)[];
  /** Enable sorting for all columns. Default is true. Individual column settings take priority. */
  sortable?: boolean;
  /** Enable resizing for all columns. Default is true. Individual column settings take priority. */
  resizable?: boolean;
  /** Controls the visual style of column resizer handles. 'visible' (default): always shown. 'hover': visible on header cell hover. 'hidden': invisible but resize still works. */
  resizerStyle?: 'visible' | 'hover' | 'hidden';
  /** How the column follows the pointer during a resize drag. 'smooth' (default): updates batched once per animation frame (~60fps, ~1 frame behind the cursor). 'instant': updates synchronously on every pointer move so the column tracks the cursor with no added latency. */
  resizeMode?: 'smooth' | 'instant';
  /** Control the header context menu for all columns. false hides it entirely. Object controls individual sections. Default: true. Individual column settings take priority. */
  contextMenu?: boolean | ContextMenuConfig;
  /** Custom component to render when data is empty */
  noDataComponent?: React.ReactNode;
  /**
   * A row of grand totals pinned under the rows, over every column carrying an `aggregate`. It covers the
   * rows the grid holds after filtering — which is the page, not the table, when the server is paginating.
   */
  footer?: boolean | { label?: React.ReactNode };
  /**
   * Export buttons in the top bar. `true` is both formats; the writers are loaded on the first press,
   * so a grid nobody exports from pays nothing for them.
   */
  export?: boolean | ExportConfig;
  /** Enable expandable row detail panel */
  rowDetail?: RowDetailConfig<TRow>;
  /**
   * Rows that hold rows: one column grows a chevron and an indent, and the grid reports itself as a
   * `treegrid`. The tree comes out of the data, either nested in it or named by a path on each row.
   */
  treeData?: TreeDataConfig<TRow>;
  /**
   * The columns the grid starts grouped by, outermost first — the declared half of what the column menu's
   * *Group By* does, so a grid can be grouped before anybody has clicked anything (and on a server, where
   * nobody can).
   */
  groupBy?: Key[];
  /** Which group rows start open: `true` is all of them, a number is how many levels down. Default: none. */
  groupDefaultExpanded?: boolean | number;
  /** Server-side pagination. Provide totalCount from the API response. */
  pagination?: PaginationConfig;
  /**
   * Where the rows come from, when the grid is to fetch them itself. Sorting, filtering and paging then
   * round-trip to `getRows` instead of running over `data`, which is what lets a grid stand in front of a
   * table nobody could send to a browser. With `def.pagination` beside it the block is the page; without
   * it the grid scrolls the whole result set and fetches the blocks it reaches.
   */
  dataSource?: DataSource<TRow>;
}

/**
 * The grid takes Box style props like anything else — on the element that wraps the bars, the rows and
 * the pager. `component` is declared here rather than inherited so it stays the whole key union: the
 * model hands it to every part, and narrowing it would mean a type parameter on all of them.
 */
export interface DataGridProps<TRow> extends Omit<BoxProps<'div', 'datagrid'>, 'ref' | 'tag' | 'children' | 'component' | 'variant'> {
  /** Component name for style resolution. Default: 'datagrid'. Set to a custom name to use a different component style tree. */
  component?: keyof ComponentsAndVariants;
  /**
   * The rows. Virtualization means the length is not what is rendered — ten thousand is fine. Optional
   * only because `def.dataSource` replaces it: with one set, this is not read at all.
   */
  data?: TRow[];
  /** Everything about the grid that is not the rows: the columns, the bars, the title, the row height. */
  def: GridDefinition<TRow>;
  /** Show the loading sweep over the rows. The grid keeps whatever it is already showing underneath. */
  loading?: boolean;
  /** Fires with every selected row key and why the selection changed. */
  onSelectedRowKeysChange?: ChangeHandler<Key[], DataGridSelectionReason>;
  /**
   * The older callback, whose event carries the keys *acted on* beside the selection. Both fire.
   * @deprecated `onSelectedRowKeysChange` is the selection itself, with the `action` as a named reason —
   * the spelling every component reports a change under. This one still works.
   */
  onSelectionChange?: (event: SelectionChangeEvent<TRow>) => void;
  /** Controlled global filter value */
  globalFilterValue?: string;
  /** Fires with the global filter's new text, and whether it was typed or emptied. */
  onGlobalFilterChange?: ChangeHandler<string, DataGridFilterReason>;
  /** Controlled column filters */
  columnFilters?: ColumnFilters<TRow>;
  /** Fires with every column filter still set, and whether one was set or cleared. */
  onColumnFiltersChange?: ChangeHandler<ColumnFilters<TRow>, DataGridFilterReason>;
  /** External predicate filters applied before global/column filters. Memoize with useMemo for performance. */
  filters?: ((row: TRow) => boolean)[];
  /** Controlled expanded detail row keys */
  expandedRowKeys?: Key[];
  /** Fires with every expanded detail row key, and whether one was opened or shut. */
  onExpandedRowKeysChange?: ChangeHandler<Key[], DataGridExpandReason>;
  /**
   * Controlled open rows of a `def.treeData` tree. A separate list from `expandedRowKeys`, which is the
   * detail panels: a row can have both, and they open different things.
   */
  expandedTreeKeys?: Key[];
  /** Fires with every open tree row's key, and whether one was opened or shut. */
  onExpandedTreeKeysChange?: ChangeHandler<Key[], DataGridExpandReason>;
  /** Controlled current page (1-indexed). Used with pagination. */
  page?: number;
  /** Controlled page size. Used with pagination and pageSizeOptions. */
  pageSize?: number;
  /**
   * Fires with both pager values and why they changed — the page and the size move together, and a filter
   * or a sort is what sends the grid back to the first page.
   */
  onPaginationChange?: ChangeHandler<DataGridPagination, DataGridChangeReason>;
  /**
   * The older page callback, whose second argument is the page size rather than the reason. Both fire.
   * @deprecated `onPaginationChange` reports both pager values with a reason, which is what says whether
   * the page changed because the user navigated or because a filter reset it. This one still works.
   */
  onPageChange?: (page: number, pageSize: number) => void;
  /**
   * The older page-size callback. Both fire.
   * @deprecated `onPaginationChange` covers it: a new page size always returns to page 1, so the two were
   * never separate changes. This one still works.
   */
  onPageSizeChange?: (pageSize: number) => void;
  /** Fires with the column and direction the grid is sorted by, or `undefined` once the sort is cleared. */
  onSortingChange?: ChangeHandler<DataGridSort | undefined, DataGridSortReason>;
  /**
   * The older sort callback, whose two arguments are the column and the direction. Both fire.
   * @deprecated `onSortingChange` reports the sort as one value with a reason beside it. This one still works.
   */
  onSortChange?: (columnKey: Key | undefined, direction: SortDirection | undefined) => void;
  /** Fires on any server-relevant state change with the full snapshot for an API call, and what moved. */
  onServerStateChange?: ChangeHandler<ServerState<TRow>, DataGridChangeReason>;
}

interface SelectionChangeEvent<TRow, TKey = TRow[keyof TRow] | number | string> {
  action: 'select' | 'deselect';
  selectedRowKeys: TKey[];
  affectedRowKeys: TKey[];
  isAllSelected: boolean;
}
