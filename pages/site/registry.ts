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
  /** Printed by the CLI once the files are written — the step the files cannot do for themselves. */
  docs?: string;
}

/**
 * The three blocks. Each one is a finished section rather than a component: the point of a registry
 * item over an npm import is that the code lands in the project and is edited there.
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
] as const satisfies readonly RegistryItem[];

export type RegistryItemName = (typeof registryItems)[number]['name'];

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
        files: item.files.map((file) => ({ path: file.path, type: file.type, target: file.target })),
      })),
    },
    null,
    2,
  )}\n`;
}
