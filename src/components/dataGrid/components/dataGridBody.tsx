import { useMemo } from 'react';
import Box from '../../../box';
import ArrayUtils from '../../../utils/array/arrayUtils';
import Flex from '../../flex';
import Grid from '../../grid';
import DetailRowModel from '../models/detailRowModel';
import GridModel from '../models/gridModel';
import GroupRowModel from '../models/groupRowModel';
import RowModel from '../models/rowModel';
import { ScrollPosition } from '../models/viewportModel';
import DataGridDetailRow from './dataGridDetailRow';
import DataGridFooter from './dataGridFooter';
import DataGridGroupRow from './dataGridGroupRow';
import DataGridRow from './dataGridRow';

function renderRow<TRow>(row: RowModel<TRow> | GroupRowModel<TRow> | DetailRowModel<TRow>, index: number, version: number) {
  if (row instanceof DetailRowModel) {
    return <DataGridDetailRow key={row.key} row={row} index={index} version={version} />;
  } else if (row instanceof GroupRowModel) {
    return <DataGridGroupRow key={row.key} row={row} index={index} version={version} />;
  } else {
    return <DataGridRow key={row.key} row={row as RowModel<TRow>} index={index} version={version} />;
  }
}

interface Props<TRow> {
  grid: GridModel<TRow>;
  scroll: ScrollPosition;
}

export default function DataGridBody<TRow>(props: Props<TRow>) {
  const { grid, scroll } = props;
  const { viewport } = grid;

  const { startIndex, take, translateY, totalHeight, viewHeight } = viewport.window(scroll.top, scroll.direction);
  const showAll = viewport.showAll;
  const isEmpty = viewport.isEmpty;
  const flatRows = grid.flatRows.value;

  // A cell reads mutable model state as it renders — its range mark, its edit, its expansion — so the
  // elements have to be rebuilt whenever the model moves, and the store version is what says it has. It is
  // *not* in the list for a scroll, which is the point: the window holding still is a frame that costs
  // nothing but the transform.
  const version = grid.getSnapshot();

  const rows = useMemo(() => {
    if (isEmpty) return null;

    // The index a row is rendered with is its index in the *whole* list, not in the window: that
    // is what `aria-rowindex` means, and what the keyboard navigation counts in.
    return ArrayUtils.take(flatRows, take, startIndex).map((row, offset) => renderRow(row, startIndex + offset, version));
  }, [flatRows, isEmpty, take, startIndex, version]);

  // Render empty state outside the CSS Grid to ensure full width
  if (isEmpty) {
    const { noDataComponent } = grid.props.def;
    const defaultEmpty = grid.props.loading ? 'loading...' : 'empty';

    return (
      <Flex
        component={`${grid.componentName}.body.empty` as never}
        jc="center"
        ai="center"
        width="fit"
        position="sticky"
        insetStart={0}
        props={{ role: 'row' }}
        style={{ height: viewport.emptyHeight }}
      >
        {/* A grid may hold nothing but rows, and a row nothing but cells — so the "no data" message
            is a cell. `display: contents` keeps it out of the layout it would otherwise change. */}
        <Box display="contents" props={{ role: 'gridcell' }}>
          {noDataComponent ?? defaultEmpty}
        </Box>
      </Flex>
    );
  }

  if (showAll) {
    return (
      <>
        <Grid
          component={`${grid.componentName}.body` as never}
          width="max-content"
          minWidth="fit"
          transition="none"
          // Marking cells and selecting text are the same drag, so a grid that does one cannot do the
          // other. The editor's cell hands it back, which is where typing into a value happens.
          userSelect={grid.range.enabled ? 'none' : undefined}
          props={{ role: 'rowgroup' }}
          style={{ gridTemplateColumns: grid.gridTemplateColumns.value }}
        >
          {rows}
        </Grid>
        <DataGridFooter grid={grid} />
      </>
    );
  }

  return (
    // The scroll spacers carry the virtualization, not the structure: `presentation` keeps them
    // from sitting between the grid and its rowgroup in the accessibility tree.
    <Box props={{ role: 'presentation' }} style={{ height: viewHeight }}>
      <Box props={{ role: 'presentation' }} style={{ height: `${totalHeight}px` }}>
        <Grid
          component={`${grid.componentName}.body` as never}
          width="max-content"
          minWidth="fit"
          transition="none"
          // Marking cells and selecting text are the same drag, so a grid that does one cannot do the
          // other. The editor's cell hands it back, which is where typing into a value happens.
          userSelect={grid.range.enabled ? 'none' : undefined}
          props={{ role: 'rowgroup' }}
          style={{
            transform: `translate3d(0, ${translateY}px, 0)`,
            willChange: 'transform',
            gridTemplateColumns: grid.gridTemplateColumns.value,
          }}
        >
          {rows}
        </Grid>
      </Box>
      {/* Inside the height-capped wrapper and after the scroll spacer: that static position is what lets
          `position: sticky` hold the footer at the bottom, and what keeps the last row out from under it. */}
      <DataGridFooter grid={grid} />
    </Box>
  );
}

(DataGridBody as React.FunctionComponent).displayName = 'DataGridBody';
