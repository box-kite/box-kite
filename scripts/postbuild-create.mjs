// Finishes the `@box-kite/create` build: writes the package manifest beside the bundle, copies the README and
// the licence, and proves the command makes an app that builds.
//
// That last part is the point. The design files are generated from the site's sources and the JavaScript
// ones are transpiled from those, so the check is the command itself, run against the built file with only
// its declared dependencies, for every design in both languages: create-vite's real template, then the
// app's own `tsc -b` and `vite build`, with `@box-kite/react` resolved to this commit's `dist/`.
//
// Run: npm run build:create (after npm run build)
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { DESIGN_IDS, designFonts } from './createTemplates.mjs';

const root = join(import.meta.dirname, '..');
const out = join(root, 'dist-create');
const bundle = join(out, 'create.mjs');

for (const [path, what] of [
  [bundle, 'dist-create/ is not built — this runs after `vite build --config vite.create.config.ts`.'],
  [join(root, 'dist', 'package.json'), 'dist/ is not built — run `npm run build` first: the apps are built against it.'],
]) {
  if (existsSync(path)) continue;
  console.error(`\n✖ ${what}\n`);
  process.exit(1);
}

const parent = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

const manifest = {
  name: '@box-kite/create',
  version: parent.version,
  type: 'module',
  description: 'Start a Vite + React app with Box Kite and a design in it: npm create @box-kite@latest my-app -- --design mono',
  // Without `./`: npm 11 warns about the prefixed spelling and rewrites it on publish.
  bin: { 'create-box-kite': 'create.mjs' },
  files: ['create.mjs', 'README.md', 'LICENSE'],
  dependencies: {
    '@clack/prompts': parent.devDependencies['@clack/prompts'],
    'create-vite': parent.devDependencies['create-vite'],
  },
  // create-vite's own floor, and above the 22.4 `parseArgs` needs for `--no-install`.
  engines: { node: '>=22.12' },
  keywords: ['box-kite', 'create', 'vite', 'react', 'template', 'starter', 'design-system', 'css-in-js'],
  repository: parent.repository,
  bugs: parent.bugs,
  homepage: parent.homepage,
  author: parent.author,
  license: parent.license,
};

writeFileSync(join(out, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`);
cpSync(join(root, 'create', 'README.md'), join(out, 'README.md'));
cpSync(join(root, 'LICENSE'), join(out, 'LICENSE'));

/** A junction needs no elevation on Windows, and elsewhere the type is ignored. */
function link(target, at) {
  mkdirSync(dirname(at), { recursive: true });
  symlinkSync(target, at, 'junction');
}

/** The packages an app's own build reaches: the repo's copies, so nothing is downloaded and React is one copy. */
const APP_PACKAGES = ['react', 'react-dom', '@types/react', '@types/react-dom', '@types/node', 'vite', '@vitejs/plugin-react', 'typescript'];

function fail(message, output = '') {
  console.error(`\n✖ @box-kite/create: ${message}\n${output.trim()}\n`);
  process.exit(1);
}

const work = mkdtempSync(join(tmpdir(), 'box-kite-create-'));
try {
  // The bundle beside its declared dependencies only: in the repo every devDependency resolves, after `npx` none does.
  const bin = join(work, 'bin');
  cpSync(bundle, join(bin, 'create.mjs'));
  for (const name of Object.keys(manifest.dependencies)) link(join(root, 'node_modules', name), join(bin, 'node_modules', name));

  // One node_modules for every app, one directory up, where Node and Vite both look.
  const modules = join(work, 'apps', 'node_modules');
  for (const name of APP_PACKAGES) link(join(root, 'node_modules', name), join(modules, name));
  link(join(root, 'dist'), join(modules, '@box-kite', 'react'));
  link(join(root, 'dist-core'), join(modules, '@box-kite', 'core'));
  // A font package is CSS and woff2 files plus the declaration TypeScript resolves a side-effect import to.
  for (const font of new Set(DESIGN_IDS.flatMap(designFonts))) {
    mkdirSync(join(modules, font), { recursive: true });
    writeFileSync(join(modules, font, 'package.json'), JSON.stringify({ name: font, main: 'index.css', types: 'index.d.css.ts' }));
    writeFileSync(join(modules, font, 'index.d.css.ts'), 'export {};\n');
    writeFileSync(join(modules, font, 'index.css'), '');
  }

  const node = (args, cwd) => spawnSync(process.execPath, args, { cwd, encoding: 'utf8', env: { ...process.env, CI: '1' } });
  const tsc = join(modules, 'typescript', 'bin', 'tsc');
  const vite = join(modules, 'vite', 'bin', 'vite.js');

  for (const template of ['react-ts', 'react']) {
    for (const design of DESIGN_IDS) {
      const name = `${design}-${template}`;
      const app = join(work, 'apps', name);
      const created = node([join(bin, 'create.mjs'), name, '--template', template, '--design', design, '--no-install', '--no-interactive'], join(work, 'apps'));
      if (created.status !== 0) fail(`${name} was not created.`, created.stdout + created.stderr);

      const pkg = JSON.parse(readFileSync(join(app, 'package.json'), 'utf8'));
      for (const dependency of ['@box-kite/react', ...designFonts(design)]) {
        if (!pkg.dependencies[dependency]) fail(`${name}/package.json has no ${dependency}.`);
      }
      if (existsSync(join(app, 'src', 'App.css'))) fail(`${name} still has the template's App.css.`);

      if (template === 'react-ts') {
        const checked = node([tsc, '-b'], app);
        if (checked.status !== 0) fail(`${name} does not type-check.`, checked.stdout + checked.stderr);
      }
      const built = node([vite, 'build', '--logLevel', 'error'], app);
      if (built.status !== 0) fail(`${name} does not build.`, built.stdout + built.stderr);
    }
  }

  const help = node([join(bin, 'create.mjs'), '--help'], work);
  if (help.status !== 0 || !help.stdout.includes('--design')) fail('--help says nothing about --design.', help.stdout + help.stderr);
} finally {
  // `rmSync` unlinks a junction rather than following it, so the repo's own node_modules survive.
  rmSync(work, { recursive: true, force: true });
}

console.log(`✓ @box-kite/create ${manifest.version}: ${DESIGN_IDS.length} designs, in TypeScript and JavaScript, created and built`);
