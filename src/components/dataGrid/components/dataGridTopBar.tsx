import Box from '../../../box';
import Flex from '../../flex';
import GridModel from '../models/gridModel';
import DataGridColumnGroups from './dataGridColumnGroups';
import DataGridExport from './dataGridExport';
import DataGridGlobalFilter from './dataGridGlobalFilter';
import DataGridTopBarContextMenu from './dataGridTopBarContextMenu';

interface Props<TRow> {
  grid: GridModel<TRow>;
}

export default function DataGridTopBar<TRow>(props: Props<TRow>) {
  const { grid } = props;
  const { title, topBarContent, globalFilter } = grid.props.def;

  return (
    <Flex component={`${grid.componentName}.topBar` as never} position="relative" d="column" gap={3}>
      {/* Row 1: Title/context menu on the left, search and the export buttons pinned to the right */}
      <Flex ai="center" jc="space-between" gap={4} flexWrap="wrap" width="fit">
        <Flex ai="center" gap={3} flexWrap="wrap" minWidth={0}>
          <DataGridTopBarContextMenu grid={grid} />
          {title && (
            // The grid points `aria-labelledby` here: a grid is named by its title, never by the
            // rows inside it.
            <Box id={grid.titleId} fontWeight={600} fontSize={16} color="gray-800" theme={{ dark: { color: 'gray-100' } }}>
              {title}
            </Box>
          )}

          <DataGridColumnGroups grid={grid} />
        </Flex>

        <Flex ai="center" gap={3} flexWrap="wrap">
          {globalFilter && <DataGridGlobalFilter grid={grid} />}
          <DataGridExport grid={grid} />
        </Flex>
      </Flex>

      {/* Row 2: Custom top bar content spans the full topbar width */}
      {topBarContent && <Box width="fit">{topBarContent}</Box>}
    </Flex>
  );
}

(DataGridTopBar as React.FunctionComponent).displayName = 'DataGridTopBar';
