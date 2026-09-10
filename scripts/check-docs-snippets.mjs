// Fails the build if a code snippet the docs site shows does not compile: a live demo is real JSX that
// TypeScript checks, while the block beside it is a *string* nobody read — which is how the homepage
// shipped `sm` twice and the Grid page documented a `colSpan` that does not exist (bug #15). Snippets
// compile as a reader would compile them, against the published specifiers and without the site's own
// augmentation. A snippet is a fragment: its components are imported for it, a *lowercase* undeclared name
// becomes `any`, `context` adds hidden declarations, `check={false}` opts out. Run: npm run check:docs
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';

const root = join(import.meta.dirname, '..');
const PAGES = 'pages';

/**
 * Which JSX elements carry a snippet, and how the page renders it. `DemoCard` documents a *prop fragment*
 * inside a Box, so the check wraps it the same way the page does.
 */
const SNIPPET_TAGS = {
  Code: (code) => code,
  DemoCard: (code) => `<Box ${code}>content</Box>`,
};

/** Snippets in these languages are not TypeScript, so there is nothing here to compile. */
const NOT_TYPESCRIPT = new Set(['shell', 'css']);

/** The published entry points, resolved to the sources they are built from. */
const PACKAGE_PATHS = {
  '@box-kite/react': ['src/box.ts'],
  '@box-kite/react/a11y': ['src/a11y.ts'],
  '@box-kite/react/anchor': ['src/anchor.ts'],
  '@box-kite/core': ['src/core.ts'],
  '@box-kite/react/rsc': ['src/rsc.ts'],
  '@box-kite/react/ssg': ['src/ssg.ts'],
  '@box-kite/core/types': ['src/types.ts'],
  '@box-kite/react/components/*': ['src/components/*'],
};

/**
 * What a snippet may use without importing it — one import statement per name, so a snippet that
 * writes its own import for something keeps its own and gets no duplicate.
 */
const PROVIDED = {
  React: "import * as React from 'react';",
  useCallback: "import { useCallback } from 'react';",
  useEffect: "import { useEffect } from 'react';",
  useMemo: "import { useMemo } from 'react';",
  useRef: "import { useRef } from 'react';",
  useState: "import { useState } from 'react';",
  BaseSvg: "import BaseSvg from '@box-kite/react/components/baseSvg';",
  Box: "import Box from '@box-kite/react';",
  useAnchorPosition: "import { useAnchorPosition } from '@box-kite/react/anchor';",
  AlertDialog: "import { AlertDialog } from '@box-kite/react/components/dialog';",
  Button: "import Button from '@box-kite/react/components/button';",
  Checkbox: "import Checkbox from '@box-kite/react/components/checkbox';",
  DataGrid: "import DataGrid from '@box-kite/react/components/dataGrid';",
  Dialog: "import Dialog from '@box-kite/react/components/dialog';",
  Dropdown: "import Dropdown from '@box-kite/react/components/dropdown';",
  Flex: "import Flex from '@box-kite/react/components/flex';",
  Form: "import Form from '@box-kite/react/components/form';",
  Grid: "import Grid from '@box-kite/react/components/grid';",
  Icon: "import Icon from '@box-kite/react/components/icon';",
  Overlay: "import Overlay from '@box-kite/react/components/overlay';",
  Popover: "import Popover from '@box-kite/react/components/popover';",
  Presence: "import Presence from '@box-kite/react/components/presence';",
  RadioButton: "import RadioButton from '@box-kite/react/components/radioButton';",
  RadioGroup: "import RadioGroup from '@box-kite/react/components/radioGroup';",
  Select: "import Select from '@box-kite/react/components/select';",
  Switch: "import Switch from '@box-kite/react/components/switch';",
  Textarea: "import Textarea from '@box-kite/react/components/textarea';",
  Textbox: "import Textbox from '@box-kite/react/components/textbox';",
  Tooltip: "import Tooltip from '@box-kite/react/components/tooltip';",
  VisuallyHidden: "import VisuallyHidden from '@box-kite/react/components/visuallyHidden';",
  // The semantic tags a snippet writes prose with, all from the one entry.
  H1: "import { H1 } from '@box-kite/react/components/semantics';",
  H2: "import { H2 } from '@box-kite/react/components/semantics';",
  H3: "import { H3 } from '@box-kite/react/components/semantics';",
  H4: "import { H4 } from '@box-kite/react/components/semantics';",
  H5: "import { H5 } from '@box-kite/react/components/semantics';",
  H6: "import { H6 } from '@box-kite/react/components/semantics';",
  Li: "import { Li } from '@box-kite/react/components/semantics';",
  Ol: "import { Ol } from '@box-kite/react/components/semantics';",
  P: "import { P } from '@box-kite/react/components/semantics';",
  Ul: "import { Ul } from '@box-kite/react/components/semantics';",
  // The chart primitives and the theming container, one entry between them.
  ChartContainer: "import { ChartContainer } from '@box-kite/react/components/chart';",
  Gauge: "import { Gauge } from '@box-kite/react/components/chart';",
  MiniDonut: "import { MiniDonut } from '@box-kite/react/components/chart';",
  ProgressRing: "import { ProgressRing } from '@box-kite/react/components/chart';",
  Sparkline: "import { Sparkline } from '@box-kite/react/components/chart';",
  // The SVG elements — one entry each, so a drawing in a snippet reads as a drawing would.
  Circle: "import { Circle } from '@box-kite/react/components/svg';",
  ClipPath: "import { ClipPath } from '@box-kite/react/components/svg';",
  Defs: "import { Defs } from '@box-kite/react/components/svg';",
  Ellipse: "import { Ellipse } from '@box-kite/react/components/svg';",
  G: "import { G } from '@box-kite/react/components/svg';",
  Line: "import { Line } from '@box-kite/react/components/svg';",
  LinearGradient: "import { LinearGradient } from '@box-kite/react/components/svg';",
  Marker: "import { Marker } from '@box-kite/react/components/svg';",
  Mask: "import { Mask } from '@box-kite/react/components/svg';",
  Path: "import { Path } from '@box-kite/react/components/svg';",
  Polygon: "import { Polygon } from '@box-kite/react/components/svg';",
  Polyline: "import { Polyline } from '@box-kite/react/components/svg';",
  RadialGradient: "import { RadialGradient } from '@box-kite/react/components/svg';",
  Rect: "import { Rect } from '@box-kite/react/components/svg';",
  Stop: "import { Stop } from '@box-kite/react/components/svg';",
  Svg: "import { Svg } from '@box-kite/react/components/svg';",
  SvgSymbol: "import { SvgSymbol } from '@box-kite/react/components/svg';",
  SvgText: "import { SvgText } from '@box-kite/react/components/svg';",
  TSpan: "import { TSpan } from '@box-kite/react/components/svg';",
  Use: "import { Use } from '@box-kite/react/components/svg';",
};

