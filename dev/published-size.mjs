// The "N KB gz on top of Box" figure a release note quotes, generated rather than transcribed: what a
// consumer who already has Box pays for one more component. Not `size-limit`, which measures a chunk
// against nothing — the interesting number is the delta, since the engine and the style trees are shared.
//
//   node dev/published-size.mjs accordion tabs        # after npm run build
//   node dev/published-size.mjs --bare @radix-ui/react-accordion+@radix-ui/react-collapsible
//
// A `+` measures several entries in one bundle, which is the fair comparison for packages that share
// their own internals. `--bare` drops the Box baseline and resolves from `dir`, for a third-party
// package installed somewhere else — pass `--dir <path>`.
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import esbuild from 'esbuild';

const root = fileURLToPath(new URL('..', import.meta.url));
const args = process.argv.slice(2);
const bare = args.includes('--bare');
const dirAt = args.indexOf('--dir');
const resolveDir = dirAt === -1 ? root : args[dirAt + 1];
// `dirAt + 1` is `--dir`'s value, and it is only a value when `--dir` is actually there — with no flag
// `dirAt` is -1 and the guard would otherwise swallow the first entry.
const groups = args.filter((arg, index) => !arg.startsWith('--') && (dirAt === -1 || index !== dirAt + 1));

async function gzipped(source) {
  const built = await esbuild.build({
    stdin: { contents: source, resolveDir, loader: 'js' },
    bundle: true,
    minify: true,
    format: 'esm',
    external: ['react', 'react-dom', 'react/jsx-runtime'],
    write: false,
  });

  return gzipSync(built.outputFiles[0].contents, { level: 9 }).length;
}

/** The default import, because that is what a consumer writes and what tree-shaking is measured against. */
const box = bare ? '' : "import Box from './dist/box.mjs';\n";
const baseline = await gzipped(`${box}console.log(${bare ? 1 : 'Box'});`);
console.log(`${(bare ? 'empty baseline' : 'baseline (Box)').padEnd(46)} ${baseline} B gz`);

for (const group of groups) {
  const entries = group.split('+').map((each) => (bare ? each : `./dist/components/${each}.mjs`));
  const source =
    box +
    entries.map((each, index) => `import * as C${index} from '${each}';`).join('\n') +
    `\nconsole.log(${bare ? '' : 'Box,'}${entries.map((_, index) => `C${index}`).join(',')});`;
  const size = (await gzipped(source)) - baseline;

  console.log(`${group.padEnd(46)} ${size} B gz  (${(size / 1000).toFixed(2)} KB)`);
}
