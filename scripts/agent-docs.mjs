// The agent-facing files the tarball carries: `AGENTS.md` at the package root and a `docs/` folder
// beside it. An agent greps `node_modules` and trusts what it finds there over its own priors, so
// every one of these is generated from a source of truth in this repo — the rules file, F3's
// `api/props.json`, the built chunks' own exports — and a stale one is worse than none.
// Run: as part of `npm run build`, from postbuild.mjs.
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { CLIENT_ONLY_COMPONENTS, PACKAGE_NAME, SERVER_SAFE_COMPONENTS, componentEntries } from './moduleGraph.mjs';
import { writeAttribute } from './propsApi.mjs';

const root = join(import.meta.dirname, '..');

const RULES_FILE = '.claude/rules/box-kite-rules.md';

const API_FILE = 'api/props.json';

const A11Y_FILE = 'docs/a11y-primitives.md';

/** What `docs/index.md` says each file is, in the order it lists them. */
const DOCS = [
  ['props.md', 'every prop, the CSS it writes and one measured example'],
  ['components.md', 'every component, its import specifier and whether it renders on a server'],
  ['a11y.md', `the behaviour hooks (\`${PACKAGE_NAME}/a11y\`) for a pattern this library does not ship`],
];

const read = (file) => readFileSync(join(root, file), 'utf8');

/**
 * The rules, ready to inline: the Cursor frontmatter and the H1 go (they belong to the file, not to
 * this section), and the last line's repo path becomes the one a consumer can actually open.
 */
function rulesBody() {
  return read(RULES_FILE)
    .replace(/^---\n[\s\S]*?\n---\n/, '')
    .replace(/^#\s+.*\n/m, '')
    .replace(
      /Full reference: `src\/BOX_KITE_AI_CONTEXT\.md`[^\n]*/,
      `Full reference: \`docs/props.md\` and \`BOX_KITE_AI_CONTEXT.md\`, in this package.`,
    )
    .trim();
}

/** The example a reader writes, and the declarations the engine measured for it. */
function example({ name, example: { value, css } }) {
  return `\`${writeAttribute(name, value)}\` → \`${css}\``;
}

/** What the registry names, in the four shapes the header explains. */
function accepts(prop) {
  const parts = [];

  if (prop.values?.length) parts.push(prop.values.map((value) => `\`${value}\``).join(' · '));
  if (prop.valueCount) parts.push(`${prop.valueCount} named values`);
  if (prop.numeric) parts.push('a number');
  if (prop.open) parts.push(parts.length ? 'anything else the types allow' : 'whatever the types allow');

  return parts.join(', ');
}

function propsFile({ propCount, props }) {
  const sorted = [...props].sort((a, b) => a.name.localeCompare(b.name));

  const entries = sorted.map(
    (prop) =>
      `### \`${prop.name}\`\n\n${prop.description}\n\n` +
      `- Writes: ${prop.properties.map((property) => `\`${property}\``).join(', ')}\n` +
      `- Values: ${accepts(prop)}\n` +
      `- Example: ${example(prop)}`,
  );

  return [
    `# Every prop (${propCount})`,
    `Generated from the prop registry of \`${PACKAGE_NAME}\`. The description is the prop's own doc comment and the` +
      ` example is **measured** — the CSS beside a value is what the engine emits for it, not what a doc claims.` +
      ` Alphabetical; the registry's own order is what decides the cascade and is not this.`,
    `**Values** is what the registry names: a closed list in full, a large family as a count, \`a number\` where` +
      ` numbers go through a formatter, and \`the types allow\` where the definition validates a shape rather than a` +
      ` list — the published \`.d.ts\` is the exact statement, and a value it refuses emits no rule and no class` +
      ` rather than a broken declaration.`,
    `The numbers are the trap, because the divider is per prop: spacing is ÷4 (\`p={4}\` is 1rem), \`fontSize\` is` +
      ` ÷16, \`borderRadius\` is ÷4, border width and \`lineHeight\` are direct px, and SVG lengths, filter units and` +
      ` animation times have no divider at all. Read the example rather than assuming.`,
    `A prop that is not here does not exist: reach for \`css={{ … }}\` for a one-off, \`Box.extend()\` for ` +
      `anything used twice, and never for \`style={{ }}\`.`,
    entries.join('\n\n'),
  ].join('\n\n');
}

