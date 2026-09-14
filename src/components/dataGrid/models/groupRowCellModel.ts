import memo from '../../../utils/memo';
import AggregateCellModel from './aggregateCellModel';
import ColumnModel from './columnModel';
import GridModel from './gridModel';
import GroupRowModel from './groupRowModel';

/**
 * How a cell participates in a group row's layout: `grouping` is the expand/label cell spanning the
 * grouped columns, `selection` the select-all cell, `aggregate` a column totalling the rows under the group,
 * `spacer` a pinned or leading cell with its own value, and `hidden` a data column absorbed into the
 * grouping cell's span.
 */
export type GroupRowCellKind = 'grouping' | 'selection' | 'aggregate' | 'spacer' | 'hidden';

export default class GroupRowCellModel<TRow> {
  constructor(
    public readonly grid: GridModel<TRow>,
    public readonly row: GroupRowModel<TRow>,
    public readonly column: ColumnModel<TRow>,
  ) {}

  public get value(): string | number | null {
    if (this.column.isRowNumber) return this.row.rowIndex + 1;
    if (this.column.isGrouping) return `${this.row.groupValue} (${this.row.count})`;

    return null;
  }

  // Group cells never participate in the expanded-leaf variant, so positional flags are constant.
  public get isExpanded(): boolean {
    return false;
  }

  public get isFirst(): boolean {
    return false;
  }

  public get isLast(): boolean {
    return false;
  }

  public get cellKind(): GroupRowCellKind {
    if (this.column.isGrouping) return 'grouping';
    if (this.column.isRowSelection) return 'selection';
    // The span is asked first: a column the label covers has no cell to put an aggregate in.
    if (this.row.spans(this.column)) return 'hidden';
    if (this.column.aggregate) return 'aggregate';

    return 'spacer';
  }

  /** The aggregate over the rows under this group, on the columns that have one. */
  private readonly _aggregate = memo(() =>
    this.column.aggregate
      ? new AggregateCellModel(
          this.grid,
          this.column,
          this.row.allRows.map((r) => r.data),
          'group',
        )
      : null,
  );
  public get aggregate(): AggregateCellModel<TRow> | null {
    return this._aggregate.value;
  }

  // ========== Grouping-cell layout ==========

  public get depthPadding(): number {
    return 4 * this.row.depth;
  }

  public get gridColumnSpan(): number {
    return this.row.groupingColumnGridColumn;
  }

  public get widthVar(): string {
    return `var(${this.column.groupColumnWidthVarName})`;
  }

  public get isEndPinned(): boolean {
    return this.column.pin === 'END';
  }

  /** Grouping cell shows a right border only when the grouping column is left-pinned. */
  public get hasGroupingBorder(): boolean {
    return this.row.groupingColumn.pin === 'START';
  }
}
