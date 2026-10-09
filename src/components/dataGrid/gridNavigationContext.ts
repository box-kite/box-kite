import { createContext, useContext, useSyncExternalStore } from 'react';
import { ChangeDetails } from '../../react/a11y/useControllableState';
import { RovingFocusItemProps, RovingFocusReason } from '../../react/a11y/useRovingFocus';
import ActiveCellStore from '../../utils/dataGrid/activeCellStore';

/**
 * The grid's keyboard coordinates, shared with every cell. Rows are numbered as `aria-rowindex` is —
 * headers, then the filter row, then the body — and a cell asks for its roving tabindex by that pair, so
 * the numbering has to be one thing the whole grid agrees on rather than three local ones.
 */
export interface GridNavigation {
  /** `aria-rowcount`: every row the grid has, not the window of them that is rendered. */
  rowCount: number;
  /** `aria-colcount`: the visible leaf columns. */
  columnCount: number;
  /** How many rows sit above the body — the offset from a body row's index to its row number. */
  headerRowCount: number;
  /** The ref and the focus handler for one cell, in the coordinates above. Stable: the tabindex is `activeCell`. */
  cellProps: (row: number, column: number) => Omit<RovingFocusItemProps, 'tabIndex'>;
  /** Which cell holds the tab stop. Subscribed to per cell, so a move re-renders two cells rather than all of them. */
  activeCell: ActiveCellStore;
  /**
   * Move the tab stop to a cell without a keystroke having done it — what Tab out of an editor and into
   * the next editable cell moves. `'programmatic'` rather than `'keyboard'` on purpose: a keyboard move
   * focuses the cell from the navigation's own layout effect, which would take focus off an editor
   * mounting under it.
   */
  setActiveCell: (row: number, column: number, details: ChangeDetails<RovingFocusReason>) => void;
}

/**
 * Absent outside a DataGrid, and absent on purpose: `DataGridCell` is rendered by the grid and by
 * nothing else, so a missing provider is a bug rather than a supported way to use the component.
 */
const GridNavigationContext = createContext<GridNavigation | null>(null);

export default GridNavigationContext;

/** The grid navigation a cell belongs to. */
export function useGridNavigationContext(): GridNavigation | null {
  return useContext(GridNavigationContext);
}

const NO_SUBSCRIPTION = () => () => {};

/** One cell's roving tabindex, ref and focus handler — re-rendering the cell only when its own tabindex changes. */
export function useGridCellProps(navigation: GridNavigation | null, row: number, column: number): Partial<RovingFocusItemProps> {
  const active = useSyncExternalStore(
    navigation?.activeCell.subscribe ?? NO_SUBSCRIPTION,
    () => !!navigation?.activeCell.isActive(row, column),
    () => !!navigation?.activeCell.isActive(row, column),
  );

  if (!navigation) return {};

  return { ...navigation.cellProps(row, column), tabIndex: active ? 0 : -1 };
}
