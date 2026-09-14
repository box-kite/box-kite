// The two writers, and the only module in the grid that reaches them. Nothing imports this statically:
// `GridModel.exportCsv`/`exportXlsx` load it with `import()` on the first press, so a grid that is never
// exported from carries neither format.
import CsvUtils from '../../../utils/export/csvUtils';
import DownloadUtils from '../../../utils/export/downloadUtils';
import XlsxUtils from '../../../utils/export/xlsxUtils';
import { DataGridCsvOptions, DataGridXlsxOptions, ExportTable } from '../contracts/dataGridContract';

const CSV_TYPE = 'text/csv;charset=utf-8';
const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** The grid header's own greys, written out. A workbook carries one appearance, not a light and a dark one. */
const HEADER_FILL = 'F3F4F6';
const HEADER_COLOR = '111827';

/** What a cell holds once it is a value rather than something React would have rendered. */
function valueOf(value: unknown): XlsxUtils.Value {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'string') return value;
  if (value instanceof Date) return value;

  return String(value);
}

/** A date with no format shows as the five-digit serial it is stored as, so one is supplied. */
function formatOf(value: XlsxUtils.Value, columnFormat: string | undefined): string | undefined {
  if (columnFormat) return columnFormat;
  if (!(value instanceof Date)) return undefined;

  return value.getHours() || value.getMinutes() || value.getSeconds() ? 'yyyy-mm-dd hh:mm' : 'yyyy-mm-dd';
}

/** The grid as a worksheet: a bold header over frozen rows, then the table's own rows and their levels. */
export function sheetOf(table: ExportTable, options: DataGridXlsxOptions = {}, name = 'Sheet1'): XlsxUtils.Sheet {
  const headerStyle: XlsxUtils.Style = {
    bold: true,
    fill: options.headerFill ?? HEADER_FILL,
    color: options.headerColor ?? HEADER_COLOR,
  };

  const rows: XlsxUtils.Row[] = [{ cells: table.columns.map((column) => ({ value: column.header, style: headerStyle })) }];

  for (const row of table.rows) {
    const bold = row.kind !== 'data';

    rows.push({
      // The level is the table's as it stands. Excel puts a block's toggle on the nearest row above it
      // one level up (`summaryBelow="0"`), so a group row has to sit a level *above* the rows it covers —
      // shifting everything down by one for the header would put the first group's toggle on the header,
      // and leave the grand total inside the last group, hidden with it.
      level: row.level,
      hidden: row.hidden,
      collapsed: row.collapsed,
      cells: row.values.map((raw, index) => {
        const value = valueOf(raw);
        const format = formatOf(value, table.columns[index]?.format);
        // A group's own label is stepped in beside its outline level, which is what a subtotal looks like.
        const indent = row.kind === 'group' && index === 0 ? row.level : undefined;

        return { value, style: bold || format || indent ? { bold, format, indent } : undefined };
      }),
    });
  }

  return {
    name,
    widths: table.columns.map((column) => column.width),
    rows,
    freeze: 1,
    // Filter buttons over a sheet whose rows are an outline filter the groups away with the data.
    autoFilter: !table.rows.some((row) => row.kind !== 'data'),
  };
}

/** The workbook's bytes, for a caller that wants to upload the file rather than save it. */
export function xlsx(table: ExportTable, options: DataGridXlsxOptions = {}, name?: string): Uint8Array<ArrayBuffer> {
  return XlsxUtils.workbook(sheetOf(table, options, name));
}

/** The CSV text. Group rows are written where they sit; a file has no outline to collapse them into. */
export function csv(table: ExportTable, options: DataGridCsvOptions = {}): string {
  return CsvUtils.csv([table.columns.map((column) => column.header), ...table.rows.map((row) => row.values)], options);
}

export function downloadCsv(table: ExportTable, fileName: string, options: DataGridCsvOptions = {}): void {
  DownloadUtils.download(csv(table, options), `${fileName}.csv`, CSV_TYPE);
}

export function downloadXlsx(table: ExportTable, fileName: string, options: DataGridXlsxOptions = {}): void {
  DownloadUtils.download(xlsx(table, options, options.sheetName ?? fileName), `${fileName}.xlsx`, XLSX_TYPE);
}
