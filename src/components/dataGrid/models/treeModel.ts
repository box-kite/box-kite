import ArrayUtils from '../../../utils/array/arrayUtils';
import memo from '../../../utils/memo';
import { DefaultExpanded, Key, TreeDataConfig } from '../contracts/dataGridContract';
import GridModel from './gridModel';
import TreeRowModel from './treeRowModel';

/** One row of the tree and everything under it, before any of it is a model. */
export interface TreeNode<TRow> {
  data: TRow;
  children: TreeNode<TRow>[];
}

/** A path as one string, so a `Map` can be keyed by it. `JSON.stringify` because a separator can be in a key. */
function pathId(path: Key[]): string {
  return JSON.stringify(path);
}

/**
 * Rows that hold rows. The shape of the tree comes out of the data — nested in it, or named by a path on
 * every row — and everything else here is what the grid does with it: filtering that keeps a match's
 * ancestors, a sort that happens inside each parent, and which rows are open.
 */
export default class TreeModel<TRow> {
  constructor(public readonly grid: GridModel<TRow>) {}

  public get config(): TreeDataConfig<TRow> | undefined {
    return this.grid.props.def.treeData;
  }

  /** Whether the grid is a tree at all — the chevrons, the indent, `role="treegrid"` and the arrow keys. */
  public get enabled(): boolean {
    return !!this.config;
  }

  /**
   * Whether the tree is in the browser. The two halves are the same feature from opposite ends: eager
   * reads the shape off `data` and holds the lot, lazy asks the datasource for one level at a time — so
   * everything here that walks the data is the eager half's, and the source owns the other.
   */
  public get isEager(): boolean {
    return this.enabled && !this.grid.source.enabled;
  }

  public get isLazy(): boolean {
    return this.enabled && this.grid.source.enabled;
  }

  /**
   * Whether a lazy tree's row holds anything — the one thing a row's own values cannot say, since what
   * is under it has never been in the browser. Eager rows answer it from their node instead.
   */
  public rowHasChildren(row: TRow): boolean {
    const { hasChildren } = this.config ?? {};

    if (typeof hasChildren === 'function') return !!hasChildren(row);

    return hasChildren ? !!row[hasChildren as keyof TRow] : false;
  }

  /** Which column carries the chevrons: the one named, or the first of the caller's own. */
  public get columnKey(): Key | undefined {
    if (!this.enabled) return undefined;

    return this.config?.column ?? this.grid.columns.value.userVisibleLeafs[0]?.key;
  }

  /** How far one level indents, on the ÷4 spacing scale. */
  public get indent(): number {
    return this.config?.indent ?? 4;
  }

  /** Whether ticking a row ticks everything under it. Never on a lazy tree: it cannot reach what it has not got. */
  public get cascades(): boolean {
    return this.config?.selection === 'cascade' && !this.isLazy;
  }

  /** Whether the tree is read off a path per row rather than nested in the rows. */
  private get isFlat(): boolean {
    return !!(this.config?.getPath || this.config?.pathKey);
  }

  private childrenOf(row: TRow): TRow[] {
    const { getChildren, childrenKey } = this.config ?? {};

    if (getChildren) return getChildren(row) ?? [];
    if (childrenKey) return (row[childrenKey as keyof TRow] as TRow[] | undefined) ?? [];

    return [];
  }

  private pathOf(row: TRow): Key[] {
    const { getPath, pathKey } = this.config ?? {};

    if (getPath) return getPath(row) ?? [];
    if (pathKey) return (row[pathKey as keyof TRow] as Key[] | undefined) ?? [];

    return [];
  }

  private buildNested(rows: TRow[]): TreeNode<TRow>[] {
    return rows.map((data) => ({ data, children: this.buildNested(this.childrenOf(data)) }));
  }

  /**
   * The flat shape: every row carries its own path, and the tree is what those paths describe. Shallower
   * rows are taken first (a stable sort, so siblings keep the order they were handed in) — a child cannot
   * find a parent that has not been seen yet, and the data is under no obligation to be in order.
   */
  private buildFlat(rows: TRow[]): TreeNode<TRow>[] {
    const roots: TreeNode<TRow>[] = [];
    const byPath = new Map<string, TreeNode<TRow>>();
    const ordered = [...rows].sort((a, b) => this.pathOf(a).length - this.pathOf(b).length);

    ordered.forEach((data) => {
      const path = this.pathOf(data);
      const node: TreeNode<TRow> = { data, children: [] };
      byPath.set(pathId(path), node);

      // The nearest ancestor that is actually in the data: a row whose parent was left out hangs off
      // whatever ancestor is there, and off the top when none of them is.
      let parent: TreeNode<TRow> | undefined;
      for (let depth = path.length - 1; depth > 0 && !parent; depth--) {
        parent = byPath.get(pathId(path.slice(0, depth)));
      }

      (parent ? parent.children : roots).push(node);
    });

    return roots;
  }

  /**
   * What the filters leave: a row that matches, and every ancestor of one — a match nobody can see the
   * path to is a match the grid has hidden. A parent that matches on its own stays as a leaf, since the
   * rows under it did not.
   */
  private prune(nodes: TreeNode<TRow>[]): TreeNode<TRow>[] {
    const kept: TreeNode<TRow>[] = [];

    nodes.forEach((node) => {
      const children = this.prune(node.children);

      if (children.length > 0 || this.grid.rowMatchesFilters(node.data)) {
        kept.push({ data: node.data, children });
      }
    });

    return kept;
  }

