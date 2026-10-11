/**
 * Ctrl+S in the playground: the snippet through Prettier, read the way the compiler reads it (`playgroundSource.ts`)
 * — the setup as a module and the demo as the children of a fragment. As one program, bare JSX came back as
 * `;<Box>`, a leading `{/* … *\/}` became a block statement and `const x = 1` above an element did not parse.
 */

/** Prettier on one piece of code, already configured — injected, so the tests run the real one. */
export type FormatCode = (code: string) => Promise<string>;

/** The demo, formatted as the children of a fragment and given back without it. */
async function formatChildren(render: string, format: FormatCode): Promise<string> {
  const printed = (await format(`<>\n${render}\n</>`)).trim().replace(/^;/, '').replace(/;$/, '');
  if (!printed.startsWith('<>') || !printed.endsWith('</>')) throw new Error('Not a fragment');

  const inner = printed.slice(2, -3);
  if (!inner.includes('\n')) return inner.trim();

  return inner
    .replace(/^\n/, '')
    .replace(/\n$/, '')
    .split('\n')
    .map((line) => line.replace(/^ {2}/, ''))
    .join('\n');
}

/** The snippet, formatted — or null when no reading of it parses, which leaves the reader's text alone. */
export async function formatSnippet(source: string, format: FormatCode): Promise<string | null> {
  const lines = source.split('\n');
  // Where the demo may start: a column-0 element or expression, the boundaries the compiler tries too.
  const boundaries = lines.flatMap((line, index) => (/^[<{]/.test(line) ? [index] : []));

  for (const index of boundaries) {
    try {
      const setup = lines.slice(0, index).join('\n').trim();
      const children = await formatChildren(lines.slice(index).join('\n'), format);
      const head = setup ? (await format(setup)).trim() : '';

      return [head, children].filter(Boolean).join('\n\n');
    } catch {
      // Not this boundary: the element it starts may be the tail of an expression above it.
    }
  }

  try {
    return (await format(source)).trim();
  } catch {
    return null;
  }
}

/**
 * Where the caret goes once the text around it is reformatted: after as many visible characters as it was
 * after before. Formatting moves whitespace and little else, so that is the same place in the code.
 */
export function caretAfterFormat(before: string, caret: number, after: string): number {
  let visible = before.slice(0, caret).replace(/\s/g, '').length;
  if (!visible) return 0;

  for (let index = 0; index < after.length; index += 1) {
    if (!/\s/.test(after[index]) && --visible === 0) return index + 1;
  }

  return after.length;
}

/** The playground's own settings: the repo's, at a width the editor shows without scrolling. */
const OPTIONS = { parser: 'babel-ts', printWidth: 80, singleQuote: true, trailingComma: 'all' } as const;

let loading: Promise<FormatCode> | null = null;

/** Prettier and the parser for JSX and TypeScript, fetched on the first format and never with the page. */
function loadPrettier(): Promise<FormatCode> {
  loading ??= Promise.all([import('prettier/standalone'), import('prettier/plugins/babel'), import('prettier/plugins/estree')]).then(
    ([prettier, babel, estree]) =>
      (code: string) =>
        prettier.format(code, { ...OPTIONS, plugins: [babel, estree] }),
    (error: unknown) => {
      // A chunk that failed to load is not cached, so the next Ctrl+S asks for it again.
      loading = null;
      throw error;
    },
  );

  return loading;
}

export default async function formatPlaygroundSnippet(source: string): Promise<string | null> {
  return formatSnippet(source, await loadPrettier());
}
