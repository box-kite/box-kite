import { memo, useRef } from 'react';
import Box from '../../../box';
import { useIsomorphicLayoutEffect } from '../../../react/effects';
import Flex from '../../flex';
import { useGridNavigationContext } from '../gridNavigationContext';
import DetailRowModel from '../models/detailRowModel';

interface Props<TRow> {
  row: DetailRowModel<TRow>;
  /** Position in the whole row list, not in the rendered window. */
  index: number;
  /**
   * The grid's store version. Not read: it is what tells the memo below that something the row draws
   * from the model has moved, since every other prop it takes holds still while the window slides.
   */
  version: number;
}

function DataGridDetailRowImpl<TRow>(props: Props<TRow>) {
  const { row, index } = props;
  const { grid, parentRow } = row;
  const config = grid.props.def.rowDetail!;
  const navigation = useGridNavigationContext();
  const navRow = (navigation?.headerRowCount ?? 0) + index;
  const { ref, tabIndex, onFocus } = navigation?.cellProps(navRow, 0) ?? {};

  const isAutoHeight = row.isAutoHeight;

  const rowRef = useRef<HTMLDivElement>(null);

  // A panel that opens below the fold is a panel nobody sees. It runs here rather than where the row
  // was toggled because this is the render that puts the panel in the DOM, and the browser is the only
  // thing that knows how tall an `auto` one came out — virtualization carries an estimate for it.
  useIsomorphicLayoutEffect(() => {
    if (!grid.takeDetailReveal(parentRow.key)) return;

    rowRef.current?.scrollIntoView?.({ block: 'nearest' });
  });

  return (
    <Flex
      ref={rowRef}
      component={`${grid.componentName}.body.detailRow` as never}
      props={{ role: 'row', 'aria-rowindex': navRow + 1 }}
      style={{
        gridColumn: '1 / -1',
        height: isAutoHeight ? 'auto' : `${row.height}px`,
      }}
    >
      <Box
        ref={ref}
        component={`${grid.componentName}.body.detailRow.content` as never}
        position="sticky"
        insetStart={0}
        overflowX="auto"
        overflowY="hidden"
        // One cell across every column: the panel is what the row holds, and a row may hold
        // nothing but cells.
        props={{ role: 'gridcell', 'aria-colindex': 1, 'aria-colspan': navigation?.columnCount, tabIndex, onFocus }}
        style={{ width: `var(${grid.viewportWidthVarName})` }}
      >
        {config.content(parentRow.data)}
      </Box>
    </Flex>
  );
}

(DataGridDetailRowImpl as React.FunctionComponent).displayName = 'DataGridDetailRow';

/**
 * Memoized on its props, which is what makes a scroll cost one row rather than a window of them: the
 * rows either side of the new one are handed the same model and the same index, so they bail out.
 * `memo` loses the type parameter, and the cast is what hands it back.
 */
const DataGridDetailRow = memo(DataGridDetailRowImpl) as typeof DataGridDetailRowImpl;

export default DataGridDetailRow;
