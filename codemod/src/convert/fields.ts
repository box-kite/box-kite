import ts from 'typescript';
import type { Resolved } from '../bindings';
import { Attr, attributesOf, childrenOf, element, findAttr, isJsxEl, JsxEl, meaningfulChildren, stringValue } from '../jsx';
import { Ctx, TODO_TAG, Transformer } from '../transform';
import { Attrs, removed, Rules, settle, unwrap } from './common';

const DIR = { note: '`dir` dropped — the direction is read off the page' } as const;

/** One part, renamed: the attributes go through `rules` and the children are rewritten in place. */
function renamed(cx: Transformer, el: JsxEl, resolved: Resolved, ctx: Ctx, tag: string, rules: Rules, children?: string): string {
  const attrs = new Attrs(cx, ctx);
  settle(cx, el, resolved, attrs.map(el, rules), attrs);

  return element(tag, attrs.render(), children ?? cx.children(childrenOf(el), ctx));
}

/** A TODO where a child stood, for something removed that the reader should know about. */
export const todoComment = (message: string) => `{/* ${TODO_TAG}: ${message.replace(/\*\//g, '* /')} */}`;

/** The function a handler attribute holds, or undefined for anything that is not written inline. */
function inlineFunction(attr: Attr): ts.ArrowFunction | ts.FunctionExpression | undefined {
  const init = attr.initializer;
  const expression = init && ts.isJsxExpression(init) ? init.expression : undefined;

  return expression && (ts.isArrowFunction(expression) || ts.isFunctionExpression(expression)) ? expression : undefined;
}

/** `(value) => body` written with a new first parameter, keeping the body as it was. */
function withParameter(out: Attrs, fn: ts.ArrowFunction | ts.FunctionExpression, parameter: string): string {
  const body = out.cx.rewrite(fn.body, out.ctx);
  const async = fn.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword) ? 'async ' : '';

  return `${async}(${parameter}) => ${body}`;
}

export function convertTabs(cx: Transformer, el: JsxEl, resolved: Resolved, ctx: Ctx): string {
  const tabs = cx.local(resolved.family.target);
  switch (resolved.part) {
    case 'Root':
      return renamed(cx, el, resolved, ctx, tabs, {
        value: 'keep',
        defaultValue: 'keep',
        onValueChange: 'keep',
        orientation: 'keep',
        activationMode: { rename: 'activation' },
        dir: DIR,
      });
    case 'List':
      return renamed(cx, el, resolved, ctx, `${tabs}.List`, {
        'aria-label': { rename: 'label' },
        'aria-labelledby': { rename: 'labelledBy' },
        loop: (attr, out) => {
          if (attr.initializer && out.expr(attr) !== 'true') out.todo('`loop` belongs to the root here — set it on `<Tabs>`');
        },
      });
    case 'Trigger':
      return renamed(cx, el, resolved, ctx, `${tabs}.Tab`, { value: 'keep', disabled: 'keep' });
    default:
      return renamed(cx, el, resolved, ctx, `${tabs}.Panel`, {
        value: 'keep',
        forceMount: { todo: '`forceMount` is `keepMounted` on `<Tabs>` here, and it keeps every panel' },
      });
  }
}

