import { ComponentsAndVariants } from '../../../types';
import type { SortDirection } from '../../../utils/array/arrayUtils';
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
  /** Total number of items across all pages (from server response) */
  totalCount: number;
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
  /** Enable expandable row detail panel */
  rowDetail?: RowDetailConfig<TRow>;
  /** Server-side pagination. Provide totalCount from the API response. */
  pagination?: PaginationConfig;
}

export interface DataGridProps<TRow> {
  /** Component name for style resolution. Default: 'datagrid'. Set to a custom name to use a different component style tree. */
  component?: keyof ComponentsAndVariants;
  /** The rows. Virtualization means the length is not what is rendered — ten thousand is fine. */
  data: TRow[];
  /** Everything about the grid that is not the rows: the columns, the bars, the title, the row height. */
  def: GridDefinition<TRow>;
  /** Show the loading sweep over the rows. The grid keeps whatever it is already showing underneath. */
  loading?: boolean;
  /** Fires when rows are selected or deselected, with the keys affected and whether all are now selected. */
  onSelectionChange?: (event: SelectionChangeEvent<TRow>) => void;
  /** Controlled global filter value */
  globalFilterValue?: string;
  /** Callback when global filter changes */
  onGlobalFilterChange?: (value: string) => void;
  /** Controlled column filters */
  columnFilters?: ColumnFilters<TRow>;
  /** Callback when column filters change */
  onColumnFiltersChange?: (filters: ColumnFilters<TRow>) => void;
  /** External predicate filters applied before global/column filters. Memoize with useMemo for performance. */
  filters?: ((row: TRow) => boolean)[];
  /** Controlled expanded detail row keys */
  expandedRowKeys?: Key[];
  /** Callback when expanded detail rows change */
  onExpandedRowKeysChange?: (keys: Key[]) => void;
  /** Controlled current page (1-indexed). Used with pagination. */
  page?: number;
  /** Callback when page changes. Receives page (1-indexed) and pageSize. */
  onPageChange?: (page: number, pageSize: number) => void;
  /** Controlled page size. Used with pagination and pageSizeOptions. */
  pageSize?: number;
  /** Callback when the user changes the page size. */
  onPageSizeChange?: (pageSize: number) => void;
  /** Callback when sort changes. For server-side sorting with pagination. */
  onSortChange?: (columnKey: Key | undefined, direction: SortDirection | undefined) => void;
  /** Fires on any server-relevant state change (page, sort, filter). Provides full state snapshot for API calls. */
  onServerStateChange?: (state: ServerState<TRow>) => void;
}

interface SelectionChangeEvent<TRow, TKey = TRow[keyof TRow] | number | string> {
  action: 'select' | 'deselect';
  selectedRowKeys: TKey[];
  affectedRowKeys: TKey[];
  isAllSelected: boolean;
}
