import { useCallback } from 'react';
import Flex from '../../flex';
import { useGridNavigationContext } from '../gridNavigationContext';
import CellModel from '../models/cellModel';
import RowModel from '../models/rowModel';
import { isTreeRow } from '../models/treeRow';
import DataGridCell from './dataGridCell';
import DataGridCellPlaceholder from './dataGridCellPlaceholder';
import DataGridCellText from './dataGridCellText';
import DataGridCellTree from './dataGridCellTree';

interface Props<TRow> {
  row: RowModel<TRow>;
  /** Position in the whole row list, not in the rendered window. */
  index: number;
}

export default function DataGridRow<TRow>(props: Props<TRow>) {
  const { row, index } = props;
  const { selected, expandOnRowClick } = row;
  const navigation = useGridNavigationContext();
  const navRow = (navigation?.headerRowCount ?? 0) + index;
  const tree = isTreeRow<TRow>(row) ? row : undefined;
  const treeColumnKey = tree && row.grid.tree.columnKey;

  const handleRowClick = useCallback(() => {
    row.toggleDetail();
  }, [row]);

  const renderContent = (cell: CellModel<TRow>, columnIndex: number) => {
    const content =
      // The row number is known without the row, so it is the one cell a placeholder still fills:
      // a skeleton that hides the position is a grid whose scrollbar has nothing to say.
      row.placeholder && !cell.column.isRowNumber ? (
        <DataGridCellPlaceholder cell={cell} columnIndex={columnIndex} />
      ) : cell.column.Cell ? (
        <cell.column.Cell cell={cell} />
      ) : (
        <DataGridCellText cell={cell} />
      );

    // The chevron and the indent go *around* whatever the column renders, so a tree column can still
    // be drawn by a `Cell` of the caller's own.
    if (!tree || cell.column.key !== treeColumnKey) return content;

    return (
      <DataGridCellTree cell={cell} row={tree}>
        {content}
      </DataGridCellTree>
    );
  };

  return (
    <Flex
      component={`${row.grid.componentName}.body.row` as never}
      className="grid-row"
      // Box renders `selected` as `aria-selected`, so it is the row's state as well as its
      // styling hook — and only where rows can be selected: `aria-selected="false"` on a grid with
      // no selection tells a screen reader there is something to select, which there is not.
      selected={row.grid.props.def.rowSelection ? selected : undefined}
      display="contents"
      props={{
        role: 'row',
        'aria-rowindex': navRow + 1,
        // The row exists, its values do not yet — which is what a reader landing on it needs to hear.
        'aria-busy': row.placeholder || undefined,
        // A tree's shape is on the rows rather than in the DOM: the rows under one of these are its
        // siblings in the same rowgroup, so `aria-level` is the only thing that says how deep it is.
        // `aria-expanded` is valid here and nowhere else in this library — it is what makes the grid a
        // `treegrid` — and only a row with something under it carries one.
        'aria-level': tree ? tree.level + 1 : undefined,
        'aria-posinset': tree ? tree.position + 1 : undefined,
        'aria-setsize': tree ? tree.siblings : undefined,
        'aria-expanded': tree?.hasChildren ? tree.treeExpanded : undefined,
        onClick: expandOnRowClick ? handleRowClick : undefined,
      }}
      cursor={expandOnRowClick ? 'pointer' : undefined}
    >
      {row.cells.map((cell, columnIndex) => (
        <DataGridCell key={cell.column.key} cell={cell} row={navRow} columnIndex={columnIndex}>
          {renderContent(cell, columnIndex)}
        </DataGridCell>
      ))}
    </Flex>
  );
}

(DataGridRow as React.FunctionComponent).displayName = 'DataGridRow';
