import memo from '../../../utils/memo';
import { AggregateScope, AggregateValue } from '../contracts/dataGridContract';
import { aggregate } from './aggregationModel';
import ColumnModel from './columnModel';
import GridModel from './gridModel';

/**
 * One aggregated cell: a column, the rows it covered, and the value that came out. The same model backs a
 * group row's aggregate and the footer's, which is why `AggregateCell` is one renderer rather than two.
 */
export default class AggregateCellModel<TRow> {
  constructor(
    public readonly grid: GridModel<TRow>,
    public readonly column: ColumnModel<TRow>,
    public readonly rows: TRow[],
    public readonly scope: AggregateScope,
  ) {}

  /** This column's value from every row in scope, in row order — what a custom aggregation is handed. */
  private readonly _values = memo(() => this.rows.map((row) => row[this.column.key as keyof TRow] as unknown));
  public get values(): unknown[] {
    return this._values.value;
  }

  private readonly _value = memo<AggregateValue>(() => {
    const fn = this.column.aggregate;

    return fn ? aggregate(fn, this.values, this.rows) : null;
  });
  public get value(): AggregateValue {
    return this._value.value;
  }

  // An aggregate belongs to no row, so the body cell's expanded-leaf variant is constant here.
  public get isExpanded(): boolean {
    return false;
  }

  public get isFirst(): boolean {
    return false;
  }

  public get isLast(): boolean {
    return false;
  }
}
