import { useMemo } from 'react';
import Box from '../../../box';
import ArrayUtils from '../../../utils/array/arrayUtils';
import Flex from '../../flex';
import Grid from '../../grid';
import DetailRowModel from '../models/detailRowModel';
import GridModel from '../models/gridModel';
import GroupRowModel from '../models/groupRowModel';
import RowModel from '../models/rowModel';
import DataGridDetailRow from './dataGridDetailRow';
import DataGridFooter from './dataGridFooter';
import DataGridGroupRow from './dataGridGroupRow';
import DataGridRow from './dataGridRow';

function renderRow<TRow>(row: RowModel<TRow> | GroupRowModel<TRow> | DetailRowModel<TRow>, index: number) {
  if (row instanceof DetailRowModel) {
    return <DataGridDetailRow key={row.key} row={row} index={index} />;
  } else if (row instanceof GroupRowModel) {
    return <DataGridGroupRow key={row.key} row={row} index={index} />;
  } else {
    return <DataGridRow key={row.key} row={row as RowModel<TRow>} index={index} />;
  }
}

interface Props<TRow> {
  grid: GridModel<TRow>;
  scrollTop: number;
}

export default function DataGridBody<TRow>(props: Props<TRow>) {
  const { grid, scrollTop } = props;
  const { viewport } = grid;

  const { startIndex, take, translateY, totalHeight, viewHeight } = viewport.window(scrollTop);
  const showAll = viewport.showAll;
  const isEmpty = viewport.isEmpty;
  const flatRows = grid.flatRows.value;

  const rows = useMemo(() => {
    if (isEmpty) return null;

    // The index a row is rendered with is its index in the *whole* list, not in the window: that
    // is what `aria-rowindex` means, and what the keyboard navigation counts in.
    return ArrayUtils.take(flatRows, take, startIndex).map((row, offset) => renderRow(row, startIndex + offset));
  }, [flatRows, isEmpty, take, startIndex]);

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
