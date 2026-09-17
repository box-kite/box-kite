import { useMemo } from 'react';
import DataGrid from '../../src/components/dataGrid';
import { ColumnFilters, ColumnType } from '../../src/components/dataGrid/contracts/dataGridContract';
import { BenchRow, FILTER_COUNTRY, GROUP_COLUMN } from './benchData';
import { BenchGridProps, COLUMN_WIDTH, ROW_HEIGHT, VISIBLE_ROWS } from './gridImpl';

const columns: ColumnType<BenchRow>[] = [
  { key: 'id', header: 'ID', width: 72, align: 'end' },
  { key: 'firstName', header: 'First name', width: COLUMN_WIDTH },
  { key: 'lastName', header: 'Last name', width: COLUMN_WIDTH },
  { key: 'email', header: 'Email', width: 220 },
  { key: 'country', header: 'Country', width: COLUMN_WIDTH, filterable: true },
  { key: 'city', header: 'City', width: COLUMN_WIDTH },
  { key: 'department', header: 'Department', width: 170 },
  { key: 'jobTitle', header: 'Job title', width: COLUMN_WIDTH },
  { key: 'status', header: 'Status', width: 110 },
  { key: 'priority', header: 'Priority', width: 110 },
  { key: 'salary', header: 'Salary', width: 110, align: 'end', aggregate: 'sum' },
  { key: 'bonus', header: 'Bonus', width: 110, align: 'end', aggregate: 'sum' },
  { key: 'score', header: 'Score', width: 90, align: 'end', aggregate: 'avg' },
  { key: 'progress', header: 'Progress', width: 100, align: 'end' },
  { key: 'tickets', header: 'Tickets', width: 100, align: 'end' },
  { key: 'rating', header: 'Rating', width: 90, align: 'end' },
  { key: 'startDate', header: 'Start date', width: 120 },
  { key: 'lastLogin', header: 'Last login', width: 120 },
  { key: 'active', header: 'Active', width: 90 },
  { key: 'notes', header: 'Notes', width: 240 },
];

const countryFilter: ColumnFilters<BenchRow> = { country: { type: 'text', value: FILTER_COUNTRY } };

export default function BoxKiteGrid({ data, filtered, grouped }: BenchGridProps) {
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
