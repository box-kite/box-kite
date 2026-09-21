import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';
import { siteRoutes } from '../../pages/site/site';
import { ComparisonRow, comparisonRows, countShipped, products, ProductId, VERIFIED_ON } from './gridComparison';

/**
 * A comparison page is only worth the checking behind it, so the table is held to three promises: every
 * tick this library claims links to a demo that exists, every price names the page it was read off, and
 * no row quietly forgets a tier.
 */
describe('the grid comparison table', () => {
  const ids = products.map((product) => product.id);

  it('gives every row a cell for every tier', () => {
    const incomplete = comparisonRows.filter((row) => ids.some((id) => row.cells[id] === undefined));

    expect(incomplete.map((row) => row.feature)).toEqual([]);
  });

  it('names each feature once', () => {
    const features = comparisonRows.map((row) => row.feature);

    expect(new Set(features).size).toBe(features.length);
  });

  // The roadmap's own "done when": a free-here cell that links nowhere is a claim, not a demonstration.
  it('links every feature this library ships to a demo', () => {
    const unlinked = comparisonRows.filter((row) => row.cells['box-kite'].has === 'yes' && !row.demo);

    expect(unlinked.map((row) => row.feature)).toEqual([]);
  });

  it('points every demo at a section that exists', () => {
    const page = readFileSync(resolve(process.cwd(), 'pages/pages/dataGridPage.tsx'), 'utf8');
    const paths = new Set(siteRoutes.map((route) => route.path));
    const broken = comparisonRows.filter((row) => !demoExists(row, paths, page));

    expect(broken.map((row) => row.demo)).toEqual([]);
  });

  it('gives every tier a page its price and its plan split were read off', () => {
    const unsourced = products.filter((product) => !product.href.startsWith('https://'));

    expect(unsourced.map((product) => product.id)).toEqual([]);
  });

  // A price with no date is a price that was true once. The page prints this day beside the table.
  it('carries the day the prices were checked', () => {
    expect(VERIFIED_ON).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(Number.isNaN(Date.parse(VERIFIED_ON))).toBe(false);
  });

  it('counts what a tier ships', () => {
    expect(countShipped('ag-enterprise')).toBe(comparisonRows.length);
    expect(countShipped('box-kite')).toBe(comparisonRows.filter((row) => row.cells['box-kite'].has === 'yes').length);
  });

  // Two of the fourteen are losses. A table with no cross in its own column is an advertisement.
  it('keeps the rows this library does not ship', () => {
    expect(countShipped('box-kite')).toBeLessThan(comparisonRows.length);
  });
});

/** A demo is a route the site serves, optionally with a `#section` the data grid page declares. */
function demoExists(row: ComparisonRow, paths: Set<string>, dataGridPage: string): boolean {
  if (!row.demo) return true;

  const [path, anchor] = row.demo.split('#');

  if (!paths.has(path)) return false;

  return !anchor || dataGridPage.includes(`id="${anchor}"`) || dataGridPage.includes(`id: '${anchor}'`);
}

// Exhaustiveness is a compile-time claim too: a tier added to the union with no column here fails to build.
const _everyProductIsListed: Record<ProductId, true> = {
  'box-kite': true,
  'ag-community': true,
  'ag-enterprise': true,
  'mui-community': true,
  'mui-pro': true,
  'mui-premium': true,
  tanstack: true,
};

void _everyProductIsListed;
