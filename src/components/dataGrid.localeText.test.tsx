import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ignoreLogs } from '../../dev/tests';
import DataGrid, { DATA_GRID_LOCALE_TEXT, type DataGridLocaleText } from './dataGrid';
import { GridDefinition } from './dataGrid/contracts/dataGridContract';

interface Row {
  id: number;
  a: number | null;
  b: number;
  c: number;
  children?: Row[];
}

const rows: Row[] = [
  { id: 1, a: 10, b: 20, c: 1 },
  { id: 2, a: 11, b: 21, c: 2 },
  { id: 3, a: 12, b: 22, c: 1 },
];

/** Every key replaced by a marker, so whatever English is left on the page was never extracted. */
const markers = Object.fromEntries(
  Object.entries(DATA_GRID_LOCALE_TEXT).map(([key, value]) => [key, typeof value === 'function' ? () => `§${key}` : `§${key}`]),
) as unknown as DataGridLocaleText;

/** Headers are markers too and the data is numbers, so a run of letters can only be the grid's own. */
const everything: GridDefinition<Row> = {
  rowKey: 'id',
  title: '§title',
  topBar: true,
  bottomBar: true,
  globalFilter: true,
  export: true,
  rowSelection: true,
  showRowNumber: true,
  footer: true,
  rowDetail: { content: () => '§detail' },
  localeText: markers,
  columns: [
    { key: 'a', header: '§a', filterable: true, aggregate: 'sum' },
    { key: 'b', header: '§b', filterable: { type: 'number' } },
    { key: 'c', header: '§c', filterable: { type: 'multiselect' } },
  ],
};

/** Every word on the page a person or a screen reader meets — text, names, placeholders — less the markers. */
function words(): string[] {
  const found: string[] = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) found.push(node.textContent ?? '');
  for (const element of document.body.querySelectorAll('*')) {
    for (const name of ['aria-label', 'placeholder', 'aria-valuetext', 'title']) found.push(element.getAttribute(name) ?? '');
  }

  return found;
}

/** What survives taking the markers out: English the grid wrote for itself. */
function leftovers(): string[] {
  return words()
    .map((word) => word.replace(/§\w+/g, ''))
    .filter((word) => /[A-Za-z]{2,}/.test(word));
}

/** The markers on the page — proof that a state was really rendered, not just that it said nothing. */
function shown(): Set<string> {
  return new Set(words().flatMap((word) => word.match(/§\w+/g) ?? []));
}

describe('DataGrid localeText', () => {
  ignoreLogs();
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('writes no word of its own that localeText does not supply', () => {
    vi.useFakeTimers();
    render(<DataGrid data={rows} def={everything} />);

    // The states that exist only once something has happened: a filter, a selection, an open menu.
    fireEvent.change(screen.getAllByRole('textbox', { name: '§filterColumn' })[0], { target: { value: '1' } });
    act(() => vi.advanceTimersByTime(300));
    fireEvent.click(screen.getAllByRole('checkbox', { name: '§selectRow' })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: '§columnOptions' })[0]);

    expect(leftovers()).toEqual([]);
    for (const key of [
      '§clearFilters',
      '§rowCount',
      '§selectedCount',
      '§showSelected',
      '§clearSelection',
      '§sortAscending',
      '§groupBy',
      '§footerTotal',
      '§exportCsv',
    ]) {
      expect(shown()).toContain(key);
    }
  });

  it('covers the paged bar, the empty grid, a grid with no columns and the column chooser', () => {
    render(<DataGrid data={rows} def={{ ...everything, pagination: { totalCount: 50, pageSizeOptions: [10, 20] } }} />);
    expect(leftovers()).toEqual([]);
    expect(shown()).toContain('§pageSizeOption');
    cleanup();

    render(<DataGrid data={[]} def={everything} />);
    expect(leftovers()).toEqual([]);
    expect(shown()).toContain('§noRows');
    cleanup();

    render(<DataGrid data={rows} def={{ ...everything, columns: [] }} />);
    expect(leftovers()).toEqual([]);
    expect(shown()).toContain('§noColumnsTitle');
  });

  it('covers grouping, a tree and a refused edit', async () => {
    const tree: Row[] = [{ id: 1, a: null, b: 1, c: 1, children: [{ id: 2, a: 5, b: 2, c: 1 }] }];
    render(<DataGrid data={tree} def={{ ...everything, groupBy: undefined, treeData: { childrenKey: 'children' } }} />);
    expect(leftovers()).toEqual([]);
    expect([...shown()].some((marker) => marker === '§expandTreeRow' || marker === '§collapseTreeRow')).toBe(true);
    cleanup();

    render(<DataGrid data={rows} def={{ ...everything, groupBy: ['c'] }} />);
    expect(leftovers()).toEqual([]);
    expect(shown()).toContain('§stopGrouping');
    cleanup();

    render(<DataGrid data={rows} def={{ ...everything, editable: true, onCellEdit: () => false }} />);
    const cell = screen.getAllByRole('gridcell').find((element) => element.textContent === '20')!;
    fireEvent.doubleClick(cell);
    const editor = screen.getByRole('spinbutton', { name: '§editCell' });
    fireEvent.change(editor, { target: { value: '7' } });
    fireEvent.keyDown(editor, { key: 'Enter' });
    await screen.findByText('§invalidValue');
    expect(leftovers()).toEqual([]);
  });

  it('takes any subset and keeps English for the rest', () => {
    render(
      <DataGrid data={rows} def={{ ...everything, localeText: { clearFilters: 'Rensa filter', selectRow: (n) => `Välj rad ${n}` } }} />,
    );

    expect(screen.getByRole('checkbox', { name: 'Välj rad 1' })).toBeTruthy();
    expect(screen.getByPlaceholderText('Search...')).toBeTruthy();
  });

  it('puts the words of a sentence in the order the language needs', () => {
    render(
      <DataGrid data={rows} def={{ ...everything, localeText: { rowCount: (filtered, total) => `${total} rader, ${filtered} visas` } }} />,
    );

    expect(screen.getByText('3 rader, 3 visas')).toBeTruthy();
  });
});
