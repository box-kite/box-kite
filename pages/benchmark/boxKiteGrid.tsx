import { useMemo } from 'react';
import { version } from '../../package.json';
import DataGrid from '../../src/components/dataGrid';
import { ColumnFilters, ColumnType } from '../../src/components/dataGrid/contracts/dataGridContract';
import { benchColumns, SORT_HEADER } from './benchColumns';
import { BenchRow, FILTER_COUNTRY, GROUP_COLUMN } from './benchData';
import { BenchGridProps, GridImpl, ROW_HEIGHT, VISIBLE_ROWS } from './gridImpl';

const columns: ColumnType<BenchRow>[] = benchColumns.map((column) => ({
  key: column.key,
  header: column.header,
  width: column.width,
  align: column.numeric ? 'end' : undefined,
  aggregate: column.aggregate,
  filterable: column.key === 'country',
}));

const countryFilter: ColumnFilters<BenchRow> = { country: { type: 'text', value: FILTER_COUNTRY } };

function BoxKiteGrid({ data, filtered, grouped }: BenchGridProps) {
  // Every one of these is read on each render and a new object would re-run the grid's own memos, which
  // is the cost the benchmark is trying to measure rather than cause.
  const def = useMemo(
    () => ({
      rowKey: 'id' as const,
      columns,
      rowHeight: ROW_HEIGHT,
      visibleRowsCount: VISIBLE_ROWS,
      groupBy: grouped ? [GROUP_COLUMN] : undefined,
      groupDefaultExpanded: grouped,
    }),
    [grouped],
  );

  return <DataGrid data={data} def={def} columnFilters={filtered ? countryFilter : undefined} />;
}

/** Box Kite's own `DataGrid`, and the two gestures the scenarios need that a prop cannot express. */
const impl: GridImpl = {
  id: 'box-kite',
  label: 'Box Kite',
  version,
  Grid: BoxKiteGrid,
  scroller: (container) => container.querySelector<HTMLElement>('[role="grid"]'),
  // The filter row's cells carry the role too, and sit in the sticky header — which is why the probe
  // only ever hit-tests the bottom half of the grid.
  rowSelector: '[role="gridcell"]',
  sort: (container) => {
    const header = [...container.querySelectorAll<HTMLElement>('[role="columnheader"]')].find((cell) =>
      cell.textContent?.startsWith(SORT_HEADER),
    );

    // The press is on the header's own inner element, which is where the sort handler sits — a press on
    // the cell would bubble away from it rather than into it.
    (header?.firstElementChild as HTMLElement | undefined)?.click();
  },
};

export default impl;
