import memo from '../../../utils/memo';
import { Key } from '../contracts/dataGridContract';
import DetailRowModel from './detailRowModel';
import GridModel from './gridModel';
import RowModel from './rowModel';
import type { TreeNode } from './treeModel';

/**
 * One row of a `def.treeData` tree: a row of the grid in every sense — its own values, its own cells,
 * its own detail panel — that happens to hold rows of its own. The rows under it are its siblings in the
 * same rowgroup rather than its children in the DOM, which is what `aria-level` is for.
 */
export default class TreeRowModel<TRow> extends RowModel<TRow> {
  constructor(
    grid: GridModel<TRow>,
    private readonly node: TreeNode<TRow>,
    rowIndex: number,
    /** 0 at the top of the tree. `aria-level` is this plus one. */
    public readonly level: number,
    /** Where it sits among its siblings, and how many of them there are — `aria-posinset`/`aria-setsize`. */
    public readonly position: number,
    public readonly siblings: number,
    public readonly treeParent?: TreeRowModel<TRow>,
  ) {
    super(grid, node.data, rowIndex);
  }

  /** Built by `TreeModel` right after this row, and only where it is open: a shut row renders nothing. */
  public children: TreeRowModel<TRow>[] = [];

  /** Whether there is anything under it at all — read off the data, so a shut row still knows. */
  public get hasChildren(): boolean {
    return this.node.children.length > 0;
  }

  /** Whether the rows under it are showing. A row with nothing under it is never open. */
  public get treeExpanded(): boolean {
    return this.hasChildren && this.grid.tree.isExpanded(this.key, this.level);
  }

  public toggleTree = (): void => {
    this.grid.tree.toggle(this.key, this.level);
  };

  /**
   * Every key in this row's subtree, its own first. Walked over the *data* rather than the models, so a
   * shut row can still select what is under it; cached per model, and the models are rebuilt whenever
   * the tree is.
   */
  private readonly _subtreeKeys = memo(() => {
    const keys: Key[] = [];
    const walk = (nodes: TreeNode<TRow>[]): void => {
      nodes.forEach((child) => {
        keys.push(this.grid.getRowKey(child.data));
        walk(child.children);
      });
    };

    keys.push(this.key);
    walk(this.node.children);

    return keys;
  });

  public get subtreeKeys(): Key[] {
    return this._subtreeKeys.value;
  }

  /**
   * With `selection: 'cascade'` a row is selected when everything under it is — a parent whose children
   * are not all ticked is not itself ticked, which is what makes the indeterminate state mean something.
   */
  public override get selected(): boolean {
    if (!this.grid.tree.cascades) return super.selected;

    return this.subtreeKeys.every((key) => this.grid.selectedRows.has(key));
  }

  /** Some of the subtree is selected and some is not. Always false without the cascade. */
  public get indeterminate(): boolean {
    if (!this.grid.tree.cascades) return false;

    return !this.selected && this.subtreeKeys.some((key) => this.grid.selectedRows.has(key));
  }

  public override toggleSelection = (): void => {
    if (!this.grid.tree.cascades) {
      this.grid.toggleRowSelection(this.key);
      return;
    }

    this.grid.toggleRowsSelection(this.subtreeKeys);
  };

  /** This row, its detail panel if one is open, and then everything under it — in display order. */
  public override get flatRows(): (RowModel<TRow> | DetailRowModel<TRow>)[] {
    const rows = super.flatRows;

    if (this.children.length === 0) return rows;

    return [...rows, ...this.children.flatMap((child) => child.flatRows)];
  }
}
