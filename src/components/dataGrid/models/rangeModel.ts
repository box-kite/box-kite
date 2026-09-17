import { CellRange, DataGridRangeReason, Key } from '../contracts/dataGridContract';
import { GROUPING_CELL_KEY } from './cellKeys';
import type ColumnModel from './columnModel';
import type GridModel from './gridModel';
import type RowModel from './rowModel';

/** A body cell, as the grid counts them: a row of the display list and a visible leaf column. */
export interface CellPosition {
  row: number;
  column: number;
}

/** The rectangle two corners describe, in display order and inclusive at both ends. */
export interface RangeBounds {
  startRow: number;
  endRow: number;
  startColumn: number;
  endColumn: number;
}

/** What a TSV field has to be quoted for: the two separators, and the quote itself. */
const NEEDS_QUOTES = /["\t\r\n]/;

/**
 * One value as a clipboard field. A quoted field doubles its own quotes, which is the one escape TSV
 * has — and the reason a value carrying a tab or a newline survives the round trip into a spreadsheet.
 */
function fieldText(value: unknown): string {
  if (value === null || value === undefined) return '';

  const text = value instanceof Date ? value.toISOString() : String(value);

  return NEEDS_QUOTES.test(text) ? `"${text.split('"').join('""')}"` : text;
}

/**
 * A rectangle of values as the text a spreadsheet pastes: tabs between the cells, CRLF between the rows.
 * Excel, Sheets and Numbers all split on the tab natively, which is why the clipboard carries no file.
 */
export function toTsv(rows: unknown[][]): string {
  return rows.map((row) => row.map(fieldText).join('\t')).join('\r\n');
}

/**
 * The same text back, as a rectangle. Scanned character by character rather than split on the separators,
 * because inside a quoted field a tab is a character and a newline is not the end of a row — which is the
 * whole reason the quoting exists. A trailing newline ends the last row rather than opening an empty one.
 */
export function fromTsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let at = 0; at < text.length; at++) {
    const char = text[at];

    if (quoted) {
      // A doubled quote is one quote; a lone one ends the quoting, and anything after it is literal.
      if (char === '"' && text[at + 1] === '"') {
        field += '"';
        at++;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"' && field === '') {
      quoted = true;
    } else if (char === '\t') {
      row.push(field);
      field = '';
    } else if (char === '\r' || char === '\n') {
      // CRLF is one break. Excel writes it, and splitting on both would put a blank row between every pair.
      if (char === '\r' && text[at + 1] === '\n') at++;

      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }

  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function samePosition(a: CellPosition | undefined, b: CellPosition | undefined): boolean {
  return a?.row === b?.row && a?.column === b?.column;
}

/**
 * The current cell and the rectangle it reaches: which cell the arrows carry on from, which block a drag
 * or a Shift+arrow has marked, and what Ctrl+C writes.
 *
 * The current cell lives here rather than in a `:focus-visible` rule (bug #64) for two reasons a CSS
 * pseudo-class cannot answer: a *clicked* cell never matches one, and the mark has to survive the grid
 * losing focus — otherwise a copy has nothing to act on and a range has nowhere to extend from. The
 * roving focus still owns the tab stop and moves the DOM focus; every move it makes is mirrored here,
 * which is what keeps the two from disagreeing about where the user is.
 */
export default class RangeModel<TRow> {
  constructor(public readonly grid: GridModel<TRow>) {}

  private _anchor?: CellPosition;
  private _focus?: CellPosition;
  private _dragging = false;

  /**
   * Whether a block of cells can be marked at all. Copy needs no opt-in — it acts on the current cell,
   * which every grid has — but extending does: a drag that selects cells is a drag that no longer
   * selects text, and that is a decision about the page rather than about the grid.
   */
  public get enabled(): boolean {
    return !!this.grid.props.def.rangeSelection;
  }

  /** The cell the arrows carry on from, and the corner a Shift+arrow moves. */
  public get current(): CellPosition | undefined {
    return this._focus;
  }

  /** Whether a pointer is marking cells right now, which is what makes a cell answer to being entered. */
  public get isDragging(): boolean {
    return this._dragging;
  }

  /** The rectangle, normalized, or nothing at all when no cell is current. */
  public get bounds(): RangeBounds | undefined {
    const anchor = this._anchor;
    const focus = this._focus;

    if (!anchor || !focus) return undefined;

    return {
      startRow: Math.min(anchor.row, focus.row),
      endRow: Math.max(anchor.row, focus.row),
      startColumn: Math.min(anchor.column, focus.column),
      endColumn: Math.max(anchor.column, focus.column),
    };
  }

  /** Whether the rectangle covers more than the current cell — the only case anything is *selected*. */
  public get hasSelection(): boolean {
    const bounds = this.bounds;

    return !!bounds && (bounds.startRow !== bounds.endRow || bounds.startColumn !== bounds.endColumn);
  }

  public isCurrent(row: number, column: number): boolean {
    return this._focus?.row === row && this._focus.column === column;
  }

  /** Whether the cell is part of a marked block. A single current cell is the cursor, not a selection. */
  public isSelected(row: number, column: number): boolean {
    const bounds = this.bounds;

    if (!bounds || !this.hasSelection) return false;

    return row >= bounds.startRow && row <= bounds.endRow && column >= bounds.startColumn && column <= bounds.endColumn;
  }

  // ========== Moving ==========

  /**
   * Put the current cell here. `extend` keeps the anchor where it is, which is what makes Shift+arrow and
   * a drag grow a rectangle instead of moving a cursor.
   */
  public setCurrent(row: number, column: number, extend = false): void {
    const focus = { row, column };
    const anchor = extend && this._anchor ? this._anchor : focus;

    if (samePosition(this._focus, focus) && samePosition(this._anchor, anchor)) return;

    this._anchor = anchor;
    this._focus = focus;
    this.grid.notify();
    this.emit(extend ? 'extend' : 'select');
  }

  /**
   * Follow a focus the grid did not ask for — a press, a Tab out of an editor, a cell focused by name.
   * It collapses the rectangle only when it lands somewhere the model was not already: a Shift+press has
   * already extended by the time the browser focuses the cell it landed on, and must not be undone.
   */
  public syncCurrent(row: number, column: number): void {
    if (this.isCurrent(row, column)) return;

    this.setCurrent(row, column);
  }

  /** Give up the current cell — what a move into the header or the footer leaves behind. */
  public clear(): void {
    if (!this._focus && !this._anchor) return;

    this._anchor = undefined;
    this._focus = undefined;
    this._dragging = false;
    this.grid.notify();
    this.emit('clear');
  }

  // ========== The pointer ==========

  /**
   * A press on a cell. Shift extends from wherever the anchor is; anything else collapses onto this cell
   * and starts marking, so a drag out of it is one gesture. The browser focuses the cell straight after,
   * which `syncCurrent` then sees as the position it already holds.
   */
  public press(row: number, column: number, extend: boolean): void {
    this.setCurrent(row, column, extend);

    if (!extend) this._dragging = true;
  }

  /** A cell entered while the pointer is down. */
  public dragTo(row: number, column: number): void {
    if (!this._dragging) return;

    this.setCurrent(row, column, true);
  }

  public endDrag = (): void => {
    if (!this._dragging) return;

    this._dragging = false;
    this.grid.notify();
  };

  // ========== What is in it ==========

  /** The columns a rectangle covers, in display order. The marked one when none is named. */
  public columnsOf(bounds = this.bounds): ColumnModel<TRow>[] {
    if (!bounds) return [];

    return this.grid.columns.value.visibleLeafs.slice(bounds.startColumn, bounds.endColumn + 1);
  }

  /**
   * One cell's value for the clipboard: the export pipeline, so a copied figure is the one a `.csv` of
   * the same grid would carry — the column's `exportValue` when it has one, and the accepted edit over
   * either. The grid's own columns hold no data, bar the row number, which is a value worth copying.
   */
  private valueOf(column: ColumnModel<TRow>, row: RowModel<TRow>): unknown {
    if (column.isRowNumber) return row.rowIndex + 1;
    if (!column.isData) return null;

    return this.grid.exporter.value(column, row.data);
  }

  /**
   * The rectangle, row by row. Rows that hold no cells of their own keep their place rather than closing
   * the gap — a group row carries its own value in the column it groups by, and a detail panel or a block
   * nobody has fetched copies as blanks, so what is pasted is the shape that was on screen.
   */
  public values(bounds = this.bounds): unknown[][] {
    if (!bounds) return [];

    const columns = this.columnsOf(bounds);
    const rows = this.grid.flatRows.value;
    const table: unknown[][] = [];

    for (let at = bounds.startRow; at <= bounds.endRow; at++) {
      const row = rows[at];

      // `kind` rather than `instanceof`: a model reaching for one of these classes at load time is the
      // import cycle `cellKeys.ts` exists to avoid, and it leaves a base class undefined.
      if (row?.kind === 'group') {
        // Grouping takes the column it groups by off the screen and puts one spanning cell in its place,
        // so that cell is where the value is — the bare value, not the `Oslo (2)` the row is labelled with.
        table.push(
          columns.map((column) => (column.key === GROUPING_CELL_KEY || column.key === row.groupColumn.key ? row.groupValue : null)),
        );
      } else if (row?.kind === 'row' && !row.placeholder) {
        table.push(columns.map((column) => this.valueOf(column, row)));
      } else {
        table.push(columns.map(() => null));
      }
    }

    return table;
  }

  /** A rectangle as a consumer hears about it. `values` is a call because a range can be very large. */
  public rangeOf(bounds: RangeBounds): CellRange {
    const columns: Key[] = this.columnsOf(bounds).map((column) => column.key);

    return { startRow: bounds.startRow, endRow: bounds.endRow, columns, values: () => this.values(bounds) };
  }

  private get range(): CellRange | undefined {
    const bounds = this.bounds;

    return bounds && this.rangeOf(bounds);
  }

  private emit(reason: DataGridRangeReason): void {
    this.grid.props.onRangeChange?.(this.range, { reason });
  }

  // ========== The clipboard ==========

  /**
   * Ctrl+C, through the browser's own copy event rather than through a keystroke: `clipboardData` is
   * writable there with no permission and no promise, and the same press on a page with text selected in
   * it still belongs to the browser — which is why a live selection is left alone rather than overridden.
   */
  public onCopy = (event: React.ClipboardEvent): void => {
    if (!this._focus || !event.clipboardData) return;

    const selection = event.currentTarget.ownerDocument.defaultView?.getSelection();
    if (selection && !selection.isCollapsed) return;

    event.clipboardData.setData('text/plain', toTsv(this.values()));
    event.preventDefault();
  };

  /**
   * Where a paste lands. Each axis takes whichever is longer — the block that is marked, or the clipboard
   * — so a block bigger than the clipboard is tiled with it and a clipboard bigger than the block spills
   * past it, both clipped at the edge of the grid. That one rule covers the two cases a spreadsheet keeps
   * apart, and the degenerate one with it: a paste onto the current cell alone starts from a 1×1 block.
   */
  private pasteBounds(rows: number, columns: number): RangeBounds | undefined {
    const bounds = this.bounds;

    if (!bounds || rows === 0 || columns === 0) return undefined;

    const lastRow = this.grid.flatRows.value.length - 1;
    const lastColumn = this.grid.columns.value.visibleLeafs.length - 1;

    return {
      startRow: bounds.startRow,
      endRow: Math.min(lastRow, bounds.startRow + Math.max(bounds.endRow - bounds.startRow + 1, rows) - 1),
      startColumn: bounds.startColumn,
      endColumn: Math.min(lastColumn, bounds.startColumn + Math.max(bounds.endColumn - bounds.startColumn + 1, columns) - 1),
    };
  }

  /**
   * Ctrl+V, through the browser's own paste event for the reason the copy rides its own: the text is on
   * the event, with no permission to ask for and no promise to wait on. A paste that reaches an open
   * editor belongs to the editor — that is a value being typed, not a block being filled.
   */
  public onPaste = (event: React.ClipboardEvent): void => {
    if (!this._focus || !event.clipboardData || this.grid.edits.isOpen || !this.grid.edits.enabled) return;

    const text = event.clipboardData.getData('text/plain');
    if (!text) return;

    const cells = fromTsv(text);
    const width = cells.reduce((widest, row) => Math.max(widest, row.length), 0);
    const bounds = this.pasteBounds(cells.length, width);

    if (!bounds) return;

    event.preventDefault();
    // The offsets are into the block, and they wrap: a short clipboard repeats to fill a longer block, and
    // a ragged row — a spreadsheet writes one wherever a trailing cell was empty — reads as blank.
    this.grid.edits.paste(bounds, (row, column) => cells[row % cells.length][column % width] ?? '');
  };
}
