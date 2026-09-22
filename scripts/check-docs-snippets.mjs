// Fails the build if a code snippet the docs site shows does not compile: a live demo is real JSX that
// TypeScript checks, while the block beside it is a *string* nobody read — which is how the homepage
// shipped `sm` twice and the Grid page documented a `colSpan` that does not exist (bug #15). Snippets
// compile as a reader would compile them, against the published specifiers and without the site's own
// augmentation. A snippet is a fragment: its components are imported for it, a *lowercase* undeclared name
// becomes `any`, `context` adds hidden declarations, `check={false}` opts out. Run: npm run check:docs
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { collectDocsSnippets } from './docsSnippets.mjs';
import { importStatement, SNIPPET_SCOPE } from './snippetScope.mjs';

const root = join(import.meta.dirname, '..');

/** Snippets in these languages are not TypeScript, so there is nothing here to compile. */
const NOT_TYPESCRIPT = new Set(['shell', 'css', 'json']);

/** The published entry points, resolved to the sources they are built from. */
const PACKAGE_PATHS = {
  '@box-kite/react': ['src/box.ts'],
  '@box-kite/react/a11y': ['src/a11y.ts'],
  '@box-kite/react/anchor': ['src/anchor.ts'],
  '@box-kite/react/catalog': ['src/catalog.ts'],
  '@box-kite/react/interop': ['src/interop.ts'],
  '@box-kite/core': ['src/core.ts'],
  '@box-kite/react/rsc': ['src/rsc.ts'],
  '@box-kite/react/spec': ['src/spec.ts'],
  '@box-kite/react/ssg': ['src/ssg.ts'],
  '@box-kite/core/types': ['src/types.ts'],
  '@box-kite/react/components/*': ['src/components/*'],
};

/**
 * What a snippet may use without importing it, as the import statement it would have written — one per
 * name, so a snippet that imports something for itself keeps its own and gets no duplicate. The names
 * come from `snippetScope.mjs`, which the playground reads as *values*: a name only one of the two
 * knows about is a snippet that compiles here and throws `is not defined` when a reader opens it.
 */
const PROVIDED = Object.fromEntries(Object.entries(SNIPPET_SCOPE).map(([name, entry]) => [name, importStatement(name, entry)]));

/** A name TypeScript could not find is the page's own context — but only if it is a value. */
const MISSING_NAME = /Cannot find name '([^']+)'/;

/** "JSX expressions must have one parent element": the snippet shows sibling elements, as docs do. */
const NEEDS_FRAGMENT = 2657;

/**
 * Every snippet the site shows, sorted into the ones to compile and the ones there is nothing to compile
 * about. The blocks themselves come from `docsSnippets.mjs`, which the playground's test reads too — a
 * collector per reader would drift, and the way it would show is a block that compiles here and has a
 * dead "Open in playground" link.
 */
function collectSnippets() {
  return collectDocsSnippets(root).map((snippet) => {
    const { path, line, codeLine, language, hasCode, code, check, context } = snippet;

    if (NOT_TYPESCRIPT.has(language)) return { path, line, skipped: language };
    if (!check) return { path, line, skipped: 'opted out' };
    // No `code` at all means the block is printed from the live demo beside it, which is real JSX in the
    // page and so already checked by `npm run compile`. A template with a substitution in it is assembled
    // at runtime, and there is nothing here to read.
    if (!hasCode) return { path, line, skipped: 'rendered from the demo' };
    if (code === undefined) return { path, line, skipped: 'assembled at runtime' };

    return { path, line: codeLine, code, context };
  });
}

/** The names a snippet declares for itself — imports, variables, functions, classes, types. */
function declaredNames(code) {
  const source = ts.createSourceFile('snippet.tsx', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const names = new Set();

  const addBinding = (name) => {
    if (!name) return;
    if (ts.isIdentifier(name)) names.add(name.text);
    else if (ts.isObjectBindingPattern(name) || ts.isArrayBindingPattern(name)) {
      for (const element of name.elements) if (ts.isBindingElement(element)) addBinding(element.name);
    }
  };

  for (const statement of source.statements) {
    if (ts.isImportDeclaration(statement) && statement.importClause) {
      const { name, namedBindings } = statement.importClause;

      if (name) names.add(name.text);
      if (namedBindings && ts.isNamespaceImport(namedBindings)) names.add(namedBindings.name.text);
      if (namedBindings && ts.isNamedImports(namedBindings)) for (const e of namedBindings.elements) names.add(e.name.text);
    } else if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) addBinding(declaration.name);
    } else if ((ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) && statement.name) {
      names.add(statement.name.text);
    } else if (ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement)) {
      names.add(statement.name.text);
    }
  }

  return names;
}

/**
 * A snippet as a module: its imports, what the page around it owns, then the snippet. Each generated line
 * remembers which snippet line it came from, so a diagnostic lands on the line a reader would edit.
 */
