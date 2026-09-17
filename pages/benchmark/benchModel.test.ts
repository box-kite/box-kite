import { describe, expect, it } from 'vitest';
import { BENCH_COLUMN_COUNT, BenchRow, FILTER_COUNTRY, GROUP_COLUMN, generateRows } from './benchData';
import { ScenarioId, median, percentile, round, scenarios } from './benchModel';

describe('the benchmark rows', () => {
  it('builds the same table every time, on any machine', () => {
    const first = generateRows(500);
    const second = generateRows(500);

    expect(second).toEqual(first);
    expect(generateRows(500, 7)).not.toEqual(first);
  });

  it('has the column count the page prints', () => {
    expect(Object.keys(generateRows(1)[0])).toHaveLength(BENCH_COLUMN_COUNT);
  });

  it('gives the filter and the grouping something to work on', () => {
    const rows = generateRows(2000);
    const matching = rows.filter((row) => row.country === FILTER_COUNTRY).length;
    const groups = new Set(rows.map((row) => row[GROUP_COLUMN as keyof BenchRow]));

    // A twentieth of a twenty-value column, give or take: a filter that keeps everything or nothing
    // measures nothing.
    expect(matching / rows.length).toBeGreaterThan(0.02);
    expect(matching / rows.length).toBeLessThan(0.1);
    expect(groups.size).toBe(12);
  });

  it('numbers its rows from one and keeps the ids unique', () => {
    const rows = generateRows(1000);

    expect(rows[0].id).toBe(1);
    expect(new Set(rows.map((row) => row.id)).size).toBe(1000);
  });
});

describe('the summary statistics', () => {
  it('takes the middle of an odd list and the mean of the middle two of an even one', () => {
    expect(median([5, 1, 3])).toBe(3);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(median([])).toBe(0);
  });

  it('counts a percentile from the sorted samples', () => {
    const samples = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    expect(percentile(samples, 100)).toBe(10);
    expect(percentile(samples, 50)).toBe(5);
    expect(percentile(samples, 1)).toBe(1);
  });

  it('keeps a tenth under 100 ms and whole milliseconds above it', () => {
    expect(round(12.34)).toBe(12.3);
    expect(round(99.99)).toBe(100);
    expect(round(238.4)).toBe(238);
  });
});

describe('the scenarios', () => {
  it('describes every one the runner knows about', () => {
    const ids: ScenarioId[] = ['mount', 'scroll', 'filter', 'sort', 'group'];

    expect(scenarios.map((scenario) => scenario.id)).toEqual(ids);
    expect(scenarios.every((scenario) => scenario.what.endsWith('.'))).toBe(true);
  });

  it('has exactly one scenario reported as frames', () => {
    expect(scenarios.filter((scenario) => scenario.kind === 'frames').map((scenario) => scenario.id)).toEqual(['scroll']);
  });
});
