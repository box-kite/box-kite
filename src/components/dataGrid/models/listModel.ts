import memo from '../../../utils/memo';
import { FilterValue, Key, ListRole } from '../contracts/dataGridContract';
import ColumnModel from './columnModel';
import DetailRowModel from './detailRowModel';
import GridModel from './gridModel';
import GroupRowModel from './groupRowModel';
import RowModel from './rowModel';

/** 36rem: where Polaris, Roselli and the Scottish Government's tables all give up on columns. */
export const DEFAULT_LIST_BREAKPOINT = 576;
/** How many labelled values an item shows before the rest wait for the record view. */
export const DEFAULT_LIST_FIELDS = 4;
/** How many items one "Show more" adds — a couple of screens of phone. */
export const DEFAULT_LIST_BATCH = 20;

/** Which columns an item draws where. Every list is in column order. */
export interface ListItemLayout<TRow> {
  title?: ColumnModel<TRow>;
  kicker?: ColumnModel<TRow>;
  subtitle: ColumnModel<TRow>[];
  end?: ColumnModel<TRow>;
  fields: ColumnModel<TRow>[];
  /** The columns only the record view shows. */
  detail: ColumnModel<TRow>[];
}

/** One column filter that is set, the way its chip says it. */
export interface ActiveFilterChip<TRow> {
  column: ColumnModel<TRow>;
  label: string;
  value: string;
}

export type ListSheet = 'sort' | 'filter';
/** One entry of the list, and where it sits in the grid's own rows — which is what a record is opened at. */
export interface ListEntry<TRow> {
  row: RowModel<TRow> | GroupRowModel<TRow>;
  index: number;
}

type FlatRow<TRow> = RowModel<TRow> | GroupRowModel<TRow> | DetailRowModel<TRow>;

/**
 * The grid drawn for a phone: a list of items instead of a table. It decides when the grid switches, which
 * column goes where in an item, how many items are drawn, which sheet is open, whether the list is selecting,
 * and which row the record view is on. The rows, the filters and the sort stay the grid's — an item is another
 * drawing of the same row, so whatever a table does to a row it does to an item.
 */
export default class ListModel<TRow> {
  constructor(public readonly grid: GridModel<TRow>) {}

  private get config() {
    return this.grid.props.def.list ?? {};
  }

  public get breakpoint(): number {
    return this.config.breakpoint ?? DEFAULT_LIST_BREAKPOINT;
  }

  private _width = 0;

  /** The grid's own width in px, 0 until something has measured it — which a server render never does. */
  public get width(): number {
    return this._width;
  }

  /** Whether the grid draws a list. `auto` decides on the grid's own width rather than the viewport's. */
  public get active(): boolean {
    const layout = this.grid.props.def.layout ?? 'auto';
    if (layout !== 'auto') return layout === 'list';

    // Unmeasured is a table: a server cannot know the width, and a table is what a wide screen expects.
    return this._width > 0 && this._width < this.breakpoint;
  }

  /** Report the grid's width. Only crossing the breakpoint redraws anything. */
  public setWidth = (width: number): void => {
    const was = this.active;
    this._width = width;

    if (this.active !== was) this.grid.notify();
  };

  // ========== The item ==========

  /**
   * Which column goes where. A column's `list` role wins; otherwise the first data column is the title, the
   * first end-aligned one — a total, an amount — sits opposite it, the next few are fields and the rest wait
   * for the record view. A grouped column is its group's header, so it is not repeated in every item.
   */
  public readonly layout = memo(
    () => {
      const grouped = this.grid.groupColumns;
      const columns = this.grid.columns.value.visibleLeafs.filter((c) => c.isData && !grouped.has(c.key) && c.def.list !== 'hidden');
      const roleOf = (c: ColumnModel<TRow>): ListRole | undefined => c.def.list;
      const free = (c: ColumnModel<TRow>) => roleOf(c) === undefined;

      const treeKey = this.grid.tree.enabled ? this.grid.tree.columnKey : undefined;
      const title = columns.find((c) => roleOf(c) === 'title') ?? columns.find((c) => c.key === treeKey && free(c)) ?? columns.find(free);
      const end = columns.find((c) => c !== title && roleOf(c) === 'end') ?? columns.find((c) => c !== title && free(c) && c.isEndAligned);
      const kicker = columns.find((c) => roleOf(c) === 'kicker');
      const subtitle = columns.filter((c) => roleOf(c) === 'subtitle');

      const max = this.config.fields ?? DEFAULT_LIST_FIELDS;
      const fields: ColumnModel<TRow>[] = [];
      const detail: ColumnModel<TRow>[] = [];

      for (const column of columns) {
        if (column === title || column === end || column === kicker || subtitle.includes(column)) continue;

        const role = roleOf(column);
        if (role === 'field' || (role === undefined && fields.length < max)) fields.push(column);
        else detail.push(column);
      }

      return { title, kicker, subtitle, end, fields, detail } satisfies ListItemLayout<TRow>;
    },
    () => [this.grid.columns],
  );

