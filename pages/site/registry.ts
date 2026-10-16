import { SITE_NAME, SITE_URL } from './site';

/**
 * The shadcn registry (F4): the blocks under `registry/` served as the JSON the `shadcn` CLI installs
 * from, so `npx shadcn@latest add @box-kite/data-grid` drops working code into somebody else's project.
 *
 * A registry is JSON over HTTP and nothing else — there is no server here. The blocks are ordinary
 * sources in this repository, type-checked by `npm run compile` and rendered on `/registry`, and the
 * file contents are read into these items at build time. That is the whole point of the arrangement: a
 * block that stops compiling cannot be published, and the code on the page is the code installed.
 *
 * Schemas: https://ui.shadcn.com/schema/registry.json and .../registry-item.json.
 */
export const REGISTRY_PATH = '/registry.json';
export const REGISTRY_NAME = 'box-kite';

/** The shadcn CLI's own namespace for this registry, and the URL template a `components.json` registers. */
export const REGISTRY_NAMESPACE = '@box-kite';

const ITEM_SCHEMA = 'https://ui.shadcn.com/schema/registry-item.json';
const INDEX_SCHEMA = 'https://ui.shadcn.com/schema/registry.json';

/** Every file of every item is one of these — the CLI reads it to decide where the file lands. */
export type RegistryFileType = 'registry:block' | 'registry:component' | 'registry:lib' | 'registry:hook';

export interface RegistryFile {
  /** Where the file lives here, relative to the repository root. */
  path: string;
  type: RegistryFileType;
  /**
   * Where it lands in the project installing it. `@components/` is the alias that project's
   * `components.json` declares, so the same item suits `src/components` and `app/components` alike.
   */
  target: string;
}

export interface RegistryItem {
  /** What a reader types: `npx shadcn add @box-kite/<name>`. */
  name: string;
  title: string;
  description: string;
  categories: readonly string[];
  /** npm packages the CLI installs with the files. */
  dependencies: readonly string[];
  files: readonly RegistryFile[];
  /** Other items of this registry, by name, that the CLI installs first: the store's blocks all stand on its design. */
  registryDependencies?: readonly string[];
  /** Printed by the CLI once the files are written — the step the files cannot do for themselves. */
  docs?: string;
}

const STORE = 'registry/designs/store';

/** A store file, landing in `box-kite/store/` so the relative imports between them hold in the project too. */
const storeFile = (name: string, type: RegistryFileType = 'registry:block'): RegistryFile => ({
  path: `${STORE}/${name}`,
  type,
  target: `@components/box-kite/store/${name}`,
});

const STORE_DOCS = 'Wrap it in <StoreSurface> from store-design.tsx, or render it inside one of the store pages.';

/**
 * The blocks and the pages. Each one is a finished section rather than a component: the point of a registry
 * item over an npm import is that the code lands in the project and is edited there. A design's items share
 * one folder, so their relative imports hold, and stand on its design item through `registryDependencies`.
 */
