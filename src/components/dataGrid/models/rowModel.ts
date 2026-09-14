import memo from '../../../utils/memo';
import { Key } from '../contracts/dataGridContract';
import CellModel from './cellModel';
import DetailRowModel from './detailRowModel';
import GridModel from './gridModel';
import GroupRowModel from './groupRowModel';

export default class RowModel<TRow> {
  constructor(
    public readonly grid: GridModel<TRow>,
    data: TRow,
    public readonly rowIndex: number,
  ) {
    this._data = data;
  }

  protected _data: TRow;

  /**
   * The row's values. A getter rather than a parameter property so a subclass can read them from
   * somewhere else — `SourceRowModel` reads them out of the block cache, which is what lets a block
   * arriving change what a row shows without a single model being rebuilt.
   */
  public get data(): TRow {
    return this._data;
  }

  private _key?: Key;
  /**
   * Resolved lazily: getRowKey() can call crypto.randomUUID(), so building a model for every
   * row would generate a key for thousands of off-screen rows. Only rows that actually render
   * (or are otherwise inspected) pay the cost. getRowKey itself is idempotent per row.
   */
  public get key(): Key {
    return (this._key ??= this.grid.getRowKey(this.data));
  }
  public parentRow?: GroupRowModel<TRow>;
  public readonly count = 1;
  public readonly kind = 'row' as const;
  /** Whether this is a row the server has not sent yet — see `SourceRowModel`, which answers it live. */
  public get placeholder(): boolean {
    return false;
  }

  /** Whether clicking the row toggles its detail panel. */
  public get expandOnRowClick(): boolean {
    return this.grid.props.def.rowDetail?.expandOnRowClick ?? false;
  }

  public toggleDetail = (): void => {
    this.grid.toggleDetailRow(this.key);
  };

  // Memoized per row instance: rows are rebuilt whenever columns/data/sort/filter change,
  // so cached cells stay valid for the row's lifetime (stops per-render allocation).
  private readonly _cells = memo(() => this.grid.columns.value.visibleLeafs.map((c) => new CellModel<TRow>(this.grid, this, c)));
  public get cells(): CellModel<TRow>[] {
    return this._cells.value;
  }

  /** One cell per visible column — the width the grid navigation sees for this row. */
  public get cellCount(): number {
    return this.cells.length;
  }

  /** Where a cell starts in column-index space: one cell per column, so its own ordinal. */
  public columnOf(cell: number): number {
    return cell;
  }

  public get selected() {
    return this.grid.selectedRows.has(this.key);
  }

  public get expanded() {
    return this.grid.expandedDetailRows.has(this.key);
  }

  public get flatRows(): (RowModel<TRow> | DetailRowModel<TRow>)[] {
    if (this.grid.props.def.rowDetail && this.expanded) {
      return [this, new DetailRowModel(this.grid, this)];
    }

    return [this];
  }

  public get allRows() {
    return this;
  }
}
