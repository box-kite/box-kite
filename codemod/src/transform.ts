import ts from 'typescript';
import { Binding, Bindings, collectBindings, FamilyBinding, isReference, Resolved, resolveName, resolveTag } from './bindings';
import { convertElement } from './convert';
import { isSonnerSubject, convertSonner } from './convert/sonner';
import { Target } from './families';
import { fixImports } from './imports';
import { isJsxEl, JsxEl, openingOf } from './jsx';

export type Outcome = 'converted' | 'removed' | 'todo';

/** One Radix element (or one sonner call) and what became of it — the unit the automation rate counts. */
export interface Finding {
  family: string;
  part: string;
  line: number;
  outcome: Outcome;
  notes: string[];
  todo?: string;
}

/** Where a node sits while it is rewritten: inside which family's root, and whether a `<form>` encloses it. */
export interface Ctx {
  frame?: Frame;
  inForm: boolean;
  /** A family whose root was left as Radix: its parts stay Radix too, or they would render outside their context. */
  kept?: string;
}

export interface Frame {
  family: string;
  origin: Resolved['origin'];
}

export interface TransformResult {
  output: string;
  changed: boolean;
  findings: Finding[];
  /** Set when the rewritten file no longer parses — it is then not written, and the reason is reported. */
  error?: string;
  /** Radix and shadcn bindings the output still uses, each as "local from module". */
  leftovers: string[];
}

export const TODO_TAG = 'TODO(radix-to-box)';

const isJsxChild = (node: ts.Node) =>
  !!node.parent &&
  (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent)) &&
  !ts.isJsxOpeningElement(node) &&
  !ts.isJsxClosingElement(node);

const startOf = (node: ts.Node, sf: ts.SourceFile) => (ts.isSourceFile(node) ? 0 : ts.isJsxText(node) ? node.pos : node.getStart(sf));

export class Transformer {
  readonly text: string;
  readonly findings: Finding[] = [];
  /** Box Kite imports the output needs: `module/name` → the local it is written under. */
  readonly used = new Map<string, Target & { local: string }>();
  private readonly copies: Array<[number, number]> = [];
  private readonly touched = new Set<ts.Node>();

  constructor(
    readonly sf: ts.SourceFile,
    readonly bindings: Bindings,
    private readonly aliases: ReadonlyMap<string, string>,
  ) {
    this.text = sf.text;
    this.mark(sf);
  }

  /** A node is touched when it, or anything inside it, is rewritten; everything else is copied as written. */
  private mark(node: ts.Node): boolean {
    let touched = this.isSubject(node);
    ts.forEachChild(node, (child) => {
      if (this.mark(child)) touched = true;
    });
    if (touched) this.touched.add(node);

    return touched;
  }

  private isSubject(node: ts.Node): boolean {
    if (isJsxEl(node) && resolveTag(this.bindings, node)) return true;
    if (ts.isTypeQueryNode(node) && resolveName(this.bindings, node.exprName)?.part === 'Root') return true;

    return isSonnerSubject(this, node);
  }

  resolve(el: JsxEl): Resolved | undefined {
    return resolveTag(this.bindings, el);
  }

  /** Nodes a converter has already accounted for: a content part folded into its root, a trigger lifted out of it. */
  readonly handled = new Set<ts.Node>();
  /** Nodes moved elsewhere in the output, so they are written nowhere where they stood. */
  readonly lifted = new Set<ts.Node>();

  start(node: ts.Node): number {
    return startOf(node, this.sf);
  }

  line(node: ts.Node): number {
    return this.sf.getLineAndCharacterOfPosition(this.start(node)).line + 1;
  }

  copy(from: number, to: number): string {
    if (to > from) this.copies.push([from, to]);

    return this.text.slice(from, to);
  }

