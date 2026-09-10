import { useCallback, useRef, useState } from 'react';
import { isRtl } from '../../utils/dom/domUtils';
import TypeaheadUtils from '../../utils/keyboard/typeaheadUtils';
import { useLatest } from './callbacks';
import useControllableState, { ChangeDetails, ChangeHandler } from './useControllableState';

export type RovingFocusReason = 'keyboard' | 'typeahead' | 'focus' | 'programmatic';

export type RovingOrientation = 'vertical' | 'horizontal' | 'both';

/** Rows a PageUp/PageDown moves when the caller names no page size. */
const DEFAULT_PAGE_SIZE = 10;

/** A position in grid mode. Both are `-1` when nothing is active. */
export interface RovingCell {
  row: number;
  column: number;
}

export interface RovingFocusOptions {
  /** How many items there are right now — rows, in grid mode. A filtered list may change this. */
  count: number;
  /**
   * Turns the list into a grid and `count` into a count of rows: how many cells the row at `row` holds, a
   * function when rows differ. Grid mode moves in two axes and never wraps (APG), Home/End go to the
   * row's ends, Ctrl+Home/End to the grid's corners, PageUp/PageDown by `pageSize` rows.
   */
  columns?: number | ((row: number) => number);
  /**
   * Where a cell starts in column-index space, for rows whose cells do not line up one-to-one with the
   * grid's columns (a grouped header, a spanning group row). Vertical movement is measured in this space,
   * so a move down out of a cell covering columns 4–6 lands under the column it started in. Identity by default.
   */
  columnIndexOf?: (row: number, cell: number) => number;
  /** Rows a PageUp/PageDown moves. Default 10. Grid mode only. */
  pageSize?: number;
  /** The starting column *index*, when the caller wants one other than the first. Grid mode only. */
  defaultActiveColumn?: number;
  /** The active cell moved. Grid mode only — `onActiveIndexChange` still reports the row. */
  onActiveCellChange?: ChangeHandler<RovingCell, RovingFocusReason>;
  /** Which arrow keys navigate. Default `vertical`. Ignored in grid mode, which uses both axes. */
  orientation?: RovingOrientation;
  /** Wrap around at the ends. Default true. */
  loop?: boolean;
  activeIndex?: number;
  defaultActiveIndex?: number;
  onActiveIndexChange?: ChangeHandler<number, RovingFocusReason>;
  /** Disabled items are skipped by every movement, as APG requires. */
  isDisabled?: (index: number) => boolean;
  /** An item's text. Supplying it turns on typeahead. */
  textOf?: (index: number) => string;
  /**
   * Move real DOM focus onto the active item — the roving-tabindex pattern. `false` is the other half of
   * the APG list patterns: focus stays put (a combobox's trigger) and `aria-activedescendant` names the
   * active item instead. The hook still tracks the index; it just does not take focus.
   */
  focusItems?: boolean;
  /** Enter, and Space when no typeahead buffer is open. */
  onSelect?: (index: number, event: React.KeyboardEvent) => void;
}

export interface RovingFocusItemProps {
  ref: (element: HTMLElement | null) => void;
  tabIndex?: number;
  onFocus?: () => void;
}

export interface RovingFocus {
  /** Clamped to the current `count`; `-1` when nothing is active. The row, in grid mode. */
  activeIndex: number;
  /**
   * The active cell's ordinal in its row — its column index only while no cell spans more than one column.
   * `-1` outside grid mode.
   */
  activeColumn: number;
  setActiveIndex: (index: number, details: ChangeDetails<RovingFocusReason>) => void;
  /** Grid mode: move both axes at once, `column` being a cell ordinal. Out-of-range values are clamped. */
  setActiveCell: (row: number, column: number, details: ChangeDetails<RovingFocusReason>) => void;
  /** Put this on the element that has focus: the list in roving-tabindex, the trigger otherwise. */
  onKeyDown: (event: React.KeyboardEvent) => void;
  itemProps: (index: number) => RovingFocusItemProps;
  /** Grid mode's `itemProps`: the roving tabindex and the ref for one cell. */
  cellProps: (row: number, column: number) => RovingFocusItemProps;
  /**
   * The active item's element, for `aria-activedescendant` or to scroll it into view. `null` in grid mode
   * whenever the active cell is not rendered, which a virtualized grid is full of: bring the row into view
   * first, then read this on the render that follows.
   */
  activeItem: () => HTMLElement | null;
}

