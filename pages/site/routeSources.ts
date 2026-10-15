import { POSTS_PATH } from './posts';
import { RELEASES_PATH } from './releases';
import { SiteRoutePath } from './site';
import { BLOCKS_PATH, blockFor, registryItemFor, TEMPLATES_PATH, templateFor } from './templates';

/**
 * Which file each route is written in — the chunk the router loads, the "Edit this page" link and the
 * sitemap's `lastmod`. Plain data with no glob, so the Vite config can read it in Node as well.
 */

/** Where the page modules live, from the repository root — the half of the GitHub link that is a path. */
export const PAGES_DIRECTORY = 'pages/pages';

/** A block's preview, and a template's page: the content a shared page module renders. */
export const BLOCK_PREVIEWS_DIRECTORY = 'pages/blocks';
export const TEMPLATES_DIRECTORY = 'registry/templates';

/**
 * One page module per route, keyed by the route table's own paths, so a page the table names and this
 * record misses is a type error. The value is the module's file name, which answers both "which chunk"
 * and "which file to open on GitHub" (G5): a path and a loader written side by side could disagree.
 */
const files: Record<SiteRoutePath, string> = {
  '/': 'homePage',
  '/start-with-ai': 'startPage',
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

  return template && `${TEMPLATES_DIRECTORY}/${template.slug}/page.tsx`;
}

/** The template whose page — not its demo — shows its source, which is loaded as text rather than run. */
export function sourcePageFor(path: string) {
  return under(path, TEMPLATES_PATH) && !path.endsWith('/demo') ? templateFor(path) : undefined;
}

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
  if (template) return `${TEMPLATES_DIRECTORY}/${template.slug}/page.tsx`;

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
    ...(block ? [contentFor(path)!, ...registryItemFor(block).files.map((entry) => entry.path)] : []),
    ...(template ? [`${TEMPLATES_DIRECTORY}/${template.slug}`] : []),
    ...(under(path, RELEASES_PATH) || under(path, POSTS_PATH) ? [sourceFor(path)!] : []),
  ];
}