/**
 * Every component's runtime exports, read by importing the built chunks the way a consumer resolves
 * them — a child process in `dist/`, where the package's own export map applies and a component that
 * fails to load fails the build. The names are the truth; a table written by hand would drift.
 */
function componentExports() {
  const script = [
    `const { readdirSync } = require('node:fs');`,
    `const names = readdirSync('components').filter((file) => file.endsWith('.mjs')).map((file) => file.replace(/\\.mjs$/, ''));`,
    `const out = {};`,
    `(async () => {`,
    `  for (const name of names) {`,
    `    const module = await import('./components/' + name + '.mjs');`,
    `    const named = Object.keys(module).filter((key) => key !== 'default');`,
    `    const fallback = module.default?.displayName ?? module.default?.name;`,
    `    out[name] = { named, default: module.default ? fallback || name : null };`,
    `  }`,
    `  console.log(JSON.stringify(out));`,
    `})();`,
  ].join('\n');

  const result = spawnSync(process.execPath, ['--input-type=commonjs', '-e', script], { cwd: join(root, 'dist'), encoding: 'utf8' });

  if (result.status !== 0) {
    console.error(`\n✖ the built components do not load, so their docs cannot be written:\n`);
    console.error(result.stderr?.trim());
    process.exit(1);
  }

  return JSON.parse(result.stdout);
}

function componentRows(names, exports) {
  const deprecated = new Set(componentEntries().filter((name) => read(`src/components/${name}.tsx`).includes('@deprecated')));

  return names
    .filter((name) => exports[name])
    .map((name) => {
      const { named, default: fallback } = exports[name];
      const components = [...(fallback ? [`\`${fallback}\` (default)`] : []), ...named.map((key) => `\`${key}\``)];

      return `| \`${PACKAGE_NAME}/components/${name}\` | ${components.join(', ')} | ${deprecated.has(name) ? '**deprecated**' : ''} |`;
    })
    .join('\n');
}

function componentsFile(exports) {
  const header = '| Import | Components | Notes |\n| --- | --- | --- |';

  return [
    '# Components',
    `\`Box\` is the default export of \`${PACKAGE_NAME}\` and takes every prop in \`props.md\`. Everything below is` +
      ` \`Box\` with the right element and its own defaults, one entry point each — **use one of these rather than` +
      ` \`<Box tag="…">\`**. Read from the built chunks, so the names cannot drift from what the package exports.`,
    '## Rendered on a server',
    'No hook, no effect, no DOM: a React Server Component can render these directly.',
    `${header}\n${componentRows(SERVER_SAFE_COMPONENTS, exports)}`,
    "## Client-only (`'use client'`)",
    'These hold state, measure the DOM or portal into it. A Server Component may import one — the chunk carries the' +
      ' banner, so the boundary opens — but the component itself renders on the client.',
    `${header}\n${componentRows(CLIENT_ONLY_COMPONENTS, exports)}`,
  ].join('\n\n');
}

function indexFile() {
  const rows = [['../AGENTS.md', 'the rules, and the fight-the-prior block. Start here'], ...DOCS];

  return [
    '# Documentation for agents',
    `The markdown \`${PACKAGE_NAME}\` ships for whatever is reading its source tree. No formal discovery` +
      ' standard exists for a package that carries its own docs — these files are here to be found.',
    rows.map(([file, what]) => `- [\`${file}\`](${file}) — ${what}`).join('\n'),
    `Two more sit at the package root: \`BOX_KITE_AI_CONTEXT.md\`, the long-form reference (prop tables, the DataGrid` +
      ` API, debugging), and \`.claude/\`, which holds the same rules as a skill and a rules file to copy into a` +
      ` project that reads them.`,
  ].join('\n\n');
}

