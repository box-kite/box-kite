import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import Box from '../src/box';
import { getStyles, resetStyles } from '../src/ssg';
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
export { routeFor } from './site/siteMeta';

export async function renderRoute(path: string): Promise<{ html: string; styles: string }> {
  // React.lazy suspends on its first render and `renderToString` cannot wait for it, so the route's
  // page module is resolved before rendering starts.
  await preloadPage(path);

  const html = renderToString(
    <StrictMode>
      <StaticRouter location={path}>
        <Root />
      </StaticRouter>
    </StrictMode>,
  );
  const styles = getStyles();

  // Each shell ships its own route's CSS and nothing else.
  resetStyles();

  return { html, styles };
}
