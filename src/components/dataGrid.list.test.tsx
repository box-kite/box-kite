import { act, cleanup, createEvent, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, onTestFinished, vi } from 'vitest';
import { ignoreLogs, installDialogPlatform } from '../../dev/tests';
import DataGrid from './dataGrid';
import { GridDefinition } from './dataGrid/contracts/dataGridContract';
import { loadListLayout } from './dataGrid/useListLayout';

interface Person {
  id: number;
  name: string;
  role: string;
  country: string;
  salary: number;
  phone: string;
}

const people: Person[] = Array.from({ length: 25 }, (_, i) => ({
  id: i + 1,
  name: `Person ${i + 1}`,
  role: i % 2 === 0 ? 'Engineer' : 'Designer',
  country: i % 3 === 0 ? 'Japan' : 'Spain',
  salary: 1000 + i,
  phone: `555-${i}`,
}));

const def: GridDefinition<Person> = {
  rowKey: 'id',
  title: 'People',
  layout: 'list',
  globalFilter: true,
  rowSelection: true,
  columns: [
    { key: 'name', header: 'Name' },
    { key: 'role', header: 'Role', list: 'kicker', filterable: { type: 'multiselect' } },
    { key: 'salary', header: 'Salary', align: 'end', filterable: { type: 'number' } },
    { key: 'country', header: 'Country', filterable: { type: 'multiselect' } },
    { key: 'phone', header: 'Phone', list: 'detail' },
  ],
};

const items = () => within(screen.getByRole('list', { name: 'People' })).getAllByRole('listitem');

/**
 * The list layout, as a reader meets it. Which column goes where and how the record pager counts are
 * `ListModel`'s, tested there; this file is about what is drawn and what a press does.
 */
