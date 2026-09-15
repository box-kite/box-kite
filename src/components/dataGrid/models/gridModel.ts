import { ComponentsAndVariants } from '../../../types';
import ArrayUtils from '../../../utils/array/arrayUtils';
import { isRtl } from '../../../utils/dom/domUtils';
import memo from '../../../utils/memo';
import { fuzzySearch } from '../../../utils/string/fuzzySearch';
import DataGridCellRowDetail from '../components/dataGridCellRowDetail';
import DataGridCellRowSelection from '../components/dataGridCellRowSelection';
import {
  ColumnFilters,
  DataGridChangeReason,
  DataGridCsvOptions,
  DataGridFilterReason,
  DataGridProps,
  DataGridSelectionReason,
  DataGridXlsxOptions,
  ExportConfig,
  FilterValue,
  Key,
  NO_PIN,
  PaginationState,
  PinPosition,
  PinPositionInput,
  pinPositionOf,
  ServerState,
  SortDirection,
} from '../contracts/dataGridContract';
import AggregationModel from './aggregationModel';
import { GROUPING_CELL_KEY, ROW_DETAIL_CELL_KEY, ROW_NUMBER_CELL_KEY, ROW_SELECTION_CELL_KEY } from './cellKeys';
import ColumnModel from './columnModel';
import ColumnVisibilityModel from './columnVisibilityModel';
import DataSourceModel from './dataSourceModel';
import DetailRowModel from './detailRowModel';
import ExportModel from './exportModel';
import FilterModel from './filterModel';
import GroupRowModel from './groupRowModel';
import PaginationModel from './paginationModel';
import RowModel from './rowModel';
import ViewportModel from './viewportModel';

export { GROUPING_CELL_KEY, ROW_DETAIL_CELL_KEY, ROW_NUMBER_CELL_KEY, ROW_SELECTION_CELL_KEY } from './cellKeys';
export const DEFAULT_ROW_NUMBER_COLUMN_WIDTH = 70;

/** What `def.export: true` means, as one record: every option at its default. */
const DEFAULT_EXPORT: ExportConfig = {};

export default class GridModel<TRow> {
  constructor(
    public props: DataGridProps<TRow>,
    onChange?: () => void,
  ) {
    if (onChange) this.listeners.add(onChange);
  }

  // ========== Observable store (framework-agnostic) ==========
  // The grid is a headless store: any framework binds by subscribing. React uses
  // useSyncExternalStore(subscribe, getSnapshot). Mutations call notify() after
  // updating state + clearing the affected memos.

  private _version = 0;
  private readonly listeners = new Set<() => void>();

  /** Subscribe to changes; returns an unsubscribe function. */
  public subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /** Monotonic snapshot version — stable between changes, increments on notify(). */
  public getSnapshot = (): number => this._version;

  /** Signal subscribers that state changed and a re-render is needed. */
  public notify = (): void => {
    this._version++;
    this.listeners.forEach((listener) => listener());
  };

  /**
   * Sync incoming props. Called during render by the framework adapter — clears
   * the affected memos but does NOT notify (no extra render cycle; memos recompute
   * lazily on next access).
   */
  public setProps(props: DataGridProps<TRow>): void {
    const prev = this.props;
    if (prev === props) return;

    this.props = props;

    // Definition changed → column structure/layout changed; clearing sourceColumns
    // cascades through columns → headers/layout/rows.
    if (prev.def !== props.def) {
      this.sourceColumns.clear();
    }

    // A new ~def~ identity is not a new query: consumers build ~def~ inline, so invalidating the cache on
    // it would refetch every render. The datasource is read live at request time, so a changed closure is
    // picked up by the next block; ~refresh()~ on the grid's ref is how a caller forces the rest.
    // Any row-affecting prop changed → rebuild rows (cascades to flatRows/rowOffsets).
    if (
      prev.data !== props.data ||
      prev.def !== props.def ||
      prev.globalFilterValue !== props.globalFilterValue ||
      prev.columnFilters !== props.columnFilters ||
      prev.filters !== props.filters ||
      prev.expandedRowKeys !== props.expandedRowKeys ||
      prev.page !== props.page ||
      prev.pageSize !== props.pageSize
    ) {
      this.rows.clear();
    }
  }

  /**
   * The rows the grid was handed. `data` is optional because `def.dataSource` replaces it, and every
   * reader goes through here so that "no rows yet" is one empty array rather than a check at each site.
   */
  public get data(): TRow[] {
    return this.props.data ?? [];
  }

  /**
   * Every row the grid can act on right now. With a datasource that is the blocks it holds rather than
   * the table behind them — a select-all cannot reach rows nobody has fetched, and saying otherwise is
   * the one thing a server-backed grid must not do.
   */
  public get loadedRows(): TRow[] {
    return this.source.enabled ? this.source.loadedRows() : this.data;
  }

  public get componentName(): keyof ComponentsAndVariants {
    return (this.props.component || 'datagrid') as keyof ComponentsAndVariants;
  }

  // ========== Identity ==========

  private _identifier = 'datagrid';

  /**
   * A unique prefix for the ids this grid wires ARIA with. Supplied by the adapter, because only
   * the adapter can produce one that survives hydration — `useIdentifier` in React's case.
   */
  public get identifier(): string {
    return this._identifier;
  }

  public setIdentifier(identifier: string): void {
    this._identifier = identifier;
  }

  /** The title's id: a grid is not named by the rows in it, so it is named by this. */
  public get titleId(): string {
    return `${this._identifier}-title`;
  }

