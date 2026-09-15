import ColumnModel from './columnModel';
import GridModel from './gridModel';
import RowModel from './rowModel';

export default class CellModel<TRow> {
  constructor(
    public readonly grid: GridModel<TRow>,
    public readonly row: RowModel<TRow>,
    public readonly column: ColumnModel<TRow>,
  ) {}

  public get value() {
    if (this.column.isRowNumber) return this.row.rowIndex + 1;

    return this.row.data[this.column.key as keyof TRow];
  }

  public get isExpanded(): boolean {
    return this.row.expanded;
  }

  public get selected(): boolean {
    return this.row.selected;
  }

  public get isFirst(): boolean {
    return this.row.cells[0] === this;
  }

  public get isLast(): boolean {
    const cells = this.row.cells;
    return cells[cells.length - 1] === this;
  }

  /** Toggle this row's detail panel (used by the row-detail expand cell). */
  public toggleDetail = (): void => {
    this.grid.toggleDetailRow(this.row.key);
  };

  /** Whether the row is half-selected — a tree row whose subtree is partly ticked. */
  public get indeterminate(): boolean {
    return this.row.indeterminate;
  }

  /** Toggle this row's selection (used by the row-selection checkbox cell). The row owns what that means. */
  public toggleSelection = (): void => {
    this.row.toggleSelection();
  };
}
