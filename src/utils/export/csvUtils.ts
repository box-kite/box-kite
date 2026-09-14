/**
 * CSV, to RFC 4180, plus the two things a spreadsheet adds to it: a byte-order mark, without which Excel
 * reads UTF-8 as the local code page and mangles every accented name, and the leading characters that
 * make a *value* into a formula.
 */
namespace CsvUtils {
  export interface Options {
    /** The field separator. A semicolon is what a spreadsheet expects in a locale using a decimal comma. */
    delimiter?: string;
    /**
     * Prefix a value beginning `=`, `+`, `-` or `@` with a quote, so a spreadsheet reads it as text.
     * On by default: a cell somebody typed is data, and a downloaded file that runs it is CSV injection.
     */
    escapeFormulas?: boolean;
  }

  /** What Excel needs at the top of the file to read the rest of it as UTF-8. */
  export const BOM = '﻿';

  const FORMULA = /^[=+\-@\t\r]/;

  /** One value as a field: quoted when it holds a delimiter, a quote or a newline, and never otherwise. */
  export function field(value: unknown, options: Options = {}): string {
    if (value === null || value === undefined) return '';

    let text = value instanceof Date ? value.toISOString() : String(value);

    // Text only: `-2` is a formula when somebody typed it into a cell and a number when it came from one.
    // The quote goes on before the quoting does, so the escape itself cannot be what needs escaping.
    if (options.escapeFormulas !== false && typeof value === 'string' && FORMULA.test(text)) text = `'${text}`;

    const delimiter = options.delimiter ?? ',';

    return text.includes(delimiter) || /["\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  /** The whole file. Rows are joined with CRLF, which is what the RFC specifies and what Excel writes. */
  export function csv(rows: unknown[][], options: Options = {}): string {
    const delimiter = options.delimiter ?? ',';

    return BOM + rows.map((row) => row.map((value) => field(value, options)).join(delimiter)).join('\r\n');
  }
}

export default CsvUtils;
