import Box from '../../../box';
import Button from '../../button';
import Flex from '../../flex';
import GridModel from '../models/gridModel';
import DataGridBottomBarSelection from './dataGridBottomBarSelection';
import DataGridPagination from './dataGridPagination';

interface Props<TRow> {
  grid: GridModel<TRow>;
}

export default function DataGridBottomBar<TRow>(props: Props<TRow>) {
  const { grid } = props;
  const { pagination, filter } = grid;

  if (pagination.state) {
    const { totalItems, startItem, endItem } = pagination;

    return (
      <Flex component={`${grid.componentName}.bottomBar` as never}>
        <Box component={`${grid.componentName}.bottomBar.info` as never}>
          {grid.localeText.pageRowRange(startItem, endItem, totalItems)}
        </Box>
        {grid.props.def.rowSelection && <DataGridBottomBarSelection grid={grid} />}
        <DataGridPagination grid={grid} />
      </Flex>
    );
  }

  const { filtered, total } = filter.filterStats;

  return (
    <Flex component={`${grid.componentName}.bottomBar` as never}>
      <Box component={`${grid.componentName}.bottomBar.info` as never}>{grid.localeText.rowCount(filtered, total)}</Box>
      {/* Beside the count it resets, and a real button: it changes the view rather than going anywhere,
          and a `div` was a control the keyboard could not reach. */}
      {filter.hasActiveFilters && (
        <Button type="button" component={`${grid.componentName}.bottomBar.clearFilters` as never} onClick={filter.clearAllFilters}>
          <Box tag="span" props={{ 'aria-hidden': true }}>
            ✕
          </Box>
          {grid.localeText.clearFilters}
        </Button>
      )}
      {grid.props.def.rowSelection && <DataGridBottomBarSelection grid={grid} />}
    </Flex>
  );
}
