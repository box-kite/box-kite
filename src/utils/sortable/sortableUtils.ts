/** Where an item sat when a drag began, relative to the list: its top edge and its height, in px. */
export interface SortableSlot {
  top: number;
  height: number;
}

/**
 * The model behind `<SortableList>`: which slot a dragged item is over, how far its neighbours step aside
 * to make room, and the keyboard's moves. The slots are read once, when the drag starts, so every answer
 * is about the layout the person is looking at rather than one that moves under the pointer.
 */
namespace SortableUtils {
  /** How far a press on a handle travels before it is a drag rather than a press, in px. */
  export const SLOP = 4;

  function middle(slot: SortableSlot): number {
    return slot.top + slot.height / 2;
  }

  /** The index the held item would be dropped at, having travelled `travel` px from slot `from`. */
  export function targetIndex(slots: readonly SortableSlot[], from: number, travel: number): number {
    const held = slots[from];
    if (!held) return from;

    // Its middle against each neighbour's middle: past halfway over one is where a person expects the swap.
    const centre = middle(held) + travel;
    let to = from;

    if (travel > 0) {
      for (let index = from + 1; index < slots.length && centre > middle(slots[index]); index++) to = index;
    } else {
      for (let index = from - 1; index >= 0 && centre < middle(slots[index]); index--) to = index;
    }

    return to;
  }

  /** What the held item takes up in the list: its height and the gap after it, which is what a neighbour steps by. */
  export function pitchOf(slots: readonly SortableSlot[], from: number): number {
    const held = slots[from];
    if (!held) return 0;

    const gap = slots.length > 1 ? Math.max(0, slots[1].top - slots[0].top - slots[0].height) : 0;

    return held.height + gap;
  }

  /** How far the item at `index` steps aside while the item from `from` is held over `to`. */
  export function shiftOf(slots: readonly SortableSlot[], from: number, to: number, index: number): number {
    if (from < to && index > from && index <= to) return -pitchOf(slots, from);
    if (to < from && index >= to && index < from) return pitchOf(slots, from);

    return 0;
  }

  /** `array` with the entry at `from` moved to `to`, everything between stepping along by one. A new array. */
  export function move<T>(array: readonly T[], from: number, to: number): T[] {
    const next = array.slice();
    if (from === to || from < 0 || from >= next.length) return next;

    const [entry] = next.splice(from, 1);
    next.splice(Math.max(0, Math.min(to, next.length)), 0, entry);

    return next;
  }

  /** Where a key moves the held item in a list of `count`, or `null` when the key is not a move. A vertical list, so the block axis. */
  export function keyTarget(key: string, index: number, count: number): number | null {
    switch (key) {
      case 'ArrowUp':
        return Math.max(0, index - 1);
      case 'ArrowDown':
        return Math.min(count - 1, index + 1);
      case 'Home':
        return 0;
      case 'End':
        return count - 1;
      default:
        return null;
    }
  }
}

export default SortableUtils;
