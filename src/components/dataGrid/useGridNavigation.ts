import { useCallback, useMemo, useRef } from 'react';
import { ChangeDetails } from '../../react/a11y/useControllableState';
import useRovingFocus, { RovingFocusReason } from '../../react/a11y/useRovingFocus';
import { useIsomorphicLayoutEffect } from '../../react/effects';
import { GridNavigation } from './gridNavigationContext';
import { isTypingKey } from './models/editModel';
import GridModel from './models/gridModel';
import RowModel from './models/rowModel';
import { isTreeRow } from './models/treeRow';
import { ScrollPosition } from './models/viewportModel';

/** A cell, header or body — what a keystroke has to land on for the grid to own it. */
const CELL_SELECTOR = '[role="gridcell"],[role="columnheader"]';

/**
 * Everything focusable a cell can hold. Enter and F2 hand the keyboard to the first of them — and it
 * matches `tabindex="-1"` on purpose, because the grid's own widgets all carry one now: a cell's
 * contents are reached *through* the cell, which is what makes the grid a single tab stop.
 */
const FOCUSABLE_SELECTOR =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]';

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
  /** Read rather than written: a jump has to know which rows are rendered, which the direction decides. */
  scroll: ScrollPosition;
  onScrollTo: (top: number) => void;
}

export interface GridNavigator {
  /**
   * What every cell reads, through the context. Held apart from `onKeyDown` because it has to be the
   * same object between two renders that changed nothing a cell can see: a scroll re-renders the content,
   * and a fresh context value there re-renders every cell in the window whatever their elements memoize.
   */
  navigation: GridNavigation;
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
  const { grid, scrollerRef, scroll, onScrollTo } = options;

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

      const { startIndex, take } = viewport.window(scroll.top, scroll.direction);
      if (bodyIndex >= startIndex + RENDERED_MARGIN && bodyIndex < startIndex + take - RENDERED_MARGIN) return;

