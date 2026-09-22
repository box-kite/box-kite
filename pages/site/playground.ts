/**
 * What the site knows about the playground without loading it. `<Code>` is on every docs page and the
 * playground pulls in a compiler and every component the library ships, so the link on a block is decided
 * here — from the snippet's text and the names it imports, nothing else.
 */
import { SNIPPET_SCOPE } from '../../scripts/snippetScope.mjs';

export const PLAYGROUND_PATH = '/playground';

/** The query parameter that carries a snippet, so a playground URL is the whole share. */
export const SNIPPET_PARAM = 'code';

/**
 * The lucide icons a docs snippet writes. Third-party components, so deliberately not in the shared record:
 * the checker would stop asking a snippet to show the import a reader copying it needs.
 */
export const SNIPPET_ICONS = ['ArrowRight', 'Compass', 'Download', 'Heart', 'Search', 'Star', 'Sun', 'Trash2'] as const;

/** Every name the playground can hand a snippet. */
export function providedNames(): ReadonlySet<string> {
  return new Set([...Object.keys(SNIPPET_SCOPE), ...SNIPPET_ICONS]);
}

/** UTF-8 through base64url, so a snippet survives a URL unencoded by anything that rewrites `+` or `/`. */
export function encodeSnippet(source: string): string {
  const bytes = new TextEncoder().encode(source);
  let binary = '';

  for (const byte of bytes) binary += String.fromCharCode(byte);

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** The snippet a URL carries, or null when there is none or it did not survive the trip. */
export function decodeSnippet(value: string | null): string | null {
  if (!value) return null;

  try {
    const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/'));

    return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
  } catch {
    return null;
  }
}

export function playgroundHref(source: string): string {
  return `${PLAYGROUND_PATH}?${SNIPPET_PARAM}=${encodeSnippet(source)}`;
}

/** A top-level `import`, which a snippet writes for the names the docs want a reader to see the source of. */
const IMPORT_LINE = /^import\s+(?:type\s+)?(.+?)\s+from\s/;

export function isImportLine(line: string): boolean {
  return IMPORT_LINE.test(line);
}

/** `import Box from '…'` / `import { H1, P as Para } from '…'` — the names, as the snippet binds them. */
export function importedNames(source: string): string[] {
  return source.split('\n').flatMap((line) => {
    const clause = IMPORT_LINE.exec(line);

    if (!clause) return [];

    return clause[1]
      .split(/[{},]/)
      .map(
        (part) =>
          part
            .trim()
            .replace(/^\*\s+as\s+/, '')
            .split(/\s+as\s+/)
            .pop()
            ?.trim() ?? '',
      )
      .filter(Boolean);
  });
}

/**
 * JSX written at the top level is the demo, and a component declared with no props is one the playground can
 * render on its own — the two shapes `playgroundSource.ts` looks for, asked here without a parse.
 */
const SHOWS_SOMETHING = /^[<{]/m;
const DECLARES_COMPONENT = /^(?:export\s+default\s+)?(?:function\s+[A-Z]\w*\s*\(\s*\)|(?:const|let)\s+[A-Z]\w*\s*=\s*\(\s*\)\s*=>)/m;

/** What a `<Code>` block knows about itself, which is everything the decision needs. */
export interface SnippetBlock {
  language: string;
  /** `false` is the block's own word for "not compilable code" — an outline, two files at once, an ellipsis. */
  check?: boolean;
}

/**
 * Whether a block is worth offering the link on. Cheap on purpose — `<Code>` renders on every page and
 * cannot load the compiler to find out — so it asks the three questions that decide it in practice: has the
 * block opted out, is there anything to render, and can every name it imports be answered. A snippet that
 * passes and then fails to compile says so in the playground, which is where a reader can do something
 * about it.
 */
export function canOpenInPlayground(source: string, { language, check }: SnippetBlock): boolean {
  if (check === false) return false;
  if (language !== 'jsx' && language !== 'javascript') return false;
  if (!SHOWS_SOMETHING.test(source) && !DECLARES_COMPONENT.test(source)) return false;

  const provided = providedNames();

  return importedNames(source).every((name) => provided.has(name));
}
