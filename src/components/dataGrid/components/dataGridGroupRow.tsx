import { useCallback } from 'react';
import Box from '../../../box';
import ExpandIcon from '../../../icons/expandIcon';
import Button from '../../button';
import Checkbox from '../../checkbox';
import Flex from '../../flex';
import { useGridNavigationContext } from '../gridNavigationContext';
import GroupRowModel from '../models/groupRowModel';
import DataGridAggregateValue from './dataGridAggregateValue';
import DataGridCell from './dataGridCell';
import DataGridCellPlaceholder from './dataGridCellPlaceholder';

interface Props<TRow> {
  row: GroupRowModel<TRow>;
  /** Position in the whole row list, not in the rendered window. */
  index: number;
}

export default function DataGridGroupRow<TRow>(props: Props<TRow>) {
  const { row, index } = props;
  const { selected, indeterminate, expanded, placeholder } = row;
  const navigation = useGridNavigationContext();
  const navRow = (navigation?.headerRowCount ?? 0) + index;

  const selectAllHandler = useCallback(() => row.toggleSelectAll(), [row]);

  return (
    <Flex
      component={`${row.grid.componentName}.body.groupRow` as never}
      className="grid-row"
      // `selected` is `aria-selected` on the element as well as a styling hook — see `DataGridRow`.
      selected={row.grid.props.def.rowSelection ? selected : undefined}
      display="contents"
      // A row, not a rowgroup: it holds cells of its own, and the rows it groups are its siblings
      // in the same rowgroup rather than its children. The open state is on the expand *button* and
      // not here: `aria-expanded` on a `row` is only defined inside a `treegrid`, and axe calls it a
      // serious violation in a `grid` — which is what this has always been (bug #162).
      props={{
        role: 'row',
        'aria-rowindex': navRow + 1,
        // What the cells are tinted by. It used to be the row's own `aria-expanded`, which #162 took off
        // it — and a tree row carries one legitimately, which is not a section header at all.
        'data-group-row': '',
        // The group exists, its value does not yet — a server has been asked and has not answered.
        'aria-busy': placeholder || undefined,
      }}
    >
      {row.renderedCells.map(({ cell, columnIndex }, navColumn) => {
        switch (cell.cellKind) {
          case 'grouping':
            return (
              <DataGridCell
                key={cell.column.key}
                cell={cell}
                row={navRow}
                columnIndex={navColumn}
                ariaColIndex={columnIndex + 1}
                ariaColSpan={cell.gridColumnSpan}
                style={{ width: cell.widthVar, insetInlineEnd: cell.isEndPinned ? '0' : undefined }}
                be={cell.hasGroupingBorder ? 1 : undefined}
                gridColumn={cell.gridColumnSpan}
                ps={cell.depthPadding}
                overflow="auto"
              >
                {placeholder ? (
                  <DataGridCellPlaceholder cell={cell} columnIndex={navColumn} />
                ) : (
                  <Box textWrap="nowrap" px={3}>
                    <Button
                      component={`${row.grid.componentName}.body.groupRow.expandButton` as never}
                      onClick={() => row.toggleRow()}
                      cursor="pointer"
                      display="flex"
                      gap={1}
                      ai="center"
                      props={{ 'aria-expanded': expanded }}
                    >
                      <ExpandIcon fill="currentColor" width="14px" height="14px" rotate={expanded ? 0 : -90} />
                      {cell.value}
                    </Button>
                  </Box>
                )}
              </DataGridCell>
            );

          case 'selection':
            return (
              <DataGridCell key={cell.column.key} cell={cell} row={navRow} columnIndex={navColumn} ariaColIndex={columnIndex + 1}>
                <Checkbox
                  variant="datagrid"
                  m={1}
                  checked={selected}
                  indeterminate={indeterminate}
                  onChange={selectAllHandler}
                  props={{ 'aria-label': `Select all rows in ${row.groupValue}` }}
                />
              </DataGridCell>
            );

          case 'aggregate':
            return (
              <DataGridCell key={cell.column.key} cell={cell} row={navRow} columnIndex={navColumn} ariaColIndex={columnIndex + 1}>
                {cell.aggregate && <DataGridAggregateValue cell={cell.aggregate} />}
              </DataGridCell>
            );

          case 'spacer':
            return (
              <DataGridCell
                key={cell.column.key}
                cell={cell}
                row={navRow}
                columnIndex={navColumn}
                ariaColIndex={columnIndex + 1}
                px={cell.column.isRowNumber ? 3 : undefined}
              >
                {cell.value}
              </DataGridCell>
            );

          default:
            return null;
        }
      })}
    </Flex>
  );
}

(DataGridGroupRow as React.FunctionComponent).displayName = 'DataGridGroupRow';
