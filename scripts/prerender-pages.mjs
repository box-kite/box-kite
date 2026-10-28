/**
 * Fills the shells the site build writes with the HTML and CSS of each route, and writes the markdown
 * copy of each one beside it.
 *
 * `pages.vite.config.ts` emits one shell per route carrying that route's metadata and an empty
 * `<div id="root">`; this pass renders the same tree the browser mounts into it, so `view-source` on
 * any address shows the page. It runs on the library's own SSG API — `getStyles()` over the string
 * sink — which makes the docs site the reference implementation for it.
 *
 * The same render answers the second question (AI2): an agent fetching documentation wants markdown,
 * not a JavaScript bundle, so every page is converted from its own markup into `<route>.md` and
 * indexed in `llms.txt`. Converted rather than written twice — a mirror that can fall behind the page
 * is worse than no mirror, because it is the copy the agent trusts.
 */
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Window } from 'happy-dom';
import { build } from 'vite';
import { siteMarkdown } from './siteMarkdown.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const CLIENT_OUT = join(ROOT, 'dist-pages');
const SSR_OUT = join(ROOT, 'dist-pages-ssr');
const ROOT_DIV = '<div id="root"></div>';

/** Every route's CSS is at least this many bytes — a shell that got less than a stylesheet is a failure. */
const MIN_STYLES = 2000;
/** Smaller than the frame alone: the page rendered nothing at all. */
const MIN_HTML = 20_000;
/** A template's demo has no frame around it, so its floor is a page of content rather than the chrome. */
const MIN_BARE_HTML = 2000;
/**
 * The thinnest page here is /textarea at about 300 bytes of markdown — two snippets and a sentence.
 * Below this the conversion found no content, which is what a renamed landmark or a lost hint looks
 * like: the HTML floor above would still pass, because the page itself rendered.
 */
const MIN_MARKDOWN = 250;
/**
 * And `llms-full.txt`, which is every page's markdown in one file — so a conversion that quietly
 * degraded across most of the site fails even where each page still clears its own floor.
 */
const MIN_CORPUS = 150_000;
/**
 * The search index, which is the whole site's prose: below this the conversion found nothing on most
 * of the pages, which a search box would report as a site with nothing in it.
 */
const MIN_SEARCH = 250_000;
/** The generated reference and the index: each is a file an agent reads instead of the site. */
const MIN_PROPS = 50_000;
const MIN_LLMS = 2000;
/** The skill and the Cursor rule are the rules plus a page of navigation — half of that is a failure. */
const MIN_SKILL = 8000;
/**
 * The registry catalog is three items with their descriptions; an item is a block's whole source inlined.
 * A registry item with empty `content` is valid JSON that installs nothing, which is what these catch.
 */
const MIN_REGISTRY = 1200;
const MIN_REGISTRY_ITEM = 2000;
/**
 * React's marker for a Suspense boundary whose content did not survive the server: it either threw or
 * suspended, and the browser has to render it. The HTML then ships the frame with a hole in it — which
 * is what an unguarded `window` did to three pages (bug #85) with nothing on stderr to say so.
 */
const CLIENT_ONLY_BOUNDARY = '<!--$!-->';

/**
 * Holes each route is allowed, and why. A ledger rather than a threshold, so it fails both ways: a new
 * hole is a page that quietly stopped prerendering, and a hole that closed is a line to delete here.
 */
const CLIENT_ISLANDS = {
  // The Recharts demo is `React.lazy` on purpose (SV7): 93 KB gz that only this page pays for, and a
  // chart that measures its container has nothing to draw without one.
  '/charts': 1,
};

/**
 * Audit findings a route is allowed (`pages/site/pageAudit.ts`), by the start of the finding's text. A ledger
 * for the same reason as the one above: a finding that stops firing is a line to delete here.
 */
const AUDIT_EXCEPTIONS = {
  // The article's published headline, already cross-posted under it: shortening it is the author's call (bug #262).
  '/blog/styling-server-components': ['the title is 62 characters'],
};

/** HTML floors below the usual ones, and why: a route whose content is only knowable in the browser. */
const HTML_FLOORS = {
  // Who is signed in lives in the browser, so the server renders the card that says it is checking.
  '/admin': 500,
};

