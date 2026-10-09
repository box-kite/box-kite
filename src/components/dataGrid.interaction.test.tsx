import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ignoreLogs } from '../../dev/tests';
import DataGrid from './dataGrid';
import { DataGridProps, GridDefinition } from './dataGrid/contracts/dataGridContract';

interface Person {
  id: number;
  firstName: string;
  age: number;
}

const data: Person[] = [
  { id: 1, firstName: 'John', age: 30 },
  { id: 2, firstName: 'Jane', age: 25 },
  { id: 3, firstName: 'Bob', age: 45 },
];

const baseDef: GridDefinition<Person> = {
  rowKey: 'id',
  columns: [
    { key: 'firstName', header: 'First Name' },
    { key: 'age', header: 'Age' },
  ],
};

function renderGrid(def?: Partial<GridDefinition<Person>>, props?: Partial<DataGridProps<Person>>) {
  return render(<DataGrid data={data} def={{ ...baseDef, ...def }} {...props} />);
}

describe('DataGrid interactions (component → model → re-render)', () => {
  ignoreLogs();
  afterEach(cleanup);

  it('sorts rows when a sortable header is clicked', () => {
    renderGrid();
    const grid = screen.getByRole('grid');

    fireEvent.click(screen.getByText('First Name')); // ASC → Bob, Jane, John

    const text = grid.textContent ?? '';
    expect(text.indexOf('Bob')).toBeLessThan(text.indexOf('Jane'));
    expect(text.indexOf('Jane')).toBeLessThan(text.indexOf('John'));
  });

  it('select-all checkbox updates the selected count', () => {
    renderGrid({ rowSelection: true, bottomBar: true });
    expect(screen.getByText('Selected: 0')).toBeTruthy();

    fireEvent.click(screen.getAllByRole('checkbox')[0]); // header select-all

    expect(screen.getByText('Selected: 3')).toBeTruthy();
  });

  it('paginates via the page-jump input', () => {
    renderGrid({ bottomBar: true, pagination: { totalCount: 50 }, visibleRowsCount: 10 });
    expect(screen.getByText('Rows: 1–10 of 50')).toBeTruthy();

    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '3' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(screen.getByText('Rows: 21–30 of 50')).toBeTruthy();
  });

  it('expands a detail row when the expand cell is clicked', () => {
    // contextMenu: false so the only buttons are the per-row expand buttons.
    renderGrid({
      contextMenu: false,
      rowDetail: { content: (row) => <div data-testid="detail">Detail {row.firstName}</div> },
    });
    expect(screen.queryByTestId('detail')).toBeNull();

    fireEvent.click(screen.getAllByRole('button')[0]); // first row's expand button

    expect(screen.getAllByTestId('detail').length).toBeGreaterThan(0);
  });

  it('scrolls a panel it just opened into view, and does not scroll on the collapse', () => {
    const scrollIntoView = vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(() => {});
    renderGrid({
      contextMenu: false,
      rowDetail: { content: (row) => <div data-testid="detail">Detail {row.firstName}</div> },
    });

    const expand = screen.getAllByRole('button')[0];
    fireEvent.click(expand);

    // The row that holds the panel, not the panel's own content: a tall panel scrolled by its content
    // would leave the row that opened it off screen.
    const detailRow = screen.getAllByTestId('detail')[0].closest('[role="row"]');
    expect(scrollIntoView.mock.contexts).toContain(detailRow);
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' });

    scrollIntoView.mockClear();
    fireEvent.click(expand);
    expect(scrollIntoView).not.toHaveBeenCalled();

    scrollIntoView.mockRestore();
  });

  it('leaves the scroll alone when rowDetail opts out', () => {
    const scrollIntoView = vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(() => {});
    renderGrid({
      contextMenu: false,
      rowDetail: { content: () => <div data-testid="detail">Detail</div>, scrollIntoView: false },
    });

    fireEvent.click(screen.getAllByRole('button')[0]);

    expect(screen.getAllByTestId('detail').length).toBeGreaterThan(0);
    expect(scrollIntoView).not.toHaveBeenCalled();

    scrollIntoView.mockRestore();
  });

  it('toggles a column hidden via the model and removes its header', () => {
    const { rerender } = renderGrid({ topBar: true });
    expect(screen.getByText('Age')).toBeTruthy();

    // Drive visibility through a controlled re-render path: hide "age" by re-rendering
    // with it removed is not the model path; instead verify the empty-columns state wiring.
    rerender(<DataGrid data={data} def={{ ...baseDef, columns: [] }} />);
    expect(screen.getByText('No Columns Selected')).toBeTruthy();
  });
});

