import { ComponentType, createElement, lazy } from 'react';
import { contentFor, fileFor, sourcePageFor, TEMPLATES_DIRECTORY } from '../site/routeSources';
import { ContentProps } from '../site/templates';

/** What a family page is handed: a block's preview or a template to run, or a template's files as text. */
export interface FamilyPageProps {
  Content?: ComponentType<ContentProps>;
  /** Keyed by repository path. */
  sources?: Readonly<Record<string, string>>;
}

type Module<P = FamilyPageProps> = { default: ComponentType<P> };
type Loader = () => Promise<Module>;

/**
 * One chunk per page module, found through the file names `routeSources` keeps: a reader of /textbox
 * no longer downloads the DataGrid, the 5 MB of mock rows behind it, or Recharts (bug #84).
 */
const pages = import.meta.glob('../pages/*.tsx') as Record<string, Loader>;
// A block's preview and a template are chunks of their own, beside the one page module each family shares.
const blockPreviews = import.meta.glob('../blocks/*.tsx') as Record<string, () => Promise<Module<ContentProps>>>;
const templatePages = import.meta.glob('../../registry/templates/*/page.tsx') as Record<string, () => Promise<Module<ContentProps>>>;
const templateFiles = import.meta.glob<string>('../../registry/templates/*/*.{ts,tsx}', { query: '?raw', import: 'default' });

const contentLoader = (content: string) =>
  content.startsWith('pages/') ? blockPreviews[`../${content.slice('pages/'.length)}`] : templatePages[`../../${content}`];

/** A template's files as text, keyed by repository path — what its page shows and the reader copies. */
async function templateSources(slug: string): Promise<Record<string, string>> {
  const folder = `../../${TEMPLATES_DIRECTORY}/${slug}/`;
  const entries = Object.entries(templateFiles).filter(([key]) => key.startsWith(folder));

  return Object.fromEntries(await Promise.all(entries.map(async ([key, load]) => [key.slice('../../'.length), await load()])));
}

// One module per path: a second preload building a second wrapper would remount the page on screen.
const composed = new Map<string, Promise<Module>>();

function loaderFor(path: string): Loader | undefined {
  const file = fileFor(path);
  const page = file ? pages[`../pages/${file}.tsx`] : undefined;
  if (!page) return undefined;

  const content = contentFor(path);
  const load = content ? contentLoader(content) : undefined;
  if (content && !load) return undefined;

  const template = sourcePageFor(path);
  if (!load && !template) return page;

  // Everything before the page renders: a content module behind a `lazy` of its own would suspend the prerender.
  return () => {
    let loading = composed.get(path);

    if (!loading) {
      loading = Promise.all([page(), load?.(), template && templateSources(template.slug)]).then(
        ([{ default: Page }, loaded, sources]) => ({
          default: () => createElement(Page, { Content: loaded?.default, sources }),
        }),
      );
      loading.catch(() => composed.delete(path));
      composed.set(path, loading);
    }

    return loading;
  };
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
