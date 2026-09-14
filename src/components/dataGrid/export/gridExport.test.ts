import ExcelJS from 'exceljs';
import { describe, expect, it, vi } from 'vitest';
import { ColumnType, GridDefinition } from '../contracts/dataGridContract';
import GridModel from '../models/gridModel';
import { csv, sheetOf, xlsx } from './gridExport';

interface TestRow {
  name: string;
  country: string;
  amount: number;
  joined: Date;
}

const data: TestRow[] = [
  { name: 'John', country: 'USA', amount: 10, joined: new Date(2026, 0, 15) },
  { name: 'Jane', country: 'UK', amount: 20, joined: new Date(2026, 1, 2) },
  { name: 'Bob', country: 'USA', amount: 35, joined: new Date(2026, 2, 9) },
];

const columns: ColumnType<TestRow>[] = [
  { key: 'country', header: 'Country' },
  { key: 'name', header: 'Name' },
  { key: 'amount', header: 'Amount', aggregate: 'sum', exportFormat: '#,##0.00' },
  { key: 'joined', header: 'Joined' },
];

const createGrid = (def: Partial<GridDefinition<TestRow>> = {}): GridModel<TestRow> =>
  new GridModel({ data, def: { columns, ...def } }, vi.fn());

const grouped = (def: Partial<GridDefinition<TestRow>> = {}) => {
  const grid = createGrid(def);
  grid.toggleGrouping('country');

  return grid;
};

describe('gridExport', () => {
  describe('the worksheet', () => {
    it('opens a bold header over a frozen row, with the widths the grid uses', async () => {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(xlsx(createGrid().exporter.table()).buffer as ArrayBuffer);
      const worksheet = workbook.worksheets[0];

      expect([1, 2, 3, 4].map((column) => worksheet.getRow(1).getCell(column).value)).toEqual(['Country', 'Name', 'Amount', 'Joined']);
      expect(worksheet.getRow(1).getCell(1).font?.bold).toBe(true);
      expect(worksheet.views[0]).toMatchObject({ state: 'frozen', ySplit: 1 });
      expect(worksheet.getColumn(1).width).toBeGreaterThan(0);
    });

    it('writes a date as a date, formatted since the column named no format of its own', () => {
      const sheet = sheetOf(createGrid().exporter.table());

      expect(sheet.rows[1].cells[3].value).toBeInstanceOf(Date);
      expect(sheet.rows[1].cells[3].style?.format).toBe('yyyy-mm-dd');
      expect(sheet.rows[1].cells[2].style?.format).toBe('#,##0.00');
    });

    /**
     * The bug the browser found: with `summaryBelow="0"` Excel puts a block's toggle on the nearest row
     * above it one level up, so shifting every level down by one for the header row both moved the first
     * group's toggle onto the header and left the grand total inside the last group — collapsed with it.
     */
    it('leaves the grand total at the top level, outside every group', () => {
      const sheet = sheetOf(grouped({ footer: true }).exporter.table());
      const last = sheet.rows[sheet.rows.length - 1];

      expect(last.cells[0].value).toBe('Total');
      expect(last.level).toBe(0);
    });

    it('puts a group one level above the rows it covers, and the header beside it', () => {
      const sheet = sheetOf(grouped().exporter.table());

      expect(sheet.rows.map((row) => row.level ?? 0)).toEqual([0, 0, 1, 1, 0, 1]);
    });

    it('marks a collapsed group collapsed and hides its rows, so the file opens like the grid', () => {
      const sheet = sheetOf(grouped().exporter.table());

      expect(sheet.rows.filter((row) => row.collapsed)).toHaveLength(2);
      expect(sheet.rows.filter((row) => row.hidden)).toHaveLength(3);
    });

    it('gives a flat sheet filter buttons, and a grouped one none', () => {
      expect(sheetOf(createGrid().exporter.table()).autoFilter).toBe(true);
      expect(sheetOf(grouped().exporter.table()).autoFilter).toBe(false);
      // A footer is a row inside the range, so a filter would hide the totals with the data.
      expect(sheetOf(createGrid({ footer: true }).exporter.table()).autoFilter).toBe(false);
    });
  });

  describe('the CSV', () => {
    it('is the header and every row, group rows included', () => {
      const text = csv(grouped({ footer: true }).exporter.table());

      expect(text.split('\r\n')[0]).toContain('Country,Name,Amount,Joined');
      expect(text).toContain('USA,,45,');
      expect(text.trim().endsWith('Total,,65,')).toBe(true);
    });
  });
});
