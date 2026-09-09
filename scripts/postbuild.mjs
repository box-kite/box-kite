// Copy publish metadata, docs, and Claude skill/rules into dist/ after the library build, write the
// generated agent files beside them (agent-docs.mjs), then
// check the one property of the output that no test can see: the `react-server` entry must not
// reach a client hook through any chunk it imports.
// Uses Node's fs (not shell cp/mkdir) so it runs identically on macOS, Linux, and Windows.
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { writeAgentDocs } from './agent-docs.mjs';
import { CLIENT_ONLY_COMPONENTS, CLIENT_ONLY_ENTRIES, CORE_PACKAGE, PACKAGE_NAME, SERVER_SAFE_COMPONENTS } from './moduleGraph.mjs';

// Ensure target directories exist (recursive = cross-platform `mkdir -p`).
mkdirSync('dist/.claude/rules', { recursive: true });
mkdirSync('dist/.cursor/rules', { recursive: true });

const copies = [
  ['LICENSE', 'dist/LICENSE'],
  ['README.md', 'dist/README.md'],
  ['src/BOX_KITE_AI_CONTEXT.md', 'dist/BOX_KITE_AI_CONTEXT.md'],
  // The old filename ships beside it for one minor cycle: assistants, posts and the docs page's own
  // `cp` line reference it verbatim, and a file an AI was told to read is not a path to break quietly.
  ['src/BOX_KITE_AI_CONTEXT.md', 'dist/BOX_AI_CONTEXT.md'],
  // The whole skill directory, references included: `SKILL.md` is a table of contents now, so copying
  // the file alone would ship one pointing at four that are not there (AI3).
  ['.claude/skills/box-kite', 'dist/.claude/skills/box-kite'],
  ['.claude/rules/box-kite-rules.md', 'dist/.claude/rules/box-kite-rules.md'],
  ['.cursor/rules/box-kite.mdc', 'dist/.cursor/rules/box-kite.mdc'],
];

for (const [from, to] of copies) {
  cpSync(from, to, { recursive: true });
}

// The published manifest is the root one plus the core dependency, which is deliberately *not* a root
// dependency: this repo resolves core through relative imports (the build rewrites them to the package),
// and a version nobody can fetch until this same release publishes it would fail `npm install` here and
// in CI. Pinned exactly, and to this package's own version, because the two are one release — a range
// would let a consumer pair a Box with an engine whose class-name identity it does not share.
const manifest = JSON.parse(readFileSync('package.json', 'utf8'));
manifest.dependencies = Object.fromEntries(
  Object.entries({ ...manifest.dependencies, [CORE_PACKAGE]: manifest.version }).sort(([a], [b]) => a.localeCompare(b)),
);
writeFileSync('dist/package.json', `${JSON.stringify(manifest, null, 2)}\n`);

// The generated half of the copies above: `AGENTS.md` and `docs/`, written from the rules file, the prop
// reference and the built chunks' own exports rather than from a file somebody has to remember to edit.
// After the manifest, not before: reading a component's exports means importing it, and a server-safe one
// imports the package by name — with no `dist/package.json` yet that self-reference resolves against the
// *repo* root instead, and asks for a `box.mjs` that is not there.
writeAgentDocs();

// Load the built package the way a Server Component's bundler resolves it: `check:boundaries` proves the
// *sources* call no client hook, and this proves the bundler did not undo that. Node applies
// `--conditions=react-server` to `react` too, whose server build exports no `useState` at all, so a chunk
// naming one fails here exactly as it would in a consumer. The specifiers are the ones a consumer writes,
// which for the components is the whole of the fix — that resolution is what hands them the hook-free Box.
const specifiers = [PACKAGE_NAME, ...SERVER_SAFE_COMPONENTS.map((name) => `${PACKAGE_NAME}/components/${name}`)];

const loads = [
  ['ESM', 'module', (specifier) => `assert(Object.keys(await import('${specifier}')).length > 0, '${specifier}');`],
  ['CJS', 'commonjs', (specifier) => `assert(Object.keys(require('${specifier}')).length > 0, '${specifier}');`],
];

