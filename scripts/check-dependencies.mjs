// Fails if a published entry reaches a package outside the allow-list. The packages install nothing but their peers
// (D18), so a bare import of `@xyflow/react` or `recharts` from `src/` would be inlined by the build or break an install.
//
// Run: npm run check:boundaries
import { componentEntries, moduleGraph } from './moduleGraph.mjs';

const ENTRIES = ['box', 'rsc', 'ssg', 'core', 'a11y', 'anchor', 'catalog', 'spec', 'interop', 'analytics', 'date'].map((name) => `src/${name}.ts`);

const ALLOWED = /^(?:react|react-dom|@box-kite\/react|@box-kite\/core)(?:\/|$)/;

const files = [...ENTRIES, ...componentEntries().map((name) => `src/components/${name}.tsx`)];
const violations = new Set();

for (const entry of files) {
  for (const { path, specifier } of moduleGraph(entry).bare) {
    if (!ALLOWED.test(specifier)) violations.add(`${path}: imports '${specifier}' (reached from ${entry})`);
  }
}

if (violations.size) {
  console.error(`\n✖ A published entry imports a package that is not a peer — ${violations.size} violation(s):\n`);
  for (const v of violations) console.error(`  ${v}`);
  console.error('\nThe packages install only react and react-dom. Copy what you need, or keep the import in an example or the docs site.\n');
  process.exit(1);
}

console.log(`✔ ${files.length} published entries import nothing but react, react-dom and the library's own packages`);
