import { existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { routes } from './routes';
import { contentFor, fileFor, PAGES_DIRECTORY, sourceFor, sourcesFor } from './routeSources';

/**
 * The route table names a file per route and the glob resolves it, so a typo is a page that fails to
 * load in the browser rather than a compile error. These are what catch it instead — and they are
 * also what keeps "Edit this page" pointing at a file that exists.
 */
const root = resolve(import.meta.dirname, '../..');

const pageFiles = readdirSync(resolve(root, PAGES_DIRECTORY)).filter((file) => file.endsWith('.tsx'));

describe('sourceFor', () => {
  it('names a file that exists, for every route', () => {
    for (const route of routes) {
      const source = sourceFor(route.path);

      expect(source, `${route.path} has no source`).toBeDefined();
      expect(existsSync(resolve(root, source!)), `${source} does not exist`).toBe(true);
    }
  });

  it('sends a release page to the notes it renders, which is what there is to edit', () => {
    expect(sourceFor('/releases/2.1.0')).toBe('releases/2.1.0.md');
  });

  it('sends an article to its markdown, for the same reason', () => {
    expect(sourceFor('/blog/dark-mode-without-the-flash')).toBe('posts/dark-mode-without-the-flash.md');
  });

  it('sends a block to the file it installs', () => {
    expect(sourceFor('/blocks/react-settings-form')).toBe('registry/blocks/settings-form/settings-form.tsx');
  });

  it('leaves an address the site does not serve alone', () => {
    expect(sourceFor('/nothing-here')).toBeUndefined();
    expect(sourceFor('/blocks/nothing-here')).toBeUndefined();
  });

  // The three template modules wait for stage 2's first template; the 404 page has no route of its own.
  it('claims every page module but the ones nothing routes to yet', () => {
    const claimed = new Set(routes.map((route) => `${fileFor(route.path)}.tsx`));
    const unclaimed = pageFiles.filter((file) => !claimed.has(file));

    expect(unclaimed.sort()).toEqual(['notFoundPage.tsx', 'templateDemoPage.tsx', 'templatePage.tsx', 'templatesPage.tsx']);
  });
});

describe('contentFor', () => {
  it('gives a block and its demo the same preview, which exists', () => {
    expect(contentFor('/blocks/react-settings-form')).toBe('pages/blocks/react-settings-form.tsx');
    expect(contentFor('/blocks/react-settings-form/demo')).toBe('pages/blocks/react-settings-form.tsx');
    expect(existsSync(resolve(root, contentFor('/blocks/react-settings-form')!))).toBe(true);
  });

  it('gives a docs page nothing', () => {
    expect(contentFor('/box')).toBeUndefined();
  });
});

describe('sourcesFor', () => {
  it('dates a block by its page, its preview and every file it installs', () => {
    expect(sourcesFor('/blocks/react-admin-dashboard-layout')).toEqual([
      'pages/pages/blockPage.tsx',
      'pages/blocks/react-admin-dashboard-layout.tsx',
      'registry/blocks/dashboard-shell/dashboard-shell.tsx',
      'registry/blocks/dashboard-shell/dashboard-stats.tsx',
    ]);
  });

  it('dates an article by its markdown alone', () => {
    expect(sourcesFor('/blog/dark-mode-without-the-flash')).toEqual(['posts/dark-mode-without-the-flash.md']);
  });
});
