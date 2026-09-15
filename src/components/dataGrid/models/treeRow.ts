import RowModel from './rowModel';

/**
 * What the grid needs of a row that holds rows. Two models answer it and neither can extend the other:
 * the eager `TreeRowModel` holds its node, and the lazy `SourceTreeRowModel` reads its level out of the
 * block cache — so the chevron, the indent and the sideways keys work off this rather than off a class.
 */
export interface TreeRow {
  /** Duck tag, so the guard below needs neither class in scope and no import cycle with them. */
  readonly isTreeRow: true;
  /** 0 at the top of the tree. `aria-level` is this plus one. */
  readonly level: number;
  /** Where it sits among its siblings, and how many of them there are — `aria-posinset`/`aria-setsize`. */
  readonly position: number;
  readonly siblings: number;
  /** Whether there is anything under it: a row with nothing under it never grows a chevron. */
  readonly hasChildren: boolean;
  /** Whether the rows under it are showing. */
  readonly treeExpanded: boolean;
  readonly toggleTree: () => void;
}

/** Whether a row of the grid is one of the tree's. Narrows to a row, since every tree row is one. */
export function isTreeRow<TRow>(row: unknown): row is RowModel<TRow> & TreeRow {
  return !!row && (row as TreeRow).isTreeRow === true;
}