  public get resizerStyle(): 'visible' | 'hover' | 'hidden' {
    return this.props.def.resizerStyle ?? 'visible';
  }

  public get resizeMode(): 'smooth' | 'instant' {
    return this.props.def.resizeMode ?? 'smooth';
  }

  public readonly sourceColumns = memo(() => {
    const { def } = this.props;

    const sourceColumns: ColumnModel<TRow>[] = [];

    if (this.groupColumns.size > 0) {
      sourceColumns.push(new ColumnModel({ key: GROUPING_CELL_KEY }, this));
    }

    sourceColumns.push(...def.columns.map((d) => new ColumnModel(d, this)));

    // add row selection column
    if (def.rowSelection) {
      const pin: PinPosition | undefined = typeof def.rowSelection === 'object' && def.rowSelection.pinned ? 'START' : undefined;

      sourceColumns.unshift(
        new ColumnModel({ key: ROW_SELECTION_CELL_KEY, pin, width: 50, align: 'center', Cell: DataGridCellRowSelection }, this),
      );
    }

    // add row number column
    if (def.showRowNumber) {
      let pin: PinPosition | undefined;
      let width: number | undefined = DEFAULT_ROW_NUMBER_COLUMN_WIDTH;
      if (typeof def.showRowNumber === 'object') {
        def.showRowNumber.pinned && (pin = 'START');
        width = def.showRowNumber.width ?? DEFAULT_ROW_NUMBER_COLUMN_WIDTH;
      }

      sourceColumns.unshift(new ColumnModel({ key: ROW_NUMBER_CELL_KEY, pin, width, align: 'end' }, this));
    }

    // add row detail expand column
    if (def.rowDetail) {
      const pin: PinPosition | undefined = def.rowDetail.pinned ? 'START' : undefined;
      const width = def.rowDetail.expandColumnWidth ?? 50;
      const header = def.rowDetail.expandColumnHeader ?? '';

      sourceColumns.unshift(
        new ColumnModel({ key: ROW_DETAIL_CELL_KEY, header, pin, width, align: 'center', Cell: DataGridCellRowDetail }, this),
      );
    }

    return sourceColumns;
  });

  public readonly columns = memo(
    () => {
      const start = this.sourceColumns.value.map((c) => c.getPinnedColumn('START')).filter((c) => !!c);
      const middle = this.sourceColumns.value.map((c) => c.getPinnedColumn()).filter((c) => !!c);
      const end = this.sourceColumns.value.map((c) => c.getPinnedColumn('END')).filter((c) => !!c);
      const flat = [...start, ...middle, ...end].flatMap((c) => c.flatColumns);
      const leafs = flat.filter((x) => x.isLeaf);
      const visibleLeafs = flat.filter((x) => x.isLeaf && x.isVisible);
      const userVisibleLeafs = visibleLeafs.filter(
        (c) => !([ROW_NUMBER_CELL_KEY, ROW_SELECTION_CELL_KEY, GROUPING_CELL_KEY, ROW_DETAIL_CELL_KEY] as Key[]).includes(c.key),
      );
      const maxDeath = ArrayUtils.maxBy(flat, (x) => x.death) + 1;

      return {
        start,
        middle,
        end,
        flat,
        leafs,
        visibleLeafs,
        userVisibleLeafs,
        maxDeath,
      };
    },
    () => [this.sourceColumns],
  );

  public readonly headerRows = memo(
    () => {
      const groupedByLevel = ArrayUtils.sortBy(
        ArrayUtils.groupBy(this.columns.value.flat, (c) => c.death),
        (x) => x.key,
      );

      return groupedByLevel.map((x) => {
        const cols = ArrayUtils.toRecord(
          ArrayUtils.groupBy(x.values, (c) => c.pin ?? NO_PIN),
          (c) => [c.key, c.values],
        );

        return [
          ...(cols.START?.filter((c) => c.isVisible) ?? []),
          ...(cols.NO_PIN?.filter((c) => c.isVisible) ?? []),
          ...(cols.END?.filter((c) => c.isVisible) ?? []),
        ];
      });
    },
    () => [this.columns],
  );

  public readonly gridTemplateColumns = memo(
    () => {
      const { visibleLeafs } = this.columns.value;

      const endPinnedColumnsCount = ArrayUtils.sumBy(visibleLeafs, (x) => (x.pin === 'END' ? 1 : 0));
      const startAndMiddleCount = visibleLeafs.length - endPinnedColumnsCount;

      const start = startAndMiddleCount > 0 ? `repeat(${startAndMiddleCount}, max-content)` : '';
      const end = endPinnedColumnsCount > 0 ? `repeat(${endPinnedColumnsCount}, max-content)` : '';

      return `${start} ${end}`.trim();
    },
    () => [this.columns],
  );

  // ========== Filtering ==========

  private _globalFilterValue = '';
  public get globalFilterValue(): string {
    return this.props.globalFilterValue ?? this._globalFilterValue;
  }

  private _columnFilters: ColumnFilters<TRow> = {};
  public get columnFilters(): ColumnFilters<TRow> {
    return this.props.columnFilters ?? this._columnFilters;
  }

