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
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Window } from 'happy-dom';
import { build } from 'vite';
import { propsMarkdown } from './agent-docs.mjs';
import { deprecations, priorFacts } from './agentSources.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const CLIENT_OUT = join(ROOT, 'dist-pages');
const SSR_OUT = join(ROOT, 'dist-pages-ssr');
const ROOT_DIV = '<div id="root"></div>';

/** Every route's CSS is at least this many bytes — a shell that got less than a stylesheet is a failure. */
const MIN_STYLES = 2000;
/** Smaller than the frame alone: the page rendered nothing at all. */
const MIN_HTML = 20_000;
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
/** The generated reference and the index: each is a file an agent reads instead of the site. */
const MIN_PROPS = 50_000;
const MIN_LLMS = 2000;
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

const {
  renderRoute,
  prerenderPaths,
  NOT_FOUND_PATH,
  PRERENDERED_STYLE_ID,
  routes,
  releases,
  routeFor,
  elementMarkdown,
  markdownPath,
  pageMarkdown,
  buildLlmsTxt,
  buildLlmsFull,
} = await serverBundle();

const { name: packageName, version } = JSON.parse(await readFile(join(ROOT, 'package.json'), 'utf8'));

const shellFor = (path) => join(CLIENT_OUT, path === '/' ? '' : path.slice(1), 'index.html');

// One window for the whole pass: the conversion only ever reads a tree that was just parsed into it.
const window = new Window();

/**
 * The markdown a page's own markup produced. `<main>` is the root because everything outside it is
 * chrome — the sidebar's forty links would open every file. A release page is rendered *from*
 * markdown, so its mirror is the file it was written in rather than a round trip back out of HTML.
 */
function bodyMarkdown(path, html) {
  const release = releases.find((entry) => entry.path === path);

  if (release) return release.markdown;

  window.document.body.innerHTML = html;
  const main = window.document.querySelector('main');

  return main ? elementMarkdown(main) : '';
}

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
const pages = [];

for (const { path, file } of targets) {
  const shell = await readFile(file, 'utf8');
  const { html, styles } = await renderRoute(path);

  // Each of these has been silently true at some point in this file's life: a shell whose root div
  // was named differently, a page that rendered its frame and no content, a route whose CSS never
  // reached the sink. A prerender that quietly ships an empty page is worse than a failed build.
  if (!shell.includes(ROOT_DIV)) failures.push(`${file}: no ${ROOT_DIV} to fill`);
  const islands = html.split(CLIENT_ONLY_BOUNDARY).length - 1;
  const expected = CLIENT_ISLANDS[path] ?? 0;
  if (islands !== expected) failures.push(`${path}: ${islands} client-only boundaries, expected ${expected} — see CLIENT_ISLANDS`);
  if (html.length < MIN_HTML) failures.push(`${path}: ${html.length} bytes of HTML, expected at least ${MIN_HTML}`);
  if (styles.length < MIN_STYLES) failures.push(`${path}: ${styles.length} bytes of CSS, expected at least ${MIN_STYLES}`);

  const filled = shell
    // Function replacements: `$&` and `$'` are replacement patterns, and a docs page full of shell
    // snippets and CSS is exactly where those two characters turn up.
    .replace(ROOT_DIV, () => `<div id="root">${html}</div>`)
    // At the top of the head, which is where the engine puts its own element in the browser — so the
    // rules the first paint uses sit in the same place in the cascade as the ones that replace them.
    .replace('<head>', () => `<head><style id="${PRERENDERED_STYLE_ID}">${styles}</style>`);

  await writeFile(file, filled);

  // The 404 shell is a page nobody links to and no index lists, so it gets no markdown copy.
  const route = path === NOT_FOUND_PATH ? undefined : routeFor(path, routes);
  const markdown = route ? pageMarkdown({ route, body: bodyMarkdown(path, html), version }) : '';

  if (route) {
    if (markdown.length < MIN_MARKDOWN) failures.push(`${path}: ${markdown.length} bytes of markdown, expected at least ${MIN_MARKDOWN}`);

    await writeMarkdown(path, markdown);
    pages.push({ path, markdown });
  }

  rows.push({ route: path, html: html.length, css: styles.length, md: markdown.length, file: file.slice(dirname(CLIENT_OUT).length + 1) });
}

// The files an agent reads instead of the site: the index, the whole corpus behind it, and the prop
// reference — the same generator the tarball's `docs/props.md` uses, so the two cannot disagree.
const llmsInput = { packageName, version, routes, facts: priorFacts(), deprecated: deprecations() };
const generated = [
  ['llms.txt', buildLlmsTxt(llmsInput), MIN_LLMS],
  ['llms-full.txt', buildLlmsFull(pages, llmsInput), MIN_CORPUS],
  ['props.md', `${propsMarkdown().trimEnd()}\n`, MIN_PROPS],
];

for (const [file, content, floor] of generated) {
  if (content.length < floor) failures.push(`${file}: ${content.length} bytes, expected at least ${floor}`);

  await writeFile(join(CLIENT_OUT, file), content);
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
