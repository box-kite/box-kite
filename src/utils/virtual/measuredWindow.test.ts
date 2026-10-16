import { describe, expect, it } from 'vitest';
import MeasuredWindow from './measuredWindow';

describe('MeasuredWindow', () => {
  // Ten rows of 50px, then one of 200px, then ten more of 50px.
  const sizes = [...Array<number>(10).fill(50), 200, ...Array<number>(10).fill(50)];
  const offsets = MeasuredWindow.offsetsOf(sizes);

  it('adds the sizes up, the last offset being the whole list', () => {
    expect(offsets.slice(0, 3)).toEqual([0, 50, 100]);
    expect(offsets[11]).toBe(700);
    expect(offsets[21]).toBe(1200);
  });

  it('renders what is on screen plus the overscan either side', () => {
    const slice = MeasuredWindow.measuredWindow({ offsets, viewStart: 500, viewEnd: 750, overscan: 1 });

    // 500 to 750 covers row 10 (500 to 700) and row 11 (700 to 750); one more either side.
    expect([slice.startIndex, slice.endIndex]).toEqual([9, 13]);
    expect(slice.offsetY).toBe(450);
    expect(slice.totalHeight).toBe(1200);
  });

  it('starts at the top while the list is below the screen, and stops at the end past it', () => {
    expect(MeasuredWindow.measuredWindow({ offsets, viewStart: -400, viewEnd: -100, overscan: 0 })).toMatchObject({
      startIndex: 0,
      endIndex: 1,
    });
    expect(MeasuredWindow.measuredWindow({ offsets, viewStart: 5000, viewEnd: 5300, overscan: 0 })).toMatchObject({
      startIndex: 20,
      endIndex: 21,
    });
  });

  it('keeps the row focus is in, when it is near enough', () => {
    const slice = MeasuredWindow.measuredWindow({ offsets, viewStart: 800, viewEnd: 900, overscan: 0, pin: 2 });

    expect(slice.startIndex).toBe(2);
    expect(slice.offsetY).toBe(100);
  });

  it('lets a focused row go once it is too far away to keep the window small', () => {
    const long = MeasuredWindow.offsetsOf(Array<number>(500).fill(10));

    expect(MeasuredWindow.measuredWindow({ offsets: long, viewStart: 4000, viewEnd: 4100, overscan: 0, pin: 0 }).startIndex).toBe(400);
  });

  it('renders nothing for an empty list', () => {
    expect(MeasuredWindow.measuredWindow({ offsets: [0], viewStart: 0, viewEnd: 100 })).toEqual({
      startIndex: 0,
      endIndex: 0,
      offsetY: 0,
      totalHeight: 0,
    });
  });
});