  /** The node's text with every Radix element inside it converted. */
  rewrite(node: ts.Node, ctx: Ctx): string {
    if (this.lifted.has(node)) return '';
    if (isJsxEl(node)) {
      const resolved = resolveTag(this.bindings, node);
      if (resolved) {
        const out = convertElement(this, node, resolved, ctx);
        // A part that renders nothing still has to be an expression where it stood: `return (<Portal />)`.
        return out.trim() === '' && !isJsxChild(node) ? 'null' : out;
      }
    }

    if (ts.isTypeQueryNode(node)) {
      const resolved = resolveName(this.bindings, node.exprName);
      if (resolved?.part === 'Root') return `typeof ${this.local(resolved.family.target)}`;
    }

    if (this.touched.has(node) && isSonnerSubject(this, node)) return convertSonner(this, node, ctx);

    return this.splice(node, ctx);
  }

  /** Copies the node, rewriting only the children that need it. */
  splice(node: ts.Node, ctx: Ctx): string {
    const from = this.start(node);
    if (!this.touched.has(node)) return this.copy(from, node.end);

    // A dialog close inside a form is written differently from one outside: nesting forms is invalid.
    const inner = isJsxEl(node) && openingOf(node).tagName.getText(this.sf) === 'form' ? { ...ctx, inForm: true } : ctx;
    let out = '';
    let pos = from;
    let blank = 0;
    ts.forEachChild(node, (child) => {
      const start = this.start(child);
      const text = this.rewrite(child, inner);
      // A child that renders nothing takes the indentation line before it along.
      if (!text && blank && isJsxChild(child)) out = out.slice(0, -blank);
      out += this.copy(pos, start) + text;
      blank = ts.isJsxText(child) && child.containsOnlyTriviaWhiteSpaces ? text.length : 0;
      pos = child.end;
    });

    return out + this.copy(pos, node.end);
  }

  /** JSX children, rewritten and concatenated, leaving out the ones in `skip`. */
  children(children: readonly ts.JsxChild[], ctx: Ctx, skip?: ReadonlySet<ts.Node>): string {
    let out = '';
    let blank = 0;
    for (const child of children) {
      const text = skip?.has(child) ? '' : this.rewrite(child, ctx);
      if (!text && blank) out = out.slice(0, -blank);
      out += text;
      blank = ts.isJsxText(child) && child.containsOnlyTriviaWhiteSpaces ? text.length : 0;
    }

    return out;
  }

  /** The element left as it was, with a TODO inside its opening tag — valid wherever the element is. */
  todo(el: JsxEl, resolved: Resolved | { family: string; part: string }, ctx: Ctx, message: string, notes: string[] = []): string {
    this.record(el, resolved, 'todo', notes, message);
    const opening = openingOf(el);
    const at = (opening.typeArguments?.end ?? opening.tagName.end) - this.start(el);
    const family = typeof resolved.family === 'string' ? resolved.family : resolved.family.name;
    const text = this.splice(el, resolved.part === 'Root' ? { ...ctx, kept: family } : ctx);
    // A second run meets its own TODO and leaves it be.
    if (this.text.slice(this.start(el), opening.end).includes(`${TODO_TAG}: ${message}`)) return text;

    return `${text.slice(0, at)} /* ${TODO_TAG}: ${message.replace(/\*\//g, '* /')} */${text.slice(at)}`;
  }

  record(
    node: ts.Node,
    resolved: { family: { name: string } | string; part: string },
    outcome: Outcome,
    notes: string[] = [],
    todo?: string,
  ) {
    const family = typeof resolved.family === 'string' ? resolved.family : resolved.family.name;
    this.findings.push({ family, part: resolved.part, line: this.line(node), outcome, notes, ...(todo ? { todo } : {}) });
  }

  /** The local name a Box Kite component is written under: an existing import of it, or a fresh one. */
  local(target: Target): string {
    const key = `${target.module}/${target.named ? target.name : 'default'}`;
    const existing = this.bindings.boxKite.get(key);
    const local = existing ?? this.aliases.get(key) ?? target.name;
    if (!existing) this.used.set(key, { ...target, local });

    return local;
  }