describe('DataGrid as a list', () => {
  ignoreLogs();

  // The list is a chunk of its own; once it is here a grid draws it on its first render. Not returned:
  // vitest would take the component it resolves to for a teardown and call it.
  beforeAll(async () => {
    await loadListLayout();
  });

  afterEach(cleanup);

  it('draws a list named by the title rather than a grid', () => {
    render(<DataGrid data={people} def={def} />);

    expect(screen.queryByRole('grid')).toBeNull();
    expect(items()).toHaveLength(20);
  });

  it('says where each item sits in the whole list', () => {
    render(<DataGrid data={people} def={def} />);

    expect(items()[0].getAttribute('aria-posinset')).toBe('1');
    expect(items()[0].getAttribute('aria-setsize')).toBe('25');
  });

  it('labels every field with its column in a description list', () => {
    render(<DataGrid data={people} def={def} />);
    const [first] = items();

    expect(within(first).getByText('Country').tagName).toBe('DT');
    expect(within(first).getByText('Japan').closest('dd')).not.toBeNull();
    // A detail column waits for the record view.
    expect(within(first).queryByText('555-0')).toBeNull();
  });

  it('names the end value after its column', () => {
    render(<DataGrid data={people} def={def} />);

    expect(within(items()[0]).getByText('Salary').parentElement?.textContent).toBe('1000Salary');
  });

  it('adds a batch per "Show more" and says how many are drawn', () => {
    render(<DataGrid data={people} def={def} />);

    expect(screen.getByText('20 of 25')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Show 5 more' }));

    expect(items()).toHaveLength(25);
    expect(screen.queryByRole('button', { name: /Show \d+ more/ })).toBeNull();
  });

  it('opens the record view on a press, with every column and a pager', () => {
    render(<DataGrid data={people} def={def} />);

    fireEvent.click(within(items()[0]).getByRole('button', { name: 'Person 1' }));
    const record = screen.getByRole('dialog', { name: 'Person 1' });

    expect(within(record).getByText('555-0')).toBeTruthy();
    expect(within(record).getByText('1 of 25')).toBeTruthy();

    fireEvent.click(within(record).getByRole('button', { name: 'Next row' }));
    expect(screen.getByRole('dialog', { name: 'Person 2' })).toBeTruthy();

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'ArrowRight' });
    expect(screen.getByRole('dialog', { name: 'Person 3' })).toBeTruthy();
  });

  it('steps to the next row on a swipe towards the start', () => {
    // The platform's light dismiss: without it the dialog measures a press against a box happy-dom never
    // lays out, and every coordinate is outside it.
    const uninstall = installDialogPlatform();
    onTestFinished(uninstall);
    render(<DataGrid data={people} def={def} />);
    fireEvent.click(within(items()[0]).getByRole('button', { name: 'Person 1' }));

    const fields = screen.getByRole('dialog').querySelector('dl')!;
    // happy-dom drops `pointerType` from the init, so the touch is said on the event itself.
    const touch = (event: Event) => (Object.defineProperty(event, 'pointerType', { value: 'touch' }), event);
    fireEvent(fields, touch(createEvent.pointerDown(fields, { clientX: 300, clientY: 100 })));
    fireEvent(fields, touch(createEvent.pointerUp(fields, { clientX: 120, clientY: 110 })));

    expect(screen.getByRole('dialog', { name: 'Person 2' })).toBeTruthy();
  });

  it('ticks rows on a press only while selecting, and counts them in a bar', () => {
    const onSelectedRowKeysChange = vi.fn();
    render(<DataGrid data={people} def={def} onSelectedRowKeysChange={onSelectedRowKeysChange} />);

    // No checkbox is a target before the mode is on.
    expect(within(items()[0]).queryByRole('checkbox')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Select' }));
    expect(screen.getByRole('button', { name: 'Select' }).getAttribute('aria-pressed')).toBe('true');

    // The title is the label of the row's checkbox, so a press on it ticks the row.
    fireEvent.click(within(items()[1]).getByText('Person 2'));
    fireEvent.click(within(items()[2]).getByText('Person 3'));
    expect(within(items()[1]).getByRole('checkbox', { name: 'Person 2' })).toBeChecked();

    expect(onSelectedRowKeysChange).toHaveBeenLastCalledWith([2, 3], expect.anything());
    expect(screen.getByText('2 selected')).toBeTruthy();
    expect(screen.queryByRole('dialog', { name: /Person/ })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Clear selection' }));
    expect(screen.queryByText('2 selected')).toBeNull();
  });

  it('filters from the sheet, says how many rows that leaves, and shows the filter as a removable chip', () => {
    render(<DataGrid data={people} def={def} />);

    fireEvent.click(screen.getByRole('button', { name: 'Filters' }));
    const sheet = screen.getByRole('dialog', { name: 'Filters' });
    // Two options are chips a thumb can tap.
    fireEvent.click(within(sheet).getAllByRole('button', { name: 'Designer' })[0]);

    expect(within(sheet).getByRole('button', { name: 'Show 12 rows' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Filters, 1 applied' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Clear the Role filter' }));
    expect(screen.getByRole('button', { name: 'Filters' })).toBeTruthy();
  });

  it('sorts from the sheet by column and by direction', () => {
    render(<DataGrid data={people} def={def} />);

    fireEvent.click(screen.getByRole('button', { name: 'Sort' }));
    const sheet = screen.getByRole('dialog', { name: 'Sort' });
    fireEvent.click(within(sheet).getByRole('radio', { name: 'Salary' }));
    fireEvent.click(within(sheet).getByRole('radio', { name: 'Descending' }));

    expect(within(items()[0]).getByRole('button', { name: 'Person 25' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Salary ↓' })).toBeTruthy();
  });

  it('pages with a compact pager when the host paginates', () => {
    const onPaginationChange = vi.fn();
    render(
      <DataGrid
        data={people.slice(0, 10)}
        def={{ ...def, pagination: { totalCount: 25, pageSize: 10 } }}
        onPaginationChange={onPaginationChange}
      />,
    );

    expect(items()).toHaveLength(10);
    expect(screen.getByText('Rows: 1–10 of 25')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));

    expect(onPaginationChange).toHaveBeenCalledWith({ page: 2, pageSize: 10 }, expect.anything());
  });

  it('switches on its own width when the layout is auto', () => {
    const callbacks: (() => void)[] = [];
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: () => void) {
          callbacks.push(callback);
        }
        observe() {}
        disconnect() {}
      },
    );

    try {
      const { container } = render(<DataGrid data={people} def={{ ...def, layout: 'auto' }} />);
      // Unmeasured — a server render, or a test environment with no layout — is a table.
      expect(screen.getByRole('grid')).toBeTruthy();

      Object.defineProperty(container.firstElementChild, 'clientWidth', { configurable: true, value: 360 });
      act(() => callbacks.forEach((callback) => callback()));

      expect(screen.queryByRole('grid')).toBeNull();
      expect(items()).toHaveLength(20);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
