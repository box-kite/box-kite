import { ColumnDateFormat } from '../contracts/dataGridContract';
import ColumnModel from '../models/columnModel';
import { isDateEditor } from '../models/editModel';
import useDateParts from '../useDateParts';

/**
 * How a column's value is written as a date, or `null` when it is not one: the column says so, a date editor
 * says so, or a `Date` does — which could not be rendered as it stands.
 */
export function dateFormatOf<TRow>(column: ColumnModel<TRow>, value: unknown): ColumnDateFormat | null {
  if (column.def.dateFormat) return column.def.dateFormat;

  const { editor } = column.def;
  const type = typeof editor === 'object' ? editor.type : editor;
  if (type && isDateEditor(type)) return type as 'date' | 'time' | 'datetime';

  return value instanceof Date ? 'datetime' : null;
}

interface Props {
  value: unknown;
  format: ColumnDateFormat;
}

/** A cell's date, once the date parts have arrived — and until then the value as it stands, which a server writes too. */
export default function DataGridDateValue(props: Props) {
  const { value, format } = props;
  const parts = useDateParts(true);
  if (parts) return <parts.DateValue value={value} format={format} />;

  return <>{value instanceof Date ? value.toISOString() : value === null || value === undefined ? '' : String(value)}</>;
}

(DataGridDateValue as React.FunctionComponent).displayName = 'DataGridDateValue';
