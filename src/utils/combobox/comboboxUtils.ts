/** How a row's text, its identity or its disabled state is read: a key of the row, or a function. */
export type RowAccessor<TRow, TResult> = (keyof TRow & string) | ((row: TRow) => TResult);

/**
 * What the combobox needs to know about a row to search it, tell it from its neighbours and refuse it.
 * Only `label` is required — it is the text, and without one nothing could be typed at or read out.
 */
export interface ComboboxRowDef<TRow> {
  /** The row's text: displayed, searched, and what a screen reader announces. */
  label: RowAccessor<TRow, string>;
  /** What makes two rows the same row. Defaults to the label, which is what a list of strings has. */
  key?: RowAccessor<TRow, string | number>;
  /** A row that cannot be chosen: skipped by the arrows and inert to a press. */
  disabled?: RowAccessor<TRow, boolean>;
}

/** A row of the open listbox. `create` is the offer to make a row out of what was typed. */
export type ComboboxRow<TRow> = { kind: 'option'; row: TRow } | { kind: 'create'; query: string };

/**
 * Which rows a query leaves, in the order they will be shown. It takes the whole list rather than one row
 * so that it can rank as well as reject, and it is handed the label reader so that composing it with the
 * built-in one costs nothing.
 */
export type ComboboxFilter<TRow> = (rows: TRow[], query: string, labelOf: (row: TRow) => string) => TRow[];

/**
 * The combobox with no React in it: reading a row, filtering the list, and what the selection becomes when
 * a row is chosen. All of it is a pure function of the data and the query, which is what lets the same
 * answers be tested without a DOM and re-used by a virtualized listbox that renders fifty of ten thousand.
 */
namespace ComboboxUtils {
  /** Resolve an accessor against a row. A key reads the property; a function is called. */
  export function read<TRow, TResult>(accessor: RowAccessor<TRow, TResult>, row: TRow): TResult {
    return typeof accessor === 'function' ? accessor(row) : (row[accessor] as TResult);
  }

  /** A row's text. Coerced, so a numeric column is a legal label and a missing one is empty rather than `"undefined"`. */
  export function labelOf<TRow>(def: ComboboxRowDef<TRow>, row: TRow): string {
    const label = read(def.label, row);

    return label === null || label === undefined ? '' : String(label);
  }

  /** A row's identity. The label by default: a list of plain strings is its own set of keys. */
  export function keyOf<TRow>(def: ComboboxRowDef<TRow>, row: TRow): string | number {
    return def.key === undefined ? labelOf(def, row) : read(def.key, row);
  }

  export function isDisabled<TRow>(def: ComboboxRowDef<TRow>, row: TRow): boolean {
    return def.disabled === undefined ? false : read(def.disabled, row) === true;
  }

  /** Every combining mark, which is what NFD splits an accent into. */
  const MARKS = /\p{M}/gu;

  /**
   * The form a query and a label are compared in: case-folded and stripped of accents, so that `jose`
   * finds `José`. NFD splits a letter from its accent and the mark range is what is then dropped.
   */
  export function normalize(text: string): string {
    return text.normalize('NFD').replace(MARKS, '').toLowerCase();
  }

  /** Whether a label answers a query. A substring rather than a prefix: a surname is worth finding. */
  export function matches(label: string, query: string): boolean {
    return normalize(label).includes(normalize(query));
  }

  /**
   * The filter a combobox uses when its caller names none, exported so that a caller who names one can
   * still start from it — `(rows, query, labelOf) => filterRows(rows, query, labelOf).slice(0, 20)`.
   */
  export function filterRows<TRow>(rows: TRow[], query: string, labelOf: (row: TRow) => string): TRow[] {
    if (query === '') return rows;

    return rows.filter((row) => matches(labelOf(row), query));
  }

  /** The selection as a list, whichever shape it arrived in. `null` and `undefined` are "nothing chosen". */
  export function toArray<TRow>(value: TRow | TRow[] | null | undefined): TRow[] {
    if (value === null || value === undefined) return [];

    return Array.isArray(value) ? value : [value];
  }

  export function isSelected<TRow>(selection: TRow[], row: TRow, keyFor: (row: TRow) => string | number): boolean {
    const key = keyFor(row);

    return selection.some((selected) => keyFor(selected) === key);
  }

  /**
   * What the selection becomes when a row is chosen. Single-select replaces, and choosing what is already
   * chosen keeps it — a combobox has no "unselect by reselecting", since its field would have nothing to
   * show. Multi-select toggles, which is how a chip is removed from the listbox rather than from the chip.
   */
  export function toggle<TRow>(selection: TRow[], row: TRow, multiple: boolean, keyFor: (row: TRow) => string | number): TRow[] {
    if (!multiple) return [row];

    return isSelected(selection, row, keyFor) ? selection.filter((selected) => keyFor(selected) !== keyFor(row)) : [...selection, row];
  }

  export interface RowsOptions<TRow> {
    data: TRow[];
    def: ComboboxRowDef<TRow>;
    /** What has been typed. Only filters once the caller says it was typed rather than displayed. */
    query: string;
    /** `false` when the data is already filtered — a server that searched, or a caller that did. */
    filter: ComboboxFilter<TRow> | false;
    /** Whether the query is the user's rather than the selection's text. A displayed value filters nothing. */
    typed: boolean;
    /** Turns a query into the row it would create, or `null` for one that should not be offered. */
    createRow?: (query: string) => TRow | null;
  }

  /**
   * Every row the listbox shows, in keyboard order. The create row is last and appears only for a query
   * that no row already answers by name — offering "Create Apple" beside Apple is how a list grows twins.
   */
  export function rowsFor<TRow>(options: RowsOptions<TRow>): ComboboxRow<TRow>[] {
    const { data, def, query, filter, typed, createRow } = options;
    const labelFor = (row: TRow) => labelOf(def, row);
    const visible = !typed || filter === false ? data : filter(data, query, labelFor);
    const rows: ComboboxRow<TRow>[] = visible.map((row) => ({ kind: 'option', row }));

    if (createRow && query !== '' && !data.some((row) => normalize(labelFor(row)) === normalize(query)) && createRow(query) !== null) {
      rows.push({ kind: 'create', query });
    }

    return rows;
  }

  /** A row the arrows skip and a press does nothing to. The create row is always available. */
  export function isRowDisabled<TRow>(def: ComboboxRowDef<TRow>, row: ComboboxRow<TRow>): boolean {
    return row.kind === 'option' && isDisabled(def, row.row);
  }

  /**
   * Where the highlight goes when the listbox opens: the selected row whichever key opened it, so that
   * Down or Up from a chosen value moves on from it rather than jumping to an end. With nothing chosen it
   * falls back to the end the key implied. `-1` when nothing can be highlighted — no rows, or all disabled.
   */
  export function activeIndexFor<TRow>(
    rows: ComboboxRow<TRow>[],
    selection: TRow[],
    def: ComboboxRowDef<TRow>,
    fallback: 'first' | 'last' = 'first',
  ): number {
    const keyFor = (row: TRow) => keyOf(def, row);
    const selected = rows.findIndex((row) => row.kind === 'option' && isSelected(selection, row.row, keyFor));

    if (selected !== -1 && !isRowDisabled(def, rows[selected])) return selected;

    const enabled = rows.map((row, index) => (isRowDisabled(def, row) ? -1 : index)).filter((index) => index !== -1);

    return (fallback === 'last' ? enabled[enabled.length - 1] : enabled[0]) ?? -1;
  }
}

export default ComboboxUtils;
