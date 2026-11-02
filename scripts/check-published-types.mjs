// Type-checks the two packages the way a consumer installs them: `dist/` and `dist-core/` packed,
// installed into a throwaway app with `skipLibCheck: false`, and a fixture compiled against them.
//
// Two checks, because the failure they guard against is silent. From 2.2.6 to 2.2.15 the dts plugin
// dropped `core/extends/boxComponents.d.ts` on a TS7056 it only printed, the build stayed green, and
// every app with `skipLibCheck: true` (all of them) read the built-in components as `any` (bug #306).
// 1. Every relative import in every shipped `.d.ts` must land on a file inside the same package.
// 2. The fixture must compile, and its `@ts-expect-error` lines must still be errors — an `any` passes
//    everything, so only a refusal proves the types are really there.
//
// Run: npm run check:types (after npm run build), or `npm run check:types -- 2.2.15` for a published pair.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';

const root = join(import.meta.dirname, '..');
const published = process.argv[2];
const PACKAGES = { '@box-kite/core': 'dist-core', '@box-kite/react': 'dist' };

for (const dir of published ? [] : Object.values(PACKAGES)) {
  if (existsSync(join(root, dir, 'package.json'))) continue;

  console.error(`\n✖ ${dir}/ is not built — run \`npm run build\` first.\n`);
  process.exit(1);
}

// Through the CLI that invoked this script when there is one, for the reason `packLocal.mjs` gives.
const npmCli = process.env.npm_execpath;

function npm(args, cwd) {
  const result = npmCli
    ? spawnSync(process.execPath, [npmCli, ...args], { cwd, encoding: 'utf8' })
    : spawnSync('npm', args, { cwd, encoding: 'utf8', shell: true });

  if (result.status !== 0) {
    console.error(`\n✖ npm ${args[0]} failed in ${cwd}:\n${result.stderr?.trim()}\n`);
    process.exit(1);
  }

  return result.stdout;
}

const app = mkdtempSync(join(tmpdir(), 'box-kite-types-'));
const tarballs = {};

for (const [name, dir] of Object.entries(PACKAGES)) {
  const out = published
    ? npm(['pack', `${name}@${published}`, '--json', '--pack-destination', app], app)
    : npm(['pack', '--json', '--pack-destination', app], join(root, dir));
  const [{ filename }] = JSON.parse(out.slice(out.indexOf('[')));
  tarballs[name] = `${dir}.tgz`;
  renameSync(join(app, filename), join(app, tarballs[name]));
}

const { devDependencies } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const pinned = (names) => Object.fromEntries(names.map((name) => [name, devDependencies[name]]));

writeFileSync(
  join(app, 'package.json'),
  JSON.stringify({
    name: 'box-kite-types-consumer',
    private: true,
    type: 'module',
    dependencies: {
      ...Object.fromEntries(Object.entries(tarballs).map(([name, file]) => [name, `file:./${file}`])),
      ...pinned(['react', 'react-dom', '@types/react', '@types/react-dom']),
    },
  }),
);

npm(['install', '--no-audit', '--no-fund', '--no-package-lock', '--prefer-offline', '--loglevel=error'], app);

const installed = (name) => join(app, 'node_modules', ...name.split('/'));
let failed = false;

// 1. Relative imports that leave the package, or land on nothing.
const SPECIFIER = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+|<reference\s+path=)['"](\.{1,2}\/[^'"]*)['"]/g;

function resolvesInside(packageRoot, file, specifier) {
  const base = resolve(dirname(file), specifier);
  if (relative(packageRoot, base).startsWith('..')) return false;

  const candidates = [`${base}.d.ts`, join(base, 'index.d.ts'), base.replace(/\.(m|c)?js$/, '.d.$1ts')];
  if (base.endsWith('.d.ts')) candidates.push(base);

  return candidates.some((candidate) => existsSync(candidate));
}

