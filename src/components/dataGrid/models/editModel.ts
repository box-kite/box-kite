import {
  CellEdit,
  CellEditorConfig,
  CellEditorOption,
  CellEditorType,
  CellEditResult,
  Key,
  RejectedCellEdit,
} from '../contracts/dataGridContract';
import ColumnModel from './columnModel';
import GridModel from './gridModel';
import type { RangeBounds } from './rangeModel';
import RowModel from './rowModel';

/** What a rejection with no message of its own says. A silent refusal is one nobody can act on. */
export const DEFAULT_EDIT_ERROR = 'Invalid value';

/** A validator that threw is a refusal, and what it threw is the message. */
function errorText(error: unknown): string {
  return error instanceof Error ? error.message : DEFAULT_EDIT_ERROR;
}

/** One cell, as a map key. `JSON.stringify` because a key can hold the separator any join would use. */
function cellId(rowKey: Key, columnKey: Key): string {
  return JSON.stringify([rowKey, columnKey]);
}

/**
 * How far Tab looks for the next editable cell before giving up and leaving the grid. A bound rather
 * than a walk to the end: with a datasource the row list is lazy, and running off it would build a model
 * for every row of a table nobody has fetched.
 */
const SEARCH_LIMIT = 1000;

/**
 * Which editor a value asks for when its column names none: the numeric keypad for a number and a
 * checkbox for a flag, so a column of either kind is right without being declared.
 */
function inferEditor(value: unknown): CellEditorType {
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'checkbox';

  return 'text';
}

/**
 * What a printable key opens the editor on, or nothing when the key is not a value that editor can
 * hold. A `select` and a `checkbox` are chosen rather than typed, and a number field has to start as a
 * *number* or an Enter straight after the keystroke commits the character itself (#171).
 */
function seedFor(type: CellEditorType, initial: string): unknown {
  if (type === 'text') return initial;
  if (type !== 'number' || initial.trim() === '') return undefined;

  const parsed = Number(initial);

  return Number.isFinite(parsed) ? parsed : undefined;
}

/** What a pasted field reads as on a checkbox column. A spreadsheet writes the first of each pair. */
const TRUE_TEXT = new Set(['true', '1', 'yes']);
const FALSE_TEXT = new Set(['false', '0', 'no', '']);

/** What a pasted value is refused with when it is not the kind of value the cell holds at all. */
export const WRONG_KIND_ERROR = 'Wrong kind of value';

/**
 * The clipboard's text as the kind of value the cell already holds. A spreadsheet's clipboard carries no
 * types at all, so the editor the cell would open is what says how to read it — and a text that cannot be
 * that kind is refused here rather than asked about, since `NaN` is not a value worth judging. A `select`
 * is the one that judges itself: its options are a closed set, so a value outside them is not one.
 */
function pastedValue<TRow>(editor: CellEditorConfig<TRow>, options: CellEditorOption[], text: string): { value: unknown } | undefined {
  if (editor.type === 'number') {
    if (text.trim() === '') return { value: null };

    const parsed = Number(text);

    return Number.isFinite(parsed) ? { value: parsed } : undefined;
  }

  if (editor.type === 'checkbox') {
    const flag = text.trim().toLowerCase();

    if (TRUE_TEXT.has(flag)) return { value: true };

    return FALSE_TEXT.has(flag) ? { value: false } : undefined;
  }

  if (editor.type === 'select') {
    // Compared as text, kept as the option's own value: the clipboard flattened a number or a flag to its
    // spelling on the way out, and the cell has to hold what it held before.
    const option = options.find((candidate) => String(candidate.value) === text);

    return option ? { value: option.value } : undefined;
  }

  return { value: text };
}

/** A key that starts an edit by replacing the value: one printable character, unmodified. */
export function isTypingKey(event: React.KeyboardEvent): boolean {
  return event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey;
}

/** The cell an editor is open on, and the draft in it. */
interface ActiveEdit<TRow> {
  row: RowModel<TRow>;
  rowKey: Key;
  columnKey: Key;
  draft: unknown;
  error?: string;
  /** Bumped per commit, so an async validator answering for an abandoned edit is dropped. */
  token: number;
  pending: boolean;
}

