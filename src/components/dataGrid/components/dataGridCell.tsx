import { BoxProps } from '../../../box';
import Flex from '../../flex';
import { useGridNavigationContext } from '../gridNavigationContext';
import AggregateCellModel from '../models/aggregateCellModel';
import CellModel from '../models/cellModel';
import GroupRowCellModel from '../models/groupRowCellModel';

interface Props<TRow> extends BoxProps {
  children: React.ReactNode;
  cell: CellModel<TRow> | GroupRowCellModel<TRow> | AggregateCellModel<TRow>;
  /** Navigation coordinates. `columnIndex` counts rendered cells, which a group row has fewer of. */
  row: number;
  columnIndex: number;
  /** 1-based `aria-colindex`, when the cell does not sit at `columnIndex`. */
  ariaColIndex?: number;
  ariaColSpan?: number;
}

export default function DataGridCell<TRow>(props: Props<TRow>) {
  const { children, cell, row, columnIndex, ariaColIndex, ariaColSpan, style, ...restProps } = props;
  const { column } = cell;
  const navigation = useGridNavigationContext();
  const { ref, tabIndex, onFocus } = navigation?.cellProps(row, columnIndex) ?? {};

  if (column.hasAlign) restProps.jc = column.align;

  // Column-stable variant (precomputed once) merged with this row's expansion state.
  let variant: Record<string, boolean> = cell.isExpanded
    ? { ...column.cellVariant.value, isExpanded: true, isExpandedFirstLeaf: cell.isFirst, isExpandedLastLeaf: cell.isLast }
    : column.cellVariant.value;

  // Editing is per cell rather than per column, so it cannot ride the precomputed record — and a cell
  // whose editor is open stops clipping, or a control as tall as the row is cut off at both ends.
  if (cell instanceof CellModel && cell.editing) variant = { ...variant, isEditing: true, isInvalid: !!cell.error };

  return (
    <Flex
      ref={ref}
      component={`${column.grid.componentName}.body.cell` as never}
      props={{
        role: 'gridcell',
        'aria-colindex': ariaColIndex ?? columnIndex + 1,
        'aria-colspan': ariaColSpan,
        tabIndex,
        onFocus,
      }}
      variant={variant as never}
      style={{ ...column.cellStyleVars.value, ...style }}
      {...restProps}
    >
      {children}
    </Flex>
  );
}

(DataGridCell as React.FunctionComponent).displayName = 'DataGridCell';