  /** Every column the record view lists, in column order. */
  public get recordColumns(): ColumnModel<TRow>[] {
    const { title, kicker, subtitle, end, fields, detail } = this.layout.value;
    const shown = new Set([title, kicker, end, ...subtitle, ...fields, ...detail]);

    return this.grid.columns.value.visibleLeafs.filter((c) => shown.has(c));
  }

  // ========== How many items ==========

  private get batch(): number {
    return this.config.batchSize ?? DEFAULT_LIST_BATCH;
  }

  private _limit?: { query: string; count: number };

  /**
   * What the list is a list of. A different answer is a different list, so "Show more" starts again from one
   * batch — while opening a group or a detail panel changes the rows and not the question, and keeps what the
   * reader has already scrolled through.
   */
  private get query(): string {
    const { grid } = this;

    return JSON.stringify([
      grid.globalFilterValue,
      grid.columnFilters,
      grid.sortColumn,
      grid.sortDirection,
      [...grid.groupColumns],
      grid.source.enabled ? grid.source.queryVersion : grid.data.length,
    ]);
  }

  /** Where the list is cut: whole batches, or nowhere when the grid is paginated, since a page is the batch. */
  private get count(): number {
    if (this.grid.isPaginated) return Infinity;

    const { query } = this;
    if (this._limit?.query !== query) this._limit = { query, count: this.batch };

    return this._limit.count;
  }

  private _more = 0;

  /**
   * The entries drawn now, up to the cut — a detail panel is drawn inside its own item. A walk from the top
   * rather than a filter, because a datasource's list is lazy and walking all of it is a model per row.
   */
  public get visibleItems(): ListEntry<TRow>[] {
    const rows = this.grid.flatRows.value;
    const count = this.count;
    const items: ListEntry<TRow>[] = [];
    let index = 0;

    for (; index < rows.length && items.length < count; index++) {
      const row = rows[index];
      if (row.kind !== 'detail') items.push({ row, index });
    }

    // The detail panel of the last item drawn belongs to it, so it is not "more".
    while (index < rows.length && rows[index].kind === 'detail') index++;
    this._more = rows.length - index;

    return items;
  }

  /** Whether entries are left past the cut. Read after `visibleItems`, which is what measures it. */
  public get hasMore(): boolean {
    return !this.grid.isPaginated && this._more > 0;
  }

  /** How many entries the next "Show more" adds. Read after `visibleItems`. */
  public get nextBatch(): number {
    return Math.min(this.batch, this._more);
  }

  public showMore = (): void => {
    this._limit = { query: this.query, count: this.count + this.batch };
    this.grid.notify();
  };

  // ========== Selecting ==========

  private _selecting = false;

  /**
   * Whether a press on an item ticks it rather than opening it. Selection is a mode on a phone — iOS's edit
   * mode, Android's contextual bar — because a checkbox on every item is a target a thumb hits by accident.
   */
  public get selecting(): boolean {
    return !!this.grid.props.def.rowSelection && this._selecting;
  }

  public setSelecting = (selecting: boolean): void => {
    if (this._selecting === selecting) return;

    this._selecting = selecting;
    this.grid.notify();
  };

  /** The id of a row's checkbox, which the item's title is the label of — so a press anywhere on the item ticks it. */
  public checkboxId(key: Key): string {
    return `${this.grid.identifier}-pick-${encodeURIComponent(String(key))}`;
  }

  // ========== Sheets ==========

  private _sheet: ListSheet | null = null;

  /** Which bottom sheet is open — the sort or the filters — or `null`. */
  public get sheet(): ListSheet | null {
    return this._sheet;
  }

  public openSheet = (sheet: ListSheet | null): void => {
    if (this._sheet === sheet) return;

    this._sheet = sheet;
    this.grid.notify();
  };

  /** The columns the sort sheet offers. */
  public get sortableColumns(): ColumnModel<TRow>[] {
    return this.grid.columns.value.visibleLeafs.filter((c) => c.isData && c.sortable);
  }

  /** The column the grid is sorted by, when it is one the sheet offers. */
  public get sortedColumn(): ColumnModel<TRow> | undefined {
    const key = this.grid.sortColumn;
    if (key === undefined) return undefined;

    return this.sortableColumns.find((c) => c.key === key);
  }

  /** The columns the filter sheet offers. */
  public get filterableColumns(): ColumnModel<TRow>[] {
    return this.grid.columns.value.visibleLeafs.filter((c) => c.isData && !!c.filterConfig);
  }

