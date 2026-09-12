import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ignoreLogs } from '../../dev/tests';
import Combobox, { ComboboxValueReason } from './combobox';

interface Person {
  id: number;
  name: string;
  retired?: boolean;
}

const people: Person[] = [
  { id: 1, name: 'Ada Lovelace' },
  { id: 2, name: 'Grace Hopper' },
  { id: 3, name: 'Alan Turing', retired: true },
];

/**
 * What the component owns: the roles and the ARIA, the selection and its reasons, what the field shows,
 * and which rows the popup holds. The keyboard map itself is in `combobox.a11y.test.tsx`.
 */
describe('Combobox', () => {
  ignoreLogs();

  afterEach(() => {
    cleanup();
  });

  const def = { label: 'name', key: 'id', disabled: 'retired' } as const;

  const field = () => screen.getByRole('combobox') as HTMLInputElement;
  const options = () => screen.queryAllByRole('option');
  const open = () => fireEvent.click(field());

  describe('roles and naming', () => {
    it('puts the combobox role on the input itself, not on a wrapper', () => {
      render(<Combobox data={people} def={def} label="Assignee" />);

      expect(field().tagName).toBe('INPUT');
      expect(field().getAttribute('aria-autocomplete')).toBe('list');
      expect(field().getAttribute('aria-expanded')).toBe('false');
    });

    it('is named by its label, through a real <label for>', () => {
      render(<Combobox data={people} def={def} label="Assignee" />);

      expect(screen.getByLabelText('Assignee')).toBe(field());
    });

    it('opens a listbox of options, named by the same label', () => {
      render(<Combobox data={people} def={def} label="Assignee" />);
      open();

      expect(
        screen.getByRole('listbox').getAttribute('aria-label') ?? screen.getByRole('listbox').getAttribute('aria-labelledby'),
      ).toBeTruthy();
      expect(options()).toHaveLength(3);
      expect(field().getAttribute('aria-expanded')).toBe('true');
      expect(field().getAttribute('aria-controls')).toBe(screen.getByRole('listbox').id);
    });

    it('marks a disabled row aria-disabled rather than removing it', () => {
      render(<Combobox data={people} def={def} label="Assignee" />);
      open();

      expect(options()[2].getAttribute('aria-disabled')).toBe('true');
    });

    it('says multiselectable only when it is', () => {
      const { unmount } = render(<Combobox data={people} def={def} label="A" />);
      open();
      expect(screen.getByRole('listbox').getAttribute('aria-multiselectable')).toBeNull();
      unmount();

      render(<Combobox data={people} def={def} label="B" multiple />);
      open();
      expect(screen.getByRole('listbox').getAttribute('aria-multiselectable')).toBe('true');
    });
  });

  describe('where the popup sits', () => {
    // Nothing is portalled since B2 stage 2, so where a layer is written is where it renders. Both of
    // these used to be invisible: the portal moved the node before a browser ever saw it (bug #134).
    it('renders the listbox beside the field, never inside it', () => {
      render(<Combobox data={people} def={def} label="Assignee" />);
      open();

      expect(screen.getByRole('listbox').closest('input,button')).toBeNull();
    });

    it('keeps the popup out of the <label>, which would forward a press on an option to the field', () => {
      const { container } = render(<Combobox data={people} def={def} label="Assignee" />);
      open();

      expect(container.querySelector('label [role="listbox"]')).toBeNull();
    });
  });

  describe('a row in is a row out', () => {
    it('hands back the row object, not a key dug out of it', () => {
      const onValueChange = vi.fn();
      render(<Combobox data={people} def={def} label="Assignee" onValueChange={onValueChange} />);
      open();
      fireEvent.click(options()[1]);

      expect(onValueChange).toHaveBeenCalledTimes(1);
      expect(onValueChange.mock.calls[0][0]).toEqual(people[1]);
      expect(onValueChange.mock.calls[0][1].reason).toBe('select');
    });

    it('hands back an array in multiple mode, and toggles a chosen row back off', () => {
      const onValueChange = vi.fn();
      render(<Combobox data={people} def={def} label="Assignee" multiple onValueChange={onValueChange} />);
      open();
      fireEvent.click(options()[0]);
      fireEvent.click(options()[1]);

      expect(onValueChange.mock.calls[1][0]).toEqual([people[0], people[1]]);

      fireEvent.click(options()[0]);
      expect(onValueChange.mock.calls[2][0]).toEqual([people[1]]);
      expect(onValueChange.mock.calls[2][1].reason).toBe('deselect');
    });

    it('matches the selection by key, so a refetched list still shows it as chosen', () => {
      const refetched = people.map((person) => ({ ...person }));
      render(<Combobox data={refetched} def={def} label="Assignee" value={people[1]} />);
      open();

      expect(options()[1].getAttribute('aria-selected')).toBe('true');
      expect(options()[0].getAttribute('aria-selected')).toBe('false');
    });

    it('shows the selected row in the field, and clears the field in multiple mode', () => {
      const { unmount } = render(<Combobox data={people} def={def} label="A" value={people[0]} />);
      expect(field().value).toBe('Ada Lovelace');
      unmount();

      render(<Combobox data={people} def={def} label="B" multiple value={[people[0]]} />);
      expect(field().value).toBe('');
      expect(screen.getByText('Ada Lovelace')).toBeTruthy();
    });

    it('closes on a single-select choice and stays open on a multiple one', async () => {
      const { unmount } = render(<Combobox data={people} def={def} label="A" />);
      open();
      fireEvent.click(options()[0]);
      await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull());
      unmount();

      render(<Combobox data={people} def={def} label="B" multiple />);
      open();
      fireEvent.click(options()[0]);
      expect(screen.getByRole('listbox')).toBeTruthy();
    });
  });

  describe('chips', () => {
    const renderMultiple = () => {
      const onValueChange = vi.fn();
      render(
        <Combobox data={people} def={def} label="Assignee" multiple defaultValue={[people[0], people[1]]} onValueChange={onValueChange} />,
      );
      return onValueChange;
    };

    it('names each remove button after what it removes', () => {
      renderMultiple();

      expect(screen.getByRole('button', { name: 'Remove Ada Lovelace' })).toBeTruthy();
    });

    it('keeps the remove buttons out of the tab order, so twenty chips cost one Tab', () => {
      renderMultiple();

      for (const button of screen.getAllByRole('button')) expect(button.getAttribute('tabindex')).toBe('-1');
    });

    it('removes one on a press, with its own reason', () => {
      const onValueChange = renderMultiple();
      fireEvent.click(screen.getByRole('button', { name: 'Remove Ada Lovelace' }));

      expect(onValueChange.mock.calls[0][0]).toEqual([people[1]]);
      expect(onValueChange.mock.calls[0][1].reason satisfies ComboboxValueReason).toBe('remove');
    });

    it('removes the last on Backspace in an empty field, which is the keyboard path', () => {
      const onValueChange = renderMultiple();
      fireEvent.keyDown(field(), { key: 'Backspace' });

      expect(onValueChange.mock.calls[0][0]).toEqual([people[0]]);
    });

    it('leaves the field alone when there is something in it to delete', () => {
      const onValueChange = renderMultiple();
      fireEvent.change(field(), { target: { value: 'a' } });
      fireEvent.keyDown(field(), { key: 'Backspace' });

      expect(onValueChange.mock.calls.some((call) => call[1].reason === 'remove')).toBe(false);
    });
  });

  describe('filtering', () => {
    it('filters once something has been typed', () => {
      render(<Combobox data={people} def={def} label="Assignee" />);
      fireEvent.change(field(), { target: { value: 'grace' } });

      expect(options()).toHaveLength(1);
      expect(options()[0].textContent).toBe('Grace Hopper');
    });

    it('shows the whole list again when a chosen value is reopened', async () => {
      render(<Combobox data={people} def={def} label="Assignee" />);
      open();
      fireEvent.click(options()[0]);
      await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull());

      open();
      expect(options()).toHaveLength(3);
    });

    it('takes a filter of its own, which can rank as well as reject', () => {
      render(<Combobox data={people} def={def} label="Assignee" filter={(rows) => [...rows].reverse()} />);
      fireEvent.change(field(), { target: { value: 'a' } });

      expect(options().map((option) => option.textContent)).toEqual(['Alan Turing', 'Grace Hopper', 'Ada Lovelace']);
    });

    it('filters nothing when the caller says the data already is', () => {
      render(<Combobox data={people} def={def} label="Assignee" filter={false} />);
      fireEvent.change(field(), { target: { value: 'nothing matches' } });

      expect(options()).toHaveLength(3);
    });

    it('reports what was typed, so an async search has its hook', () => {
      const onQueryChange = vi.fn();
      render(<Combobox data={people} def={def} label="Assignee" onQueryChange={onQueryChange} />);
      fireEvent.change(field(), { target: { value: 'gr' } });

      expect(onQueryChange.mock.calls[0][0]).toBe('gr');
      expect(onQueryChange.mock.calls[0][1].reason).toBe('input');
    });
  });

  describe('the popup with no options in it', () => {
    it('is a status message rather than an empty listbox', () => {
      render(<Combobox data={people} def={def} label="Assignee" />);
      fireEvent.change(field(), { target: { value: 'zzz' } });

      expect(screen.queryByRole('listbox')).toBeNull();
      expect(screen.getByRole('status').textContent).toBe('No results');
    });

    it('says the rows are coming rather than that there are none', () => {
      render(<Combobox data={[]} def={def} label="Assignee" loading />);
      open();

      expect(screen.getByRole('status').textContent).toBe('Loading...');
    });

    it('marks a list that is being replaced as busy', () => {
      render(<Combobox data={people} def={def} label="Assignee" loading />);
      open();

      expect(screen.getByRole('listbox').getAttribute('aria-busy')).toBe('true');
    });
  });

  describe('creating a row', () => {
    const createRow = (query: string) => ({ id: 99, name: query });

    it('offers one for a query nothing answers, and reports its own reason', () => {
      const onValueChange = vi.fn();
      render(<Combobox<Person> data={people} def={def} label="Assignee" createRow={createRow} onValueChange={onValueChange} />);
      fireEvent.change(field(), { target: { value: 'Katherine' } });

      expect(options()[options().length - 1].textContent).toBe('Create "Katherine"');

      fireEvent.click(options()[options().length - 1]);
      expect(onValueChange.mock.calls[0][0]).toEqual({ id: 99, name: 'Katherine' });
      expect(onValueChange.mock.calls[0][1].reason).toBe('create');
    });

    it('offers none where a row already carries that name', () => {
      render(<Combobox<Person> data={people} def={def} label="Assignee" createRow={createRow} />);
      fireEvent.change(field(), { target: { value: 'ada lovelace' } });

      expect(options().every((option) => !option.textContent?.startsWith('Create'))).toBe(true);
    });
  });

  describe('being controlled', () => {
    it('leaves an uncontrolled value alone but still reports it', () => {
      const onValueChange = vi.fn();
      render(<Combobox data={people} def={def} label="Assignee" value={null} onValueChange={onValueChange} />);
      open();
      fireEvent.click(options()[0]);

      expect(onValueChange).toHaveBeenCalled();
      expect(field().value).toBe('');
    });

    it('follows a value changed from outside', () => {
      function Example() {
        const [value, setValue] = useState<Person | null>(people[0]);

        return (
          <>
            <button onClick={() => setValue(people[1])}>Change</button>
            <Combobox data={people} def={def} label="Assignee" value={value} onValueChange={setValue} />
          </>
        );
      }

      render(<Example />);
      expect(field().value).toBe('Ada Lovelace');

      fireEvent.click(screen.getByRole('button', { name: 'Change' }));
      expect(field().value).toBe('Grace Hopper');
    });

    it('reports every open and close with a reason', () => {
      const onOpenChange = vi.fn();
      render(<Combobox data={people} def={def} label="Assignee" onOpenChange={onOpenChange} />);
      open();
      expect(onOpenChange.mock.calls[0]).toEqual([true, expect.objectContaining({ reason: 'trigger' })]);

      fireEvent.click(options()[0]);
      expect(onOpenChange.mock.calls[1]).toEqual([false, expect.objectContaining({ reason: 'select' })]);
    });
  });

  describe('inside a form', () => {
    it('submits one hidden input per selection, carrying the key', () => {
      const { container } = render(
        <Combobox data={people} def={def} label="Assignee" name="assignee" multiple defaultValue={[people[0], people[1]]} />,
      );
      const hidden = [...container.querySelectorAll('input[type="hidden"]')] as HTMLInputElement[];

      expect(hidden.map((input) => input.value)).toEqual(['1', '2']);
      expect(hidden.every((input) => input.name === 'assignee')).toBe(true);
    });

    it('renders none without a name', () => {
      const { container } = render(<Combobox data={people} def={def} label="Assignee" defaultValue={people[0]} />);

      expect(container.querySelectorAll('input[type="hidden"]')).toHaveLength(0);
    });
  });

  describe('disabled', () => {
    it('puts the real attribute on the field and refuses to open', () => {
      render(<Combobox data={people} def={def} label="Assignee" disabled />);

      expect(field().disabled).toBe(true);
      open();
      expect(screen.queryByRole('listbox')).toBeNull();
    });

    it('takes the remove buttons away with it', () => {
      render(<Combobox data={people} def={def} label="Assignee" multiple defaultValue={[people[0]]} disabled />);

      expect(screen.queryByRole('button')).toBeNull();
    });
  });
});
