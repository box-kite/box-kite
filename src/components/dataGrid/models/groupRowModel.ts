import ArrayUtils from '../../../utils/array/arrayUtils';
import memo from '../../../utils/memo';
import { Key } from '../contracts/dataGridContract';
import ColumnModel from './columnModel';
import DetailRowModel from './detailRowModel';
import GridModel, { GROUPING_CELL_KEY } from './gridModel';
import GroupRowCellModel from './groupRowCellModel';
import RowModel from './rowModel';

export default class GroupRowModel<TRow> {
  constructor(
    public readonly grid: GridModel<TRow>,
    public readonly groupColumn: ColumnModel<TRow>,
    public readonly rows: RowModel<TRow>[] | GroupRowModel<TRow>[],
    public readonly rowIndex: number,
    public readonly groupValue: Key,
  ) {
    rows.forEach((row) => (row.parentRow = this));
  }

  public get key(): Key {
    return `${this.parentRow?.key ?? ''}${this.groupColumn.key}${this.groupValue}`;
  }
  public parentRow?: GroupRowModel<TRow>;

  private readonly _cells = memo(() => this.grid.columns.value.visibleLeafs.map((c) => new GroupRowCellModel<TRow>(this.grid, this, c)));
  public get cells(): GroupRowCellModel<TRow>[] {
    return this._cells.value;
  }

  /**
   * The cells this row actually renders, each with the column it starts at. A `hidden` cell is a
   * data column the grouping cell has absorbed into its span: no element, and nothing to navigate
   * to — which is why a group row's cell positions and its `aria-colindex` values differ.
   */
  private readonly _renderedCells = memo(() => {
    const rendered: { cell: GroupRowCellModel<TRow>; columnIndex: number }[] = [];

    this.cells.forEach((cell, columnIndex) => {
      if (cell.cellKind !== 'hidden') rendered.push({ cell, columnIndex });
    });

    return rendered;
  });
  public get renderedCells(): { cell: GroupRowCellModel<TRow>; columnIndex: number }[] {
    return this._renderedCells.value;
  }

  /** Fewer than the column count — the width the grid navigation sees for this row. */
  public get cellCount(): number {
    return this.renderedCells.length;
  }

  /**
   * Where a cell starts in column-index space. The cells the grouping cell spans are not rendered
   * at all, so an ordinal here is short of its column by however many of them came before it.
   */
  public columnOf(cell: number): number {
    return this.renderedCells[cell]?.columnIndex ?? cell;
  }

  public get selected() {
    return this.allRows.every((r) => r.selected);
  }

  public get indeterminate() {
    return !this.selected && this.allRows.some((r) => r.selected);
  }

  public get expanded() {
    return this.grid.expandedGroupRow.has(this.key);
  }

  public get depth(): number {
    return this.parentRow ? this.parentRow.depth + 1 : 0;
  }

  public get count(): number {
    return ArrayUtils.sumBy<RowModel<TRow> | GroupRowModel<TRow>>(this.rows, (row) => row.count, 0);
  }

  public get flatRows(): (RowModel<TRow> | GroupRowModel<TRow> | DetailRowModel<TRow>)[] {
    if (this.expanded) {
      return [this, ...this.rows.flatMap((row) => row.flatRows as (RowModel<TRow> | GroupRowModel<TRow> | DetailRowModel<TRow>)[])];
    }

    return [this];
  }

  public get allRows(): RowModel<TRow>[] {
    return this.rows.flatMap((row) => row.allRows);
  }

  public get groupingColumn() {
    return ArrayUtils.findOrThrow(this.grid.columns.value.leafs, (c) => c.key === GROUPING_CELL_KEY);
  }

  public get groupingColumnGridColumn() {
    return this.grid.groupingSpan.value.length;
  }

  /** Whether the label cell has swallowed this column, which is what leaves it with no cell of its own. */
  public spans(column: ColumnModel<TRow>): boolean {
    return !column.isGrouping && this.grid.groupingSpan.value.includes(column);
  }

  public readonly kind = 'group' as const;

  public toggleRow() {
    this.grid.toggleGroupRow(this.key);
  }

  /** Select/deselect every leaf row under this group. */
  public toggleSelectAll = (): void => {
    this.grid.toggleRowsSelection(this.allRows.map((r) => r.key));
  };
}
