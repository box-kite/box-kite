import ArrayUtils from '../../../utils/array/arrayUtils';
import memo from '../../../utils/memo';
import {
  ColumnAggregate,
  ColumnFilterConfig,
  ColumnType,
  ContextMenuConfig,
  FilterValue,
  Key,
  NumberFilterValue,
  PinPosition,
  PinPositionInput,
  pinPositionOf,
  SortDirection,
} from '../contracts/dataGridContract';
import { GROUPING_CELL_KEY, ROW_DETAIL_CELL_KEY, ROW_NUMBER_CELL_KEY, ROW_SELECTION_CELL_KEY } from './cellKeys';
import GridModel from './gridModel';
import HeaderCellModel from './headerCellModel';

/** Discriminates the structural role of a column — replaces scattered `key === *_CELL_KEY` checks. */
export type ColumnKind = 'data' | 'rowNumber' | 'rowSelection' | 'rowDetail' | 'grouping';

export default class ColumnModel<TRow> {
  constructor(
    public readonly def: ColumnType<TRow>,
    public readonly grid: GridModel<TRow>,
    private parent?: ColumnModel<TRow>,
  ) {
    this.columns = def.columns?.map((d) => new ColumnModel(def.pin ? { ...d, pin: def.pin } : d, grid, this)) ?? [];

    if (this.isLeaf) {
      // Use stored width if available (survives memo recreation), otherwise use def.width or default
      const storedWidth = this.grid.columnWidths.get(this.key);
      this._inlineWidth = storedWidth ?? this.def.width ?? this.grid.DEFAULT_COLUMN_WIDTH_PX;
      this._pin = pinPositionOf(def.pin);
    }
  }

  public columns: ColumnModel<TRow>[] = [];

  // ========== Kind (replaces scattered `key === *_CELL_KEY` checks) ==========

  public get kind(): ColumnKind {
    switch (this.key) {
      case ROW_NUMBER_CELL_KEY:
        return 'rowNumber';
      case ROW_SELECTION_CELL_KEY:
        return 'rowSelection';
      case ROW_DETAIL_CELL_KEY:
        return 'rowDetail';
      case GROUPING_CELL_KEY:
        return 'grouping';
      default:
        return 'data';
    }
  }

  public get isRowNumber(): boolean {
    return this.kind === 'rowNumber';
  }
  public get isRowSelection(): boolean {
    return this.kind === 'rowSelection';
  }
  public get isRowDetail(): boolean {
    return this.kind === 'rowDetail';
  }
  public get isGrouping(): boolean {
    return this.kind === 'grouping';
  }
  public get isData(): boolean {
    return this.kind === 'data';
  }

  // ========== Precomputed cell layout (stable for the column's lifetime) ==========
  // Pin flags depend only on column order/pinning/visibility — never on width — so they
  // stay valid until `columns` is rebuilt (which produces fresh column instances). The
  // memos have no deps: they just cache lazily per instance.

  public readonly pinFlags = memo(
    () => {
      const isStartPinned = this.pin === 'START';
      const isEndPinned = this.pin === 'END';
      return {
        isStartPinned,
        isEndPinned,
        isPinned: isStartPinned || isEndPinned,
        isFirstStartPinned: isStartPinned && this.startOffset === 0,
        isLastStartPinned: isStartPinned && this.isEdge,
        isFirstEndPinned: isEndPinned && this.isEdge,
        isLastEndPinned: isEndPinned && this.endOffset === 0,
      };
    },
    () => [this.grid.columns],
  );

  /** Variant flags for the body cell that depend only on the column (not the row). */
  public readonly cellVariant = memo(
    () => {
      const { isPinned, isFirstStartPinned, isLastStartPinned, isFirstEndPinned, isLastEndPinned } = this.pinFlags.value;
      return {
        isPinned,
        isFirstStartPinned,
        isLastStartPinned,
        isFirstEndPinned,
        isLastEndPinned,
        isRowSelection: this.isRowSelection,
        isRowNumber: this.isRowNumber,
        isFirstLeaf: this.isFirstLeaf,
        isLastLeaf: this.isLastLeaf,
        isRowDetail: this.isRowDetail,
      };
    },
    () => [this.pinFlags],
  );

