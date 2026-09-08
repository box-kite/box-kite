// The markdown mirror of the docs site, in one place: which address answers with what, and how each
// file is built from a rendered page. The build writes them all into `dist-pages/`
// (`prerender-pages.mjs`) and the dev server renders one on demand (`pages.vite.config.ts`) — two
// callers, one definition, because a mirror that disagrees with itself is the failure this whole
// feature exists to avoid.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Window } from 'happy-dom';
import { propsMarkdown } from './agent-docs.mjs';
import { deprecations, priorFacts } from './agentSources.mjs';

const root = join(import.meta.dirname, '..');

/**
 * The mirror, over a loaded `entry-server` module — the SSR bundle during a build, `ssrLoadModule`
 * in the dev server. Everything it needs from the site (the routes, the converter, the builders)
 * comes from there; everything it needs from the repository (the package, the facts, the prop
 * reference) it reads itself.
 */
export function siteMarkdown(entry) {
  const { name: packageName, version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

  // One window for the life of the mirror: the conversion only ever reads a tree just parsed into it.
  const window = new Window();

  const llmsInput = () => ({ packageName, version, routes: entry.routes, facts: priorFacts(), deprecated: deprecations() });

  /** `<main>` is the root: everything outside it is chrome that repeats on every page. */
  function convert(html) {
    window.document.body.innerHTML = html;
    const main = window.document.querySelector('main');

    return main ? entry.elementMarkdown(main) : '';
  }

  /**
   * One page's file. A release page is rendered *from* `releases/<version>.md`, so its mirror is that
   * file rather than a round trip back out of the HTML.
   */
  function pageFrom(route, html) {
    const release = entry.releases.find((entry) => entry.path === route.path);

    return entry.pageMarkdown({ route, body: release ? release.markdown : convert(html), version });
  }

  const page = async (route) => pageFrom(route, (await entry.renderRoute(route.path)).html);

  /** The route a `.md` address asks for: `/box.md` and `/box/index.md` are both `/box`. */
  function routeFor(url) {
    if (!url.endsWith('.md')) return undefined;

    const path = url.replace(/\/index\.md$/, '').replace(/\.md$/, '') || '/';

    return entry.routeFor(path, entry.routes);
  }

  async function everyPage() {
    const pages = [];

    for (const route of entry.routes) pages.push({ path: route.path, markdown: await page(route) });

    return pages;
  }

  return {
    pageFrom,
    routeFor,
    llms: () => entry.buildLlmsTxt(llmsInput()),
    llmsFull: (pages) => entry.buildLlmsFull(pages, llmsInput()),
    props: () => `${propsMarkdown().trimEnd()}\n`,

    /**
     * What a mirror address answers with, or `null` for an address that is not one — the dev server's
     * entry point, where nothing is on disk to serve.
     */
    async fileFor(url) {
      if (url === '/llms.txt') return this.llms();
      if (url === '/llms-full.txt') return this.llmsFull(await everyPage());
      if (url === '/props.md') return this.props();

      const route = routeFor(url);

      return route ? page(route) : null;
    },
  };
}
