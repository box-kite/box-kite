import ts from 'typescript';
import { Family, matchModule, Origin, partOfExport, umbrellaFamily } from './families';
import { JsxEl, openingOf } from './jsx';

/** A local name bound to a Radix family: a part (`DialogContent`), or the whole namespace (`DialogPrimitive`). */
export interface FamilyBinding {
  kind: 'family';
  local: string;
  family: Family;
  origin: Origin;
  part?: string;
  declaration: ts.ImportDeclaration;
}

export interface SonnerBinding {
  kind: 'sonner';
  local: string;
  exported: string;
  declaration: ts.ImportDeclaration;
}

export type Binding = FamilyBinding | SonnerBinding;

export interface Resolved {
  family: Family;
  origin: Origin;
  part: string;
  binding: FamilyBinding;
}

export interface Bindings {
  byLocal: Map<string, Binding>;
  /** Every name the file declares at the top level, so a Box Kite import can avoid shadowing one. */
  declared: Set<string>;
  /** Box Kite imports already in the file: `module/exported` → local. */
  boxKite: Map<string, string>;
  /** Locals imported from a shadcn `ui/<name>` module that is not a Radix family — `Button` from `ui/button`. */
  uiLocals: Map<string, string>;
}

const BOX_KITE = /^@box-kite\/react\/components\/(.+)$/;

export function collectBindings(sf: ts.SourceFile): Bindings {
  const byLocal = new Map<string, Binding>();
  const declared = new Set<string>();
  const boxKite = new Map<string, string>();
  const uiLocals = new Map<string, string>();

  for (const statement of sf.statements) {
    if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
      const specifier = statement.moduleSpecifier.text;
      const clause = statement.importClause;
      if (!clause) continue;

      const locals: Array<{ local: string; exported: string | null }> = [];
      if (clause.name) locals.push({ local: clause.name.text, exported: 'default' });
      if (clause.namedBindings && ts.isNamespaceImport(clause.namedBindings))
        locals.push({ local: clause.namedBindings.name.text, exported: null });
      if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
        for (const element of clause.namedBindings.elements) {
          locals.push({ local: element.name.text, exported: (element.propertyName ?? element.name).text });
        }
      }

      for (const { local } of locals) declared.add(local);

      const box = BOX_KITE.exec(specifier);
      if (box) for (const { local, exported } of locals) if (exported) boxKite.set(`${box[1]}/${exported}`, local);

      const match = matchModule(specifier);
      if (!match) {
        const ui = /(?:^|\/)ui\/([a-z-]+)$/.exec(specifier);
        if (ui) for (const { local, exported } of locals) if (exported) uiLocals.set(local, `${ui[1]}/${exported}`);
        continue;
      }

      for (const { local, exported } of locals) {
        if (match === 'sonner') {
          if (exported) byLocal.set(local, { kind: 'sonner', local, exported, declaration: statement });
        } else if (match === 'umbrella') {
          const family = exported && umbrellaFamily(exported);
          if (family) byLocal.set(local, { kind: 'family', local, family, origin: 'radix', declaration: statement });
        } else if (exported === null) {
          byLocal.set(local, { kind: 'family', local, family: match.family, origin: match.origin, declaration: statement });
        } else if (exported !== 'default') {
          const part = partOfExport(match.family, exported);
          if (part) byLocal.set(local, { kind: 'family', local, family: match.family, origin: match.origin, part, declaration: statement });
        }
      }
    } else if ((ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) && statement.name) {
      declared.add(statement.name.text);
    } else if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations)
        if (ts.isIdentifier(declaration.name)) declared.add(declaration.name.text);
    }
  }

  return { byLocal, declared, boxKite, uiLocals };
}

/** The family part a tag names: `DialogContent`, or `DialogPrimitive.Content` through a namespace. */
export function resolveTag(bindings: Bindings, el: JsxEl): Resolved | undefined {
  return resolveName(bindings, openingOf(el).tagName);
}

export function resolveName(bindings: Bindings, name: ts.Node): Resolved | undefined {
  if (ts.isIdentifier(name)) {
    const binding = bindings.byLocal.get(name.text);

    return binding?.kind === 'family' && binding.part
      ? { family: binding.family, origin: binding.origin, part: binding.part, binding }
      : undefined;
  }

  if (
    (ts.isPropertyAccessExpression(name) || ts.isQualifiedName(name)) &&
    ts.isIdentifier(ts.isPropertyAccessExpression(name) ? name.expression : name.left)
  ) {
    const left = (ts.isPropertyAccessExpression(name) ? name.expression : name.left) as ts.Identifier;
    const right = ts.isPropertyAccessExpression(name) ? name.name.text : name.right.text;
    const binding = bindings.byLocal.get(left.text);
    if (binding?.kind !== 'family' || binding.part) return undefined;
    const part = partOfExport(binding.family, right);

    return part ? { family: binding.family, origin: binding.origin, part, binding } : undefined;
  }

  return undefined;
}

/** An identifier that refers to a binding, as opposed to a property name, an attribute name or a declaration. */
export function isReference(node: ts.Identifier): boolean {
  const parent = node.parent;
  if (!parent) return false;
  if (ts.isPropertyAccessExpression(parent) && parent.name === node) return false;
  if (ts.isQualifiedName(parent) && parent.right === node) return false;
  if (ts.isPropertyAssignment(parent) && parent.name === node) return false;
  if (ts.isJsxAttribute(parent)) return false;
  if (ts.isImportSpecifier(parent) || ts.isImportClause(parent) || ts.isNamespaceImport(parent)) return false;
  if (ts.isBindingElement(parent) && parent.propertyName === node) return false;
  if ((ts.isPropertySignature(parent) || ts.isMethodDeclaration(parent) || ts.isPropertyDeclaration(parent)) && parent.name === node)
    return false;

  return true;
}
