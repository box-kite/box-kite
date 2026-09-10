// What an entry module actually reaches, by walking its imports. Three entries are checked and chunked
// by this walk: `src/core.ts`, which must reach no React at all (a directory rule would not do — the
// engine reaches `src/utils/**` and `src/types.ts`); `src/rsc.ts`, the Box a Server Component gets,
// where `react` exports no hooks to name; and `src/components/*.tsx`, split by whether they render on a
// server. The boundary checks and the chunk split share the walk, so they cannot disagree.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const root = join(import.meta.dirname, '..');

export const RSC_ENTRY = 'src/rsc.ts';

export const CORE_ENTRY = 'src/core.ts';

export const BOX_ENTRY = 'src/box.ts';

/** The package's own name — what the `../box` edge becomes in the built server-safe components. */
export const PACKAGE_NAME = '@box-kite/react';

/** The engine's package — what `src/core.ts` and `src/types.ts` become in this one's built output. */
export const CORE_PACKAGE = '@box-kite/core';

/**
 * The pre-built components a Server Component can render *on the server*: no hook, no effect, just props
 * forwarded to Box. Their chunks import the package by name rather than `../box.mjs`, so the
 * `react-server` condition applies and `<H1>` drags no client runtime in behind it.
 */
export const SERVER_SAFE_COMPONENTS = [
  'baseSvg',
  'button',
  'chart',
  'flex',
  'grid',
  'icon',
  'radioButton',
  'semantics',
  'svg',
  'textarea',
  'textbox',
  'visuallyHidden',
];

/**
 * The rest: they hold state, measure the DOM or portal into it. A Server Component may still import one —
 * their chunks carry a `'use client'` banner — but nothing here renders *on* the server.
 */
export const CLIENT_ONLY_COMPONENTS = [
  'checkbox',
  'dataGrid',
  'dialog',
  'dropdown',
  'form',
  'menu',
  'overlay',
  'popover',
  'presence',
  'radioGroup',
  'select',
  'switch',
  'tabs',
  'tooltip',
];

/**
 * Entries that are hooks all the way down. Same `'use client'` banner: importing `useDismiss` from a
 * Server Component should open a client boundary, not fail to resolve `useRef`.
 */
export const CLIENT_ONLY_ENTRIES = ['a11y', 'anchor'];

// Hooks and APIs React's server renderer has no dispatcher for. `useMemo`, `useCallback`, `useId`,
// `useDebugValue` and `use` are the ones it does support, so they are deliberately absent here.
export const CLIENT_APIS = [
  'useState',
  'useReducer',
  'useEffect',
  'useLayoutEffect',
  'useInsertionEffect',
  'useRef',
  'useImperativeHandle',
  'useContext',
  'useSyncExternalStore',
  'useTransition',
  'useDeferredValue',
  'useOptimistic',
  'useActionState',
  'useFormStatus',
  'createContext',
];

export const BANNED_SPECIFIER = /^(react-dom|use-sync-external-store)(\/|$)/;

const SPECIFIER = /(?:\bfrom|\bimport|\brequire)\s*\(?\s*['"]([^'"]+)['"]/g;

/** Comments stripped, and type-only imports with them: those are erased before anything runs. */
function stripped(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[\s;])\/\/[^\n]*/g, '$1')
    .replace(/\b(?:import|export)\s+type\s+[^;]*;/g, '');
}

/** The file a relative specifier points at, as a repo-relative POSIX path. */
function resolveSpecifier(fromFile, specifier) {
  const base = resolve(root, dirname(fromFile), specifier);
  const candidates = [base, `${base}.ts`, `${base}.tsx`, join(base, 'index.ts'), join(base, 'index.tsx')];
  const found = candidates.find((candidate) => existsSync(candidate) && statSync(candidate).isFile());

  return found ? relative(root, found).split(/[\\/]/).join('/') : null;
}

/**
 * Walk an entry's imports: every module it reaches (repo-relative, comment-free), the bare specifiers it
 * pulls in, and anything unresolved. `stopAt` names modules recorded as a package import instead of
 * descended into — the build turns those edges into specifiers, so beyond them is the consumer's to resolve.
 */
export function moduleGraph(entry, stopAt = new Set()) {
  const modules = new Map();
  const bare = [];
  const unresolved = [];
  const queue = [entry];

  while (queue.length) {
    const path = queue.shift();
    if (modules.has(path)) continue;

    const code = stripped(readFileSync(join(root, path), 'utf8'));
    modules.set(path, code);

    for (const [, specifier] of code.matchAll(SPECIFIER)) {
      if (!specifier.startsWith('.')) {
        bare.push({ path, specifier });
        continue;
      }

      const resolved = resolveSpecifier(path, specifier);
      if (resolved === null) unresolved.push({ path, specifier });
      else if (stopAt.has(resolved)) bare.push({ path, specifier: PACKAGE_NAME });
      else queue.push(resolved);
    }
  }

  return { modules, bare, unresolved };
}

/** The `react-server` entry's graph. */
export function rscGraph() {
  return moduleGraph(RSC_ENTRY);
}

/** The framework-free entry's graph. */
export function coreGraph() {
  return moduleGraph(CORE_ENTRY);
}

/** A component's graph, with the `../box` edge left to the export map. */
export function componentGraph(name) {
  return moduleGraph(`src/components/${name}.tsx`, new Set([BOX_ENTRY]));
}

/**
 * Every module that can end up in a server graph: the `react-server` entry's plus the server-safe
 * components'. Without it a module only a component reaches would be classified client, and
 * `semantics` would import a chunk naming `useState`.
 */
export function serverSafeModules() {
  const modules = new Set(rscGraph().modules.keys());

  for (const name of SERVER_SAFE_COMPONENTS) {
    for (const path of componentGraph(name).modules.keys()) modules.add(path);
  }

  return modules;
}

/**
 * The modules only **one** component entry reaches and no published entry reaches at all, so they belong
 * in that component's own chunk. Every shared group is imported by something everybody imports, so a
 * leaf landing in one is paid for by consumers who cannot reach it (`chartUtils` cost `box.mjs`,
 * `rsc.mjs` and the DataGrid ~0.9 KB gz each). A rule, because the trap has caught three features.
 */
export function componentPrivateModules() {
  const published = new Set([
    ...moduleGraph(BOX_ENTRY).modules.keys(),
    ...moduleGraph(RSC_ENTRY).modules.keys(),
    ...moduleGraph(CORE_ENTRY).modules.keys(),
    ...moduleGraph('src/ssg.ts').modules.keys(),
    ...moduleGraph('src/a11y.ts').modules.keys(),
    ...moduleGraph('src/anchor.ts').modules.keys(),
  ]);

  const reachedBy = new Map();

  for (const name of componentEntries()) {
    for (const path of componentGraph(name).modules.keys()) {
      // A component's own file is already its own chunk; only its private leaves are in question.
      if (path.startsWith('src/components/')) continue;

      reachedBy.set(path, (reachedBy.get(path) ?? 0) + 1);
    }
  }

  return new Set([...reachedBy].filter(([path, count]) => count === 1 && !published.has(path)).map(([path]) => path));
}

/** The component entries the build publishes, read from disk, so a new one cannot go unclassified. */
export function componentEntries() {
  return readdirSync(join(root, 'src/components'))
    .filter((fileName) => fileName.endsWith('.tsx') && !fileName.includes('.test.'))
    .map((fileName) => fileName.replace(/\.tsx$/, ''));
}
