import ArrayUtils from '../../../utils/array/arrayUtils';
import type { SortDirection } from '../contracts/dataGridContract';
import type ColumnModel from './columnModel';
import type GridModel from './gridModel';

/**
 * The ceiling the resizer offers before anything has measured the grid — a server render, a test,
 * the first paint. A number rather than the columns' own widths so that `aria-valuemax` holds
 * still while the column it belongs to is being resized.
 */
const UNMEASURED_MAX_WIDTH_PX = 1000;

/** All derived state for rendering a column's header cell and its context menu. */
export default class HeaderCellModel<TRow> {
  constructor(public readonly column: ColumnModel<TRow>) {}

  private get grid(): GridModel<TRow> {
    return this.column.grid;
  }

  // ========== Header cell ==========

  /** Header label. `null` for the row-number and selection cells (rendered specially). */
  public get label(): string | number | null {
    const c = this.column;
    if (c.isRowNumber || c.isRowSelection) return null;

    if (c.isGrouping) {
      if (this.grid.groupColumns.size === 1) {
        const groupedKey = this.grid.groupColumns.values().next().value!;
        const col = ArrayUtils.findOrThrow(this.grid.columns.value.leafs, (l) => l.key === groupedKey);
        return col.header ?? col.key;
      }
      return this.grid.localeText.groupHeader;
    }

    return c.header ?? c.key;
  }

  /**
   * A name for a header that draws nothing. The row-number and row-detail columns are blank on
   * screen by design, and a blank column header leaves every cell under it unlabelled — which is
   * the one thing a screen reader relies on when it reads a cell out.
   */
  public get hiddenLabel(): string | undefined {
    if (this.column.isRowNumber) return this.grid.localeText.rowNumberHeader;
    if (this.column.isRowDetail) return this.grid.localeText.rowDetailHeader;

    return undefined;
  }

  public get isSortable(): boolean {
    const c = this.column;
    return c.isLeaf && !c.isRowNumber && !c.isRowSelection && !c.isRowDetail && c.sortable;
  }

  /** Whether the cell paints its own hover pill: under `'sliding'` the header draws one for every cell. */
  public get hasHoverPill(): boolean {
    return this.isSortable && this.grid.headerHover === 'static';
  }

  public get isSorted(): boolean {
    return this.column.key === this.grid.sortColumn;
  }

  public get sortDirection(): SortDirection | undefined {
    return this.grid.sortDirection;
  }

  public get showResizer(): boolean {
    const c = this.column;
    return !c.isRowNumber && !c.isRowSelection && !c.isRowDetail && c.resizable;
  }

  public get showContextMenu(): boolean {
    const c = this.column;
    return !c.isRowNumber && !c.isRowSelection && !c.isRowDetail && c.showContextMenu;
  }

  /** Grid column span: a leaf occupies one column, a group header spans its leaf count. */
  public get gridColumn(): number {
    return this.column.isLeaf ? 1 : this.column.leafs.length;
  }

  // ========== Position in the grid, for ARIA ==========

  /** 1-based `aria-colindex`: the first column this header covers. */
  public get columnIndex(): number {
    const first = this.column.leafs[0] ?? this.column;

    return this.grid.columns.value.visibleLeafs.indexOf(first) + 1;
  }

  /** `aria-colspan`, left off when the header covers a single column. */
  public get columnSpan(): number | undefined {
    const span = this.column.leafs.length;

    return span > 1 ? span : undefined;
  }

  /** `aria-rowspan`: a leaf declared above the deepest level reaches down to the bottom row. */
  public get rowSpan(): number | undefined {
    const span = this.column.gridRows;

    return span > 1 ? span : undefined;
  }

  /**
   * `aria-sort`. A sortable column that is not the sorted one still carries `none`: that is what
   * tells a screen reader the column *can* be sorted, and leaving it off says the opposite.
   */
  public get ariaSort(): 'ascending' | 'descending' | 'none' | undefined {
    if (!this.isSortable) return undefined;
    if (!this.isSorted || !this.sortDirection) return 'none';

    return this.sortDirection === 'ASC' ? 'ascending' : 'descending';
  }

  // ========== The resizer, as APG's window splitter ==========

  /** What the resizer names itself. A separator carries no text, so it has nothing else to go on. */
  public get resizerLabel(): string {
    return this.grid.localeText.resizeColumn(String(this.label ?? this.column.key));
  }

