import { useCallback, useRef, useState } from 'react';
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
  const navigation = useGridNavigation({ grid, scrollerRef, scrollTop, onScrollTo: setScrollTop });

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
          role: 'grid',
          'aria-rowcount': navigation.rowCount,
          'aria-colcount': navigation.columnCount,
          'aria-multiselectable': grid.props.def.rowSelection ? true : undefined,
          'aria-labelledby': grid.props.def.title ? grid.titleId : undefined,
          'aria-busy': grid.props.loading ? true : undefined,
          onScroll: handleScroll,
          onKeyDown: navigation.onKeyDown,
        }}
      >
        <DataGridHeader grid={grid} />

        {grid.props.loading && <DataGridLoader grid={grid} />}

        <DataGridBody grid={grid} scrollTop={scrollTop} />
      </Box>
    </GridNavigationContext.Provider>
  );
}

(DataGridContent as React.FunctionComponent).displayName = 'DataGridContent';
