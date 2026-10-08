import ts from 'typescript';
import type { Resolved } from '../bindings';
import {
  Attr,
  attributesOf,
  attribute,
  booleanValue,
  childrenOf,
  JsxEl,
  meaningfulChildren,
  numberValue,
  objectKey,
  openingOf,
  stringValue,
} from '../jsx';
import { Ctx, TODO_TAG, Transformer } from '../transform';

/**
 * What happens to one Radix attribute. `keep` is the same name on the Box Kite element, `drop` is silent,
 * a note drops it and says why, a TODO drops it and leaves the reason in the code.
 */
export type Rule = 'keep' | 'drop' | { rename: string } | { note: string } | { todo: string } | ((attr: Attr, out: Attrs) => void);

export type Rules = Readonly<Record<string, Rule>>;

/** Attributes a Box component takes at the top level whatever its tag; the rest of the DOM goes in `props`. */
const TOP_LEVEL = new Set(['className', 'id', 'key', 'ref', 'disabled', 'required', 'checked']);

/** The notes and TODOs one element's attributes produced. */
export interface Outcome {
  notes: string[];
  todos: string[];
}

/** Collects the attributes of the element being written, from as many Radix elements as fold into it. */
export class Attrs {
  readonly list: string[] = [];
  readonly props: string[] = [];
  readonly comments: string[] = [];
  private current: Outcome = { notes: [], todos: [] };

  constructor(
    readonly cx: Transformer,
    readonly ctx: Ctx,
  ) {}

  /** The attribute's value as an expression: `"x"` stays a string literal, a bare attribute is `true`. */
  expr(attr: Attr): string {
    const init = attr.initializer;
    if (!init) return 'true';
    if (ts.isStringLiteral(init)) return this.cx.copy(init.getStart(this.cx.sf), init.end);
    if (ts.isJsxExpression(init)) return init.expression ? this.cx.rewrite(init.expression, this.ctx) : 'undefined';

    return this.cx.rewrite(init, this.ctx);
  }

  /** The attribute as written, value included — for one that keeps its name. */
  raw(attr: Attr): string {
    return this.cx.rewrite(attr.node, this.ctx);
  }

  push(text: string) {
    this.list.push(text);
  }

  set(name: string, expression: string | true) {
    this.list.push(attribute(name, expression));
  }

  prop(name: string, value: string) {
    this.props.push(`${objectKey(name)}: ${value}`);
  }

  note(message: string) {
    this.current.notes.push(message);
  }

  todo(message: string) {
    this.current.todos.push(message);
  }

  /** Maps every attribute of `el` through `rules`, and returns what that one element left behind. */
  map(el: JsxEl, rules: Rules): Outcome {
    this.current = { notes: [], todos: [] };
    for (const item of attributesOf(el)) {
      if (item.kind === 'spread') {
        this.list.push(this.cx.rewrite(item.node, this.ctx));
        this.todo('a spread of Radix props is passed on as it is — check that what it carries is a Box Kite prop');
        continue;
      }
      const { attr } = item;
      const rule = rules[attr.name] ?? defaultRule(attr.name);
      if (rule === 'keep') this.list.push(this.raw(attr));
      else if (rule === 'drop') continue;
      else if (typeof rule === 'function') rule(attr, this);
      else if ('rename' in rule) this.set(rule.rename, attr.initializer ? this.expr(attr) : true);
      else if ('note' in rule) this.note(rule.note);
      else this.todo(rule.todo);
    }

    return this.current;
  }

  /** The finished attribute list: TODOs first, where a reader of the tag sees them, then the `props` bag. */
  render(): string[] {
    const comments = this.comments.map((message) => `/* ${TODO_TAG}: ${message.replace(/\*\//g, '* /')} */`);

    return [...comments, ...this.list, ...(this.props.length ? [`props={{ ${this.props.join(', ')} }}`] : [])];
  }
}

