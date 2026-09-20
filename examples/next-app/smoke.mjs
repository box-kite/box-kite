// The smoke test this example exists for: start the production server, fetch the page, and assert
// on the HTML that a real Next.js server build did what the library claims.
//
// Everything checked here is invisible to a unit test. Vitest renders with the client React, so it
// cannot prove that the `react-server` condition resolved, that Next hoisted the style elements
// into `<head>`, or that a Suspense boundary's CSS arrives with the chunk that needs it.
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = import.meta.dirname;
const port = Number(process.env.PORT ?? 3010);
const url = `http://127.0.0.1:${port}/`;
const componentsUrl = `${url}components`;
const iconsUrl = `${url}icons`;
const generativeUrl = `${url}generative`;
const generateApi = `${url}api/generative`;
const agentUrl = `${url}agent`;
const agentApi = `${url}api/agent`;

// A key here would make the route call the model for real, which a smoke test has no business doing:
// what it checks is the wiring, and the wiring is what answers when there is nothing to call.
const hasKey = Boolean(process.env.ANTHROPIC_API_KEY);

const results = [];

function check(name, ok, detail) {
  results.push({ name, ok, detail });
}

/** The class names Box generated, from every `class` attribute in the document. */
function generatedClasses(html) {
  const classes = new Set();

  for (const [, list] of html.matchAll(/class="([^"]*)"/g)) {
    // Content-hashed names are the element-mode default and all of them start with an underscore,
    // which is also how the app's own `dark` class stays out of this.
    for (const name of list.split(/\s+/)) if (name.startsWith('_')) classes.add(name);
  }

  return [...classes];
}

/** Whether the CSS carries a selector for this class — bare, or qualified by a state or a theme. */
function hasRuleFor(css, className) {
  return new RegExp(`\\.${className}(?![\\w-])`).test(css);
}

/** The CSS of every `<style>` element in the response, hoisted or streamed, concatenated. */
function styleText(html) {
  return [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(([, css]) => css).join('\n');
}

/**
 * The rules React was handed, by href. It renders one `<style>` element per precedence group and
 * lists the hrefs it merged into that element in `data-href`, so the element count says nothing
 * about how many rules there are — this does.
 */
function ruleHrefs(html) {
  const hrefs = new Set();

  for (const [, list] of html.matchAll(/data-href="([^"]*)"/g)) {
    for (const href of list.split(/\s+/)) if (href.startsWith('rb-') && !href.startsWith('rb-base-')) hrefs.add(href);
  }

  return [...hrefs];
}

async function waitForServer(child) {
  const deadline = Date.now() + 90_000;

  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`next start exited with code ${child.exitCode}`);

    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Not listening yet.
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`the server did not answer on ${url} within 90s`);
}

function stop(child) {
  // Next starts workers, so on Windows the whole process tree has to go, not just the parent.
  if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' });
  else child.kill('SIGTERM');
}

// 1. The claim that needs no server: the pages this app renders are Server Components. Only a
//    directive at the top of a file counts — two of them also *talk* about the directive.
const serverFiles = ['app/layout.tsx', 'app/page.tsx', 'app/streamedSection.tsx', 'app/components/page.tsx', 'app/icons/page.tsx'];
const clientDirectives = serverFiles.filter((file) => /^\s*(['"])use client\1/.test(readFileSync(join(root, file), 'utf8')));

check(
  "the rendered pages carry no 'use client'",
  clientDirectives.length === 0,
  clientDirectives.length ? `found the directive in ${clientDirectives.join(', ')}` : `${serverFiles.length} files checked`,
);

const server = spawn(process.execPath, [join(root, 'node_modules', 'next', 'dist', 'bin', 'next'), 'start', '--port', String(port)], {
  cwd: root,
  stdio: ['ignore', 'pipe', 'pipe'],
});

let serverLog = '';
server.stdout.on('data', (chunk) => (serverLog += chunk));
server.stderr.on('data', (chunk) => (serverLog += chunk));

let html = '';
let componentsHtml = '';
let iconsHtml = '';
let generativeHtml = '';
let agentHtml = '';
let generateAnswer = { status: 0, body: '' };
let agentAnswer = { status: 0, body: '' };

try {
  await waitForServer(server);
  html = await (await fetch(url)).text();
  componentsHtml = await (await fetch(componentsUrl)).text();
  iconsHtml = await (await fetch(iconsUrl)).text();
  generativeHtml = await (await fetch(generativeUrl)).text();
  agentHtml = await (await fetch(agentUrl)).text();

  if (!hasKey) {
    const answer = await fetch(generateApi, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt: 'Show me how sales are going.' }),
    });

    generateAnswer = { status: answer.status, body: await answer.text() };

    const turn = await fetch(agentApi, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ messages: [{ id: 'u1', role: 'user', parts: [{ type: 'text', text: 'Refund order 4182.' }] }] }),
    });

    agentAnswer = { status: turn.status, body: await turn.text() };
  }
} catch (error) {
  stop(server);
  console.error(`\n✖ ${error.message}\n`);
  console.error(serverLog.trim());
  process.exit(1);
}

