import { ComponentType, lazy } from 'react';
import { RELEASES_PATH } from '../site/releases';
import { SiteRoutePath } from '../site/site';

/**
 * One dynamic import per route. The record is keyed by the route table's own paths, so a page the
 * table names and this file misses is a type error — the same guarantee the eager record it replaced
 * gave, now with a chunk per page: a reader of /textbox no longer downloads the DataGrid, the 5 MB of
 * mock rows behind it, or Recharts (bug #84).
 */
const loaders: Record<SiteRoutePath, () => Promise<{ default: ComponentType }>> = {
  '/': () => import('../pages/homePage'),
  '/installation': () => import('../pages/installationPage'),
  '/migrating': () => import('../pages/migrationPage'),
  '/releases': () => import('../pages/releasesPage'),
  '/theme-setup': () => import('../pages/themeSetupPage'),
  '/server-components': () => import('../pages/serverComponentsPage'),
  '/box': () => import('../pages/boxPage'),
  '/svg': () => import('../pages/svgPage'),
  '/icon': () => import('../pages/iconPage'),
  '/charts': () => import('../pages/chartsPage'),
  '/animation': () => import('../pages/animationPage'),
  '/variants': () => import('../pages/variantsPage'),
  '/pseudo-elements': () => import('../pages/pseudoElementsPage'),
  '/container-queries': () => import('../pages/containerQueriesPage'),
  '/anchor': () => import('../pages/anchorPage'),
  '/rtl': () => import('../pages/rtlPage'),
  '/tailwind-parity': () => import('../pages/tailwindParityPage'),
  '/escape-hatch': () => import('../pages/escapeHatchPage'),
  '/button': () => import('../pages/buttonPage'),
  '/textbox': () => import('../pages/textboxPage'),
  '/textarea': () => import('../pages/textareaPage'),
  '/checkbox': () => import('../pages/checkboxPage'),
  '/radiobutton': () => import('../pages/radioButtonPage'),
  '/switch': () => import('../pages/switchPage'),
  '/tooltip': () => import('../pages/tooltipPage'),
  '/overlay': () => import('../pages/overlayPage'),
  '/popover': () => import('../pages/popoverPage'),
  '/dialog': () => import('../pages/dialogPage'),
  '/menu': () => import('../pages/menuPage'),
  '/tabs': () => import('../pages/tabsPage'),
  '/dropdown': () => import('../pages/dropdownPage'),
  '/datagrid': () => import('../pages/dataGridPage'),
  '/flex': () => import('../pages/flexPage'),
  '/grid': () => import('../pages/gridPage'),
  '/style-grouping': () => import('../pages/textStylePage'),
  '/colors': () => import('../pages/colorPage'),
  '/gradients-shadows': () => import('../pages/gradientsShadowsPage'),
  '/ai-context': () => import('../pages/aiContextPage'),
};

// Every release has a route of its own, but one page module: the version is in the pathname.
const releasePage = () => import('../pages/releasePage');

function loaderFor(path: string) {
  return loaders[path as SiteRoutePath] ?? (path.startsWith(`${RELEASES_PATH}/`) ? releasePage : undefined);
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
