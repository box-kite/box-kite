import ColumnModel from '../models/columnModel';
import RowModel from '../models/rowModel';
import DataGridDateValue, { dateFormatOf } from './dataGridDateValue';

interface Props<TRow> {
  row: RowModel<TRow>;
  column: ColumnModel<TRow>;
}

/**
 * One value of a row, drawn the way its column draws it in the table: through the column's own `Cell` where
 * there is one — a badge, a sparkline, a link — so a list item and a table row never disagree.
 */
export default function DataGridListValue<TRow>(props: Props<TRow>) {
  const { row, column } = props;
  const cell = row.cells.find((c) => c.column === column);
  if (!cell) return null;

  if (column.Cell) return <column.Cell cell={cell} />;

  const { value } = cell;

  const dateFormat = dateFormatOf(column, value);
  if (dateFormat && value !== null && value !== undefined && value !== '') return <DataGridDateValue value={value} format={dateFormat} />;

  // An empty value says so: a blank under a label reads as a layout fault.
  return <>{value === null || value === undefined || value === '' ? '—' : String(value)}</>;
}

(DataGridListValue as React.FunctionComponent).displayName = 'DataGridListValue';