/**
 * Cell editing: which cell is open, what is in it, what a commit is judged by, and the values the grid
 * has accepted. All of it lives here rather than in the editor component, so the four built-in editors
 * and one of your own are the same three calls — read `draft`, `setDraft`, `commit` or `cancel`.
 *
 * The accepted values are an **overlay** on the rows the grid was given: it does not own `data`, and a
 * grid over a `def.dataSource` owns even less of it, so a value that was only reported would be gone
 * again on the next render. It is read where a value is *displayed* — cells and exports — and nowhere a
 * value is *compared*, so an edit never re-sorts or re-filters the grid under the person making it.
 */
export default class EditModel<TRow> {
  constructor(public readonly grid: GridModel<TRow>) {}

  /** The accepted values, keyed by cell. Cleared by `clearEdits()` and by a datasource refresh. */
  private readonly values = new Map<string, unknown>();
  /** The cells the last paste was refused on. They keep the invalid ring, which is all a batch can show. */
  private rejected = new Set<string>();
  private _edits: CellEdit<TRow>[] = [];
  private _active?: ActiveEdit<TRow>;
  private _token = 0;

  /** Whether any column can be edited — what decides the grid reads a keystroke as a way in. */
  public get enabled(): boolean {
    const { def } = this.grid.props;

    return def.editable === true || def.columns.some((column) => column.editable !== undefined && column.editable !== false);
  }

  /** Whether this row and column can be edited. A row nobody has fetched yet cannot. */
  public isEditable(row: RowModel<TRow>, column: ColumnModel<TRow>): boolean {
    if (row.placeholder || !column.isData) return false;

    const editable = column.editable;

    return typeof editable === 'function' ? !!editable(row.data) : editable;
  }

  /** The editor a cell opens, worked out from the value in it when the column names none. */
  public editorFor(column: ColumnModel<TRow>, value: unknown): CellEditorConfig<TRow> {
    const { editor } = column.def;

    if (typeof editor === 'object') return editor;
    if (editor) return { type: editor };

    return { type: inferEditor(value) };
  }

  // ========== The cell being edited ==========

  public isEditing(rowKey: Key, columnKey: Key): boolean {
    return this._active?.rowKey === rowKey && this._active.columnKey === columnKey;
  }

  /** Whether an editor is open anywhere. A Ctrl+V while one is belongs to the editor, not to the grid. */
  public get isOpen(): boolean {
    return !!this._active;
  }

  /** Whether the last paste was refused on this cell, which is the only mark a batch of them can carry. */
  public isRejected(rowKey: Key, columnKey: Key): boolean {
    return this.rejected.size > 0 && this.rejected.has(cellId(rowKey, columnKey));
  }

  /** What is in the open editor. `undefined` when none is open, which a cell checks with `isEditing`. */
  public get draft(): unknown {
    return this._active?.draft;
  }

  /** What the last commit was rejected with. The editor stays open on it. */
  public get error(): string | undefined {
    return this._active?.error;
  }

  /** Whether an async validator has been asked and has not answered. */
  public get pending(): boolean {
    return !!this._active?.pending;
  }

  /**
   * Open an editor. `initial` is what a printable key typed on the cell starts it with — the value it
   * replaces rather than one it is appended to, which is how every spreadsheet reads a keystroke. Only
   * the two editors that are *typed into* take it; see `seedFor`.
   */
  public begin(row: RowModel<TRow>, column: ColumnModel<TRow>, value: unknown, initial?: string): void {
    const seed = initial === undefined ? undefined : seedFor(this.editorFor(column, value).type, initial);

    // Opening the editor on a cell a paste was refused on is the user answering it, so the mark goes.
    this.rejected.delete(cellId(row.key, column.key));
    this._active = {
      row,
      rowKey: row.key,
      columnKey: column.key,
      // `??`, not `||`: typing `0` on a number cell seeds a zero, and a falsy seed is still a seed.
      draft: seed ?? value,
      token: ++this._token,
      pending: false,
    };
    this.grid.notify();
  }

  /** Open the editor on a cell named by grid coordinates, which is where Tab lands. */
  public beginAt(row: number, column: number, initial?: string): boolean {
    const rowModel = this.grid.flatRows.value[row];
    const columnModel = this.grid.columns.value.visibleLeafs[column];

    if (!columnModel || !rowModel || rowModel.kind !== 'row' || !this.isEditable(rowModel, columnModel)) return false;

    const raw = rowModel.data[columnModel.key as keyof TRow];
    this.begin(rowModel, columnModel, this.valueOf(rowModel.key, columnModel.key, raw), initial);

    return true;
  }

