import { existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { siteRoutes } from '../site/site';
import { PAGES_DIRECTORY, sourceFor } from './routePages';

/**
 * The route table names a file per route and the glob resolves it, so a typo is a page that fails to
 * load in the browser rather than a compile error. These two are what catch it instead — and they are
 * also what keeps "Edit this page" pointing at a file that exists.
 */
const root = resolve(import.meta.dirname, '../..');

const pageFiles = readdirSync(resolve(root, PAGES_DIRECTORY)).filter((file) => file.endsWith('.tsx'));

describe('sourceFor', () => {
  it('names a file that exists, for every route', () => {
    for (const route of siteRoutes) {
      const source = sourceFor(route.path);

      expect(source, `${route.path} has no page module`).toBeDefined();
      expect(existsSync(resolve(root, source!)), `${source} does not exist`).toBe(true);
    }
  });

  it('sends a release page to the notes it renders, which is what there is to edit', () => {
    expect(sourceFor('/releases/2.1.0')).toBe('releases/2.1.0.md');
  });

  it('leaves an address the site does not serve alone', () => {
    expect(sourceFor('/nothing-here')).toBeUndefined();
  });

  it('claims every page module but the two the router reaches without a route of its own', () => {
    const claimed = new Set(siteRoutes.map((route) => sourceFor(route.path)?.split('/').pop()));
    const unclaimed = pageFiles.filter((file) => !claimed.has(file) && !['notFoundPage.tsx', 'releasePage.tsx'].includes(file));

    expect(unclaimed).toEqual([]);
  });
});
