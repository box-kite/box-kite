import { CellEditorConfig } from '../contracts/dataGridContract';
import ColumnModel from './columnModel';
import GridModel from './gridModel';
import RowModel from './rowModel';

export default class CellModel<TRow> {
  constructor(
    public readonly grid: GridModel<TRow>,
    public readonly row: RowModel<TRow>,
    public readonly column: ColumnModel<TRow>,
  ) {}

  public get value() {
    if (this.column.isRowNumber) return this.row.rowIndex + 1;

    const raw = this.row.data[this.column.key as keyof TRow];

    // Through the edits rather than straight off the row: the grid does not own `data`, so a value it
    // accepted is only here. Nothing that *compares* values reads this, which is why an edit never
    // re-sorts the grid.
    return this.grid.edits.valueOf(this.row.key, this.column.key, raw) as TRow[keyof TRow];
  }

  public get isExpanded(): boolean {
    return this.row.expanded;
  }

  public get selected(): boolean {
    return this.row.selected;
  }

  public get isFirst(): boolean {
    return this.row.cells[0] === this;
  }

  public get isLast(): boolean {
    const cells = this.row.cells;
    return cells[cells.length - 1] === this;
  }

  /** Toggle this row's detail panel (used by the row-detail expand cell). */
  public toggleDetail = (): void => {
    this.grid.toggleDetailRow(this.row.key);
  };

  /** Whether the row is half-selected — a tree row whose subtree is partly ticked. */
  public get indeterminate(): boolean {
    return this.row.indeterminate;
  }

  /** Toggle this row's selection (used by the row-selection checkbox cell). The row owns what that means. */
  public toggleSelection = (): void => {
    this.row.toggleSelection();
  };

  // ========== Editing ==========

  /** Whether this cell can be edited at all — the column's answer about this row. */
  public get editable(): boolean {
    return this.grid.edits.isEditable(this.row, this.column);
  }

  /** Whether the editor is open on this cell. One cell at a time, grid-wide. */
  public get editing(): boolean {
    return this.grid.edits.isEditing(this.row.key, this.column.key);
  }

  /** Which editor this cell opens, resolved from the column or read off the value in it. */
  public get editor(): CellEditorConfig<TRow> {
    return this.grid.edits.editorFor(this.column, this.value);
  }

  /** What is in the open editor — the value a custom `EditCell` binds its control to. */
  public get draft(): unknown {
    return this.grid.edits.draft;
  }

  /** What the last commit was rejected with. The editor stays open until it is fixed or abandoned. */
  public get error(): string | undefined {
    return this.grid.edits.error;
  }

  /** Whether the last paste was refused on this cell. A batch shows its refusals on the cells, not in
   *  an editor: there is no editor open on any of them, and the messages go to `onPaste`. */
  public get rejected(): boolean {
    return this.grid.edits.isRejected(this.row.key, this.column.key);
  }
  /** Whether an async `def.onCellEdit` has been asked about this cell and has not answered. */
  public get pending(): boolean {
    return this.grid.edits.pending;
  }

  /**
   * Open the editor on this cell. `initial` is what a printable key pressed on the cell starts it with,
   * replacing the value rather than being appended to it.
   */
  public beginEdit = (initial?: string): void => {
    if (!this.editable) return;

    this.grid.edits.begin(this.row, this.column, this.value, initial);
  };

  /** Write a new draft into the open editor. */
  public setDraft = (value: unknown): void => {
    this.grid.edits.setDraft(value);
  };

  /** Accept the draft, if `def.onCellEdit` lets it — what Enter does. */
  public commitEdit = (): void => {
    this.grid.edits.commit();
  };

  /** Close the editor with nothing written — what Escape does. */
  public cancelEdit = (): void => {
    this.grid.edits.cancel();
  };
}
