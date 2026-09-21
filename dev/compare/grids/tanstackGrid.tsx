import {
  CellData,
  ColumnDef,
  SortingState,
  aggregationFn_mean,
  aggregationFn_sum,
  columnFilteringFeature,
  columnGroupingFeature,
  createExpandedRowModel,
  createFilteredRowModel,
  createGroupedRowModel,
  createSortedRowModel,
  filterFn_equalsString,
  rowAggregationFeature,
  rowExpandingFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  sortFn_text,
  tableFeatures,
  useTable,
} from '@tanstack/react-table';
import { version } from '@tanstack/react-table/package.json';
import { useVirtualizer } from '@tanstack/react-virtual';
import { CSSProperties, useMemo, useRef, useState } from 'react';
import { SORT_COLUMN, benchColumns } from '../../../pages/benchmark/benchColumns';
import { BenchRow, FILTER_COUNTRY, GROUP_COLUMN } from '../../../pages/benchmark/benchData';
import { BenchGridProps, GRID_HEIGHT, GridImpl, HEADER_HEIGHT, ROW_HEIGHT } from '../../../pages/benchmark/gridImpl';
import Box from '../../../src/box';

/**
 * The do-it-yourself baseline: TanStack Table for the model, TanStack Virtual for the window, and the
 * markup written here — which is the honest shape of the free option, and the reason this file styles
 * itself with plain inline styles rather than with Box. A baseline built on the engine under test would
 * be measuring that engine twice.
 */
const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  // Registered rather than imported wholesale, and 'text' among them because that is what a string
  // column's 'auto' resolves to — without it the table warns and sorts with the basic comparator.
  sortFns: { alphanumeric: sortFn_alphanumeric, basic: sortFn_basic, text: sortFn_text },
  columnFilteringFeature,
  filteredRowModel: createFilteredRowModel(),
  filterFns: { equalsString: filterFn_equalsString },
  columnGroupingFeature,
  groupedRowModel: createGroupedRowModel(),
  rowExpandingFeature,
  expandedRowModel: createExpandedRowModel(),
  rowAggregationFeature,
  aggregationFns: { sum: aggregationFn_sum, mean: aggregationFn_mean },
});

const columns: ColumnDef<typeof features, BenchRow, CellData>[] = benchColumns.map((column) => ({
  id: column.key,
  accessorKey: column.key,
  header: column.header,
  size: column.width,
  filterFn: 'equalsString',
  aggregationFn: column.aggregate === 'avg' ? 'mean' : column.aggregate === 'sum' ? 'sum' : undefined,
}));

const countryFilter = [{ id: 'country', value: FILTER_COUNTRY }];
const noFilter: typeof countryFilter = [];
const noGrouping: string[] = [];
const groupByDepartment = [GROUP_COLUMN];
const totalWidth = benchColumns.reduce((width, column) => width + column.width, 0);