  /**
   * Apply global filter (fuzzy search across all or specified columns)
   */
  private applyGlobalFilter(data: TRow[]): TRow[] {
    const filterValue = this.globalFilterValue.trim();
    if (!filterValue) return data;

    const { globalFilterKeys } = this.props.def;
    const searchableColumns =
      globalFilterKeys ??
      this.columns.value.leafs
        .filter(
          (c) =>
            c.key !== ROW_NUMBER_CELL_KEY &&
            c.key !== ROW_SELECTION_CELL_KEY &&
            c.key !== GROUPING_CELL_KEY &&
            c.key !== ROW_DETAIL_CELL_KEY,
        )
        .map((c) => c.key);

    return data.filter((row) => {
      return searchableColumns.some((key) => {
        const value = row[key as keyof TRow];
        if (value == null) return false;
        return fuzzySearch(filterValue, String(value));
      });
    });
  }

  /**
   * Apply column-level filters
   */
  private applyColumnFilters(data: TRow[]): TRow[] {
    const filters = this.columnFilters;
    const filterKeys = Object.keys(filters) as (keyof TRow)[];

    if (filterKeys.length === 0) return data;

    return data.filter((row) => {
      return filterKeys.every((key) => {
        const filter = filters[key];
        if (!filter) return true;

        const cellValue = row[key as keyof TRow];

        return this.matchesFilter(cellValue, filter);
      });
    });
  }

  /**
   * Check if a cell value matches a filter
   */
  private matchesFilter(cellValue: unknown, filter: FilterValue): boolean {
    switch (filter.type) {
      case 'text': {
        if (!filter.value.trim()) return true;
        if (cellValue == null) return false;
        return fuzzySearch(filter.value, String(cellValue));
      }

      case 'number': {
        if (cellValue == null) return false;
        const numValue = typeof cellValue === 'number' ? cellValue : parseFloat(String(cellValue));
        if (isNaN(numValue)) return false;

        switch (filter.operator) {
          case 'eq':
            return numValue === filter.value;
          case 'ne':
            return numValue !== filter.value;
          case 'gt':
            return numValue > filter.value;
          case 'gte':
            return numValue >= filter.value;
          case 'lt':
            return numValue < filter.value;
          case 'lte':
            return numValue <= filter.value;
          case 'between':
            return filter.valueTo !== undefined ? numValue >= filter.value && numValue <= filter.valueTo : numValue >= filter.value;
          default:
            return true;
        }
      }

      case 'multiselect': {
        if (filter.values.length === 0) return true;
        return filter.values.includes(cellValue as string | number | boolean | null);
      }

      default:
        return true;
    }
  }

  /**
   * Apply external predicate filters from the filters prop
   */
  private applyExternalFilters(data: TRow[]): TRow[] {
    const filters = this.props.filters;
    if (!filters || filters.length === 0) return data;

    return data.filter((row) => filters.every((predicate) => predicate(row)));
  }

  /**
   * Get filtered data (applies external, global, then column filters)
   */
  public get filteredData(): TRow[] {
    // The server has already filtered — with a datasource it filtered the block, with server-side
    // pagination it filtered the page.
    if (this.source.enabled || this.isPaginated) return this.data;

    let data = this.data;

    // Apply external predicate filters
    data = this.applyExternalFilters(data);

    // Apply global filter
    if (this.props.def.globalFilter) {
      data = this.applyGlobalFilter(data);
    }

    // Apply column filters
    data = this.applyColumnFilters(data);

    return data;
  }

  private fireServerStateChange(reason: DataGridChangeReason, overrides?: Partial<ServerState<TRow>>): void {
    this.props.onServerStateChange?.(
      {
        page: overrides?.page ?? this.page,
        pageSize: overrides?.pageSize ?? this.pageSize,
        sortColumn: 'sortColumn' in (overrides ?? {}) ? overrides!.sortColumn : this._sortColumn,
        sortDirection: 'sortDirection' in (overrides ?? {}) ? overrides!.sortDirection : this._sortDirection,
        columnFilters: overrides?.columnFilters ?? this.columnFilters,
        globalFilterValue: overrides?.globalFilterValue ?? this.globalFilterValue,
      },
      { reason },
    );
  }

  /** Both pager callbacks: the one carrying a reason, and the `(page, pageSize)` pair it replaces. */
  private firePaginationChange(page: number, pageSize: number, reason: DataGridChangeReason): void {
    this.props.onPaginationChange?.({ page, pageSize }, { reason });
    this.props.onPageChange?.(page, pageSize);
  }

  /**
   * A query that changed underneath the pager sends it back to the first page. Returns where the page now
   * is, which is what the server-state snapshot asks the server for.
   */
  private resetToFirstPage(reason: DataGridChangeReason): number {
    if (!this.isPaginated || this.page === 1) return this.page;

    this._page = 1;
    this.firePaginationChange(1, this.pageSize, reason);

    return 1;
  }

  /**
   * Set global filter value
   */
  public setGlobalFilter = (value: string): void => {
    const reason: DataGridFilterReason = value === '' ? 'clear' : 'filter';

    // Written whether or not `globalFilterValue` is present — a handler is a listener, not ownership
    // (bug #154). The getter prefers the prop, so a controlled grid still shows what its owner asked for.
    this._globalFilterValue = value;
    this.props.onGlobalFilterChange?.(value, { reason });

    const nextPage = this.resetToFirstPage(reason);

    this.fireServerStateChange(reason, { globalFilterValue: value, page: nextPage });

    this.source.invalidate();
    this.rows.clear(); // cascades to flatRows/rowOffsets
    this.notify();
  };