  /** `aria-valuenow`: how wide the column is right now, in px. */
  public get width(): number {
    return this.column.inlineWidth ?? this.column.baseWidth;
  }

  /** `aria-valuemin`: every leaf the header covers at the narrowest the grid allows. */
  public get minWidth(): number {
    return Math.max(1, this.column.leafs.length) * this.grid.MIN_COLUMN_WIDTH_PX;
  }

  /**
   * `aria-valuemax`. There is no width the grid refuses — a drag can take a column past the
   * viewport and scroll to it — so the ceiling the keyboard offers is the grid's own width, raised
   * to whatever a drag has already made it so that `aria-valuenow` stays inside the range.
   */
  public get maxWidth(): number {
    return Math.max(this.grid.containerWidth || UNMEASURED_MAX_WIDTH_PX, this.width, this.minWidth);
  }

  /** Room for the sort icon, which sits where the reading ends — so an end-aligned header needs it in front. */
  public get paddingStart(): number | undefined {
    if (this.column.isRowSelection) return undefined;
    return this.column.isEndAligned ? 10 : 3;
  }

  public get paddingEnd(): number | undefined {
    if (this.column.isRowSelection) return undefined;
    return this.column.align === 'center' ? 3 : undefined;
  }

  /** Variant flags for the header cell. */
  public get variant() {
    const { isPinned, isFirstStartPinned, isLastStartPinned, isFirstEndPinned, isLastEndPinned } = this.column.pinFlags.value;
    return {
      isPinned,
      isFirstStartPinned,
      isLastStartPinned,
      isFirstEndPinned,
      isLastEndPinned,
      isSortable: this.isSortable,
      hasHoverPill: this.hasHoverPill,
      // The resizer's line is the cell's last pixel on its side, so the pill keeps one more there.
      isPillBeforeResizer: this.hasHoverPill && this.showResizer && this.column.pin !== 'END',
      isPillAfterResizer: this.hasHoverPill && this.showResizer && this.column.pin === 'END',
      isRowNumber: this.column.isRowNumber,
      isFirstLeaf: this.column.isFirstLeaf,
      isLastLeaf: this.column.isLastLeaf,
    };
  }

  /** Variant flags for the context-menu trigger button. */
  public get contextMenuButtonVariant() {
    const { isPinned, isFirstStartPinned, isLastStartPinned, isFirstEndPinned, isLastEndPinned } = this.column.pinFlags.value;
    return {
      isPinned,
      isFirstStartPinned,
      isLastStartPinned,
      isFirstEndPinned,
      isLastEndPinned,
      isSortable: this.isSortable,
      isRowNumber: this.column.isRowNumber,
    };
  }

  // ========== Context menu availability ==========

  private get sections() {
    return this.column.contextMenuSections; // { sort, pin, group }
  }

  public get canSortAsc(): boolean {
    const { key } = this.column;
    return (
      this.sections.sort &&
      this.column.isLeaf &&
      this.column.sortable &&
      (this.grid.sortColumn !== key || this.grid.sortDirection === 'DESC')
    );
  }

  public get canSortDesc(): boolean {
    const { key } = this.column;
    return (
      this.sections.sort &&
      this.column.isLeaf &&
      this.column.sortable &&
      (this.grid.sortColumn !== key || this.grid.sortDirection === 'ASC')
    );
  }

  public get canClearSort(): boolean {
    return this.sections.sort && this.column.isLeaf && this.column.sortable && this.grid.sortColumn === this.column.key;
  }

  public get canPinStart(): boolean {
    return this.sections.pin && this.column.pin !== 'START';
  }

  public get canPinEnd(): boolean {
    return this.sections.pin && this.column.pin !== 'END';
  }

  public get canUnpin(): boolean {
    return this.sections.pin && !!this.column.pin;
  }

  public get canGroupBy(): boolean {
    return this.sections.group && this.column.isLeaf && !this.column.isGrouping;
  }

  public get canUnGroupAll(): boolean {
    return this.sections.group && this.column.isLeaf && this.column.isGrouping;
  }

  public get hasSortSection(): boolean {
    return this.canSortAsc || this.canSortDesc || this.canClearSort;
  }

  public get hasPinSection(): boolean {
    return this.canPinStart || this.canPinEnd || this.canUnpin;
  }

  public get hasGroupSection(): boolean {
    return this.canGroupBy || this.canUnGroupAll;
  }
}
