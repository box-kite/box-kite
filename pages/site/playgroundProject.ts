/**
 * The snippet as a project somebody can fork — a Vite app with the published package in its
 * `dependencies`, which is what makes "open in StackBlitz" a real answer rather than a link to a gist.
 *
 * StackBlitz's own SDK is a form POST with one field per file, so it is written out here instead: an SDK
 * for that would be a dependency on the docs site's critical path for something a `<form>` already does.
 */
import { version } from '../../package.json';
import { SNIPPET_SCOPE } from '../../scripts/snippetScope.mjs';
import { importedNames, isImportLine } from './playground';

export const STACKBLITZ_URL = 'https://stackblitz.com/run';

/** A name used in the snippet, as a word rather than as part of a longer one. */
function mentions(source: string, name: string): boolean {
  return new RegExp(`\\b${name}\\b`).test(source);
}

/**
 * The imports the project needs: one statement per module, naming only what the snippet reaches for.
 * The snippet's own imports are already in its text, so a name it declared for itself is skipped.
 */
function importsFor(source: string, body: string): string[] {
  const own = new Set(importedNames(source));
  const byModule = new Map<string, { names: string[]; namespace: string | null; fallback: string | null }>();

  for (const [name, entry] of Object.entries(SNIPPET_SCOPE)) {
    if (own.has(name) || !mentions(body, name)) continue;

    const module = byModule.get(entry.from) ?? { names: [], namespace: null, fallback: null };

    if (entry.export === '*') module.namespace = name;
    else if (entry.export === 'default') module.fallback = name;
    else module.names.push(entry.export === name ? name : `${entry.export} as ${name}`);

    byModule.set(entry.from, module);
  }

  return [...byModule].map(([from, { names, namespace, fallback }]) => {
    const clauses = [namespace && `* as ${namespace}`, fallback, names.length ? `{ ${names.join(', ')} }` : null].filter(Boolean);

    return `import ${clauses.join(', ')} from '${from}';`;
  });
}

/** The files StackBlitz is handed, keyed by path — `project[files][<path>]` in the form it posts. */
export function stackblitzFiles(source: string, body: string): Record<string, string> {
  const kept = source.split('\n').filter(isImportLine);
  const app = [...importsFor(source, body), ...kept, '', 'export default function App() {', body.replace(/^/gm, '  '), '}', ''].join('\n');

  return {
    'index.html':
      '<!doctype html>\n<html>\n  <body>\n    <div id="root"></div>\n    <script type="module" src="/src/main.tsx"></script>\n  </body>\n</html>\n',
    'src/main.tsx': [
      "import { createRoot } from 'react-dom/client';",
      "import App from './App';",
      '',
      "createRoot(document.getElementById('root')!).render(<App />);",
      '',
    ].join('\n'),
    'src/App.tsx': app,
    'vite.config.ts': [
      "import react from '@vitejs/plugin-react';",
      "import { defineConfig } from 'vite';",
      '',
      'export default defineConfig({ plugins: [react()] });',
      '',
    ].join('\n'),
    'package.json': `${JSON.stringify(
      {
        name: 'box-kite-playground',
        private: true,
        type: 'module',
        scripts: { dev: 'vite' },
        dependencies: { '@box-kite/react': `^${version}`, react: '^19.0.0', 'react-dom': '^19.0.0' },
        devDependencies: { '@vitejs/plugin-react': '^5.0.0', typescript: '^5.0.0', vite: '^7.0.0' },
      },
      null,
      2,
    )}\n`,
    'tsconfig.json': `${JSON.stringify(
      { compilerOptions: { target: 'ESNext', module: 'ESNext', moduleResolution: 'bundler', jsx: 'react-jsx', strict: true } },
      null,
      2,
    )}\n`,
  };
}

/** The whole form body StackBlitz reads, as name/value pairs. */
export function stackblitzForm(source: string, body: string): [string, string][] {
  return [
    ['project[title]', 'Box Kite playground'],
    ['project[description]', 'A snippet from box-kite.dev'],
    ['project[template]', 'node'],
    ...Object.entries(stackblitzFiles(source, body)).map(([path, content]): [string, string] => [`project[files][${path}]`, content]),
  ];
}