  /**
   * Set a single column filter
   */
  public setColumnFilter = (columnKey: Key, filter: FilterValue | undefined): void => {
    const newFilters = { ...this.columnFilters };
    const reason: DataGridFilterReason = filter === undefined ? 'clear' : 'filter';

    if (filter === undefined) {
      delete newFilters[columnKey as keyof TRow];
    } else {
      newFilters[columnKey as keyof TRow] = filter;
    }

    this._columnFilters = newFilters;
    this.props.onColumnFiltersChange?.(newFilters, { reason });

    const nextPage = this.resetToFirstPage(reason);

    this.fireServerStateChange(reason, { columnFilters: newFilters, page: nextPage });

    this.source.invalidate();
    this.rows.clear(); // cascades to flatRows/rowOffsets
    this.notify();
  };

  /**
   * Clear all column filters
   */
  public clearColumnFilters = (): void => {
    this._columnFilters = {};
    this.props.onColumnFiltersChange?.({}, { reason: 'clear' });

    this.fireServerStateChange('clear', { columnFilters: {} });

    this.source.invalidate();
    this.rows.clear(); // cascades to flatRows/rowOffsets
    this.notify();
  };

  /**
   * Clear all filters (global + column)
   */
  public clearAllFilters = (): void => {
    this.setGlobalFilter('');
    this.clearColumnFilters();
  };

  /**
   * Get unique values for a column (used for multiselect filter options)
   */
  public getColumnUniqueValues = (columnKey: Key): (string | number | boolean | null)[] => {
    const values = new Set<string | number | boolean | null>();

    this.data.forEach((row) => {
      const value = row[columnKey as keyof TRow];
      if (value !== undefined) {
        values.add(value as string | number | boolean | null);
      }
    });

    return Array.from(values).sort((a, b) => {
      if (a === null) return 1;
      if (b === null) return -1;
      if (typeof a === 'string' && typeof b === 'string') return a.localeCompare(b);
      if (typeof a === 'number' && typeof b === 'number') return a - b;
      return String(a).localeCompare(String(b));
    });
  };

  /**
   * Check if any filter is active
   */
  public get hasActiveFilters(): boolean {
    return this.globalFilterValue.trim() !== '' || Object.keys(this.columnFilters).length > 0;
  }

  /**
   * Get count of filtered rows vs total rows
   */
  public get filterStats(): { filtered: number; total: number } {
    if (this.source.enabled || this.isPaginated) {
      const totalCount = this.totalRowCount;
      return { filtered: totalCount, total: totalCount };
    }
    return {
      filtered: this.filteredData.length,
      total: this.data.length,
    };
  }

  /** How many rows the query holds altogether: the server's count where there is one, else what is here. */
  public get totalRowCount(): number {
    if (this.source.enabled) return this.source.rowCount;

    return this.props.def.pagination?.totalCount ?? this.data.length;
  }

  public readonly rows = memo(
    () => {
      // A datasource owns the order, the filtering and the grouping, so there is nothing to work out
      // here: what is left is one model per position, reading its values out of the block cache. The
      // count is the server's, so the scroll height and `aria-rowcount` hold still while blocks arrive.
      if (this.source.enabled) return this.source.rowList();

      let data = this.filteredData;

      if (this._sortColumn && !this.isPaginated) {
        data = ArrayUtils.sortBy(data, (x) => x[this._sortColumn as keyof TRow], this._sortDirection);
      }

      if (this.groupColumns.size > 0) {
        const getRowsGroup = (dataToGroup: TRow[], groupColumns: Set<Key>, rowIndex: number): GroupRowModel<TRow>[] => {
          const groupKey = groupColumns.values().next().value!;
          groupColumns.delete(groupKey);
          const column = ArrayUtils.findOrThrow(this.columns.value.leafs, (c) => c.key === groupKey);

          if (this._sortColumn === GROUPING_CELL_KEY) {
            dataToGroup = ArrayUtils.sortBy(dataToGroup, (x) => x[groupKey as keyof TRow], this._sortDirection);
          }

          return ArrayUtils.groupBy(dataToGroup, (item) => item[groupKey as keyof TRow] as Key).map((group) => {
            let rows: RowModel<TRow>[] | GroupRowModel<TRow>[];

            if (groupColumns.size > 0) {
              rows = getRowsGroup(group.values, new Set(groupColumns), rowIndex + 1);
            } else {
              rows = group.values.map((dataRow, index) => new RowModel(this, dataRow, rowIndex + 1 + index));
            }

            const groupRow = new GroupRowModel(this, column, rows, rowIndex, group.key);
            rowIndex += 1;

            if (groupRow.expanded) {
              rowIndex += rows.length;
            }

            return groupRow;
          });
        };

        return getRowsGroup(data, new Set(this.groupColumns), 0);
      }

      return data.map((dataRow, rowIndex) => new RowModel(this, dataRow, rowIndex));
    },
    () => [this.columns],
  );

  /**
   * The columns the group row's label cell covers: the grouping cell itself and the data columns beside it in
   * its own pin, stopping at the first one carrying an aggregate — past that each column draws a value of its
   * own, and a number under the wrong heading is worse than a label with less room. With nothing aggregating
   * the span is every one of them, which is what it was before aggregates existed.
   */
  public readonly groupingSpan = memo(
    () => {
      const { visibleLeafs } = this.columns.value;
      const start = visibleLeafs.findIndex((c) => c.isGrouping);
      if (start === -1) return [];

      const inSpan = (c: ColumnModel<TRow>, index: number): boolean =>
        index > start && c.pin === visibleLeafs[start].pin && !c.isRowNumber && !c.isRowSelection && !c.isRowDetail;

      const aggregated = visibleLeafs.findIndex((c, index) => inSpan(c, index) && !!c.aggregate);
      const stop = aggregated === -1 ? visibleLeafs.length : aggregated;

      return [visibleLeafs[start], ...visibleLeafs.filter((c, index) => index < stop && inSpan(c, index))];
    },
    () => [this.columns],
  );

