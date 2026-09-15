import { useCallback } from 'react';
import Checkbox from '../../checkbox';
import CellModel from '../models/cellModel';

interface Props<TRow> {
  cell: CellModel<TRow>;
}

export default function DataGridCellRowSelection<TRow>(props: Props<TRow>) {
  const { cell } = props;

  const rowSelectedHandler = useCallback(() => {
    cell.toggleSelection();
  }, [cell]);

  // Named by the row it selects: `aria-rowindex` is what a screen reader has just read out, and a
  // column of checkboxes all called "Select row" tells the user nothing about which one they are on.
  return (
    <Checkbox
      variant="datagrid"
      checked={cell.selected}
      indeterminate={cell.indeterminate}
      onChange={rowSelectedHandler}
      props={{ 'aria-label': `Select row ${cell.row.rowIndex + 1}` }}
    />
  );
}

(DataGridCellRowSelection as React.FunctionComponent).displayName = 'DataGridCellRowSelection';