  /** Static CSS-var references for the body/filter cell (stable string identity). */
  public readonly cellStyleVars = memo(
    () => {
      const { isStartPinned, isEndPinned } = this.pinFlags.value;
      return {
        width: `var(${this.widthVarName})`,
        height: `var(${this.grid.rowHeightVarName})`,
        insetInlineStart: isStartPinned ? `var(${this.inlineStartVarName})` : undefined,
        insetInlineEnd: isEndPinned ? `var(${this.inlineEndVarName})` : undefined,
      };
    },
    () => [this.pinFlags],
  );

  /** Derived state for this column's header cell + context menu. */
  private readonly _headerCell = memo(() => new HeaderCellModel(this));
  public get headerCell(): HeaderCellModel<TRow> {
    return this._headerCell.value;
  }

  public get visibleColumns() {
    return this.columns.filter((c) => c.isVisible);
  }

  public get isFirstLeaf() {
    const { leafs } = this;

    return leafs.length > 0 && leafs.at(0) === this;
  }

  public get isLastLeaf() {
    const { leafs } = this;

    return leafs.length > 0 && leafs.at(-1) === this;
  }

  public get key() {
    return this.def.key;
  }
  public get header() {
    return this.def.header;
  }
  public get align() {
    return this.def.align;
  }
  /** End-aligned either way it is spelled — `right` is the physical name of `end` in a left-to-right grid. */
  public get isEndAligned(): boolean {
    return this.align === 'end' || this.align === 'right';
  }

  /** Whether an explicit `align` was provided (mirrors the original `'align' in def` check). */
  public get hasAlign(): boolean {
    return 'align' in this.def;
  }
  public get isLeaf() {
    return this.columns.length === 0;
  }
  public get Cell() {
    return this.def.Cell;
  }
  /** This column's aggregation, if it has one — the thing that decides it appears on a group row at all. */
  public get aggregate(): ColumnAggregate<TRow> | undefined {
    return this.def.aggregate;
  }
  public get AggregateCell() {
    return this.def.AggregateCell;
  }
  public get filterable() {
    return this.def.filterable;
  }

  // ========== Column filtering (resolves config + parses/validates input) ==========

  /** Resolved filter config, or undefined when this column isn't filterable. */
  public get filterConfig(): ColumnFilterConfig | undefined {
    const { filterable } = this.def;
    if (!filterable) return undefined;
    return typeof filterable === 'object' ? filterable : { type: 'text' };
  }

  /** The active filter on this column, if any. */
  public get currentFilter(): FilterValue | undefined {
    return this.grid.columnFilters[this.key as keyof TRow];
  }

  /** Options for a multiselect filter (config-provided, else unique values from data). */
  public get filterOptions(): { label: string; value: string | number | boolean | null }[] {
    const config = this.filterConfig;
    if (config?.type === 'multiselect' && config.options) return config.options;

    return this.grid.getColumnUniqueValues(this.key).map((value) => ({
      label: value === null ? '(empty)' : String(value),
      value,
    }));
  }

  public setTextFilter(value: string): void {
    this.grid.setColumnFilter(this.key, value.trim() ? { type: 'text', value } : undefined);
  }

  public setNumberFilter(operator: NumberFilterValue['operator'], value: string | number, valueTo?: string | number): void {
    const numVal = typeof value === 'number' ? value : parseFloat(value);
    if (isNaN(numVal) || value === '') {
      this.grid.setColumnFilter(this.key, undefined);
      return;
    }

    const filter: NumberFilterValue = { type: 'number', operator, value: numVal };

    if (operator === 'between' && valueTo !== undefined && valueTo !== '') {
      const numValTo = typeof valueTo === 'number' ? valueTo : parseFloat(String(valueTo));
      if (!isNaN(numValTo)) filter.valueTo = numValTo;
    }

    this.grid.setColumnFilter(this.key, filter);
  }

