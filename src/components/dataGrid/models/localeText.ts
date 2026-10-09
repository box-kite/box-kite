/**
 * Every word the grid writes itself — visible text, accessible names, announcements and messages. A value
 * with something in it is a function, because word order and plurals differ between languages and a
 * sentence glued from pieces cannot be translated. Override any subset through `def.localeText`.
 */
export interface DataGridLocaleText {
  // ===== Top bar =====
  /** The global search box's placeholder. */
  searchPlaceholder: string;
  /** The column chooser's accessible name. */
  columnsMenu: string;
  columnsMenuSearchPlaceholder: string;
  columnsMenuShowAll: string;
  columnsMenuHideAll: string;
  /** The ✕ on a grouped column's chip. */
  stopGrouping: (column: string) => string;
  /** The export buttons' visible text, and their accessible names. */
  exportCsv: string;
  exportCsvLabel: string;
  exportExcel: string;
  exportExcelLabel: string;
  /** The exported file's name when there is no `fileName` and no string `title`. */
  exportFileName: string;

  // ===== Header =====
  selectAllRows: string;
  /** The hidden names of the row-number and row-detail columns, which draw no header text. */
  rowNumberHeader: string;
  rowDetailHeader: string;
  /** The grouping column's header when more than one column is grouped. */
  groupHeader: string;
  columnOptions: (column: string) => string;
  resizeColumn: (column: string) => string;
  /** A resizer's `aria-valuetext`. */
  columnWidth: (pixels: number) => string;

  // ===== Column menu =====
  sortAscending: string;
  sortDescending: string;
  clearSort: string;
  /** The pin items name a screen side, so a right-to-left page swaps them. */
  pinLeft: string;
  pinRight: string;
  unpin: string;
  groupBy: (column: string) => string;
  ungroupAll: string;

  // ===== Column filters =====
  filterPlaceholder: string;
  filterColumn: (column: string) => string;
  clearFilter: (column: string) => string;
  filterComparison: (column: string) => string;
  filterValuePlaceholder: string;
  filterFromPlaceholder: string;
  filterToPlaceholder: string;
  filterFrom: (column: string) => string;
  filterTo: (column: string) => string;
  filterSelectPlaceholder: string;
  filterSelectSearchPlaceholder: string;
  filterSelectClear: string;
  filterSelectAll: string;
  /** How a multiselect filter lists a `null` value. */
  filterEmptyValue: string;

  // ===== Body =====
  /** What an empty grid shows when there is no `noDataComponent`. */
  noRows: string;
  loadingRows: string;
  selectRow: (rowNumber: number) => string;
  selectGroupRows: (group: string) => string;
  expandRowDetail: (rowNumber: number) => string;
  collapseRowDetail: (rowNumber: number) => string;
  expandTreeRow: (name: string) => string;
  collapseTreeRow: (name: string) => string;
  /** What a tree row with no value of its own is called in its expander's name. */
  unnamedRow: (rowNumber: number) => string;
  editCell: (column: string) => string;
  /** A refused edit with no message of its own. */
  invalidValue: string;
  /** A pasted value the column cannot read, such as text in a number column. */
  wrongKindOfValue: string;
  /** The totals row's label when `def.footer` has none. */
  footerTotal: string;
  noColumnsTitle: string;
  noColumnsDescription: string;
  /** A failed fetch whose error carries no message. */
  loadError: string;
  retry: string;

  // ===== Bottom bar =====
  rowCount: (filtered: number, total: number) => string;
  pageRowRange: (start: number, end: number, total: number) => string;
  /** `hidden` is how many selected rows the filters keep off screen. */
  selectedCount: (selected: number, hidden: number) => string;
  clearFilters: string;
  /** A toggle: it shows the selected rows whatever the filters say, and pressing it again shows the rest. */
  showSelected: string;
  clearSelection: string;
  rowsPerPage: string;
  /** An entry in the page-size list. */
  pageSizeOption: (size: number) => string;
  pageNumber: string;
  /** The text after the page box: "of 12". */
  pageCount: (totalPages: number) => string;
  firstPage: string;
  previousPage: string;
  nextPage: string;
  lastPage: string;