export const registryItems = [
  {
    name: 'data-grid',
    title: 'Invoices data grid',
    description:
      'A virtualized data grid wired to sample invoices: search, column filters, grouping, totals, an editable amount that is validated, range selection with copy and paste, and CSV/XLSX export.',
    categories: ['data-grid', 'table', 'dashboard'],
    dependencies: ['@box-kite/react'],
    files: [
      { path: 'registry/blocks/data-grid/invoices-grid.tsx', type: 'registry:block', target: '@components/box-kite/invoices-grid.tsx' },
      { path: 'registry/blocks/data-grid/invoice-rows.ts', type: 'registry:lib', target: '@components/box-kite/invoice-rows.ts' },
    ],
    docs: 'Render <InvoicesGrid /> anywhere. Replace `invoice-rows.ts` with your own fetch — the grid reads plain objects — and edit the `columns` array in `invoices-grid.tsx`.',
  },
  {
    name: 'settings-form',
    title: 'Settings form',
    description:
      'A settings panel of real form controls — text fields, a searchable select, a radio group, a slider and a switch — that reads its own fields on submit, so none of it needs state.',
    categories: ['form', 'settings'],
    dependencies: ['@box-kite/react'],
    files: [
      { path: 'registry/blocks/settings-form/settings-form.tsx', type: 'registry:block', target: '@components/box-kite/settings-form.tsx' },
    ],
    docs: 'Render <SettingsForm /> and replace the `onSubmit` handler. It calls toast(), so mount <Toaster /> once near the root of the app: import Toaster from "@box-kite/react/components/toaster".',
  },
  {
    name: 'dashboard-shell',
    title: 'Dashboard shell',
    description:
      'The frame an admin app hangs off: a sidebar, a header with search, a theme toggle and an account menu, and a row of stat tiles drawn with the chart primitives.',
    categories: ['dashboard', 'layout'],
    dependencies: ['@box-kite/react', 'lucide-react'],
    files: [
      {
        path: 'registry/blocks/dashboard-shell/dashboard-shell.tsx',
        type: 'registry:block',
        target: '@components/box-kite/dashboard-shell.tsx',
      },
      {
        path: 'registry/blocks/dashboard-shell/dashboard-stats.tsx',
        type: 'registry:component',
        target: '@components/box-kite/dashboard-stats.tsx',
      },
    ],
    docs: 'Wrap a page in <DashboardShell title="Overview">. Box.Theme inside it is use="local", so the theme lands on the shell — move it to your root layout as use="global" for an app-wide switch.',
  },
  {
    name: 'store-design',
    title: 'Store design',
    description:
      'The design the store blocks and pages share: the components restyled with Box.createComponents(), the catalogue, the drawn product art, and the header and footer.',
    categories: ['ecommerce', 'design'],
    dependencies: ['@box-kite/react', 'lucide-react'],
    files: [
      storeFile('store-design.tsx', 'registry:component'),
      storeFile('store-data.ts', 'registry:lib'),
      storeFile('product-art.tsx', 'registry:component'),
      storeFile('quantity-stepper.tsx', 'registry:component'),
      storeFile('form-field.tsx', 'registry:component'),
      storeFile('store-shell.tsx', 'registry:component'),
    ],
    docs: 'Wrap a page in <StoreSurface>, or in <StoreShell> for the header and footer too. Point the links at your routes with <StoreLinks.Provider>.',
  },
  {
    name: 'product-grid',
    title: 'Product grid with filters',
    description: 'A product grid with category and finish filters, a sort and an announced count, over cards that are one link each.',
    categories: ['ecommerce', 'product'],
    dependencies: ['@box-kite/react'],
    registryDependencies: ['store-design'],
    files: [storeFile('product-grid.tsx'), storeFile('product-card.tsx', 'registry:component')],
    docs: `Render <ProductGrid products={…} />. ${STORE_DOCS}`,
  },
  {
    name: 'product-gallery',
    title: 'Product image gallery',
    description: 'A large product view with thumbnails that choose it, built as tabs so the arrow keys move between pictures.',
    categories: ['ecommerce', 'product'],
    dependencies: ['@box-kite/react'],
    registryDependencies: ['store-design'],
    files: [storeFile('product-gallery.tsx')],
    docs: `Render <ProductGallery product={…} finish={…} />. ${STORE_DOCS}`,
  },
  {
    name: 'variant-picker',
    title: 'Product variant picker',
    description:
      'Colour swatches and sizes as native radio groups, a quantity stepper and an Add to cart button that confirms with a toast.',
    categories: ['ecommerce', 'product', 'form'],
    dependencies: ['@box-kite/react'],
    registryDependencies: ['store-design'],
    files: [storeFile('variant-picker.tsx')],
    docs: `Render <VariantPicker product={…} onAdd={…} />. It calls toast(), so mount <Toaster /> once near the root. ${STORE_DOCS}`,
  },
  {
    name: 'cart-items',
    title: 'Cart items',
    description: 'The lines of a shopping cart: picture, name, options, a quantity stepper, the line price and a remove button.',
    categories: ['ecommerce', 'cart'],
    dependencies: ['@box-kite/react'],
    registryDependencies: ['store-design'],
    files: [storeFile('cart-items.tsx')],
    docs: `Render <CartItems lines={lines} onLinesChange={setLines} /> — the cart is yours to keep. ${STORE_DOCS}`,
  },
  {
    name: 'order-summary',
    title: 'Order summary',
    description:
      'Subtotal, discount, shipping, tax and total from the cart lines, with a discount code field and a free-shipping progress bar.',
    categories: ['ecommerce', 'cart', 'checkout'],
    dependencies: ['@box-kite/react'],
    registryDependencies: ['store-design'],
    files: [storeFile('order-summary.tsx')],
    docs: `Render <OrderSummary lines={lines} action={…} />. Check discount codes on your server. ${STORE_DOCS}`,
  },
  {
    name: 'credit-card-form',
    title: 'Credit card form',
    description:
      'Card number, name, expiry and security code, formatted as typed and checked on blur, with a card drawn above that fills in.',
    categories: ['ecommerce', 'checkout', 'form'],
    dependencies: ['@box-kite/react'],
    registryDependencies: ['store-design'],
    files: [storeFile('credit-card-form.tsx')],
    docs: `Render <CreditCardForm /> inside your checkout form. In production, raw card numbers belong in your payment provider's hosted fields. ${STORE_DOCS}`,
  },
  {
    name: 'address-form',
    title: 'Address form',
    description: 'A postal address fieldset with the autocomplete tokens a browser fills it from, and a searchable country select.',
    categories: ['checkout', 'form'],
    dependencies: ['@box-kite/react'],
    registryDependencies: ['store-design'],
    files: [storeFile('address-form.tsx')],
    docs: `Render <AddressForm /> inside a form; a second one with prefix="billing" is the billing address. ${STORE_DOCS}`,
  },
  {
    name: 'shipping-method',
    title: 'Shipping method selector',
    description: 'Delivery options as selectable cards over a native radio group, priced, with a free tier above an order total.',
    categories: ['ecommerce', 'checkout', 'form'],
    dependencies: ['@box-kite/react'],
    registryDependencies: ['store-design'],
    files: [storeFile('shipping-method.tsx')],
    docs: `Render <ShippingMethod value={method} onValueChange={setMethod} />. ${STORE_DOCS}`,
  },
  {
    name: 'ecommerce-storefront',
    title: 'Ecommerce storefront',
    description: 'A store front page: a drawn hero, three promises, the product grid with filters and a story band, in light and dark.',
    categories: ['ecommerce', 'page'],
    dependencies: ['@box-kite/react', 'lucide-react'],
    registryDependencies: ['store-design', 'product-grid'],
    files: [storeFile('storefront-page.tsx')],
    docs: 'Render <StorefrontPage /> as your home route, and point the links at your routes with <StoreLinks.Provider>.',
  },
  {
    name: 'product-page',
    title: 'Product page',
    description: 'A product page: gallery, variant picker, details accordion and related products, with a cart count that moves.',
    categories: ['ecommerce', 'page'],
    dependencies: ['@box-kite/react'],
    registryDependencies: ['store-design', 'product-grid', 'product-gallery', 'variant-picker'],
    files: [storeFile('product-page.tsx')],
    docs: 'Render <ProductPage slug={…} /> from your product route. It calls toast(), so mount <Toaster /> once near the root.',
  },
  {
    name: 'shopping-cart',
    title: 'Shopping cart',
    description:
      'A cart page: editable line items beside an order summary, with a discount code, free-shipping progress and an empty state.',
    categories: ['ecommerce', 'page', 'cart'],
    dependencies: ['@box-kite/react'],
    registryDependencies: ['store-design', 'cart-items', 'order-summary'],
    files: [storeFile('cart-page.tsx')],
    docs: 'Render <CartPage /> from your cart route, and replace its sample lines with your cart.',
  },
  {
    name: 'checkout-page',
    title: 'Checkout page',
    description: 'A one-page checkout: contact, shipping address, delivery method and card payment beside the order summary.',
    categories: ['ecommerce', 'page', 'checkout'],
    dependencies: ['@box-kite/react'],
    registryDependencies: ['store-design', 'address-form', 'shipping-method', 'credit-card-form', 'order-summary'],
    files: [storeFile('checkout-page.tsx')],
    docs: 'Render <CheckoutPage /> from your checkout route and send the form to your server. It calls toast(), so mount <Toaster /> once near the root.',
  },
] as const satisfies readonly RegistryItem[];