      // The scroll position is announced to the virtualization as well as written to the element:
      // the browser clamps `scrollTop` to the scrollable range and reports the clamped value back
      // on its own scroll event, which is a frame later than the render that has to hold the row.
      const top = viewport.rowTop(bodyIndex);
      scroller.scrollTop = top;
      onScrollTo(top);
    },
    [bodyRows.length, grid, headerRowCount, onScrollTo, scroll, scrollerRef],
  );

  // Which row the move started from, which only a scroll out of the body cares about.
  const lastRow = useRef(0);

  /**
   * Mirror the tab stop onto the range model, which owns the *mark*: the roving focus is where the
   * keyboard is, and the range is what a copy acts on and a Shift+arrow grows. A move into the header or
   * the footer leaves no body cell to be current, so the mark goes with it.
   */
  const trackRange = useCallback(
    (row: number, column: number, details: ChangeDetails<RovingFocusReason>) => {
      const bodyRow = row - headerRowCount;

      if (bodyRow < 0 || bodyRow >= bodyRows.length) {
        grid.range.clear();
        return;
      }

      // Only a keystroke carries the modifier, and only a keystroke may extend: a press has already said
      // what it meant by the time the browser focuses the cell it landed on.
      if (details.reason === 'keyboard') {
        grid.range.setCurrent(bodyRow, columnIndexOf(row, column), !!(details.event as React.KeyboardEvent | undefined)?.shiftKey);
        return;
      }

      grid.range.syncCurrent(bodyRow, columnIndexOf(row, column));
    },
    [bodyRows.length, columnIndexOf, grid, headerRowCount],
  );

  const roving = useRovingFocus({
    count: rowCount,
    columns: columnsIn,
    columnIndexOf,
    pageSize: grid.viewport.pageRows,
    onActiveCellChange: (cell, details) => {
      const from = lastRow.current;
      lastRow.current = cell.row;

      trackRange(cell.row, cell.column, details);

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

  /**
   * The next cell Tab lands on under `tabNavigation: 'cells'` — along the row and on into the rows after
   * it, which is the order a spreadsheet walks. At either end of the grid it gives up and lets the key
   * through, so Tab is still the way out rather than something the grid swallows for ever.
   */
  const stepCell = useCallback(
    (back: boolean): boolean => {
      const { activeIndex, activeColumn } = roving;
      const step = back ? -1 : 1;
      const column = activeColumn + step;

      if (column >= 0 && column < columnsIn(activeIndex)) {
        roving.setActiveCell(activeIndex, column, { reason: 'keyboard' });
        return true;
      }

      const row = activeIndex + step;
      if (row < 0 || row >= rowCount) return false;

      roving.setActiveCell(row, back ? Math.max(0, columnsIn(row) - 1) : 0, { reason: 'keyboard' });

      return true;
    },
    [columnsIn, roving, rowCount],
  );

  /**
   * Space on a cell selects the row it is in — or the whole grid, from the header cell that governs it.
   * Nothing when the grid has no selection to toggle, where Space falls through to what Enter does.
   */
  const toggleSelectionAt = useCallback(
    (row: number, column: number): boolean => {
      if (!grid.props.def.rowSelection) return false;

      // In the header it is the selection column that governs all of them — the column the select-all
      // checkbox sits in. Every other header cell is left to Enter, which sorts it.
      if (row < headerRowCount) {
        if (row >= headerRows.length || !grid.columns.value.visibleLeafs[column]?.isRowSelection) return false;

        grid.toggleSelectAllRows();
        return true;
      }

      // A group row and a detail row have no selection of their own: Space there is Enter's.
      const bodyRow = grid.flatRows.value[row - headerRowCount];
      if (!(bodyRow instanceof RowModel)) return false;

      bodyRow.toggleSelection();

      return true;
    },
    [grid, headerRowCount, headerRows.length],
  );

  /**
   * The next widget along inside one cell, wrapping at either end. Nothing when the cell holds one or
   * none, where Tab is left alone — there is nothing for it to move between.
   */
  const stepWidget = useCallback((cell: HTMLElement, from: HTMLElement, back: boolean): boolean => {
    const widgets = Array.from(cell.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
    if (widgets.length < 2) return false;

    const at = widgets.indexOf(from);
    if (at === -1) return false;

    widgets[(at + (back ? -1 : 1) + widgets.length) % widgets.length].focus();

    return true;
  }, []);

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

          return;
        }

        // APG's other half: with grid navigation disabled, Tab walks the widgets rather than leaving.
        // It wraps inside the cell — which the pattern allows explicitly — because every widget here is
        // out of the page tab sequence, so letting the key through would jump clean out of the grid
        // from halfway inside a cell. Escape is the way out, and it is the only one.
        if (event.key === 'Tab' && stepWidget(cell, target, event.shiftKey)) event.preventDefault();

        return;
      }

      // Tab is the grid's only when the caller asked for the spreadsheet reading. Left alone it is the
      // browser's, and since every widget a cell holds is out of the tab order the next stop is past the
      // grid — which is APG's single tab stop, and the whole reason it is the default.
      if (event.key === 'Tab' && grid.props.def.tabNavigation === 'cells') {
        if (stepCell(event.shiftKey)) event.preventDefault();

        return;
      }

      // Space selects the row, the way AG Grid reads it — and the way this grid has to, now that the
      // selection checkbox is no longer its own tab stop. Enter and F2 keep the editor and the widgets.
      if (event.key === ' ' && toggleSelectionAt(roving.activeIndex, roving.activeColumn)) {
        event.preventDefault();
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

        // An editable cell is what Enter and F2 open, ahead of whatever else the cell holds: the editor
        // is not in the DOM until they are pressed, so there is no widget there to step into yet.
        if (grid.edits.beginAt(roving.activeIndex - headerRowCount, roving.activeColumn)) {
          event.preventDefault();
          return;
        }

        const widget = cell.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);

        if (widget) {
          event.preventDefault();
          widget.focus();
          return;
        }
      }

      // One printable character opens the editor on it, replacing the value — the way a spreadsheet
      // reads a keystroke on a cell, and the reason an edit is never two gestures.
      if (grid.edits.enabled && isTypingKey(event)) {
        const at = grid.edits.beginAt(roving.activeIndex - headerRowCount, roving.activeColumn, event.key);

        if (at) {
          event.preventDefault();
          return;
        }
      }

      if (treeKeyDown(event, roving.activeIndex, roving.activeColumn)) {
        event.preventDefault();
        return;
      }

      rovingKeyDown(event);
    },
    [
      grid,
      headerRowCount,
      headerRows,
      roving.activeColumn,
      roving.activeIndex,
      rovingKeyDown,
      stepCell,
      stepWidget,
      toggleSelectionAt,
      treeKeyDown,
    ],
  );

  const { cellProps, setActiveCell } = roving;

  const navigation = useMemo<GridNavigation>(
    () => ({ rowCount, columnCount, headerRowCount, cellProps, setActiveCell }),
    [cellProps, columnCount, headerRowCount, rowCount, setActiveCell],
  );

  return { navigation, onKeyDown };
}
