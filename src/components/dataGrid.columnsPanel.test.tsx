import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ignoreLogs } from '../../dev/tests';
import DataGrid from './dataGrid';
import { GridDefinition } from './dataGrid/contracts/dataGridContract';

interface Row {
  id: number;
  first: string;
  last: string;
  email: string;
  phone: string;
  country: string;
  gender: string;
  city: string;
}

const rows: Row[] = [{ id: 1, first: 'Ada', last: 'Lovelace', email: 'ada@x.io', phone: '1', country: 'UK', gender: 'F', city: 'London' }];

const def: GridDefinition<Row> = {
  rowKey: 'id',
  topBar: true,
  columns: [
    {
      key: 'personal',
      header: 'Personal Info',
      columns: [
        { key: 'first', header: 'First Name' },
        { key: 'last', header: 'Last Name' },
      ],
    },
    { key: 'email', header: 'Email' },
    { key: 'phone', header: 'Phone' },
    { key: 'country', header: 'Country' },
    { key: 'gender', header: 'Gender' },
    { key: 'city', header: 'City' },
  ],
};

// No Popover API in the test environment, so the panel takes `<Popover>`'s portalled fallback path.
function open() {
  fireEvent.click(screen.getByRole('button', { name: /^Columns/ }));
  return screen.getByRole('dialog', { name: 'Columns' });
}

const switchFor = (name: string) => screen.getByRole('switch', { name }) as HTMLInputElement;

describe('DataGrid columns panel', () => {
  ignoreLogs();
  afterEach(cleanup);

  it('is a button that says how many columns are shown once some are hidden', () => {
    render(<DataGrid data={rows} def={def} />);
    const trigger = screen.getByRole('button', { name: 'Columns' });
    expect(trigger.getAttribute('aria-haspopup')).toBe('dialog');

    open();
    fireEvent.click(switchFor('Email'));

    expect(screen.getByRole('button', { name: 'Columns, 6 of 7 shown' }).textContent).toContain('6/7');
  });

  it('lists a switch per column under its header group, and focuses the search field', () => {
    render(<DataGrid data={rows} def={def} />);
    open();

    expect(screen.getByRole('group', { name: 'Personal Info' })).toBeTruthy();
    expect(screen.getAllByRole('switch').map((s) => s.closest('label')?.textContent)).toEqual([
      'First Name',
      'Last Name',
      'Email',
      'Phone',
      'Country',
      'Gender',
      'City',
    ]);
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Search columns' }));
    expect(screen.getByText('7 of 7 shown')).toBeTruthy();
  });

  it('hides and shows a column from its switch', () => {
    render(<DataGrid data={rows} def={def} />);
    open();

    fireEvent.click(switchFor('Email'));
    expect(switchFor('Email').checked).toBe(false);
    expect(screen.queryByRole('columnheader', { name: /Email/ })).toBeNull();

    fireEvent.click(switchFor('Email'));
    expect(switchFor('Email').checked).toBe(true);
    expect(screen.getByRole('columnheader', { name: /Email/ })).toBeTruthy();
  });

  it('searches by label or group, says when nothing matches, and bulk actions reach only the matches', () => {
    render(<DataGrid data={rows} def={def} />);
    const panel = open();
    const search = screen.getByRole('textbox', { name: 'Search columns' });

    fireEvent.change(search, { target: { value: 'personal' } });
    expect(screen.getAllByRole('switch')).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: 'Hide all' }));
    expect(screen.getByText('5 of 7 shown')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Hide all' }) as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(search, { target: { value: 'zzz' } });
    expect(screen.queryAllByRole('switch')).toHaveLength(0);
    expect(within(panel).getByRole('status').textContent).toBe('No columns match “zzz”');

    fireEvent.change(search, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Show all' }));
    expect(screen.getByText('7 of 7 shown')).toBeTruthy();
  });

  it('walks the switches with the arrow keys, from the search field and back to it', () => {
    render(<DataGrid data={rows} def={def} />);
    open();
    const search = screen.getByRole('textbox', { name: 'Search columns' });

    act(() => void fireEvent.keyDown(search, { key: 'ArrowDown' }));
    expect(document.activeElement).toBe(switchFor('First Name'));

    act(() => void fireEvent.keyDown(document.activeElement!, { key: 'End' }));
    expect(document.activeElement).toBe(switchFor('City'));

    act(() => void fireEvent.keyDown(document.activeElement!, { key: 'Home' }));
    act(() => void fireEvent.keyDown(document.activeElement!, { key: 'ArrowUp' }));
    expect(document.activeElement).toBe(search);
  });
});
