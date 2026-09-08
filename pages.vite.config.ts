import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import reactPlugin from '@vitejs/plugin-react';
import iconsPlugin from 'unplugin-icons/vite';
import { defineConfig, Plugin } from 'vite';
import { parseReleases, releaseRoutes } from './pages/site/releases';
import { SITE_URL, SiteRoute, siteRoutes } from './pages/site/site';
import { buildRobotsTxt, buildSitemap, notFoundMeta, pageMeta, withHeadHtml } from './pages/site/siteMeta';

/**
 * Everything the site publishes about its own address, built from the route table in `pages/site/site.ts`:
 * the head metadata, one static shell per route, `sitemap.xml`, `robots.txt` and the `CNAME`.
 *
 * The shells are why the sitemap is worth having: GitHub Pages answers an address it has no file for with
 * an HTTP 404, so every route the sitemap listed would report itself missing.
 */
/**
 * The routes the app serves, the release pages included. The app derives those from an `import.meta.glob`
 * over `releases/`; this runs in Node, where the same files are read with `fs`.
 */
function allRoutes(): readonly SiteRoute[] {
  const dir = join(import.meta.dirname, 'releases');
  const files = existsSync(dir)
    ? Object.fromEntries(
        readdirSync(dir)
          .filter((file) => file.endsWith('.md'))
          .map((file) => [file, readFileSync(join(dir, file), 'utf8')]),
      )
    : {};

  return [...siteRoutes, ...releaseRoutes(parseReleases(files))];
}

function siteMetadata(): Plugin {
  const home = siteRoutes[0];
  const routes = allRoutes();

  return {
    name: 'site-metadata',
    transformIndexHtml: {
      order: 'pre',
      handler: (html) => withHeadHtml(html, pageMeta(home)),
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: buildSitemap(SITE_URL, routes) });
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: buildRobotsTxt() });
      // GitHub Pages keeps the custom domain in a repository setting that nothing in this repo can
      // see. Shipping the same host in the artifact means a setting that gets lost or overwritten
      // shows up as a diff here, rather than as a site quietly answering on the wrong address.
      this.emitFile({ type: 'asset', fileName: 'CNAME', source: `${new URL(SITE_URL).host}\n` });
    },
    async writeBundle(options) {
      const outDir = options.dir;
      if (!outDir) return;

      const shell = await readFile(join(outDir, 'index.html'), 'utf8');

      const pages = routes
        .filter((route) => route.path !== home.path)
        .map((route) => [join(outDir, route.path.slice(1), 'index.html'), pageMeta(route)] as const)
        .concat([[join(outDir, '404.html'), notFoundMeta] as const]);

      for (const [file, meta] of pages) {
        await mkdir(dirname(file), { recursive: true });
        await writeFile(file, withHeadHtml(shell, meta));
      }
    },
  };
}

/**
 * The markdown mirror, in the dev server. The build writes these files into `dist-pages/`
 * (`scripts/prerender-pages.mjs`); with nothing on disk in dev, the SPA fallback answered `/box.md`
 * with `index.html` and the router rendered its 404 — so the footer link on every page was dead
 * exactly where the site is edited. Rendered on demand here, from the same builder the build uses.
 */
function markdownMirror(): Plugin {
  return {
    name: 'markdown-mirror',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const url = (request.url ?? '').split('?')[0];

        const mirrored = url.endsWith('.md') || ['/llms.txt', '/llms-full.txt', '/box-kite.mdc'].includes(url);

        if (!mirrored) return next();

        // The corpus is every page, so it renders all of them: about half a minute, and silence
        // looks like a hung request.
        if (url === '/llms-full.txt') server.config.logger.info('  markdown mirror: rendering every page for llms-full.txt…');

        try {
          // Resolved from this file rather than by specifier: the config is bundled into a temporary
          // module before it runs, and a bare relative import would resolve from wherever that lands.
          const { siteMarkdown } = await import(new URL('./scripts/siteMarkdown.mjs', import.meta.url).href);
          const entry = await server.ssrLoadModule('/entry-server.tsx');
          const content = await siteMarkdown(entry).fileFor(url);

          if (content === null) return next();

          // `.mdc` is markdown too, but it is a file to save rather than one to read in a browser.
          const type = url.endsWith('.md') ? 'text/markdown' : 'text/plain';

          response.setHeader('Content-Type', `${type}; charset=utf-8`);
          response.end(content);
        } catch (error) {
          next(error);
        }
      });
    },
  };
}

export default defineConfig(({ mode, isSsrBuild }) => {
  return {
    // `unplugin-icons` is the Iconify bridge the /icon page documents, and this site is where it is
    // proved: `~icons/<set>/<name>` becomes a React component at build time, out of the icon data in
    // an `@iconify-json/*` devDependency, so nothing is fetched at runtime and only the icons the
    // site imports are compiled. It is a *page* plugin — the library ships no icons, and nothing
    // about it reaches `vite.config.ts`.
    // The prerender pass builds `entry-server.tsx` through this same config (see
    // `scripts/prerender-pages.mjs`), and the metadata plugin has nothing to do there: an SSR bundle
    // has no `index.html` for it to read.
    plugins: [reactPlugin(), iconsPlugin({ compiler: 'jsx', jsx: 'react' }), ...(isSsrBuild ? [] : [siteMetadata(), markdownMirror()])],
    build: {
      emptyOutDir: true,
      minify: mode !== 'dev' && !isSsrBuild,
      // No explicit input: both scripts pass `./pages` as the root, so Vite's default
      // `<root>/index.html` is the entry. Naming it `pages/index.html` resolved against the root
      // (`pages/pages/index.html`), which made the dev server's dependency scan fail and skip
      // pre-bundling entirely.
    },
  };
});
