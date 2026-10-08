import ts from 'typescript';
import type { Resolved } from '../bindings';
import { attribute, attributesOf, childrenOf, element, findAttr, isBlank, isJsxEl, JsxEl, objectKey, stringValue } from '../jsx';
import { Ctx, Transformer } from '../transform';
import { Attrs, nodeValue, PLACEMENT, removed, Rules, settle } from './common';

const SHADCN: Rules = {
  inset: { note: "shadcn's `inset` dropped — it indented the item" },
  variant: { note: "shadcn's `variant` dropped — style a destructive item with Box props" },
};

const ITEM: Rules = {
  ...SHADCN,
  disabled: 'keep',
  textValue: { note: '`textValue` dropped — typeahead reads the item’s text' },
  onSelect: (attr, out) => {
    out.push(out.raw(attr));
    if (out.cx.text.slice(attr.node.pos, attr.node.end).includes('preventDefault')) {
      out.todo('`preventDefault()` in `onSelect` kept the Radix menu open — use `closeOnSelect={false}`');
    }
  },
};

const PART: Readonly<Record<string, { name: string; rules: Rules }>> = {
  Item: { name: 'Item', rules: ITEM },
  CheckboxItem: {
    name: 'CheckboxItem',
    rules: {
      ...ITEM,
      onCheckedChange: 'keep',
      checked: (attr, out) => {
        if (stringValue(attr) === 'indeterminate') out.todo('a menu checkbox has no mixed state');
        else out.push(out.raw(attr));
      },
    },
  },
  RadioGroup: { name: 'RadioGroup', rules: { value: 'keep', onValueChange: 'keep' } },
  RadioItem: { name: 'RadioItem', rules: { ...ITEM, value: 'keep' } },
  Group: { name: 'Group', rules: {} },
  Separator: { name: 'Separator', rules: {} },
};

const isPart = (cx: Transformer, node: ts.Node | undefined, ...parts: string[]): node is JsxEl =>
  !!node && isJsxEl(node) && cx.resolve(node)?.family.name === 'dropdown-menu' && parts.includes(cx.resolve(node)!.part);

export function convertMenuPart(cx: Transformer, el: JsxEl, resolved: Resolved, ctx: Ctx, label?: string): string {
  const menu = cx.local(resolved.family.target);

  switch (resolved.part) {
    case 'ItemIndicator':
      return removed(cx, el, resolved, 'Box Kite draws the indicator');
    case 'Label':
      return cx.todo(el, resolved, ctx, 'a label with nothing to name — put it on a `Menu.Group` as `label`');
    case 'Sub':
      return sub(cx, el, resolved, ctx, menu);
    case 'SubTrigger':
    case 'SubContent':
      return cx.todo(el, resolved, ctx, `${resolved.part} outside a DropdownMenuSub`);
  }

  const part = PART[resolved.part];
  if (!part) return cx.todo(el, resolved, ctx, `DropdownMenu${resolved.part} has no equivalent`);
  if (findAttr(el, 'asChild')) return cx.todo(el, resolved, ctx, '`asChild` on a menu item — a Box Kite item is always its own button');

  const attrs = new Attrs(cx, ctx);
  const outcome = attrs.map(el, part.rules);
  const kids = [...childrenOf(el)];
  // A group named by its first child: the label moves into the `label` prop.
  const first = kids.find((kid) => !isBlank(kid));
  if (label === undefined && (resolved.part === 'Group' || resolved.part === 'RadioGroup') && isPart(cx, first, 'Label')) {
    label = labelOf(cx, first, ctx);
    kids.splice(kids.indexOf(first), 1);
  }
  if (label !== undefined) attrs.set('label', label);
  settle(cx, el, resolved, outcome, attrs);
  const children = resolved.part === 'Group' || resolved.part === 'RadioGroup' ? menuChildren(cx, kids, ctx) : cx.children(kids, ctx);

  return element(`${menu}.${part.name}`, attrs.render(), resolved.part === 'Separator' ? undefined : children);
}

function opensWithLabel(cx: Transformer, group: JsxEl): boolean {
  return isPart(
    cx,
    childrenOf(group).find((kid) => !isBlank(kid)),
    'Label',
  );
}

function labelOf(cx: Transformer, label: JsxEl, ctx: Ctx): string {
  cx.record(label, cx.resolve(label)!, 'converted', ['the label is the group’s `label` prop now']);

  return nodeValue(cx, label, ctx) ?? '""';
}

