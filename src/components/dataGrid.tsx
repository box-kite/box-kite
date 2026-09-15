import { forwardRef, Ref, RefAttributes, useImperativeHandle, useLayoutEffect, useRef } from 'react';
import Box from '../box';
import DataGridBottomBar from './dataGrid/components/dataGridBottomBar';
import DataGridContent from './dataGrid/components/dataGridContent';
import DataGridDataSourceError from './dataGrid/components/dataGridDataSourceError';
import DataGridTopBar from './dataGrid/components/dataGridTopBar';
import { DataGridHandle, DataGridProps } from './dataGrid/contracts/dataGridContract';
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
 * @a11y With `def.treeData` it is a `role="treegrid"` instead, and its rows carry `aria-level`,
 * `aria-posinset`, `aria-setsize` and — valid only inside a treegrid — `aria-expanded`. The rows under a
 * row are its siblings in the same rowgroup rather than its children, so those four are all a screen
 * reader has to go on.
 * @a11y One cell is the tab stop, as APG's grid pattern specifies: the grid is entered once and the arrow
 * keys move inside it, rather than every cell being a stop of its own.
 * @a11y A grid is not named by the rows in it — pass `def.title` and the grid points `aria-labelledby`
 * at it. Everything the grid draws for itself is named after what it acts on ("Select row 4",
 * "Filter Country"), and a selection change is announced through a `role="status"` region.
 * @a11y Each column resizer is a `role="separator"` — APG's window splitter — carrying the column's
 * width on `aria-valuenow`, so the new width is read out as it changes.
 * @keyboard Tab — Enters the grid at one cell, not at every cell. Shift+Tab leaves it.
 * @keyboard Right / Left — One cell along the row. At either end focus stays where it is.
 * @keyboard (On a tree's own column) Right / Left — Opens a shut row and shuts an open one; on a row that
 * is already shut, Left steps out to its parent. Both follow the reading order, so they swap in a
 * right-to-left grid, and on every other column they are the ordinary move along the row.
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
function DataGridImpl<TRow extends object>(props: DataGridProps<TRow>, ref: Ref<DataGridHandle>) {
  const grid = useGrid(props);
  const containerRef = useRef<HTMLDivElement>(null);

  // A `ref` on a grid is the export surface, not the element — the model behind it is the library's to
  // change, so what is published is the three things a caller has a use for.
  useImperativeHandle(
    ref,
    () => ({
      get element() {
        return containerRef.current;
      },
      exportCsv: grid.exportCsv,
      exportXlsx: grid.exportXlsx,
      refresh: grid.refresh,
    }),
    [grid],
  );

  // Everything the grid reads itself comes off here, so what is left is the Box half — style props, the
  // `props` bag, a className — and a new grid prop cannot leak onto the element by being forgotten.
  const {
    component,
    data,
    def,
    loading,
    filters,
    globalFilterValue,
    columnFilters,
    expandedRowKeys,
    page,
    pageSize,
    onSelectedRowKeysChange,
    onSelectionChange,
    onGlobalFilterChange,
    onColumnFiltersChange,
    onExpandedRowKeysChange,
    onPaginationChange,
    onPageChange,
    onPageSizeChange,
    onSortingChange,
    onSortChange,
    onServerStateChange,
    style,
    ...boxProps
  } = props;

  // Expose the container element so the resize drag can write width CSS variables straight to it (no
  // React re-render per move). The width the columns are sized to is measured on the scroller instead,
  // in `DataGridContent` — the vertical scrollbar sits between the two.
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    grid.setSizingElement(el);

    return () => grid.setSizingElement(null);
  }, [grid]);

  return (
    <Box
      ref={containerRef}
      component={grid.componentName as never}
      {...boxProps}
      // The column widths are variables the grid writes per layout, so a caller's own style sits on top
      // of them rather than replacing them.
      style={{ ...grid.sizes.value, ...style }}
    >
      {grid.props.def.topBar && <DataGridTopBar grid={grid} />}

      {/* Above the rows rather than among them: a failed block is about the query, and inside the
          scroller the strip sat at the top of a million rows' worth of content. */}
      <DataGridDataSourceError grid={grid} />

      <DataGridContent grid={grid} />

      {grid.props.def.bottomBar && <DataGridBottomBar grid={grid} />}

      {/* Selecting a row changes a checkbox somewhere off in the grid and nothing else: without a
          live region the count is invisible unless you go looking for it. */}
      <VisuallyHidden props={{ role: 'status' }}>{grid.selectionAnnouncement}</VisuallyHidden>
    </Box>
  );
}

const DataGrid = forwardRef(DataGridImpl) as <TRow extends object>(
  props: DataGridProps<TRow> & RefAttributes<DataGridHandle>,
) => React.ReactElement | null;

(DataGridImpl as React.FunctionComponent).displayName = 'DataGrid';

export default DataGrid;
