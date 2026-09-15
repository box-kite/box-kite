import { createContext, useContext } from 'react';
import { ChangeDetails } from '../../react/a11y/useControllableState';
import { RovingFocusItemProps, RovingFocusReason } from '../../react/a11y/useRovingFocus';

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
  /** The roving tabindex and the ref for one cell, in the coordinates above. */
  cellProps: (row: number, column: number) => RovingFocusItemProps;
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
