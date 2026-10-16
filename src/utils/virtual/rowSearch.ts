/** Where each row starts, ascending: an array, or a list that computes an entry when it is asked for one. */
export type RowTops = { readonly length: number; readonly [index: number]: number };

/**
 * The row a point `y` falls in — the last of the first `count` rows that starts at or above it — clamped
 * to the list. A binary search, since a scroll asks on every frame and a datasource grid lays out a million
 * rows it never allocates. `DataGrid` and `VirtualList` both window through it.
 */
export function rowAt(tops: RowTops, y: number, count: number = tops.length): number {
  let low = 0;
  let high = count - 1;
  if (high <= 0) return 0;

  while (low < high) {
    const mid = (low + high + 1) >>> 1;
    if (tops[mid] <= y) low = mid;
    else high = mid - 1;
  }

  return low;
}
