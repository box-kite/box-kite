import Box from '../../../box';
import Grid from '../../grid';
import { useGridNavigationContext } from '../gridNavigationContext';
import GridModel from '../models/gridModel';
import DataGridAggregateValue from './dataGridAggregateValue';
import DataGridCell from './dataGridCell';

interface Props<TRow> {
  grid: GridModel<TRow>;
}

/**
 * The grand totals, pinned under the rows. It is the last child of the body's height-capped wrapper rather
 * than a sibling of the header: `position: sticky` can only pull a box *up* from below, so a footer whose
 * static position is above the scrollport simply scrolls away (measured in Chrome 152).
 */
export default function DataGridFooter<TRow>(props: Props<TRow>) {
  const { grid } = props;
  const { aggregation } = grid;
  const navigation = useGridNavigationContext();

  if (!aggregation.hasFooter) return null;

  const navRow = (navigation?.rowCount ?? 1) - 1;
  const { footerLabelColumn, footerLabel } = aggregation;

  return (
    <Grid
      component={`${grid.componentName}.footer` as never}
      props={{ role: 'rowgroup' }}
      style={{ gridTemplateColumns: grid.gridTemplateColumns.value }}
    >
      <Box display="contents" props={{ role: 'row', 'aria-rowindex': navRow + 1 }}>
        {aggregation.footerCells.value.map((cell, columnIndex) => (
          <DataGridCell key={cell.column.key} cell={cell} row={navRow} columnIndex={columnIndex}>
            {cell.column.aggregate ? (
              <DataGridAggregateValue cell={cell} />
            ) : cell.column === footerLabelColumn ? (
              <Box component={`${grid.componentName}.footer.label` as never} px={3} textWrap="nowrap">
                {footerLabel}
              </Box>
            ) : null}
          </DataGridCell>
        ))}
      </Box>
    </Grid>
  );
}

(DataGridFooter as React.FunctionComponent).displayName = 'DataGridFooter';
