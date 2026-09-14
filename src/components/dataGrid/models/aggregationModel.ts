import memo from '../../../utils/memo';
import { AggregateFn, AggregateName, AggregateValue, ColumnAggregate } from '../contracts/dataGridContract';
import AggregateCellModel from './aggregateCellModel';
import ColumnModel from './columnModel';
import GridModel from './gridModel';

/** The numbers among a column's values. A blank, a string or a NaN is skipped rather than counted as zero. */
function numbersIn(values: unknown[]): number[] {
  return values.filter((value): value is number => typeof value === 'number' && !Number.isNaN(value));
}

const total = (numbers: number[]): number => numbers.reduce((sum, n) => sum + n, 0);

/** Spreading into `Math.min` overruns the argument limit somewhere past 65k values, and this grid holds those. */
const extreme = (numbers: number[], lower: boolean): number => numbers.reduce((best, n) => ((lower ? n < best : n > best) ? n : best));

/**
 * The five built-ins. Each answers `null` rather than `0` when the column holds no number at all — a total of
 * nothing is not zero, and a footer reading `0` over an empty grid is a claim about the data. `avg` rounds to
 * two decimals, because an exact mean is longer than the cell it goes in; `AggregateCell` is the way to any
 * other precision.
 */
const BUILT_IN: Record<AggregateName, AggregateFn<unknown>> = {
  sum: (values) => {
    const numbers = numbersIn(values);
    return numbers.length ? total(numbers) : null;
  },
  avg: (values) => {
    const numbers = numbersIn(values);
    return numbers.length ? Math.round((total(numbers) / numbers.length) * 100) / 100 : null;
  },
  min: (values) => {
    const numbers = numbersIn(values);
    return numbers.length ? extreme(numbers, true) : null;
  },
  max: (values) => {
    const numbers = numbersIn(values);
    return numbers.length ? extreme(numbers, false) : null;
  },
  count: (_values, rows) => rows.length,
};

/** Run a column's aggregation over one scope. An unknown name answers nothing rather than throwing. */
export function aggregate<TRow>(fn: ColumnAggregate<TRow>, values: unknown[], rows: TRow[]): AggregateValue {
  if (typeof fn === 'function') return fn(values, rows);

  return BUILT_IN[fn]?.(values, rows as unknown[]) ?? null;
}

/**
 * Aggregation concern: which columns aggregate, and the footer they add up to. The arithmetic is in the
 * built-ins above and the per-cell part is `AggregateCellModel` — this is what the grid answers once.
 */
export default class AggregationModel<TRow> {
  constructor(public readonly grid: GridModel<TRow>) {}

  /** The visible columns carrying an aggregate, in column order. */
  public get columns(): ColumnModel<TRow>[] {
    return this.grid.columns.value.visibleLeafs.filter((c) => !!c.aggregate);
  }

  /** Whether anything aggregates at all — what decides a group row shows values instead of one wide label. */
  public get hasAggregates(): boolean {
    return this.columns.length > 0;
  }

  /** Whether the footer row is rendered: asked for, and with something to put in it. */
  public get hasFooter(): boolean {
    return !!this.grid.props.def.footer && this.hasAggregates;
  }

  /** What the footer's leading cell says. `footer: { label }` replaces it; an empty label drops it. */
  public get footerLabel(): React.ReactNode {
    const { footer } = this.grid.props.def;

    return typeof footer === 'object' ? footer.label : 'Total';
  }

  /**
   * Which column the label goes in: the first one that holds data and has no aggregate of its own. A number
   * wins its cell, and the row-number, selection and expander columns are too narrow to read a word in.
   */
  public get footerLabelColumn(): ColumnModel<TRow> | undefined {
    return this.grid.columns.value.visibleLeafs.find((c) => (c.isData || c.isGrouping) && !c.aggregate);
  }

  /**
   * One cell per visible column, over every row the filters left — which is the page rather than the table
   * when the server is paginating, since those are the only rows the grid has.
   */
  public readonly footerCells = memo(
    () => this.grid.columns.value.visibleLeafs.map((column) => new AggregateCellModel(this.grid, column, this.grid.filteredData, 'footer')),
    () => [this.grid.rows],
  );
}