export type RegistryItemName = (typeof registryItems)[number]['name'];

/** An item and everything the CLI installs with it, the item first and each dependency once. */
export function itemWithDependencies(name: string, items: readonly RegistryItem[] = registryItems): RegistryItem[] {
  const found: RegistryItem[] = [];
  const visit = (next: string) => {
    const item = items.find((entry) => entry.name === next);
    if (!item || found.includes(item)) return;
    found.push(item);
    item.registryDependencies?.forEach(visit);
  };

  visit(name);

  return found;
}

/** The address one item answers on. `{name}` in a `components.json` registry entry expands to this. */
export const itemPath = (name: string) => `/r/${name}.json`;

/**
 * The address the CLI derives for the catalog: it substitutes `registry` for the item name in the URL
 * template, so a registry serving items at `/r/{name}.json` is asked for `/r/registry.json`. The root
 * `/registry.json` is the same bytes under the name a directory submission and the schema both expect.
 */
export const CATALOG_PATH = itemPath('registry');

/** What `npx shadcn add` is given. The command is a fact about the site, so it is built from the URL. */
export const installCommand = (name: string, siteUrl: string = SITE_URL) => `npx shadcn@latest add ${siteUrl}${itemPath(name)}`;

/** Opening an item in v0 is its published address handed to v0's own opener. */
export const v0Url = (name: string, siteUrl: string = SITE_URL) =>
  `https://v0.dev/chat/api/open?url=${encodeURIComponent(`${siteUrl}${itemPath(name)}`)}`;

