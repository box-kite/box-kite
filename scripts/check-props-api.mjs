/**
 * Fails the build when the prop reference has drifted from the props: a prop with no prose to hover, an
 * `@example` that no longer matches the CSS the engine writes for it, or an `api/props.json` older than
 * the registry. The examples are *generated* — a divider changed here changes 45 comments, so the fix is
 * `npm run docs:props`, never an edit by hand. Run: npm run check:props
 *
 * It also writes `api/propCount.json`, the count alone, for a page that cannot afford the whole reference
 * (the homepage) — so no file a person edits ever states the figure.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { API_FILE, REGISTRY, buildPropsApi, formatApi } from './propsApi.mjs';

const ROOT = join(import.meta.dirname, '..');
const COUNT_FILE = 'api/propCount.json';
const fix = process.argv.includes('--fix');

/** One `@example` line in a JSDoc block, at the entry's own indentation. */
function tagLine(indent, example) {
  return `${indent} * @example ${example}`;
}

/**
 * The prop's JSDoc with its example current. A single-line comment becomes a block, because a tag on the
 * same line as the prose reads as prose; everything the comment already said is kept byte for byte.
 */
function rewriteComment(raw, indent, example) {
  const lines = raw.split('\n');

  if (lines.length === 1) return ['/**', `${indent} * ${raw.slice(3, -2).trim()}`, tagLine(indent, example), `${indent} */`].join('\n');

  const existing = lines.findIndex((line) => /^\s*\*\s*@example\b/.test(line));

  if (existing >= 0) lines[existing] = tagLine(indent, example);
  else lines.splice(lines.length - 1, 0, tagLine(indent, example));

  return lines.join('\n');
}

const api = await buildPropsApi();
const undocumented = [];
const stale = [];
const edits = [];

for (const prop of api.props) {
  const comment = api.comments.get(prop.name);

  if (!comment.description || !comment.span) {
    undocumented.push(prop.name);
    continue;
  }

  if (comment.examples.length === 1 && comment.examples[0] === prop.text) continue;

  stale.push({ name: prop.name, was: comment.examples, is: prop.text });
  edits.push({ ...comment.span, text: rewriteComment(api.text.slice(comment.span.pos, comment.span.end), comment.span.indent, prop.text) });
}

/** A generated file as it stands on disk, or undefined when there is none yet. */
function onDisk(path) {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    return undefined;
  }
}

const document = await formatApi(api);
const file = join(ROOT, API_FILE);
const current = onDisk(file);
const countDocument = `${JSON.stringify({ propCount: api.propCount }, null, 2)}\n`;
const countFile = join(ROOT, COUNT_FILE);
const countCurrent = onDisk(countFile);

if (fix) {
  // Back to front, so an earlier comment's replacement cannot move a later one's span.
  let text = api.text;

  for (const edit of [...edits].sort((a, b) => b.pos - a.pos)) text = text.slice(0, edit.pos) + edit.text + text.slice(edit.end);

  if (text !== api.text) writeFileSync(join(ROOT, REGISTRY), text);

  if (document !== current) {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, document);
  }

  if (countDocument !== countCurrent) writeFileSync(countFile, countDocument);

  console.log(
    `✔ ${api.propCount} props: ${stale.length} example(s) written, ${API_FILE} ${document === current ? 'unchanged' : 'updated'}`,
  );

  if (undocumented.length) {
    console.error(`\n✖ ${undocumented.length} prop(s) have no JSDoc, and prose is not something this pass can write:`);
    console.error(`  ${undocumented.join(', ')}\n`);
    process.exit(1);
  }
} else if (undocumented.length || stale.length || document !== current || countDocument !== countCurrent) {
  console.error(`\n✖ The prop reference is out of date:\n`);

  if (undocumented.length) console.error(`  ${undocumented.length} prop(s) with no JSDoc to hover: ${undocumented.join(', ')}\n`);

  for (const { name, was, is } of stale) {
    console.error(`  ${name}  ${was.length ? `has  @example ${was.join(' / ')}` : 'has no @example'}`);
    console.error(`  ${' '.repeat(name.length)}  wants @example ${is}\n`);
  }

  if (document !== current) console.error(`  ${API_FILE} is ${current === undefined ? 'missing' : 'not what the registry generates'}\n`);
  if (countDocument !== countCurrent) console.error(`  ${COUNT_FILE} does not hold the registry's count\n`);
  console.error('Run npm run docs:props to write the examples and the reference; prose is yours to write.\n');
  process.exit(1);
} else {
  console.log(`✔ ${api.propCount} props: every one documented, its example measured, and ${API_FILE} current`);
}