  /** Every column filter that is set, the way a chip says it. */
  public get activeFilters(): ActiveFilterChip<TRow>[] {
    const filters = this.grid.columnFilters;

    return this.grid.columns.value.leafs.flatMap((column) => {
      const filter = filters[column.key as keyof TRow];
      if (!filter) return [];

      return [{ column, label: String(column.header ?? column.key), value: this.describe(column, filter) }];
    });
  }

  /** A filter in words: `“ali”`, `≥ 30`, `20–40`, `Japan, Spain +2`. */
  public describe(column: ColumnModel<TRow>, filter: FilterValue): string {
    switch (filter.type) {
      case 'text':
        return `“${filter.value}”`;
      case 'number':
        return filter.operator === 'between'
          ? `${filter.value}–${filter.valueTo ?? ''}`
          : `${OPERATOR_SYMBOLS[filter.operator]} ${filter.value}`;
      case 'multiselect': {
        const options = column.filterOptions;
        const labels = filter.values.map((v) =>
          v === null ? this.grid.localeText.filterEmptyValue : (options.find((o) => o.value === v)?.label ?? String(v)),
        );
        const shown = labels.slice(0, 2).join(', ');

        return labels.length > 2 ? `${shown} +${labels.length - 2}` : shown;
      }
    }
  }

  // ========== The record view ==========

  private _record: { index: number; key: Key } | null = null;

  /** The row the record view is showing, or `undefined` while it is shut. */
  public get record(): RowModel<TRow> | undefined {
    if (!this._record) return undefined;

    const rows = this.grid.flatRows.value;
    const { index, key } = this._record;
    if (isRecord(rows[index]) && rows[index].key === key) return rows[index];

    // The list moved under it — a panel opened above, a block arrived — so find the row again. Bounded,
    // because a datasource's list is lazy and a search through all of it builds a model per row.
    let found = -1;
    for (let i = 0; i < Math.min(rows.length, SEARCH_LIMIT) && found === -1; i++) {
      const row = rows[i];
      if (isRecord(row) && row.key === key) found = i;
    }
    if (found === -1) return undefined;

    this._record = { index: found, key };

    return rows[found] as RowModel<TRow>;
  }

  /** Whether pressing an item opens its record. */
  public get recordViewEnabled(): boolean {
    return this.config.recordView ?? true;
  }

  /** Open the record view on a row, at its index in the grid's rows. */
  public openRecord = (row: RowModel<TRow>, index: number): void => {
    this._record = { index, key: row.key };
    this.grid.notify();
  };

  public closeRecord = (): void => {
    if (!this._record) return;

    this._record = null;
    this.grid.notify();
  };

  private neighbour(step: 1 | -1): number {
    if (!this.record || !this._record) return -1;

    const rows = this.grid.flatRows.value;

    for (let i = this._record.index + step; i >= 0 && i < rows.length; i += step) {
      const row = rows[i];
      if (isRecord(row) && !row.placeholder) return i;
    }

    return -1;
  }

  public get hasPreviousRecord(): boolean {
    return this.neighbour(-1) !== -1;
  }

  public get hasNextRecord(): boolean {
    return this.neighbour(1) !== -1;
  }

  /** Step to the record before or after this one, past group headers and detail panels. */
  public stepRecord = (step: 1 | -1): void => {
    const index = this.neighbour(step);
    if (index === -1) return;

    this._record = { index, key: (this.grid.flatRows.value[index] as RowModel<TRow>).key };

    // A record past the items drawn draws them too, so closing the view lands next to an item that exists.
    if (this._limit && index >= this._limit.count) this._limit = { query: this.query, count: index + 1 };

    this.grid.notify();
  };

  /** Where the record sits among the rows — "3 of 40" — counting rows, not group headers. */
  public get recordPosition(): { position: number; total: number } | undefined {
    if (!this.record || !this._record) return undefined;

    if (this.grid.source.enabled) return { position: this._record.index + 1, total: this.grid.totalRowCount };

    const rows = this.grid.flatRows.value;
    let position = 0;
    let total = 0;

    for (let i = 0; i < rows.length; i++) {
      if (!isRecord(rows[i])) continue;

      total++;
      if (i <= this._record.index) position++;
    }

    return { position, total };
  }
}

const SEARCH_LIMIT = 10_000;
const OPERATOR_SYMBOLS = { eq: '=', ne: '≠', gt: '>', gte: '≥', lt: '<', lte: '≤' } as const;

function isRecord<TRow>(row: FlatRow<TRow> | undefined): row is RowModel<TRow> {
  return !!row && row.kind === 'row';
}
