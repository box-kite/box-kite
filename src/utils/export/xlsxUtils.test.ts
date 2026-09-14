import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';
import XlsxUtils from './xlsxUtils';

/**
 * The workbook is read back by ExcelJS — a separate implementation of the format — rather than asserted
 * against the XML this module wrote. A test that checks its own strings proves the strings; a test that
 * loads the archive proves the file opens. ExcelJS is a devDependency only: nothing ships with it.
 */
async function read(bytes: Uint8Array): Promise<ExcelJS.Worksheet> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(bytes.buffer as ArrayBuffer);

  return workbook.worksheets[0];
}

const sheet = (overrides: Partial<XlsxUtils.Sheet> = {}): XlsxUtils.Sheet => ({
  name: 'People',
  widths: [20, 12],
  rows: [
    {
      cells: [
        { value: 'Name', style: { bold: true, fill: 'F3F4F6' } },
        { value: 'Amount', style: { bold: true, fill: 'F3F4F6' } },
      ],
    },
    { cells: [{ value: 'Ana' }, { value: 10.5 }] },
  ],
  ...overrides,
});

describe('XlsxUtils', () => {
  describe('the file', () => {
    it('is an archive of the six parts a one-sheet workbook is made of', async () => {
      const bytes = XlsxUtils.workbook(sheet());
      const workbook = new ExcelJS.Workbook();

      await expect(workbook.xlsx.load(bytes.buffer as ArrayBuffer)).resolves.toBeDefined();
      expect(workbook.worksheets).toHaveLength(1);
    });

    it('is byte-for-byte the same twice, since nothing in it is stamped with the time', () => {
      expect(XlsxUtils.workbook(sheet())).toEqual(XlsxUtils.workbook(sheet()));
    });

    it('names the sheet, dropping the characters a range reference uses and the length past 31', async () => {
      const long = await read(XlsxUtils.workbook(sheet({ name: 'Quarterly [2026]: every region on earth' })));

      expect(long.name).toBe('Quarterly  2026   every region ');
    });
  });

  describe('a value', () => {
    it('keeps its type, so a number is a number and a boolean is a boolean', async () => {
      const rows = [{ cells: [{ value: 42 }, { value: true }, { value: 'text' }, { value: null }] }];
      const worksheet = await read(XlsxUtils.workbook(sheet({ rows, widths: [] })));
      const row = worksheet.getRow(1);

      expect(row.getCell(1).value).toBe(42);
      expect(row.getCell(2).value).toBe(true);
      expect(row.getCell(3).value).toBe('text');
      expect(row.getCell(4).value).toBe(null);
    });

    it('keeps a leading space, which a spreadsheet would otherwise trim away', async () => {
      const worksheet = await read(XlsxUtils.workbook(sheet({ rows: [{ cells: [{ value: '  padded' }] }], widths: [] })));

      expect(worksheet.getRow(1).getCell(1).value).toBe('  padded');
    });

    it('escapes the characters XML gives a meaning to', async () => {
      const worksheet = await read(XlsxUtils.workbook(sheet({ rows: [{ cells: [{ value: 'a & b < c > "d"' }] }], widths: [] })));

      expect(worksheet.getRow(1).getCell(1).value).toBe('a & b < c > "d"');
    });

    it('is a date at the local wall clock rather than a few hours before it', async () => {
      const date = new Date(2026, 0, 15);
      const worksheet = await read(
        XlsxUtils.workbook(sheet({ rows: [{ cells: [{ value: date, style: { format: 'yyyy-mm-dd' } }] }], widths: [] })),
      );
      const read_ = worksheet.getRow(1).getCell(1).value as Date;

      // ExcelJS reads a serial back as UTC midnight, which is the same day the cell was written with.
      expect(read_.toISOString().slice(0, 10)).toBe('2026-01-15');
    });
  });

  describe('the styling', () => {
    it('is one entry per distinct look, however many cells wear it', async () => {
      const worksheet = await read(XlsxUtils.workbook(sheet()));
      const header = worksheet.getRow(1);

      expect(header.getCell(1).font?.bold).toBe(true);
      expect(header.getCell(2).font?.bold).toBe(true);
      expect(header.getCell(1).style.numFmt).toBeUndefined();
      expect((header.getCell(1).fill as ExcelJS.FillPattern)?.fgColor?.argb).toBe('FFF3F4F6');
      // The body row asked for nothing, so it is the workbook's own default style.
      expect(worksheet.getRow(2).getCell(1).font?.bold).toBeFalsy();
    });

    it('carries a number format through to the cell that asked for one', async () => {
      const rows = [{ cells: [{ value: 1234.5, style: { format: '#,##0.00' } }] }];
      const worksheet = await read(XlsxUtils.workbook(sheet({ rows, widths: [] })));

      expect(worksheet.getRow(1).getCell(1).numFmt).toBe('#,##0.00');
    });

    it('sizes the columns it was given a width for', async () => {
      const worksheet = await read(XlsxUtils.workbook(sheet()));

      expect(worksheet.getColumn(1).width).toBe(20);
      expect(worksheet.getColumn(2).width).toBe(12);
    });

    it('freezes the rows it was asked to', async () => {
      const worksheet = await read(XlsxUtils.workbook(sheet({ freeze: 1 })));

      expect(worksheet.views[0]).toMatchObject({ state: 'frozen', ySplit: 1 });
    });
  });

  describe('the outline', () => {
    const grouped = (): XlsxUtils.Sheet =>
      sheet({
        widths: [],
        rows: [
          { cells: [{ value: 'Header' }] },
          { cells: [{ value: 'UK' }], level: 1, collapsed: true },
          { cells: [{ value: 'Ana' }], level: 2, hidden: true },
          { cells: [{ value: 'Bo' }], level: 2, hidden: true },
          { cells: [{ value: 'US' }], level: 1 },
          { cells: [{ value: 'Cy' }], level: 2 },
        ],
      });

    it('puts every row at the level it was given', async () => {
      const worksheet = await read(XlsxUtils.workbook(grouped()));

      expect([1, 2, 3, 4, 5, 6].map((n) => worksheet.getRow(n).outlineLevel)).toEqual([0, 1, 2, 2, 1, 2]);
    });

    it('opens a collapsed group collapsed, so the file looks like the grid it came from', async () => {
      const worksheet = await read(XlsxUtils.workbook(grouped()));

      expect(worksheet.getRow(3).hidden).toBe(true);
      expect(worksheet.getRow(6).hidden).toBeFalsy();
    });

    // Excel puts a group's summary below its rows by default; this grid puts it above, and the sheet has
    // to say so or every outline toggle lands on the wrong row.
    it('says the summary row comes first', () => {
      // Entries are stored rather than deflated, so the parts are readable in the archive as it stands.
      const xml = new TextDecoder().decode(XlsxUtils.workbook(grouped()));

      expect(xml).toContain('summaryBelow="0"');
    });
  });

  describe('a column name', () => {
    it('counts in letters the way a spreadsheet does', () => {
      expect([0, 25, 26, 27, 51, 52, 701, 702].map(XlsxUtils.columnName)).toEqual(['A', 'Z', 'AA', 'AB', 'AZ', 'BA', 'ZZ', 'AAA']);
    });
  });
});
