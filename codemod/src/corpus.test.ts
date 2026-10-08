// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { totals } from './report';
import { syntaxErrors, parse, transformSource } from './transform';

const ROOT = join(import.meta.dirname, '../..');
const EXAMPLES = join(ROOT, 'codemod/fixtures/shadcn/examples');

/** shadcn's own examples, converted: real call sites written by somebody else, which is what the bar is about. */
const corpus = readdirSync(EXAMPLES).map((file) => {
  const text = readFileSync(join(EXAMPLES, file), 'utf8');

  return { file, text, result: transformSource(text, file) };
});

/**
 * Type-checks the converted files against the library's real sources. What the corpus still imports from
 * its own project (`ui/button`, lucide, `cn`) is declared as `any`, so every error left is about Box Kite.
 */
function typeErrors(files: ReadonlyArray<{ file: string; output: string }>): string[] {
  const virtual = new Map(files.map(({ file, output }) => [join(ROOT, 'codemod/__corpus__', file).replace(/\\/g, '/'), output]));
  const stubs = join(ROOT, 'codemod/__corpus__/stubs.d.ts').replace(/\\/g, '/');
  virtual.set(
    stubs,
    ["declare module '@/registry/*';", "declare module 'lucide-react';", "declare module 'cn';", "declare module 'radix-ui';"].join('\n'),
  );

  const options: ts.CompilerOptions = {
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    jsx: ts.JsxEmit.ReactJSX,
    strict: true,
    noEmit: true,
    skipLibCheck: true,
    esModuleInterop: true,
    resolveJsonModule: true,
    lib: ['lib.esnext.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts'],
    baseUrl: ROOT,
    paths: { '@box-kite/react/components/*': ['./src/components/*'] },
  };
  const host = ts.createCompilerHost(options);
  const read = host.readFile.bind(host);
  const exists = host.fileExists.bind(host);
  host.readFile = (name) => virtual.get(name.replace(/\\/g, '/')) ?? read(name);
  host.fileExists = (name) => virtual.has(name.replace(/\\/g, '/')) || exists(name);
  const getSourceFile = host.getSourceFile.bind(host);
  host.getSourceFile = (name, language) => {
    const text = virtual.get(name.replace(/\\/g, '/'));
    return text !== undefined ? ts.createSourceFile(name, text, language) : getSourceFile(name, language);
  };

  const program = ts.createProgram([...virtual.keys()], options, host);

  return program
    .getSourceFiles()
    .filter((sf) => virtual.has(sf.fileName))
    .flatMap((sf) => [...program.getSyntacticDiagnostics(sf), ...program.getSemanticDiagnostics(sf)])
    .map((d) => {
      const where =
        d.file && d.start !== undefined
          ? `${d.file.fileName.split('/').pop()}:${d.file.getLineAndCharacterOfPosition(d.start).line + 1}`
          : '';
      return `${where} ${ts.flattenDiagnosticMessageText(d.messageText, ' ')}`;
    });
}

describe('the shadcn corpus', () => {
  it('converts at least 70% of the Radix elements with no TODO — the roadmap’s bar', () => {
    const t = totals(corpus.map(({ file, result }) => ({ path: file, ...result })));

    expect(t.elements).toBeGreaterThan(150);
    expect(t.automated / t.elements).toBeGreaterThanOrEqual(0.7);
  });

  it('is the figure the README quotes', () => {
    const t = totals(corpus.map(({ file, result }) => ({ path: file, ...result })));
    const readme = readFileSync(join(ROOT, 'codemod/README.md'), 'utf8');

    expect(readme).toContain(
      `**${t.automated} of ${t.elements} Radix elements convert with no TODO (${Math.round((t.automated / t.elements) * 100)}%)**`,
    );
    expect(readme).toContain(`${t.filesClean}\nof the ${t.files} files need nothing more`);
  });

  it('writes every file, and every one of them parses', () => {
    for (const { file, result } of corpus) {
      expect(result.error, file).toBeUndefined();
      expect(result.changed, file).toBe(true);
      expect(syntaxErrors(parse(result.output, file)), file).toEqual([]);
    }
  });

  it('type-checks against the library, apart from the TODOs it left', { timeout: 60_000 }, () => {
    const clean = corpus.filter(({ result }) => result.findings.every((f) => f.outcome !== 'todo'));
    expect(clean.length).toBeGreaterThan(15);

    expect(typeErrors(clean.map(({ file, result }) => ({ file, output: result.output })))).toEqual([]);
  });

  it('survives the wrapper modules themselves — the CLI skips them, but nothing in them makes it throw', () => {
    const UI = join(ROOT, 'codemod/fixtures/shadcn/ui');
    for (const file of readdirSync(UI)) {
      const result = transformSource(readFileSync(join(UI, file), 'utf8'), file);
      expect(result.error, file).toBeUndefined();
      expect(syntaxErrors(parse(result.output, file)), file).toEqual([]);
    }
  });

  it('runs a second time without changing anything', () => {
    for (const { file, result } of corpus) {
      const again = transformSource(result.output, file);
      expect(again.output, file).toBe(result.output);
    }
  });
});
