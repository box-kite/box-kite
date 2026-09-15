import { AggregateValue, Key } from '../contracts/dataGridContract';
import ColumnModel from './columnModel';
import GridModel from './gridModel';
import GroupRowModel from './groupRowModel';
import SourceLevel from './sourceLevel';

/**
 * One group row of a `def.dataSource` grid: a row of a level the server answered with groups rather than
 * data. It reads its value, its count and its totals *through* the block cache, the way `SourceRowModel`
 * reads a leaf row's — so a block arriving fills in fifty group rows with no model rebuilt.
 *
 * Its children are not here and never were: a group holds a level of its own, fetched when somebody opens
 * it. That is what `count` (the server's number) and `allRows` (empty) are both saying, and it is why the
 * select-all checkbox is not offered — a group cannot select rows the browser has never seen.
 */
export default class SourceGroupRowModel<TRow> extends GroupRowModel<TRow> {
  constructor(
    grid: GridModel<TRow>,
    private readonly level: SourceLevel<TRow>,
    groupColumn: ColumnModel<TRow>,
    rowIndex: number,
  ) {
    super(grid, groupColumn, [], rowIndex, '');
  }

  private get row(): TRow | undefined {
    return this.level.rowAt(this.rowIndex);
  }

  /** The row the server sent for this group: its value, and whatever totals came with it. */
  public get data(): TRow | undefined {
    return this.row;
  }

  public override get placeholder(): boolean {
    return this.row === undefined;
  }

  public override get groupValue(): Key {
    const row = this.row;

    return row == null ? '' : (row[this.groupColumn.key as keyof TRow] as Key);
  }

  /** The path that names this group's own level, and the identity the expansion set holds it by. */
  public get groupKeys(): Key[] {
    return [...this.level.groupKeys, this.groupValue];
  }

  /**
   * Keyed by the path rather than by position, so a group stays open while the block under it is dropped
   * and fetched again. A group nobody has yet is keyed by where it sits — `getRowKey` has nothing to read.
   */
  public override get key(): Key {
    return this.placeholder ? `${this.level.placeholderKey}-group-${this.rowIndex}` : groupPathKey(this.groupKeys);
  }

  public override get depth(): number {
    return this.level.depth;
  }

  /** The server's count, or nothing at all — a level it could not count cheaply shows the value alone. */
  public override get count(): number {
    return this.level.groupCountAt(this.rowIndex) ?? 0;
  }

  public override get label(): string {
    if (this.placeholder) return '';
    const count = this.level.groupCountAt(this.rowIndex);

    return count === undefined ? `${this.groupValue}` : `${this.groupValue} (${count})`;
  }

  /** The totals came down with the group row, because the rows they are over are not in the browser. */
  public override aggregateValue(column: ColumnModel<TRow>): AggregateValue | undefined {
    const value = this.row?.[column.key as keyof TRow];

    return typeof value === 'number' || typeof value === 'string' ? value : undefined;
  }

  public override get selectable(): boolean {
    return false;
  }

  public override get selected(): boolean {
    return false;
  }

  public override get indeterminate(): boolean {
    return false;
  }

  public override get expanded(): boolean {
    return !this.placeholder && this.grid.expandedGroupRow.has(this.key);
  }

  /** Nothing under it is in the browser, so nothing under it can be selected or exported. */
  public override get allRows(): never[] {
    return [];
  }

  public override toggleRow(): void {
    if (this.placeholder) return;

    this.grid.toggleGroupRow(this.key);
  }
}

/** The key a group path is held by, in `expandedGroupRow` and in this model. */
export function groupPathKey(groupKeys: Key[]): Key {
  return `rb-group:${SourceLevel.keyOf(groupKeys)}`;
}