  // ===== Announcements =====
  /** What the live region says when the selection changes. */
  selectionAnnouncement: (selected: number, total: number) => string;
}

/** The grid's own words, in English. Spread it to start a translation: `{ ...DATA_GRID_LOCALE_TEXT, clearFilters: 'Rensa filter' }`. */
export const DATA_GRID_LOCALE_TEXT: DataGridLocaleText = {
  searchPlaceholder: 'Search...',
  columnsMenu: 'Columns',
  columnsMenuSearchPlaceholder: 'Search columns...',
  columnsMenuShowAll: 'Show All',
  columnsMenuHideAll: 'Hide All',
  stopGrouping: (column) => `Stop grouping by ${column}`,
  exportCsv: 'CSV',
  exportCsvLabel: 'Export CSV',
  exportExcel: 'Excel',
  exportExcelLabel: 'Export Excel',
  exportFileName: 'export',

  selectAllRows: 'Select all rows',
  rowNumberHeader: 'Row number',
  rowDetailHeader: 'Row details',
  groupHeader: 'Group',
  columnOptions: (column) => `Column options for ${column}`,
  resizeColumn: (column) => `Resize ${column}`,
  columnWidth: (pixels) => `${pixels} pixels`,

  sortAscending: 'Sort Ascending',
  sortDescending: 'Sort Descending',
  clearSort: 'Clear Sort',
  pinLeft: 'Pin Left',
  pinRight: 'Pin Right',
  unpin: 'Unpin',
  groupBy: (column) => `Group by ${column}`,
  ungroupAll: 'Un-Group All',

  filterPlaceholder: 'Filter...',
  filterColumn: (column) => `Filter ${column}`,
  clearFilter: (column) => `Clear the ${column} filter`,
  filterComparison: (column) => `Comparison for ${column}`,
  filterValuePlaceholder: 'Value',
  filterFromPlaceholder: 'From',
  filterToPlaceholder: 'To',
  filterFrom: (column) => `Filter ${column} from`,
  filterTo: (column) => `Filter ${column} to`,
  filterSelectPlaceholder: 'Select...',
  filterSelectSearchPlaceholder: 'Search...',
  filterSelectClear: 'Clear',
  filterSelectAll: 'Select All',
  filterEmptyValue: '(empty)',

  noRows: 'empty',
  loadingRows: 'loading...',
  selectRow: (rowNumber) => `Select row ${rowNumber}`,
  selectGroupRows: (group) => `Select all rows in ${group}`,
  expandRowDetail: (rowNumber) => `Expand details for row ${rowNumber}`,
  collapseRowDetail: (rowNumber) => `Collapse details for row ${rowNumber}`,
  expandTreeRow: (name) => `Expand ${name}`,
  collapseTreeRow: (name) => `Collapse ${name}`,
  unnamedRow: (rowNumber) => `row ${rowNumber}`,
  editCell: (column) => `Edit ${column}`,
  invalidValue: 'Invalid value',
  wrongKindOfValue: 'Wrong kind of value',
  footerTotal: 'Total',
  noColumnsTitle: 'No Columns Selected',
  noColumnsDescription: 'Select at least one column from the columns menu to display data',
  loadError: 'Could not load rows.',
  retry: 'Retry',

  rowCount: (filtered, total) => (filtered !== total ? `Rows: ${filtered} / ${total}` : `Rows: ${total}`),
  pageRowRange: (start, end, total) => (total > 0 ? `Rows: ${start}–${end} of ${total}` : 'Rows: 0'),
  selectedCount: (selected, hidden) => (hidden > 0 ? `Selected: ${selected} (${hidden} hidden)` : `Selected: ${selected}`),
  clearFilters: 'Clear filters',
  showSelected: 'Show selected',
  clearSelection: 'Clear selection',
  rowsPerPage: 'Rows per page',
  pageSizeOption: (size) => `${size} / page`,
  pageNumber: 'Page number',
  pageCount: (totalPages) => `of ${totalPages}`,
  firstPage: 'First page',
  previousPage: 'Previous page',
  nextPage: 'Next page',
  lastPage: 'Last page',

  selectionAnnouncement: (selected, total) => (selected === 0 ? 'No rows selected' : `${selected} of ${total} rows selected`),
};