async function serverBundle() {
  await build({
    configFile: join(ROOT, 'pages.vite.config.ts'),
    root: join(ROOT, 'pages'),
    mode: 'production',
    logLevel: 'warn',
    build: {
      ssr: 'entry-server.tsx',
      outDir: SSR_OUT,
      emptyOutDir: true,
      // `.mjs` so Node loads the bundle as ESM whatever the nearest package.json says.
      rollupOptions: { output: { entryFileNames: '[name].mjs' } },
    },
  });

  return import(pathToFileURL(join(SSR_OUT, 'entry-server.mjs')).href);
}

const bundle = await serverBundle();
const {
  renderRoute,
  prerenderPaths,
  NOT_FOUND_PATH,
  routes,
  routeFor,
  pageMeta,
  notFoundMeta,
  auditPage,
  markdownPath,
  SEARCH_INDEX_PATH,
  MOVED_ROUTES,
  buildRedirectHtml,
  buildRedirectMarkdown,
} = bundle;

// The same builder the dev server serves from, so the two can only ever produce the same files.
const mirror = siteMarkdown(bundle);

const shellFor = (path) => join(CLIENT_OUT, path === '/' ? '' : path.slice(1), 'index.html');

/**
 * Both addresses a page's markdown answers on: `/box.md`, which is the append-`.md` convention every
 * agent tries first, and `/box/index.md`, which is what appending it to the canonical trailing-slash
 * form asks for.
 */
async function writeMarkdown(path, markdown) {
  const appended = join(CLIENT_OUT, markdownPath(path).slice(1));
  const inDirectory = join(CLIENT_OUT, path === '/' ? '' : path.slice(1), 'index.md');

  // The home page's two forms are the same file.
  for (const file of new Set([appended, inDirectory])) {
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, markdown);
  }
}

const targets = [
  ...prerenderPaths.map((path) => ({ path, file: shellFor(path) })),
  { path: NOT_FOUND_PATH, file: join(CLIENT_OUT, '404.html') },
];

const failures = [];
const rows = [];
// Every page's site-relative links, resolved once every file the build writes is on disk.
const linksByPage = new Map();
const auditWindow = new Window();
const pages = [];
const searchPages = [];

for (const { path, file } of targets) {
  const shell = await readFile(file, 'utf8');
  const { html, styles, styleTag } = await renderRoute(path);
  // The 404 shell is a page nobody links to and no index lists, so it gets no markdown copy.
  const route = path === NOT_FOUND_PATH ? undefined : routeFor(path, routes);

  // Each of these has been silently true at some point in this file's life: a shell whose root div
  // was named differently, a page that rendered its frame and no content, a route whose CSS never
  // reached the sink. A prerender that quietly ships an empty page is worse than a failed build.
  if (!shell.includes(ROOT_DIV)) failures.push(`${file}: no ${ROOT_DIV} to fill`);
  const islands = html.split(CLIENT_ONLY_BOUNDARY).length - 1;
  const expected = CLIENT_ISLANDS[path] ?? 0;
  if (islands !== expected) failures.push(`${path}: ${islands} client-only boundaries, expected ${expected} — see CLIENT_ISLANDS`);
  const minHtml = HTML_FLOORS[path] ?? (route?.chrome === 'bare' ? MIN_BARE_HTML : MIN_HTML);
  if (html.length < minHtml) failures.push(`${path}: ${html.length} bytes of HTML, expected at least ${minHtml}`);

  auditWindow.document.body.innerHTML = html;
  const audit = auditPage(auditWindow.document.body, route ? pageMeta(route, routes) : notFoundMeta);
  const allowed = AUDIT_EXCEPTIONS[path] ?? [];
  failures.push(
    ...audit.problems.filter((problem) => !allowed.some((start) => problem.startsWith(start))).map((problem) => `${path}: ${problem}`),
  );
  for (const start of allowed.filter((start) => !audit.problems.some((problem) => problem.startsWith(start)))) {
    failures.push(`${path}: "${start}" no longer fires — delete it from AUDIT_EXCEPTIONS`);
  }
  linksByPage.set(path, audit.links);
  if (styles.length < MIN_STYLES) failures.push(`${path}: ${styles.length} bytes of CSS, expected at least ${MIN_STYLES}`);
  // Without the manifest the browser rebuilds every rule during hydration (bug #203), and nothing else would say so.
  if (!styleTag.includes(' data-box-kite="')) failures.push(`${path}: the style tag carries no adoption manifest`);

  const filled = shell
    // Function replacements: `$&` and `$'` are replacement patterns, and a docs page full of shell
    // snippets and CSS is exactly where those two characters turn up.
    .replace(ROOT_DIV, () => `<div id="root">${html}</div>`)
    // At the top of the head, which is where the engine puts its own element — the browser adopts this one.
    .replace('<head>', () => `<head>${styleTag}`);

  await writeFile(file, filled);

  const markdown = route && route.indexable !== false ? mirror.pageFrom(route, html) : '';

  // A demo is its page with no words around it, so neither the mirror nor search should offer it.
  if (route && route.indexable !== false) {
    if (markdown.length < MIN_MARKDOWN) failures.push(`${path}: ${markdown.length} bytes of markdown, expected at least ${MIN_MARKDOWN}`);

    await writeMarkdown(path, markdown);
    pages.push({ path, markdown });
    searchPages.push(mirror.searchFrom(route, html));
  }

  rows.push({ route: path, html: html.length, css: styles.length, md: markdown.length, file: file.slice(dirname(CLIENT_OUT).length + 1) });
}