/** Keeps a coordinate inside `[0, max]`. `max` below zero means there is nowhere to be. */
function clamp(value: number, max: number): number {
  return max < 0 ? -1 : Math.max(0, Math.min(value, max));
}

/** The next selectable index in a direction, or `-1` when there is none. */
function step(from: number, delta: number, count: number, loop: boolean, isDisabled?: (index: number) => boolean): number {
  if (count === 0) return -1;

  let index = from;

  for (let taken = 0; taken < count; taken++) {
    index += delta;

    if (index < 0 || index >= count) {
      if (!loop) return -1;
      index = ((index % count) + count) % count;
    }

    if (!isDisabled?.(index)) return index;
  }

  return -1;
}

/** The first (`delta: 1`) or last (`delta: -1`) selectable index. */
function edge(delta: number, count: number, isDisabled?: (index: number) => boolean): number {
  return step(delta === 1 ? -1 : count, delta, count, false, isDisabled);
}

/**
 * Arrow-key navigation over a list: the movement half of every APG list pattern (listbox, menu, tabs,
 * radio group), with both focus strategies. It owns which item is active and how the keys move it; the
 * caller owns the roles and the ARIA, because a listbox and a menu navigate alike and are named quite
 * differently. `columns` turns the same movement into APG's grid pattern, and may be a function of the row.
 */
