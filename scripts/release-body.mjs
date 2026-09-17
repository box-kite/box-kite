// The body of one GitHub Release, built from releases/<version>.md.
//
// Run: node scripts/release-body.mjs <version> [> body.md]
//
// A release body is capped at 125,000 characters by the API, and a major's notes outgrew that at
// 2.0.0 (130,296) — the release was refused, so the tag existed, the release did not and nothing
// reached npm. Over the cap the cut is structural rather than a truncation: the detail sections go
// and Highlights, Breaking changes and Fixes stay, because those are what a reader needs from a
// release page and the last two would be the first casualties of a cut from the end.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = join(import.meta.dirname, '..');
const SITE = 'https://www.box-kite.dev/releases';

/** GitHub's own limit. The body is cut to fit under it, never sent in the hope that it does. */
export const LIMIT = 125_000;

/** The sections a cut body keeps, in the order they appear. Everything else is detail the site carries. */
const KEEP = ['Highlights', 'Breaking changes', 'Fixes'];

/** A `## ` section: its heading text and everything under it, up to the next heading. */
function sections(body) {
  const parts = body.split(/^## /m);
  const preamble = parts.shift();
  return {
    preamble,
    sections: parts.map((part) => {
      const [heading, ...rest] = part.split('\n');
      return { heading: heading.trim(), body: rest.join('\n').trimEnd() };
    }),
  };
}

/**
 * An in-page `#anchor` only resolves while the section it names is in the body, so a cut rewrites
 * every one of them to the same anchor on the site — which carries the whole file either way.
 */
function absoluteAnchors(text, version) {
  return text.replace(/\]\(#([^)\s]+)\)/g, `](${SITE}/${version}/#$1)`);
}

/** The notes with the H1 dropped: the release title already says the version. */
function withoutTitle(notes) {
  return notes.replace(/^# .*\n/, '').replace(/^\n+/, '');
}

/**
 * The body for `gh release create`. `cut` says whether the detail sections were dropped, so the
 * caller can log it; the pointer at the top is the one thing the notes file cannot say about itself.
 */
export function releaseBody(notes, { version, limit = LIMIT } = {}) {
  const pointer = `_Read these notes on [box-kite.dev](${SITE}/${version}/)._`;
  const whole = `${pointer}\n\n${withoutTitle(notes)}`;
  if (whole.length <= limit) return { body: whole, cut: false };

  const { preamble, sections: all } = sections(withoutTitle(notes));
  const kept = KEEP.flatMap((heading) => all.filter((section) => section.heading === heading));
  const dropped = all.length - kept.length;
  const note =
    dropped > 0
      ? `_${dropped} section${dropped === 1 ? '' : 's'} of detail ${dropped === 1 ? 'is' : 'are'} too long for a GitHub release — [read the full notes on box-kite.dev](${SITE}/${version}/)._`
      : '';

  const body = absoluteAnchors(
    [
      pointer,
      '',
      preamble.trim(),
      ...(note ? ['', note] : []),
      ...kept.flatMap(({ heading, body }) => ['', `## ${heading}`, '', body.trim()]),
      '',
    ].join('\n'),
    version,
  );
  // A kept section can in principle still overflow on its own, and a refused body is what this exists
  // to prevent — so the last resort is a cut on a line boundary, with the pointer already at the top.
  if (body.length > limit) {
    const lines = body.slice(0, limit - 200).split('\n');
    lines.pop();
    return { body: `${lines.join('\n')}\n\n---\n\n[Read the full notes on box-kite.dev](${SITE}/${version}/).\n`, cut: true };
  }
  return { body, cut: true };
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const version = process.argv[2];
  if (!version) {
    console.error('usage: node scripts/release-body.mjs <version>');
    process.exit(1);
  }
  const notes = readFileSync(join(root, 'releases', `${version}.md`), 'utf8');
  const { body, cut } = releaseBody(notes, { version });
  if (cut) console.error(`the notes are over GitHub's ${LIMIT.toLocaleString('en-GB')}-character release body — kept ${KEEP.join(', ')}`);
  process.stdout.write(body);
}
