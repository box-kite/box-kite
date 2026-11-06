// Fails the build if anything under src/core — or its entry, src/core.ts — reaches for React. That
// directory is the future `@box-kite/core`: usable with no framework at all, so one `import 'react'` is a
// regression rather than a style nit. ESLint's `no-restricted-imports` covers the common case; this
// exists because it sees no `require()`, dynamic `import()`, JSX, or React global namespace (`React.JSX.*`
// needs no import, which is how `ExtractElementFromTag` hid in coreTypes.ts until CO5).
//
// Run: npm run check:boundaries
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { BANNED_SPECIFIER as REACT_PACKAGE, CORE_ENTRY, coreGraph } from './moduleGraph.mjs';

const root = join(import.meta.dirname, '..');
const CORE = 'src/core';

const BANNED_SPECIFIER = /^(react|react-dom|use-sync-external-store)(\/|$)/;
const SPECIFIER = /(?:\bfrom|\bimport|\brequire)\s*\(?\s*['"]([^'"]+)['"]/g;
const REACT_GLOBAL = /\bReact\s*\./;

/** Every file under `dir`, as a repo-relative POSIX path. */
function walk(dir) {
  const out = [];

  for (const name of readdirSync(join(root, dir))) {
    const path = `${dir}/${name}`;

    if (statSync(join(root, path)).isDirectory()) out.push(...walk(path));
    else out.push(path);
  }

  return out;
}

/** Comments stripped, so prose may mention React.createElement without failing the check. */
function stripComments(source) {
  return (
    source
      .replace(/\/\*[\s\S]*?\*\//g, '')
      // Trailing comments too — but not the '//' inside a URL: truncating a string there could
      // hide a real import sitting after it on the same line.
      .replace(/(^|[\s;])\/\/[^\n]*/g, '$1')
  );
}

function checkFile(path) {
  const violations = [];

  if (/\.(tsx|jsx)$/.test(path)) {
    violations.push(`${path}: JSX file under ${CORE} — a framework-free module cannot render`);
  }

  const code = stripComments(readFileSync(join(root, path), 'utf8'));

  for (const [, specifier] of code.matchAll(SPECIFIER)) {
    if (BANNED_SPECIFIER.test(specifier)) violations.push(`${path}: imports '${specifier}'`);
  }

  if (REACT_GLOBAL.test(code)) {
    violations.push(`${path}: uses the global React namespace (React.*) — React-only types belong in src/react/reactTypes.ts`);
  }

  return violations;
}

/** Non-blank lines of non-test source, so the ratio stays comparable across releases. */
function measure(paths) {
  const files = paths.filter((p) => /\.tsx?$/.test(p) && !p.includes('.test.'));
  const lines = files.reduce(
    (sum, p) =>
      sum +
      readFileSync(join(root, p), 'utf8')
        .split('\n')
        .filter((l) => l.trim()).length,
    0,
  );

  return { files: files.length, lines };
}

// The published entry (`@box-kite/core`) and everything it reaches, which is the real
// framework-free boundary: the engine also uses `src/utils/**` and `src/types.ts`, and a React
// import there would ship to a consumer who installed the library precisely to avoid one. The
// directory walk stays alongside it, because a core module no entry imports yet is still core.
const entryGraph = coreGraph();
const coreFiles = [...new Set([...entryGraph.modules.keys(), ...walk(CORE)])];
const violations = coreFiles.flatMap(checkFile);

for (const { path, specifier } of entryGraph.bare) {
  if (REACT_PACKAGE.test(specifier)) violations.push(`${path}: reached from ${CORE_ENTRY} and imports '${specifier}'`);
}

for (const { path, specifier } of entryGraph.unresolved) {
  violations.push(`${path}: cannot resolve '${specifier}'`);
}

if (violations.length) {
  console.error(`\n✖ ${CORE} must stay framework-free — ${violations.length} violation(s):\n`);
  for (const v of violations) console.error(`  ${v}`);
  console.error('\nMove React code into src/react/ and import it from there. See CONTRIBUTING.md, "The core boundary".\n');
  process.exit(1);
}

// Informational: how much of core + binding is React. The binding is what a non-React
// adapter would have to reimplement; React *feature* code beside it (the shared hooks, `src/react/a11y`,
// `src/react/forms`, `src/react/svg`) is counted separately, since a Vue adapter would need its own
// arrow-key navigation for the same reason it needs its own components.
const reactFiles = walk('src/react');
const isFeature = (path) =>
  path.startsWith('src/react/hooks/') ||
  path.startsWith('src/react/a11y/') ||
  path.startsWith('src/react/forms/') ||
  path.startsWith('src/react/svg/');

const core = measure(coreFiles);
const binding = measure([...reactFiles.filter((p) => !isFeature(p)), 'src/box.ts', 'src/rsc.ts', 'src/ssg.ts']);
const helpers = measure(reactFiles.filter(isFeature));
const share = ((binding.lines / (core.lines + binding.lines)) * 100).toFixed(1);

console.log(
  `✔ ${CORE} and everything ${CORE_ENTRY} reaches are framework-free ` +
    `(${core.files} files, ${core.lines} lines, zero React references)`,
);
console.log(`  React binding: ${binding.files} files, ${binding.lines} lines — ${share}% of core + binding`);
console.log(`  React feature hooks: ${helpers.files} files, ${helpers.lines} lines (shared by components, outside the binding)`);
