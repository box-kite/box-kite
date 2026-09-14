import lazyList from '../../../utils/array/lazyList';
import { DataSource, DataSourceRequest } from '../contracts/dataGridContract';
import DetailRowModel from './detailRowModel';
import GridModel from './gridModel';
import RowModel from './rowModel';
import SourceRowModel from './sourceRowModel';

/** Where one block of rows has got to. A block is the unit of a request, of a wait and of a failure. */
export type BlockStatus = 'loading' | 'loaded' | 'error';

interface Block<TRow> {
  status: BlockStatus;
  rows: TRow[];
  error?: unknown;
  /** Aborts the request that is filling it; kept so a superseded query costs the network nothing. */
  controller?: AbortController;
}

/** Rows per request when nothing says otherwise — big enough to be one round trip a screenful. */
const DEFAULT_BLOCK_SIZE = 100;
/** Blocks kept before the ones furthest from the viewport are dropped. */
const DEFAULT_MAX_BLOCKS = 40;

/**
 * The server row model: the grid asks `def.dataSource` for blocks and this holds them. Everything the
 * grid would have done over `data` — filtering, sorting, paging — is a *request* here, so the browser
 * never holds more than the blocks in play.
 *
 * The one invariant worth naming: a response is only accepted while the query it was asked under is
 * still the current one. `_query` is bumped by every sort, filter and page change, a request carries the
 * value it was made at, and a late answer to an old question is dropped rather than written over a new
 * one — which is the whole of the out-of-order problem an async row model has.
 */
export default class DataSourceModel<TRow> {
  constructor(private readonly grid: GridModel<TRow>) {}

  private blocks = new Map<number, Block<TRow>>();
  /** Block indexes in the order they were last wanted; the front of it is what eviction takes. */
  private recent: number[] = [];
  private _query = 0;
  private _totalCount?: number;
  /** True once a block came back shorter than it was asked for: there is nothing past it. */
  private _reachedEnd = false;

  public get config(): DataSource<TRow> | undefined {
    return this.grid.props.def.dataSource;
  }

  /** Whether the grid fetches its own rows. With no datasource every getter here is inert. */
  public get enabled(): boolean {
    return !!this.config;
  }

  public get blockSize(): number {
    const configured = this.config?.blockSize;
    if (configured && configured > 0) return Math.floor(configured);

    return this.grid.isPaginated ? this.grid.pageSize : DEFAULT_BLOCK_SIZE;
  }

  private get maxBlocks(): number {
    const configured = this.config?.maxBlocks;

    return configured && configured > 0 ? Math.floor(configured) : DEFAULT_MAX_BLOCKS;
  }

  /**
   * Bumped by every change that makes the cache stale. The adapter's fetch effect depends on it, so an
   * invalidation that leaves the visible range where it was still refills — which every filter does.
   */
  public get queryVersion(): number {
    return this._query;
  }

  /** The count the server gave, once it has given one. */
  public get totalCount(): number | undefined {
    return this._totalCount;
  }

  /** Whether any block is in flight — what the loading bar is drawn from. */
  public get isLoading(): boolean {
    for (const block of this.blocks.values()) {
      if (block.status === 'loading') return true;
    }

    return false;
  }

  /** The most recent failure still unanswered, which is what the error strip reports. */
  public get error(): unknown {
    for (const index of this.failedBlocks()) {
      return this.blocks.get(index)!.error;
    }

    return undefined;
  }

  private failedBlocks(): number[] {
    const failed: number[] = [];
    this.blocks.forEach((block, index) => block.status === 'error' && failed.push(index));

    return failed;
  }

  /**
   * How many rows the grid lays out. The server's count when there is one; otherwise what has been
   * loaded, plus one block to scroll into — which is what keeps an uncounted source reachable.
   */
  public get rowCount(): number {
    if (!this.enabled) return 0;
    if (this._totalCount !== undefined) return this._totalCount;

    let end = 0;
    this.blocks.forEach((block, index) => {
      if (block.status === 'loaded') end = Math.max(end, index * this.blockSize + block.rows.length);
    });

    return this._reachedEnd ? end : end + this.blockSize;
  }

  /** One model per row, built when somebody looks at that row and dropped with the block behind it. */
  private models = new Map<number, SourceRowModel<TRow>>();
  /** How long the last row list was, which is the only thing that can make it stale. */
  private listLength = -1;

  /**
   * The grid's rows. Lazy, because this is the list a million-row grid lays out: a model per row cost
   * 1.4 seconds of blocked main thread on every block that arrived (measured, Chrome 152), and the rows
   * read their values through the cache anyway, so there was never anything to rebuild.
   */
  public rowList(): RowModel<TRow>[] {
    const { start } = this.visibleRange();

    this.listLength = this.visibleLength();

    return lazyList(this.listLength, (index) => this.rowModelAt(start + index));
  }

