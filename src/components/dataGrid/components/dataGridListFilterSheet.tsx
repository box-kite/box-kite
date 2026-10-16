import Box from '../../../box';
import FilterIcon from '../../../icons/filterIcon';
import Button from '../../button';
import Flex from '../../flex';
import { H3 } from '../../semantics';
import GridModel from '../models/gridModel';
import DataGridListFilter from './dataGridListFilter';
import DataGridListLayout from './dataGridListLayout';
import DataGridListSheet from './dataGridListSheet';

interface Props<TRow> {
  grid: GridModel<TRow>;
}

/**
 * The Filters button and the sheet it opens: every filterable column, one section each. A filter applies as
 * it is set, so the list behind the sheet is already the answer, and the main button says how many rows that
 * is — "Show 42 rows" tells a reader what closing the sheet will show before they close it.
 */
export default function DataGridListFilterSheet<TRow>(props: Props<TRow>) {
  const { grid } = props;
  const { list } = grid;
  const name = grid.componentName;
  const text = grid.localeText;
  const count = list.activeFilters.length;
  const columns = list.filterableColumns;

  if (columns.length === 0) return null;

  return (
    <DataGridListSheet
      grid={grid}
      open={list.sheet === 'filter'}
      onOpen={() => list.openSheet('filter')}
      onClose={() => list.openSheet(null)}
      title={text.filters}
      trigger={({ ref, props: { onClick, ...attributes } }) => (
        <Button
          type="button"
          component={`${name}.list.toolbar.button` as never}
          variant={{ active: count > 0 } as never}
          {...DataGridListLayout.PILL}
          ref={ref}
          onClick={onClick}
          props={{ ...attributes, 'aria-label': text.filtersLabel(count) }}
        >
          <FilterIcon />
          {text.filters}
          {count > 0 && (
            <Box
              tag="span"
              minWidth={5}
              height={5}
              px={1.5}
              borderRadius={999}
              bgColor="indigo-600"
              color="white"
              fontSize={12}
              fontWeight={600}
              lineHeight={20}
              textAlign="center"
              props={{ 'aria-hidden': true }}
            >
              {count}
            </Box>
          )}
        </Button>
      )}
      footer={
        <>
          {count > 0 && (
            <Button
              type="button"
              component={`${name}.list.sheet.button` as never}
              {...DataGridListLayout.SHEET_BUTTON}
              onClick={grid.clearColumnFilters}
            >
              {text.clearFilters}
            </Button>
          )}
          <Button
            type="button"
            component={`${name}.list.sheet.primary` as never}
            {...DataGridListLayout.SHEET_BUTTON}
            flex1
            fontWeight={600}
            onClick={() => list.openSheet(null)}
          >
            {text.showRows(grid.filterStats.filtered)}
          </Button>
        </>
      }
    >
      {columns.map((column) => (
        <Flex key={column.key} component={`${name}.list.sheet.line` as never} d="column" gap={2} py={3} bb={1}>
          <H3 m={0} fontSize={14} fontWeight={600}>
            {column.header ?? String(column.key)}
          </H3>
          <DataGridListFilter column={column} />
        </Flex>
      ))}
    </DataGridListSheet>
  );
}

(DataGridListFilterSheet as React.FunctionComponent).displayName = 'DataGridListFilterSheet';