/**
 * A menu's children, with each standalone label folded into a group: the label names the group after it,
 * or, when items follow it directly, a group made of those items — up to the next separator or label.
 */
export function menuChildren(cx: Transformer, children: readonly ts.JsxChild[], ctx: Ctx): string {
  let out = '';
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (!isPart(cx, child, 'Label')) {
      out += cx.rewrite(child, ctx);
      continue;
    }

    const next = (from: number) => {
      for (let j = from; j < children.length; j++) if (!isBlank(children[j])) return j;
      return -1;
    };
    let j = next(i + 1);
    const resolved = cx.resolve(child)!;
    // A separator straight after a label is the label's underline; the group heading takes its place.
    const underline = j >= 0 && isPart(cx, children[j], 'Separator') ? (children[j] as JsxEl) : undefined;
    if (underline) j = next(j + 1);
    const dropUnderline = () =>
      underline && removed(cx, underline, cx.resolve(underline)!, 'a separator under a label — the group heading replaces it');

    if (j >= 0 && isPart(cx, children[j], 'Group', 'RadioGroup') && !opensWithLabel(cx, children[j] as JsxEl)) {
      const group = children[j] as JsxEl;
      dropUnderline();
      out += convertMenuPart(cx, group, cx.resolve(group)!, ctx, labelOf(cx, child, ctx));
      i = j;
      continue;
    }

    let end = j;
    while (end >= 0 && end < children.length && !isPart(cx, children[end], 'Separator', 'Label', 'Group', 'RadioGroup')) end++;
    const members = j >= 0 ? children.slice(j, end).filter((kid, index, all) => !(index === all.length - 1 && isBlank(kid))) : [];
    if (!members.some((kid) => !isBlank(kid))) {
      out += cx.todo(child, resolved, ctx, 'a label with nothing to name — put it on a `Menu.Group` as `label`');
      continue;
    }

    dropUnderline();
    const label = labelOf(cx, child, ctx);
    out += element(`${cx.local(resolved.family.target)}.Group`, [attribute('label', label)], menuChildren(cx, members, ctx));
    i = j + members.length - 1;
  }

  return out;
}

function sub(cx: Transformer, el: JsxEl, resolved: Resolved, ctx: Ctx, menu: string): string {
  let trigger: JsxEl | undefined;
  let content: JsxEl | undefined;
  const visit = (node: ts.Node) => {
    if (isPart(cx, node, 'SubTrigger')) trigger ??= node;
    else if (isPart(cx, node, 'SubContent')) content ??= node;
    else if (!isPart(cx, node, 'Sub')) ts.forEachChild(node, visit);
  };
  ts.forEachChild(el, visit);
  if (!trigger || !content) return cx.todo(el, resolved, ctx, 'a submenu without both its trigger and its content');

  const attrs = new Attrs(cx, ctx);
  const outcome = attrs.map(el, {
    open: { todo: 'a submenu’s open state is its own — drop `open`' },
    defaultOpen: { todo: 'a submenu’s open state is its own — drop `defaultOpen`' },
    onOpenChange: { todo: 'a submenu reports nothing — drop `onOpenChange`' },
  });
  // The submenu renders its own item, so what the Radix trigger carried goes on that item through `itemProps`.
  const itemProps: string[] = [];
  for (const item of attributesOf(trigger)) {
    if (item.kind === 'spread') itemProps.push(cx.rewrite(item.node, ctx));
    else if (item.attr.name === 'disabled') attrs.push(attrs.raw(item.attr));
    else if (!['inset', 'textValue', 'data-slot', 'asChild'].includes(item.attr.name))
      itemProps.push(`${objectKey(item.attr.name)}: ${attrs.expr(item.attr)}`);
  }
  if (itemProps.length) attrs.push(`itemProps={{ ${itemProps.join(', ')} }}`);
  attrs.set('label', nodeValue(cx, trigger, ctx) ?? '""');
  cx.record(trigger, cx.resolve(trigger)!, 'converted', ['the trigger is the submenu’s `label` now']);

  const contentOutcome = attrs.map(content, { ...PLACEMENT, loop: 'drop' });
  settle(cx, content, cx.resolve(content)!, contentOutcome, attrs);
  for (let node: ts.Node = content.parent; node && node !== el; node = node.parent) {
    if (isJsxEl(node) && cx.resolve(node)?.part === 'Portal') cx.record(node, cx.resolve(node)!, 'removed');
  }
  settle(cx, el, resolved, outcome, attrs);

  return element(`${menu}.Sub`, attrs.render(), menuChildren(cx, childrenOf(content), ctx));
}
