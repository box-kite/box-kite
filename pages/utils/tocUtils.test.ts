import { describe, expect, it } from 'vitest';
import { activeIndex, keepInView } from './tocUtils';

describe('activeIndex', () => {
  it('is the last heading above the line', () => {
    expect(activeIndex([-400, -20, 90, 600], 100, false)).toBe(2);
  });

  it('is -1 above the first heading', () => {
    expect(activeIndex([300, 900], 100, false)).toBe(-1);
  });

  it('is the last heading once the page cannot scroll further', () => {
    expect(activeIndex([-900, 300, 500], 100, true)).toBe(2);
  });

  it('is -1 with no headings, even at the end', () => {
    expect(activeIndex([], 100, true)).toBe(-1);
  });
});

describe('keepInView', () => {
  const list = { scrollTop: 0, height: 400, scrollHeight: 1200 };

  it('leaves an item that is already clear of the edges', () => {
    expect(keepInView({ top: 100, height: 28 }, list, 32)).toBeNull();
  });

  it('centres an item that has gone under the bottom fade', () => {
    expect(keepInView({ top: 380, height: 28 }, list, 32)).toBe(194);
  });

  it('centres an item above the top fade', () => {
    expect(keepInView({ top: 520, height: 28 }, { ...list, scrollTop: 600 }, 32)).toBe(334);
  });

  it('stays inside the scroll range', () => {
    expect(keepInView({ top: 10, height: 28 }, { ...list, scrollTop: 300 }, 32)).toBe(0);
    expect(keepInView({ top: 1180, height: 20 }, list, 32)).toBe(800);
  });
});