function TanstackGrid({ data, filtered, grouped }: BenchGridProps) {
  const scroller = useRef<HTMLDivElement>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [theme] = Box.useTheme();
  const skin = theme === 'dark' ? darkSkin : lightSkin;

  const state = useMemo(
    () => ({
      sorting,
      columnFilters: filtered ? countryFilter : noFilter,
      grouping: grouped ? groupByDepartment : noGrouping,
      // One grouping level, so every group open is the first level open.
      expanded: grouped ? (true as const) : {},
    }),
    [sorting, filtered, grouped],
  );

  const table = useTable({ features, columns, data, state, onSortingChange: setSorting, getRowId: (row) => String(row.id) });
  const rows = table.getRowModel().rows;

  // Fixed row heights, so nothing is measured: `measureElement` on a hundred thousand rows is the cost
  // this baseline exists to avoid paying twice.
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scroller.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 6,
  });

  const headers = table.getHeaderGroups()[0]?.headers ?? [];
  const headerStyles = columnStyles(skin.headerCell);
  const cellStyles = columnStyles(skin.cell);

  return (
    <div ref={scroller} style={{ ...skin.frame, height: GRID_HEIGHT }}>
      <div style={{ width: totalWidth }}>
        <div style={{ ...skin.header, height: HEADER_HEIGHT }}>
          {headers.map((header, index) => (
            <div
              key={header.id}
              data-column={header.column.id}
              onClick={header.column.getToggleSortingHandler()}
              style={headerStyles[index]}
            >
              {String(header.column.columnDef.header)}
              {header.column.getIsSorted() === 'asc' ? ' ▲' : header.column.getIsSorted() === 'desc' ? ' ▼' : ''}
            </div>
          ))}
        </div>

        <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
          {virtualizer.getVirtualItems().map((item) => {
            const row = rows[item.index];

            return (
              <div key={row.id} data-bench-row style={{ ...rowStyle, height: ROW_HEIGHT, transform: `translateY(${item.start}px)` }}>
                {row.getAllCells().map((cell, index) => (
                  <div key={cell.id} style={cellStyles[index]}>
                    {cellContent(cell)}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** What a cell shows: a group's own value and size, an aggregate, or the value in the row. */
function cellContent(cell: {
  getIsGrouped: () => boolean;
  getIsAggregated: () => boolean;
  getIsPlaceholder: () => boolean;
  getValue: () => unknown;
  row: { subRows: unknown[] };
}): string {
  if (cell.getIsPlaceholder()) return '';

  const value = cell.getValue();

  if (cell.getIsGrouped()) return `${String(value)} (${cell.row.subRows.length})`;
  if (cell.getIsAggregated()) return typeof value === 'number' ? Math.round(value).toLocaleString('en-US') : String(value ?? '');

  return typeof value === 'boolean' ? String(value) : String(value ?? '');
}

/** One style object per column, built once per skin: a fresh one per cell is thousands an animation frame. */
const columnStyleCache = new WeakMap<CSSProperties, CSSProperties[]>();

function columnStyles(base: CSSProperties): CSSProperties[] {
  const cached = columnStyleCache.get(base);
  if (cached) return cached;

  const styles = benchColumns.map(
    (column) => ({ ...base, width: column.width, textAlign: column.numeric ? 'right' : 'left' }) as CSSProperties,
  );
  columnStyleCache.set(base, styles);

  return styles;
}

const rowStyle: CSSProperties = { position: 'absolute', top: 0, left: 0, display: 'flex' };

const baseCell: CSSProperties = {
  flex: '0 0 auto',
  padding: '0 8px',
  lineHeight: `${ROW_HEIGHT}px`,
  fontSize: 13,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

function skinFor(
  background: string,
  color: string,
  border: string,
  headerBackground: string,
): {
  frame: CSSProperties;
  header: CSSProperties;
  headerCell: CSSProperties;
  cell: CSSProperties;
} {
  return {
    frame: { overflow: 'auto', background, color, border: `1px solid ${border}`, borderRadius: 8 },
    header: { display: 'flex', position: 'sticky', top: 0, zIndex: 1, background: headerBackground, borderBottom: `1px solid ${border}` },
    headerCell: { ...baseCell, lineHeight: `${HEADER_HEIGHT}px`, fontWeight: 600, cursor: 'pointer', userSelect: 'none' },
    cell: { ...baseCell, borderBottom: `1px solid ${border}` },
  };
}

const darkSkin = skinFor('#0f172a', '#e2e8f0', '#1e293b', '#111d36');
const lightSkin = skinFor('#ffffff', '#0f172a', '#e2e8f0', '#f8fafc');

/** TanStack Table with the grid written by hand around it — every scenario, and none of the UI. */
const impl: GridImpl = {
  id: 'tanstack',
  label: 'TanStack Table + own UI',
  version,
  Grid: TanstackGrid,
  scroller: (container) => container.firstElementChild as HTMLElement | null,
  // The attribute exists for the probe: the rows this UI writes carry no class and no role of their own.
  rowSelector: '[data-bench-row]',
  sort: (container) => container.querySelector<HTMLElement>(`[data-column="${SORT_COLUMN}"]`)?.click(),
};

export default impl;
