import AggregateCellModel from '../models/aggregateCellModel';

interface Props<TRow> {
  cell: AggregateCellModel<TRow>;
}

/** An aggregate inside a line of text: the column's `AggregateCell` where it has one, the value otherwise. */
export default function DataGridListAggregate<TRow>(props: Props<TRow>) {
  const { cell } = props;
  const { AggregateCell } = cell.column;

  if (AggregateCell) return <AggregateCell cell={cell} />;

  return <>{cell.value ?? '—'}</>;
}

(DataGridListAggregate as React.FunctionComponent).displayName = 'DataGridListAggregate';