function moduleFor(snippet, { free, fragment }) {
  const declared = declaredNames(snippet.code);
  const lines = [];
  const add = (text, from = null) => lines.push({ text, from });

  for (const [name, statement] of Object.entries(PROVIDED)) if (!declared.has(name)) add(statement);
  for (const line of (snippet.context ?? '').split('\n')) if (line.trim()) add(line);
  for (const name of free) add(`declare const ${name}: any;`);

  // Docs show sibling elements with no wrapper all the time; TypeScript wants one root. Only the
  // snippets that asked for it are wrapped, so a leading comment stays a comment everywhere else.
  if (fragment) add('const jsx = (<>');
  snippet.code.split('\n').forEach((text, index) => add(text, index + 1));
  if (fragment) add('</>);');

  return { text: lines.map((l) => l.text).join('\n'), lines };
}

function compilerOptions() {
  const { config } = ts.readConfigFile(join(root, 'tsconfig.json'), ts.sys.readFile);
  const { options } = ts.parseJsonConfigFileContent(config, ts.sys, root);

  return { ...options, baseUrl: root, paths: { ...options.paths, ...PACKAGE_PATHS }, noEmit: true, skipLibCheck: true, types: [] };
}

/** One program over every snippet at once — the sources they import are parsed once for all of them. */
function compile(modules, options) {
  const host = ts.createCompilerHost(options, true);
  const original = { getSourceFile: host.getSourceFile, fileExists: host.fileExists, readFile: host.readFile };

  host.getSourceFile = (fileName, languageVersion, ...rest) => {
    const virtual = modules.get(fileName);

    return virtual
      ? ts.createSourceFile(fileName, virtual.text, languageVersion, true, ts.ScriptKind.TSX)
      : original.getSourceFile.call(host, fileName, languageVersion, ...rest);
  };
  host.fileExists = (fileName) => modules.has(fileName) || original.fileExists.call(host, fileName);
  host.readFile = (fileName) => modules.get(fileName)?.text ?? original.readFile.call(host, fileName);

  const program = ts.createProgram([...modules.keys()], options, host);
  const diagnostics = [];

  for (const fileName of modules.keys()) {
    const file = program.getSourceFile(fileName);

    diagnostics.push(...program.getSyntacticDiagnostics(file), ...program.getSemanticDiagnostics(file));
  }

  return diagnostics;
}

const all = collectSnippets();
const snippets = all.filter((s) => s.code !== undefined);
const skipped = all.filter((s) => s.skipped);
const options = compilerOptions();
const name = (index) => `snippet-${index}.tsx`;
const state = new Map(snippets.map((_, index) => [name(index), { free: new Set(), fragment: false }]));
const build = () => new Map(snippets.map((s, index) => [name(index), moduleFor(s, state.get(name(index)))]));

// The first pass asks what the page around each snippet owns, and which snippets show sibling
// elements; the second declares the one, wraps the other, and judges what is left.
for (const diagnostic of compile(build(), options)) {
  const found = state.get(diagnostic.file.fileName);
  const [, missing] = ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ').match(MISSING_NAME) ?? [];

  if (!found) continue;
  if (diagnostic.code === NEEDS_FRAGMENT) found.fragment = true;
  if (missing && /^[a-z_$]/.test(missing)) found.free.add(missing);
}

const modules = build();
const failures = [];

for (const diagnostic of compile(modules, options)) {
  const index = Number(diagnostic.file.fileName.match(/snippet-(\d+)\.tsx/)[1]);
  const snippet = snippets[index];
  const at = ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start ?? 0);
  const from = modules.get(diagnostic.file.fileName).lines[at.line]?.from;

  failures.push({
    // A diagnostic on a generated line belongs to the block as a whole, not to a line of it.
    where: `${snippet.path}:${from ? snippet.line + from - 1 : snippet.line}`,
    message: ts.flattenDiagnosticMessageText(diagnostic.messageText, ' '),
    source: diagnostic.file.text.split('\n')[at.line]?.trim(),
  });
}

if (failures.length) {
  console.error(`\n✖ ${failures.length} error(s) in the code the docs site shows:\n`);

  for (const failure of failures) {
    console.error(`  ${failure.where}  ${failure.message}`);
    console.error(`    ${failure.source}\n`);
  }

  console.error('Fix the snippet, or mark the block check={false} if it is deliberately not compilable code.\n');
  process.exit(1);
}

const reasons = skipped.reduce((counts, s) => counts.set(s.skipped, (counts.get(s.skipped) ?? 0) + 1), new Map());
const summary = [...reasons].map(([reason, count]) => `${count} ${reason}`).join(', ');

console.log(`✔ ${snippets.length} docs snippets compile against the published entry points (${summary || 'none skipped'})`);
