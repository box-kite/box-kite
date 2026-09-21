import { readdirSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';
import { ComponentApi } from '../site/componentApi';
import { siteRoutes } from '../site/site';
import { coverageRows, libraries, LibraryId, marginalSum, sizeRows, totalFor, VERIFIED_ON } from './radixComparison';

const root = process.cwd();

const componentApis: ComponentApi[] = readdirSync(resolve(root, 'api/components')).map((file) =>
  JSON.parse(readFileSync(resolve(root, 'api/components', file), 'utf8')),
);

const paths = new Set<string>(siteRoutes.map((route) => route.path));
const ids = libraries.map((library) => library.id);

/**
 * A comparison page written by the library it favours is worth exactly the checking behind it, so the
 * table is held to five promises: every pattern links to a demo that exists, every claim about this
 * library's own side comes out of its generated reference, every figure names what was measured, the
 * two size figures stay in the relationship that makes printing both of them worth anything, and the
 * rows this library loses are still rows.
 */
describe('the Radix and Base UI comparison', () => {
  it('gives every row a cell for every library', () => {
    const incomplete = [...sizeRows, ...coverageRows].filter((row) => ids.some((id) => row.cells[id] === undefined));

    expect(incomplete.map((row) => row.pattern)).toEqual([]);
  });

  it('names each pattern once in each table', () => {
    for (const rows of [sizeRows, coverageRows]) {
      const patterns = rows.map((row) => row.pattern);

      expect(new Set(patterns).size).toBe(patterns.length);
    }
  });

  it('points every demo at a route this site serves', () => {
    const demos = [...sizeRows.map((row) => row.demo), ...coverageRows.map((row) => row.demo)];
    const broken = demos.filter((demo) => demo !== undefined && !paths.has(demo));

    expect(broken).toEqual([]);
  });

  it('gives every library a version and a page of its own', () => {
    const unsourced = libraries.filter((library) => !library.href.startsWith('https://') || !/^\d+\.\d+\.\d+/.test(library.version));

    expect(unsourced.map((library) => library.id)).toEqual([]);
  });

  // A figure with no date is a figure that was true once. The page prints this day beside both tables.
  it('carries the day the three were installed and measured', () => {
    expect(VERIFIED_ON).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(Number.isNaN(Date.parse(VERIFIED_ON))).toBe(false);
  });
});

/** Everything this library claims about its own side is generated from the components themselves. */
describe('this library’s own column', () => {
  it('names a component reference that exists, on the route the row links to', () => {
    const wrong = sizeRows.filter((row) => {
      if (!row.component) return false;

      const api = componentApis.find((candidate) => candidate.name === row.component);

      return !api || api.route !== row.demo;
    });

    expect(wrong.map((row) => row.pattern)).toEqual([]);
  });

  // Thirteen patterns, and every one of them is a component with a generated reference behind it.
  it('leaves no size row without one', () => {
    expect(sizeRows.filter((row) => !row.component).map((row) => row.pattern)).toEqual([]);
  });
});

describe('the two size figures', () => {
  it('names what was measured in every cell', () => {
    const unnamed = sizeRows.flatMap((row) => ids.filter((id) => !row.cells[id].entry).map((id) => `${row.pattern}: ${id}`));

    expect(unnamed).toEqual([]);
  });

  // One more of something can never cost more than that thing on its own — the rest of the library is
  // already there to share with. A pair the other way round is a transcription error, not a measurement.
  it('keeps every marginal figure under its solo one', () => {
    const wrong = sizeRows.flatMap((row) =>
      ids.filter((id) => row.cells[id].marginal >= row.cells[id].solo).map((id) => `${row.pattern}: ${id}`),
    );

    expect(wrong).toEqual([]);
  });

  /**
   * The whole reason this page prints two numbers: the thirteen share so much that leaving each one out
   * in turn accounts for well under what they cost together. If these ever met, a column of solo figures
   * would be the honest table and this one would not be.
   */
  it('keeps the leave-one-out figures well under the bundle, for all three', () => {
    const wrong = ids.filter((id) => marginalSum(id) >= libraries.find((library) => library.id === id)!.thirteen);

    expect(wrong).toEqual([]);
  });

  it('adds the engine in only where there is one', () => {
    expect(totalFor('box-kite')).toBe(55372);
    expect(totalFor('radix')).toBe(55749);
    expect(totalFor('base-ui')).toBe(97888);
  });
});

/**
 * The rule the grid comparison page set: a table with no cross in its own column is an advertisement.
 * Both of these are true today and both would be worth knowing about if they stopped being true — which
 * is why they are assertions rather than sentences.
 */
describe('the rows this library loses', () => {
  it('keeps the pattern another library ships smaller', () => {
    const lost = sizeRows.filter((row) => ids.some((id) => id !== 'box-kite' && row.cells[id].marginal < row.cells['box-kite'].marginal));

    expect(lost.map((row) => row.pattern)).toContain('Tabs');
  });

  it('keeps the patterns this library has no answer for', () => {
    const missing = coverageRows.filter((row) => row.cells['box-kite'].has === 'none');

    expect(missing.length).toBeGreaterThanOrEqual(8);
  });

  it('explains every row where a library has nothing but the reader would expect something', () => {
    const bare = coverageRows.filter((row) => row.cells['box-kite'].has === 'none' && row.cells.radix.has === 'none');
    const unexplained = bare.filter((row) => !row.cells['box-kite'].as);

    expect(unexplained.map((row) => row.pattern)).toEqual([]);
  });
});

// Exhaustiveness is a compile-time claim too: a library added to the union with no column here fails to build.
const _everyLibraryIsListed: Record<LibraryId, true> = { 'box-kite': true, radix: true, 'base-ui': true };

void _everyLibraryIsListed;
