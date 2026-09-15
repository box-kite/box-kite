import ArrayUtils from '../../../utils/array/arrayUtils';
import memo from '../../../utils/memo';
import { AggregateValue, Key } from '../contracts/dataGridContract';
import { GROUPING_CELL_KEY } from './cellKeys';
import ColumnModel from './columnModel';
import DetailRowModel from './detailRowModel';
import GridModel from './gridModel';
import GroupRowCellModel from './groupRowCellModel';
import RowModel from './rowModel';

export default class GroupRowModel<TRow> {
  constructor(
    public readonly grid: GridModel<TRow>,
    public readonly groupColumn: ColumnModel<TRow>,
    public readonly rows: RowModel<TRow>[] | GroupRowModel<TRow>[],
    public readonly rowIndex: number,
    groupValue: Key,
  ) {
    this._groupValue = groupValue;
    rows.forEach((row) => (row.parentRow = this));
  }

  protected _groupValue: Key;

  /**
   * The value this group collects. A getter rather than a parameter property so a subclass can read it
   * from somewhere else — a field would shadow the override outright, which is what `useDefineForClassFields`
   * does to a base class's own properties.
   */
  public get groupValue(): Key {
    return this._groupValue;
  }

  /** What the expand cell reads: the value, and how many rows are under it. */
  public get label(): string {
    return `${this.groupValue} (${this.count})`;
  }

  /** Whether the group's rows have arrived at all. Always, until a server answers a level — see `SourceGroupRowModel`. */
  public get placeholder(): boolean {
    return false;
  }

  /** Whether the select-all checkbox is offered: a group can only select the rows the grid holds. */
  public get selectable(): boolean {
    return true;
  }

  /**
   * An aggregate the grid was handed rather than one it works out. Nothing server-side can be totalled in
   * the browser — the rows are not here — so a server group row carries its own totals and this is where
   * they come from; `undefined` means "compute it", which is every client-side group.
   */
  public aggregateValue(_column: ColumnModel<TRow>): AggregateValue | undefined {
    return undefined;
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
    return this.grid.isGroupExpanded(this.key, this.depth);
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
    this.grid.toggleGroupRow(this.key, this.expanded);
  }

  /** Select/deselect every leaf row under this group. */
  public toggleSelectAll = (): void => {
    this.grid.toggleRowsSelection(this.allRows.map((r) => r.key));
  };
}
