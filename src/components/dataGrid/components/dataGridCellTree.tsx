import { useCallback } from 'react';
import Box from '../../../box';
import ExpandIcon from '../../../icons/expandIcon';
import Button from '../../button';
import Flex from '../../flex';
import CellModel from '../models/cellModel';
import TreeRowModel from '../models/treeRowModel';

interface Props<TRow> {
  cell: CellModel<TRow>;
  row: TreeRowModel<TRow>;
  /** Whatever the column would have rendered — the value, or a `Cell` of the caller's own. */
  children: React.ReactNode;
}

/**
 * The tree column's cell: an indent for the level, a chevron where there is something under the row, and
 * the column's own content beside it. A leaf keeps the chevron's width so a column of values stays a
 * column rather than stepping in and out by one control's width.
 */
export default function DataGridCellTree<TRow>(props: Props<TRow>) {
  const { cell, row, children } = props;
  const { hasChildren, treeExpanded, level } = row;
  const componentName = row.grid.componentName;

  const toggleHandler = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      row.toggleTree();
    },
    [row],
  );

  // The row it opens, named by what the tree is read down. `aria-expanded` is deliberately *not* here:
  // in a treegrid the row carries the open state, and a second one on the button reads it out twice.
  const name = cell.value == null || cell.value === '' ? `row ${row.rowIndex + 1}` : String(cell.value);

  return (
    <Flex component={`${componentName}.body.cell.tree` as never} ai="center" ps={level * row.grid.tree.indent}>
      {hasChildren ? (
        <Button
          component={`${componentName}.body.cell.tree.toggle` as never}
          variant={{ isExpanded: treeExpanded } as never}
          type="button"
          onClick={toggleHandler}
          cursor="pointer"
          display="flex"
          ai="center"
          jc="center"
          props={{ 'aria-label': `${treeExpanded ? 'Collapse' : 'Expand'} ${name}` }}
        >
          <ExpandIcon fill="currentColor" width="14px" height="14px" rotate={treeExpanded ? 0 : -90} />
        </Button>
      ) : (
        <Box component={`${componentName}.body.cell.tree.spacer` as never} />
      )}

      <Box textOverflow="ellipsis" overflow="hidden" textWrap="nowrap" minWidth={0}>
        {children}
      </Box>
    </Flex>
  );
}

(DataGridCellTree as React.FunctionComponent).displayName = 'DataGridCellTree';