for (const [format, inputType, statement] of loads) {
  const script = [
    `const assert = (ok, what) => { if (!ok) throw new Error(what + ' exported nothing'); };`,
    ...specifiers.map(statement),
  ].join('\n');

  const result = spawnSync(process.execPath, ['--conditions=react-server', `--input-type=${inputType}`, '-e', script], {
    cwd: 'dist',
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    console.error(`\n✖ the react-server entry or a server-safe component does not load as ${format}:\n`);
    console.error(result.stderr?.trim());
    console.error('\nFix the chunk split in vite.config.ts (codeSplitting.groups). See CONTRIBUTING.md, "The core boundary".\n');
    process.exit(1);
  }
}

console.log(`✔ the entry and ${SERVER_SAFE_COMPONENTS.length} components load under the react-server condition (ESM and CJS)`);

// The components that cannot render on a server say so in the one place a bundler looks. Without the
// banner a Server Component importing `Dropdown` compiles it into the server graph, where `useState` does
// not exist; with one on a server-safe component, every `<H1>` would drag a client runtime in behind it.
const DIRECTIVE = /^["']use client["'];/;

const bannerViolations = [];

for (const [names, wanted, directory] of [
  [CLIENT_ONLY_COMPONENTS, true, 'components/'],
  [SERVER_SAFE_COMPONENTS, false, 'components/'],
  // The hooks entry is client-only for the same reason, one level up: `@box-kite/react/a11y`
  // is `useRef` and effects from top to bottom.
  [CLIENT_ONLY_ENTRIES, true, ''],
]) {
  for (const name of names) {
    for (const extension of ['mjs', 'cjs']) {
      const file = `${directory}${name}.${extension}`;
      const has = DIRECTIVE.test(readFileSync(join('dist', file), 'utf8'));

      if (has !== wanted) bannerViolations.push(`${file} ${has ? 'has' : 'is missing'} the 'use client' banner`);
    }
  }
}

if (bannerViolations.length) {
  console.error(`\n✖ the 'use client' banners are wrong:\n`);
  for (const violation of bannerViolations) console.error(`  ${violation}`);
  console.error('\nFix the component lists in scripts/moduleGraph.mjs. See CONTRIBUTING.md, "The core boundary".\n');
  process.exit(1);
}

console.log(
  `✔ ${CLIENT_ONLY_COMPONENTS.length} client-only components and ${CLIENT_ONLY_ENTRIES.length} client-only entries ` +
    `carry a 'use client' banner; the server-safe ones do not`,
);

// The other half of the boundary, on the built output: `check:boundaries` proves `src/core` names no
// React, and this proves the bundler did not hand the framework-free entry a chunk that does. The split
// used to come from the react-server graph alone, so everything outside it went to the client chunk.
const REACT_SPECIFIER = /(?:from\s*|require\(\s*)["'](react(?:-dom)?(?:\/[^"']*)?)["']/g;

/** The chunk, plus every chunk it imports, as `[path, source]`. */
function chunkGraph(entry, dir) {
  const seen = new Map();
  const queue = [entry];

  while (queue.length) {
    const file = queue.shift();
    if (seen.has(file)) continue;

    const code = readFileSync(join(dir, file), 'utf8');
    seen.set(file, code);

    for (const [, specifier] of code.matchAll(/(?:from\s*|require\(\s*)["'](\.\/[^"']+)["']/g)) {
      queue.push(specifier.slice(2));
    }
  }

  return seen;
}

for (const entry of ['core.mjs', 'core.cjs']) {
  const offenders = [...chunkGraph(entry, 'dist-core')]
    .flatMap(([file, code]) => [...code.matchAll(REACT_SPECIFIER)].map(([, specifier]) => `${file} imports '${specifier}'`))
    .filter((value, index, all) => all.indexOf(value) === index);

  if (offenders.length) {
    console.error(`\n✖ @box-kite/core (${entry}) reaches React through its chunks:\n`);
    for (const offender of offenders) console.error(`  ${offender}`);
    console.error('\nFix the chunk split in vite.core.config.ts. See CONTRIBUTING.md, "The core boundary".\n');
    process.exit(1);
  }
}

console.log('✔ @box-kite/core bundles no React (ESM and CJS)');

// The mirror of it: the React package must not carry the engine. A spelling the rewrite in
// `corePackageReference` misses inlines a second copy, and two engines mean two style elements, two
// class-name counters and every rule written twice — silently, in any app that installs core directly.
for (const entry of ['box.mjs', 'box.cjs']) {
  const importsCore = [...chunkGraph(entry, 'dist').values()].some((code) => code.includes(CORE_PACKAGE));

  if (!importsCore) {
    console.error(`\n✖ dist/${entry} does not import ${CORE_PACKAGE} — the engine was inlined into the React package.\n`);
    console.error('A spelling of the core entry went unrewritten: see corePackageReference in vite.config.ts.\n');
    process.exit(1);
  }
}

if (existsSync(join('dist', 'engine.mjs'))) {
  console.error('\n✖ dist/engine.mjs exists — the engine is being bundled into the React package again.\n');
  process.exit(1);
}

console.log(`✔ ${PACKAGE_NAME} imports ${CORE_PACKAGE} rather than carrying a second copy of it`);
