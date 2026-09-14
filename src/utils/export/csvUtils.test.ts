import { describe, expect, it } from 'vitest';
import CsvUtils from './csvUtils';

describe('CsvUtils', () => {
  describe('a field', () => {
    it('is quoted only when it holds a delimiter, a quote or a newline', () => {
      expect(CsvUtils.field('plain')).toBe('plain');
      expect(CsvUtils.field('a,b')).toBe('"a,b"');
      expect(CsvUtils.field('line\nbreak')).toBe('"line\nbreak"');
      expect(CsvUtils.field('say "hi"')).toBe('"say ""hi"""');
    });

    it('is empty for a blank, so a missing value is a gap rather than the word null', () => {
      expect(CsvUtils.field(null)).toBe('');
      expect(CsvUtils.field(undefined)).toBe('');
      expect(CsvUtils.field(0)).toBe('0');
      expect(CsvUtils.field(false)).toBe('false');
    });

    it('follows the delimiter it was given, so a semicolon file quotes on semicolons', () => {
      expect(CsvUtils.field('a,b', { delimiter: ';' })).toBe('a,b');
      expect(CsvUtils.field('a;b', { delimiter: ';' })).toBe('"a;b"');
    });

    it('writes a date as an ISO string rather than an epoch', () => {
      expect(CsvUtils.field(new Date(Date.UTC(2026, 0, 15)))).toBe('2026-01-15T00:00:00.000Z');
    });
  });

  describe('a value a spreadsheet would run', () => {
    it('is quoted into text', () => {
      expect(CsvUtils.field('=1+1')).toBe("'=1+1");
      expect(CsvUtils.field('+SUM(A1)')).toBe("'+SUM(A1)");
      expect(CsvUtils.field('-2')).toBe("'-2");
      expect(CsvUtils.field('@cmd')).toBe("'@cmd");
    });

    // A number stays a number: the check is on the text, and `-2` typed into a cell is the one that runs.
    it('is only escaped when it is text', () => {
      expect(CsvUtils.field(-2)).toBe('-2');
    });

    it('is written as it stands once that is turned off', () => {
      expect(CsvUtils.field('=1+1', { escapeFormulas: false })).toBe('=1+1');
    });

    it('is escaped before it is quoted, so the quote cannot be what needs quoting', () => {
      expect(CsvUtils.field('=a,b')).toBe('"\'=a,b"');
    });
  });

  describe('the file', () => {
    it('starts with the mark Excel needs to read it as UTF-8, and joins rows with CRLF', () => {
      const text = CsvUtils.csv([
        ['Name', 'Amount'],
        ['Ana', 10],
      ]);

      expect(text.startsWith(CsvUtils.BOM)).toBe(true);
      expect(text.slice(1)).toBe('Name,Amount\r\nAna,10');
    });
  });
});
