/**
 * Fails the build when a committed agent file has drifted from what generates it: the skill, the
 * Cursor rule and the marketplace entry are written from the rules file, `api/props.json`, `AGENTS.md`
 * and the `@deprecated` tags, so an edit by hand is a claim nothing holds up. The fix is
 * `npm run docs:agents`; the prose to change is in the source, not in the output.
 *
 * Run: npm run check:agents · npm run docs:agents (--fix)
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { SKILL_DIRECTORY, generatedAgentFiles } from './skill-docs.mjs';

const ROOT = join(import.meta.dirname, '..');
const fix = process.argv.includes('--fix');

/** Under this the generator found no rules, no facts or no props, and the file says nothing at all. */
const MIN_BYTES = 500;

const current = (file) => {
  try {
    return readFileSync(join(ROOT, file), 'utf8');
  } catch {
    return undefined;
  }
};

const files = await generatedAgentFiles();
const empty = files.filter(({ content }) => content.trim().length < MIN_BYTES);
const stale = files.filter(({ file, content }) => content !== current(file));

if (empty.length) {
  console.error(`\n✖ ${empty.map(({ file }) => file).join(', ')} generated almost nothing — a source moved or is empty.\n`);
  process.exit(1);
}

if (fix) {
  for (const { file, content } of stale) {
    mkdirSync(join(ROOT, dirname(file)), { recursive: true });
    writeFileSync(join(ROOT, file), content);
  }

  const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;

  for (const { file, content } of files) console.log(`  ${file.padEnd(40)} ${kb(content.length).padStart(9)}`);

  console.log(`\n✔ ${files.length} agent files, ${stale.length} written. The references beside the skill are prose, not generated.`);
} else if (stale.length) {
  console.error(`\n✖ ${stale.length} committed agent file(s) are not what their sources generate:\n`);

  for (const { file } of stale) console.error(`  ${file}  ${current(file) === undefined ? 'is missing' : 'has been edited by hand'}`);

  console.error(
    `\nRun npm run docs:agents. To change what they say, change the source: .claude/rules/box-kite-rules.md, the lead` +
      ` block of AGENTS.md, ${SKILL_DIRECTORY}/references/, or scripts/skill-docs.mjs for its own prose.\n`,
  );
  process.exit(1);
} else {
  console.log(`✔ ${files.length} agent files current: the skill, the Cursor rule and the marketplace entry`);
}
