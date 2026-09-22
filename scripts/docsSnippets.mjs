/**
 * Every `<Code>` block the docs site shows, read out of the page sources. Two readers, and they have to be
 * looking at the same blocks: `check-docs-snippets.mjs` compiles each one against the published entry points,
 * and `pages/site/playground.test.ts` asserts the playground can run it. A collector per reader would drift,
 * and the way it would show is a block that compiles in CI and has a dead "Open in playground" link.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';

/** Which JSX elements carry a snippet. One entry today; a second one would be added here, not per reader. */
const SNIPPET_TAGS = new Set(['Code']);

/** Every `.tsx` file under a directory, as a repo-relative POSIX path. */
function walk(root, dir) {
  const out = [];

  for (const name of readdirSync(join(root, dir))) {
    const path = `${dir}/${name}`;

    if (statSync(join(root, path)).isDirectory()) out.push(...walk(root, path));
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

function snippetsIn(root, path) {
  const text = readFileSync(join(root, path), 'utf8');
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const found = [];

  visit(source);

  return found;

  function visit(node) {
    if ((ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) && SNIPPET_TAGS.has(node.tagName.getText(source))) {
      const codeAttribute = attribute(node, 'code', source);
      const code = literalOf(codeAttribute);
      const check = attribute(node, 'check', source);

      found.push({
        path,
        line: ts.getLineAndCharacterOfPosition(source, node.getStart(source)).line + 1,
        // +1 for the opening quote or backtick: the content starts right after it, so that position is
        // the snippet's own line 1.
        codeLine: code ? ts.getLineAndCharacterOfPosition(source, code.getStart(source) + 1).line + 2 : null,
        language: literalOf(attribute(node, 'language', source))?.text ?? 'jsx',
        // Present but not a literal means the block is assembled at runtime; absent means it is printed
        // from the live demo beside it, which is real JSX in the page and so already type-checked.
        hasCode: Boolean(codeAttribute),
        // A block with children and no `code` prints its own live demo, so its snippet is JSX that
        // renders by construction — which is what decides the playground link on it.
        hasDemo: !ts.isJsxSelfClosingElement(node),
        code: code?.text,
        check: !(check && ts.isJsxExpression(check) && check.expression?.kind === ts.SyntaxKind.FalseKeyword),
        context: literalOf(attribute(node, 'context', source))?.text,
      });
    }

    ts.forEachChild(node, visit);
  }
}

/** Every snippet the site shows, in page order. `root` is the repository root. */
export function collectDocsSnippets(root, dir = 'pages') {
  return walk(root, dir).flatMap((path) => snippetsIn(root, path));
}