  public readonly flatRows = memo(
    () => {
      // Never `flatMap` over a datasource's rows: the list is lazy, and iterating it is what building a
      // model per row of a million-row grid would cost. A group's children are already in that list —
      // the source splices them in as it walks its levels, so nothing here expands anything.
      if (this.source.enabled) return this.source.flatRowList(this.rows.value);

      return this.rows.value.flatMap((row) => {
        return row.flatRows as (RowModel<TRow> | GroupRowModel<TRow> | DetailRowModel<TRow>)[];
      });
    },
    () => [this.rows],
  );

  public get rowHeight() {
    return this.props.def.rowHeight ?? this.DEFAULT_ROW_HEIGHT_PX;
  }

  public readonly sizes = memo(
    () => {
      const size = this.columns.value.flat.reduce<Record<string, string>>((acc, c) => {
        const { inlineWidth } = c;
        if (typeof inlineWidth === 'number') {
          acc[c.widthVarName] = `${c.inlineWidth}px`;
        }

        if (c.pin === 'START') {
          acc[c.inlineStartVarName] = `${c.startOffset}px`;
        }

        if (c.pin === 'END') {
          acc[c.inlineEndVarName] = `${c.endOffset}px`;
        }

        return acc;
      }, {});

      size[this.rowHeightVarName] = `${this.rowHeight}px`;
      size[this.inlineStartEdgeVarName] = `${this.inlineStartEdge}px`;
      if (this._containerWidth > 0) {
        size[this.viewportWidthVarName] = `${this._containerWidth}px`;
      }

      const { visibleLeafs } = this.columns.value;
      const groupingColumn = visibleLeafs.find((c) => c.key === GROUPING_CELL_KEY);
      if (groupingColumn) {
        // The width has to match the span exactly, so both read the same list.
        const groupingColumnSize = ArrayUtils.sumBy(this.groupingSpan.value, (c) => c.inlineWidth ?? 0);
        size[groupingColumn.groupColumnWidthVarName] = `${groupingColumnSize}px`;
      }

      this.groupColumns.forEach((key) => {
        const col = ArrayUtils.findOrThrow(this.columns.value.leafs, (c) => c.key === key);
        size[col.groupColumnWidthVarName] = `${ArrayUtils.sumBy(visibleLeafs, (c) => (c.pin === col.pin ? (c.inlineWidth ?? 0) : 0))}px`;
      });

      return size;
    },
    () => [this.columns, this.flexWidths],
  );

  // ========== Flexible Column Sizing ==========

  private _containerWidth = 0;
  public get containerWidth() {
    return this._containerWidth;
  }

  /**
   * The DOM element that carries the column-sizing CSS variables (the grid container).
   * Set by the React adapter. During a resize drag the adapter writes the width vars
   * here directly — bypassing React re-renders — and only commits to state on release.
   */
  private _sizingElement: HTMLElement | null = null;
  public get sizingElement(): HTMLElement | null {
    return this._sizingElement;
  }
  public setSizingElement = (el: HTMLElement | null): void => {
    this._sizingElement = el;
  };

  /**
   * Which way the grid reads, resolved off the element the widths are written to. A model with no
   * element yet — a server render, a headless host — reads as left to right, the initial value.
   */
  public get isRtl(): boolean {
    return isRtl(this._sizingElement);
  }

  public setContainerWidth = (width: number) => {
    if (this._containerWidth !== width) {
      this._containerWidth = width;
      this.flexWidths.clear(); // cascades to sizes
      this.notify();
    }
  };

  public readonly flexWidths = memo(
    () => {
      const containerWidth = this._containerWidth;
      if (containerWidth <= 0) return {};

      const visibleLeafs = this.columns.value.visibleLeafs;

      // A column is "fixed" if: flexible: false OR it has been manually resized (in columnWidths)
      const isColumnFixed = (c: ColumnModel<TRow>) => !c.isFlexible || this.columnWidths.has(c.key);

      // Sum of fixed column widths
      const fixedWidth = ArrayUtils.sumBy(visibleLeafs.filter(isColumnFixed), (c) => c.baseWidth);

      // Flexible columns (not fixed and not manually resized)
      const flexCols = visibleLeafs.filter((c) => !isColumnFixed(c));
      const totalFlexBase = ArrayUtils.sumBy(flexCols, (c) => c.baseWidth);

      // Available space for flex columns
      const availableSpace = containerWidth - fixedWidth;

      // Distribute proportionally (never shrink below base width)
      if (availableSpace <= totalFlexBase) {
        // Not enough space - use base widths
        return ArrayUtils.toRecord(flexCols, (c) => [c.key, c.baseWidth]);
      }

      // Proportional distribution using floor to avoid exceeding available space
      const result: Record<Key, number> = {};
      let distributed = 0;

      flexCols.forEach((c, index) => {
        if (index === flexCols.length - 1) {
          // Last column gets the remainder to avoid rounding issues
          result[c.key] = availableSpace - distributed;
        } else {
          const width = Math.floor((c.baseWidth / totalFlexBase) * availableSpace);
          result[c.key] = width;
          distributed += width;
        }
      });

      return result;
    },
    () => [this.columns],
  );

  public getFlexWidth(key: Key): number | undefined {
    return this.flexWidths.value[key];
  }

