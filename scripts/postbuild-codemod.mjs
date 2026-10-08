// Finishes the `@box-kite/codemod` build: writes the package manifest beside the bundle, copies the README
// and the licence, and runs the built binary over the shadcn corpus in `codemod/fixtures/shadcn`.
//
// The run is the point. It happens in a temp folder holding the bundle and nothing but its declared
// dependency, so a parser import that only resolved inside this repo fails here rather than after `npx` —
// and it holds the result to the roadmap's bar: 70% of the Radix elements converted with no TODO.
//
// Run: npm run build:codemod
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ts from 'typescript';

const root = join(import.meta.dirname, '..');
const out = join(root, 'dist-codemod');
const bundle = join(out, 'codemod.mjs');
const BAR = 70;

if (!existsSync(bundle)) {
  console.error('\n✖ dist-codemod/ is not built — this runs after `vite build --config vite.codemod.config.ts`.\n');
  process.exit(1);
}

const parent = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

const manifest = {
  name: '@box-kite/codemod',
  version: parent.version,
  type: 'module',
  description: 'Moves a Radix or shadcn/ui app onto Box Kite: the overlapping primitives rewritten, and a report of what is left.',
  bin: { 'box-kite-codemod': './codemod.mjs' },
  exports: { '.': './codemod.mjs' },
  files: ['codemod.mjs', 'README.md', 'LICENSE'],
  // The parser. A range rather than a pin: the codemod reads syntax, which every 5.x and 6.x agrees on.
  dependencies: { typescript: '>=5.0.0' },
  engines: { node: '>=22' },
  keywords: ['box-kite', 'codemod', 'radix', 'shadcn', 'migration', 'react'],
  repository: parent.repository,
  bugs: parent.bugs,
  homepage: parent.homepage,
  author: parent.author,
  license: parent.license,
};

writeFileSync(join(out, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`);
cpSync(join(root, 'codemod', 'README.md'), join(out, 'README.md'));
cpSync(join(root, 'LICENSE'), join(out, 'LICENSE'));

const fail = (message) => {
  console.error(`\n✖ @box-kite/codemod: ${message}\n`);
  process.exit(1);
};

const dir = mkdtempSync(join(tmpdir(), 'box-kite-codemod-'));
try {
  cpSync(bundle, join(dir, 'codemod.mjs'));
  // A junction needs no elevation on Windows; elsewhere the type is ignored.
  mkdirSync(join(dir, 'node_modules'), { recursive: true });
  symlinkSync(join(root, 'node_modules', 'typescript'), join(dir, 'node_modules', 'typescript'), 'junction');
  const project = join(dir, 'project');
  cpSync(join(root, 'codemod', 'fixtures', 'shadcn'), project, { recursive: true });

  const runIn = (...args) =>
    spawnSync(process.execPath, [join(dir, 'codemod.mjs'), 'radix-to-box', ...args], { cwd: project, encoding: 'utf8' });
  const snapshot = () =>
    Object.fromEntries(readdirSync(join(project, 'examples')).map((f) => [f, readFileSync(join(project, 'examples', f), 'utf8')]));

  const before = snapshot();
  const dry = runIn('.', '--dry', '--no-report');
  if (dry.status !== 0) fail(`--dry exited ${dry.status}\n${dry.stderr}`);
  if (JSON.stringify(snapshot()) !== JSON.stringify(before)) fail('--dry wrote to the project.');

  const real = runIn('.', '--no-format');
  if (real.status !== 0) fail(`the run exited ${real.status}\n${real.stdout}\n${real.stderr}`);

  const after = snapshot();
  for (const [file, text] of Object.entries(after)) {
    const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    if (sf.parseDiagnostics?.length) fail(`${file} no longer parses.`);
    if (text === before[file]) fail(`${file} was not changed.`);
  }

  const report = readFileSync(join(project, '.migration', 'README.md'), 'utf8');
  const match = /\*\*(\d+) of (\d+)\*\* Radix elements/.exec(report);
  if (!match) fail('the report carries no totals.');
  const rate = Math.round((Number(match[1]) / Number(match[2])) * 100);
  if (rate < BAR) fail(`${rate}% of the corpus converted without a TODO, under the ${BAR}% bar.`);
  if (!report.includes('## shadcn wrappers')) fail('the wrapper modules went unreported.');

  console.log(
    `✓ @box-kite/codemod ${manifest.version}: ${match[1]} of ${match[2]} Radix elements in the shadcn corpus converted without a TODO (${rate}%).`,
  );
} finally {
  // `rmSync` unlinks a junction rather than following it, so the repo's own node_modules survive.
  rmSync(dir, { recursive: true, force: true });
}
