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

  it('sends a template to its page, in the folder its design shares', () => {
    expect(sourceFor('/templates/react-checkout-page')).toBe('registry/designs/store/checkout-page.tsx');
    expect(sourceFor('/templates/react-checkout-page/demo')).toBe('registry/designs/store/checkout-page.tsx');
  });

  it('leaves an address the site does not serve alone', () => {
    expect(sourceFor('/nothing-here')).toBeUndefined();
    expect(sourceFor('/blocks/nothing-here')).toBeUndefined();
  });

  // The 404 page has no route of its own.
  it('claims every page module but the one nothing routes to', () => {
    const claimed = new Set(routes.map((route) => `${fileFor(route.path)}.tsx`));
    const unclaimed = pageFiles.filter((file) => !claimed.has(file));

    expect(unclaimed).toEqual(['notFoundPage.tsx']);
  });
});

describe('contentFor', () => {
  it('gives a block and its demo the same preview, which exists', () => {
    expect(contentFor('/blocks/react-settings-form')).toBe('pages/blocks/react-settings-form.tsx');
    expect(contentFor('/blocks/react-settings-form/demo')).toBe('pages/blocks/react-settings-form.tsx');
    expect(existsSync(resolve(root, contentFor('/blocks/react-settings-form')!))).toBe(true);
  });

  it("runs a template's demo from the site, and shows its page as source rather than running it", () => {
    expect(contentFor('/templates/react-checkout-page/demo')).toBe('pages/templates/react-checkout-page.tsx');
    expect(contentFor('/templates/react-checkout-page')).toBeUndefined();

    for (const route of routes.filter((entry) => contentFor(entry.path))) {
      expect(existsSync(resolve(root, contentFor(route.path)!)), route.path).toBe(true);
    }
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

  it('dates a template by its runner, its page and everything it installs with it', () => {
    const sources = sourcesFor('/templates/react-shopping-cart');

    expect(sources.slice(0, 3)).toEqual([
      'pages/pages/templatePage.tsx',
      'pages/templates/react-shopping-cart.tsx',
      'registry/designs/store/cart-page.tsx',
    ]);
    expect(sources).toContain('registry/designs/store/store-design.tsx');
    expect(sources).toContain('registry/designs/store/order-summary.tsx');
  });

  it('dates an article by its markdown alone', () => {
    expect(sourcesFor('/blog/dark-mode-without-the-flash')).toEqual(['posts/dark-mode-without-the-flash.md']);
  });
});
