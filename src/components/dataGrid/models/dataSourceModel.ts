import ArrayUtils from '../../../utils/array/arrayUtils';
import lazyList from '../../../utils/array/lazyList';
import { DataSource, Key } from '../contracts/dataGridContract';
import ColumnModel from './columnModel';
import DetailRowModel from './detailRowModel';
import GridModel from './gridModel';
import GroupRowModel from './groupRowModel';
import RowModel from './rowModel';
import SourceGroupRowModel, { groupPathKey } from './sourceGroupRowModel';
import SourceLevel, { BlockStatus } from './sourceLevel';
import SourceRowModel from './sourceRowModel';

export type { BlockStatus };

/** Rows per request when nothing says otherwise — big enough to be one round trip a screenful. */
const DEFAULT_BLOCK_SIZE = 100;
/** Blocks kept before the ones furthest from the viewport are dropped. */
const DEFAULT_MAX_BLOCKS = 40;

/** A run of rows from one level, and where it lands in the list the grid draws. */
interface Segment<TRow> {
  /** Where the run starts in the display list. */
  start: number;
  /** Where it starts inside its own level. */
  levelStart: number;
  length: number;
  level: SourceLevel<TRow>;
}

/**
 * The server row model: the grid asks `def.dataSource` for blocks and this holds them. Everything the
 * grid would have done over `data` — filtering, sorting, paging, grouping — is a *request* here, so the
 * browser never holds more than the blocks in play.
 *
 * Two invariants are worth naming. A response is only accepted while the query it was asked under is
 * still the current one: `_query` is bumped by every sort, filter and grouping change, a request carries
 * the value it was made at, and a late answer to an old question is dropped rather than written over a
 * new one — which is the whole of the out-of-order problem an async row model has. And the cache is a
 * *tree* of levels, one per open group: the rows the grid draws are a walk over it, so a group holds its
 * children only while somebody has it open.
 */
export default class DataSourceModel<TRow> {
  constructor(public readonly grid: GridModel<TRow>) {}

  /** The top level, and every open group's beside it — one entry per path somebody has opened. */
  private root = new SourceLevel<TRow>(this, []);
  private levels = new Map<string, SourceLevel<TRow>>([[this.root.key, this.root]]);
  /** Blocks in the order they were last wanted, level and index; the front of it is what eviction takes. */
  private recent: { level: string; index: number }[] = [];
  private _query = 0;

  public get config(): DataSource<TRow> | undefined {
    return this.grid.props.def.dataSource;
  }

  /** Whether the grid fetches its own rows. With no datasource every getter here is inert. */
  public get enabled(): boolean {
    return !!this.config;
  }

  /** Whether the server answers a group level, which is what puts *Group by* back in the column menu. */
  public get canGroup(): boolean {
    return !!this.config?.grouping;
  }

