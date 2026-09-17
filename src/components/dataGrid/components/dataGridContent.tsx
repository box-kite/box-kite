import { useCallback, useEffect, useRef, useState } from 'react';
import Box from '../../../box';
import { useIsomorphicLayoutEffect } from '../../../react/effects';
import GridNavigationContext from '../gridNavigationContext';
import GridModel from '../models/gridModel';
import useGridNavigation from '../useGridNavigation';
import DataGridBody from './dataGridBody';
import DataGridEmptyColumns from './dataGridEmptyColumns';
import DataGridHeader from './dataGridHeader';
import DataGridLoader from './dataGridLoader';

interface Props<TRow> {
  grid: GridModel<TRow>;
}

export default function DataGridContent<TRow>(props: Props<TRow>) {
  const { grid } = props;

  const scrollerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const rafRef = useRef<number | null>(null);

  const handleScroll = useCallback((event: React.UIEvent) => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }

    rafRef.current = requestAnimationFrame(() => {
      setScrollTop((event.target as HTMLDivElement).scrollTop);
      rafRef.current = null;
    });
  }, []);

  // A keyboard jump writes the scroll position straight through, ahead of the animation frame the
  // pointer path can afford: the row has to be rendered by the time focus goes looking for it.
  const { navigation, onKeyDown } = useGridNavigation({ grid, scrollerRef, scrollTop, onScrollTo: setScrollTop });

  const { source } = grid;
  const { queryVersion } = source;

  // A new query has no scroll position worth preserving — the rows underneath it are different rows. The
  // DOM is written rather than the state: the scroll event that follows updates `scrollTop` on its own,
  // and it runs before the fetch effect below reads the element, so no block of the old view is asked for.
  useIsomorphicLayoutEffect(() => {
    if (source.enabled && scrollerRef.current) scrollerRef.current.scrollTop = 0;
  }, [source, queryVersion]);

  // Where the rows come from when the grid fetches its own: the viewport says what is wanted and the
  // model decides what that costs. Read off the element rather than off `scrollTop`, which is one
  // animation frame behind a scroll and a whole commit behind the reset above.
  useEffect(() => {
    if (!source.enabled) return;

    const { startIndex, take } = grid.viewport.window(scrollerRef.current?.scrollTop ?? 0);

    source.request(startIndex, startIndex + take);
  }, [grid, source, queryVersion, scrollTop, grid.totalRowCount, grid.page, grid.pageSize, grid.expansionVersion]);

  // A drag that leaves the grid — or the window — still has to end, so the release is listened for where
  // it lands rather than on a cell. Only while one is running: nothing is bound by a grid at rest.
  const { range } = grid;
  const { isDragging } = range;

  useEffect(() => {
    if (!isDragging) return;

    window.addEventListener('pointerup', range.endDrag);
    window.addEventListener('pointercancel', range.endDrag);

    return () => {
      window.removeEventListener('pointerup', range.endDrag);
      window.removeEventListener('pointercancel', range.endDrag);
    };
  }, [isDragging, range]);

  // The width the flexible columns are distributed across is the scroller's, not the grid container's:
  // the vertical scrollbar sits between the two, so measuring the container made every scrolling grid
  // lay its columns out 15px too wide and show a horizontal scrollbar it did not need (bug #156).
  // `clientWidth` rather than `contentRect`, because excluding the scrollbar is the whole point.
  useIsomorphicLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const observer = new ResizeObserver(() => grid.setContainerWidth(el.clientWidth));

    observer.observe(el);
    return () => observer.disconnect();
  }, [grid]);

  if (!grid.hasVisibleColumns) {
    return <DataGridEmptyColumns grid={grid} />;
  }

  return (
    <GridNavigationContext.Provider value={navigation}>
      <Box
        ref={scrollerRef}
        component={`${grid.componentName}.content` as never}
        // `auto`, not `scroll`: a grid whose columns fit reserved a scrollbar track it never used. Naming
        // one axis is what makes the other one scroll — `overflow` computes a `visible` companion to an
        // `auto` up to `auto`, which is where the virtualized body's vertical scrolling comes from.
        overflowX="auto"
        // The columns are sized to this element, so its width has to hold still: without the gutter, the
        // vertical scrollbar arriving (a detail row opening, a filter clearing) takes 15px away and the
        // columns reflow a frame later — a horizontal scrollbar flashing in between. Only where the grid
        // can scroll vertically at all; `visibleRowsCount: 'all'` never does, and would just lose 15px.
        scrollbarGutter={grid.viewport.showAll ? undefined : 'stable'}
        style={{ willChange: 'scroll-position' }}
        props={{
          // A tree is a `treegrid`: it is what makes `aria-level` and a row's `aria-expanded` valid,
          // and axe calls either of them on a plain `grid` a serious violation (bug #162).
          role: grid.tree.enabled ? 'treegrid' : 'grid',
          'aria-rowcount': navigation.rowCount,
          'aria-colcount': navigation.columnCount,
          'aria-multiselectable': grid.props.def.rowSelection || range.enabled ? true : undefined,
          'aria-labelledby': grid.props.def.title ? grid.titleId : undefined,
          'aria-busy': grid.props.loading || source.isLoading ? true : undefined,
          onScroll: handleScroll,
          onKeyDown,
          // Ctrl+C arrives as the browser's own copy event, which is the one place `clipboardData` is
          // writable with no permission — and the one that still lets a text selection win.
          onCopy: range.onCopy,
          // And Ctrl+V as the paste event, which carries the text with no permission to ask for. One
          // reaching an open editor bubbles through here too, so the range hands that one back.
          onPaste: range.onPaste,
        }}
      >
        <DataGridHeader grid={grid} />

        {(grid.props.loading || source.isLoading) && <DataGridLoader grid={grid} />}

        <DataGridBody grid={grid} scrollTop={scrollTop} />
      </Box>
    </GridNavigationContext.Provider>
  );
}

(DataGridContent as React.FunctionComponent).displayName = 'DataGridContent';