export function convertAccordion(cx: Transformer, el: JsxEl, resolved: Resolved, ctx: Ctx): string {
  const accordion = cx.local(resolved.family.target);
  switch (resolved.part) {
    case 'Root': {
      const single = stringValue(findAttr(el, 'type')) !== 'multiple';
      // A single accordion's value is a string in Radix and a one-item list here, `''` meaning none open.
      const listOf = (attr: Attr, out: Attrs, controlled: boolean) => {
        const literal = stringValue(attr);
        if (literal !== undefined) out.set(attr.name, `[${JSON.stringify(literal)}]`);
        else out.set(attr.name, controlled ? `${out.expr(attr)} ? [${out.expr(attr)}] : []` : `[${out.expr(attr)}]`);
      };
      const rules: Rules = single
        ? {
            type: 'drop',
            collapsible: 'drop',
            value: (attr, out) => listOf(attr, out, true),
            defaultValue: (attr, out) => listOf(attr, out, false),
            onValueChange: (attr, out) => {
              const fn = inlineFunction(attr);
              const param = fn?.parameters.length === 1 && ts.isIdentifier(fn.parameters[0].name) ? fn.parameters[0].name.text : undefined;
              out.set(
                'onValueChange',
                fn && param ? withParameter(out, fn, `[${param} = '']`) : `(value) => (${out.expr(attr)})(value[0] ?? '')`,
              );
            },
            orientation: { note: '`orientation` dropped — the arrow keys are Up/Down' },
            disabled: { todo: '`disabled` belongs to each `Accordion.Item` here' },
            dir: DIR,
          }
        : {
            type: (_, out) => out.set('multiple', true),
            value: 'keep',
            defaultValue: 'keep',
            onValueChange: 'keep',
            orientation: { note: '`orientation` dropped — the arrow keys are Up/Down' },
            disabled: { todo: '`disabled` belongs to each `Accordion.Item` here' },
            dir: DIR,
          };
      const notes =
        single && !findAttr(el, 'collapsible') ? ['the open item can be closed here — Radix kept one open without `collapsible`'] : [];
      const attrs = new Attrs(cx, ctx);
      settle(cx, el, resolved, attrs.map(el, rules), attrs, notes);

      return element(accordion, attrs.render(), cx.children(childrenOf(el), ctx));
    }
    case 'Item':
      return renamed(cx, el, resolved, ctx, `${accordion}.Item`, { value: 'keep', disabled: 'keep' });
    case 'Header':
      if (findAttr(el, 'asChild')) return cx.todo(el, resolved, ctx, 'a custom header — set `level` on `Accordion.Trigger` instead');
      return unwrap(cx, el, resolved, ctx, 'the trigger renders its own heading — `level` sets which');
    case 'Trigger':
      return renamed(cx, el, resolved, ctx, `${accordion}.Trigger`, {});
    default:
      return renamed(cx, el, resolved, ctx, `${accordion}.Panel`, {
        forceMount: { note: '`forceMount` dropped — a panel is always rendered' },
      });
  }
}

export function convertRadioGroup(cx: Transformer, el: JsxEl, resolved: Resolved, ctx: Ctx): string {
  const group = cx.local(resolved.family.target);
  switch (resolved.part) {
    case 'Root':
      return renamed(cx, el, resolved, ctx, group, {
        value: 'keep',
        defaultValue: 'keep',
        onValueChange: 'keep',
        name: 'keep',
        orientation: 'keep',
        loop: 'drop',
        disabled: { todo: '`disabled` belongs to each `RadioGroup.Item` here' },
        required: { note: '`required` dropped' },
        dir: DIR,
      });
    case 'Item':
      // The item is the input itself, so an `id` a `<label htmlFor>` points at stays at the top level.
      if (!meaningfulChildren(el).every((kid) => isJsxEl(kid) && cx.resolve(kid)?.part === 'Indicator')) {
        return cx.todo(el, resolved, ctx, 'children beside the indicator — the item’s text is its `label` here');
      }
      return renamed(cx, el, resolved, ctx, `${group}.Item`, { value: 'keep' });
    default:
      return removed(cx, el, resolved, 'Box Kite draws the indicator');
  }
}

/** `onCheckedChange={(checked) => …}` reads the input's own `checked` now: `onChange={({ target: { checked } }) => …}`. */
function checkedHandler(attr: Attr, out: Attrs) {
  const fn = inlineFunction(attr);
  const param = fn?.parameters.length === 1 && ts.isIdentifier(fn.parameters[0].name) ? fn.parameters[0].name.text : undefined;
  if (fn && param)
    out.set('onChange', withParameter(out, fn, param === 'checked' ? '{ target: { checked } }' : `{ target: { checked: ${param} } }`));
  else out.set('onChange', `(event) => (${out.expr(attr)})(event.target.checked)`);
}

