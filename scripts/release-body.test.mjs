// @vitest-environment node
/**
 * The release body is the one artefact whose failure mode is silent twice over: GitHub refuses it with a
 * 422 after the tag has been pushed, and the notes only outgrow the cap on a major — so the path that
 * matters is exercised once a year, by hand, on the release that can least afford it (bug #173).
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LIMIT, releaseBody } from './release-body.mjs';

const root = join(import.meta.dirname, '..');
const notesFor = (version) => readFileSync(join(root, 'releases', `${version}.md`), 'utf8');

/** A notes file shaped like a real one, with `sections` detail sections between Highlights and the tail. */
function notes(sections, { paragraph = 'x'.repeat(200) } = {}) {
  const detail = Array.from({ length: sections }, (_, i) => `## Detail ${i}\n\n${paragraph}\n`);
  return [
    '# Box Kite 9.0.0',
    '',
    '_9 September 2026 · [npm](https://www.npmjs.com/package/@box-kite/react)_',
    '',
    'The intro sentence.',
    '',
    '## Highlights',
    '',
    ...Array.from({ length: sections }, (_, i) => `- **[Detail ${i}](#detail-${i})** — why it matters.`),
    '',
    ...detail,
    '## Breaking changes',
    '',
    '- `Menu` is renamed.',
    '',
    '## Fixes',
    '',
    '- **A thing was wrong.** It is not now.',
    '',
  ].join('\n');
}

describe('releaseBody', () => {
  it('keeps the whole file when it fits, minus the H1 the release title repeats', () => {
    const { body, cut } = releaseBody(notes(2), { version: '9.0.0' });
    expect(cut).toBe(false);
    expect(body).not.toMatch(/^# /m);
    expect(body).toContain('## Detail 0');
    expect(body).toContain('## Fixes');
    expect(body.split('\n')[0]).toBe('_Read these notes on [box-kite.dev](https://www.box-kite.dev/releases/9.0.0/)._');
  });

  it('cuts the detail and keeps the three sections a reader needs', () => {
    const { body, cut } = releaseBody(notes(800), { version: '9.0.0' });
    expect(cut).toBe(true);
    expect(body.length).toBeLessThanOrEqual(LIMIT);
    expect(body.match(/^## .*/gm)).toEqual(['## Highlights', '## Breaking changes', '## Fixes']);
    // The two a major most needs are the last two in the file, so a cut from the end loses exactly them.
    expect(body).toContain('`Menu` is renamed.');
    expect(body).toContain('A thing was wrong.');
    expect(body).toContain('The intro sentence.');
  });

  it('rewrites the anchors the cut just broke, since the sections they name are gone', () => {
    const { body } = releaseBody(notes(800), { version: '9.0.0' });
    expect(body).not.toMatch(/\]\(#/);
    expect(body).toContain('](https://www.box-kite.dev/releases/9.0.0/#detail-0)');
  });

  it('says how much it dropped, so the release page is not silently short', () => {
    const { body } = releaseBody(notes(800), { version: '9.0.0' });
    expect(body).toContain('800 sections of detail are too long for a GitHub release');
  });

  it('still fits when Highlights alone is over the cap', () => {
    const { body, cut } = releaseBody(notes(4000), { version: '9.0.0' });
    expect(cut).toBe(true);
    expect(body.length).toBeLessThanOrEqual(LIMIT);
    expect(body).toContain('[Read the full notes on box-kite.dev](https://www.box-kite.dev/releases/9.0.0/).');
  });

  // The releases that shipped: 1.0.0 fits and must stay whole, 2.0.0 is the one that took the 422.
  it.each(readdirSync(join(root, 'releases')).filter((file) => file !== 'next.md'))('%s fits in a GitHub release body', (file) => {
    const version = file.replace(/\.md$/, '');
    const { body } = releaseBody(notesFor(version), { version });
    expect(body.length).toBeLessThanOrEqual(LIMIT);
  });

  it('cuts 2.0.0, whose notes are what found this, and leaves 1.0.0 whole', () => {
    expect(releaseBody(notesFor('2.0.0'), { version: '2.0.0' }).cut).toBe(true);
    expect(releaseBody(notesFor('1.0.0'), { version: '1.0.0' }).cut).toBe(false);
  });
});
