import { useCallback, useRef } from 'react';
import useRovingFocus from '../../react/a11y/useRovingFocus';
import { useIsomorphicLayoutEffect } from '../../react/effects';
import { GridNavigation } from './gridNavigationContext';
import GridModel from './models/gridModel';
import { isTreeRow } from './models/treeRow';

/** A cell, header or body — what a keystroke has to land on for the grid to own it. */
const CELL_SELECTOR = '[role="gridcell"],[role="columnheader"]';

/** Everything focusable a cell can hold. Enter and F2 hand the keyboard to the first of them. */
const FOCUSABLE_SELECTOR =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/** Rows kept between a keyboard jump and the edge of the rendered window. */
const RENDERED_MARGIN = 2;

/** What the navigation needs of a body row: how many cells it holds, and where each of them sits. */
interface NavigationRow {
  cellCount: number;
  columnOf(cell: number): number;
}

/** One array for every empty grid, so "no rows" is a stable dependency. */
const EMPTY_ROWS: NavigationRow[] = [];

export interface GridNavigationOptions<TRow> {
  grid: GridModel<TRow>;
  /** The scrolling element — a jump to a row outside the rendered window has to scroll first. */
  scrollerRef: React.RefObject<HTMLElement | null>;
  scrollTop: number;
  onScrollTo: (top: number) => void;
}

export interface GridNavigator extends GridNavigation {
  /** Put this on the `role="grid"` element: cell keystrokes bubble to it. */
  onKeyDown: (event: React.KeyboardEvent) => void;
}

/**
 * APG's grid pattern over a virtualized body. Focus lives on the cells, one in the tab order at a time,
 * and `useRovingFocus` owns which; what belongs here is what virtualization adds — a jump to a row nobody
 * has scrolled to has no element to focus, so the move scrolls, waits for the render it caused, and
 * focuses from a layout effect. Inside a cell the grid steps back: the widget keeps every key, and Enter
 * or F2 got focus there while Escape takes it out.
 */
