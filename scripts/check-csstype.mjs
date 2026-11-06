/**
 * Fails the build when the vendored csstype types no longer match the installed csstype. The copy is what
 * keeps the `css` prop typed with no runtime dependency: run `npm run docs:csstype`, never edit the file.
 * Run: npm run check:csstype
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import * as prettier from 'prettier';
import ts from 'typescript';

const ROOT = join(import.meta.dirname, '..');
const FILE = 'src/core/vendor/csstype.ts';
const fix = process.argv.includes('--fix');

const require = createRequire(import.meta.url);
const source = require.resolve('csstype/index.d.ts');
const { version } = JSON.parse(readFileSync(require.resolve('csstype/package.json'), 'utf8'));
const licence = readFileSync(join(source, '..', 'LICENSE'), 'utf8').trim();

// A namespace member in a `.d.ts` is exported implicitly and in a `.ts` file is not, so each one says so.
const exportMembers = (context) => (root) => {
  const visit = (node) => {
    if (ts.isModuleBlock(node)) {
      const statements = node.statements.map((statement) =>
        ts.canHaveModifiers(statement) && !ts.getModifiers(statement)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
          ? ts.factory.replaceModifiers(statement, [
              ts.factory.createModifier(ts.SyntaxKind.ExportKeyword),
              ...(ts.getModifiers(statement) ?? []),
            ])
          : statement,
      );

      return ts.factory.updateModuleBlock(node, statements);
    }

    return ts.visitEachChild(node, visit, context);
  };

  return ts.visitNode(root, visit);
};

// The MDN prose and compatibility tables are three quarters of the file and none of the types.
const parsed = ts.createSourceFile('csstype.d.ts', readFileSync(source, 'utf8'), ts.ScriptTarget.Latest, true);
const [transformed] = ts.transform(parsed, [exportMembers]).transformed;
const body = ts.createPrinter({ removeComments: true }).printFile(transformed);

const header = [
  `// Generated from csstype ${version} by \`npm run docs:csstype\` — do not edit. Types only, comments removed.`,
  '/*',
  ...licence.split('\n').map((line) => ` ${line}`.trimEnd()),
  ' */',
].join('\n');
const path = join(ROOT, FILE);
const document = await prettier.format(`${header}\n${body}`, { ...(await prettier.resolveConfig(path)), filepath: path });
const current = existsSync(path) ? readFileSync(path, 'utf8') : undefined;

if (document === current) {
  console.log(`✔ ${FILE} current: csstype ${version}`);
} else if (fix) {
  writeFileSync(path, document);
  console.log(`✔ ${FILE} written from csstype ${version}`);
} else {
  console.error(`\n✖ ${FILE} is ${current === undefined ? 'missing' : `not what csstype ${version} generates`}.`);
  console.error('Run npm run docs:csstype.\n');
  process.exit(1);
}
