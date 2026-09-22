import { ArrowRight, Compass, Download, Heart, Search, Star, Sun, Trash2 } from 'lucide-react';
import { SNIPPET_SCOPE } from '../../scripts/snippetScope.mjs';
import { SNIPPET_ICONS } from './playground';

/**
 * The values a playground snippet is evaluated with — the same names `scripts/check-docs-snippets.mjs`
 * compiles a snippet against, resolved to modules instead of to import statements. One source for both
 * (`scripts/snippetScope.mjs`), because a name only the checker knows about is a snippet that passes CI
 * and throws `is not defined` the moment a reader opens it.
 *
 * Everything here is loaded on demand: the playground is one route, and the compiler plus every component
 * the library ships has no business in the chunk a reader of `/installation` downloads.
 */

/** One loader per published specifier the scope names. A component entry is resolved through the glob below. */
const entries: Record<string, () => Promise<Record<string, unknown>>> = {
  react: () => import('react'),
  'react-dom': () => import('react-dom'),
  '@box-kite/react': () => import('../../src/box'),
  '@box-kite/core': () => import('../../src/core'),
  '@box-kite/react/anchor': () => import('../../src/anchor'),
  '@box-kite/react/catalog': () => import('../../src/catalog'),
  '@box-kite/react/interop': () => import('../../src/interop'),
  '@box-kite/react/spec': () => import('../../src/spec'),
};

/** Every component module, by file. `@box-kite/react/components/x` is `src/components/x.tsx`. */
const componentModules = import.meta.glob<Record<string, unknown>>('../../src/components/*.tsx');

const COMPONENT_PREFIX = '@box-kite/react/components/';

function loaderFor(specifier: string): (() => Promise<Record<string, unknown>>) | undefined {
  if (!specifier.startsWith(COMPONENT_PREFIX)) return entries[specifier];

  return componentModules[`../../src/components/${specifier.slice(COMPONENT_PREFIX.length)}.tsx`];
}

/** Which specifiers the scope has to load, deduplicated — several names share one module. */
export function scopeSpecifiers(): string[] {
  return [...new Set(Object.values(SNIPPET_SCOPE).map((entry) => entry.from))];
}

/**
 * A specifier the record names and this file cannot load. Exported for the test rather than thrown at a
 * reader: the two lists are edited in different files, and a silent `undefined` in the scope is a name
 * that resolves to nothing and fails as `X is not a function` somewhere inside React.
 */
export function unresolvableSpecifiers(): string[] {
  return scopeSpecifiers().filter((specifier) => !loaderFor(specifier));
}

/**
 * The icons a snippet may write, named one by one. `import * as lucide` looks tidier and costs the whole
 * set: the barrel defeats tree-shaking, Vite gives it a chunk of its own, and because the chunk is shared
 * every page on the site pays for it — 159 KB gzipped, measured. The test pins these keys to the list.
 */
const icons: Record<(typeof SNIPPET_ICONS)[number], unknown> = { ArrowRight, Compass, Download, Heart, Search, Star, Sun, Trash2 };

export interface PlaygroundScope {
  /** Name to value, ready to be the parameters of the compiled function. */
  values: Record<string, unknown>;
  /** JSX and TypeScript out of a snippet, the compiler kept out of every other route's chunk. */
  transform: (tsx: string) => string;
}

export default async function loadPlaygroundScope(): Promise<PlaygroundScope> {
  const specifiers = scopeSpecifiers();
  const [sucrase, ...modules] = await Promise.all([
    import('sucrase'),
    ...specifiers.map((specifier) => loaderFor(specifier)?.() ?? Promise.resolve({})),
  ]);

  const loaded = new Map(specifiers.map((specifier, index) => [specifier, modules[index]]));
  // Icons are somebody else's components, so they are not in the shared record — the checker would stop
  // asking a snippet to show the import a reader copying it needs.
  const values: Record<string, unknown> = { ...icons };

  for (const [name, entry] of Object.entries(SNIPPET_SCOPE)) {
    const module: Record<string, unknown> = loaded.get(entry.from) ?? {};

    values[name] = entry.export === '*' ? module : module[entry.export];
  }

  return {
    values,
    transform: (tsx) => sucrase.transform(tsx, { transforms: ['jsx', 'typescript'], production: true }).code,
  };
}

/** The icon names the scope can hand a snippet — pinned against `SNIPPET_ICONS` by the test. */
export function iconNames(): string[] {
  return Object.keys(icons);
}
