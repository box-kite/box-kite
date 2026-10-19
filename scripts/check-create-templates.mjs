// Fails when a template `npm create @box-kite` writes no longer matches what it is generated from: a site design,
// or the TypeScript file a JavaScript one is the twin of.
//
// Run: npm run check:create · npm run docs:create (rewrite them)
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, relative } from 'node:path';
import { ROOT, generatedFiles } from './createTemplates.mjs';

const fix = process.argv.includes('--fix');
const stale = [];

for (const [path, source] of Object.entries(await generatedFiles())) {
  let current = null;
  try {
    current = readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
  } catch {
    // Not written yet: stale, and `--fix` writes it.
  }
  if (current === source) continue;
  if (fix) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, source);
  }
  else stale.push(relative(ROOT, path));
}

if (stale.length) {
  console.error(`\n✖ ${stale.join(', ')} no longer match what they are generated from. Run \`npm run docs:create\`.\n`);
  process.exit(1);
}

console.log(fix ? '✓ create templates written' : '✓ create templates are current');
