import ZipUtils from './zipUtils';

/**
 * A spreadsheet, written out. An `.xlsx` is a ZIP of XML parts (ECMA-376), so the whole format is a
 * handful of strings and `ZipUtils` — which is why this library exports Excel with no dependency to
 * install and nothing added to the grid's bundle until somebody presses the button.
 *
 * What is here is the part a table needs: values that keep their type, a number format, a bold header on
 * a fill, column widths, a frozen header row, an auto-filter, and outline levels so a grouped grid opens
 * in Excel grouped. What is not here is everything else a workbook can hold — formulas, several sheets,
 * images, charts, conditional formats. This is a writer for one table, not an Excel implementation.
 */
namespace XlsxUtils {
  /** What a cell can hold. A `Date` is written as Excel's own serial number, with a date format on it. */
  export type Value = string | number | boolean | Date | null | undefined;

  /** One cell's appearance. Each distinct combination becomes one entry in the workbook's style table. */
  export interface Style {
    bold?: boolean;
    /** `RRGGBB`, the only colour spelling a workbook has — it carries no theme and no palette. */
    color?: string;
    fill?: string;
    /** An Excel number format, `'#,##0.00'` or `'yyyy-mm-dd'`. */
    format?: string;
    align?: 'left' | 'center' | 'right';
    /** Indent steps, which is how a grouped row is stepped in beside its outline level. */
    indent?: number;
  }

  export interface Cell {
    value: Value;
    style?: Style;
  }

  export interface Row {
    cells: Cell[];
    /** Outline level: 0 is top level, and a row one deeper is a child of the last row above it. */
    level?: number;
    /** Collapsed out of sight, which is how a collapsed group in the grid opens collapsed in Excel. */
    hidden?: boolean;
    /** On the summary row of a collapsed group — the row carrying the outline's own toggle. */
    collapsed?: boolean;
  }

  export interface Sheet {
    name: string;
    /** Column widths in characters, one per column; `undefined` leaves Excel's default. */
    widths: (number | undefined)[];
    rows: Row[];
    /** How many rows stay on screen when the sheet is scrolled. */
    freeze?: number;
    /** Whether the header row gets Excel's filter buttons. A grouped sheet is given none. */
    autoFilter?: boolean;
  }

  const MAIN_NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  const REL_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';

  /** Excel's own ceiling on a cell's text. Past it the file opens with an error rather than a long cell. */
  const MAX_TEXT = 32767;

  /** Excel counts days from 1899-12-30 — the 1900 system, including the leap year that never happened. */
  const EPOCH = Date.UTC(1899, 11, 30);
  const DAY = 86_400_000;

  /** The first id a format of one's own may take: everything below is a built-in Excel already knows. */
  const FIRST_FORMAT_ID = 164;