  public readonly DEFAULT_ROW_HEIGHT_PX = 48;
  public readonly MIN_COLUMN_WIDTH_PX = 48;
  public readonly DEFAULT_COLUMN_WIDTH_PX = 200;

  public expandedGroupRow: Set<Key> = new Set();

  // ========== Row Detail Expansion ==========

  private _expandedDetailRows: Set<Key> = new Set();

  public get expandedDetailRows(): Set<Key> {
    if (this.props.expandedRowKeys) {
      return new Set(this.props.expandedRowKeys);
    }
    return this._expandedDetailRows;
  }

  /** The row whose panel a user action just opened, for the row itself to bring into view once. */
  private _revealDetailKey: Key | null = null;

  /**
   * Taken by the detail row on the render that puts it in the DOM, and only then: an `auto` panel's
   * real height exists nowhere else, and the virtualization offsets carry an estimate for it.
   */
  public takeDetailReveal(rowKey: Key): boolean {
    if (this._revealDetailKey !== rowKey) return false;

    this._revealDetailKey = null;
    return true;
  }

  public toggleDetailRow = (rowKey: Key) => {
    const expandedKeys = new Set(this.expandedDetailRows);

    if (expandedKeys.has(rowKey)) {
      expandedKeys.delete(rowKey);
    } else {
      expandedKeys.add(rowKey);
    }

    const expanded = expandedKeys.has(rowKey);
    // Overwritten on every toggle, collapse included, so a request nothing consumed — a row scrolled
    // out of the rendered window before its panel mounted — cannot fire a surprise scroll later.
    this._revealDetailKey = expanded && this.props.def.rowDetail?.scrollIntoView !== false ? rowKey : null;

    this._expandedDetailRows = expandedKeys;
    this.props.onExpandedRowKeysChange?.(Array.from(expandedKeys), { reason: expanded ? 'expand' : 'collapse' });

    this.rows.clear(); // cascades to flatRows/rowOffsets
    this.notify();
  };

  // ========== Pagination ==========

  private _page = 1;
  private _pageSize?: number;

  public get page(): number {
    return this.props.page ?? this._page;
  }

  public get pageSize(): number {
    if (this.props.pageSize !== undefined) return this.props.pageSize;
    if (this._pageSize !== undefined) return this._pageSize;
    const pagination = this.props.def.pagination;
    if (pagination?.pageSize) return pagination.pageSize;
    const vrc = this.props.def.visibleRowsCount;
    if (typeof vrc === 'number') return vrc;
    return 10;
  }

  public get pageSizeOptions(): number[] | undefined {
    return this.props.def.pagination?.pageSizeOptions;
  }

  public get isPaginated(): boolean {
    return !!this.props.def.pagination;
  }

  public get paginationState(): PaginationState | undefined {
    const pagination = this.props.def.pagination;
    if (!pagination) return undefined;
    // A datasource answers the count, so ~def.pagination~ need not carry one.
    const totalItems = pagination.totalCount ?? (this.source.enabled ? this.source.rowCount : 0);
    const pageSize = this.pageSize;
    return {
      page: this.page,
      pageSize,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
    };
  }

  public changePage = (page: number) => {
    const state = this.paginationState;
    if (!state) return;
    const clamped = Math.max(1, Math.min(page, state.totalPages));
    if (clamped === this.page) return;

    this._page = clamped;
    this.firePaginationChange(clamped, state.pageSize, 'page');

    this.fireServerStateChange('page', { page: clamped });

    // No invalidation: a new page is a different block of the same query, so a page already fetched is
    // shown without a round trip and the one ahead is asked for.
    this.rows.clear(); // cascades to flatRows/rowOffsets
    this.notify();
  };

  public changePageSize = (size: number): void => {
    if (size === this.pageSize) return;

    this._pageSize = size;
    this._page = 1;

    this.props.onPageSizeChange?.(size);
    this.firePaginationChange(1, size, 'page-size');

    this.fireServerStateChange('page-size', { page: 1, pageSize: size });

    // Every block boundary moved, so nothing cached lines up with a request any more.
    this.source.invalidate();
    this.rows.clear(); // cascades to flatRows/rowOffsets
    this.notify();
  };

  // ========== Row Offsets (for variable-height virtualization) ==========

  public readonly rowOffsets = memo(
    () => {
      if (this.source.enabled) return this.source.rowOffsets(this.flatRows.value);

      const offsets: number[] = [];
      let cumulative = 0;

      for (const row of this.flatRows.value) {
        offsets.push(cumulative);
        cumulative += row instanceof DetailRowModel ? row.heightForOffset : this.rowHeight;
      }

      return { offsets, totalHeight: cumulative };
    },
    () => [this.flatRows],
  );

  /** Headless virtualization (windowing math; scrollTop is owned by the adapter). */
  public readonly viewport = new ViewportModel(this);

  /** Backs the top-bar column-visibility menu. */
  public readonly columnVisibility = new ColumnVisibilityModel(this);

  /** Filtering concern (grid-level state + derived flags). */
  public readonly filter = new FilterModel(this);

  /** Pagination concern (navigation + row-range derivations). */
  public readonly pagination = new PaginationModel(this);

  /** Aggregation concern (which columns aggregate, and the footer's grand totals). */
  public readonly aggregation = new AggregationModel(this);

  /** Export concern (the columns, rows and levels both file formats are written from). */
  public readonly exporter = new ExportModel(this);