  /**
   * The same rows with each open detail panel after the row that opened it. Only a row that has arrived
   * can be expanded, so the positions are found by walking the blocks in hand rather than the result set.
   */
  public flatRowList(rows: RowModel<TRow>[]): (RowModel<TRow> | DetailRowModel<TRow>)[] {
    const details = this.detailPositions();
    if (details.length === 0) return rows;

    return lazyList(rows.length + details.length, (flatIndex) => {
      const before = countBelow(details, flatIndex);

      // A flat position that *is* a detail position belongs to the row one place above it.
      return details[before] === flatIndex ? new DetailRowModel(this.grid, rows[flatIndex - before - 1]) : rows[flatIndex - before];
    });
  }

  /**
   * Where the rows sit once the open detail panels are counted in, and how tall the lot is. Lazy for the
   * same reason the row list is — the binary search the viewport runs over it reads a handful of entries.
   */
  public rowOffsets(flat: (RowModel<TRow> | DetailRowModel<TRow>)[]): { offsets: number[]; totalHeight: number } {
    const { rowHeight } = this.grid;
    const details = this.detailPositions();

    // Running total of the panel heights, so an offset is one multiplication and one lookup.
    const heights = [0];
    details.forEach((position, i) => heights.push(heights[i] + (flat[position] as DetailRowModel<TRow>).heightForOffset));

    const offsets = lazyList(flat.length, (index) => {
      const before = countBelow(details, index);

      return (index - before) * rowHeight + heights[before];
    });

    return { offsets, totalHeight: (flat.length - details.length) * rowHeight + heights[details.length] };
  }

  /**
   * Where each open detail panel sits in the flat list, ascending. The i-th one follows its own row and
   * the i panels already inserted above it, which is what makes the mapping back an O(log n) search.
   *
   * Only a row that has arrived can be expanded, so this walks the blocks in hand — a few thousand rows
   * at the most — rather than the result set, which is the whole million.
   */
  private detailPositions(): number[] {
    const expanded = this.grid.expandedDetailRows;
    if (!this.grid.props.def.rowDetail || expanded.size === 0) return [];

    const { start, end } = this.visibleRange();
    const size = this.blockSize;
    const indexes: number[] = [];

    this.blocks.forEach((block, blockIndex) => {
      if (block.status !== 'loaded') return;

      block.rows.forEach((row, offset) => {
        const index = blockIndex * size + offset;
        if (index >= start && index < end && expanded.has(this.grid.getRowKey(row))) indexes.push(index);
      });
    });

    indexes.sort((a, b) => a - b);

    return indexes.map((index, i) => index - start + i + 1);
  }

  /**
   * Every row in hand, in order. Read off the blocks rather than the row list, which is lazy — and it is
   * the blocks that are the honest answer anyway: a select-all cannot reach rows nobody has fetched.
   */
  public loadedRows(): TRow[] {
    const { start, end } = this.visibleRange();
    const size = this.blockSize;
    const found: { index: number; row: TRow }[] = [];

    this.blocks.forEach((block, blockIndex) => {
      if (block.status !== 'loaded') return;

      block.rows.forEach((row, offset) => {
        const index = blockIndex * size + offset;
        if (index >= start && index < end) found.push({ index, row });
      });
    });

    return found.sort((a, b) => a.index - b.index).map((entry) => entry.row);
  }

  /** The model for one row, kept so React sees the same object between renders. */
  private rowModelAt(index: number): SourceRowModel<TRow> {
    let model = this.models.get(index);
    if (!model) this.models.set(index, (model = new SourceRowModel(this.grid, index)));

    return model;
  }

  /** How many rows the grid lays out right now: the page's worth, or the whole result set. */
  private visibleLength(): number {
    const { start, end } = this.visibleRange();

    return Math.max(0, end - start);
  }

  /** Which absolute rows are on screen's worth of the result set — a page, or everything. */
  private visibleRange(): { start: number; end: number } {
    if (!this.grid.isPaginated) return { start: 0, end: this.rowCount };

    const { pageSize } = this.grid;
    const start = (this.grid.page - 1) * pageSize;

    return { start, end: Math.min(start + pageSize, Math.max(this.rowCount, start)) };
  }

  public rowAt(index: number): TRow | undefined {
    const block = this.blocks.get(Math.floor(index / this.blockSize));
    if (!block || block.status !== 'loaded') return undefined;

    return block.rows[index % this.blockSize];
  }

  public statusAt(index: number): BlockStatus | 'missing' {
    return this.blocks.get(Math.floor(index / this.blockSize))?.status ?? 'missing';
  }

