import { useCallback } from 'react';
import Box from '../../../box';
import SortIcon from '../../../icons/sortIcon';
import useIdentifier from '../../../react/identity/useIdentifier';
import Checkbox from '../../checkbox';
import Flex from '../../flex';
import VisuallyHidden from '../../visuallyHidden';
import { useGridNavigationContext } from '../gridNavigationContext';
import ColumnModel from '../models/columnModel';
import DataGridHeaderCellContextMenu from './dataGridHeaderCellContextMenu';
import DataGridHeaderCellResizer from './dataGridHeaderCellResizer';

interface Props<TRow> {
  column: ColumnModel<TRow>;
  /** Navigation coordinates: which header row this is, and where the cell sits along it. */
  row: number;
  columnIndex: number;
}

export default function DataGridHeaderCell<TRow>(props: Props<TRow>) {
  const { column, row, columnIndex } = props;
  const { grid } = column;
  const { isStartPinned, isEndPinned } = column.pinFlags.value;
  const headerCell = column.headerCell;
  const { isSortable, showResizer, showContextMenu, paddingStart, paddingEnd } = headerCell;
  const navigation = useGridNavigationContext();
  const { ref, tabIndex, onFocus } = navigation?.cellProps(row, columnIndex) ?? {};
  // The resizer is a separator, and a separator names the pane it resizes — which is this cell.
  const identifier = useIdentifier('datagrid-columnheader');

  const toggleSelectAll = useCallback(() => {
    grid.toggleSelectAllRows();
  }, [grid]);

  // Row-selection header renders a select-all checkbox; everything else renders its label.
  const value = column.isRowSelection ? (
    <Checkbox
      variant="datagrid"
      m={1}
      indeterminate={grid.someRowsSelected && !grid.allRowsSelected}
      checked={grid.allRowsSelected}
      onChange={toggleSelectAll}
      // The column it sits in has no header text, so the checkbox has nothing to be named by.
      props={{ 'aria-label': 'Select all rows' }}
    />
  ) : headerCell.hiddenLabel ? (
    <VisuallyHidden tag="span">{headerCell.hiddenLabel}</VisuallyHidden>
  ) : (
    headerCell.label
  );

  return (
    <Flex
      ref={ref}
      id={identifier}
      props={{
        role: 'columnheader',
        'aria-colindex': headerCell.columnIndex,
        'aria-colspan': headerCell.columnSpan,
        'aria-rowspan': headerCell.rowSpan,
        'aria-sort': headerCell.ariaSort,
        tabIndex,
        onFocus,
      }}
      className="header-cell"
      component={`${grid.componentName}.header.cell` as never}
      variant={headerCell.variant as never}
      gridRow={column.gridRows}
      gridColumn={headerCell.gridColumn}
      style={{
        width: `var(${column.widthVarName})`,
        insetInlineStart: isStartPinned ? `var(${column.inlineStartVarName})` : undefined,
        insetInlineEnd: isEndPinned ? `var(${column.inlineEndVarName})` : undefined,
      }}
    >
      {
        <>
          <Flex width="fit" height="fit" jc={column.align} props={{ onClick: isSortable ? () => column.sortColumn() : undefined }}>
            <Flex
              overflow="hidden"
              position={column.isLeaf ? undefined : 'sticky'}
              ai="center"
              transition="none"
              ps={paddingStart}
              pe={paddingEnd}
              style={{
                insetInlineStart: !column.pin ? `var(${grid.inlineStartEdgeVarName})` : undefined,
              }}
            >
              <Box overflow="hidden" textOverflow="ellipsis" textWrap="nowrap">
                {value}
              </Box>
              {headerCell.isSorted && (
                <Box ps={(column.inlineWidth ?? 0) < 58 ? 0 : 2}>
                  <SortIcon width="16px" rotate={headerCell.sortDirection === 'ASC' ? 0 : 180} fill="currentColor" />
                </Box>
              )}
              {showContextMenu && <Box minWidth={column.isEndAligned ? 4 : 10} />}
            </Flex>
          </Flex>

          {showResizer && <DataGridHeaderCellResizer column={column} controls={identifier} />}

          {showContextMenu && <DataGridHeaderCellContextMenu column={column} />}
        </>
      }
    </Flex>
  );
}

(DataGridHeaderCell as React.FunctionComponent).displayName = 'DataGridHeaderCell';
