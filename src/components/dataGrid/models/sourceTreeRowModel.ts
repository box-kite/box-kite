import SourceRowModel from './sourceRowModel';
import { TreeRow } from './treeRow';

/**
 * One row of a lazy tree: a `def.dataSource` row that may hold rows of its own, fetched when somebody
 * opens it. Everything it knows about the tree it reads off its level — how deep it sits, how many
 * siblings it has — so a block landing fills in fifty rows of a tree with no model rebuilt.
 *
 * What is under it is not here and never was, which is the difference from the eager `TreeRowModel`: it
 * cannot walk its own subtree, so a cascading selection is not offered and a row the server has not
 * answered for grows no chevron.
 */
export default class SourceTreeRowModel<TRow> extends SourceRowModel<TRow> implements TreeRow {
  public readonly isTreeRow = true;

  /** How deep the level is, which is how deep every row of it is. */
  public get level(): number {
    return this.sourceLevel.depth;
  }

  public get position(): number {
    return this.rowIndex;
  }

  /** The server's count, or `-1` — ARIA's "nobody knows", which is the honest answer to an uncounted level. */
  public get siblings(): number {
    return this.sourceLevel.totalCount ?? -1;
  }

  /** A row the server has not answered for holds nothing anybody can ask about yet. */
  public get hasChildren(): boolean {
    return !this.placeholder && this.grid.tree.rowHasChildren(this.data);
  }

  public get treeExpanded(): boolean {
    return this.hasChildren && this.grid.tree.isExpanded(this.key, this.level);
  }

  public toggleTree = (): void => {
    if (!this.hasChildren) return;

    this.grid.tree.toggle(this.key, this.level);
  };
}
