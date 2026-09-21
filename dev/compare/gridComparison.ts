/**
 * What a data grid costs, feature by feature. Data rather than JSX so a test can hold it honest
 * (`gridComparison.test.ts`): every tick in the Box Kite column has to link to a demo that exists, and
 * every price has to carry the page it was read off and the day it was read.
 *
 * The rule for a row: it is here because it was checked in the package or on the vendor's own page, and
 * the two rows this library loses are here for the same reason the twelve it wins are.
 */

/** The day every price and every plan split below was checked against the vendor's own page. */
export const VERIFIED_ON = '2026-09-18';

export type ProductId = 'box-kite' | 'ag-community' | 'ag-enterprise' | 'mui-community' | 'mui-pro' | 'mui-premium' | 'tanstack';

export interface ComparisonProduct {
  id: ProductId;
  name: string;
  /** What the column above it in the matrix is headed — the full name is too wide for eight columns. */
  column: string;
  /** The licence the tier ships under. */
  licence: string;
  /** The price as the vendor's own page prints it, or `null` where there is none to print. */
  price: string | null;
  /** What the price buys — a year of it, or a version kept forever. */
  terms?: string;
  /** The page the price and the plan split were read off, so the row above is checkable. */
  href: string;
  /** The version the feature rows were checked against, where one was read out of the package. */
  version?: string;
}

/**
 * The seven tiers, cheapest first within each vendor. A tier rather than a library, because a benchmark
 * — or a feature table — of a paid tier is a table about different software.
 */
export const products: readonly ComparisonProduct[] = [
  {
    id: 'box-kite',
    name: 'Box Kite',
    column: 'Box Kite',
    licence: 'MIT',
    price: null,
    terms: 'One tier, and this is it.',
    href: 'https://github.com/box-kite/box-kite',
  },
  {
    id: 'ag-community',
    name: 'AG Grid Community',
    column: 'AG Community',
    licence: 'MIT',
    price: null,
    href: 'https://www.ag-grid.com/license-pricing/',
    version: '36.2.0',
  },
  {
    id: 'ag-enterprise',
    name: 'AG Grid Enterprise',
    column: 'AG Enterprise',
    licence: 'Commercial',
    price: '$999 USD per developer',
    terms: 'Perpetual, including one year of updates.',
    href: 'https://www.ag-grid.com/license-pricing/',
  },
  {
    id: 'mui-community',
    name: 'MUI X Community',
    column: 'MUI Community',
    licence: 'MIT',
    price: null,
    href: 'https://mui.com/pricing/',
    version: '9.14.0',
  },
  {
    id: 'mui-pro',
    name: 'MUI X Pro',
    column: 'MUI Pro',
    licence: 'Commercial',
    price: '$299 / year / dev',
    terms: 'Annual, or perpetual with twelve months of maintenance.',
    href: 'https://mui.com/pricing/',
  },
  {
    id: 'mui-premium',
    name: 'MUI X Premium',
    column: 'MUI Premium',
    licence: 'Commercial',
    price: '$599 / year / dev',
    terms: 'Annual, or perpetual with twelve months of maintenance.',
    href: 'https://mui.com/pricing/',
  },
  {
    id: 'tanstack',
    name: 'TanStack Table',
    column: 'TanStack',
    licence: 'MIT',
    price: null,
    terms: 'Headless: the model is free and the grid is yours to write.',
    href: 'https://tanstack.com/table',
    version: '9.2.4',
  },
];

/** What a tier can do with a feature: it ships it, it does not, or it hands you the state to render it. */
export type Availability = 'yes' | 'no' | 'diy';

export interface ComparisonCell {
  has: Availability;
  /** The one thing a bare tick or cross would hide — a cap, a caveat, the module it needs. */
  note?: string;
}

export interface ComparisonRow {
  feature: string;
  /** What the feature is, in a line, for a reader who has not met this row's name before. */
  what: string;
  /** Where it is demonstrated on this site. Every `yes` in the Box Kite column carries one. */
  demo?: string;
  cells: Record<ProductId, ComparisonCell>;
}