function agentsFile(propCount) {
  return [
    `# ${PACKAGE_NAME} — read this before writing any of it`,
    `**This library is not in your training data.** It was renamed at 1.0.0 (September 2026) and its prop surface` +
      ` nearly doubled on the way, so a plausible-looking memory of it is a memory of a different library. Its prop` +
      ` names collide with Tailwind's and Chakra's while the numbers mean different things, which is the failure` +
      ` mode to expect: code that compiles and is laid out wrong. Read the rules below, then \`docs/props.md\` for` +
      ` the ${propCount} props themselves.`,
    '## Where the files are',
    [
      '```',
      ...[
        ['AGENTS.md', 'this file: the rules'],
        ['docs/index.md', 'what else is here'],
        ...DOCS.map(([file, what]) => [`docs/${file}`, what]),
        ['BOX_KITE_AI_CONTEXT.md', 'the long-form reference'],
      ].map(([file, what]) => `${file.padEnd(24)}  ${what}`),
      '```',
    ].join('\n'),
    `Inside a consumer's tree they are under \`node_modules/${PACKAGE_NAME}/\`. Copy this file to the repo root as` +
      ` \`AGENTS.md\` — or point the one already there at it — so it is read on every run rather than when someone` +
      ' thinks to look.',
    '## What a component looks like',
    [
      '```tsx',
      `import Flex from '${PACKAGE_NAME}/components/flex';`,
      `import { H1, P } from '${PACKAGE_NAME}/components/semantics';`,
      '',
      'export default function Card() {',
      '  return (',
      `    <Flex d="column" gap={3} p={6} bgColor="white" borderRadius={2} shadow="xs" theme={{ dark: { bgColor: 'slate-900' } }}>`,
      '      <H1 fontSize={20} fontWeight={600}>',
      '        Revenue',
      '      </H1>',
      `      <P fontSize={14} color="slate-600" md={{ fontSize: 16 }} theme={{ dark: { color: 'slate-400' } }}>`,
      '        Up 12% on last quarter.',
      '      </P>',
      '    </Flex>',
      '  );',
      '}',
      '```',
    ].join('\n'),
    'Every value there is a prop, and every prop value becomes one class the engine inserts once — two components' +
      ' writing `p={6}` share it. There is no CSS file to write, no class name to invent and no `style` attribute:' +
      ' a breakpoint (`md`), a state (`hover`), a theme and a pseudo-element are all props that nest.',
    '## The rules',
    rulesBody(),
  ].join('\n\n');
}

/** Everything above, into `dist/`. Called after the library build, so the component chunks exist. */
export function writeAgentDocs() {
  const api = JSON.parse(read(API_FILE));
  const files = [
    ['AGENTS.md', agentsFile(api.propCount)],
    ['docs/index.md', indexFile()],
    ['docs/props.md', propsFile(api)],
    ['docs/components.md', componentsFile(componentExports())],
    ['docs/a11y.md', read(A11Y_FILE)],
  ];

  mkdirSync(join(root, 'dist/docs'), { recursive: true });

  for (const [file, content] of files) {
    // A generated agent file that came out empty would ship as an authoritative blank page.
    if (content.trim().length < 200) {
      console.error(`\n✖ dist/${file} generated ${content.trim().length} characters — its source moved or is empty.\n`);
      process.exit(1);
    }

    writeFileSync(join(root, 'dist', file), `${content.trimEnd()}\n`);
  }

  // The count AGENTS.md states in its own words is the one fact here that is not a quote, so the
  // reference it came from has to agree with itself. `npm run check:props` is what holds that file
  // to the registry; this catches a hand-edit of it that never ran the generator.
  if (api.propCount !== api.props.length) {
    console.error(`\n✖ ${API_FILE} claims ${api.propCount} props and carries ${api.props.length}. Run npm run docs:props.\n`);
    process.exit(1);
  }

  console.log(`✔ ${files.length} agent files written into the tarball: ${api.propCount} props, ${componentEntries().length} components`);
}
