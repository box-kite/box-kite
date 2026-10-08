import ts from 'typescript';
import { Target, matchModule } from './families';
import type { Transformer } from './transform';
import { parse } from './transform';

const BOX_KITE = '@box-kite/react/components';

/** sonner's two exports Box Kite has under the same names; anything else it exports stays imported from sonner. */
const SONNER: Record<string, Target> = {
  toast: { module: 'toaster', name: 'toast', named: true },
  Toaster: { module: 'toaster', name: 'Toaster' },
};

/**
 * Drops the Radix and shadcn specifiers nothing uses any more, moves sonner's onto the toaster, and adds the
 * Box Kite imports the rewritten elements name — in the quote and semicolon style the file already uses.
 */
export function fixImports(output: string, fileName: string, transformer: Transformer, surviving: ReadonlySet<string>): string {
  const sf = parse(output, fileName);
  const imports = sf.statements.filter(ts.isImportDeclaration);
  const first = imports[0];
  const quote = first && first.moduleSpecifier.getText(sf).startsWith('"') ? '"' : "'";
  const semi = first ? (first.getText(sf).trimEnd().endsWith(';') ? ';' : '') : ';';
  const { byLocal } = transformer.bindings;
  const used = new Map(transformer.used);
  const edits: Array<{ from: number; to: number; text: string }> = [];

  for (const declaration of imports) {
    if (!ts.isStringLiteral(declaration.moduleSpecifier)) continue;
    const match = matchModule(declaration.moduleSpecifier.text);
    const clause = declaration.importClause;
    if (!match || !clause) continue;

    const named = clause.namedBindings && ts.isNamedImports(clause.namedBindings) ? [...clause.namedBindings.elements] : [];
    const namespace = clause.namedBindings && ts.isNamespaceImport(clause.namedBindings) ? clause.namedBindings : undefined;
    let keptDefault = clause.name;
    const keptNamespace = namespace && (!byLocal.has(namespace.name.text) || surviving.has(namespace.name.text)) ? namespace : undefined;
    let keptNamed: ts.ImportSpecifier[];

    if (match === 'sonner') {
      keptNamed = named.filter((element) => {
        const target = SONNER[(element.propertyName ?? element.name).text];
        if (target) used.set(`${target.module}/${target.named ? target.name : 'default'}`, { ...target, local: element.name.text });

        return !target;
      });
    } else {
      keptNamed = named.filter((element) => !byLocal.has(element.name.text) || surviving.has(element.name.text));
      if (keptDefault && byLocal.has(keptDefault.text) && !surviving.has(keptDefault.text)) keptDefault = undefined;
    }

    if (keptNamed.length === named.length && keptNamespace === namespace && keptDefault === clause.name) continue;

    const from = declaration.getStart(sf);
    if (!keptDefault && !keptNamespace && !keptNamed.length) {
      const to =
        output[declaration.end] === '\r' ? declaration.end + 2 : output[declaration.end] === '\n' ? declaration.end + 1 : declaration.end;
      edits.push({ from, to, text: '' });
      continue;
    }

    const parts = [
      keptDefault?.text,
      keptNamespace?.getText(sf),
      keptNamed.length ? `{ ${keptNamed.map((e) => e.getText(sf)).join(', ')} }` : undefined,
    ];
    const typeOnly = clause.isTypeOnly ? 'type ' : '';
    edits.push({
      from,
      to: declaration.end,
      text: `import ${typeOnly}${parts.filter(Boolean).join(', ')} from ${declaration.moduleSpecifier.getText(sf)}${semi}`,
    });
  }

  const additions = importLines(used, quote, semi);
  if (additions) {
    const last = imports.at(-1);
    const at = last ? last.end : directiveEnd(sf);
    edits.push({ from: at, to: at, text: last || at ? `\n${additions}` : `${additions}\n` });
  }

  let result = output;
  for (const edit of edits.sort((a, b) => b.from - a.from)) result = result.slice(0, edit.from) + edit.text + result.slice(edit.to);

  return result;
}

function importLines(used: ReadonlyMap<string, Target & { local: string }>, quote: string, semi: string): string {
  const modules = new Map<string, { default?: string; named: string[] }>();
  for (const target of used.values()) {
    const entry = modules.get(target.module) ?? { named: [] };
    if (target.named) entry.named.push(target.local === target.name ? target.name : `${target.name} as ${target.local}`);
    else entry.default = target.local;
    modules.set(target.module, entry);
  }

  return [...modules]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([module, entry]) => {
      const named = entry.named.length ? `{ ${entry.named.sort().join(', ')} }` : '';
      const clause = [entry.default, named].filter(Boolean).join(', ');

      return `import ${clause} from ${quote}${BOX_KITE}/${module}${quote}${semi}`;
    })
    .join('\n');
}

/** After `'use client'` and the like, where an import may first appear. */
function directiveEnd(sf: ts.SourceFile): number {
  let end = 0;
  for (const statement of sf.statements) {
    if (ts.isExpressionStatement(statement) && ts.isStringLiteral(statement.expression)) end = statement.end;
    else break;
  }

  return end;
}
