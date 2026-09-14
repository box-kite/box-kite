import { Key } from '../contracts/dataGridContract';
import GridModel from './gridModel';
import RowModel from './rowModel';

/** What a row that has not arrived reads as: no field of it is set, so every cell is empty. */
const NOTHING = {};

/**
 * One row of a `def.dataSource` grid, whether or not the server has answered for it yet. It reads its
 * values *through* the block cache rather than holding them, which is the whole point: a block arriving
 * changes what fifty rows show with no model rebuilt, and the million rows below the viewport cost one
 * proxy each — that is, nothing, until somebody scrolls to one.
 *
 * Its key follows the same rule. A loaded row is keyed by its data, so a selection or an open detail
 * panel survives the block being dropped and fetched again; a row that is still a skeleton is keyed by
 * its position, since `getRowKey` would mint a fresh id on every render and React would remount it.
 */
export default class SourceRowModel<TRow> extends RowModel<TRow> {
  constructor(grid: GridModel<TRow>, rowIndex: number) {
    super(grid, NOTHING as TRow, rowIndex);
  }

  private get row(): TRow | undefined {
    return this.grid.source.rowAt(this.rowIndex);
  }

  public override get data(): TRow {
    return this.row ?? (NOTHING as TRow);
  }

  public override get placeholder(): boolean {
    return this.row === undefined;
  }

  public override get key(): Key {
    const row = this.row;

    return row === undefined ? `rb-placeholder-${this.rowIndex}` : this.grid.getRowKey(row);
  }

  /** Nothing to open and nothing to select: a row nobody has yet is not a row anybody can act on. */
  public override get expandOnRowClick(): boolean {
    return !this.placeholder && super.expandOnRowClick;
  }

  public override get expanded(): boolean {
    return !this.placeholder && super.expanded;
  }

  public override get selected(): boolean {
    return !this.placeholder && super.selected;
  }
}
