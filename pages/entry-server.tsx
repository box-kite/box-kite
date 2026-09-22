import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import Box from '../src/box';
import { getStyles, resetStyles } from '../src/ssg';
import AfterHydration from './app/afterHydration';
import Root from './app/root';
import { preloadPage } from './app/routePages';
import { PRERENDERED_STYLE_ID } from './site/prerender';
import { releases, routes } from './site/routes';
import './extends';

/**
 * The prerender pass, run by `scripts/prerender-pages.mjs` once per route. There is no DOM in this
 * process and the engine does not pretend there is one: it collects CSS in a string sink, which is
 * what `getStyles()` reads back — the library's own SSG API, on the library's own docs.
 */

// The class names have to survive the trip to the browser, where a counter starting from zero would
// name the same rules differently. Content-hashed names agree across the two processes.
Box.configure({ classNames: 'stable' });

/** A location no route matches, so the router falls through to the 404 page. */
export const NOT_FOUND_PATH = '/404';

export const prerenderPaths = routes.map((route) => route.path);

export { PRERENDERED_STYLE_ID, releases, routes };
// The markdown mirror is written from the same render, so its builders come through this entry too:
// `scripts/prerender-pages.mjs` is a plain script and these are TypeScript.
export { elementMarkdown, markdownPath, pageMarkdown } from './site/pageMarkdown';
export { buildLlmsFull, buildLlmsTxt } from './site/llms';
// Docs search (G5): the index is built from the same rendered markup the markdown mirror converts.
export { buildSearchIndex, pageSections, RELEASE_TEXT_LIMIT, SEARCH_INDEX_PATH } from './site/searchIndex';
export { routeFor } from './site/siteMeta';
// The shadcn registry is served from this build too: the items are declared here and the block sources
// come through a glob, neither of which a plain script can read.
export { buildRegistryIndex, buildRegistryItem, CATALOG_PATH, itemPath, registryItems, REGISTRY_PATH } from './site/registry';
export { missingSources, registrySources } from './site/registrySources';

export async function renderRoute(path: string): Promise<{ html: string; styles: string }> {
  // React.lazy suspends on its first render and `renderToString` cannot wait for it, so the route's
  // page module is resolved before rendering starts.
  await preloadPage(path);

  const html = renderToString(
    <StrictMode>
      <StaticRouter location={path}>
        <Root />
        {/* Renders nothing and runs nothing here. It is in the tree because `main.tsx` has it, and
            `useId` counts a parent's children: one child on the server and two in the browser names
            every id below this differently, which is invisible until one end of a pair is written by
            an effect — an `Overlay` anchored to an element, whose layer then points at no anchor. */}
        <AfterHydration />
      </StaticRouter>
    </StrictMode>,
  );
  const styles = getStyles();

  // Each shell ships its own route's CSS and nothing else.
  resetStyles();

  return { html, styles };
}
