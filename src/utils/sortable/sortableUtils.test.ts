import { describe, expect, it } from 'vitest';
import SortableUtils from './sortableUtils';

// Four items 50px tall with 10px between them, the second one twice as tall.
const slots = [
  { top: 0, height: 50 },
  { top: 60, height: 100 },
  { top: 170, height: 50 },
  { top: 230, height: 50 },
];

describe('SortableUtils', () => {
  describe('targetIndex', () => {
    it('stays put until the middle crosses a neighbour’s', () => {
      expect(SortableUtils.targetIndex(slots, 0, 80)).toBe(0);
      expect(SortableUtils.targetIndex(slots, 0, 95)).toBe(1);
    });

    it('passes several neighbours in one move, either way', () => {
      expect(SortableUtils.targetIndex(slots, 0, 240)).toBe(3);
      expect(SortableUtils.targetIndex(slots, 3, -200)).toBe(1);
    });

    it('stops at either end', () => {
      expect(SortableUtils.targetIndex(slots, 3, 1000)).toBe(3);
      expect(SortableUtils.targetIndex(slots, 0, -1000)).toBe(0);
    });
  });

  it('steps the passed neighbours aside by the held item and the gap after it', () => {
    expect(SortableUtils.pitchOf(slots, 1)).toBe(110);
    expect([0, 1, 2, 3].map((index) => SortableUtils.shiftOf(slots, 1, 3, index))).toEqual([0, 0, -110, -110]);
    expect([0, 1, 2, 3].map((index) => SortableUtils.shiftOf(slots, 3, 0, index))).toEqual([60, 60, 60, 0]);
  });

  it('moves an entry, leaving the array it was given alone', () => {
    const order = ['a', 'b', 'c', 'd'];

    expect(SortableUtils.move(order, 0, 2)).toEqual(['b', 'c', 'a', 'd']);
    expect(SortableUtils.move(order, 3, 0)).toEqual(['d', 'a', 'b', 'c']);
    expect(order).toEqual(['a', 'b', 'c', 'd']);
  });

  it('reads the keyboard’s moves, clamped to the list', () => {
    expect(SortableUtils.keyTarget('ArrowUp', 0, 4)).toBe(0);
    expect(SortableUtils.keyTarget('ArrowDown', 1, 4)).toBe(2);
    expect(SortableUtils.keyTarget('End', 1, 4)).toBe(3);
    expect(SortableUtils.keyTarget('Home', 3, 4)).toBe(0);
    expect(SortableUtils.keyTarget('ArrowLeft', 1, 4)).toBeNull();
  });
});