  public setMultiselectFilter(values: (string | number | boolean | null)[]): void {
    this.grid.setColumnFilter(this.key, values.length === 0 ? undefined : { type: 'multiselect', values });
  }

  public clearFilter(): void {
    this.grid.setColumnFilter(this.key, undefined);
  }

  /** Whether sorting is enabled for this column. Column-level setting takes priority over grid-level. */
  public get sortable(): boolean {
    if (this.def.sortable !== undefined) {
      return this.def.sortable;
    }
    return this.grid.props.def.sortable !== false;
  }

  /** Whether resizing is enabled for this column. Column-level setting takes priority over grid-level. */
  public get resizable(): boolean {
    if (this.def.resizable !== undefined) {
      return this.def.resizable;
    }
    return this.grid.props.def.resizable !== false;
  }

  /** Resolved context menu configuration. Column-level takes priority over grid-level. Default: true. */
  public get contextMenu(): boolean | ContextMenuConfig {
    if (this.def.contextMenu !== undefined) {
      return this.def.contextMenu;
    }
    return this.grid.props.def.contextMenu ?? true;
  }

  /** Whether the context menu button should be shown at all. */
  public get showContextMenu(): boolean {
    const config = this.contextMenu;
    if (typeof config === 'boolean') return config;
    return config.sort !== false || config.pin !== false || config.group !== false;
  }

  /** Resolved context menu sections visibility. */
  public get contextMenuSections(): { sort: boolean; pin: boolean; group: boolean } {
    const config = this.contextMenu;
    // Grouping reads the rows the browser holds, and with a datasource that is the blocks in play rather
    // than the table — so it would group whatever happened to be fetched. Offered only where the server
    // answers a group level itself, which is what `dataSource.grouping` declares.
    const group = !this.grid.source.enabled || this.grid.source.canGroup;

    if (typeof config === 'boolean') {
      return { sort: config, pin: config, group: config && group };
    }
    return {
      sort: config.sort !== false,
      pin: config.pin !== false,
      group: group && config.group !== false,
    };
  }

  /** Whether column participates in flex distribution. Default true unless explicitly false. */
  public get isFlexible(): boolean {
    return this.def.flexible !== false;
  }

  /** The base width before flex calculation (what user set or DEFAULT). */
  public get baseWidth(): number {
    return this._inlineWidth ?? this.grid.DEFAULT_COLUMN_WIDTH_PX;
  }

  private _pin?: PinPosition;
  public get pin(): PinPosition | undefined {
    if (this.isLeaf) return this._pin;

    const pins = [...new Set(this.columns.flatMap((c) => c.pin))];

    if (pins.length === 1) return pins[0];
  }

  public get uniqueKey(): string {
    return `${this.key}${this.pin ?? ''}`;
  }

  public getPinnedColumn(pin?: PinPosition): ColumnModel<TRow> | undefined {
    if (this.hasPin(pin)) {
      if (this.isLeaf) return this;

      const parent = new ColumnModel({ ...this.def, pin: pin }, this.grid, this.parent);

      parent.columns = this.columns
        .filter((c) => c.hasPin(pin))
        .map((c) => {
          const pinColumn = c.getPinnedColumn(pin);
          pinColumn!.parent = parent;
          return pinColumn;
        })
        .filter((c) => !!c);

      return parent;
    }
  }

  private hasPin(pin?: PinPosition): boolean {
    return this.isLeaf ? this._pin === pin : this.columns.some((c) => c.hasPin(pin));
  }

  public get death(): number {
    return this.parent ? this.parent.death + 1 : 0;
  }

  public get flatColumns(): ColumnModel<TRow>[] {
    const cols = [this] as ColumnModel<TRow>[];

    cols.push(...this.columns.flatMap((c) => c.flatColumns));

    return cols;
  }

