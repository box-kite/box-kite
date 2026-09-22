import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import reactPlugin from '@vitejs/plugin-react';
import iconsPlugin from 'unplugin-icons/vite';
import { defineConfig, Plugin } from 'vite';
import { parseReleases, releaseRoutes } from './pages/site/releases';
import { SEARCH_INDEX_PATH } from './pages/site/searchIndex';
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

        // `/registry.json` and `/r/*.json` are the shadcn registry (F4), built from the block sources
        // by the same mirror — so `npx shadcn add http://localhost:5173/r/data-grid.json` works in dev.
        const isRegistry = url === '/registry.json' || (url.startsWith('/r/') && url.endsWith('.json'));
        const isJson = isRegistry || url === SEARCH_INDEX_PATH;
        const mirrored = url.endsWith('.md') || isJson || ['/llms.txt', '/llms-full.txt', '/box-kite.mdc'].includes(url);

        if (!mirrored) return next();

        // Both of these are every page, so they render all of them: about half a minute, and silence
        // looks like a hung request.
        if (url === '/llms-full.txt' || url === SEARCH_INDEX_PATH) {
          server.config.logger.info(`  markdown mirror: rendering every page for ${url.slice(1)}…`);
        }

        try {
          // Resolved from this file rather than by specifier: the config is bundled into a temporary
          // module before it runs, and a bare relative import would resolve from wherever that lands.
          const { siteMarkdown } = await import(new URL('./scripts/siteMarkdown.mjs', import.meta.url).href);
          const entry = await server.ssrLoadModule('/entry-server.tsx');
          const content = await siteMarkdown(entry).fileFor(url);

          if (content === null) return next();

          // `.mdc` is markdown too, but it is a file to save rather than one to read in a browser. The
          // registry is served as JSON here because the build's static `.json` files are — the dev
          // server answering the same address with `text/plain` is a difference nobody wants to find.
          const type = url.endsWith('.md') ? 'text/markdown' : isJson ? 'application/json' : 'text/plain';

          response.setHeader('Content-Type', `${type}; charset=utf-8`);
          response.end(content);
        } catch (error) {
          next(error);
        }
      });
    },
  };
}

/**
 * `preview`, serving the built site the way the static host does. GitHub Pages answers `/installation`
 * with a 301 to `/installation/` and then the shell; Vite's preview has no such redirect, and as an
 * `spa` it answered with the *root* shell instead — so the browser hydrated `/`'s markup at another
 * route, which is a guaranteed mismatch and was bug #133, the React #418 that looked site-wide for a
 * month. Nothing was ever wrong with the shells: `/installation/` was clean the whole time.
 */
function staticHost(): Plugin {
  const out = join(import.meta.dirname, 'dist-pages');

  return {
    name: 'static-host',
    configurePreviewServer(server) {
      server.middlewares.use((request, response, next) => {
        const path = new URL(request.url ?? '/', 'http://localhost').pathname;

        // A file request is the host's business; only an extensionless path names a directory.
        if (path.endsWith('/') || path.slice(path.lastIndexOf('/')).includes('.')) return next();
        if (!existsSync(join(out, path, 'index.html'))) return next();

        response.writeHead(301, { Location: `${path}/${request.url?.slice(path.length) ?? ''}` });
        response.end();
      });
    },
  };
}

export default defineConfig(({ mode, isSsrBuild, isPreview }) => {
  return {
    // `unplugin-icons` is the Iconify bridge the /icon page documents, and this site is where it is
    // proved: `~icons/<set>/<name>` becomes a React component at build time, out of the icon data in
    // an `@iconify-json/*` devDependency, so nothing is fetched at runtime and only the icons the
    // site imports are compiled. It is a *page* plugin — the library ships no icons, and nothing
    // about it reaches `vite.config.ts`.
    // The prerender pass builds `entry-server.tsx` through this same config (see
    // `scripts/prerender-pages.mjs`), and the metadata plugin has nothing to do there: an SSR bundle
    // has no `index.html` for it to read.
    plugins: [
      reactPlugin(),
      iconsPlugin({ compiler: 'jsx', jsx: 'react' }),
      ...(isSsrBuild ? [] : [siteMetadata(), markdownMirror(), staticHost()]),
    ],
    // `preview` serves a shell per route, not a single-page app: an address with no file behind it is
    // the host's 404 rather than the root shell served under another route's name. `staticHost` above
    // is the other half — the trailing-slash redirect that makes the two agree. **Preview only**: the
    // dev server builds no shells, so the fallback to `index.html` is the only thing that serves a
    // route there at all.
    appType: isPreview ? 'mpa' : 'spa',
    // One port, and a failure rather than the next one free. Vite's default walks 5173 → 5174 → … on a
    // port already taken, which is silent: a second `npm run dev` looks like it worked, serves stale
    // code at an address nobody looked at, and outlives the session. Fourteen of them accumulated over
    // five days before anyone noticed. `preview` keeps its own 4173 but inherits `strictPort`.
    server: {
      port: 5173,
      strictPort: true,
    },
    // The registry blocks are the files a consumer installs, so they import the package by name. These
    // two map that name onto the sources, which is how `/registry` renders the very code it publishes
    // (the same pair is in `tsconfig.json`, which is what type-checks them). An array rather than an
    // object, because the longer prefix has to be tried first.
    resolve: {
      alias: [
        { find: /^@box-kite\/react\/components\//, replacement: `${join(import.meta.dirname, 'src/components')}/` },
        { find: /^@box-kite\/react$/, replacement: join(import.meta.dirname, 'src/box.ts') },
      ],
    },
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
