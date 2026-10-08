import ts from 'typescript';
import { isJsxEl, JsxEl, openingOf } from '../jsx';
import { Ctx, TODO_TAG, Transformer } from '../transform';
import { Attrs, settle } from './common';

/** The sonner binding a name refers to — `toast` or `Toaster`, from `sonner` or a shadcn `ui/sonner`. */
function sonnerExport(cx: Transformer, node: ts.Node): string | undefined {
  if (!ts.isIdentifier(node)) return undefined;
  const binding = cx.bindings.byLocal.get(node.text);

  return binding?.kind === 'sonner' ? binding.exported : undefined;
}

/** `toast(…)`, `toast.success(…)`, or a `<Toaster>` — the three things sonner's API is used through. */
export function isSonnerSubject(cx: Transformer, node: ts.Node): boolean {
  if (ts.isCallExpression(node)) {
    const callee = node.expression;
    if (sonnerExport(cx, callee) === 'toast') return true;

    return ts.isPropertyAccessExpression(callee) && sonnerExport(cx, callee.expression) === 'toast';
  }

  return isJsxEl(node) && sonnerExport(cx, openingOf(node).tagName) === 'Toaster';
}

/** Methods with the same name and shape on both sides; `message` is plain `toast()` here. */
const METHODS = new Set(['success', 'error', 'warning', 'info', 'loading', 'dismiss', 'promise', 'message']);

/** Options both take; the rest are sonner's styling and are dropped with a note, or need a decision. */
const OPTIONS = new Set(['description', 'duration', 'id', 'action', 'dismissible']);
const DECIDE: Readonly<Record<string, string>> = {
  cancel: 'a toast takes one `action` here — fold `cancel` into it or drop it',
  onAutoClose: '`onAutoClose` is `onDismiss` with the reason `timeout` here',
  onDismiss: '`onDismiss` is handed the reason (`timeout`, `close`, `action`, `imperative`) here, not the toast',
  finally: '`finally` has no equivalent — chain it on the promise, which `toast.promise` returns',
};

const POSITIONS: Readonly<Record<string, string>> = {
  'top-left': 'top-start',
  'top-center': 'top-center',
  'top-right': 'top-end',
  'bottom-left': 'bottom-start',
  'bottom-center': 'bottom-center',
  'bottom-right': 'bottom-end',
};

export function convertSonner(cx: Transformer, node: ts.Node, ctx: Ctx): string {
  return ts.isCallExpression(node) ? call(cx, node, ctx) : toaster(cx, node as JsxEl, ctx);
}

const subject = { family: 'sonner', part: 'toast' };

function call(cx: Transformer, node: ts.CallExpression, ctx: Ctx): string {
  const callee = node.expression;
  const method = ts.isPropertyAccessExpression(callee) ? callee.name.text : undefined;
  const part = { ...subject, part: method ? `toast.${method}` : 'toast' };
  const todos: string[] = [];
  const notes: string[] = [];

  if (method && !METHODS.has(method)) {
    cx.record(node, part, 'todo', [], `toast.${method} has no equivalent`);
    return `/* ${TODO_TAG}: toast.${method} has no equivalent */ ${cx.splice(node, ctx)}`;
  }

  const head = method === 'message' ? cx.rewrite((callee as ts.PropertyAccessExpression).expression, ctx) : cx.rewrite(callee, ctx);
  const typeArguments = node.typeArguments ? `<${node.typeArguments.map((t) => cx.rewrite(t, ctx)).join(', ')}>` : '';
  const args = node.arguments.map((arg, index) => {
    // sonner takes a function returning the promise as readily as the promise; here it has to be called.
    if (method === 'promise' && index === 0 && (ts.isArrowFunction(arg) || ts.isFunctionExpression(arg)))
      return `(${cx.rewrite(arg, ctx)})()`;
    if (!ts.isObjectLiteralExpression(arg) || (method === 'promise' ? index !== 1 : index !== node.arguments.length - 1 || index === 0)) {
      return cx.rewrite(arg, ctx);
    }

    return options(cx, arg, ctx, method === 'promise', todos, notes);
  });
  if (method === 'message') notes.push('`toast.message` is `toast` here');

  cx.record(node, part, todos.length ? 'todo' : 'converted', notes, todos.join('; ') || undefined);
  const text = `${head}${typeArguments}(${args.join(', ')})`;

  return todos.length ? `/* ${TODO_TAG}: ${todos.join('; ')} */ ${text}` : text;
}

/** sonner mixes the promise's three messages with the toast's options in one object; here they are two arguments. */
function options(
  cx: Transformer,
  literal: ts.ObjectLiteralExpression,
  ctx: Ctx,
  promise: boolean,
  todos: string[],
  notes: string[],
): string {
  const messages: string[] = [];
  const kept: string[] = [];
  for (const property of literal.properties) {
    const name = property.name && (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)) ? property.name.text : undefined;
    if (!name || ts.isSpreadAssignment(property)) {
      kept.push(cx.rewrite(property, ctx));
      todos.push('a spread of sonner options — check each one is a Box Kite toast option');
      continue;
    }
    if (promise && ['loading', 'success', 'error'].includes(name)) messages.push(cx.rewrite(property, ctx));
    else if (name === 'id' && ts.isPropertyAssignment(property) && ts.isNumericLiteral(property.initializer))
      kept.push(`id: '${property.initializer.text}'`);
    else if (OPTIONS.has(name)) kept.push(cx.rewrite(property, ctx));
    else if (DECIDE[name]) {
      kept.push(cx.rewrite(property, ctx));
      todos.push(DECIDE[name]);
    } else notes.push(`\`${name}\` dropped — sonner styling`);
  }

  if (promise) return kept.length ? `{ ${messages.join(', ')} }, { ${kept.join(', ')} }` : `{ ${messages.join(', ')} }`;

  return kept.length ? `{ ${kept.join(', ')} }` : '{}';
}

function toaster(cx: Transformer, el: JsxEl, ctx: Ctx): string {
  const attrs = new Attrs(cx, ctx);
  const outcome = attrs.map(el, {
    position: (attr, out) => {
      const value = attr.initializer && ts.isStringLiteral(attr.initializer) ? attr.initializer.text : undefined;
      if (value && POSITIONS[value]) out.push(`position="${POSITIONS[value]}"`);
      else out.todo('`position` is logical here — `top-start`…`bottom-end`');
    },
    visibleToasts: { rename: 'limit' },
    duration: 'keep',
    hotkey: { todo: "`hotkey` is a string here — `'F6'` by default, or `'alt+t'`" },
    className: 'keep',
    ...Object.fromEntries(
      [
        'richColors',
        'expand',
        'closeButton',
        'theme',
        'toastOptions',
        'style',
        'offset',
        'mobileOffset',
        'gap',
        'dir',
        'icons',
        'invert',
        'swipeDirections',
        'containerAriaLabel',
      ].map((name) => [name, { note: `\`${name}\` dropped — sonner styling` }]),
    ),
  });
  settle(cx, el, { ...subject, part: 'Toaster' }, outcome, attrs);

  return `<${openingOf(el).tagName.getText(cx.sf)}${attrs.render().length ? ' ' + attrs.render().join(' ') : ''} />`;
}