/** A name TypeScript could not find is the page's own context — but only if it is a value. */
const MISSING_NAME = /Cannot find name '([^']+)'/;

/** "JSX expressions must have one parent element": the snippet shows sibling elements, as docs do. */
const NEEDS_FRAGMENT = 2657;

/** Every `.tsx` file under `pages/`, as a repo-relative POSIX path. */
function walk(dir) {
  const out = [];

  for (const name of readdirSync(join(root, dir))) {
    const path = `${dir}/${name}`;

    if (statSync(join(root, path)).isDirectory()) out.push(...walk(path));
    else if (path.endsWith('.tsx')) out.push(path);
  }

  return out;
}

function attribute(element, name, source) {
  const found = element.attributes.properties.find((p) => ts.isJsxAttribute(p) && p.name.getText(source) === name);

  return found?.initializer;
}

/** The literal a `code`/`language`/`context` attribute holds, unwrapping the `{…}` JSX adds. */
function literalOf(initializer) {
  if (!initializer) return undefined;

  const node = ts.isJsxExpression(initializer) ? initializer.expression : initializer;

  if (!node) return undefined;
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node;

  return undefined;
}

/** Every snippet a page displays, with the position of the string that holds it. */
function collectSnippets(path) {
  const text = readFileSync(join(root, path), 'utf8');
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const found = [];

  visit(source);

  return found;

  function visit(node) {
    if (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) {
      const wrap = SNIPPET_TAGS[node.tagName.getText(source)];

      if (wrap) {
        const language = literalOf(attribute(node, 'language', source))?.text ?? 'jsx';
        const code = literalOf(attribute(node, 'code', source));
        const check = attribute(node, 'check', source);
        const optedOut = check && ts.isJsxExpression(check) && check.expression?.kind === ts.SyntaxKind.FalseKeyword;
        const line = ts.getLineAndCharacterOfPosition(source, node.getStart(source)).line + 1;

        if (NOT_TYPESCRIPT.has(language)) found.push({ path, line, skipped: language });
        else if (optedOut) found.push({ path, line, skipped: 'opted out' });
        // No `code` at all means the block is printed from the live demo beside it, which is real
        // JSX in the page and so already checked by `npm run compile`. A template with a
        // substitution in it is assembled at runtime — boxPage builds one from the DemoCard
        // fragment this check reads at the call site instead.
        else if (!attribute(node, 'code', source)) found.push({ path, line, skipped: 'rendered from the demo' });
        else if (!code) found.push({ path, line, skipped: 'assembled at runtime' });
        else {
          // +1 for the opening quote or backtick: the content starts right after it, so that
          // position is the snippet's own line 1.
          const start = ts.getLineAndCharacterOfPosition(source, code.getStart(source) + 1);
          const context = literalOf(attribute(node, 'context', source))?.text;

          found.push({ path, line: start.line + 1, code: wrap(code.text), context });
        }
      }
    }

    ts.forEachChild(node, visit);
  }
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

const all = walk(PAGES).flatMap(collectSnippets);
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
