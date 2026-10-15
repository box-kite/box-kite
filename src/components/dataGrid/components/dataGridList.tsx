import { useEffect } from 'react';
import Box from '../../../box';
import Flex from '../../flex';
import { Ul } from '../../semantics';
import GridModel from '../models/gridModel';
import DataGridDataSourceError from './dataGridDataSourceError';
import DataGridListFooter from './dataGridListFooter';
import DataGridListGroup from './dataGridListGroup';
import DataGridListItem from './dataGridListItem';
import DataGridListRecord from './dataGridListRecord';
import DataGridListSelectionBar from './dataGridListSelectionBar';
import DataGridListToolbar from './dataGridListToolbar';
import DataGridLoader from './dataGridLoader';

interface Props<TRow> {
  grid: GridModel<TRow>;
}

/**
 * The grid drawn for a phone. A `<ul>` of items rather than a restyled `role="grid"`: a grid promises the
 * arrow-key movement of a two-dimensional widget, and a list of items with a button in each is a list — so
 * every value keeps its label in a `<dl>`, and each item says where it is in the whole with
 * `aria-posinset`/`aria-setsize`.
 */
export default function DataGridList<TRow>(props: Props<TRow>) {
  const { grid } = props;
  const { list, source } = grid;
  const name = grid.componentName;
  const items = list.visibleItems;
  const loading = grid.props.loading || source.isLoading;

  // Groups and a tree make "item 4 of 40" a different question, so only a flat list counts its items.
  const flat = grid.groupColumns.size === 0 && !grid.tree.enabled;
  const total = source.enabled ? grid.totalRowCount : grid.filterStats.filtered;

  // A datasource answers the rows drawn, the way the table's viewport asks for the rows on screen.
  const { queryVersion } = source;
  useEffect(() => {
    if (source.enabled) source.request(0, Math.max(items.length, 1));
  }, [source, queryVersion, items.length, grid.page, grid.pageSize, grid.expansionVersion]);

  return (
    <Flex component={`${name}.list` as never} d="column">
      <DataGridListToolbar grid={grid} />
      <DataGridDataSourceError grid={grid} />
      {loading && <DataGridLoader grid={grid} />}

      {items.length === 0 ? (
        <Box component={`${name}.list.item.muted` as never} px={4} py={10} textAlign="center">
          {grid.props.def.noDataComponent ?? (loading ? grid.localeText.loadingRows : grid.localeText.noRows)}
        </Box>
      ) : (
        <Ul
          m={0}
          p={0}
          css={{ listStyle: 'none' }}
          props={{ 'aria-labelledby': grid.props.def.title ? grid.titleId : undefined, 'aria-busy': loading || undefined }}
        >
          {items.map(({ row, index }, position) =>
            row.kind === 'group' ? (
              <DataGridListGroup key={row.key} row={row} version={grid.rowVersion(row, index)} />
            ) : (
              <DataGridListItem
                key={row.key}
                row={row}
                index={index}
                position={flat ? position + 1 : undefined}
                setSize={flat ? total : undefined}
                version={grid.rowVersion(row, index)}
              />
            ),
          )}
        </Ul>
      )}

      <DataGridListFooter grid={grid} shown={flat ? items.length : undefined} />
      <DataGridListSelectionBar grid={grid} />
      <DataGridListRecord grid={grid} />
    </Flex>
  );
}

(DataGridList as React.FunctionComponent).displayName = 'DataGridList';
