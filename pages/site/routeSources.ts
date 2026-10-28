import { POSTS_PATH } from './posts';
import { itemWithDependencies } from './registry';
import { RELEASES_PATH } from './releases';
import { SiteRoutePath } from './site';
import { BLOCKS_PATH, blockFor, blocks, registryItemFor, TEMPLATES_PATH, templateFor } from './templates';

/**
 * Which file each route is written in — the chunk the router loads, the "Edit this page" link and the
 * sitemap's `lastmod`. Plain data with no glob, so the Vite config can read it in Node as well.
 */

/** Where the page modules live, from the repository root — the half of the GitHub link that is a path. */
export const PAGES_DIRECTORY = 'pages/pages';

/** A block's preview, and what runs a template's demo: the content a shared page module renders. */
export const BLOCK_PREVIEWS_DIRECTORY = 'pages/blocks';
export const TEMPLATE_DEMOS_DIRECTORY = 'pages/templates';

/**
 * One page module per route, keyed by the route table's own paths, so a page the table names and this
 * record misses is a type error. The value is the module's file name, which answers both "which chunk"
 * and "which file to open on GitHub" (G5): a path and a loader written side by side could disagree.
 */
const files: Record<SiteRoutePath, string> = {
  '/': 'homePage',
  '/start-with-ai': 'startPage',
  '/start-a-project': 'startProjectPage',
  '/installation': 'installationPage',
  '/releases': 'releasesPage',
  '/blog': 'blogPage',
  '/theme-setup': 'themeSetupPage',
  '/server-components': 'serverComponentsPage',
  '/generative-ui': 'generativeUiPage',
  '/interop': 'interopPage',
  '/playground': 'playgroundPage',
  '/showcase': 'showcasePage',
  '/box': 'boxPage',
  '/box-functions': 'boxFunctionsPage',
  '/svg': 'svgPage',
  '/icon': 'iconPage',
  '/charts': 'chartsPage',
  '/animation': 'animationPage',
  '/motion': 'motionPage',
  '/variants': 'variantsPage',
  '/pseudo-elements': 'pseudoElementsPage',
  '/container-queries': 'containerQueriesPage',
  '/anchor': 'anchorPage',
  '/rtl': 'rtlPage',
  '/escape-hatch': 'escapeHatchPage',
  '/button': 'buttonPage',
  '/textbox': 'textboxPage',
  '/textarea': 'textareaPage',
  '/checkbox': 'checkboxPage',
  '/radiobutton': 'radioButtonPage',
  '/switch': 'switchPage',
  '/tooltip': 'tooltipPage',
  '/overlay': 'overlayPage',
  '/popover': 'popoverPage',
  '/dialog': 'dialogPage',
  '/menu': 'menuPage',
  '/tabs': 'tabsPage',
  '/accordion': 'accordionPage',
  '/list': 'listPage',
  '/slider': 'sliderPage',
  '/dates': 'datesPage',
  '/date-field': 'dateFieldPage',
  '/calendar': 'calendarPage',
  '/date-picker': 'datePickerPage',
  '/progress': 'progressPage',
  '/toaster': 'toasterPage',
  '/combobox': 'comboboxPage',
  '/dropdown': 'dropdownPage',
  '/agent': 'agentPage',
  '/dashboard': 'dashboardPage',
  '/datagrid': 'dataGridPage',
  '/benchmark': 'benchmarkPage',
  '/registry': 'registryPage',
  '/flex': 'flexPage',
  '/grid': 'gridPage',
  '/style-grouping': 'textStylePage',
  '/colors': 'colorPage',
  '/gradients-shadows': 'gradientsShadowsPage',
  '/ai-context': 'aiContextPage',
  '/admin': 'adminPage',
};

const under = (path: string, prefix: string) => path.startsWith(`${prefix}/`);

