import { RegistryItemName, registryItems } from './registry';
import { REPO_URL, SITE_NAME, SITE_URL, SiteRoute, SocialImage } from './site';

/** The gallery of complete pages, and the prefix of each template's own page. */
export const TEMPLATES_PATH = '/templates';

/** The gallery of sections, and the prefix of each block's own page. */
export const BLOCKS_PATH = '/blocks';

/** Where `npm run snapshot:templates` writes, under `pages/public/`. Committing an image is approving it. */
export const SNAPSHOTS_PATH = '/snapshots';

/** A gallery card's image: 16:10, twice the width a card is drawn at. */
export const SNAPSHOT_SIZE = { width: 960, height: 600 } as const;

/** The `og:image` crop, the size every network asks for. */
export const OG_SIZE = { width: 1200, height: 630 } as const;

export type SnapshotTheme = 'light' | 'dark';

/** A section of a page, installable on its own. */
export interface Block {
  /** The last segment of `/blocks/<slug>/`: the search phrase, keyword first, no brand. */
  slug: string;
  /** The shadcn registry item it is published as, which is also where its sources are listed. */
  registry: RegistryItemName;
  /** The page's `<h1>`. */
  name: string;
  description: string;
  /** Drawn light above dark rather than side by side: a layout that needs the whole column. */
  wide?: boolean;
}

/** A complete page, with a live demo at `/templates/<slug>/demo/`. */
export interface Template {
  slug: string;
  /** The registry item holding its page; the design and the blocks come in through its dependencies. */
  registry: RegistryItemName;
  name: string;
  description: string;
  /** Its blocks, by slug — each one links back here as "used in". */
  blocks: readonly string[];
}

export const blocks: readonly Block[] = [
  {
    slug: 'react-invoice-data-grid',
    registry: 'data-grid',
    name: 'React invoice data grid',
    description:
      'A virtualized invoice table with search, column filters, grouping, totals, an editable amount, copy and paste, and CSV/XLSX export.',
    wide: true,
  },
  {
    slug: 'react-settings-form',
    registry: 'settings-form',
    name: 'React settings form',
    description:
      'A settings panel of real form controls: text fields, a searchable select, a radio group, a slider and a switch, read on submit with no state.',
  },
  {
    slug: 'react-admin-dashboard-layout',
    registry: 'dashboard-shell',
    name: 'React admin dashboard layout',
    description:
      'The frame an admin app hangs off: a sidebar, a header with search, a theme toggle and an account menu, and a row of stat tiles.',
    wide: true,
  },
  {
    slug: 'react-product-grid',
    registry: 'product-grid',
    name: 'React product grid with filters',
    description:
      'A React product grid with category and colour filters, sorting, an announced result count and cards that are one link each, light and dark.',
    wide: true,
  },
  {
    slug: 'react-product-image-gallery',
    registry: 'product-gallery',
    name: 'React product image gallery',
    description:
      'A React product image gallery: one large view and thumbnails that choose it, built as tabs so the arrow keys move between pictures.',
  },
  {
    slug: 'react-product-variant-picker',
    registry: 'variant-picker',
    name: 'React product variant picker',
    description:
      'Colour swatches and sizes as native radio groups, a quantity stepper and an Add to cart button, styled with :has(:checked) and no state.',
  },
  {
    slug: 'react-cart-items',
    registry: 'cart-items',
    name: 'React cart items list',
    description:
      'The lines of a React shopping cart: a picture, the options chosen, a quantity stepper, the line price and a remove button.',
  },
  {
    slug: 'react-order-summary',
    registry: 'order-summary',
    name: 'React order summary',
    description:
      'A React order summary: subtotal, discount, shipping, tax and total from the cart, a discount code field and a free-shipping progress bar.',
  },
  {
    slug: 'react-credit-card-form',
    registry: 'credit-card-form',
    name: 'React credit card form',
    description:
      'A React credit card form: number, name, expiry and security code, formatted as typed, checked on blur, with a card that fills in above.',
  },
  {
    slug: 'react-address-form',
    registry: 'address-form',
    name: 'React address form',
    description:
      'A React shipping address form with the autocomplete tokens browsers fill from, a searchable country select and errors read aloud.',
  },
  {
    slug: 'react-shipping-method-selector',
    registry: 'shipping-method',
    name: 'React shipping method selector',
    description:
      'Delivery options as selectable cards in React: a native radio group, one tab stop, the chosen card styled with :has(:checked).',
  },
];