function defaultRule(name: string): Rule {
  if (name === 'data-slot') return 'drop';
  if (name === 'asChild') return { todo: '`asChild` has no equivalent on this part' };
  if (name === 'style')
    return (attr, out) => {
      out.push(out.raw(attr));
      out.note('`style` is passed through — Box props are the idiom for it');
    };
  if (name === 'className')
    return (attr, out) => {
      const raw = out.raw(attr);
      out.push(raw);
      if (/data-\[?state/.test(raw))
        out.note("`className` styles Radix's `data-state`, which Box Kite does not set — restyle those states");
    };
  if (TOP_LEVEL.has(name)) return 'keep';

  return (attr, out) => out.prop(attr.name, out.expr(attr));
}

/** Records the element and, when its attributes left TODOs, puts them in the output tag. */
export function settle(
  cx: Transformer,
  el: JsxEl,
  resolved: Parameters<Transformer['record']>[1],
  outcome: Outcome,
  out?: Attrs,
  extraNotes: string[] = [],
) {
  const notes = [...outcome.notes, ...extraNotes];
  if (outcome.todos.length) {
    cx.record(el, resolved, 'todo', notes, outcome.todos.join('; '));
    out?.comments.push(...outcome.todos);
  } else {
    cx.record(el, resolved, 'converted', notes);
  }
}

/** A part with no Box Kite counterpart that renders nothing of its own (`Portal`, `Arrow`, `Thumb`). */
export function removed(cx: Transformer, el: JsxEl, resolved: Resolved, note?: string): string {
  cx.record(el, resolved, 'removed', note ? [note] : []);

  return '';
}

/** A wrapper part whose children survive it (`Portal`, `Viewport`, `Header`). */
export function unwrap(cx: Transformer, el: JsxEl, resolved: Resolved, ctx: Ctx, note?: string): string {
  cx.record(el, resolved, 'removed', note ? [note] : []);
  const children = cx.children(childrenOf(el), ctx);
  const kids = meaningfulChildren(el);
  // Outside a JSX parent the children need one element to stand in for them.
  const inJsx = ts.isJsxElement(el.parent) || ts.isJsxFragment(el.parent);

  return inJsx || !kids.length || (kids.length === 1 && !ts.isJsxText(kids[0]) && !ts.isJsxExpression(kids[0]))
    ? children
    : `<>${children}</>`;
}

/** The single JSX element among the children, if that is all there is. */
export function onlyElement(el: JsxEl): JsxEl | undefined {
  const kids = meaningfulChildren(el);

  return kids.length === 1 && (ts.isJsxElement(kids[0]) || ts.isJsxSelfClosingElement(kids[0])) ? kids[0] : undefined;
}

export const tagText = (cx: Transformer, el: JsxEl) => openingOf(el).tagName.getText(cx.sf);

/** A node as a prop value: text becomes a string, one element stays itself, anything else is a fragment. */
export function nodeValue(cx: Transformer, el: JsxEl, ctx: Ctx): string | undefined {
  const kids = meaningfulChildren(el).filter((kid) => !cx.lifted.has(kid));
  if (!kids.length) return undefined;
  if (kids.length === 1 && ts.isJsxText(kids[0])) return JSON.stringify(kids[0].getText(cx.sf).replace(/\s+/g, ' ').trim());
  if (kids.length === 1 && ts.isJsxExpression(kids[0]) && kids[0].expression) return cx.rewrite(kids[0].expression, ctx);
  if (kids.length === 1) return cx.rewrite(kids[0], ctx);

  return `<>${cx.children(childrenOf(el), ctx)}</>`;
}

/** `side`: Radix's physical left/right are the inline axis here, so they mirror in a right-to-left page. */
export const SIDE: Readonly<Record<string, string>> = { top: 'top', bottom: 'bottom', left: 'start', right: 'end' };

/** The four placement attributes every floating part shares, mapped onto `side`/`align`/`offset`/`flip`. */
export const PLACEMENT: Rules = {
  side: (attr, out) => {
    const value = stringValue(attr);
    if (value && SIDE[value]) out.push(`side="${SIDE[value]}"`);
    else out.todo('`side` is not a literal — `left`/`right` are `start`/`end` here');
  },
  sideOffset: (attr, out) => {
    const value = numberValue(attr);
    if (value === 0) return;
    out.set('offset', value !== undefined ? String(value / 4) : `(${out.expr(attr)}) / 4`);
  },
  align: 'keep',
  alignOffset: (attr, out) => {
    if (numberValue(attr) !== 0) out.todo('`alignOffset` has no equivalent — nudge the layer with a margin');
  },
  avoidCollisions: (attr, out) => {
    if (booleanValue(attr) === false) out.set('flip', 'false');
  },
  collisionPadding: { note: '`collisionPadding` dropped — the browser places the layer' },
  collisionBoundary: { note: '`collisionBoundary` dropped — the browser places the layer' },
  sticky: { note: '`sticky` dropped — the browser places the layer' },
  hideWhenDetached: { note: '`hideWhenDetached` dropped' },
  arrowPadding: 'drop',
  updatePositionStrategy: 'drop',
  forceMount: { note: '`forceMount` dropped — the layer is rendered while it is open' },
};

/** `(e) => e.preventDefault()` and its block form — the one Radix event handler with a mechanical answer. */
export function isPreventDefault(attr: Attr): boolean {
  const init = attr.initializer;
  const fn = init && ts.isJsxExpression(init) ? init.expression : undefined;
  if (!fn || !(ts.isArrowFunction(fn) || ts.isFunctionExpression(fn)) || fn.parameters.length !== 1) return false;
  const param = fn.parameters[0].name;
  if (!ts.isIdentifier(param)) return false;
  let body: ts.Node = fn.body;
  if (ts.isBlock(body)) {
    if (body.statements.length !== 1 || !ts.isExpressionStatement(body.statements[0])) return false;
    body = body.statements[0].expression;
  }

  return (
    ts.isCallExpression(body) &&
    !body.arguments.length &&
    ts.isPropertyAccessExpression(body.expression) &&
    body.expression.name.text === 'preventDefault' &&
    ts.isIdentifier(body.expression.expression) &&
    body.expression.expression.text === param.text
  );
}

/** The first meaningful child is a label part — a menu group or a select group names itself with one. */
export function childOf(cx: Transformer, el: JsxEl, part: string): JsxEl | undefined {
  for (const kid of meaningfulChildren(el)) {
    if ((ts.isJsxElement(kid) || ts.isJsxSelfClosingElement(kid)) && cx.resolve(kid)?.part === part) return kid;
  }

  return undefined;
}
