// @vitest-environment node
/**
 * The four properties of the committed agent files that `npm run check:agents` cannot see: it proves
 * the output matches its sources, not that the output is a usable skill. A dead reference link, a
 * reference nothing points at, a frontmatter field that fails an upload elsewhere, and the size that
 * makes progressive disclosure worth having are each a way for a green check to ship a bad skill.
 */
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CURSOR_FILE, MARKETPLACE_FILE, SKILL_DIRECTORY, SKILL_FILE, agentFile, marketplaceManifest } from './skill-docs.mjs';

const root = join(import.meta.dirname, '..');

/** Everything a client outside Claude Code accepts in a SKILL.md — anything else fails packaging. */
const SPEC_FIELDS = ['name', 'description', 'license', 'compatibility', 'metadata', 'allowed-tools'];

/** Claude Code's own guidance, and the reason the references exist: the body loads in full when used. */
const MAX_SKILL_LINES = 500;

const skill = await agentFile(SKILL_FILE);

describe('the skill', () => {
  it('points at every reference beside it, and at nothing else', () => {
    const linked = [...skill.matchAll(/\(references\/([\w.-]+)\)/g)].map(([, file]) => file);
    const onDisk = readdirSync(join(root, SKILL_DIRECTORY, 'references'));

    expect([...new Set(linked)].sort()).toEqual(onDisk.sort());
  });

  it('carries only the frontmatter every client accepts', () => {
    const [, frontmatter] = /^---\n([\s\S]*?)\n---/.exec(skill) ?? [];
    const keys = frontmatter.split('\n').flatMap((line) => /^([\w-]+):/.exec(line)?.slice(1, 2) ?? []);

    expect(keys).toContain('description');
    expect(keys.filter((key) => !SPEC_FIELDS.includes(key))).toEqual([]);
  });

  it('stays short enough that loading it costs little', () => {
    expect(skill.split('\n').length).toBeLessThan(MAX_SKILL_LINES);
  });
});

describe('the marketplace entry', () => {
  it('installs the skill in this repository and nothing else in .claude/skills', () => {
    const [plugin] = marketplaceManifest().plugins;

    expect(plugin.skills).toEqual([`./${SKILL_DIRECTORY}`]);
    expect(existsSync(join(root, SKILL_DIRECTORY, 'SKILL.md'))).toBe(true);

    // `strict: false` is what makes this entry the whole definition, so there is no plugin.json here.
    expect(plugin.strict).toBe(false);
    expect(existsSync(join(root, '.claude-plugin/plugin.json'))).toBe(false);
  });
});

describe('the Cursor rule', () => {
  it('is glob-attached rather than always on, and says what it is for', async () => {
    const [, frontmatter] = /^---\n([\s\S]*?)\n---/.exec(await agentFile(CURSOR_FILE)) ?? [];

    expect(frontmatter).toContain('alwaysApply: false');
    expect(/^globs: .*\*\*\/\*\.tsx/m.test(frontmatter)).toBe(true);
    expect(/^description: .+/m.test(frontmatter)).toBe(true);
  });
});

describe('every generated file', () => {
  it.each([SKILL_FILE, CURSOR_FILE, MARKETPLACE_FILE])('%s is committed', (file) => {
    expect(existsSync(join(root, file))).toBe(true);
  });
});