  /**
   * The columns the server is grouping by, outermost first. A level at depth `d` holds groups of
   * `groupBy[d]`; a level as deep as this is long holds leaf rows.
   */
  public get groupBy(): Key[] {
    return this.canGroup ? [...this.grid.groupColumns] : [];
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

  /** The count the server gave for the top level, once it has given one. */
  public get totalCount(): number | undefined {
    return this.root.totalCount;
  }

  /** Whether any block of any level is in flight — what the loading bar is drawn from. */
  public get isLoading(): boolean {
    for (const level of this.levels.values()) {
      if (level.isLoading) return true;
    }

    return false;
  }

  /** The most recent failure still unanswered, which is what the error strip reports. */
  public get error(): unknown {
    for (const level of this.levels.values()) {
      const failed = level.failedBlocks();
      if (failed.length > 0) return level.errorAt(failed[0]);
    }

    return undefined;
  }

  // ========== The display list ==========

  private _segments?: Segment<TRow>[];
  private _byLevel?: Map<string, Segment<TRow>[]>;

  /**
   * The rows the grid draws, as runs of one level each: the top level's rows, with every open group's own
   * level spliced in directly after the group row that opened it. Rebuilt whenever a block lands or a
   * group is toggled, and it is also where a level is created and where a closed one is disposed of —
   * a level nothing reaches is a level whose group has been shut or whose group row has been dropped.
   */
  private segments(): Segment<TRow>[] {
    if (this._segments) return this._segments;

    const list: Segment<TRow>[] = [];
    const reached = new Set<string>();
    let display = 0;

    const push = (level: SourceLevel<TRow>, levelStart: number, length: number) => {
      if (length <= 0) return;
      list.push({ start: display, levelStart, length, level });
      display += length;
    };

    const walk = (level: SourceLevel<TRow>): void => {
      reached.add(level.key);
      let cursor = 0;

      for (const { rowIndex, child } of this.expansionsOf(level)) {
        if (rowIndex < cursor || rowIndex >= level.rowCount) continue;

        // The run up to and including the group row itself, and then everything it holds.
        push(level, cursor, rowIndex - cursor + 1);
        cursor = rowIndex + 1;
        walk(child);
      }

      push(level, cursor, level.rowCount - cursor);
    };

    walk(this.root);

    this.levels.forEach((level, key) => {
      if (reached.has(key)) return;

      level.dispose();
      this.levels.delete(key);
    });

    this._segments = list;

    return list;
  }

  /** The same runs grouped by the level they came from — how a level's own index becomes a display one. */
  private byLevel(): Map<string, Segment<TRow>[]> {
    if (this._byLevel) return this._byLevel;

    const map = new Map<string, Segment<TRow>[]>();
    this.segments().forEach((segment) => {
      const key = segment.level.key;
      const list = map.get(key);
      if (list) list.push(segment);
      else map.set(key, [segment]);
    });

    return (this._byLevel = map);
  }

  /** Which rows of a level are open groups, ascending, with the level each one holds. */
  private expansionsOf(level: SourceLevel<TRow>): { rowIndex: number; child: SourceLevel<TRow> }[] {
    const expanded = this.grid.expandedGroupRow;
    if (!level.isGroupLevel || expanded.size === 0) return [];

    const size = this.blockSize;
    const columnKey = this.groupBy[level.depth];
    const found: { rowIndex: number; child: SourceLevel<TRow> }[] = [];

    level.loadedBlocks().forEach(({ index, rows }) => {
      rows.forEach((row, offset) => {
        const path = [...level.groupKeys, row[columnKey as keyof TRow] as Key];
        if (!expanded.has(groupPathKey(path))) return;

        const rowIndex = index * size + offset;
        found.push({ rowIndex, child: this.levelFor(path, level, rowIndex) });
      });
    });

    return found.sort((a, b) => a.rowIndex - b.rowIndex);
  }

  private levelFor(groupKeys: Key[], parent: SourceLevel<TRow>, parentRowIndex: number): SourceLevel<TRow> {
    const key = SourceLevel.keyOf(groupKeys);
    let level = this.levels.get(key);

    if (!level) this.levels.set(key, (level = new SourceLevel(this, groupKeys, parent, parentRowIndex)));
    // A sort can move the group row a level hangs off, and eviction reads that position.
    else level.parentRowIndex = parentRowIndex;

    return level;
  }

  /** The run a display index falls in, in O(log n) over the runs rather than over the rows. */
  private segmentAt(display: number): Segment<TRow> | undefined {
    const list = this.segments();
    let low = 0;
    let high = list.length - 1;

    while (low < high) {
      const mid = (low + high + 1) >>> 1;
      if (list[mid].start <= display) low = mid;
      else high = mid - 1;
    }

    const segment = list[low];

    return segment && display >= segment.start && display < segment.start + segment.length ? segment : undefined;
  }

  /**
   * How many rows the grid lays out: the walk's own length, which is the top level plus everything open
   * inside it. With no grouping it is exactly the top level's count, which is all stage 1 ever had.
   */
  public get rowCount(): number {
    if (!this.enabled) return 0;

    const list = this.segments();
    const last = list[list.length - 1];

    return last ? last.start + last.length : 0;
  }

  /** One model per row, by level and then by index, built when somebody looks at that row. */
  private models = new Map<string, Map<number, RowModel<TRow> | GroupRowModel<TRow>>>();
  /** How long the last row list was, which is the only thing that can make it stale. */
  private listLength = -1;

  /**
   * The grid's rows. Lazy, because this is the list a million-row grid lays out: a model per row cost
   * 1.4 seconds of blocked main thread on every block that arrived (measured, Chrome 152), and the rows
   * read their values through the cache anyway, so there was never anything to rebuild.
   */
  public rowList(): (RowModel<TRow> | GroupRowModel<TRow>)[] {
    const { start } = this.visibleRange();

    this.listLength = this.visibleLength();

    return lazyList(this.listLength, (index) => this.rowModelAt(start + index));
  }

  /**
   * The same rows with each open detail panel after the row that opened it. Only a row that has arrived
   * can be expanded, so the positions are found by walking the blocks in hand rather than the result set.
   */
  public flatRowList<TItem>(rows: TItem[]): (TItem | DetailRowModel<TRow>)[] {
    const details = this.detailPositions();
    if (details.length === 0) return rows;

    return lazyList(rows.length + details.length, (flatIndex) => {
      const before = countBelow(details, flatIndex);

      // A flat position that *is* a detail position belongs to the row one place above it.
      return details[before] === flatIndex
        ? new DetailRowModel(this.grid, rows[flatIndex - before - 1] as unknown as RowModel<TRow>)
        : rows[flatIndex - before];
    });
  }

  /**
   * Where the rows sit once the open detail panels are counted in, and how tall the lot is. Lazy for the
   * same reason the row list is — the binary search the viewport runs over it reads a handful of entries.
   */
  public rowOffsets(flat: (RowModel<TRow> | GroupRowModel<TRow> | DetailRowModel<TRow>)[]): { offsets: number[]; totalHeight: number } {
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
    const displays: number[] = [];

    this.eachLoadedLeafRow((display, row) => {
      if (display >= start && display < end && expanded.has(this.grid.getRowKey(row))) displays.push(display);
    });

    displays.sort((a, b) => a - b);

    return displays.map((display, i) => display - start + i + 1);
  }

  /**
   * Every row in hand, in the order they are drawn. Read off the blocks rather than the row list, which
   * is lazy — and it is the blocks that are the honest answer anyway: a select-all cannot reach rows
   * nobody has fetched, and with a group shut its rows were never fetched at all.
   */
  public loadedRows(): TRow[] {
    const { start, end } = this.visibleRange();
    const found: { display: number; row: TRow }[] = [];

    this.eachLoadedLeafRow((display, row) => {
      if (display >= start && display < end) found.push({ display, row });
    });

    return found.sort((a, b) => a.display - b.display).map((entry) => entry.row);
  }

  /** Every data row the cache holds, with where it is drawn — the blocks in hand, never the result set. */
  private eachLoadedLeafRow(visit: (display: number, row: TRow) => void): void {
    const size = this.blockSize;

    this.byLevel().forEach((segments, key) => {
      const level = this.levels.get(key);
      if (!level || level.isGroupLevel) return;

      level.loadedBlocks().forEach(({ index, rows }) => {
        rows.forEach((row, offset) => {
          const display = displayOf(segments, index * size + offset);
          if (display !== undefined) visit(display, row);
        });
      });
    });
  }

  /** The model for one row of the display list, kept so React sees the same object between renders. */
  private rowModelAt(display: number): RowModel<TRow> | GroupRowModel<TRow> {
    const segment = this.segmentAt(display);
    if (!segment) return new SourceRowModel(this.grid, this.root, display);

    const { level } = segment;
    const index = segment.levelStart + (display - segment.start);

    let byIndex = this.models.get(level.key);
    if (!byIndex) this.models.set(level.key, (byIndex = new Map()));

    let model = byIndex.get(index);
    if (!model) {
      model = level.isGroupLevel
        ? new SourceGroupRowModel(this.grid, level, this.groupColumnAt(level.depth), index)
        : new SourceRowModel(this.grid, level, index);
      byIndex.set(index, model);
    }

    return model;
  }

  /** The column a level groups by. It stays in `leafs` while it is grouped, only hidden from the body. */
  private groupColumnAt(depth: number): ColumnModel<TRow> {
    return ArrayUtils.findOrThrow(this.grid.columns.value.leafs, (c) => c.key === this.groupBy[depth]);
  }

  /** How many rows the grid lays out right now: the page's worth, or the whole list. */
  private visibleLength(): number {
    const { start, end } = this.visibleRange();

    return Math.max(0, end - start);
  }

  /** Which absolute rows are on screen's worth of the display list — a page, or everything. */
  private visibleRange(): { start: number; end: number } {
    if (!this.grid.isPaginated) return { start: 0, end: this.rowCount };

    const { pageSize } = this.grid;
    const start = (this.grid.page - 1) * pageSize;

    return { start, end: Math.min(start + pageSize, Math.max(this.rowCount, start)) };
  }

  public rowAt(index: number): TRow | undefined {
    const segment = this.segmentAt(index);

    return segment?.level.rowAt(segment.levelStart + (index - segment.start));
  }

  public statusAt(index: number): BlockStatus | 'missing' {
    const segment = this.segmentAt(index);

    return segment ? segment.level.statusAt(segment.levelStart + (index - segment.start)) : 'missing';
  }

  // ========== Fetching ==========

  /**
   * Ask for everything covering `[startIndex, endIndex)` of the display list. Called from an effect with
   * the viewport's own window; when the grid is paginated the page is the range, so the pager and the
   * scroller are one path. A range crossing an open group asks its level for a block of its own.
   */
  public request(startIndex: number, endIndex: number): void {
    if (!this.enabled) return;

    const asked = this.grid.isPaginated ? this.visibleRange() : { start: startIndex, end: endIndex };
    const range = { start: asked.start, end: Math.max(asked.end, asked.start + 1) };
    const size = this.blockSize;

    let started = false;
    for (const segment of this.segments()) {
      const from = Math.max(range.start, segment.start);
      const to = Math.min(range.end, segment.start + segment.length);
      if (to <= from) continue;

      const first = Math.floor((segment.levelStart + (from - segment.start)) / size);
      const last = Math.floor((segment.levelStart + (to - 1 - segment.start)) / size);

      for (let index = first; index <= last; index++) {
        this.touch(segment.level, index);
        if (segment.level.has(index)) continue;

        segment.level.load(index);
        started = true;
      }
    }

    this.evict();

    // The blocks went to 'loading' synchronously, and the loading bar is drawn from that — so the grid
    // hears about the wait now rather than when it ends.
    if (started) this.changed();
  }

  /**
   * A group opened or closed. The walk over the levels is a different walk now — and this is the only
   * change that reaches it without a block having moved, so nothing else would drop the cached one.
   */
  public expansionChanged(): void {
    this._segments = undefined;
    this._byLevel = undefined;
  }

  /** Fetch every block that failed, which is what the error strip's Retry does. */
  public retry = (): void => {
    let retried = false;

    this.levels.forEach((level) => {
      if (level.failedBlocks().length === 0) return;

      level.retry();
      retried = true;
    });

    if (retried) this.changed();
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
    const count = this.root.totalCount;
    this.levels.forEach((level) => level.dispose());
    this.root = new SourceLevel<TRow>(this, [], undefined, 0, count);
    this.levels = new Map([[this.root.key, this.root]]);
    this.recent = [];
    this.models.clear();

    this.changed();
  }

  /** Mark a block as wanted now, so eviction takes the ones the viewport left behind. */
  private touch(level: SourceLevel<TRow>, index: number): void {
    this.bump(level.key, index);

    // The chain above a level stays in play with it: a group's children are unreachable without the row
    // that opened them, so evicting the parent's block would take the rows on screen with it.
    for (let up = level.parent, at = level.parentRowIndex; up; at = up.parentRowIndex, up = up.parent) {
      this.bump(up.key, Math.floor(at / this.blockSize));
    }
  }

  private bump(levelKey: string, index: number): void {
    const at = this.recent.findIndex((entry) => entry.level === levelKey && entry.index === index);
    if (at !== -1) this.recent.splice(at, 1);

    this.recent.push({ level: levelKey, index });
  }

  /** Drop the least recently wanted blocks, and abort any of them still in flight. */
  private evict(): void {
    while (this.recent.length > this.maxBlocks) {
      const oldest = this.recent.shift()!;
      this.levels.get(oldest.level)?.drop(oldest.index);
    }

    // A model whose block has gone is a model for a row nobody is looking at, and the map would
    // otherwise grow by one per row ever scrolled past.
    const size = this.blockSize;
    this.models.forEach((byIndex, levelKey) => {
      const level = this.levels.get(levelKey);
      if (!level) return this.models.delete(levelKey);

      byIndex.forEach((_, index) => {
        if (!level.has(Math.floor(index / size))) byIndex.delete(index);
      });
    });
  }

  /**
   * Rows moved, so React has to hear about it. The row list itself is rebuilt only when its *length*
   * changes: the models read their values through this cache, so a block arriving changes what fifty
   * rows show without one of them being replaced — which is what keeps a selection and a focused cell
   * where they were. The flat list is another matter, since a row that has only just arrived may be one
   * whose detail panel is open, or one whose group somebody left expanded.
   */
  public changed(): void {
    this._segments = undefined;
    this._byLevel = undefined;

    if (this.listLength !== this.visibleLength()) this.grid.rows.clear();

    this.grid.flatRows.clear();
    this.grid.notify();
  }
}

/** Where a level's own row index lands in the display list, when the row is drawn at all. */
function displayOf<TRow>(segments: Segment<TRow>[], levelIndex: number): number | undefined {
  for (const segment of segments) {
    if (levelIndex >= segment.levelStart && levelIndex < segment.levelStart + segment.length) {
      return segment.start + (levelIndex - segment.levelStart);
    }
  }

  return undefined;
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
