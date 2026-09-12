import Box from '../../../box';
import AggregateCellModel from '../models/aggregateCellModel';

interface Props<TRow> {
  cell: AggregateCellModel<TRow>;
}

/**
 * What an aggregated cell draws when the column supplies no `AggregateCell` of its own. The scope picks the
 * style node, so a group row's totals and the footer's are themed apart without two components.
 */
export default function DataGridAggregateValue<TRow>(props: Props<TRow>) {
  const { cell } = props;
  const { column } = cell;

  if (column.AggregateCell) return <column.AggregateCell cell={cell} />;

  const node = cell.scope === 'footer' ? 'footer.cell' : 'body.groupRow.aggregate';

  return (
    <Box component={`${column.grid.componentName}.${node}` as never} px={3} textOverflow="ellipsis" overflow="hidden" textWrap="nowrap">
      {cell.value}
    </Box>
  );
}

(DataGridAggregateValue as React.FunctionComponent).displayName = 'DataGridAggregateValue';
