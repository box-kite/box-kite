// What the sources say about themselves, for every agent-facing file generated from them — `llms.txt`
// and the markdown mirror (AI2), the skill and the Cursor rule (AI3): the facts `AGENTS.md` leads
// with, the rules themselves, and every API that still works under a name its own doc comment says
// not to write. All read rather than restated — a second copy would be wrong within a release, and
// these are exactly the files an agent believes.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PACKAGE_NAME, componentEntries } from './moduleGraph.mjs';

const root = join(import.meta.dirname, '..');

const read = (file) => readFileSync(join(root, file), 'utf8');

/** The heading of the block `AGENTS.md` opens with, whose bullets are the four facts. */
const FACTS_HEADING = '## This library is not in your training data';

/** Fewer than this and the block was renamed or emptied, which is worth a failed build. */
const MIN_FACTS = 4;

/**
 * The lead block's bullets, verbatim. They are the one statement of the per-prop dividers, the
 * missing `style` attribute, where the element comes from and where attributes go — written once, in
 * the file every agent reads first.
 */
export function priorFacts() {
  const agents = read('AGENTS.md');
  const start = agents.indexOf(FACTS_HEADING);

  if (start < 0) throw new Error(`AGENTS.md no longer has a "${FACTS_HEADING}" section: llms.txt is built from its bullets.`);

  const section = agents.slice(start).split('\n## ')[0];
  const facts = section
    .split('\n')
    .filter((line) => line.startsWith('- '))
    .map((line) => line.slice(2).trim());

  if (facts.length < MIN_FACTS) {
    throw new Error(`AGENTS.md's lead block lists ${facts.length} facts and had ${MIN_FACTS}: llms.txt states them from there.`);
  }

  return facts;
}

const RULES_FILE = '.claude/rules/box-kite-rules.md';

/** The rules file's own closing line, which every file quoting the rules replaces with its own. */
const RULES_REFERENCE = /^Full reference:.*$/m;

/**
 * The rules, ready to inline somewhere else: the frontmatter and the H1 go, because they belong to
 * the file rather than to a section quoting it, and the closing "Full reference" line becomes the one
 * a reader of *that* file can actually open. There are three of those files now (the tarball's
 * `AGENTS.md`, the skill, the Cursor rule), so a strip that silently matched nothing would put the
 * repository's own paths in front of a consumer.
 */
export function rulesBody(reference) {
  const body = read(RULES_FILE)
    .replace(/^---\n[\s\S]*?\n---\n/, '')
    .replace(/^#\s+.*\n/m, '');

  if (!RULES_REFERENCE.test(body)) {
    throw new Error(`${RULES_FILE} no longer ends with a "Full reference:" line: every file quoting the rules rewrites it.`);
  }

  return body.replace(RULES_REFERENCE, reference).trim();
}

/** A `@deprecated` tag's text, as one sentence of prose. */
function firstSentence(text) {
  const prose = text
    .replace(/^\s*\*\s?/gm, '')
    .replace(/\s+/g, ' ')
    .trim();

  return /^.*?[.!?](?=\s|$)/.exec(prose)?.[0] ?? prose;
}

/**
 * The props and keys whose doc comment carries `@deprecated`, with the name each one names instead.
 * Scanned line by line rather than with one regex over the file: the tag sits in a single-line JSDoc
 * above the key it belongs to, and the name is the identifier that opens the next line.
 */
function deprecatedProps() {
  const lines = read('src/core/boxStyles.ts').split('\n');
  const found = [];

  lines.forEach((line, index) => {
    if (!line.includes('@deprecated')) return;

    // The tag's own text, then the identifier the comment sits above.
    let end = index;
    while (end < lines.length && !lines[end].includes('*/')) end += 1;

    const text = lines
      .slice(index, end + 1)
      .join(' ')
      .replace(/^[\s*/]*@deprecated/, '')
      .replace(/\*\/.*$/, '');
    const name = /^\s*([A-Za-z]\w*)\s*[:?]/.exec(lines[end + 1] ?? '')?.[1];

    if (name) found.push({ name, instead: firstSentence(text) });
  });

  return found;
}

/** Every component entry whose source says it is deprecated, named the way a consumer imports it. */
function deprecatedComponents() {
  return componentEntries().flatMap((entry) => {
    const source = read(`src/components/${entry}.tsx`);
    const tag = source.indexOf('@deprecated');

    if (tag < 0) return [];

    const text = source.slice(tag + '@deprecated'.length, source.indexOf('*/', tag));

    return [{ name: `${PACKAGE_NAME}/components/${entry}`, instead: firstSentence(text) }];
  });
}

/**
 * Everything that still works under an older name, props first. `llms.txt` states these because a
 * model's training data is full of the older spellings and nothing on the page says they are older.
 */
export function deprecations() {
  const found = [...deprecatedProps(), ...deprecatedComponents()];

  if (found.length === 0) {
    throw new Error('No @deprecated API found in src/: the scan moved, and llms.txt would claim there are none.');
  }

  return found;
}