/** The page module a route renders. A family of routes shares one, and the rest is in the pathname. */
export function fileFor(path: string): string | undefined {
  if (under(path, RELEASES_PATH)) return 'releasePage';
  if (under(path, POSTS_PATH)) return 'postPage';
  if (path === BLOCKS_PATH) return 'blocksPage';
  if (under(path, BLOCKS_PATH)) return blockFor(path) && (path.endsWith('/demo') ? 'blockDemoPage' : 'blockPage');
  if (path === TEMPLATES_PATH) return 'templatesPage';
  if (under(path, TEMPLATES_PATH)) return templateFor(path) && (path.endsWith('/demo') ? 'templateDemoPage' : 'templatePage');

  return files[path as SiteRoutePath];
}

/**
 * The component a family page renders — a block's preview, a template's page on its demo — or nothing.
 * Loaded beside the page module rather than imported by it, so ten templates are ten chunks.
 */
export function contentFor(path: string): string | undefined {
  const block = under(path, BLOCKS_PATH) ? blockFor(path) : undefined;
  if (block) return `${BLOCK_PREVIEWS_DIRECTORY}/${block.slug}.tsx`;

  const template = under(path, TEMPLATES_PATH) && path.endsWith('/demo') ? templateFor(path) : undefined;

  return template && `${TEMPLATE_DEMOS_DIRECTORY}/${template.slug}.tsx`;
}

/** The block or template whose page — not its demo — shows its source, loaded as text rather than run. */
export function sourcePageFor(path: string) {
  if (path.endsWith('/demo')) return undefined;
  if (under(path, BLOCKS_PATH)) return blockFor(path);

  return under(path, TEMPLATES_PATH) ? templateFor(path) : undefined;
}

type Entry = Parameters<typeof registryItemFor>[0];

/** Every file a block or template installs, its own first and then its dependencies'. */
export const installedFiles = (entry: Entry) =>
  itemWithDependencies(registryItemFor(entry).name).flatMap((item) => item.files.map((file) => file.path));

/** The design a template stands on: its dependencies that are not blocks, which have pages of their own. */
export const designsOf = (entry: Entry) =>
  itemWithDependencies(registryItemFor(entry).name)
    .slice(1)
    .filter((item) => !blocks.some((block) => block.registry === item.name));

/**
 * What a page prints: its own files, and on a template the file each design is declared in. The rest of a
 * design installs with it but is printed nowhere, or four store pages would carry the same 500 KB.
 */
export const shownFiles = (entry: Entry) => [
  ...registryItemFor(entry).files.map((file) => file.path),
  ...('blocks' in entry ? designsOf(entry).map((design) => design.files[0].path) : []),
];

/**
 * The file a route is written in, for the link that opens it on GitHub. A release, an article, a block
 * and a template are routes whose content is not their module, so what to edit is the content.
 */
export function sourceFor(path: string): string | undefined {
  if (under(path, RELEASES_PATH)) return `releases/${path.slice(RELEASES_PATH.length + 1)}.md`;
  if (under(path, POSTS_PATH)) return `posts/${path.slice(POSTS_PATH.length + 1)}.md`;

  const block = under(path, BLOCKS_PATH) ? blockFor(path) : undefined;
  if (block) return registryItemFor(block).files[0].path;
  const template = under(path, TEMPLATES_PATH) ? templateFor(path) : undefined;
  if (template) return registryItemFor(template).files[0].path;

  const file = fileFor(path);

  return file ? `${PAGES_DIRECTORY}/${file}.tsx` : undefined;
}

/** Every file a route is built from — what the sitemap's `lastmod` is the newest commit to. */
export function sourcesFor(path: string): string[] {
  const block = under(path, BLOCKS_PATH) ? blockFor(path) : undefined;
  const template = under(path, TEMPLATES_PATH) ? templateFor(path) : undefined;
  const file = fileFor(path);

  return [
    ...(file && !under(path, RELEASES_PATH) && !under(path, POSTS_PATH) ? [`${PAGES_DIRECTORY}/${file}.tsx`] : []),
    ...(block ? [contentFor(path)!, ...installedFiles(block)] : []),
    ...(template ? [`${TEMPLATE_DEMOS_DIRECTORY}/${template.slug}.tsx`, ...installedFiles(template)] : []),
    ...(under(path, RELEASES_PATH) || under(path, POSTS_PATH) ? [sourceFor(path)!] : []),
  ];
}