  public setDraft(value: unknown): void {
    if (!this._active) return;

    // The message belongs to the value that was rejected, so typing is what clears it.
    this._active = { ...this._active, draft: value, error: undefined };
    this.grid.notify();
  }

  /** Close the editor with nothing written. Also what an accepted commit does on its way out. */
  public cancel(): void {
    if (!this._active) return;

    // A pending answer is for an edit nobody is waiting on any more.
    this._token++;
    this._active = undefined;
    this.grid.notify();
  }

  /**
   * Accept the draft, if `def.onCellEdit` lets it. A value that did not change is not an edit at all and
   * closes the editor without asking, which is what makes Tab through a row of cells cost nothing.
   */
  public commit(): void {
    const active = this._active;
    if (!active || active.pending) return;

    const { row, rowKey, columnKey, draft } = active;
    const oldValue = this.valueOf(rowKey, columnKey, row.data[columnKey as keyof TRow]);

    if (Object.is(draft, oldValue)) {
      this.cancel();
      return;
    }

    const edit: CellEdit<TRow> = { rowKey, columnKey, row: row.data, value: draft, oldValue };
    const result = this.grid.props.def.onCellEdit?.(edit);

    if (result instanceof Promise) {
      this._active = { ...active, pending: true };
      this.grid.notify();
      result.then(
        (answer) => this.settle(active.token, edit, answer),
        (error: unknown) => this.settle(active.token, edit, errorText(error)),
      );

      return;
    }

    this.settle(active.token, edit, result);
  }

  /** What an answer — a validator's, or its own for a synchronous edit — does to the open editor. */
  private settle(token: number, edit: CellEdit<TRow>, result: CellEditResult): void {
    // The editor moved on: this answer is about a cell nobody is editing any more.
    if (!this._active || this._active.token !== token) return;

    if (typeof result === 'string' || result === false) {
      this._active = { ...this._active, pending: false, error: typeof result === 'string' ? result : DEFAULT_EDIT_ERROR };
      this.grid.notify();

      return;
    }

    this.values.set(cellId(edit.rowKey, edit.columnKey), edit.value);
    this._edits = [...this._edits, edit];
    this._active = undefined;
    this.grid.notify();
    this.grid.props.onCellEditsChange?.(this._edits, { reason: 'edit' });
  }

  // ========== The values the grid has accepted ==========

  /** What a cell shows: the accepted value when there is one, the row's own otherwise. */
  public valueOf(rowKey: Key, columnKey: Key, raw: unknown): unknown {
    if (this.values.size === 0) return raw;

    const id = cellId(rowKey, columnKey);

    return this.values.has(id) ? this.values.get(id) : raw;
  }

  /** Every edit the grid has accepted, oldest first. */
  public get edits(): CellEdit<TRow>[] {
    return this._edits;
  }

  /**
   * Give the edits back to the host: the values stop being the grid's and the rows answer for themselves
   * again. A datasource refresh does the same on its own — the blocks are being fetched afresh, so what
   * the server says next is the newer answer.
   */
  public clearEdits = (): void => {
    if (this.values.size === 0 && this._edits.length === 0 && this.rejected.size === 0) return;

    this.values.clear();
    this.rejected.clear();
    this._edits = [];
    this.grid.notify();
    this.grid.props.onCellEditsChange?.(this._edits, { reason: 'clear' });
  };

  // ========== A block at a time ==========

