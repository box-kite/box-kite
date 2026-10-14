import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { registryItems } from './registry';
import { SITE_NAME } from './site';
import {
  blockDemoPath,
  blockFor,
  blockRoutes,
  blocks,
  snapshotFiles,
  Template,
  templateDemoPath,
  templateFor,
  templateRoutes,
  templates,
} from './templates';

const root = resolve(import.meta.dirname, '../..');

const store: Template = {
  slug: 'react-checkout-page',
  name: 'React checkout page template',
  description: 'A checkout.',
  blocks: ['react-settings-form'],
};

describe('the snapshots', () => {
  // Committing the images is the approval, so a page whose images were never shot is one nobody approved.
  it('exist for every template and every block — run `npm run snapshot:templates`', () => {
    const missing = snapshotFiles().filter((path) => !existsSync(resolve(root, 'pages/public', path.slice(1))));

    expect(missing).toEqual([]);
  });
});

describe('the blocks', () => {
  it('are each a registry item, with a preview to render', () => {
    for (const block of blocks) {
      expect(
        registryItems.some((item) => item.name === block.registry),
        block.slug,
      ).toBe(true);
      expect(existsSync(resolve(root, 'pages/blocks', `${block.slug}.tsx`)), block.slug).toBe(true);
    }
  });

  it('put the search phrase first and the brand nowhere in the address', () => {
    for (const { slug } of [...blocks, ...templates]) {
      expect(slug).toMatch(/^react-[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(slug).not.toContain(SITE_NAME.toLowerCase().replace(' ', '-'));
    }
  });

  it('answer on their page and their demo, and nowhere else', () => {
    expect(blockFor('/blocks/react-settings-form/')?.registry).toBe('settings-form');
    expect(blockFor(blockDemoPath('react-settings-form'))?.registry).toBe('settings-form');
    expect(blockFor('/blocks/react-settings-form/other')).toBeUndefined();
  });
});

describe('blockRoutes', () => {
  it('lists the gallery, then each block and its demo, the demo kept out of the index', () => {
    const routes = blockRoutes();

    expect(routes.map((route) => route.path).slice(0, 3)).toEqual([
      '/blocks',
      '/blocks/react-invoice-data-grid',
      '/blocks/react-invoice-data-grid/demo',
    ]);
    expect(routes.filter((route) => route.indexable === false).every((route) => route.chrome === 'bare')).toBe(true);
    expect(routes.filter((route) => route.chrome === 'bare')).toHaveLength(blocks.length);
  });

  it('gives each block its own card and its code as structured data', () => {
    const [, page] = blockRoutes();

    expect(page.image?.path).toBe('/snapshots/react-invoice-data-grid-og.jpg');
    expect(page.jsonLd?.[0]).toMatchObject({
      '@type': 'SoftwareSourceCode',
      codeRepository: expect.stringContaining('registry/blocks/data-grid'),
    });
  });

  it('serves no gallery with nothing in it', () => {
    expect(blockRoutes([])).toEqual([]);
    expect(templateRoutes([])).toEqual([]);
  });
});

describe('templateRoutes', () => {
  it('lists the gallery as a collection of the templates it holds', () => {
    const [gallery] = templateRoutes([store]);

    expect(gallery.path).toBe('/templates');
    expect(gallery.jsonLd?.[0]).toMatchObject({
      '@type': 'CollectionPage',
      mainEntity: { itemListElement: [{ position: 1, url: expect.stringContaining('/templates/react-checkout-page/') }] },
    });
  });

  it('gives each template a page and a bare demo that carries the same card', () => {
    const [, page, demo] = templateRoutes([store]);

    expect(page).toMatchObject({ path: '/templates/react-checkout-page', name: store.name });
    expect(demo).toMatchObject({ path: templateDemoPath(store.slug), indexable: false, chrome: 'bare', image: page.image });
  });

  it('finds a template only through the table', () => {
    expect(templateFor('/templates/react-checkout-page')).toBe(templates.find((template) => template.slug === 'react-checkout-page'));
  });
});