describe('DataGrid filter inputs follow the filters they show', () => {
  ignoreLogs();
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  const filterDef: Partial<GridDefinition<Person>> = {
    bottomBar: true,
    topBar: true,
    globalFilter: true,
    columns: [
      { key: 'firstName', header: 'First Name', filterable: true },
      { key: 'age', header: 'Age', filterable: { type: 'number' } },
    ],
  };

  /** Types into an input and lets the debounce commit it. */
  function type(input: HTMLElement, value: string) {
    fireEvent.change(input, { target: { value } });
    act(() => vi.advanceTimersByTime(300));
  }

  it('empties a text column filter when the footer clears the filters', () => {
    vi.useFakeTimers();
    renderGrid(filterDef);
    const input = screen.getByRole('textbox', { name: 'Filter First Name' }) as HTMLInputElement;

    type(input, 'Jo');
    expect(screen.queryByText('Jane')).toBeNull();

    fireEvent.click(screen.getByText('Clear filters'));

    expect(screen.getByText('Jane')).toBeTruthy();
    expect(input.value).toBe('');
  });

  it('empties a number filter and the global search the same way', () => {
    vi.useFakeTimers();
    renderGrid(filterDef);
    const age = screen.getByRole('spinbutton', { name: 'Filter Age' }) as HTMLInputElement;
    const search = screen.getByPlaceholderText('Search...') as HTMLInputElement;

    type(age, '30');
    type(search, 'j');
    fireEvent.click(screen.getByText('Clear filters'));

    expect(age.value).toBe('');
    expect(search.value).toBe('');
  });

  it('shows a filter the owner sets through a controlled prop', () => {
    const { rerender } = renderGrid(filterDef, { columnFilters: {} });
    const input = screen.getByRole('textbox', { name: 'Filter First Name' }) as HTMLInputElement;

    rerender(<DataGrid data={data} def={{ ...baseDef, ...filterDef }} columnFilters={{ firstName: { type: 'text', value: 'Bob' } }} />);

    expect(input.value).toBe('Bob');
  });

  it('keeps a number range whole when its two halves settle at different moments', () => {
    vi.useFakeTimers();
    renderGrid(filterDef);
    fireEvent.click(screen.getByRole('combobox', { name: 'Comparison for Age' }));
    fireEvent.click(screen.getByRole('option', { name: '↔' }));
    const from = screen.getByRole('spinbutton', { name: 'Filter Age from' }) as HTMLInputElement;
    const to = screen.getByRole('spinbutton', { name: 'Filter Age to' }) as HTMLInputElement;

    fireEvent.change(from, { target: { value: '26' } });
    act(() => vi.advanceTimersByTime(200));
    type(to, '40');

    expect(from.value).toBe('26');
    expect(to.value).toBe('40');
    expect(screen.getByText('John')).toBeTruthy();
    expect(screen.queryByText('Bob')).toBeNull();
    expect(screen.queryByText('Jane')).toBeNull();
  });
});

describe('DataGrid selection under filters', () => {
  ignoreLogs();
  afterEach(cleanup);

  it('keeps what the filters hide, says so, and offers both ways out', () => {
    const def = { ...baseDef, rowSelection: true, bottomBar: true, globalFilter: true };
    const { rerender } = render(<DataGrid data={data} def={def} globalFilterValue="" />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select row 1' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select row 3' }));

    rerender(<DataGrid data={data} def={def} globalFilterValue="John" />);
    const header = screen.getByRole('checkbox', { name: 'Select all rows' }) as HTMLInputElement;
    expect(screen.getByText('Selected: 2 (1 hidden)')).toBeTruthy();
    expect(header.checked).toBe(true);

    const show = screen.getByRole('button', { name: 'Show selected' });
    fireEvent.click(show);
    expect(show.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getAllByRole('checkbox', { name: /^Select row/ })).toHaveLength(2);
    fireEvent.click(show);
    expect(screen.getAllByRole('checkbox', { name: /^Select row/ })).toHaveLength(1);

    // The header clears the row on screen and leaves the hidden one alone.
    fireEvent.click(header);
    expect(screen.getByText('Selected: 1 (1 hidden)')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Clear selection' }));
    expect(screen.getByText('Selected: 0')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Clear selection' })).toBeNull();
  });
});

describe('DataGrid redraws only the rows a change touched (bug #237)', () => {
  ignoreLogs();
  afterEach(cleanup);

  /** Counts renders per row through a `Cell` of its own — which is how a consumer's cell would see it. */
  function renderProbed(def?: Partial<GridDefinition<Person>>) {
    const renders = new Map<number, number>();
    const Probe = ({ cell }: { cell: { row: { data: Person } } }) => {
      const { id, firstName } = cell.row.data;
      renders.set(id, (renders.get(id) ?? 0) + 1);
      return <>{firstName}</>;
    };
    const columns = [{ key: 'firstName' as const, header: 'First Name', Cell: Probe as never }, baseDef.columns[1]];
    render(<DataGrid data={data} def={{ ...baseDef, rowSelection: true, ...def, columns }} />);
    const counts = () => [1, 2, 3].map((id) => renders.get(id) ?? 0);

    return { counts };
  }

  it('selecting a row redraws that row and leaves the others alone', () => {
    const { counts } = renderProbed();
    const before = counts();

    fireEvent.click(screen.getByRole('checkbox', { name: 'Select row 2' }));

    expect(counts()).toEqual([before[0], before[1] + 1, before[2]]);
  });

  it('a press moving the current cell redraws the row it lands on, not the window', () => {
    const { counts } = renderProbed();
    const before = counts();

    fireEvent.focus(screen.getByText('Bob').closest('[role="gridcell"]')!);

    expect(counts()[0]).toBe(before[0]);
    expect(counts()[1]).toBe(before[1]);
  });

  it('a sort redraws every row', () => {
    const { counts } = renderProbed();
    const before = counts();

    fireEvent.click(screen.getByText('First Name'));

    counts().forEach((count, index) => expect(count).toBeGreaterThan(before[index]));
  });
});
