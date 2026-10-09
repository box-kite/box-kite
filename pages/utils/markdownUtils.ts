import { marked } from 'marked';

/** The `##` headings of a document, for the table of contents. */
export function headings(markdown: string): { id: string; label: string }[] {
  return marked
    .lexer(markdown)
    .flatMap((token) => (token.type === 'heading' && token.depth === 2 ? [{ id: slugify(token.text), label: plainText(token.text) }] : []));
}

/** GitHub's heading anchors — lowercase, punctuation gone, spaces to hyphens — so `[…](#the-rename)` in the file resolves here too. */
export function slugify(text: string): string {
  return plainText(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .trim()
    .replace(/\s+/g, '-');
}

/** Emphasis and code markers taken off, for a label or an id. */
export function plainText(text: string): string {
  return text.replace(/[`*]/g, '');
}

export interface DocumentHeader {
  /** The H1, or `''` when the file opens without one. */
  title: string;
  /** The italic line under the H1, split on ` · ` — a release's date and links, a post's date and level. */
  meta: string[];
  /** The intro's first sentence with the emphasis markers taken off, or `''` when there is no intro. */
  sentence: string;
}

/** The header the release notes and the blog posts share: an H1, an italic meta line, then the intro. */
export function documentHeader(markdown: string): DocumentHeader {
  const lines = markdown.split('\n');
  const title = lines[0]?.startsWith('# ') ? lines[0].slice(2).trim() : '';
  const metaAt = lines.findIndex((line, index) => index > 0 && /^_.*_\s*$/.test(line));
  const meta =
    metaAt === -1
      ? []
      : lines[metaAt]
          .replace(/^_|_\s*$/g, '')
          .split(' · ')
          .map((cell) => cell.trim());

  const intro: string[] = [];
  for (const line of lines.slice(metaAt + 1)) {
    if (/^(#|```)/.test(line)) break;
    if (line.trim() === '') {
      if (intro.length) break;
      continue;
    }
    intro.push(line);
  }

  const plain = intro
    .join(' ')
    .replace(/\*\*|__|`/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();

  return { title, meta, sentence: plain.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? plain };
}

/** A meta description is cut at about 160 characters by a search result, so cut it here, visibly. */
export function asDescription(text: string): string {
  return text.length > 160 ? `${text.slice(0, 157).trimEnd()}…` : text;
}