stop(server);

const head = html.slice(0, html.indexOf('</head>'));
const css = styleText(html);
const classes = generatedClasses(html);
const hrefs = ruleHrefs(html);
const layerOrder = (head.match(/@layer rb[\w,]*;/) ?? [''])[0];

// 2. The base element — the reset, `:root`, and the cascade-layer order — reached the head first.
check('the base style element is hoisted into <head>', head.includes('data-precedence="rb-base"'), 'data-precedence="rb-base"');

// 3. The cascade here is layer order, not element order, so the order statement has to be in the
//    document up front. Without it React's hoisting order would decide whether `p` or `px` wins.
check('the cascade-layer order is declared up front', layerOrder !== '', `${layerOrder.split(',').length} layers, declared in <head>`);

// 4. Rules travel as elements addressed by content hash — that is what lets React dedupe them.
check(
  'generated rules ship as hoisted <style> elements',
  hrefs.length >= 40,
  `${hrefs.length} rules, in the ${(html.match(/data-precedence="rb"/g) ?? []).length} elements React merged them into`,
);

// 5. The whole point: no class in the markup is waiting for a client runtime to define it.
const missing = classes.filter((name) => !hasRuleFor(css, name));

check(
  'every class in the markup has its rule in the response',
  missing.length === 0,
  missing.length ? `missing: ${missing.join(', ')}` : `${classes.length} classes, all covered`,
);

// 6. Class names are content-hashed rather than counted, which is what makes the name the server
//    process resolved the same name the browser bundle resolves — nothing to mismatch on hydration.
const counted = classes.filter((name) => !/^_[0-9a-z]+$/.test(name));

check(
  'class names are content-hashed, not counted',
  counted.length === 0,
  counted.length ? `not a content hash: ${counted.join(', ')}` : `${classes.length} names of the form _<hash>`,
);

// 7. Streaming: the fallback and the resolved section are in one response, and so is the CSS the
//    resolved section introduced (`emerald-500`, which the shell never uses).
const streamed =
  html.includes('Streaming the slow section') && html.includes('Streamed after a 700ms await') && css.includes('var(--emerald-500)');

check('a Suspense boundary streams its markup and its CSS', streamed, 'the fallback, the late markup and the late rule are all present');

// A colour first used in the streamed chunk needs its `:root` declaration as well, which means the
// base element has to reach the document again carrying the variable the late rule refers to.
check('a variable first used in the streamed chunk reaches :root', css.includes('--emerald-500:'), '--emerald-500 is declared');

// 8. A client island in the middle of it all, its CSS in the HTML because it uses the same sink.
const button = html.match(/<button[^>]*class="([^"]*)"/);
const islandClasses = (button?.[1] ?? '').split(/\s+/).filter((name) => name.startsWith('_'));
const islandCovered = islandClasses.length > 0 && islandClasses.every((name) => hasRuleFor(css, name));

check("a client island's CSS is server-rendered too", islandCovered, `${islandClasses.length} classes on its <button>, all covered`);

// 9. Theming with no provider: the server wrote the theme name on `<html>`, and the rules it
//    selects are scoped to that theme's own subtree, so they are in the same payload as everything
//    else — `data-theme` beside the class is what would end them at a theme nested inside it.
check(
  'the server-rendered theme class selects real rules',
  /<html[^>]*class="dark"/.test(html) && /@scope \(\.dark\) to \(\[data-theme\]\)\{:scope \._/.test(css),
  'class="dark" on <html>, with `@scope (.dark) to ([data-theme]){:scope ._…` rules in the CSS',
);

// 10. The second page: the pre-built components, imported by a Server Component. Before the
//     `exports` map reached them their chunks imported `../box.mjs` relatively, which handed the
//     server graph the *client* Box and failed the build with `createContext is not a function`.
//     So the first thing worth asserting is simply that the route rendered at all.
const componentsCss = styleText(componentsHtml);
const componentsClasses = generatedClasses(componentsHtml);

check(
  'a Server Component renders the pre-built components',
  componentsHtml.includes('Server-rendered components') && componentsClasses.length > 0,
  `${componentsClasses.length} generated classes in the response`,
);

// 11. And that they went down the same path Box did: their CSS is in the HTML, not waiting for a
//     client runtime. That is what the package-name import buys — `Flex` resolved the same
//     hook-free Box the page did, rather than a client one it would have had to hydrate.
const serverRendered = [
  ['Flex', /<div[^>]*class="([^"]*)"/],
  ['Textbox', /<input[^>]*type="email"[^>]*class="([^"]*)"/],
  ['Button', /<button[^>]*type="submit"[^>]*class="([^"]*)"/],
  ['a semantic tag', /<h2[^>]*class="([^"]*)"/],
];