// A page that moved keeps its old address as a redirect, its markdown copy included.
for (const [from, to] of Object.entries(MOVED_ROUTES)) {
  if (routeFor(from, routes)) failures.push(`${from}: moved to ${to}, but a route still serves it`);

  await mkdir(dirname(shellFor(from)), { recursive: true });
  await writeFile(shellFor(from), buildRedirectHtml(to));
  await writeMarkdown(from, buildRedirectMarkdown(to));
}

// The files an agent reads instead of the site: the index, the whole corpus behind it, and the prop
// reference — the same generator the tarball's `docs/props.md` uses, so the two cannot disagree.
const generated = [
  ['llms.txt', mirror.llms(), MIN_LLMS],
  ['llms-full.txt', mirror.llmsFull(pages), MIN_CORPUS],
  ['props.md', mirror.props(), MIN_PROPS],
  // Docs search (G5): one file, fetched the first time somebody opens the dialog.
  [SEARCH_INDEX_PATH.slice(1), mirror.search(searchPages), MIN_SEARCH],
  // The two the repository also commits, so an agent with a URL and no CLI gets the same bytes (AI3).
  ['skill.md', await mirror.skill(), MIN_SKILL],
  ['box-kite.mdc', await mirror.cursor(), MIN_SKILL],
];

for (const [file, content, floor] of generated) {
  if (content.length < floor) failures.push(`${file}: ${content.length} bytes, expected at least ${floor}`);

  await writeFile(join(CLIENT_OUT, file), content);
}

// The shadcn registry (F4): the catalog and one file per block, each carrying its sources inlined. The
// floor is what says the inlining happened — an item whose files came back empty is still valid JSON.
for (const { path, content } of mirror.registry()) {
  const floor = path.endsWith('registry.json') ? MIN_REGISTRY : MIN_REGISTRY_ITEM;

  if (content.length < floor) failures.push(`${path}: ${content.length} bytes, expected at least ${floor}`);

  const file = join(CLIENT_OUT, path.slice(1));

  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, content);
}

// A link resolves to a route, an address that moved, or a file the build wrote — checked last, once they all exist.
const served = (link) => routeFor(link, routes) || link in MOVED_ROUTES || existsSync(join(CLIENT_OUT, link.slice(1)));

for (const [path, links] of linksByPage) {
  for (const link of links.filter((candidate) => !served(candidate))) failures.push(`${path}: links to ${link}, which nothing serves`);
}

const corpus = pages.reduce((total, page) => total + page.markdown.length, 0);

const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;

for (const row of rows) {
  console.log(
    `  ${row.route.padEnd(20)} ${kb(row.html).padStart(10)} html  ${kb(row.css).padStart(10)} css  ${kb(row.md).padStart(10)} md  ${row.file}`,
  );
}
console.log(`\nPrerendered ${rows.length} pages, ${pages.length} of them mirrored as markdown (${kb(corpus)} in llms-full.txt).`);

if (failures.length > 0) {
  console.error(`\nPrerender failed:\n${failures.map((failure) => `  - ${failure}`).join('\n')}`);
  process.exit(1);
}
