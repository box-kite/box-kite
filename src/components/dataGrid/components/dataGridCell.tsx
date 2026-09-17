import { BoxProps } from '../../../box';
import { clearSelection } from '../../../utils/dom/domUtils';
import Flex from '../../flex';
import { useGridNavigationContext } from '../gridNavigationContext';
import AggregateCellModel from '../models/aggregateCellModel';
import CellModel from '../models/cellModel';
import GroupRowCellModel from '../models/groupRowCellModel';

/** What inside a cell owns its own presses, so a double one landing there is not a way into the editor. */
const WIDGET_SELECTOR = 'button,a[href],input,select,textarea';

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
  const { range } = column.grid;

  // The range's own coordinates: a body row, and a column ordinal that is a column index because a data
  // row holds one cell per column. Only a data row has one — a group row's cells span, and a footer's
  // are not rows of the table at all.
  const bodyRow = cell instanceof CellModel ? row - (navigation?.headerRowCount ?? 0) : -1;
  const isCurrent = bodyRow >= 0 && range.isCurrent(bodyRow, columnIndex);
  const isSelected = bodyRow >= 0 && range.isSelected(bodyRow, columnIndex);

  if (column.hasAlign) restProps.jc = column.align;

  // Column-stable variant (precomputed once) merged with this row's expansion state.
  let variant: Record<string, boolean> = cell.isExpanded
    ? { ...column.cellVariant.value, isExpanded: true, isExpandedFirstLeaf: cell.isFirst, isExpandedLastLeaf: cell.isLast }
    : column.cellVariant.value;

  // The mark and the block are per cell too, and they go on before the editing pair: a merged variant
  // wins property by property in the order the record names them, so the editor keeps its own ring.
  // `isInRange` leaves the current cell alone — the block is tinted *around* it, the way a sheet reads.
  if (isCurrent || isSelected) variant = { ...variant, isInRange: isSelected && !isCurrent, isCurrentCell: isCurrent };

  // Editing is per cell rather than per column, so it cannot ride the precomputed record — and a cell
  // whose editor is open stops clipping, or a control as tall as the row is cut off at both ends.
  const rejected = cell instanceof CellModel && !cell.editing && cell.rejected;
  if (cell instanceof CellModel && cell.editing) variant = { ...variant, isEditing: true, isInvalid: !!cell.error };
  // A cell a paste was refused on wears the same ring with no editor behind it: a batch has none to show
  // the message in, so the cells say which ones did not take a value and `onPaste` says why.
  else if (rejected) variant = { ...variant, isInvalid: true };

  // A double press opens the editor, the way a spreadsheet reads one. The press before it has already made
  // this the current cell — the cell carries its own tabindex — so a click needs no handler of its own.
  const onDoubleClick =
    cell instanceof CellModel
      ? (event: React.MouseEvent) => {
          // A widget in the cell owns its presses — a tree chevron, a link in a custom `Cell` — and an
          // editor opening over one would swallow the second of them. `beginEdit` judges the rest.
          if ((event.target as HTMLElement).closest(WIDGET_SELECTOR)) return;

          // The press selected the word it landed on, and the editor is about to replace it. Left alone
          // the stranded range reappears over anything rendered where it used to be — every option of a
          // `select` editor's list, painted selected the moment it opens (#169).
          clearSelection(event.currentTarget as HTMLElement);
          cell.beginEdit();
        }
      : undefined;

  // Marking cells is a pointer gesture, so the handlers are only there where it was asked for. A touch
  // is left alone entirely: the same press is how the grid is scrolled, and it cannot be both.
  const marking = range.enabled && bodyRow >= 0;
  const onPointerDown = marking
    ? (event: React.PointerEvent) => {
        if (event.button !== 0 || event.pointerType === 'touch') return;
        // A press that landed on a widget belongs to the widget: a drag inside an open editor selects its
        // text, and a chevron is pressed rather than dragged. The focus it takes still moves the mark.
        if ((event.target as HTMLElement).closest(WIDGET_SELECTOR)) return;

        range.press(bodyRow, columnIndex, event.shiftKey);
      }
    : undefined;

  // Attached only while a drag is running, so a grid at rest carries no per-cell pointer tracking at all.
  // The keyboard follows the pointer: the ring, the tab stop and the corner a Shift+arrow would move next
  // are one cell, and focusing *after* the model has moved is what keeps the focus from collapsing it.
  const onPointerEnter =
    marking && range.isDragging
      ? (event: React.PointerEvent) => {
          range.dragTo(bodyRow, columnIndex);
          (event.currentTarget as HTMLElement).focus();
        }
      : undefined;

  return (
    <Flex
      ref={ref}
      component={`${column.grid.componentName}.body.cell` as never}
      props={{
        role: 'gridcell',
        'aria-colindex': ariaColIndex ?? columnIndex + 1,
        'aria-colspan': ariaColSpan,
        // Only a block of cells is *selected*. A lone current cell is the cursor, and saying "selected"
        // on every arrow key would be an announcement about nothing having been chosen.
        'aria-selected': isSelected || undefined,
        'aria-invalid': rejected || undefined,
        tabIndex,
        onFocus,
        onDoubleClick,
        onPointerDown,
        onPointerEnter,
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