  /** A sort happens inside each parent: a tree sorted across its levels would not be a tree any more. */
  private sortNodes(nodes: TreeNode<TRow>[]): TreeNode<TRow>[] {
    const { sortColumn, sortDirection } = this.grid;
    if (sortColumn === undefined) return nodes;

    return ArrayUtils.sortBy(nodes, (node) => node.data[sortColumn as keyof TRow], sortDirection).map((node) => ({
      data: node.data,
      children: this.sortNodes(node.children),
    }));
  }

  /**
   * The tree the data describes, filtered and sorted. Its own memo rather than part of `grid.rows`:
   * opening a row rebuilds the models and must not rebuild the tree underneath them.
   */
  public readonly nodes = memo(() => {
    if (!this.isEager) return [] as TreeNode<TRow>[];

    const built = this.isFlat ? this.buildFlat(this.grid.data) : this.buildNested(this.grid.data);

    return this.sortNodes(this.grid.hasRowFilters ? this.prune(built) : built);
  });

  /**
   * Every row of the tree the filters left, in display order and whatever is open — what a select-all
   * reaches, what the footer totals and what an export writes. `data` is only the top of a nested tree,
   * so nothing that means "every row" can read it.
   */
  public readonly allRows = memo(
    () => {
      const rows: TRow[] = [];
      const walk = (nodes: TreeNode<TRow>[]): void => {
        nodes.forEach((node) => {
          rows.push(node.data);
          walk(node.children);
        });
      };

      walk(this.nodes.value);

      return rows;
    },
    () => [this.nodes],
  );

  /** Every row in the data, filters ignored: the filter's own options, and what the row count is out of. */
  public everyRow(): TRow[] {
    if (!this.isEager) return [];
    if (this.isFlat) return this.grid.data;

    const rows: TRow[] = [];
    const walk = (items: TRow[]): void => {
      items.forEach((item) => {
        rows.push(item);
        walk(this.childrenOf(item));
      });
    };

    walk(this.grid.data);

    return rows;
  }

  /**
   * One model per row that is showing, in display order. A shut row's children are not built at all,
   * which is what keeps a tree nobody has opened the cost of its top level.
   */
  public rowList(): TreeRowModel<TRow>[] {
    let rowIndex = 0;

    const build = (nodes: TreeNode<TRow>[], level: number, parent?: TreeRowModel<TRow>): TreeRowModel<TRow>[] =>
      nodes.map((node, position) => {
        const row = new TreeRowModel(this.grid, node, rowIndex++, level, position, nodes.length, parent);

        if (row.treeExpanded) row.children = build(node.children, level + 1, row);

        return row;
      });

    return build(this.nodes.value, 0);
  }

  // ========== Which rows are open ==========

  /** Rows opened and rows shut since the grid mounted. Explicit state wins over `defaultExpanded`. */
  private _opened = new Set<Key>();
  private _closed = new Set<Key>();

  private _cachedKeys?: { source: Key[]; set: Set<Key> };

  /** A key list as a set, rebuilt only when the list itself changes — this is read once per row. */
  private keySet(keys: Key[]): Set<Key> {
    if (this._cachedKeys?.source !== keys) this._cachedKeys = { source: keys, set: new Set(keys) };

    return this._cachedKeys.set;
  }

  private defaultExpanded(key: Key, level: number): boolean {
    const value: DefaultExpanded | undefined = this.config?.defaultExpanded;

    if (Array.isArray(value)) return this.keySet(value).has(key);
    if (typeof value === 'number') return level < value;

    return value === true;
  }

  /**
   * Whether anything could be open at all. A lazy tree's walk reads a key off every row in hand to find
   * the open ones, and a tree nobody has touched is the common case — so it is worth one check first.
   */
  public get mayExpand(): boolean {
    if (this.grid.props.expandedTreeKeys || this._opened.size > 0) return true;

    const value = this.config?.defaultExpanded;

    return Array.isArray(value) ? value.length > 0 : value === true || (typeof value === 'number' && value > 0);
  }

  public isExpanded(key: Key, level: number): boolean {
    const controlled = this.grid.props.expandedTreeKeys;
    if (controlled) return this.keySet(controlled).has(key);

    if (this._opened.has(key)) return true;
    if (this._closed.has(key)) return false;

    return this.defaultExpanded(key, level);
  }

  /**
   * Every open row, walked down the tree as it is displayed — a row under a shut one is not open however
   * it is marked. Only walked when somebody is listening, since it costs a key for every row it reaches.
   */
  private expandedKeys(): Key[] {
    // A lazy tree has no nodes to walk: the levels the source holds *are* the rows that are open and
    // reachable, since a level nothing reaches is disposed of on the next walk.
    if (this.isLazy) return this.grid.source.openTreeKeys();

    const keys: Key[] = [];

    const walk = (nodes: TreeNode<TRow>[], level: number): void => {
      nodes.forEach((node) => {
        if (node.children.length === 0) return;

        const key = this.grid.getRowKey(node.data);
        if (!this.isExpanded(key, level)) return;

        keys.push(key);
        walk(node.children, level + 1);
      });
    };

    walk(this.nodes.value, 0);

    return keys;
  }

  public toggle = (key: Key, level: number): void => {
    const open = !this.isExpanded(key, level);

    // Written whether or not `expandedTreeKeys` is present — a handler is a listener, not ownership.
    // The getter prefers the prop, so a controlled grid still shows what its owner asked for.
    if (open) {
      this._opened.add(key);
      this._closed.delete(key);
    } else {
      this._closed.add(key);
      this._opened.delete(key);
    }

    this.grid.treeExpansionChanged();
    this.grid.props.onExpandedTreeKeysChange?.(this.expandedKeys(), { reason: open ? 'expand' : 'collapse' });
    this.grid.notify();
  };
}