export default function useGridNavigation<TRow>(options: GridNavigationOptions<TRow>): GridNavigator {
  const { grid, scrollerRef, scrollTop, onScrollTo } = options;

  const headerRows = grid.headerRows.value;
  const hasFilterRow = grid.filter.hasFilterableColumns;
  const headerRowCount = headerRows.length + (hasFilterRow ? 1 : 0);
  // `flatRows` is memoized on the model, so this is the identity of the row list itself — the
  // empty case has to borrow one rather than allocate a fresh array on every render.
  const bodyRows = grid.viewport.isEmpty ? EMPTY_ROWS : grid.flatRows.value;
  const columnCount = grid.columns.value.visibleLeafs.length;
  // The footer is a row of the grid like any other — pinned, so the arrows reach it without a scroll.
  const footerRowCount = grid.aggregation.hasFooter && !grid.viewport.isEmpty ? 1 : 0;
  const rowCount = headerRowCount + bodyRows.length + footerRowCount;

  /**
   * How many cells a row holds. Only the body varies: a group row's data columns are absorbed into
   * the spanning cell that names the group, and a detail row is a single cell across all of them.
   */
  const columnsIn = useCallback(
    (row: number): number => {
      if (row < headerRows.length) return headerRows[row]?.length ?? 0;
      if (row < headerRowCount) return columnCount;
      if (row >= headerRowCount + bodyRows.length) return columnCount;

      const bodyRow = bodyRows[row - headerRowCount];

      return bodyRow ? bodyRow.cellCount : 0;
    },
    [bodyRows, columnCount, headerRowCount, headerRows],
  );

  /**
   * Which column a cell starts at, which is the space a vertical move travels in. Only rows whose
   * cells line up one-to-one with the columns can answer this with the ordinal itself: a grouped
   * header covers its leaves, and a group row's spanning cell swallows the cells beside it.
   */
  const columnIndexOf = useCallback(
    (row: number, cell: number): number => {
      // `columnIndex` is the 1-based `aria-colindex` of the first column the header covers.
      if (row < headerRows.length) return (headerRows[row]?.[cell]?.headerCell.columnIndex ?? cell + 1) - 1;
      if (row < headerRowCount) return cell;

      // The footer holds one cell per column, so an ordinal there is already a column index.
      return bodyRows[row - headerRowCount]?.columnOf(cell) ?? cell;
    },
    [bodyRows, headerRowCount, headerRows],
  );

  // Set by a keyboard move, read by the layout effect below: the render in between is what puts
  // the target cell in the DOM.
  const pendingFocus = useRef(false);

  /** Scroll far enough that the row is rendered. `focus()` does the precise part afterwards. */
  const revealRow = useCallback(
    (row: number, from: number) => {
      const { viewport } = grid;
      const bodyIndex = row - headerRowCount;
      const scroller = scrollerRef.current;

      if (viewport.showAll || !scroller) return;
      // The footer is pinned like the header, so reaching it scrolls nothing.
      if (bodyIndex >= bodyRows.length) return;

      if (bodyIndex < 0) {
        // The header is sticky, so it is on screen whatever the body is doing. Only a move out of
        // the body scrolls — otherwise walking along the header would yank the rows under it back
        // to the top on every keystroke.
        if (from >= headerRowCount) {
          scroller.scrollTop = 0;
          onScrollTo(0);
        }

        return;
      }

      const { startIndex, take } = viewport.window(scrollTop);
      if (bodyIndex >= startIndex + RENDERED_MARGIN && bodyIndex < startIndex + take - RENDERED_MARGIN) return;

      // The scroll position is announced to the virtualization as well as written to the element:
      // the browser clamps `scrollTop` to the scrollable range and reports the clamped value back
      // on its own scroll event, which is a frame later than the render that has to hold the row.
      const top = viewport.rowTop(bodyIndex);
      scroller.scrollTop = top;
      onScrollTo(top);
    },
    [bodyRows.length, grid, headerRowCount, onScrollTo, scrollTop, scrollerRef],
  );

  // Which row the move started from, which only a scroll out of the body cares about.
  const lastRow = useRef(0);

  const roving = useRovingFocus({
    count: rowCount,
    columns: columnsIn,
    columnIndexOf,
    pageSize: grid.viewport.pageRows,
    onActiveCellChange: (cell, details) => {
      const from = lastRow.current;
      lastRow.current = cell.row;

      if (details.reason !== 'keyboard') return;

      revealRow(cell.row, from);
      pendingFocus.current = true;
    },
  });

  const activeItem = roving.activeItem;
  useIsomorphicLayoutEffect(() => {
    if (!pendingFocus.current) return;

    pendingFocus.current = false;
    // Focusing scrolls the cell the rest of the way into view by itself, which is the part the
    // row-height arithmetic above cannot get exactly right through a sticky header.
    activeItem()?.focus();
  });

  /**
   * The sideways keys on a tree's own column, which is where APG's treegrid puts expanding and collapsing:
   * forward opens a shut row, back shuts an open one and steps out to the parent of a row that is already
   * shut. Anything else falls through to the ordinary cell move — including both keys on every other
   * column, so a tree is still a grid to walk across. Forward is the *reading* direction, so the two keys
   * swap in a right-to-left grid.
   */
  const treeKeyDown = useCallback(
    (event: React.KeyboardEvent, row: number, column: number): boolean => {
      if (!grid.tree.enabled || (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft')) return false;

      const bodyRow = bodyRows[row - headerRowCount];
      if (!isTreeRow<TRow>(bodyRow)) return false;
      if (grid.columns.value.visibleLeafs[column]?.key !== grid.tree.columnKey) return false;

      const forward = event.key === (grid.isRtl ? 'ArrowLeft' : 'ArrowRight');

      if (forward) {
        if (!bodyRow.hasChildren || bodyRow.treeExpanded) return false;

        bodyRow.toggleTree();
        return true;
      }

      if (bodyRow.hasChildren && bodyRow.treeExpanded) {
        bodyRow.toggleTree();
        return true;
      }

      // The parent is the nearest row above sitting one level shallower — the display list is the tree in
      // its own order, so there is nothing else it can be, and a lazy tree has no parent object to hold.
      for (let at = row - 1; at >= headerRowCount; at--) {
        const candidate = bodyRows[at - headerRowCount];
        if (!isTreeRow<TRow>(candidate) || candidate.level >= bodyRow.level) continue;

        roving.setActiveCell(at, column, { reason: 'keyboard' });
        return true;
      }

      return false;
    },
    [bodyRows, grid, headerRowCount, roving],
  );

  const rovingKeyDown = roving.onKeyDown;
  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const cell = target.closest?.(CELL_SELECTOR) as HTMLElement | null;

      if (!cell) return;

      if (target !== cell) {
        // Focus is on a widget the cell holds. Escape gives the grid its keyboard back — unless
        // the widget has a popup open, where Escape belongs to closing that first.
        if (event.key === 'Escape' && !cell.querySelector('[aria-expanded="true"]')) {
          event.preventDefault();
          cell.focus();
        }

        return;
      }

      if (event.key === 'Enter' || event.key === ' ' || event.key === 'F2') {
        const column = headerRows[roving.activeIndex]?.[roving.activeColumn];

        // A sortable header's own action comes first: Enter on it sorts, the way a click does.
        // F2 is the way into the widgets it also holds — the context menu, the resizer.
        if (event.key !== 'F2' && column?.headerCell.isSortable) {
          event.preventDefault();
          column.sortColumn();
          return;
        }

        const widget = cell.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);

        if (widget) {
          event.preventDefault();
          widget.focus();
          return;
        }
      }

      if (treeKeyDown(event, roving.activeIndex, roving.activeColumn)) {
        event.preventDefault();
        return;
      }

      rovingKeyDown(event);
    },
    [headerRows, roving.activeColumn, roving.activeIndex, rovingKeyDown, treeKeyDown],
  );

  return { rowCount, columnCount, headerRowCount, cellProps: roving.cellProps, onKeyDown };
}