  /** A `Button` the file already imports from its own `ui/button`, which a shadcn alert dialog's actions were styled as. */
  uiButton(): string | undefined {
    for (const [local, source] of this.bindings.uiLocals) if (source === 'button/Button') return local;

    return undefined;
  }

  /** The family and sonner bindings whose names still appear somewhere the output copied verbatim. */
  survivingLocals(): Set<string> {
    const ranges = [...this.copies].sort((a, b) => a[0] - b[0]);
    const inCopy = (pos: number) => {
      let lo = 0;
      let hi = ranges.length - 1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (ranges[mid][1] <= pos) lo = mid + 1;
        else if (ranges[mid][0] > pos) hi = mid - 1;
        else return true;
      }

      return false;
    };
    const surviving = new Set<string>();
    const visit = (node: ts.Node) => {
      if (ts.isIdentifier(node) && this.bindings.byLocal.has(node.text) && isReference(node) && inCopy(node.getStart(this.sf))) {
        surviving.add(node.text);
      }
      ts.forEachChild(node, visit);
    };
    visit(this.sf);

    return surviving;
  }
}

const scriptKind = (fileName: string) =>
  fileName.endsWith('.tsx')
    ? ts.ScriptKind.TSX
    : fileName.endsWith('.jsx')
      ? ts.ScriptKind.JSX
      : fileName.endsWith('.js')
        ? ts.ScriptKind.JS
        : ts.ScriptKind.TS;

export const parse = (text: string, fileName: string) =>
  ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true, scriptKind(fileName));

/** The parse errors a source has — TypeScript keeps them on the file rather than behind a program. */
export function syntaxErrors(sf: ts.SourceFile): string[] {
  const diagnostics = (sf as unknown as { parseDiagnostics?: ts.DiagnosticWithLocation[] }).parseDiagnostics ?? [];

  return diagnostics.map((d) => {
    const { line, character } = sf.getLineAndCharacterOfPosition(d.start);

    return `${line + 1}:${character + 1} ${ts.flattenDiagnosticMessageText(d.messageText, '\n')}`;
  });
}

function leftoversOf(bindings: Bindings, surviving: ReadonlySet<string>): string[] {
  return [...surviving]
    .map((local) => bindings.byLocal.get(local))
    .filter((b): b is FamilyBinding => b?.kind === 'family')
    .map((b) => `${b.local} from ${(b.declaration.moduleSpecifier as ts.StringLiteral).text}`);
}

/**
 * Rewrites one file. A Box Kite name that would collide with a binding the output still uses is retried
 * under a `Box` prefix, which is why this can run up to three times.
 */
export function transformSource(text: string, fileName: string): TransformResult {
  const aliases = new Map<string, string>();

  for (let attempt = 0; attempt < 3; attempt++) {
    const sf = parse(text, fileName);
    const bindings = collectBindings(sf);
    if (!bindings.byLocal.size) return { output: text, changed: false, findings: [], leftovers: [] };

    const transformer = new Transformer(sf, bindings, aliases);
    const rewritten = transformer.rewrite(sf, { inForm: false });
    const surviving = transformer.survivingLocals();

    const taken = (local: string, key: string) => {
      const binding: Binding | undefined = bindings.byLocal.get(local);
      if (binding) return binding.kind === 'family' ? surviving.has(local) : !key.startsWith('toaster/');

      return bindings.declared.has(local) && bindings.boxKite.get(key) !== local;
    };
    const conflicts = [...transformer.used].filter(([key, target]) => taken(target.local, key));
    if (conflicts.length && attempt < 2) {
      for (const [key, target] of conflicts) aliases.set(key, `Box${target.local}`);
      continue;
    }

    const output = fixImports(rewritten, fileName, transformer, surviving);
    const errors = syntaxErrors(parse(output, fileName));
    if (errors.length)
      return { output: text, changed: false, findings: transformer.findings, error: errors.slice(0, 3).join('; '), leftovers: [] };

    return { output, changed: output !== text, findings: transformer.findings, leftovers: leftoversOf(bindings, surviving) };
  }

  throw new Error('unreachable');
}
