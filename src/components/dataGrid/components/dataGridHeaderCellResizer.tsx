import { useCallback, useEffect, useRef } from 'react';
import Box from '../../../box';
import Flex from '../../flex';
import ColumnModel from '../models/columnModel';
import GridModel from '../models/gridModel';

interface Props<TRow> {
  column: ColumnModel<TRow>;
  /** The header cell this separator sits in — `aria-controls`, the pane it resizes. */
  controls: string;
}

const pageXOf = (e: MouseEvent | TouchEvent): number => ('touches' in e ? (e.touches[0]?.pageX ?? 0) : e.pageX);

/** Pixels one arrow press moves the separator. Small enough to aim with, large enough to get there. */
const RESIZE_STEP_PX = 16;

/**
 * How long after the last arrow press the widths are committed to React. Only reached when a key
 * repeat ends without a `keyup` — losing focus mid-press — since a real one commits on release.
 */
const KEY_COMMIT_MS = 150;

/**
 * Column widths are CSS variables on one element, so a resize can be painted without React. This
 * is what keeps a drag at 60fps, and the keyboard needs it just as much: a held arrow key repeats
 * about thirty times a second, and a `notify()` per press re-renders every row in the grid.
 */
function paintSizes<TRow>(grid: GridModel<TRow>): void {
  const el = grid.sizingElement;

  if (!el) return;

  Object.entries(grid.sizes.value).forEach(([name, value]) => el.style.setProperty(name, value));
}

/**
 * The column resizer, which is APG's window splitter: a `separator` with a value in pixels, its own tab
 * stop, and the arrows that move it. The drag and the keyboard run the same model at the same cost — each
 * step paints the widths straight onto the grid element and React is told once, when the gesture ends
 * (a press is a gesture too; it ends on `keyup`).
 */
export default function DataGridHeaderCellResizer<TRow>(props: Props<TRow>) {
  const { column, controls } = props;
  const resizerStyle = column.grid.resizerStyle;
  const headerCell = column.headerCell;

  // The model owns the resize math (beginResize/applyResize/endResize). This adapter wires the
  // DOM drag and, since column widths are driven entirely by CSS variables on the grid container,
  // writes the updated vars straight to that element — bypassing React re-renders mid-drag.
  // resizeMode 'smooth' batches the writes to one per animation frame; 'instant' writes on every
  // pointer move. endResize() commits the final widths back into React state.
  const startResize = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const { grid } = column;

      // A drag is not a visit. Without this the pointer focuses the separator, which leaves a
      // keyboard ring behind after the mouse has gone and re-renders the grid to move the roving
      // tab stop. Mouse only — `preventDefault` on a touch start is what stops the page scrolling.
      if (e.type === 'mousedown') e.preventDefault();

      column.beginResize(pageXOf(e.nativeEvent));

      const controller = new AbortController();
      const { signal } = controller;

      let frame = 0;
      let latestX = pageXOf(e.nativeEvent);

      const paint = () => {
        column.applyResize(latestX);
        paintSizes(grid);
      };

      // 'instant': paint synchronously on every move so the column tracks the cursor with no
      // added latency. 'smooth': coalesce moves to one paint per animation frame (~60fps).
      const move =
        grid.resizeMode === 'instant'
          ? (ev: MouseEvent | TouchEvent) => {
              latestX = pageXOf(ev);
              paint();
            }
          : (ev: MouseEvent | TouchEvent) => {
              latestX = pageXOf(ev);
              if (!frame) {
                frame = requestAnimationFrame(() => {
                  frame = 0;
                  paint();
                });
              }
            };

      const end = () => {
        controller.abort();
        if (frame) cancelAnimationFrame(frame);
        paint(); // flush the final pointer position
        column.endResize(); // single notify → React reconciles to the committed widths
      };

      window.addEventListener('mousemove', move, { signal });
      window.addEventListener('touchmove', move, { signal });
      window.addEventListener('mouseup', end, { signal });
      window.addEventListener('touchend', end, { signal });
    },
    [column],
  );

  // Set while a key gesture is in flight, so a repeat that ends without a `keyup` still commits.
  const commitTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const keyFrame = useRef(0);

  /**
   * The same coalescing the drag uses: a held arrow repeats faster than the screen refreshes, and
   * every paint restyles every cell in the grid, so the repeats inside one frame collapse to one.
   */
  const paintByKey = useCallback(() => {
    const { grid } = column;

    if (grid.resizeMode === 'instant') {
      paintSizes(grid);
      return;
    }

    if (keyFrame.current) return;

    keyFrame.current = requestAnimationFrame(() => {
      keyFrame.current = 0;
      paintSizes(grid);
    });
  }, [column]);

  const commitResize = useCallback(() => {
    if (commitTimer.current === undefined) return;

    clearTimeout(commitTimer.current);
    commitTimer.current = undefined;

    if (keyFrame.current) {
      cancelAnimationFrame(keyFrame.current);
      keyFrame.current = 0;
    }

    column.endResize(); // the single notify → React reconciles to the widths already on screen
  }, [column]);

  useEffect(
    () => () => {
      clearTimeout(commitTimer.current);
      if (keyFrame.current) cancelAnimationFrame(keyFrame.current);
    },
    [],
  );

  const resizeByKey = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
          column.moveResizer(RESIZE_STEP_PX);
          break;
        case 'ArrowLeft':
          column.moveResizer(-RESIZE_STEP_PX);
          break;
        case 'Home':
          column.resizeWidthTo(headerCell.minWidth);
          break;
        case 'End':
          column.resizeWidthTo(headerCell.maxWidth);
          break;
        default:
          return;
      }

      // The grid leaves every key alone while focus is inside a cell, but the scroller does not:
      // Home and End would scroll it sideways underneath the resize nobody could then see.
      e.preventDefault();

      paintByKey();
      clearTimeout(commitTimer.current);
      commitTimer.current = setTimeout(commitResize, KEY_COMMIT_MS);
    },
    [column, commitResize, headerCell, paintByKey],
  );

  return (
    <Flex
      height="fit"
      ai="center"
      position="absolute"
      insetEnd={column.pin === 'END' ? undefined : 0}
      insetStart={column.pin !== 'END' ? undefined : 0}
      py={3}
    >
      <Box
        cursor="col-resize"
        px={0.75}
        mt={-6}
        className="resizer"
        height="fit"
        props={{ onMouseDown: startResize, onTouchStart: startResize }}
      >
        <Box
          component={`${column.grid.componentName}.header.cell.resizer` as never}
          opacity={resizerStyle !== 'visible' ? 0 : undefined}
          group={resizerStyle === 'hover' ? ({ 'header-cell/hover': { opacity: 1 } } as never) : undefined}
          props={{
            role: 'separator',
            'aria-label': headerCell.resizerLabel,
            'aria-controls': controls,
            // The separator itself is the vertical thing; `separator` defaults to horizontal.
            'aria-orientation': 'vertical',
            'aria-valuenow': headerCell.width,
            'aria-valuemin': headerCell.minWidth,
            'aria-valuemax': headerCell.maxWidth,
            'aria-valuetext': `${headerCell.width} pixels`,
            tabIndex: -1,
            onKeyDown: resizeByKey,
            // Where a key gesture ends, and so where the widths reach React and `aria-valuenow`
            // reaches a screen reader. The timer above is only the safety net behind this.
            onKeyUp: commitResize,
          }}
        />
      </Box>
    </Flex>
  );
}

(DataGridHeaderCellResizer as React.FunctionComponent).displayName = 'DataGridHeaderCellResizer';