const unstyled = serverRendered.filter(([, pattern]) => {
  const names = (componentsHtml.match(pattern)?.[1] ?? '').split(/\s+/).filter((name) => name.startsWith('_'));

  return names.length === 0 || !names.every((name) => hasRuleFor(componentsCss, name));
});

check(
  'their markup and their CSS are both server-rendered',
  unstyled.length === 0,
  unstyled.length ? `no rules for: ${unstyled.map(([name]) => name).join(', ')}` : `${serverRendered.length} components checked`,
);

// 12. The other half of the fix: a component that genuinely needs a client runtime carries a
//     `'use client'` banner, so importing it from a Server Component opens a boundary instead of
//     compiling `useRef` into the server graph. Its markup is server-rendered like any client
//     component's; its rules arrive with the client bundle, which is why they are not asserted.
check(
  'a client-only component can be imported by a Server Component',
  /<input[^>]*type="checkbox"/.test(componentsHtml),
  'Checkbox rendered from a page with no directive of its own',
);

// 13. The third page: `Icon` puts the engine's class on an icon it did not render. An inline
//     `<svg>` is markup like any other, so the whole thing — the icon, the class, the name — is in
//     the response, and the sizing that beats the icon's own width/height attributes is a rule.
const iconsCss = styleText(iconsHtml);
const iconSvg = iconsHtml.match(/<svg[^>]*class="([^"]*)"[^>]*>/);
const iconClasses = (iconSvg?.[1] ?? '').split(/\s+/).filter((name) => name.startsWith('_'));

check(
  'an inline icon is server-rendered, class and all',
  iconClasses.length > 0 && iconClasses.every((name) => hasRuleFor(iconsCss, name)) && /role="img"/.test(iconsHtml),
  `${iconClasses.length} classes on its <svg>, all covered, named with role="img"`,
);

// 14. The other icon source on that page looks its icon up over the network, in the browser, so
//     the server sends none — the tradeoff the /icon docs page documents. The rules are still
//     generated (`Icon` resolved them during the server render); it is the element that is absent,
//     which is why an icon that has to be in the HTML cannot come from a runtime bridge.
const svgCount = (iconsHtml.match(/<svg/g) ?? []).length;

check(
  'a runtime icon source sends no icon from the server',
  svgCount === 1 && iconsCss.includes('--emerald-600'),
  `${svgCount} <svg> in the response, though the runtime icon's own rule was generated`,
);

// 15. The fourth page: the generative-UI loop. It is a client page — what it proves here is that the
//     catalog, the registry and `<SpecRenderer>` survive a real Next build, with their CSS in the HTML
//     like any other island's.
const generativeCss = styleText(generativeHtml);
const generativeClasses = generatedClasses(generativeHtml);

check(
  'the generative-UI page renders, with its CSS in the response',
  generativeHtml.includes('Ask for a dashboard') &&
    generativeClasses.length > 0 &&
    generativeClasses.every((name) => hasRuleFor(generativeCss, name)),
  `${generativeClasses.length} generated classes, all covered`,
);

// 16. And the route behind it is wired: with no API key it answers rather than crashing, which is what
//     keeps this example buildable and testable by anyone who has not got one.
check(
  'the model route answers without an API key',
  hasKey || (generateAnswer.status === 503 && generateAnswer.body.includes('ANTHROPIC_API_KEY')),
  hasKey ? 'skipped: a key is set, and a smoke test must not spend it' : `${generateAnswer.status}, saying which variable is missing`,
);

// 17. The fifth page: the tool loop, drawn out of `components/agent`. Same proof as the generative one —
//     the cards survive a real Next build with their CSS in the HTML — plus the route behind them.
const agentCss = styleText(agentHtml);
const agentClasses = generatedClasses(agentHtml);

check(
  'the agent page renders, with its CSS in the response',
  agentHtml.includes('A tool loop, in components') && agentClasses.length > 0 && agentClasses.every((name) => hasRuleFor(agentCss, name)),
  `${agentClasses.length} generated classes, all covered`,
);

check(
  'the agent route answers without an API key',
  hasKey || (agentAnswer.status === 503 && agentAnswer.body.includes('ANTHROPIC_API_KEY')),
  hasKey ? 'skipped: a key is set, and a smoke test must not spend it' : `${agentAnswer.status}, saying which variable is missing`,
);

const failed = results.filter((result) => !result.ok);

console.log(`\nBox in a Server Component — smoke test (${url})\n`);
for (const { name, ok, detail } of results) console.log(`  ${ok ? '✔' : '✖'} ${name}\n      ${detail}`);
console.log('');

if (failed.length) {
  console.error(`✖ ${failed.length} of ${results.length} checks failed\n`);
  process.exit(1);
}

console.log(`✔ all ${results.length} checks passed\n`);
