/**
 * The section a reader is in: the last heading whose top has passed `offset`, or the last of all once
 * the page cannot scroll further — the closing sections are too short to ever reach the line. -1 is above the first.
 */
export function activeIndex(tops: readonly number[], offset: number, atEnd: boolean): number {
  if (atEnd && tops.length) return tops.length - 1;

  let active = -1;

  tops.forEach((top, index) => {
    if (top <= offset) active = index;
  });

  return active;
}

/**
 * Where a list scrolls to so an item stays clear of its faded edges: `null` while it already is, and
 * otherwise the item centred, clamped to the list's own range.
 */
export function keepInView(
  item: { top: number; height: number },
  list: { scrollTop: number; height: number; scrollHeight: number },
  margin: number,
) {
  const visibleTop = list.scrollTop + margin;
  const visibleBottom = list.scrollTop + list.height - margin;

  if (item.top >= visibleTop && item.top + item.height <= visibleBottom) return null;

  const centred = item.top - (list.height - item.height) / 2;

  return Math.round(Math.min(Math.max(centred, 0), Math.max(list.scrollHeight - list.height, 0)));
}