  /** Server row model: the blocks ~def.dataSource~ has answered, and the ones still in flight. */
  public readonly source = new DataSourceModel(this);

  /**
   * Throw the fetched blocks away and ask for them again. The grid invalidates on its own whenever it
   * changes the query; this is for the half it cannot see — a filter of the page's own, a row somebody
   * saved, a tenant that changed underneath the closure ~getRows~ was written in.
   */
  public refresh = (): void => {
    this.source.invalidate();
  };

  /**
   * Which export buttons the top bar shows, and the options they press with. `export: true` resolves to
   * one shared record rather than a fresh one, so the buttons' handlers keep their identity.
   */
  public get exportConfig(): ExportConfig | undefined {
    const config = this.props.def.export;
    if (!config) return undefined;

    return typeof config === 'object' ? config : DEFAULT_EXPORT;
  }

  /**
   * Download the grid as a CSV. Both writers are behind an `import()`, so the format is fetched on the
   * first press and a grid nobody exports from carries neither.
   */
  public exportCsv = async (options: DataGridCsvOptions = {}): Promise<void> => {
    const { downloadCsv } = await import('../export/gridExport');

    downloadCsv(this.exporter.table(options), this.exporter.fileName(options), options);
  };

  /** Download the grid as an `.xlsx`, with its groups as Excel's own outline levels. */
  public exportXlsx = async (options: DataGridXlsxOptions = {}): Promise<void> => {
    const { downloadXlsx } = await import('../export/gridExport');

    downloadXlsx(this.exporter.table(options), this.exporter.fileName(options), options);
  };

  /** Whether any user-facing column is currently visible (else the empty-columns state shows). */
  public get hasVisibleColumns(): boolean {
    return this.columns.value.userVisibleLeafs.length > 0;
  }

  public get isEmpty(): boolean {
    return this.source.enabled ? this.flatRows.value.length === 0 : this.data.length === 0;
  }

  /** Header select-all checkbox state. */
  public get allRowsSelected(): boolean {
    const rows = this.loadedRows.length;

    return rows > 0 && this.selectedRows.size === rows;
  }
  public get someRowsSelected(): boolean {
    return this.selectedRows.size > 0;
  }

  private _selectionAnnounced = false;

  /**
   * What the grid's live region says. Ticking a checkbox halfway down a virtualized grid changes nothing a
   * screen reader would read, so the count is announced instead — and it stays empty until a selection has
   * happened, since some readers announce a region that already holds text on mount.
   */
  public get selectionAnnouncement(): string {
    if (!this._selectionAnnounced) return '';

    const selected = this.selectedRows.size;

    return selected === 0 ? 'No rows selected' : `${selected} of ${this.totalRowCount} rows selected`;
  }

  /** The columns currently grouped, resolved from groupColumns keys (backs the top-bar group chips). */
  public get groupedColumns(): ColumnModel<TRow>[] {
    return Array.from(this.groupColumns, (key) => ArrayUtils.findOrThrow(this.columns.value.leafs, (c) => c.key === key));
  }

  public selectedRows: Set<Key> = new Set();
  public get inlineStartEdge() {
    return ArrayUtils.sumBy(this.columns.value.start, (c) => c.inlineWidth ?? 0);
  }
  public get inlineEndEdge() {
    return ArrayUtils.sumBy(this.columns.value.end, (c) => c.inlineWidth ?? 0);
  }
  public readonly inlineStartEdgeVarName = '--inline-start-edge';
  public readonly rowHeightVarName = '--row-height';
  public readonly viewportWidthVarName = '--viewport-width';

  private readonly _idMap = new WeakMap<WeakKey, Key>();
  private _autoId = 0;
  // No hard DOM/platform dependency: prefer crypto.randomUUID when available, else a counter.
  private readonly _idFactory: () => Key =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? () => crypto.randomUUID()
      : () => `auto-row-${this._autoId++}`;

  public getRowKey(row: TRow): Key {
    const { rowKey } = this.props.def;

    if (rowKey) {
      return typeof rowKey === 'function' ? rowKey(row) : (row[rowKey] as string);
    }

    if (!this._idMap.has(row as WeakKey)) {
      this._idMap.set(row as WeakKey, this._idFactory());
    }

    return this._idMap.get(row as WeakKey)!;
  }

  public setSortColumn: (columnKey: Key, sortDirection?: SortDirection) => void = (
    columnKey: Key,
    ...sortDirection: [SortDirection | undefined]
  ) => {
    if (sortDirection.length > 0) {
      [this._sortDirection] = sortDirection;
      this._sortColumn = this._sortDirection ? columnKey : undefined;
    } else {
      const { _sortColumn, _sortDirection } = this;

      this._sortColumn = _sortColumn === columnKey && _sortDirection === 'DESC' ? undefined : columnKey;
      this._sortDirection = _sortColumn === columnKey && _sortDirection === 'ASC' ? 'DESC' : 'ASC';
    }

    // Notify parent for server-side sorting. A cleared sort keeps its direction for the older callback,
    // which has always reported the pair; the new one says `undefined` once there is no column.
    // Tested against `undefined` rather than truthiness: a column key is a `Key`, so `0` is one (bug #153).
    const sorting =
      this._sortColumn !== undefined && this._sortDirection !== undefined
        ? { columnKey: this._sortColumn, direction: this._sortDirection }
        : undefined;

    this.props.onSortingChange?.(sorting, { reason: sorting ? 'sort' : 'clear' });
    this.props.onSortChange?.(this._sortColumn, this._sortDirection);

    const nextPage = this.resetToFirstPage('sort');

    this.fireServerStateChange('sort', { sortColumn: this._sortColumn, sortDirection: this._sortDirection, page: nextPage });

    this.source.invalidate();
    this.rows.clear(); // cascades to flatRows/rowOffsets (sort doesn't change column structure)
    this.notify();
  };

