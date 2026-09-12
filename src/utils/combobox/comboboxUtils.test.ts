import { describe, expect, it } from 'vitest';
import ComboboxUtils, { ComboboxRowDef } from './comboboxUtils';

interface Person {
  id: number;
  name: string;
  retired?: boolean;
}

const people: Person[] = [
  { id: 1, name: 'Ada Lovelace' },
  { id: 2, name: 'Grace Hopper' },
  { id: 3, name: 'José Ferreira', retired: true },
];

const def: ComboboxRowDef<Person> = { label: 'name', key: 'id', disabled: 'retired' };
const keyFor = (row: Person) => ComboboxUtils.keyOf(def, row);

/**
 * The combobox with no React and no DOM in it: what a row says, which rows a query leaves, and what the
 * selection becomes when one is chosen.
 */
describe('ComboboxUtils', () => {
  describe('reading a row', () => {
    it('reads a label from a key or a function', () => {
      expect(ComboboxUtils.labelOf(def, people[0])).toBe('Ada Lovelace');
      expect(ComboboxUtils.labelOf({ label: (p: Person) => `#${p.id}` }, people[0])).toBe('#1');
    });

    it('coerces a label, so a numeric column is a legal one', () => {
      expect(ComboboxUtils.labelOf({ label: 'id' } as unknown as ComboboxRowDef<Person>, people[1])).toBe('2');
    });

    it('reads an absent label as empty rather than as "undefined"', () => {
      expect(ComboboxUtils.labelOf({ label: () => undefined as unknown as string }, people[0])).toBe('');
    });

    it('falls back to the label for identity, which is what a list of strings has', () => {
      expect(ComboboxUtils.keyOf(def, people[0])).toBe(1);
      expect(ComboboxUtils.keyOf({ label: 'name' }, people[0])).toBe('Ada Lovelace');
    });

    it('reads a disabled row, and calls one undeclared enabled', () => {
      expect(ComboboxUtils.isDisabled(def, people[2])).toBe(true);
      expect(ComboboxUtils.isDisabled(def, people[0])).toBe(false);
      expect(ComboboxUtils.isDisabled({ label: 'name' }, people[2])).toBe(false);
    });
  });

  describe('matching', () => {
    it('folds case and strips accents, so jose finds José', () => {
      expect(ComboboxUtils.matches('José Ferreira', 'jose')).toBe(true);
      expect(ComboboxUtils.matches('José Ferreira', 'JOSÉ')).toBe(true);
    });

    it('matches inside a label, so a surname is findable', () => {
      expect(ComboboxUtils.matches('Ada Lovelace', 'love')).toBe(true);
      expect(ComboboxUtils.matches('Ada Lovelace', 'zzz')).toBe(false);
    });

    it('leaves the list alone for an empty query', () => {
      expect(ComboboxUtils.filterRows(people, '', (p) => p.name)).toHaveLength(3);
    });

    it('filters by label', () => {
      expect(ComboboxUtils.filterRows(people, 'gra', (p) => p.name)).toEqual([people[1]]);
    });
  });

  describe('the selection', () => {
    it('reads either shape as a list', () => {
      expect(ComboboxUtils.toArray(people[0])).toEqual([people[0]]);
      expect(ComboboxUtils.toArray([people[0], people[1]])).toHaveLength(2);
      expect(ComboboxUtils.toArray(null)).toEqual([]);
      expect(ComboboxUtils.toArray(undefined)).toEqual([]);
    });

    it('compares by key rather than by reference, so a refetched row is the same row', () => {
      const refetched = { id: 1, name: 'Ada Lovelace' };

      expect(ComboboxUtils.isSelected([people[0]], refetched, keyFor)).toBe(true);
      expect(ComboboxUtils.isSelected([people[0]], people[1], keyFor)).toBe(false);
    });

    it('replaces in single-select, and keeps what is reselected', () => {
      expect(ComboboxUtils.toggle([people[0]], people[1], false, keyFor)).toEqual([people[1]]);
      expect(ComboboxUtils.toggle([people[0]], people[0], false, keyFor)).toEqual([people[0]]);
    });

    it('toggles in multi-select, so the listbox is also how a chip comes off', () => {
      expect(ComboboxUtils.toggle([people[0]], people[1], true, keyFor)).toEqual([people[0], people[1]]);
      expect(ComboboxUtils.toggle([people[0], people[1]], people[0], true, keyFor)).toEqual([people[1]]);
    });
  });

  describe('the rows the listbox shows', () => {
    const rowsFor = (options: Partial<Parameters<typeof ComboboxUtils.rowsFor<Person>>[0]>) =>
      ComboboxUtils.rowsFor({ data: people, def, query: '', filter: ComboboxUtils.filterRows, typed: true, ...options });

    it('filters once something has been typed', () => {
      expect(rowsFor({ query: 'ada' })).toEqual([{ kind: 'option', row: people[0] }]);
    });

    it('shows everything while the query is the selection being displayed, not typed', () => {
      expect(rowsFor({ query: 'Ada Lovelace', typed: false })).toHaveLength(3);
    });

    it('filters nothing when the caller says the data already is', () => {
      expect(rowsFor({ query: 'nothing matches this', filter: false })).toHaveLength(3);
    });

    it('takes a caller filter, which can rank as well as reject', () => {
      const reversed = rowsFor({ query: 'a', filter: (rows) => [...rows].reverse() });

      expect(reversed.map((row) => (row.kind === 'option' ? row.row.id : 0))).toEqual([3, 2, 1]);
    });

    describe('the create row', () => {
      const createRow = (query: string) => ({ id: -1, name: query });

      it('offers one for a query no row answers', () => {
        expect(rowsFor({ query: 'Alan', createRow })).toEqual([{ kind: 'create', query: 'Alan' }]);
      });

      it('offers none for an empty query', () => {
        expect(rowsFor({ query: '', createRow }).every((row) => row.kind === 'option')).toBe(true);
      });

      it('offers none where a row already carries that name, so a list cannot grow twins', () => {
        expect(rowsFor({ query: 'ada lovelace', createRow }).some((row) => row.kind === 'create')).toBe(false);
      });

      it('offers none when the caller refuses the query', () => {
        expect(rowsFor({ query: 'x', createRow: () => null }).some((row) => row.kind === 'create')).toBe(false);
      });

      it('puts it last, after everything the query did match', () => {
        const rows = rowsFor({ query: 'a', createRow });

        expect(rows[rows.length - 1]).toEqual({ kind: 'create', query: 'a' });
      });
    });
  });

  describe('where the highlight starts', () => {
    const rows = ComboboxUtils.rowsFor({ data: people, def, query: '', filter: false, typed: false });

    it('lands on the selected row, so Down moves on from it', () => {
      expect(ComboboxUtils.activeIndexFor(rows, [people[1]], def)).toBe(1);
    });

    it('lands on the first choosable row when nothing is selected', () => {
      expect(ComboboxUtils.activeIndexFor(rows, [], def)).toBe(0);
    });

    it('falls back to the end the key implied, and only when nothing is selected', () => {
      expect(ComboboxUtils.activeIndexFor(rows, [], def, 'last')).toBe(1);
      expect(ComboboxUtils.activeIndexFor(rows, [people[0]], def, 'last')).toBe(0);
    });

    it('treats a selected row that is disabled as no selection at all', () => {
      expect(ComboboxUtils.activeIndexFor(rows, [people[2]], def)).toBe(0);
    });

    it('skips a disabled row on the way', () => {
      const retired = [{ id: 3, name: 'José Ferreira', retired: true }, people[0]];
      const onlyDisabledFirst = ComboboxUtils.rowsFor({ data: retired, def, query: '', filter: false, typed: false });

      expect(ComboboxUtils.activeIndexFor(onlyDisabledFirst, [], def)).toBe(1);
    });

    it('has nowhere to be in an empty list', () => {
      expect(ComboboxUtils.activeIndexFor([], [], def)).toBe(-1);
    });
  });
});