/** The two crosses in the Box Kite column, written once so the note reads the same in both. */
const notBuilt = 'not built';

export const comparisonRows: readonly ComparisonRow[] = [
  {
    feature: 'Row grouping',
    what: 'Collapse rows under the values of a column, with the level open or shut.',
    demo: '/datagrid#group-by',
    cells: {
      'box-kite': { has: 'yes' },
      'ag-community': { has: 'no', note: 'RowGroupingModule' },
      'ag-enterprise': { has: 'yes' },
      'mui-community': { has: 'no' },
      'mui-pro': { has: 'no' },
      'mui-premium': { has: 'yes' },
      tanstack: { has: 'diy', note: 'columnGroupingFeature' },
    },
  },
  {
    feature: 'Aggregation and totals',
    what: 'A sum, an average or a count on a group row, and a grand total under the grid.',
    demo: '/datagrid#aggregation',
    cells: {
      'box-kite': { has: 'yes' },
      'ag-community': { has: 'no', note: 'aggFunc needs an Enterprise module' },
      'ag-enterprise': { has: 'yes' },
      'mui-community': { has: 'no' },
      'mui-pro': { has: 'no' },
      'mui-premium': { has: 'yes' },
      tanstack: { has: 'diy', note: 'rowAggregationFeature' },
    },
  },
  {
    feature: 'Tree data',
    what: 'Rows that hold rows, expanded one level at a time.',
    demo: '/datagrid#tree-data',
    cells: {
      'box-kite': { has: 'yes' },
      'ag-community': { has: 'no', note: 'TreeDataModule' },
      'ag-enterprise': { has: 'yes' },
      'mui-community': { has: 'no' },
      'mui-pro': { has: 'yes' },
      'mui-premium': { has: 'yes' },
      tanstack: { has: 'diy', note: 'rowExpandingFeature' },
    },
  },
  {
    feature: 'Master / detail rows',
    what: 'A panel of your own under a row, opened by its chevron.',
    demo: '/datagrid#row-detail',
    cells: {
      'box-kite': { has: 'yes' },
      'ag-community': { has: 'no', note: 'MasterDetailModule' },
      'ag-enterprise': { has: 'yes' },
      'mui-community': { has: 'no' },
      'mui-pro': { has: 'yes' },
      'mui-premium': { has: 'yes' },
      tanstack: { has: 'diy', note: 'rowExpandingFeature' },
    },
  },
  {
    feature: 'Column pinning',
    what: 'A column held against an edge while the rest of them scroll.',
    demo: '/datagrid#full-featured',
    cells: {
      'box-kite': { has: 'yes', note: 'pinned to the start or end of the reading order' },
      'ag-community': { has: 'yes' },
      'ag-enterprise': { has: 'yes' },
      'mui-community': { has: 'no' },
      'mui-pro': { has: 'yes' },
      'mui-premium': { has: 'yes' },
      tanstack: { has: 'diy', note: 'columnPinningFeature' },
    },
  },
  {
    feature: 'Cell editing',
    what: 'Type into a cell, and a validator that can refuse what was typed.',
    demo: '/datagrid#editing',
    cells: {
      'box-kite': { has: 'yes' },
      'ag-community': { has: 'yes' },
      'ag-enterprise': { has: 'yes' },
      'mui-community': { has: 'yes' },
      'mui-pro': { has: 'yes' },
      'mui-premium': { has: 'yes' },
      tanstack: { has: 'no', note: 'no editing feature — the inputs are yours' },
    },
  },
  {
    feature: 'Range selection',
    what: 'Drag or Shift+arrow across a block of cells, and Ctrl+C what it covers.',
    demo: '/datagrid#range-selection',
    cells: {
      'box-kite': { has: 'yes' },
      'ag-community': { has: 'no', note: 'CellSelectionModule' },
      'ag-enterprise': { has: 'yes' },
      'mui-community': { has: 'no' },
      'mui-pro': { has: 'no' },
      'mui-premium': { has: 'yes' },
      tanstack: { has: 'diy', note: 'cellSelectionFeature' },
    },
  },
  {
    feature: 'Paste into a block',
    what: 'Ctrl+V a spreadsheet selection back in, judged one cell at a time.',
    demo: '/datagrid#paste',
    cells: {
      'box-kite': { has: 'yes' },
      'ag-community': { has: 'no', note: 'ClipboardModule' },
      'ag-enterprise': { has: 'yes' },
      'mui-community': { has: 'no', note: 'copy is free, paste is not' },
      'mui-pro': { has: 'no' },
      'mui-premium': { has: 'yes' },
      tanstack: { has: 'no' },
    },
  },
  {
    feature: 'Excel export (.xlsx)',
    what: 'A real workbook — bold group rows, indents and number formats — not a renamed CSV.',
    demo: '/datagrid#export',
    cells: {
      'box-kite': { has: 'yes' },
      'ag-community': { has: 'no', note: 'ExcelExportModule' },
      'ag-enterprise': { has: 'yes' },
      'mui-community': { has: 'no' },
      'mui-pro': { has: 'no' },
      'mui-premium': { has: 'yes' },
      tanstack: { has: 'no' },
    },
  },
  {
    feature: 'CSV export',
    what: 'The rows as they are displayed, in a file.',
    demo: '/datagrid#export',
    cells: {
      'box-kite': { has: 'yes' },
      'ag-community': { has: 'yes' },
      'ag-enterprise': { has: 'yes' },
      'mui-community': { has: 'yes' },
      'mui-pro': { has: 'yes' },
      'mui-premium': { has: 'yes' },
      tanstack: { has: 'no' },
    },
  },
  {
    feature: 'Server-side row model',
    what: 'The rows stay on the server; the grid asks for the block it is about to show.',
    demo: '/datagrid#data-source',
    cells: {
      'box-kite': { has: 'yes', note: 'grouping and tree levels fetched too' },
      'ag-community': { has: 'no', note: 'ServerSideRowModelModule; the older infinite model is free' },
      'ag-enterprise': { has: 'yes' },
      'mui-community': { has: 'yes', note: 'a hundred rows a page at a time' },
      'mui-pro': { has: 'yes' },
      'mui-premium': { has: 'yes' },
      tanstack: { has: 'diy', note: 'manual flags; the fetching is yours' },
    },
  },
  {
    feature: 'A hundred thousand rows on screen',
    what: 'One scroller over the whole set, with no page to turn.',
    demo: '/benchmark',
    cells: {
      'box-kite': { has: 'yes' },
      'ag-community': { has: 'yes' },
      'ag-enterprise': { has: 'yes' },
      'mui-community': { has: 'no', note: 'pagination is forced on, capped at a hundred rows a page' },
      'mui-pro': { has: 'yes' },
      'mui-premium': { has: 'yes' },
      tanstack: { has: 'diy', note: '@tanstack/react-virtual, wired up by you' },
    },
  },
  {
    feature: 'Column reordering by drag',
    what: 'Drag a header to move the column.',
    cells: {
      'box-kite': { has: 'no', note: notBuilt },
      'ag-community': { has: 'yes' },
      'ag-enterprise': { has: 'yes' },
      'mui-community': { has: 'no', note: 'disableColumnReorder is forced on' },
      'mui-pro': { has: 'yes' },
      'mui-premium': { has: 'yes' },
      tanstack: { has: 'diy', note: 'columnOrderingFeature' },
    },
  },
  {
    feature: 'Pivoting',
    what: 'Turn the values of a column into columns of their own.',
    cells: {
      'box-kite': { has: 'no', note: notBuilt },
      'ag-community': { has: 'no', note: 'PivotModule' },
      'ag-enterprise': { has: 'yes' },
      'mui-community': { has: 'no' },
      'mui-pro': { has: 'no' },
      'mui-premium': { has: 'yes' },
      tanstack: { has: 'no' },
    },
  },
];

/** How many rows a tier ships outright — the count under each column heading. */
export function countShipped(id: ProductId, rows: readonly ComparisonRow[] = comparisonRows): number {
  return rows.filter((row) => row.cells[id].has === 'yes').length;
}