/** The store: four pages of one design, linked to each other in their demos. */
export const templates: readonly Template[] = [
  {
    slug: 'react-ecommerce-storefront',
    registry: 'ecommerce-storefront',
    name: 'React ecommerce storefront template',
    description:
      'A store front page in React: a drawn hero, a product grid with filters and sorting, and a story band, in light and dark with no stylesheet.',
    blocks: ['react-product-grid'],
  },
  {
    slug: 'react-product-page',
    registry: 'product-page',
    name: 'React product page template',
    description:
      'A React product page: an image gallery, colour and size pickers, a quantity stepper, add to cart, a details accordion and related products.',
    blocks: ['react-product-image-gallery', 'react-product-variant-picker', 'react-product-grid'],
  },
  {
    slug: 'react-shopping-cart',
    registry: 'shopping-cart',
    name: 'React shopping cart page template',
    description:
      'A React cart page: editable line items beside an order summary with a discount code, a free-shipping progress bar and an empty state.',
    blocks: ['react-cart-items', 'react-order-summary'],
  },
  {
    slug: 'react-checkout-page',
    registry: 'checkout-page',
    name: 'React checkout page template',
    description:
      'A one-page React checkout: contact, shipping address, delivery options and a credit card form beside the order summary, light and dark.',
    blocks: ['react-address-form', 'react-shipping-method-selector', 'react-credit-card-form', 'react-order-summary'],
  },
];

export const blockPath = (slug: string) => `${BLOCKS_PATH}/${slug}`;
export const templatePath = (slug: string) => `${TEMPLATES_PATH}/${slug}`;
/** The page alone, full-bleed: what the snapshots are shot from, and what "Live demo" opens. */
export const templateDemoPath = (slug: string) => `${templatePath(slug)}/demo`;
export const blockDemoPath = (slug: string) => `${blockPath(slug)}/demo`;

/** The image a gallery card shows, and the crop a shared link shows. */
export const snapshotPath = (slug: string, theme: SnapshotTheme) => `${SNAPSHOTS_PATH}/${slug}-${theme}.webp`;
export const ogImagePath = (slug: string) => `${SNAPSHOTS_PATH}/${slug}-og.jpg`;

/** What `npm run snapshot:templates` shoots: every demo, by the slug its images are named after. */
export function snapshotTargets(): { slug: string; path: string }[] {
  return [
    ...templates.map(({ slug }) => ({ slug, path: templateDemoPath(slug) })),
    ...blocks.map(({ slug }) => ({ slug, path: blockDemoPath(slug) })),
  ];
}

/** Every image the snapshot script has to have written, for the test that fails a page without them. */
export function snapshotFiles(): string[] {
  return snapshotTargets().flatMap(({ slug }) => [snapshotPath(slug, 'light'), snapshotPath(slug, 'dark'), ogImagePath(slug)]);
}

export const blockFor = (path: string) =>
  blocks.find((block) => blockPath(block.slug) === trimmed(path) || blockDemoPath(block.slug) === trimmed(path));
export const templateFor = (path: string) =>
  templates.find((template) => templatePath(template.slug) === trimmed(path) || templateDemoPath(template.slug) === trimmed(path));

/** The templates a block is part of, for its "used in" links. */
export const templatesUsing = (slug: string) => templates.filter((template) => template.blocks.includes(slug));

export const registryItemFor = (entry: Block | Template) => registryItems.find((item) => item.name === entry.registry)!;

/** Where an entry's files live: one folder, since a design's files import each other. */
const folderOf = (entry: Block | Template) => registryItemFor(entry).files[0].path.split('/').slice(0, -1).join('/');

