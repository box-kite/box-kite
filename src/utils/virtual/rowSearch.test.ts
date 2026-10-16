import { describe, expect, it } from 'vitest';
import lazyList from '../array/lazyList';
import { rowAt } from './rowSearch';

// Rows 50, 200, 50 and 50px tall.
const tops = [0, 50, 250, 300];

describe('rowAt', () => {
  it('finds the row a point falls inside', () => {
    expect(rowAt(tops, 10)).toBe(0);
    expect(rowAt(tops, 120)).toBe(1);
    expect(rowAt(tops, 299.5)).toBe(2);
  });

  it('puts a point on a boundary in the row that starts there, not the one that ends there', () => {
    expect(rowAt(tops, 50)).toBe(1);
    expect(rowAt(tops, 49.99)).toBe(0);
    expect(rowAt(tops, 250)).toBe(2);
  });

  it('clamps a point above the list to the first row and one below it to the last', () => {
    expect(rowAt(tops, -100)).toBe(0);
    expect(rowAt(tops, 10_000)).toBe(3);
  });

  it('searches only the rows it is told to, so a trailing total is not a row', () => {
    const withTotal = [...tops, 350];

    expect(rowAt(withTotal, 400, 4)).toBe(3);
    expect(rowAt(withTotal, 400)).toBe(4);
  });

  it('answers for an empty list and a list of one', () => {
    expect(rowAt([], 100)).toBe(0);
    expect(rowAt([0], 100)).toBe(0);
  });

  it('searches a lazy list without materializing it', () => {
    let reads = 0;
    const million = lazyList(1_000_000, (index) => {
      reads++;

      return index * 40;
    });

    expect(rowAt(million, 40 * 654_321 + 39)).toBe(654_321);
    expect(reads).toBeLessThan(25);
  });
});