export default function useRovingFocus(options: RovingFocusOptions): RovingFocus {
  const {
    count,
    columns,
    columnIndexOf,
    pageSize = DEFAULT_PAGE_SIZE,
    defaultActiveColumn = 0,
    onActiveCellChange,
    orientation = 'vertical',
    loop = true,
    activeIndex: controlledIndex,
    defaultActiveIndex = 0,
    onActiveIndexChange,
    isDisabled,
    textOf,
    focusItems = true,
    onSelect,
  } = options;

  const [rawIndex, setIndex] = useControllableState<number, RovingFocusReason>({
    value: controlledIndex,
    defaultValue: defaultActiveIndex,
    onChange: onActiveIndexChange,
  });

  // A list that shrinks — a search filtering it — must not leave the active index past its end.
  const activeIndex = Math.min(rawIndex, count - 1);

  const isGrid = columns !== undefined;
  const widthOf = useCallback((row: number) => (typeof columns === 'function' ? columns(row) : (columns ?? 0)), [columns]);

  /**
   * Which cell of a row covers a column index: the last one starting at or before it. A row tiles its
   * columns in order, so a walk finds it; with no `columnIndexOf` this is the clamp it used to be.
   */
  const cellAtColumn = useCallback(
    (row: number, columnIndex: number): number => {
      const width = widthOf(row);

      if (!columnIndexOf) return clamp(columnIndex, width - 1);
      if (width <= 0) return -1;

      let cell = 0;

      while (cell + 1 < width && columnIndexOf(row, cell + 1) <= columnIndex) cell++;

      return cell;
    },
    [columnIndexOf, widthOf],
  );

  /**
   * The column the user last *asked* for, which is not always one the current row starts a cell at: moving
   * through a spanning group row must not collapse the position into column 0 for good. `activeColumn` is
   * the cell covering it, so the column comes back on the far side.
   */
  const [rawColumn, setRawColumn] = useState(defaultActiveColumn);
  const activeColumn = isGrid && activeIndex >= 0 ? cellAtColumn(activeIndex, rawColumn) : -1;

  const items = useRef<(HTMLElement | null)[]>([]);
  const itemRefs = useRef(new Map<number, (element: HTMLElement | null) => void>());
  const cells = useRef(new Map<string, HTMLElement>());
  const cellRefs = useRef(new Map<string, (element: HTMLElement | null) => void>());
  const typeahead = useRef<TypeaheadUtils.Buffer>({ query: '', at: 0 });

  const focusItem = useCallback((index: number) => {
    items.current[index]?.focus();
  }, []);

  /**
   * True only while the hook is moving focus itself: `focus()` fires synchronously, so the `onFocus` it
   * causes would otherwise report the landing cell as a fresh request and throw away the column asked for.
   */
  const movingFocus = useRef(false);

  const focusCell = useCallback((row: number, column: number) => {
    movingFocus.current = true;
    cells.current.get(`${row}:${column}`)?.focus();
    movingFocus.current = false;
  }, []);

  const activeItem = useCallback(
    () => (isGrid ? (cells.current.get(`${activeIndex}:${activeColumn}`) ?? null) : (items.current[activeIndex] ?? null)),
    [activeColumn, activeIndex, isGrid],
  );

  // Read at call time so the setter below can stay stable while still refusing a move that
  // resolves to the cell already active.
  const activeCell = useLatest<RovingCell>({ row: activeIndex, column: activeColumn });
  const desiredColumn = useLatest(rawColumn);
  const cellChange = useLatest(onActiveCellChange);
  const width = useLatest(widthOf);
  const cellAt = useLatest(cellAtColumn);
  const columnStart = useLatest(columnIndexOf);

  /**
   * The move both the public setter and the keyboard go through: the column *asked for* is remembered, and
   * the cell covering it becomes active.
   */
  const setActiveAtColumn = useCallback(
    (row: number, columnIndex: number, details: ChangeDetails<RovingFocusReason>): RovingCell => {
      const targetRow = clamp(row, count - 1);
      const desired = Math.max(0, columnIndex);
      const targetColumn = targetRow < 0 ? -1 : cellAt.current(targetRow, desired);
      const current = activeCell.current;

      if (targetRow === current.row && targetColumn === current.column) return current;

      setIndex(targetRow, details);
      setRawColumn(desired);
      cellChange.current?.({ row: targetRow, column: targetColumn }, details);

      return { row: targetRow, column: targetColumn };
    },
    [activeCell, cellAt, cellChange, count, setIndex],
  );

  const setActiveCell = useCallback(
    (row: number, column: number, details: ChangeDetails<RovingFocusReason>): RovingCell => {
      const targetRow = clamp(row, count - 1);
      // A cell ordinal only means a column once it is one the row really holds, so it is clamped
      // here rather than carried out of range the way a desired column is.
      const cell = targetRow < 0 ? -1 : clamp(Math.max(0, column), width.current(targetRow) - 1);

      return setActiveAtColumn(targetRow, cell < 0 ? 0 : (columnStart.current?.(targetRow, cell) ?? cell), details);
    },
    [columnStart, count, setActiveAtColumn, width],
  );

  const cellProps = useCallback(
    (row: number, column: number): RovingFocusItemProps => {
      const key = `${row}:${column}`;

      if (!cellRefs.current.has(key)) {
        // One callback ref per cell, as in `itemProps` — but dropped again when the cell unmounts,
        // because a virtualized grid scrolls through far more cells than it ever has on screen.
        cellRefs.current.set(key, (element: HTMLElement | null) => {
          if (element) {
            cells.current.set(key, element);
          } else {
            cells.current.delete(key);
            cellRefs.current.delete(key);
          }
        });
      }

      return {
        ref: cellRefs.current.get(key)!,
        tabIndex: row === activeIndex && column === activeColumn ? 0 : -1,
        // Focus events bubble, so this also fires for a widget inside the cell — which is right:
        // clicking into a filter box makes that cell the one the arrow keys carry on from.
        onFocus: () => {
          if (movingFocus.current) return;

          setActiveCell(row, column, { reason: 'focus' });
        },
      };
    },
    [activeColumn, activeIndex, setActiveCell],
  );

  const itemProps = useCallback(
    (index: number): RovingFocusItemProps => {
      if (!itemRefs.current.has(index)) {
        // One callback ref per index, kept for the life of the hook: a fresh function on every
        // render makes React detach and reattach every item on every render, which loses focus.
        itemRefs.current.set(index, (element: HTMLElement | null) => {
          items.current[index] = element;
        });
      }

      return {
        ref: itemRefs.current.get(index)!,
        // Roving tabindex: exactly one item is in the tab order, so Tab enters and leaves the list
        // in one press instead of walking through every option in it.
        tabIndex: focusItems ? (index === activeIndex ? 0 : -1) : undefined,
        onFocus: focusItems ? () => setIndex(index, { reason: 'focus' }) : undefined,
      };
    },
    [activeIndex, focusItems, setIndex],
  );

  const onGridKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const { row, column } = activeCell.current;

      // Every key below is one the grid consumes whether or not it has anywhere to go: an arrow
      // at the last row must not fall through to the page and scroll it instead.
      const move = (targetRow: number, targetColumn: number) => {
        event.preventDefault();
        const moved = setActiveCell(targetRow, targetColumn, { reason: 'keyboard', event });
        if (focusItems) focusCell(moved.row, moved.column);
      };

      // Sideways moves count cells, because that is what is next to you. Vertical ones travel in
      // column-index space from the column the user asked for, which is what carries a position
      // both past a row too narrow to hold it and under a cell spanning several of them.
      const moveRow = (targetRow: number) => {
        event.preventDefault();
        const moved = setActiveAtColumn(targetRow, desiredColumn.current, { reason: 'keyboard', event });
        if (focusItems) focusCell(moved.row, moved.column);
      };

      const toEnd = Number.MAX_SAFE_INTEGER;

      // A sideways arrow follows the *reading* order, which APG asks for and a right-to-left grid
      // reverses: there, ArrowLeft is the next cell. Asked only of the two keys that care about it.
      const inlineStep = () => (isRtl(event.currentTarget) ? -1 : 1);

      switch (event.key) {
        case 'ArrowRight':
          return move(row, column + inlineStep());
        case 'ArrowLeft':
          return move(row, column - inlineStep());
        case 'ArrowDown':
          return moveRow(row + 1);
        case 'ArrowUp':
          return moveRow(row - 1);
        case 'Home':
          return event.ctrlKey || event.metaKey ? move(0, 0) : move(row, 0);
        case 'End':
          return event.ctrlKey || event.metaKey ? move(count - 1, toEnd) : move(row, toEnd);
        case 'PageDown':
          return moveRow(row + pageSize);
        case 'PageUp':
          return moveRow(row - pageSize);
      }
    },
    [activeCell, count, desiredColumn, focusCell, focusItems, pageSize, setActiveAtColumn, setActiveCell],
  );

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.defaultPrevented) return;

      if (isGrid) {
        onGridKeyDown(event);
        return;
      }

      const vertical = orientation !== 'horizontal';
      const horizontal = orientation !== 'vertical';
      const buffer = typeahead.current;
      const bufferIsOpen = TypeaheadUtils.isOpen(buffer, event.timeStamp);

      const move = (target: number, reason: RovingFocusReason) => {
        if (target === -1 || target === activeIndex) return;

        event.preventDefault();
        setIndex(target, { reason, event });
        if (focusItems) focusItem(target);
      };

      // Sideways first, because which item it moves to depends on the reading order: in a
      // right-to-left list ArrowLeft is the next one. The vertical axis never flips.
      if (horizontal && (event.key === 'ArrowRight' || event.key === 'ArrowLeft')) {
        const forward = (event.key === 'ArrowRight') !== isRtl(event.currentTarget);
        move(step(activeIndex, forward ? 1 : -1, count, loop, isDisabled), 'keyboard');
        return;
      }

      if (event.key === 'ArrowDown' && vertical) {
        move(step(activeIndex, 1, count, loop, isDisabled), 'keyboard');
        return;
      }

      if (event.key === 'ArrowUp' && vertical) {
        move(step(activeIndex, -1, count, loop, isDisabled), 'keyboard');
        return;
      }

      if (event.key === 'Home') {
        move(edge(1, count, isDisabled), 'keyboard');
        return;
      }

      if (event.key === 'End') {
        move(edge(-1, count, isDisabled), 'keyboard');
        return;
      }

      // Space belongs to the typeahead while a buffer is open — someone searching for "New York"
      // means the space between the words, not "choose whatever is highlighted".
      if (event.key === 'Enter' || (event.key === ' ' && !(bufferIsOpen && textOf))) {
        if (!onSelect || activeIndex === -1) return;

        event.preventDefault();
        onSelect(activeIndex, event);
        return;
      }

      if (textOf && TypeaheadUtils.isPrintable(event)) {
        const query = TypeaheadUtils.push(buffer, event.key, event.timeStamp);

        move(TypeaheadUtils.target(query, activeIndex, count, textOf, isDisabled), 'typeahead');
      }
    },
    [activeIndex, count, focusItem, focusItems, isDisabled, isGrid, loop, onGridKeyDown, onSelect, orientation, setIndex, textOf],
  );

  return { activeIndex, activeColumn, setActiveIndex: setIndex, setActiveCell, onKeyDown, itemProps, cellProps, activeItem };
}
