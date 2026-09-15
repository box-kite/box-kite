import { DataSourceRequest, Key } from '../contracts/dataGridContract';
import DataSourceModel from './dataSourceModel';

/** Where one block of rows has got to. A block is the unit of a request, of a wait and of a failure. */
export type BlockStatus = 'loading' | 'loaded' | 'error';

interface Block<TRow> {
  status: BlockStatus;
  rows: TRow[];
  /** The leaf count the server gave for each group row, when it gave one. */
  counts?: number[];
  error?: unknown;
  /** Aborts the request that is filling it; kept so a superseded query costs the network nothing. */
  controller?: AbortController;
}

/**
 * One level of a `def.dataSource` grid: the blocks answering a single path, and the count and end-of-data
 * they arrived with. With nothing opened there is exactly one of these; a group or a tree row being opened
 * adds another, and which of the two the path *is* is the only thing that differs between them.
 *
 * A level knows the row that opened it (`parent`, `parentRowIndex`), because a group's children are worth
 * nothing without it: eviction has to keep the chain above a level in play or the rows on screen would
 * lose the group row they hang off.
 */
export default class SourceLevel<TRow> {
  constructor(
    private readonly source: DataSourceModel<TRow>,
    /** What names this level, outermost first: group values, or a tree row's keys. `[]` is the top. */
    public readonly path: Key[],
    public readonly parent?: SourceLevel<TRow>,
    /** Where in `parent` the group row that opened this one sits. A sort can move it. */
    public parentRowIndex = 0,
    /** A count carried over an invalidation, so a filter keystroke does not collapse the scrollbar. */
    keepCount?: number,
  ) {
    this._totalCount = keepCount;
  }

  private blocks = new Map<number, Block<TRow>>();
  private _totalCount?: number;
  /** False once disposed of: a request still in flight must not write into a level nobody can reach. */
  private alive = true;
  /** True once a block came back shorter than it was asked for: there is nothing past it. */
  private _reachedEnd = false;

  /** Its own identity, and the key it is held under. JSON, so no path value can spell another path. */
  public static keyOf(path: Key[]): string {
    return JSON.stringify(path);
  }

  public get key(): string {
    return SourceLevel.keyOf(this.path);
  }

  /** The group this level sits inside — its path, unless the path is a tree's. */
  public get groupKeys(): Key[] {
    return this.source.isTree ? [] : this.path;
  }

  /** The row this level holds the children of — its path, when the path is a tree's. */
  public get treeKeys(): Key[] {
    return this.source.isTree ? this.path : [];
  }

  /** What a row of this level that has not arrived is keyed by — unique per level, stable per position. */
  public get placeholderKey(): string {
    return this.depth === 0 ? 'rb-placeholder' : `rb-placeholder-${this.key}`;
  }

  /** How deep this level sits — for a grouped source, which column it groups by. */
  public get depth(): number {
    return this.path.length;
  }

  /** Whether its rows are groups rather than data — true until the last grouped column has been named. */
  public get isGroupLevel(): boolean {
    return this.depth < this.source.groupBy.length;
  }

  /**
   * How many rows this level lays out. The server's count when there is one; otherwise what has been
   * loaded, plus one block to scroll into — which is what keeps an uncounted source reachable.
   */
  public get rowCount(): number {
    if (this._totalCount !== undefined) return this._totalCount;

    let end = 0;
    this.blocks.forEach((block, index) => {
      if (block.status === 'loaded') end = Math.max(end, index * this.source.blockSize + block.rows.length);
    });

    return this._reachedEnd ? end : end + this.source.blockSize;
  }

  public get totalCount(): number | undefined {
    return this._totalCount;
  }

  public rowAt(index: number): TRow | undefined {
    const block = this.blocks.get(Math.floor(index / this.source.blockSize));
    if (!block || block.status !== 'loaded') return undefined;

    return block.rows[index % this.source.blockSize];
  }

  /** How many leaf rows a group row holds, when the server said. */
  public groupCountAt(index: number): number | undefined {
    const block = this.blocks.get(Math.floor(index / this.source.blockSize));

    return block?.status === 'loaded' ? block.counts?.[index % this.source.blockSize] : undefined;
  }

  public statusAt(index: number): BlockStatus | 'missing' {
    return this.blocks.get(Math.floor(index / this.source.blockSize))?.status ?? 'missing';
  }

  public get isLoading(): boolean {
    for (const block of this.blocks.values()) {
      if (block.status === 'loading') return true;
    }

    return false;
  }

  public failedBlocks(): number[] {
    const failed: number[] = [];
    this.blocks.forEach((block, index) => block.status === 'error' && failed.push(index));

    return failed;
  }

  public errorAt(index: number): unknown {
    return this.blocks.get(index)?.error;
  }

  public has(index: number): boolean {
    return this.blocks.has(index);
  }

  /** Which blocks are in hand, loaded or not — what eviction and the row walks read. */
  public loadedBlocks(): { index: number; rows: TRow[] }[] {
    const found: { index: number; rows: TRow[] }[] = [];
    this.blocks.forEach((block, index) => block.status === 'loaded' && found.push({ index, rows: block.rows }));

    return found.sort((a, b) => a.index - b.index);
  }

  public drop(index: number): void {
    this.blocks.get(index)?.controller?.abort();
    this.blocks.delete(index);
  }

  /** Abort everything in flight and forget the lot — a level whose query or whose group has gone. */
  public dispose(): void {
    this.alive = false;
    this.blocks.forEach((block) => block.controller?.abort());
    this.blocks.clear();
  }

  public retry(): void {
    const failed = this.failedBlocks();
    failed.forEach((index) => this.blocks.delete(index));
    failed.forEach((index) => this.load(index));
  }

  public load(index: number): void {
    const config = this.source.config;
    if (!config) return;

    const { grid } = this.source;
    const size = this.source.blockSize;
    const controller = new AbortController();
    const query = this.source.queryVersion;

    this.blocks.set(index, { status: 'loading', rows: [], controller });

    const request: DataSourceRequest<TRow> = {
      startRow: index * size,
      endRow: (index + 1) * size,
      page: index + 1,
      pageSize: size,
      sort:
        grid.sortColumn !== undefined && grid.sortDirection !== undefined
          ? { columnKey: grid.sortColumn, direction: grid.sortDirection }
          : undefined,
      globalFilter: grid.globalFilterValue,
      columnFilters: grid.columnFilters,
      groupBy: this.source.groupBy,
      groupKeys: this.groupKeys,
      treeKeys: this.treeKeys,
      signal: controller.signal,
    };

    config.getRows(request).then(
      (result) => {
        if (!this.alive || query !== this.source.queryVersion || controller.signal.aborted) return;

        this.blocks.set(index, { status: 'loaded', rows: result.rows ?? [], counts: result.groupCounts });
        if (result.totalCount !== undefined) this._totalCount = result.totalCount;
        if ((result.rows?.length ?? 0) < size) this._reachedEnd = true;

        this.source.changed();
      },
      (error: unknown) => {
        // An abort is this model cancelling its own request, not a failure anybody should be shown.
        if (!this.alive || query !== this.source.queryVersion || controller.signal.aborted) return;

        this.blocks.set(index, { status: 'error', rows: [], error });

        this.source.changed();
      },
    );
  }
}
