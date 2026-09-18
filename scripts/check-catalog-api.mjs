/**
 * Fails the build when the catalog manifest no longer matches the references it is generated from — a
 * prop added to a component, a sentence rewritten, a new semantic element. The manifest is *generated*:
 * run `npm run docs:catalog`, never edit `src/core/catalog/catalogManifest.ts`.
 * Run: npm run check:catalog
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { MANIFEST_FILE, buildCatalogManifest, formatManifest } from './catalogApi.mjs';

const ROOT = join(import.meta.dirname, '..');
const fix = process.argv.includes('--fix');

const manifest = buildCatalogManifest();
const document = await formatManifest(manifest);
const file = join(ROOT, MANIFEST_FILE);
const current = existsSync(file) ? readFileSync(file, 'utf8') : undefined;
const components = Object.keys(manifest.components);

// A component with neither props nor a slot is an entry a generator can name and do nothing with, which
// is worse than its absence: it would be offered and then produce an empty element.
const empty = components.filter((name) => {
  const entry = manifest.components[name];

  return !entry.slots.length && !Object.keys(entry.props).length && !entry.styled;
});

if (empty.length) {
  console.error(`\n✖ ${empty.length} catalog component(s) with no props, no slot and no style props: ${empty.join(', ')}\n`);
  process.exit(1);
}

if (document === current) {
  console.log(`✔ catalog manifest current: ${components.length} components, ${Object.keys(manifest.props).length} style props`);
} else if (fix) {
  writeFileSync(file, document);
  console.log(`✔ ${MANIFEST_FILE} written: ${components.length} components, ${Object.keys(manifest.props).length} style props`);
} else {
  console.error(`\n✖ ${MANIFEST_FILE} is ${current === undefined ? 'missing' : 'not what the references generate'}.`);
  console.error('Run npm run docs:catalog.\n');
  process.exit(1);
}