export function convertToggle(cx: Transformer, el: JsxEl, resolved: Resolved, ctx: Ctx): string {
  if (resolved.part !== 'Root') return removed(cx, el, resolved, 'Box Kite draws the indicator');

  const rules: Rules = {
    checked: (attr, out) => {
      if (stringValue(attr) === 'indeterminate') out.set('indeterminate', true);
      else out.push(out.raw(attr));
      if (stringValue(attr) === undefined && /['"]indeterminate['"]/.test(out.raw(attr))) {
        out.todo('`checked` can be `"indeterminate"` — that is the `indeterminate` prop here, beside a boolean `checked`');
      }
    },
    defaultChecked: (attr, out) => {
      if (stringValue(attr) === 'indeterminate') out.todo('an uncontrolled mixed state — control it with `indeterminate`');
      else out.push(out.raw(attr));
    },
    onCheckedChange: checkedHandler,
    name: 'keep',
    value: 'keep',
  };
  const attrs = new Attrs(cx, ctx);
  const outcome = attrs.map(el, rules);
  const extra = meaningfulChildren(el).filter((kid) => !(isJsxEl(kid) && cx.resolve(kid)?.family === resolved.family));
  if (extra.length) outcome.todos.push('children beside the indicator — a Box Kite toggle draws itself; use `label` for its text');
  for (const kid of meaningfulChildren(el))
    if (isJsxEl(kid) && cx.resolve(kid)) removed(cx, kid, cx.resolve(kid)!, 'Box Kite draws the indicator');
  settle(cx, el, resolved, outcome, attrs);

  return element(cx.local(resolved.family.target), attrs.render());
}

/** Radix's slider value is always an array; a single thumb is a plain number here. */
function singleThumb(el: JsxEl): boolean {
  for (const name of ['value', 'defaultValue']) {
    const attr = findAttr(el, name);
    const init = attr?.initializer;
    const expression = init && ts.isJsxExpression(init) ? init.expression : undefined;
    if (
      attr &&
      !(
        expression &&
        ts.isArrayLiteralExpression(expression) &&
        expression.elements.length === 1 &&
        !ts.isSpreadElement(expression.elements[0])
      )
    ) {
      return false;
    }
  }
  for (const name of ['onValueChange', 'onValueCommit']) {
    const attr = findAttr(el, name);
    if (!attr) continue;
    const fn = inlineFunction(attr);
    const destructured =
      fn?.parameters.length === 1 && ts.isArrayBindingPattern(fn.parameters[0].name) && fn.parameters[0].name.elements.length === 1;
    const init = attr.initializer;
    const reference =
      init &&
      ts.isJsxExpression(init) &&
      init.expression &&
      (ts.isIdentifier(init.expression) || ts.isPropertyAccessExpression(init.expression));
    if (!destructured && !reference) return false;
  }

  return true;
}

export function convertSlider(cx: Transformer, el: JsxEl, resolved: Resolved, ctx: Ctx): string {
  if (resolved.part !== 'Root') return removed(cx, el, resolved, 'Box Kite draws the track and the thumbs');

  const single = singleThumb(el);
  const unwrapArray = (attr: Attr, out: Attrs) => {
    const expression = (attr.initializer as ts.JsxExpression).expression as ts.ArrayLiteralExpression;
    out.set(attr.name, out.cx.rewrite(expression.elements[0], out.ctx));
  };
  const handler = (attr: Attr, out: Attrs) => {
    const fn = inlineFunction(attr);
    if (fn) {
      const binding = (fn.parameters[0].name as ts.ArrayBindingPattern).elements[0];
      out.set(attr.name, withParameter(out, fn, out.cx.rewrite(binding, out.ctx)));
    } else {
      out.set(attr.name, `(value) => ${out.expr(attr)}([value])`);
    }
  };
  const thumbs = meaningfulChildren(el).length ? collectThumbLabels(cx, el) : [];
  const attrs = new Attrs(cx, ctx);
  const outcome = attrs.map(el, {
    value: single ? unwrapArray : 'keep',
    defaultValue: single ? unwrapArray : 'keep',
    onValueChange: single ? handler : 'keep',
    onValueCommit: single ? handler : 'keep',
    min: 'keep',
    max: 'keep',
    step: 'keep',
    orientation: 'keep',
    name: 'keep',
    'aria-label': { rename: 'label' },
    'aria-labelledby': { rename: 'labelledBy' },
    inverted: { todo: '`inverted` has no equivalent' },
    minStepsBetweenThumbs: { todo: '`minStepsBetweenThumbs` has no equivalent — thumbs may meet but never pass' },
    dir: DIR,
    form: 'drop',
  });
  if (thumbs.length === 1 && single && !findAttr(el, 'aria-label')) attrs.set('label', JSON.stringify(thumbs[0]));
  if (thumbs.length > 1) attrs.set('thumbLabels', JSON.stringify(thumbs));
  for (const kid of descendants(cx, el)) removed(cx, kid, cx.resolve(kid)!, 'Box Kite draws the track and the thumbs');
  if (meaningfulChildren(el).some((kid) => !(isJsxEl(kid) && cx.resolve(kid)?.family === resolved.family))) {
    outcome.todos.push('children that are not track or thumb — a Box Kite slider draws itself');
  }
  settle(cx, el, resolved, outcome, attrs, single ? [] : ['an array value is a range here, one thumb per element']);

  return element(cx.local(resolved.family.target), attrs.render());
}

function descendants(cx: Transformer, el: JsxEl): JsxEl[] {
  const found: JsxEl[] = [];
  const visit = (node: ts.Node) => {
    if (node !== el && isJsxEl(node) && cx.resolve(node)?.family.name === 'slider') found.push(node);
    ts.forEachChild(node, visit);
  };
  visit(el);

  return found;
}

function collectThumbLabels(cx: Transformer, el: JsxEl): string[] {
  return descendants(cx, el)
    .filter((kid) => cx.resolve(kid)!.part === 'Thumb')
    .map((thumb) => stringValue(findAttr(thumb, 'aria-label')))
    .filter((label): label is string => label !== undefined);
}

export function convertProgress(cx: Transformer, el: JsxEl, resolved: Resolved, ctx: Ctx): string {
  if (resolved.part !== 'Root') return removed(cx, el, resolved, 'Box Kite draws the bar');
  for (const kid of meaningfulChildren(el))
    if (isJsxEl(kid) && cx.resolve(kid)) removed(cx, kid, cx.resolve(kid)!, 'Box Kite draws the bar');

  return renamed(
    cx,
    el,
    resolved,
    ctx,
    cx.local(resolved.family.target),
    {
      value: 'keep',
      max: 'keep',
      getValueLabel: { todo: '`getValueLabel(value, max)` is `format(value)` here' },
      'aria-label': { rename: 'label' },
      'aria-labelledby': { rename: 'labelledBy' },
    },
    '',
  );
}

/** Finds the parts of one select, never reaching into another select nested inside it. */
function selectParts(cx: Transformer, root: JsxEl) {
  const parts = new Map<string, JsxEl>();
  const visit = (node: ts.Node) => {
    if (node !== root && isJsxEl(node)) {
      const resolved = cx.resolve(node);
      if (resolved?.family.name === 'select') {
        if (resolved.part === 'Root') return;
        if (!parts.has(resolved.part)) parts.set(resolved.part, node);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(root);

  return parts;
}

const SELECT_CONTENT_NOTE = 'the listbox’s placement and styling props were dropped — `itemsProps` styles it';

export function convertSelect(cx: Transformer, el: JsxEl, resolved: Resolved, ctx: Ctx): string {
  const dropdown = cx.local(resolved.family.target);
  const inSelect: Ctx = { ...ctx, frame: { family: 'select', origin: resolved.origin } };

  switch (resolved.part) {
    case 'Root':
      break;
    case 'Portal':
    case 'Viewport':
    case 'ItemText':
      return unwrap(cx, el, resolved, ctx);
    case 'Content':
      if (!cx.handled.has(el)) return cx.todo(el, resolved, ctx, 'SelectContent outside its Select');
      return cx.children(childrenOf(el), ctx);
    case 'Group':
      if (!ts.isJsxElement(el.parent))
        return cx.todo(el, resolved, ctx, 'a group made in an expression — list its items directly, Dropdown reads its own children');
      return unwrap(cx, el, resolved, ctx, 'Dropdown has no option groups — the items are listed directly');
    case 'Label':
      cx.record(el, resolved, 'todo', [], 'Dropdown has no option groups');
      return todoComment(
        `a group label (${cx.text.slice(cx.start(el), el.end).replace(/\s+/g, ' ').slice(0, 60)}) was dropped — Dropdown has no option groups`,
      );
    case 'Item':
      return renamed(cx, el, resolved, ctx, `${dropdown}.Item`, {
        value: 'keep',
        disabled: 'keep',
        textValue: { note: '`textValue` dropped — the item’s text is what typeahead reads' },
      });
    case 'ItemIndicator':
    case 'Icon':
    case 'ScrollUpButton':
    case 'ScrollDownButton':
    case 'Arrow':
      return removed(cx, el, resolved, 'Dropdown draws its own');
    case 'Separator':
      return removed(cx, el, resolved, 'Dropdown has no separators');
    default:
      return cx.todo(el, resolved, ctx, `Select${resolved.part} outside its Select`);
  }

  const parts = selectParts(cx, el);
  const trigger = parts.get('Trigger');
  const content = parts.get('Content');
  if (!trigger || !content) return cx.todo(el, resolved, ctx, 'a select without both its trigger and its content');
  const outside = meaningfulChildren(el).filter((kid) => !(isJsxEl(kid) && cx.resolve(kid)?.family.name === 'select'));
  if (outside.length) return cx.todo(el, resolved, ctx, 'markup beside the trigger and the content — Dropdown renders both itself');
  const extra = meaningfulChildren(trigger).filter((kid) => !(isJsxEl(kid) && ['Value', 'Icon'].includes(cx.resolve(kid)?.part ?? '')));
  if (extra.length) return cx.todo(el, resolved, ctx, 'a trigger showing more than the value — that is `Dropdown.Display`');

  const attrs = new Attrs(cx, ctx);
  settle(
    cx,
    el,
    resolved,
    attrs.map(el, {
      value: 'keep',
      defaultValue: 'keep',
      onValueChange: 'keep',
      name: 'keep',
      defaultOpen: 'keep',
      open: { todo: 'Dropdown owns its open state — drop `open`' },
      onOpenChange: { todo: 'Dropdown reports no open state — drop `onOpenChange`' },
      required: { note: '`required` dropped' },
      autoComplete: 'drop',
      form: 'drop',
      dir: DIR,
    }),
    attrs,
  );
  settle(cx, trigger, cx.resolve(trigger)!, attrs.map(trigger, { size: { note: "shadcn's `size` dropped" } }), attrs, [
    'the trigger’s attributes are the Dropdown’s',
  ]);

  let placeholder = '';
  const value = parts.get('Value');
  if (value) {
    const text = findAttr(value, 'placeholder');
    if (meaningfulChildren(value).length) {
      cx.record(value, cx.resolve(value)!, 'todo', [], 'custom value rendering is `Dropdown.Display`');
      attrs.comments.push('custom value rendering is `Dropdown.Display`');
    } else {
      cx.record(
        value,
        cx.resolve(value)!,
        'converted',
        text ? ['the placeholder is `Dropdown.Unselect`, which also adds a row that clears the choice'] : [],
      );
    }
    if (text) placeholder = element(`${dropdown}.Unselect`, [], stringValue(text) ?? `{${attrs.expr(text)}}`);
  }
  for (const icon of [parts.get('Icon')]) if (icon) removed(cx, icon, cx.resolve(icon)!, 'Dropdown draws its own chevron');

  cx.handled.add(content);
  const styled = attributesOf(content).some((item) => item.kind === 'spread' || item.attr.name !== 'data-slot');
  cx.record(content, cx.resolve(content)!, 'converted', styled ? [SELECT_CONTENT_NOTE] : []);
  for (let node: ts.Node = content.parent; node && node !== el; node = node.parent) {
    if (isJsxEl(node) && cx.resolve(node)?.part === 'Portal') cx.record(node, cx.resolve(node)!, 'removed');
  }

  const body = cx.children(childrenOf(content), inSelect);

  return element(dropdown, attrs.render(), `${placeholder}${body}`);
}