  /** Text as XML content. The control characters XML 1.0 has no spelling for are dropped rather than escaped. */
  export function escape(text: string): string {
    return (
      text
        .slice(0, MAX_TEXT)
        // Deliberate: these are exactly the control characters XML 1.0 cannot carry at all, and a workbook
        // holding one does not open. Tab, newline and carriage return are the three it allows, and are kept.
        // eslint-disable-next-line no-control-regex
        .replace(/[\0-\x08\x0B\x0C\x0E-\x1F]/g, '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
    );
  }

  /** A column's letters, the way a spreadsheet names one: 0 is `A`, 26 is `AA`. */
  export function columnName(index: number): string {
    let name = '';

    for (let n = index; n >= 0; n = Math.floor(n / 26) - 1) name = String.fromCharCode(65 + (n % 26)) + name;

    return name;
  }

  /**
   * A sheet's name, as Excel allows it: 31 characters, and none of the five it uses in a range reference.
   * An empty one falls back rather than producing a workbook that will not open.
   */
  function sheetName(name: string): string {
    // eslint-disable-next-line no-useless-escape
    const clean = name.replace(/[\\\/\?\*\[\]:]/g, ' ').trim();

    return clean.slice(0, 31) || 'Sheet1';
  }

  /**
   * The workbook's style table. Styles are collected by value, so a column of a thousand formatted numbers
   * costs one entry — the same thing the CSS engine does with a class.
   */
  class Styles {
    private readonly indexes = new Map<string, number>();
    private readonly styles: Style[] = [];

    /** The index a cell's `s` attribute points at. 0 is the default style every workbook starts with. */
    public indexOf(style: Style | undefined): number {
      if (!style) return 0;

      const key = JSON.stringify([style.bold, style.color, style.fill, style.format, style.align, style.indent]);
      const known = this.indexes.get(key);
      if (known !== undefined) return known;

      const index = this.styles.length + 1;
      this.indexes.set(key, index);
      this.styles.push(style);

      return index;
    }

    public xml(): string {
      const formats = [...new Set(this.styles.map((s) => s.format).filter((f): f is string => !!f))];
      const fonts = [...new Set(this.styles.map((s) => `${s.bold ? 1 : 0}|${s.color ?? ''}`))];
      const fills = [...new Set(this.styles.map((s) => s.fill).filter((f): f is string => !!f))];

      const numFmts = formats.map((format, i) => `<numFmt numFmtId="${FIRST_FORMAT_ID + i}" formatCode="${escape(format)}"/>`);

      const fontXml = fonts.map((font) => {
        const [bold, color] = font.split('|');
        const parts = [
          bold === '1' ? '<b/>' : '',
          '<sz val="11"/>',
          color ? `<color rgb="FF${color}"/>` : '<color theme="1"/>',
          '<name val="Calibri"/>',
        ];

        return `<font>${parts.join('')}</font>`;
      });

      // Indexes 0 and 1 are reserved: Excel requires `none` then `gray125`, and renumbers every fill if
      // they are missing — a header fill written as index 0 comes out on every cell in the sheet.
      const fillXml = fills.map(
        (fill) => `<fill><patternFill patternType="solid"><fgColor rgb="FF${fill}"/><bgColor indexed="64"/></patternFill></fill>`,
      );

      const cellXfs = this.styles.map((style) => {
        const numFmtId = style.format ? FIRST_FORMAT_ID + formats.indexOf(style.format) : 0;
        // Index 0 is the workbook's own default font, so every font declared here sits one along — the
        // same off-by-one the reserved fills below have, and the one that silently loses a bold header.
        const fontId = 1 + fonts.indexOf(`${style.bold ? 1 : 0}|${style.color ?? ''}`);
        const fillId = style.fill ? 2 + fills.indexOf(style.fill) : 0;
        const alignment =
          style.align || style.indent
            ? `<alignment${style.align ? ` horizontal="${style.align}"` : ''}${style.indent ? ` indent="${style.indent}"` : ''}/>`
            : '';
        const applied = `${style.format ? ' applyNumberFormat="1"' : ''} applyFont="1"${style.fill ? ' applyFill="1"' : ''}${alignment ? ' applyAlignment="1"' : ''}`;

        return `<xf numFmtId="${numFmtId}" fontId="${fontId}" fillId="${fillId}" borderId="0" xfId="0"${applied}>${alignment}</xf>`;
      });

      return [
        XML,
        `<styleSheet xmlns="${MAIN_NS}">`,
        numFmts.length ? `<numFmts count="${numFmts.length}">${numFmts.join('')}</numFmts>` : '',
        `<fonts count="${fontXml.length + 1}"><font><sz val="11"/><color theme="1"/><name val="Calibri"/></font>${fontXml.join('')}</fonts>`,
        `<fills count="${fillXml.length + 2}"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>${fillXml.join('')}</fills>`,
        '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>',
        '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>',
        `<cellXfs count="${cellXfs.length + 1}"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>${cellXfs.join('')}</cellXfs>`,
        '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>',
        '</styleSheet>',
      ].join('');
    }
  }

  /** One cell, typed. A string is written inline rather than through a shared-strings part — one fewer part,
   * and a table's strings mostly do not repeat. */
  function cellXml(cell: Cell, reference: string, styleIndex: number): string {
    const style = styleIndex ? ` s="${styleIndex}"` : '';
    const { value } = cell;

    if (value === null || value === undefined || value === '') return style ? `<c r="${reference}"${style}/>` : '';
    if (typeof value === 'number')
      return Number.isFinite(value)
        ? `<c r="${reference}"${style}><v>${value}</v></c>`
        : `<c r="${reference}"${style} t="e"><v>#NUM!</v></c>`;
    if (typeof value === 'boolean') return `<c r="${reference}"${style} t="b"><v>${value ? 1 : 0}</v></c>`;
    // A spreadsheet has no time zone, so the serial is the *local* wall clock: without the offset taken
    // off, a date created at local midnight exports a few hours into the day before it.
    if (value instanceof Date)
      return `<c r="${reference}"${style}><v>${(value.getTime() - value.getTimezoneOffset() * 60_000 - EPOCH) / DAY}</v></c>`;

    // `xml:space` keeps a value Excel would otherwise trim — a leading space is data in a table.
    return `<c r="${reference}"${style} t="inlineStr"><is><t xml:space="preserve">${escape(value)}</t></is></c>`;
  }

  function sheetXml(sheet: Sheet, styles: Styles): string {
    const columnCount = Math.max(sheet.widths.length, ...sheet.rows.map((row) => row.cells.length));
    const maxLevel = Math.max(0, ...sheet.rows.map((row) => row.level ?? 0));
    const lastCell = `${columnName(Math.max(columnCount - 1, 0))}${Math.max(sheet.rows.length, 1)}`;

    const rows = sheet.rows.map((row, index) => {
      const number = index + 1;
      const attributes = [
        `r="${number}"`,
        row.level ? `outlineLevel="${row.level}"` : '',
        row.hidden ? 'hidden="1"' : '',
        row.collapsed ? 'collapsed="1"' : '',
      ].filter(Boolean);

      const cells = row.cells.map((cell, column) => cellXml(cell, `${columnName(column)}${number}`, styles.indexOf(cell.style))).join('');

      return `<row ${attributes.join(' ')}>${cells}</row>`;
    });

    const cols = sheet.widths
      .map((width, index) => (width ? `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>` : ''))
      .join('');

    // The order of these elements is the schema's, not a preference: a `cols` after `sheetData` is a file
    // Excel refuses to open.
    return [
      XML,
      `<worksheet xmlns="${MAIN_NS}">`,
      // Group rows come above the rows they cover here, as they do on screen — which is the opposite of
      // Excel's default, and the whole reason this element is written.
      maxLevel ? '<sheetPr><outlinePr summaryBelow="0"/></sheetPr>' : '',
      `<dimension ref="A1:${lastCell}"/>`,
      sheet.freeze
        ? `<sheetViews><sheetView workbookViewId="0"><pane ySplit="${sheet.freeze}" topLeftCell="A${sheet.freeze + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>`
        : `<sheetViews><sheetView workbookViewId="0"/></sheetViews>`,
      `<sheetFormatPr defaultRowHeight="15"${maxLevel ? ` outlineLevelRow="${maxLevel}"` : ''}/>`,
      cols ? `<cols>${cols}</cols>` : '',
      `<sheetData>${rows.join('')}</sheetData>`,
      sheet.autoFilter ? `<autoFilter ref="A1:${lastCell}"/>` : '',
      '</worksheet>',
    ].join('');
  }

  /** The six parts of a one-sheet workbook, zipped. */
  export function workbook(sheet: Sheet): Uint8Array<ArrayBuffer> {
    const styles = new Styles();
    // The sheet is written first: it is what fills the style table the styles part then describes.
    const worksheet = sheetXml(sheet, styles);

    const parts: Record<string, string> = {
      '[Content_Types].xml':
        `${XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
        '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
        '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
        '</Types>',
      '_rels/.rels':
        `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        `<Relationship Id="rId1" Type="${REL_NS}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
      'xl/workbook.xml':
        `${XML}<workbook xmlns="${MAIN_NS}" xmlns:r="${REL_NS}">` +
        `<sheets><sheet name="${escape(sheetName(sheet.name))}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
      'xl/_rels/workbook.xml.rels':
        `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        `<Relationship Id="rId1" Type="${REL_NS}/worksheet" Target="worksheets/sheet1.xml"/>` +
        `<Relationship Id="rId2" Type="${REL_NS}/styles" Target="styles.xml"/></Relationships>`,
      'xl/styles.xml': styles.xml(),
      'xl/worksheets/sheet1.xml': worksheet,
    };

    return ZipUtils.zip(Object.entries(parts).map(([name, text]) => ({ name, data: ZipUtils.utf8(text) })));
  }
}

export default XlsxUtils;