/** The `registries` entry a project adds to `components.json` to type `@box-kite/<name>` instead of a URL. */
export const registryTemplate = (siteUrl: string = SITE_URL) => `${siteUrl}${itemPath('{name}')}`;

const authorFor = (siteUrl: string) => `${SITE_NAME} <${siteUrl}>`;

// As addresses rather than names: the CLI reads a bare name as one of shadcn's own, and a project need not have registered the namespace.
const registryDependenciesOf = (item: RegistryItem, siteUrl: string) =>
  item.registryDependencies?.length ? { registryDependencies: item.registryDependencies.map((name) => `${siteUrl}${itemPath(name)}`) } : {};

/**
 * One item, with the file contents inlined — which is what the CLI writes. `contents` is keyed by the
 * `path` of each file; a file the caller did not read is a build failure rather than an empty install.
 */
export function buildRegistryItem(item: RegistryItem, contents: Readonly<Record<string, string>>, siteUrl: string = SITE_URL): string {
  const files = item.files.map((file) => {
    const content = contents[file.path];

    if (!content) throw new Error(`Registry item "${item.name}": no content for ${file.path}`);

    return { path: file.path, content, type: file.type, target: file.target };
  });

  return `${JSON.stringify(
    {
      $schema: ITEM_SCHEMA,
      name: item.name,
      type: 'registry:block',
      title: item.title,
      description: item.description,
      author: authorFor(siteUrl),
      categories: [...item.categories],
      dependencies: [...item.dependencies],
      ...registryDependenciesOf(item, siteUrl),
      files,
      ...(item.docs ? { docs: item.docs } : {}),
    },
    null,
    2,
  )}\n`;
}

/**
 * The catalog. Its items carry no `content` — this is the list a directory, a search or a reader browses,
 * and each entry's own address is where the code is.
 */
export function buildRegistryIndex(items: readonly RegistryItem[] = registryItems, siteUrl: string = SITE_URL): string {
  return `${JSON.stringify(
    {
      $schema: INDEX_SCHEMA,
      name: REGISTRY_NAME,
      homepage: siteUrl,
      items: items.map((item) => ({
        name: item.name,
        type: 'registry:block',
        title: item.title,
        description: item.description,
        author: authorFor(siteUrl),
        categories: [...item.categories],
        dependencies: [...item.dependencies],
        ...registryDependenciesOf(item, siteUrl),
        files: item.files.map((file) => ({ path: file.path, type: file.type, target: file.target })),
      })),
    },
    null,
    2,
  )}\n`;
}