  private _inlineWidth?: number;
  public get inlineWidth(): number | undefined {
    if (this.isLeaf) {
      // Use flex-calculated width if available, otherwise use base width
      const flexWidth = this.grid.getFlexWidth(this.key);
      return flexWidth ?? this._inlineWidth;
    }

    const sizes = this.visibleColumns.map((c) => c.inlineWidth).filter((width) => typeof width === 'number');

    if (sizes.length === 0) return undefined;

    return ArrayUtils.sumBy(sizes, (s) => s);
  }

  public get startOffset() {
    let sum = 0;

    if (this.parent) {
      const { visibleColumns, startOffset: parentStart } = this.parent;

      const colIndex = visibleColumns.findIndex((c) => c === this);
      sum += ArrayUtils.sumBy(visibleColumns, (c, index) => (index < colIndex ? (c.inlineWidth ?? 0) : 0));

      sum += parentStart;
    } else {
      const startColumns = this.grid.columns.value.start.filter((c) => c.isVisible);

      const colIndex = startColumns.findIndex((c) => c === this);
      sum += ArrayUtils.sumBy(startColumns, (c, index) => (index < colIndex ? (c.inlineWidth ?? 0) : 0));
    }

    return sum;
  }

  public get endOffset() {
    let sum = 0;

    if (this.parent) {
      const { visibleColumns } = this.parent;
      const reverse = visibleColumns.reverse();
      const colIndex = reverse.findIndex((c) => c === this);
      sum += ArrayUtils.sumBy(reverse, (c, index) => (index < colIndex ? (c.inlineWidth ?? 0) : 0));

      sum += this.parent.endOffset;
    } else {
      const endColumns = this.grid.columns.value.end.filter((c) => c.isVisible);

      const reverse = endColumns.reverse();
      const colIndex = reverse.findIndex((c) => c === this);
      sum += ArrayUtils.sumBy(reverse, (c, index) => (index < colIndex ? (c.inlineWidth ?? 0) : 0));
    }

    return sum;
  }

  public get isEdge(): boolean {
    if (!this.pin) return false;

    if (this.parent) {
      const { visibleColumns } = this.parent;
      const item = (this.pin === 'START' ? visibleColumns.at(-1) : visibleColumns.at(0)) as ColumnModel<TRow>;
      return item === this && this.parent.isEdge;
    }

    const item = (
      this.pin === 'START'
        ? this.grid.columns.value.start.filter((x) => x.isVisible).at(-1)
        : this.grid.columns.value.end.filter((x) => x.isVisible).at(0)
    ) as ColumnModel<TRow>;
    return item === this;
  }

  public get isVisible(): boolean {
    if (this.isLeaf) return !this.grid.hiddenColumns.has(this.key);

    return this.leafs.some((l) => l.isVisible);
  }

  // Approved

  public get leafs(): ColumnModel<TRow>[] {
    if (this.isLeaf) return [this];

    return this.visibleColumns.flatMap((c) => c.leafs);
  }

  public get groupColumnWidthVarName(): string {
    return `--${this.uniqueKey}-group-width`;
  }
  public get widthVarName(): string {
    return `--${this.uniqueKey}-width`;
  }
  public get inlineStartVarName() {
    return `--${this.uniqueKey}-inline-start`;
  }
  public get inlineEndVarName() {
    return `--${this.uniqueKey}-inline-end`;
  }

  public get gridRows() {
    return this.isLeaf ? this.grid.columns.value.maxDeath - this.death : 1;
  }

  // ========== Resize (headless: pure coordinate math, DOM events live in the adapter) ==========

  private _resizeStartX = 0;
  private _resizeSizes: Record<Key, number> = {};
  private _resizeTotalWidth = 0;

