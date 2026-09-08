import { useLayoutEffect, useRef } from 'react';
import Box from '../box';
import DataGridBottomBar from './dataGrid/components/dataGridBottomBar';
import DataGridContent from './dataGrid/components/dataGridContent';
import DataGridTopBar from './dataGrid/components/dataGridTopBar';
import { DataGridProps } from './dataGrid/contracts/dataGridContract';
import useGrid from './dataGrid/useGrid';
import VisuallyHidden from './visuallyHidden';

/**
 * The data grid: sorting, filtering, grouping, pinned columns, row selection, detail rows, pagination and
 * virtualization, with every part of it styled through the `datagrid` component tree rather than a
 * stylesheet of its own.
 *
 * @pattern https://www.w3.org/WAI/ARIA/apg/patterns/grid/
 * @a11y `role="grid"` with `aria-rowcount`/`aria-colcount` over the whole data set and
 * `aria-rowindex`/`aria-colindex` on what is rendered, so virtualization does not renumber the grid.
 * @a11y One cell is the tab stop, as APG's grid pattern specifies: the grid is entered once and the arrow
 * keys move inside it, rather than every cell being a stop of its own.
 * @a11y A grid is not named by the rows in it — pass `def.title` and the grid points `aria-labelledby`
 * at it. Everything the grid draws for itself is named after what it acts on ("Select row 4",
 * "Filter Country"), and a selection change is announced through a `role="status"` region.
 * @a11y Each column resizer is a `role="separator"` — APG's window splitter — carrying the column's
 * width on `aria-valuenow`, so the new width is read out as it changes.
 * @keyboard Tab — Enters the grid at one cell, not at every cell. Shift+Tab leaves it.
 * @keyboard Right / Left — One cell along the row. At either end focus stays where it is.
 * @keyboard Down / Up — One row, keeping the column: through a group row or a detail panel with fewer
 * cells, and through a grouped header whose cells cover several columns each.
 * @keyboard Home / End — The first or last cell of the row.
 * @keyboard Ctrl + Home / End — The first or last cell of the whole grid, scrolling there if it has not
 * been rendered yet.
 * @keyboard PageDown / PageUp — A screenful of rows at a time.
 * @keyboard Enter / Space — Sorts, on a sortable column header. Anywhere else, steps into the cell's own
 * control.
 * @keyboard F2 — Steps into the cell's control even on a header, where Enter is spoken for by the sort.
 * @keyboard Escape — Hands the keyboard back from that control to the cell.
 * @keyboard (On a column resizer) Tab / F2 — Reaches the resizer of the header cell focus is on. Escape
 * hands the keyboard back to the cell.
 * @keyboard (On a column resizer) Right / Left — Moves the separator 16px, which widens or narrows the
 * column exactly as dragging it would.
 * @keyboard (On a column resizer) Home / End — The narrowest the grid allows, or as wide as the grid
 * itself.
 */
export default function DataGrid<TRow extends object>(props: DataGridProps<TRow>) {
  const grid = useGrid(props);
  const containerRef = useRef<HTMLDivElement>(null);

  // Track container width for flexible column sizing, and expose the container element so
  // the resize drag can write width CSS variables straight to it (no React re-render per move).
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    grid.setSizingElement(el);

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      grid.setContainerWidth(width);
    });

    observer.observe(el);
    return () => {
      observer.disconnect();
      grid.setSizingElement(null);
    };
  }, [grid]);

  return (
    <Box ref={containerRef} component={grid.componentName as never} style={grid.sizes.value}>
      {grid.props.def.topBar && <DataGridTopBar grid={grid} />}

      <DataGridContent grid={grid} />

      {grid.props.def.bottomBar && <DataGridBottomBar grid={grid} />}

      {/* Selecting a row changes a checkbox somewhere off in the grid and nothing else: without a
          live region the count is invisible unless you go looking for it. */}
      <VisuallyHidden props={{ role: 'status' }}>{grid.selectionAnnouncement}</VisuallyHidden>
    </Box>
  );
}

(DataGrid as React.FunctionComponent).displayName = 'DataGrid';
