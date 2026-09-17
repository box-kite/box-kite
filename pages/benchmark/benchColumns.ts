import { BenchRow } from './benchData';
import { COLUMN_WIDTH } from './gridImpl';

/**
 * The twenty columns, in the terms every library can express: a key, a heading, a width, whether the
 * value is a number and what the grouping scenario totals. Each implementation turns this into its own
 * column definition, so the grids are measured rendering the same table rather than four similar ones.
 */
export interface BenchColumn {
  key: keyof BenchRow;
  header: string;
  width: number;
  /** Right-aligned, and sorted as a number by the libraries that infer a comparator from the type. */
  numeric?: boolean;
  /** What a group row shows for this column, where the tier being measured can aggregate at all. */
  aggregate?: 'sum' | 'avg';
}

export const benchColumns: readonly BenchColumn[] = [
  { key: 'id', header: 'ID', width: 72, numeric: true },
  { key: 'firstName', header: 'First name', width: COLUMN_WIDTH },
  { key: 'lastName', header: 'Last name', width: COLUMN_WIDTH },
  { key: 'email', header: 'Email', width: 220 },
  { key: 'country', header: 'Country', width: COLUMN_WIDTH },
  { key: 'city', header: 'City', width: COLUMN_WIDTH },
  { key: 'department', header: 'Department', width: 170 },
  { key: 'jobTitle', header: 'Job title', width: COLUMN_WIDTH },
  { key: 'status', header: 'Status', width: 110 },
  { key: 'priority', header: 'Priority', width: 110 },
  { key: 'salary', header: 'Salary', width: 110, numeric: true, aggregate: 'sum' },
  { key: 'bonus', header: 'Bonus', width: 110, numeric: true, aggregate: 'sum' },
  { key: 'score', header: 'Score', width: 90, numeric: true, aggregate: 'avg' },
  { key: 'progress', header: 'Progress', width: 100, numeric: true },
  { key: 'tickets', header: 'Tickets', width: 100, numeric: true },
  { key: 'rating', header: 'Rating', width: 90, numeric: true },
  { key: 'startDate', header: 'Start date', width: 120 },
  { key: 'lastLogin', header: 'Last login', width: 120 },
  { key: 'active', header: 'Active', width: 90 },
  { key: 'notes', header: 'Notes', width: 240 },
];

/**
 * The column the sort scenario presses, and the heading a driver looks for. A text column near the left
 * edge on purpose: two of the four grids virtualize columns, so a header beyond the right-hand edge of
 * the viewport is not in the DOM to be pressed — the press landed on nothing and timed a bare paint.
 */
export const SORT_COLUMN = 'lastName';
export const SORT_HEADER = 'Last name';
