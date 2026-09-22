import { join } from 'node:path';
import { transform } from 'sucrase';
import { describe, expect, it } from 'vitest';
import { collectDocsSnippets, DocsSnippet } from '../../scripts/docsSnippets.mjs';
import { SNIPPET_SCOPE } from '../../scripts/snippetScope.mjs';
import {
  canOpenInPlayground,
  decodeSnippet,
  encodeSnippet,
  importedNames,
  playgroundHref,
  providedNames,
  SNIPPET_ICONS,
  SNIPPET_PARAM,
} from './playground';
import { iconNames, unresolvableSpecifiers } from './playgroundScope';
import type { PlaygroundScope } from './playgroundScope';
import playgroundModule, { compileSnippet } from './playgroundSource';

const root = join(import.meta.dirname, '..', '..');

/** Languages the playground has no compiler for, which is what the docs checker skips too. */
const NOT_TYPESCRIPT = new Set(['shell', 'css', 'json']);

/**
 * Every name present, and nothing that renders. This measures the judgement — the split, the transform and
 * the evaluation — without loading the library, which is the part that rots when a page is edited.
 */
const scope: PlaygroundScope = {
  values: Object.fromEntries([...Object.keys(SNIPPET_SCOPE), ...providedNames()].map((name) => [name, () => null])),
  transform: (tsx) => transform(tsx, { transforms: ['jsx', 'typescript'], production: true }).code,
};

