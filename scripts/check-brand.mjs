// Fails the build if the old names come back. One check for both purges: `crono` (the old company)
// and `react-box` (the old project), over every tracked file and over `dist/` when it is built —
// because four of those strings reach a consumer's console or file tree, so the tarball is the real
// subject. The allowlist is exact substrings with a reason each, not path globs: a *new* occurrence
// in an allowlisted file still fails, which is what stops this from becoming a check nobody can pass.
//
// Run: npm run check:brand
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');

// The space in the middle is what a person writes ("React Box", the old wordmark) and the hyphen is
// what a machine reads. One pattern for both, because the README title survived a hyphen-only sweep.
const BANNED = [/crono/i, /react[ -]box/i];

/** Nothing here is text, so a byte sequence that happens to spell a name means nothing. */
const BINARY = /\.(png|jpe?g|gif|ico|webp|woff2?|ttf|eot|tgz|zip|map)$/i;

/**
 * The deliberate survivors, each with the reason it is allowed and the step that removes it. A file
 * is scanned with these substrings cut out first, so the rest of it is still guarded.
 */
const ALLOWED = [
  {
    file: 'ARTICLE.md',
    reason: 'the origin story — "a repo called react-box" is what happened',
    strings: ['a repo called `react-box`'],
  },
  {
    file: '.claude/skills/release/SKILL.md',
    reason: 'the one-time rename release runbook: the bridge publish and the deprecation both name the old package',
    strings: ['@cronocode/react-box'],
  },
  {
    file: 'releases/1.0.0.md',
    reason: 'the rename release notes: the old package is what the reader is renaming from, and the bridge carries its name',
    strings: ['@cronocode/react-box', 'crono-styles', 'crono-box', '[react-box]'],
  },
  {
    file: 'CHANGELOG.md',
    reason: 'the index says which name the releases before 1.0.0 were published under',
    strings: ['@cronocode/react-box'],
  },
  {
    file: 'README.md',
    reason: 'the rename note, so a reader arriving with the old name in their package.json finds it here',
    strings: ['@cronocode/react-box'],
  },
  {
    file: 'pages/pages/migrationPage.tsx',
    reason: 'the migration page: naming what a reader is migrating from is the whole point of it',
    strings: ['@cronocode/react-box', 'crono-styles', 'crono-box', '[react-box]'],
  },
  {
    file: 'pages/site/site.ts',
    reason: "the migration route's title and description, which have to carry the old name to be findable",
    strings: ['@cronocode/react-box'],
  },
  {
    file: 'scripts/build-bridge.mjs',
    reason: 'the generator for the compatibility bridge, which is published under the old name on purpose',
    strings: ['@cronocode/react-box'],
  },
];

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

const tracked = execSync('git ls-files', { cwd: root, encoding: 'utf8' }).trim().split('\n');
// Two exemptions that are structural rather than editorial. The bridge keeps the old specifier
// resolving by design — it is published, not purged. And this file cannot be judged by its own rule:
// naming the forbidden strings is what it is for, in the patterns, in the allowlist and in the message
// it prints. An allowlist entry would have to quote every one of them and grow with each new one.
const SELF = 'scripts/check-brand.mjs';
const sources = tracked.filter((path) => !BINARY.test(path) && !path.startsWith('bridge/') && path !== SELF);
const shipped = ['dist', 'dist-core']
  .filter((dir) => existsSync(join(root, dir)))
  .flatMap((dir) => walk(dir))
  .filter((path) => !BINARY.test(path));

const violations = [];

for (const path of [...sources, ...shipped]) {
  let text;

  try {
    text = readFileSync(join(root, path), 'utf8');
  } catch {
    continue;
  }

  // `dist/README.md` is `README.md` — postbuild copies it, so it inherits its allowance.
  const source = path.replace(/^dist(-core)?[/]/, '');

  for (const entry of ALLOWED.filter((allowed) => allowed.file === source)) {
    for (const allowed of entry.strings) text = text.split(allowed).join('');
  }

  for (const line of text.split('\n')) {
    const hit = BANNED.find((banned) => banned.test(line));

    if (hit) violations.push(`${path}: ${line.trim().slice(0, 120)}`);
  }
}

if (violations.length > 0) {
  console.error(`\n✖ the old names are back in ${violations.length} place(s):\n`);
  for (const violation of violations) console.error(`  ${violation}`);
  console.error('\nRename it, or add the exact string to ALLOWED in scripts/check-brand.mjs with the reason it stays.\n');
  process.exit(1);
}

const where =
  shipped.length > 0
    ? `${sources.length} tracked files and ${shipped.length} in the two built packages`
    : `${sources.length} tracked files (dist/ not built)`;
console.log(`✔ no "crono" and no "react-box" in ${where} — ${ALLOWED.length} allowlisted strings, each with a reason`);
