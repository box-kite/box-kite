import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ignoreLogs } from '../../dev/tests';
import DataGrid from './dataGrid';
import { DataGridHandle, GridDefinition } from './dataGrid/contracts/dataGridContract';

interface Row {
  name: string;
  country: string;
  amount: number;
}

const data: Row[] = [
  { name: 'John', country: 'USA', amount: 10 },
  { name: 'Jane', country: 'UK', amount: 20 },
];

const def = (overrides: Partial<GridDefinition<Row>> = {}): GridDefinition<Row> => ({
  topBar: true,
  export: true,
  columns: [
    { key: 'name', header: 'Name' },
    { key: 'country', header: 'Country' },
    { key: 'amount', header: 'Amount', aggregate: 'sum' },
  ],
  ...overrides,
});

/** Whatever the last download handed the browser. There is no API for "save this" but an anchor. */
let saved: { blob: Blob; fileName: string } | undefined;

describe('DataGrid export', () => {
  ignoreLogs();

  const objectUrl = { create: URL.createObjectURL, revoke: URL.revokeObjectURL };

  beforeEach(() => {
    saved = undefined;
    let pending: Blob | undefined;

    // Assigned rather than stubbed: replacing the whole `URL` global takes the constructor with it.
    Object.assign(URL, {
      createObjectURL: (blob: Blob) => {
        pending = blob;
        return 'blob:test';
      },
      revokeObjectURL: () => undefined,
    });

    // happy-dom navigates on a link click, so the anchor is intercepted rather than followed.
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      if (pending) saved = { blob: pending, fileName: this.download };
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    Object.assign(URL, { createObjectURL: objectUrl.create, revokeObjectURL: objectUrl.revoke });
  });

  describe('the top bar buttons', () => {
    it('are one per format, and are absent until `def.export` asks for them', () => {
      const { rerender } = render(<DataGrid data={data} def={def({ export: undefined })} />);
      expect(screen.queryByRole('button', { name: 'Export CSV' })).toBeNull();

      rerender(<DataGrid data={data} def={def()} />);
      expect(screen.getByRole('button', { name: 'Export CSV' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Export Excel' })).toBeTruthy();
    });

    it('drop the format that was turned off', () => {
      render(<DataGrid data={data} def={def({ export: { xlsx: false } })} />);

      expect(screen.getByRole('button', { name: 'Export CSV' })).toBeTruthy();
      expect(screen.queryByRole('button', { name: 'Export Excel' })).toBeNull();
    });

    it('write a CSV of what the grid shows, named after the title', async () => {
      render(<DataGrid data={data} def={def({ title: 'Revenue' })} />);

      await userEvent.click(screen.getByRole('button', { name: 'Export CSV' }));
      await vi.waitFor(() => expect(saved).toBeDefined());

      expect(saved!.fileName).toBe('Revenue.csv');
      expect(await saved!.blob.text()).toContain('Name,Country,Amount\r\nJohn,USA,10\r\nJane,UK,20');
    });

    it('write a workbook whose bytes are a ZIP, named with the extension Excel expects', async () => {
      render(<DataGrid data={data} def={def({ export: { fileName: 'q1' } })} />);

      await userEvent.click(screen.getByRole('button', { name: 'Export Excel' }));
      await vi.waitFor(() => expect(saved).toBeDefined());

      expect(saved!.fileName).toBe('q1.xlsx');
      expect(saved!.blob.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      expect(new Uint8Array(await saved!.blob.arrayBuffer()).slice(0, 2)).toEqual(new Uint8Array([0x50, 0x4b]));
    });
  });

  describe('the ref', () => {
    it('holds the element and the two exports, so a toolbar of your own can call them', async () => {
      const ref = createRef<DataGridHandle>();
      render(<DataGrid ref={ref} data={data} def={def({ topBar: false, export: undefined })} />);

      expect(ref.current!.element).toBeInstanceOf(HTMLElement);

      await ref.current!.exportCsv({ fileName: 'mine', columns: ['name'] });

      expect(saved!.fileName).toBe('mine.csv');
      expect(await saved!.blob.text()).toContain('Name\r\nJohn\r\nJane');
    });
  });
});