  /** Begin a resize drag from a pointer x-coordinate (page space). */
  public beginResize = (startX: number): void => {
    const { MIN_COLUMN_WIDTH_PX } = this.grid;

    this._resizeStartX = startX;
    // Capture current visual widths (includes flex-calculated width) as starting point.
    this._resizeSizes = ArrayUtils.toRecord(this.leafs, (leaf) => [leaf.key, leaf.inlineWidth ?? leaf.baseWidth]);
    this._resizeTotalWidth = ArrayUtils.sumBy(this.leafs, (c) => this._resizeSizes[c.key]) - this.leafs.length * MIN_COLUMN_WIDTH_PX;
  };

  /**
   * A pointer moves in screen coordinates and a column grows along the inline axis, so turning one into
   * the other takes both facts: which edge the separator sits on, and which way the reading runs. The two
   * flips compose — an end-pinned column in a right-to-left grid resizes the way an unpinned one does.
   */
  private get resizeSign(): 1 | -1 {
    const flipped = (this.pin === 'END') !== this.grid.isRtl;

    return flipped ? -1 : 1;
  }

  /**
   * Apply the drag to a new pointer x-coordinate, distributing the delta across leafs.
   * Does NOT notify — the caller decides how to reflect the change (the React adapter
   * writes the resulting width CSS variables straight to the DOM for a 60fps drag).
   */
  public applyResize = (currentX: number): void => {
    const { MIN_COLUMN_WIDTH_PX } = this.grid;
    const dragDistance = (currentX - this._resizeStartX) * this.resizeSign;

    this.leafs.forEach((leaf) => {
      const width = this._resizeSizes[leaf.key];
      const dragDistanceForCell =
        this._resizeTotalWidth > 0
          ? ((width - MIN_COLUMN_WIDTH_PX) / this._resizeTotalWidth) * dragDistance
          : dragDistance / this.leafs.length;
      const newWidth = Math.round(width + dragDistanceForCell);

      leaf.setWidth(newWidth < MIN_COLUMN_WIDTH_PX ? MIN_COLUMN_WIDTH_PX : newWidth);
    });

    this.grid.flexWidths.clear(); // cascades to sizes
  };

  /** Apply the drag and notify subscribers (headless API for non-DOM hosts). */
  public resizeTo = (currentX: number): void => {
    this.applyResize(currentX);
    this.grid.notify();
  };

  /** End a resize drag. */
  public endResize = (): void => {
    this.grid.notify();
  };

  /**
   * Move the resize separator `delta` pixels right — one step of a keyboard resize, from the widths as they
   * are, so pressing again carries on. Rightwards widens a column whose separator is on its right edge and
   * narrows a right-pinned one, as dragging does. Does **not** notify: a held arrow repeats thirty times a
   * second, so the caller paints the widths and calls `endResize()` when the gesture ends.
   */
  public moveResizer = (delta: number): void => {
    this.beginResize(0);
    this.applyResize(delta);
  };

  /** Resize to an exact total width — where Home and End on the separator land. Does not notify. */
  public resizeWidthTo = (width: number): void => {
    const current = this.inlineWidth ?? this.baseWidth;

    this.moveResizer((width - current) * this.resizeSign);
  };

  public pinColumn = (pin?: PinPositionInput) => {
    if (this.isLeaf) {
      this._pin = pinPositionOf(pin);
    } else {
      this.columns.forEach((c) => c.pinColumn(pin));
    }

    this.grid.pinColumn(this.uniqueKey, pin);
  };

  public toggleGrouping = () => {
    this.grid.toggleGrouping(this.key);
  };

  public sortColumn: (sortDirection?: SortDirection) => void = (...args: [SortDirection | undefined]) => {
    this.grid.setSortColumn(this.key, ...args);
  };

  public setWidth = (width: number) => {
    if (!this.isLeaf) {
      throw new Error('Cannot set width for a parent column.');
    }

    if (this._inlineWidth === width) return;

    this._inlineWidth = width;
    this.grid.setWidth(this.key, width);
  };

  public toggleVisibility = () => {
    this.grid.toggleColumnVisibility(this.key);
  };
}
