import Box from '../../../box';
import Flex from '../../flex';
import CellModel from '../models/cellModel';

interface Props<TRow> {
  cell: CellModel<TRow>;
  /** Position among the rendered cells, which is half of what picks this bar’s width. */
  columnIndex: number;
}

/**
 * Bars of unequal width rather than one repeated length: a skeleton whose every cell is the same reads
 * as a barcode, and the lengths come off the row and column indexes so the server and the browser draw
 * the same one. Five widths, so the engine writes five classes rather than one per cell.
 */
const WIDTHS = ['3/5', '2/5', '4/5', '1/2', '7/12'] as const;

export default function DataGridCellPlaceholder<TRow>(props: Props<TRow>) {
  const { cell, columnIndex } = props;
  const width = WIDTHS[(cell.row.rowIndex + columnIndex) % WIDTHS.length];

  return (
    // Hidden from the accessibility tree: the row already says `aria-busy`, and a reader announcing
    // an empty cell per column is noise about rows nobody has yet.
    <Flex component={`${cell.grid.componentName}.body.cell.placeholder` as never} ai="center" px={3} props={{ 'aria-hidden': true }}>
      <Box component={`${cell.grid.componentName}.body.cell.placeholder.bar` as never} width={width} />
    </Flex>
  );
}

(DataGridCellPlaceholder as React.FunctionComponent).displayName = 'DataGridCellPlaceholder';