for (const name of Object.keys(PACKAGES)) {
  const packageRoot = installed(name);
  const declarations = readdirSync(packageRoot, { recursive: true })
    .map((entry) => join(packageRoot, entry))
    .filter((file) => /\.d\.[mc]?ts$/.test(file));
  const broken = [];

  for (const file of declarations) {
    for (const [, specifier] of readFileSync(file, 'utf8').matchAll(SPECIFIER)) {
      if (!resolvesInside(packageRoot, file, specifier))
        broken.push(`${relative(packageRoot, file).split('\\').join('/')} → '${specifier}'`);
    }
  }

  if (broken.length === 0) {
    console.log(`✔ ${name}: every relative import in ${declarations.length} declaration files resolves inside the package`);
  } else {
    failed = true;
    console.error(`✖ ${name}: ${broken.length} relative imports resolve to nothing inside the package:\n  ${broken.join('\n  ')}`);
  }
}

// 2. Every subpath the packages export, so `skipLibCheck: false` reads every declaration a consumer can reach.
const subpaths = Object.keys(PACKAGES).flatMap((name) => {
  const { exports } = JSON.parse(readFileSync(join(installed(name), 'package.json'), 'utf8'));

  return Object.keys(exports)
    .filter((key) => !/\.(json|md|css)$/.test(key))
    .flatMap((key) => {
      if (!key.endsWith('/*')) return [key === '.' ? name : `${name}/${key.slice(2)}`];

      const folder = key.slice(2, -2);
      return readdirSync(join(installed(name), folder))
        .filter((file) => file.endsWith('.d.ts'))
        .map((file) => `${name}/${folder}/${file.slice(0, -'.d.ts'.length)}`);
    });
});

writeFileSync(
  join(app, 'tsconfig.json'),
  JSON.stringify({
    compilerOptions: {
      target: 'ES2022',
      lib: ['ES2022', 'DOM', 'DOM.Iterable'],
      module: 'ESNext',
      moduleResolution: 'bundler',
      jsx: 'react-jsx',
      strict: true,
      skipLibCheck: false,
      noEmit: true,
    },
    include: ['consumer.tsx'],
  }),
);

// Each `@ts-expect-error` is a promise the types make; with the declarations missing, all of them pass.
writeFileSync(
  join(app, 'consumer.tsx'),
  `${subpaths.map((specifier, index) => `import type * as entry${index} from '${specifier}';`).join('\n')}
export type EveryEntry = [${subpaths.map((_, index) => `typeof entry${index}`).join(', ')}];

import Box from '@box-kite/react';
import Button from '@box-kite/react/components/button';

Box.components({
  card: { styles: { p: 4, borderRadius: 2 }, variants: { flat: { shadow: 'none' } } },
  button: { styles: { theme: { dark: { bgColor: 'violet-500', hover: { bgColor: 'violet-400' } } } } },
});

Box.components({
  button: {
    // @ts-expect-error a value no prop takes, inside a theme entry
    styles: { theme: { dark: { bgColor: 'bleu-500' } } },
  },
});

export const valid = (
  <>
    <Box component="button" variant="secondary" p={4} />
    <Button variant="ghost">Save</Button>
  </>
);

// @ts-expect-error unknown component
export const unknownComponent = <Box component="cardd" />;

// @ts-expect-error unknown variant
export const unknownVariant = <Box component="button" variant="nonsense" />;
`,
);

const tsc = spawnSync(process.execPath, [join(root, 'node_modules', 'typescript', 'bin', 'tsc'), '-p', app], {
  cwd: app,
  encoding: 'utf8',
});

if (tsc.status === 0) {
  console.log(
    `✔ a strict consumer of all ${subpaths.length} entries type-checks with skipLibCheck: false, and every @ts-expect-error is an error`,
  );
} else {
  failed = true;
  console.error(`✖ a strict consumer with skipLibCheck: false does not type-check:\n${tsc.stdout.trim()}`);
}

rmSync(app, { recursive: true, force: true });

if (failed) process.exit(1);