  public pinColumn = (uniqueKey: string, pin?: PinPositionInput) => {
    // The column and the grid call each other, and this equality is the only thing that stops them —
    // so it has to compare the side, not the spelling the caller happened to use.
    const side = pinPositionOf(pin);
    const column = ArrayUtils.findOrThrow(this.columns.value.flat, (c) => c.uniqueKey === uniqueKey);
    if (column.pin !== side) {
      column.pinColumn(side);
    }

    this.columns.clear(); // cascades to headerRows/gridTemplateColumns/flexWidths/sizes/rows/flatRows/rowOffsets

    this.notify();
  };

  public toggleGrouping = (columnKey: Key) => {
    this.groupColumns = new Set(this.groupColumns);
    this.hiddenColumns = new Set(this.hiddenColumns);

    if (this.groupColumns.has(columnKey)) {
      this.groupColumns.delete(columnKey);
      this.hiddenColumns.delete(columnKey);
    } else {
      this.groupColumns.add(columnKey);
      this.hiddenColumns.add(columnKey);
    }

    this.collapseGroups();
    this.sourceColumns.clear(); // cascades to columns → headerRows/gridTemplateColumns/flexWidths/sizes/rows/flatRows/rowOffsets

    this.notify();
  };

  public unGroupAll = () => {
    const prevGroupColumns = new Set(this.groupColumns);
    this.groupColumns = new Set();
    // Ensure previously grouped columns are made visible again
    this.hiddenColumns = new Set(Array.from(this.hiddenColumns).filter((key) => !prevGroupColumns.has(key)));

    this.collapseGroups();
    this.sourceColumns.clear(); // cascades to columns → headerRows/gridTemplateColumns/flexWidths/sizes/rows/flatRows/rowOffsets
    this.notify();
  };

  /** Grouping changed, so every open path names a group that is not there and every block is stale. */
  private collapseGroups(): void {
    this.expandedGroupRow = new Set();
    this.source.expansionChanged();
    this.source.invalidate();
  }

  /** Bumped by every expand and collapse, so the adapter's fetch effect asks for the level just opened. */
  private _expansion = 0;

  public get expansionVersion(): number {
    return this._expansion;
  }

  public toggleGroupRow = (groupRowKey: Key) => {
    this._expansion++;
    this.expandedGroupRow = new Set(this.expandedGroupRow);

    if (this.expandedGroupRow.has(groupRowKey)) {
      this.expandedGroupRow.delete(groupRowKey);
    } else {
      this.expandedGroupRow.add(groupRowKey);
    }

    this.source.expansionChanged();
    this.rows.clear(); // required to update rowIndex; cascades to flatRows/rowOffsets
    this.notify();
  };

  public toggleRowSelection = (rowKey: Key) => {
    this.toggleRowsSelection([rowKey]);
  };

  /** `all` is the header checkbox rather than a count: a group covering every row is still not select-all. */
  public toggleRowsSelection = (rowKeys: Key[], all = false) => {
    this.selectedRows = new Set(this.selectedRows);
    this._selectionAnnounced = true;

    const hasAllSelected = rowKeys.every((rowKey) => this.selectedRows.has(rowKey));

    if (hasAllSelected) {
      rowKeys.forEach((rowKey) => this.selectedRows.delete(rowKey));
    } else {
      rowKeys.forEach((rowKey) => this.selectedRows.add(rowKey));
    }

    this.flatRows.clear(); // cascades to rowOffsets
    this.notify();

    const selectedRowKeys = Array.from(this.selectedRows);
    const reason: DataGridSelectionReason = all ? (hasAllSelected ? 'clear' : 'select-all') : hasAllSelected ? 'deselect' : 'select';

    this.props.onSelectedRowKeysChange?.(selectedRowKeys, { reason });
    this.props.onSelectionChange?.({
      action: hasAllSelected ? 'deselect' : 'select',
      affectedRowKeys: rowKeys,
      selectedRowKeys,
      isAllSelected: this.selectedRows.size === this.loadedRows.length,
    });
  };

  public toggleSelectAllRows = () => {
    this.toggleRowsSelection(
      this.loadedRows.map((x) => this.getRowKey(x)),
      true,
    );
  };

  public toggleColumnVisibility = (columnKey: Key) => {
    this.hiddenColumns = new Set(this.hiddenColumns);

    if (this.hiddenColumns.has(columnKey)) {
      this.hiddenColumns.delete(columnKey);
    } else {
      this.hiddenColumns.add(columnKey);
    }

    this.columns.clear(); // cascades to headerRows/gridTemplateColumns/flexWidths/sizes/rows/flatRows/rowOffsets

    this.notify();
  };

  public setWidth = (columnKey: Key, width: number) => {
    // Store width persistently so it survives memo recreation
    this.columnWidths.set(columnKey, width);
  };

  public groupColumns: Set<Key> = new Set();
  public hiddenColumns: Set<Key> = new Set();
  public columnWidths: Map<Key, number> = new Map();

  private _sortColumn?: Key;
  public get sortColumn() {
    return this._sortColumn;
  }
  private _sortDirection?: SortDirection = 'ASC';
  public get sortDirection() {
    return this._sortDirection;
  }
}