const check = (body: string) => {
  try {
    scope.transform(`const __S = () => {\n${body}\n};`);

    return null;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
};

/** The blocks with a snippet in them, as `<Code>` wrote it — the same blocks `npm run check:docs` compiles. */
const snippets: DocsSnippet[] = collectDocsSnippets(root).filter(
  (snippet): snippet is DocsSnippet & { code: string } => snippet.code !== undefined && !NOT_TYPESCRIPT.has(snippet.language),
);

const where = (snippet: DocsSnippet) => `${snippet.path}:${snippet.line}`;

describe('the docs corpus', () => {
  it('has snippets to check', () => {
    expect(snippets.length).toBeGreaterThan(250);
  });

  /** `check={false}` is the block's own word for code that was never meant to compile, so it is excluded
   * here for the same reason `npm run check:docs` excludes it. */
  it('compiles every one of them, or says it has nothing to render', () => {
    const failed = snippets
      .filter((snippet) => snippet.check)
      .map((snippet) => [where(snippet), compileSnippet(snippet.code!, scope).error] as const)
      .filter(([, error]) => error);

    expect(failed).toEqual([]);
  });

  /**
   * The link on a `<Code>` block is decided without the compiler — it is on every page and cannot load one —
   * so the cheap answer and the real one have to be the same answer. A page that adds a snippet the rule
   * mis-reads fails here rather than shipping a link that opens on nothing.
   */
  it('offers the link exactly where a snippet renders', () => {
    const provided = providedNames();
    // What the playground can actually show: something to render, and every imported name answerable. The
    // stub scope holds every name, so an unresolved import has to be asked about separately.
    const shows = (snippet: DocsSnippet) => {
      const result = compileSnippet(snippet.code!, scope);

      return result.renders && importedNames(snippet.code!).every((name) => provided.has(name));
    };

    const disagreed = snippets
      .filter((snippet) => snippet.check)
      .filter((snippet) => canOpenInPlayground(snippet.code!, snippet) !== shows(snippet))
      .map(where);

    expect(disagreed).toEqual([]);
  });

  it('round-trips every snippet through a URL', () => {
    const broken = snippets.filter((snippet) => decodeSnippet(encodeSnippet(snippet.code!)) !== snippet.code).map(where);

    expect(broken).toEqual([]);
  });

  it('imports nothing the playground cannot hand it', () => {
    const provided = providedNames();
    const unresolved = snippets
      .filter((snippet) => canOpenInPlayground(snippet.code!, snippet))
      .flatMap((snippet) => compileSnippet(snippet.code!, scope).unresolved.filter((name) => !provided.has(name)));

    expect(unresolved).toEqual([]);
  });
});

describe('the scope', () => {
  /** The record and the loaders are edited in different files; a specifier in one and not the other is a
   * name that silently resolves to `undefined` and fails inside React. */
  it('can load every specifier the shared record names', () => {
    expect(unresolvableSpecifiers()).toEqual([]);
  });

  /** Named one by one rather than through the barrel, which costs every page on the site 159 KB gzipped. */
  it('holds a value for every icon a snippet may write', () => {
    expect(iconNames().sort()).toEqual([...SNIPPET_ICONS].sort());
  });
});

describe('splitting a snippet', () => {
  it('keeps a multi-line opening tag whole', () => {
    // The `>` on its own line closes the tag, not a statement — a scanner counting brackets split it here.
    const module = playgroundModule('<Box\n  p={4}\n  m={2}\n>\n  <Span>hi</Span>\n</Box>', check);

    expect(module.renders).toBe(true);
    expect(module.body).toContain('<Span>hi</Span>');
  });

  it('takes setup written after the demo', () => {
    const module = playgroundModule('<Progress value={62} />\n\nBox.components({\n  progress: { styles: { p: 1 } },\n});', check);

    expect(module.renders).toBe(true);
    expect(module.body.indexOf('Box.components')).toBeLessThan(module.body.indexOf('return'));
  });

  it('turns a top-level line comment into a JSX one', () => {
    const module = playgroundModule('// the axis is fixed\n<Sparkline data={[1, 2]} />', check);

    expect(module.body).toContain('{/* the axis is fixed */}');
    expect(module.body).not.toMatch(/^\/\/ the axis/m);
  });

  it('renders a component the snippet declares instead of showing', () => {
    const module = playgroundModule('function Demo() {\n  return <Box p={4} />;\n}', check);

    expect(module.renders).toBe(true);
    expect(module.body).toContain('<Demo />');
  });

  it('will not render a component that needs props', () => {
    const module = playgroundModule('function Cell({ row }: { row: string }) {\n  return <Box>{row}</Box>;\n}', check);

    expect(module.renders).toBe(false);
  });

  it('drops the imports and reports their names', () => {
    const module = playgroundModule("import Box from '@box-kite/react';\n\n<Box p={4} />", check);

    expect(module.imported).toEqual(['Box']);
    expect(module.body).not.toContain('import');
  });

  it('has nothing to render for an import line or a configuration block', () => {
    expect(playgroundModule("import Box from '@box-kite/react';", check).renders).toBe(false);
    expect(playgroundModule("Box.configure({ transition: 'colors' });", check).renders).toBe(false);
  });
});

describe('a playground link', () => {
  it('carries the snippet in its query', () => {
    const href = playgroundHref('<Box p={4} />');

    expect(href.startsWith(`/playground?${SNIPPET_PARAM}=`)).toBe(true);
    expect(decodeSnippet(new URL(href, 'https://x.dev').searchParams.get(SNIPPET_PARAM))).toBe('<Box p={4} />');
  });

  it('survives characters a URL would otherwise rewrite', () => {
    const source = '<Box content="a+b/c" />\n// é — ✓';

    expect(encodeSnippet(source)).not.toMatch(/[+/=]/);
    expect(decodeSnippet(encodeSnippet(source))).toBe(source);
  });

  it('is not offered on a block that opted out of being compilable', () => {
    expect(canOpenInPlayground('<Box p={4} />', { language: 'jsx' })).toBe(true);
    expect(canOpenInPlayground('<Box p={4} />', { language: 'jsx', check: false })).toBe(false);
    expect(canOpenInPlayground('<Box p={4} />', { language: 'shell' })).toBe(false);
  });

  it('is not offered when a name the snippet imports cannot be resolved', () => {
    expect(canOpenInPlayground("import { Area } from 'recharts';\n\n<Area />", { language: 'jsx' })).toBe(false);
  });

  it('decodes nothing rather than throwing on a broken parameter', () => {
    expect(decodeSnippet('!!!not base64!!!')).toBe(null);
    expect(decodeSnippet(null)).toBe(null);
  });
});

describe('compiling a snippet', () => {
  it('evaluates it into a component with the scope as its parameters', () => {
    const values = { Box: (props: Record<string, unknown>) => props };
    const result = compileSnippet('<Box p={4} />', { ...scope, values });

    expect(result.error).toBe(null);
    expect(typeof result.Component).toBe('function');
  });

  it("reports the compiler's own words rather than throwing", () => {
    const result = compileSnippet('<Box p={4} <<< />', scope);

    expect(result.renders).toBe(false);
  });
});
