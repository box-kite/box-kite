import { ComponentType, lazy } from 'react';
import { RELEASES_PATH } from '../site/releases';
import { SiteRoutePath } from '../site/site';

/**
 * One page module per route. The record is keyed by the route table's own paths, so a page the table
 * names and this file misses is a type error — and a chunk per page: a reader of /textbox no longer
 * downloads the DataGrid, the 5 MB of mock rows behind it, or Recharts (bug #84).
 *
 * The value is the module's **file name** rather than its import, so one entry answers both questions:
 * which chunk to load, and which file to open on GitHub ("Edit this page", G5). A path and a loader
 * written side by side could disagree; a name resolved through the glob below cannot.
 */
const pages = import.meta.glob('../pages/*.tsx') as Record<string, () => Promise<{ default: ComponentType }>>;

/** Where the page modules live, from the repository root — the half of the GitHub link that is a path. */
export const PAGES_DIRECTORY = 'pages/pages';

const files: Record<SiteRoutePath, string> = {
  '/': 'homePage',
  '/installation': 'installationPage',
  '/releases': 'releasesPage',
  '/theme-setup': 'themeSetupPage',
  '/server-components': 'serverComponentsPage',
  '/generative-ui': 'generativeUiPage',
  '/interop': 'interopPage',
  '/playground': 'playgroundPage',
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

// Every release has a route of its own, but one page module: the version is in the pathname.
const RELEASE_FILE = 'releasePage';

function fileFor(path: string): string | undefined {
  return files[path as SiteRoutePath] ?? (path.startsWith(`${RELEASES_PATH}/`) ? RELEASE_FILE : undefined);
}

function loaderFor(path: string) {
  const file = fileFor(path);

  return file ? pages[`../pages/${file}.tsx`] : undefined;
}

/**
 * The file a route is written in, for the link that opens it on GitHub. A release page is the one route
 * whose content is not its module: the notes are `releases/<version>.md`, which is what to edit.
 */
export function sourceFor(path: string): string | undefined {
  if (path.startsWith(`${RELEASES_PATH}/`)) return `releases/${path.slice(RELEASES_PATH.length + 1)}.md`;

  const file = files[path as SiteRoutePath];

  return file ? `${PAGES_DIRECTORY}/${file}.tsx` : undefined;
}

// Modules resolved before rendering starts. `React.lazy` always suspends on its first render, and a
// hydration that suspends throws away the prerendered HTML it was supposed to adopt — so the route
// being hydrated (and every route the prerender pass renders) is loaded up front and rendered eagerly.
const resolved = new Map<string, ComponentType>();
const suspending = new Map<string, ComponentType>();

/** Load one route's page module. Unknown paths are the 404 route's, which is bundled with the app. */
export async function preloadPage(path: string): Promise<void> {
  const loader = loaderFor(path);
  if (!loader) return;

  resolved.set(path, (await loader()).default);
}

/**
 * Warm a route's chunk before it is needed — the nav calls this when a pointer lands on a link, which
 * is a few hundred milliseconds of head start on the click. Failures are ignored: the navigation asks
 * for the module again, and reports it properly if it is really gone.
 */
export function prefetchPage(path: string): void {
  void preloadPage(path).catch(() => {});
}

/** The page component for a path: rendered directly when preloaded, through Suspense otherwise. */
export default function pageFor(path: string): ComponentType {
  const preloaded = resolved.get(path);
  if (preloaded) return preloaded;

  let page = suspending.get(path);

  if (!page) {
    const loader = loaderFor(path);
    if (!loader) throw new Error(`${path} is not a route this site serves`);
    page = lazy(loader);
    suspending.set(path, page);
  }

  return page;
}