  /**
   * Fill a block from the clipboard, one `def.onCellEdit` judgement per cell. `textAt` is read by offsets
   * into the block rather than by grid coordinates, because a short clipboard wraps to fill a long block
   * and only the caller knows what it was carrying.
   *
   * A refusal skips its own cell and nothing else: a paste is many independent judgements, and stopping
   * at the first bad value would leave the block half written with no way back. Everything the block
   * covered that cannot be edited at all — a read-only column, a group row, a row nobody has fetched — is
   * skipped before anything is asked, so a validator hears about cells that could actually take a value.
   */
  public paste(bounds: RangeBounds, textAt: (row: number, column: number) => string): void {
    const rows = this.grid.flatRows.value;
    const columns = this.grid.columns.value.visibleLeafs;
    const judge = this.grid.props.def.onCellEdit;
    const token = ++this._token;
    const asked: CellEdit<TRow>[] = [];
    const answers: (CellEditResult | Promise<CellEditResult>)[] = [];
    let skipped = 0;

    for (let at = bounds.startRow; at <= bounds.endRow; at++) {
      const row = rows[at];

      for (let column = bounds.startColumn; column <= bounds.endColumn; column++) {
        const columnModel = columns[column];
        const text = textAt(at - bounds.startRow, column - bounds.startColumn);

        if (row?.kind !== 'row' || !columnModel || !this.isEditable(row, columnModel)) {
          skipped++;
          continue;
        }

        const oldValue = this.valueOf(row.key, columnModel.key, row.data[columnModel.key as keyof TRow]);
        const parsed = pastedValue(this.editorFor(columnModel, oldValue), this.optionsFor(columnModel, row), text);
        const edit: CellEdit<TRow> = { rowKey: row.key, columnKey: columnModel.key, row: row.data, value: parsed?.value, oldValue };

        asked.push(edit);
        // A value the cell cannot hold is refused here: `def.onCellEdit` judges values, not spellings.
        answers.push(parsed ? judge?.(edit) : WRONG_KIND_ERROR);
      }
    }

    if (answers.some((answer) => answer instanceof Promise)) {
      void Promise.all(answers.map((answer) => Promise.resolve(answer).catch(errorText))).then((settled) =>
        this.settlePaste(token, bounds, asked, settled, skipped),
      );

      return;
    }

    this.settlePaste(token, bounds, asked, answers as CellEditResult[], skipped);
  }

  /** A `select`'s options, which may be a function of the row being pasted into. */
  private optionsFor(column: ColumnModel<TRow>, row: RowModel<TRow>): CellEditorOption[] {
    const { options } = typeof column.def.editor === 'object' ? column.def.editor : {};

    return (typeof options === 'function' ? options(row.data) : options) ?? [];
  }

  /**
   * What the block's answers do, once they are all in. One notification for the whole paste however many
   * cells it held — the edit stream is a list, and a hundred appends to it is a hundred renders.
   */
  private settlePaste(token: number, bounds: RangeBounds, asked: CellEdit<TRow>[], answers: CellEditResult[], skipped: number): void {
    // A second paste, or an editor opened while an async validator was still answering: this batch is
    // about a grid nobody is in any more.
    if (this._token !== token) return;

    const applied: CellEdit<TRow>[] = [];
    const rejected: RejectedCellEdit<TRow>[] = [];

    this.rejected.clear();

    asked.forEach((edit, at) => {
      const answer = answers[at];

      if (typeof answer === 'string' || answer === false) {
        this.rejected.add(cellId(edit.rowKey, edit.columnKey));
        rejected.push({ ...edit, error: typeof answer === 'string' ? answer : DEFAULT_EDIT_ERROR });

        return;
      }

      // A value that did not change is not an edit — which is what makes pasting a column back over
      // itself, the way a spreadsheet is used, cost nothing at all.
      if (Object.is(edit.value, edit.oldValue)) return;

      this.values.set(cellId(edit.rowKey, edit.columnKey), edit.value);
      applied.push(edit);
    });

    if (applied.length > 0) this._edits = [...this._edits, ...applied];

    this.grid.notify();

    if (applied.length > 0) this.grid.props.onCellEditsChange?.(this._edits, { reason: 'paste' });

    this.grid.props.onPaste?.({ range: this.grid.range.rangeOf(bounds), applied, rejected, skipped });
  }

  // ========== Where Tab goes ==========

  /**
   * The next editable cell, as a pair of grid coordinates — along the row first and on into the rows
   * after it, which is the order Tab walks a spreadsheet in. Nothing when there is none: Tab then does
   * what Tab does in a grid, and leaves.
   */
  public nextEditable(row: number, column: number, back = false): { row: number; column: number } | undefined {
    const rows = this.grid.flatRows.value;
    const columns = this.grid.columns.value.visibleLeafs;
    const step = back ? -1 : 1;
    const from = row * columns.length + column + step;
    const last = Math.min(rows.length * columns.length - 1, from + SEARCH_LIMIT);

    for (let at = from; at >= Math.max(0, from - SEARCH_LIMIT) && at <= last; at += step) {
      const rowAt = Math.floor(at / columns.length);
      const columnAt = at % columns.length;
      const candidate = rows[rowAt];
      const columnModel = columns[columnAt];

      if (!columnModel || candidate?.kind !== 'row' || !this.isEditable(candidate, columnModel)) continue;

      return { row: rowAt, column: columnAt };
    }

    return undefined;
  }
}
