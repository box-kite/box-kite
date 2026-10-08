import ts from 'typescript';
import type { Resolved } from '../bindings';
import { attributesOf, booleanValue, childrenOf, element, findAttr, JsxEl, openingOf } from '../jsx';
import { Ctx, Transformer } from '../transform';
import { Attrs, onlyElement, removed, Rules, settle, unwrap } from './common';
import { convertLayerRoot, strayLayerPart } from './layers';
import { convertMenuPart, menuChildren } from './menu';

const BUTTON = { module: 'button', name: 'Button' } as const;

/** Every part of the six floating families: the root folds the rest in, and these are what it meets inside. */
export function convertLayerPart(cx: Transformer, el: JsxEl, resolved: Resolved, ctx: Ctx): string {
  const family = resolved.family.name;

  switch (resolved.part) {
    case 'Root':
      return convertLayerRoot(cx, el, resolved, ctx);
    case 'Provider': {
      const delay = findAttr(el, 'delayDuration');
      return unwrap(
        cx,
        el,
        resolved,
        ctx,
        delay
          ? 'TooltipProvider dropped — its `delayDuration` is `openDelay` on each Tooltip now'
          : 'TooltipProvider dropped — Box Kite needs no provider',
      );
    }
    case 'Portal':
      return unwrap(cx, el, resolved, ctx, 'no portal — the layer is in the top layer where it is declared');
    case 'Overlay':
      return removed(
        cx,
        el,
        resolved,
        findAttr(el, 'className') ? 'the overlay is the dialog’s `::backdrop` now — style it with the `backdrop` prop' : undefined,
      );
    case 'Arrow':
      return removed(cx, el, resolved, 'Box Kite layers draw no arrow');
    case 'Content':
      if (!cx.handled.has(el)) return strayLayerPart(cx, el, resolved, ctx);
      return family === 'dropdown-menu' ? menuChildren(cx, childrenOf(el), ctx) : cx.children(childrenOf(el), ctx);
    case 'Trigger':
    case 'Anchor':
      return resolved.part === 'Anchor'
        ? cx.todo(el, resolved, ctx, 'Popover.Anchor has no equivalent — the popover hangs off its trigger')
        : strayLayerPart(cx, el, resolved, ctx);
    case 'Title':
    case 'Description':
      return titled(cx, el, resolved, ctx);
    case 'Close':
      return family === 'popover'
        ? cx.todo(el, resolved, ctx, 'Popover.Close has no equivalent — control `open` and set it to false')
        : close(cx, el, resolved, ctx);
    case 'Action':
    case 'Cancel':
      return close(cx, el, resolved, ctx);
    default:
      return family === 'dropdown-menu'
        ? convertMenuPart(cx, el, resolved, ctx)
        : cx.todo(el, resolved, ctx, `${resolved.part} has no equivalent`);
  }
}

function titled(cx: Transformer, el: JsxEl, resolved: Resolved, ctx: Ctx): string {
  const attrs = new Attrs(cx, ctx);
  settle(cx, el, resolved, attrs.map(el, { asChild: { todo: '`asChild` on a title — the part renders its own heading' } }), attrs);

  return element(`${cx.local(resolved.family.target)}.${resolved.part}`, attrs.render(), cx.children(childrenOf(el), ctx));
}

const BUTTON_RULES: Rules = { asChild: 'drop' };

/**
 * A close is a submit inside `<form method="dialog">`, the platform's own close (reported as `imperative`);
 * inside a form already it is a submit whose `formMethod` says the same, since forms cannot nest.
 */
function close(cx: Transformer, el: JsxEl, resolved: Resolved, ctx: Ctx): string {
  const asChild = booleanValue(findAttr(el, 'asChild')) === true;
  const notes = [ctx.inForm ? 'closes as a submit with `formMethod="dialog"`' : 'closes through a `<form method="dialog">` around it'];
  let tag: string;
  let attrs: string[];
  let children: string | undefined;
  let boxKite: boolean;

  if (asChild) {
    const child = onlyElement(el);
    if (!child || cx.resolve(child))
      return cx.todo(el, resolved, ctx, '`asChild` on something other than one element — close the dialog by hand');
    const opening = openingOf(child);
    tag = cx.copy(cx.start(opening.tagName), opening.typeArguments?.end ?? opening.tagName.end);
    boxKite = ts.isIdentifier(opening.tagName) && [...cx.bindings.boxKite.values()].includes(opening.tagName.text);
    attrs = attributesOf(child)
      .filter((item) => item.kind === 'spread' || item.attr.name !== 'type')
      .map((item) => cx.rewrite(item.kind === 'spread' ? item.node : item.attr.node, ctx));
    children = ts.isJsxElement(child) ? cx.children(child.children, ctx) : undefined;
  } else {
    // shadcn draws Action and Cancel as its own buttons; a project keeping `ui/button` keeps that look.
    const shadcnButton = resolved.origin === 'shadcn' && resolved.family.name === 'alert-dialog';
    const ui = shadcnButton ? cx.uiButton() : undefined;
    tag = ui ?? (shadcnButton ? cx.local(BUTTON) : 'button');
    boxKite = shadcnButton && !ui;
    const mapped = new Attrs(cx, ctx);
    const outcome = boxKite ? mapped.map(el, { ...BUTTON_RULES, onClick: 'keep', type: 'drop' }) : rawAttrs(cx, el, ctx, mapped);
    if (outcome.todos.length) return cx.todo(el, resolved, ctx, outcome.todos.join('; '));
    attrs = mapped.render();
    if (ui && resolved.part === 'Cancel' && !findAttr(el, 'variant')) attrs.unshift('variant="outline"');
    children = cx.children(childrenOf(el), ctx);
  }

  attrs.unshift('type="submit"');
  if (ctx.inForm) {
    if (boxKite)
      return cx.todo(
        el,
        resolved,
        ctx,
        'a close inside a form — give this Button `props={{ formMethod: "dialog", formNoValidate: true }}`',
      );
    attrs.push('formMethod="dialog"', 'formNoValidate');
  }
  cx.record(el, resolved, 'converted', notes);
  const button = element(tag, attrs, children);

  return ctx.inForm ? button : `<form method="dialog">${button}</form>`;
}

/** A plain `<button>` takes every attribute as written, except the two that only meant something to Radix. */
function rawAttrs(cx: Transformer, el: JsxEl, ctx: Ctx, out: Attrs) {
  for (const item of attributesOf(el)) {
    if (item.kind === 'attr' && ['asChild', 'data-slot', 'type'].includes(item.attr.name)) continue;
    out.push(cx.rewrite(item.kind === 'spread' ? item.node : item.attr.node, ctx));
  }

  return { notes: [], todos: [] };
}