  /**
   * Ask for everything covering `[startIndex, endIndex)`. Called from an effect with the viewport's own
   * window; when the grid is paginated the page is the range, so the pager and the scroller are one path.
   */
  public request(startIndex: number, endIndex: number): void {
    if (!this.enabled) return;

    const range = this.grid.isPaginated ? this.visibleRange() : { start: startIndex, end: endIndex };
    const size = this.blockSize;
    const first = Math.max(0, Math.floor(range.start / size));
    const last = Math.max(first, Math.floor(Math.max(range.start, range.end - 1) / size));

    let started = false;
    for (let index = first; index <= last; index++) {
      this.touch(index);
      if (this.blocks.has(index)) continue;

      this.load(index);
      started = true;
    }

    this.evict();

    // The blocks went to 'loading' synchronously, and the loading bar is drawn from that — so the grid
    // hears about the wait now rather than when it ends.
    if (started) this.changed();
  }

  /** Fetch every block that failed, which is what the error strip's Retry does. */
  public retry = (): void => {
    const failed = this.failedBlocks();
    if (failed.length === 0) return;

    failed.forEach((index) => this.blocks.delete(index));
    failed.forEach((index) => this.load(index));

    this.changed();
  };

  /**
   * The query changed underneath the cache: every block is about a question nobody is asking any more.
   * Requests in flight are aborted, and the next `request` refills from wherever the viewport now is —
   * which the adapter has put back at the top, since a new query has no scroll position to preserve.
   *
   * The count is deliberately *kept*: the next response replaces it, and dropping it in between collapses
   * the scrollbar to one block and the pager to one page on every keystroke in a filter box.
   */
  public invalidate(): void {
    if (!this.enabled) return;

    this._query++;
    this.blocks.forEach((block) => block.controller?.abort());
    this.blocks.clear();
    this.recent = [];
    this._reachedEnd = false;

    this.changed();
  }

  private load(index: number): void {
    const config = this.config;
    if (!config) return;

    const size = this.blockSize;
    const controller = new AbortController();
    const query = this._query;

    this.blocks.set(index, { status: 'loading', rows: [], controller });

    const request: DataSourceRequest<TRow> = {
      startRow: index * size,
      endRow: (index + 1) * size,
      page: index + 1,
      pageSize: size,
      sort:
        this.grid.sortColumn !== undefined && this.grid.sortDirection !== undefined
          ? { columnKey: this.grid.sortColumn, direction: this.grid.sortDirection }
          : undefined,
      globalFilter: this.grid.globalFilterValue,
      columnFilters: this.grid.columnFilters,
      signal: controller.signal,
    };

    config.getRows(request).then(
      (result) => {
        if (query !== this._query) return;

        this.blocks.set(index, { status: 'loaded', rows: result.rows ?? [] });
        if (result.totalCount !== undefined) this._totalCount = result.totalCount;
        if ((result.rows?.length ?? 0) < size) this._reachedEnd = true;

        this.changed();
      },
      (error: unknown) => {
        // An abort is this model cancelling its own request, not a failure anybody should be shown.
        if (query !== this._query || controller.signal.aborted) return;

        this.blocks.set(index, { status: 'error', rows: [], error });

        this.changed();
      },
    );
  }

  /** Mark a block as wanted now, so eviction takes the ones the viewport left behind. */
  private touch(index: number): void {
    const at = this.recent.indexOf(index);
    if (at !== -1) this.recent.splice(at, 1);

    this.recent.push(index);
  }

  /** Drop the least recently wanted blocks, and abort any of them still in flight. */
  private evict(): void {
    while (this.recent.length > this.maxBlocks) {
      const index = this.recent.shift()!;
      this.blocks.get(index)?.controller?.abort();
      this.blocks.delete(index);
    }

    // A model whose block has gone is a model for a row nobody is looking at, and the map would
    // otherwise grow by one per row ever scrolled past.
    const size = this.blockSize;
    this.models.forEach((_, index) => {
      if (!this.blocks.has(Math.floor(index / size))) this.models.delete(index);
    });
  }

  /**
   * Rows moved, so React has to hear about it. The row list itself is rebuilt only when its *length*
   * changes: the models read their values through this cache, so a block arriving changes what fifty
   * rows show without one of them being replaced — which is what keeps a selection and a focused cell
   * where they were. The flat list is another matter, since a row that has only just arrived may be one
   * whose detail panel is open.
   */
  private changed(): void {
    if (this.listLength !== this.visibleLength()) this.grid.rows.clear();

    this.grid.flatRows.clear();
    this.grid.notify();
  }
}

/** How many of an ascending list of positions fall below `value` — a lower bound, in O(log n). */
export function countBelow(positions: number[], value: number): number {
  let low = 0;
  let high = positions.length;

  while (low < high) {
    const mid = (low + high) >>> 1;
    if (positions[mid] < value) low = mid + 1;
    else high = mid;
  }

  return low;
}