const trimmed = (path: string) => (path.length > 1 ? path.replace(/\/+$/, '') : path);
const absolute = (path: string) => (path === '/' ? `${SITE_URL}/` : `${SITE_URL}${path}/`);

const ogImage = (slug: string, name: string): SocialImage => ({ path: ogImagePath(slug), ...OG_SIZE, alt: `${name}, in the light theme` });

/** A page that is its own code: Google reads the repository, the language and the licence off it. */
function sourceCode(name: string, description: string, path: string, slug: string, folder: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareSourceCode',
    name,
    description,
    url: absolute(path),
    image: `${SITE_URL}${ogImagePath(slug)}`,
    codeRepository: `${REPO_URL}/tree/main/${folder}`,
    programmingLanguage: 'TypeScript',
    runtimePlatform: 'React',
    license: 'https://opensource.org/licenses/MIT',
    author: { '@type': 'Organization', name: SITE_NAME, url: `${SITE_URL}/` },
  };
}

function collection(name: string, description: string, path: string, items: readonly { path: string; name: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name,
    description,
    url: absolute(path),
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: absolute(item.path),
        name: item.name,
      })),
    },
  };
}

const BLOCKS_GALLERY = {
  name: 'Blocks',
  title: 'React UI blocks — copy-paste sections in light and dark',
  description:
    'Finished React sections you copy or install with the shadcn CLI: data grids, forms, a product grid, a checkout and more, each in light and dark.',
};

const TEMPLATES_GALLERY = {
  name: 'Templates',
  title: 'React templates — complete pages in light and dark',
  description:
    'Complete React pages to start from: each one in light and dark, built from blocks you can install on their own, with the whole source on the page.',
};

/** A demo carries the page's description and card, and leaves the index to the page: it is the same thing with no words. */
const demoRoute = (path: string, { slug, name, description }: Block | Template): SiteRoute => ({
  path,
  name: `${name}, live demo`,
  description,
  image: ogImage(slug, name),
  indexable: false,
  chrome: 'bare',
});

/** The gallery, then per block its page and its full-bleed demo. No blocks, no gallery: an empty index is not a page. */
export function blockRoutes(list: readonly Block[] = blocks): SiteRoute[] {
  if (!list.length) return [];

  const pages = list.map((block) => ({ path: blockPath(block.slug), name: block.name }));

  return [
    {
      path: BLOCKS_PATH,
      ...BLOCKS_GALLERY,
      jsonLd: [collection(BLOCKS_GALLERY.title, BLOCKS_GALLERY.description, BLOCKS_PATH, pages)],
    },
    ...list.flatMap((block) => [
      {
        path: blockPath(block.slug),
        name: block.name,
        description: block.description,
        image: ogImage(block.slug, block.name),
        jsonLd: [sourceCode(block.name, block.description, blockPath(block.slug), block.slug, folderOf(block))],
      },
      demoRoute(blockDemoPath(block.slug), block),
    ]),
  ];
}

/** The gallery, then per template its page and its full-bleed demo, which leaves the index to the page. */
export function templateRoutes(list: readonly Template[] = templates): SiteRoute[] {
  if (!list.length) return [];

  const pages = list.map((template) => ({ path: templatePath(template.slug), name: template.name }));

  return [
    {
      path: TEMPLATES_PATH,
      ...TEMPLATES_GALLERY,
      jsonLd: [collection(TEMPLATES_GALLERY.title, TEMPLATES_GALLERY.description, TEMPLATES_PATH, pages)],
    },
    ...list.flatMap((template) => [
      {
        path: templatePath(template.slug),
        name: template.name,
        description: template.description,
        image: ogImage(template.slug, template.name),
        jsonLd: [sourceCode(template.name, template.description, templatePath(template.slug), template.slug, folderOf(template))],
      },
      demoRoute(templateDemoPath(template.slug), template),
    ]),
  ];
}

/** What a family page hands the module it renders: a block's preview is drawn once per theme. */
export interface ContentProps {
  theme?: SnapshotTheme;
}
