import ts from 'typescript';
import type { Resolved } from '../bindings';
import { attributesOf, booleanValue, childrenOf, element, findAttr, JsxEl, mentions, openingOf } from '../jsx';
import { Ctx, Transformer } from '../transform';
import { onlyElement } from './common';

/** The handlers each trigger bag carries, so one the child already has is composed with it rather than lost. */
const HANDLERS: Readonly<Record<string, readonly string[]>> = {
  tooltip: ['onPointerEnter', 'onPointerLeave', 'onFocus', 'onBlur'],
  popover: ['onClick'],
  dialog: ['onClick'],
  'alert-dialog': ['onClick'],
  'dropdown-menu': ['onClick', 'onKeyDown'],
  collapsible: ['onClick'],
};

export interface TriggerResult {
  fn?: string;
  todo?: string;
  notes: string[];
}

/** A name for the render prop's parameter that nothing inside it already uses — `t` is usually i18n's. */
function parameterFor(cx: Transformer, trigger: JsxEl): string {
  const text = cx.text.slice(cx.start(trigger), trigger.end);

  return ['t', 'trigger', 'triggerProps'].find((name) => !mentions(text, name)) ?? 'triggerBag';
}

/**
 * `<X.Trigger asChild><Button/></X.Trigger>` → `(t) => <Button ref={t.ref} {...t.props} />`. Without `asChild`
 * Radix renders a `<button>`, so that is what the render prop returns. Collapsible's bag carries no ref.
 */
export function convertTrigger(cx: Transformer, trigger: JsxEl, resolved: Resolved, ctx: Ctx): TriggerResult {
  const family = resolved.family.name;
  const withRef = family !== 'collapsible';
  const p = parameterFor(cx, trigger);
  const handlers = HANDLERS[family] ?? [];
  const asChild = booleanValue(findAttr(trigger, 'asChild')) === true;
  const own = attributesOf(trigger).filter((item) => item.kind === 'spread' || !['asChild', 'data-slot'].includes(item.attr.name));

  if (!asChild) {
    const attrs = ['type="button"', ...(withRef ? [`ref={${p}.ref}`] : []), `{...${p}.props}`];
    for (const item of own) attrs.push(item.kind === 'spread' ? cx.rewrite(item.node, ctx) : compose(cx, item.attr, handlers, p, ctx));
    cx.record(trigger, resolved, 'converted');

    return { fn: `(${p}) => ${element('button', attrs, cx.children(childrenOf(trigger), ctx))}`, notes: [] };
  }

  const child = onlyElement(trigger);
  if (!child) return { todo: '`asChild` on something other than one element — write the trigger render prop by hand', notes: [] };
  if (cx.resolve(child)) return { todo: 'one trigger inside another — merge the two refs and prop bags by hand', notes: [] };
  if (own.length)
    return { todo: 'attributes on an `asChild` trigger are merged onto its child by Radix — move them onto the child', notes: [] };

  const opening = openingOf(child);
  // `popovertarget` is read off a button and nothing else, so these three cannot hang off a link or a div.
  const intrinsic = ts.isIdentifier(opening.tagName) && /^[a-z]/.test(opening.tagName.text) ? opening.tagName.text : undefined;
  if (intrinsic && intrinsic !== 'button' && ['popover', 'dropdown-menu', 'collapsible'].includes(family)) {
    return { todo: `the trigger is a \`<${intrinsic}>\` — it has to be a button here`, notes: [] };
  }
  const tag = cx.copy(cx.start(opening.tagName), opening.typeArguments?.end ?? opening.tagName.end);
  const childAttrs = attributesOf(child);
  const boxKite = ts.isIdentifier(opening.tagName) ? [...cx.bindings.boxKite.values()].includes(opening.tagName.text) : false;
  const attrs: string[] = [];

  if (withRef && childAttrs.some((item) => item.kind === 'attr' && item.attr.name === 'ref')) {
    return { todo: 'the trigger already has a `ref` — merge it with the one the render prop hands over', notes: [] };
  }

  if (boxKite) {
    // A Box Kite component takes DOM attributes in `props`, so the bag merges into that rather than being spread.
    if (childAttrs.some((item) => item.kind === 'attr' && handlers.includes(item.attr.name))) {
      return { todo: 'the trigger handles an event the render prop also does — compose the two handlers by hand', notes: [] };
    }
    if (withRef) attrs.push(`ref={${p}.ref}`);
    const existing = childAttrs.find((item) => item.kind === 'attr' && item.attr.name === 'props');
    attrs.push(
      existing && existing.kind === 'attr' ? `props={{ ...${p}.props, ${valueText(cx, existing.attr, ctx)} }}` : `props={${p}.props}`,
    );
    for (const item of childAttrs) {
      if (item.kind === 'attr' && item.attr.name === 'props') continue;
      attrs.push(cx.rewrite(item.kind === 'spread' ? item.node : item.attr.node, ctx));
    }
  } else {
    if (withRef) attrs.push(`ref={${p}.ref}`);
    attrs.push(`{...${p}.props}`);
    for (const item of childAttrs)
      attrs.push(item.kind === 'spread' ? cx.rewrite(item.node, ctx) : compose(cx, item.attr, handlers, p, ctx));
  }

  cx.record(trigger, resolved, 'converted');

  return { fn: `(${p}) => ${element(tag, attrs, ts.isJsxElement(child) ? cx.children(child.children, ctx) : undefined)}`, notes: [] };
}

function valueText(cx: Transformer, attr: ReturnType<typeof findAttr> & object, ctx: Ctx): string {
  const init = attr.initializer;
  const expression = init && ts.isJsxExpression(init) ? init.expression : undefined;
  if (!expression) return '{}';
  // `{ ...t.props, title: 'x' }` rather than `{ ...t.props, ...{ title: 'x' } }`.
  if (ts.isObjectLiteralExpression(expression)) return expression.properties.map((p) => cx.rewrite(p, ctx)).join(', ');

  return `...(${cx.rewrite(expression, ctx)})`;
}

/** A handler the bag also sets is called first, then the bag's — Radix's `Slot` composes them the same way round. */
function compose(
  cx: Transformer,
  attr: NonNullable<ReturnType<typeof findAttr>>,
  handlers: readonly string[],
  p: string,
  ctx: Ctx,
): string {
  if (!handlers.includes(attr.name) || !attr.initializer || !ts.isJsxExpression(attr.initializer) || !attr.initializer.expression) {
    return cx.rewrite(attr.node, ctx);
  }
  const fn = attr.initializer.expression;
  const call = ts.isIdentifier(fn) || ts.isPropertyAccessExpression(fn) ? cx.rewrite(fn, ctx) : `(${cx.rewrite(fn, ctx)})`;

  return `${attr.name}={(event) => { ${call}(event); ${p}.props.${attr.name}?.(event); }}`;
}
