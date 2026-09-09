/**
 * Fails the build when a component's API reference has drifted from the component: a prop with no prose
 * to hover, a `@keyboard` row no test drives, a documented component no page renders, or an
 * `api/components/*.json` older than the source. The JSON is *generated* — run
 * `npm run docs:components`, never edit it. Run: npm run check:components
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { API_DIR, COMPONENTS, buildComponentsApi, formatComponent } from './componentsApi.mjs';

const ROOT = join(import.meta.dirname, '..');
const COMPONENT_DIR = 'src/components';
const PAGES_DIR = 'pages/pages';
const fix = process.argv.includes('--fix');

/**
 * The key names a row can claim, and how a test spells them. A token that is not a key — "A printable
 * character", "Pointer leaves the trigger" — is prose about behaviour rather than a keystroke, so it is
 * skipped: this check proves a documented *key* is exercised somewhere, not that every row is.
 */
const KEY_ALIASES = {
  tab: ['tab'],
  enter: ['enter'],
  escape: ['escape'],
  space: ['space', "' '", '{ }'],
  home: ['home'],
  end: ['end'],
  pageup: ['pageup'],
  pagedown: ['pagedown'],
  f2: ['f2'],
  down: ['arrowdown', "'down'"],
  up: ['arrowup', "'up'"],
  left: ['arrowleft', "'left'"],
  right: ['arrowright', "'right'"],
  '↓': ['arrowdown', "'down'"],
  '↑': ['arrowup', "'up'"],
  '←': ['arrowleft', "'left'"],
  '→': ['arrowright', "'right'"],
};

/** Every test file that can be said to test one component: its own, and any inside a folder of its own. */
function testSources(file) {
  const base = basename(file, '.tsx');
  const files = readdirSync(join(ROOT, COMPONENT_DIR))
    .filter((name) => name.includes('.test.') && name.startsWith(base))
    .map((name) => join(COMPONENT_DIR, name));

  const folder = join(COMPONENT_DIR, base);

  if (existsSync(join(ROOT, folder)) && statSync(join(ROOT, folder)).isDirectory()) {
    // Relative throughout, because every path here is read against ROOT.
    const walk = (directory) => {
      for (const entry of readdirSync(join(ROOT, directory), { withFileTypes: true })) {
        const path = join(directory, entry.name);

        if (entry.isDirectory()) walk(path);
        else if (entry.name.includes('.test.')) files.push(path);
      }
    };

    walk(folder);
  }

  return files.map((path) => readFileSync(join(ROOT, path), 'utf8').toLowerCase()).join('\n');
}

/** The keys a row names that no test presses — the row is documentation of something unproven. */
function untestedKeys(rows, tests) {
  const missing = [];

  for (const { keys } of rows) {
    for (const token of keys.split(/[/,+]/)) {
      const aliases =
        KEY_ALIASES[
          token
            .trim()
            .toLowerCase()
            .replace(/\s*\(.*\)$/, '')
        ];

      if (aliases && !aliases.some((alias) => tests.includes(alias))) missing.push(token.trim());
    }
  }

  return [...new Set(missing)];
}

const pageSources = readdirSync(join(ROOT, PAGES_DIR))
  .filter((name) => name.endsWith('.tsx'))
  .map((name) => readFileSync(join(ROOT, PAGES_DIR, name), 'utf8'))
  .join('\n');

const api = buildComponentsApi();
const undocumented = [];
const untested = [];
const unrendered = [];
const written = [];
const stale = [];

for (const entry of COMPONENTS) {
  const component = api.get(entry.slug);
  const props = [...component.props, ...component.parts.flatMap((part) => part.props)];

  for (const prop of props) {
    if (!prop.description) undocumented.push(`${component.name}.${prop.name}`);
  }

  if (component.keyboard.length) {
    const missing = untestedKeys(component.keyboard, testSources(entry.file));

    if (missing.length) untested.push(`${component.name}: ${missing.join(', ')}`);
  }

  if (!pageSources.includes(`components/${entry.slug}.json`)) unrendered.push(`${component.name} (${component.route})`);

  const file = join(ROOT, API_DIR, `${entry.slug}.json`);
  const document = await formatComponent(component);
  const current = existsSync(file) ? readFileSync(file, 'utf8') : undefined;

  if (document === current) continue;

  if (fix) {
    mkdirSync(join(ROOT, API_DIR), { recursive: true });
    writeFileSync(file, document);
    written.push(entry.slug);
  } else {
    stale.push(`${API_DIR}/${entry.slug}.json is ${current === undefined ? 'missing' : 'not what the source generates'}`);
  }
}

// A component that leaves the config leaves its file behind, and a stale reference is worse than none.
const expected = new Set(COMPONENTS.map((entry) => `${entry.slug}.json`));
const orphans = existsSync(join(ROOT, API_DIR)) ? readdirSync(join(ROOT, API_DIR)).filter((name) => !expected.has(name)) : [];

if (fix) {
  for (const orphan of orphans) rmSync(join(ROOT, API_DIR, orphan));
} else if (orphans.length) {
  stale.push(`${API_DIR} holds ${orphans.length} file(s) no component generates: ${orphans.join(', ')}`);
}

const problems = [
  undocumented.length && `  ${undocumented.length} prop(s) with no JSDoc to hover: ${undocumented.join(', ')}`,
  untested.length && `  ${untested.length} component(s) documenting a key no test presses:\n    ${untested.join('\n    ')}`,
  unrendered.length && `  ${unrendered.length} component(s) whose page renders no reference: ${unrendered.join(', ')}`,
  ...stale.map((line) => `  ${line}`),
].filter(Boolean);

if (fix) {
  console.log(`✔ ${COMPONENTS.length} components: ${written.length} file(s) written, ${orphans.length} removed`);

  // Prose, a test and a page are not things this pass can write, so it says so and fails.
  if (problems.length) {
    console.error(`\n✖ The reference is generated, but this is not:\n\n${problems.join('\n')}\n`);
    process.exit(1);
  }
} else if (problems.length) {
  console.error(`\n✖ The component reference is out of date:\n\n${problems.join('\n')}\n`);
  console.error('Run npm run docs:components to write the reference; prose, tests and pages are yours to write.\n');
  process.exit(1);
} else {
  console.log(`✔ ${COMPONENTS.length} components: every prop documented, every key tested, every page rendering its reference`);
}
