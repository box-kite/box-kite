import ts from 'typescript';
import type { Resolved } from '../bindings';
import { attributesOf, element, findAttr, isJsxEl, JsxEl, meaningfulChildren } from '../jsx';
import { Ctx, Transformer } from '../transform';
import { Attrs, isPreventDefault, nodeValue, PLACEMENT, Rules, settle } from './common';
import { convertTrigger } from './trigger';

/** How one floating family folds into its Box Kite component. */
export interface LayerSpec {
  root: Rules;
  content: Rules;
  /** Box Kite takes the trigger as a required render prop for these. */
  needsTrigger: boolean;
  /** Tooltip's content is a prop and its trigger the children; everywhere else it is the other way round. */
  contentAsProp?: boolean;
  /** Radix defaults that differ from Box Kite's, written out so the layer lands where it used to. */
  defaults?: Readonly<Record<string, string>>;
  /** Collapsible is a real wrapper element, so nothing may sit beside its trigger and its panel. */
  strict?: boolean;
}

const STATE: Rules = { open: 'keep', defaultOpen: 'keep', onOpenChange: 'keep' };
const DIR = { note: '`dir` dropped — the direction is read off the page' } as const;

const OUTSIDE: Rules = {
  onEscapeKeyDown: { todo: '`onEscapeKeyDown` has no equivalent — Escape always closes here; react in `onOpenChange` (reason `escape`)' },
  onPointerDownOutside: { todo: '`onPointerDownOutside` has no equivalent — react in `onOpenChange` (reason `outside-pointer`)' },
  onInteractOutside: { todo: '`onInteractOutside` has no equivalent — react in `onOpenChange` (reason `outside-pointer`)' },
  onFocusOutside: { todo: '`onFocusOutside` has no equivalent' },
  onOpenAutoFocus: { todo: '`onOpenAutoFocus` has no equivalent — `autoFocus` or `initialFocus` decides where focus lands' },
  onCloseAutoFocus: { todo: '`onCloseAutoFocus` has no equivalent — focus returns to the trigger' },
};

export const LAYERS: Readonly<Record<string, LayerSpec>> = {
  tooltip: {
    root: {
      ...STATE,
      delayDuration: { rename: 'openDelay' },
      disableHoverableContent: { note: '`disableHoverableContent` dropped — a tooltip stays hoverable (WCAG 1.4.13)' },
    },
    content: { ...PLACEMENT, ...OUTSIDE, 'aria-label': { note: '`aria-label` on the content dropped — the tooltip is the description' } },
    needsTrigger: true,
    contentAsProp: true,
    defaults: { side: 'top' },
  },
  popover: {
    root: { ...STATE, modal: { note: '`modal` dropped — the popover is light-dismissed by the browser and never traps focus' } },
    content: {
      ...PLACEMENT,
      ...OUTSIDE,
      onOpenAutoFocus: (attr, out) =>
        isPreventDefault(attr) ? out.set('autoFocus', 'false') : out.todo('`onOpenAutoFocus` has no equivalent — `autoFocus` decides'),
    },
    needsTrigger: true,
  },
  dialog: {
    root: { ...STATE, modal: 'keep' },
    content: {
      ...OUTSIDE,
      onPointerDownOutside: (attr, out) =>
        isPreventDefault(attr) ? out.set('dismissible', 'false') : out.todo('`onPointerDownOutside` has no equivalent'),
      onInteractOutside: (attr, out) =>
        isPreventDefault(attr) ? out.set('dismissible', 'false') : out.todo('`onInteractOutside` has no equivalent'),
      showCloseButton: 'drop',
      forceMount: { note: '`forceMount` dropped — the dialog is always rendered' },
    },
    needsTrigger: false,
  },
  'alert-dialog': {
    root: STATE,
    content: { ...OUTSIDE, forceMount: { note: '`forceMount` dropped — the dialog is always rendered' } },
    needsTrigger: false,
  },
  'dropdown-menu': {
    root: { ...STATE, modal: { note: '`modal` dropped — the menu is light-dismissed by the browser' }, dir: DIR },
    content: { ...PLACEMENT, ...OUTSIDE, loop: { note: '`loop` dropped — the arrow keys always wrap' } },
    needsTrigger: true,
    defaults: { align: 'center' },
  },
  collapsible: {
    root: { ...STATE, disabled: { todo: '`disabled` has no equivalent on Collapsible — disable the trigger' } },
    content: { forceMount: { note: '`forceMount` dropped — the panel is always rendered' } },
    needsTrigger: true,
    strict: true,
  },
};

/** Searches a root's own subtree, never through another root of the same family. */
function find(cx: Transformer, from: ts.Node, family: string, part: string, skip?: ts.Node): JsxEl | undefined {
  let found: JsxEl | undefined;
  const visit = (node: ts.Node) => {
    if (found || node === skip) return;
    if (isJsxEl(node) && node !== from) {
      const resolved = cx.resolve(node);
      if (resolved?.family.name === family) {
        if (resolved.part === part) {
          found = node;
          return;
        }
        if (resolved.part === 'Root') return;
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(from);

  return found;
}

const contains = (outer: ts.Node, inner: ts.Node) => inner.pos >= outer.pos && inner.end <= outer.end;

/**
 * A child of the root that carries the content and nothing visible of its own: the content itself, its
 * portal, or a wrapper like shadcn's `<form>` around trigger and content. Those can move into the layer.
 */
function isCarrier(cx: Transformer, node: ts.Node, content: JsxEl, trigger: JsxEl | undefined): boolean {
  if (node === content) return true;
  if (!isJsxEl(node) || !contains(node, content)) return false;

  // An overlay beside the content renders nothing here: the backdrop is the dialog's own.
  const inert = (child: ts.Node) => isJsxEl(child) && cx.resolve(child)?.part === 'Overlay';

  return meaningfulChildren(node).every((child) => child === trigger || inert(child) || isCarrier(cx, child, content, trigger));
}

export function convertLayerRoot(cx: Transformer, root: JsxEl, resolved: Resolved, ctx: Ctx): string {
  const family = resolved.family.name;
  const spec = LAYERS[family];
  const content = find(cx, root, family, 'Content');
  const trigger = find(cx, root, family, 'Trigger', content);

  if (!trigger && spec.needsTrigger)
    return cx.todo(root, resolved, ctx, `no ${resolved.family.prefix} trigger in this element — convert it by hand`);

  const before: ts.JsxChild[] = [];
  const after: ts.JsxChild[] = [];
  let carrier: ts.JsxChild | undefined;
  for (const child of meaningfulChildren(root)) {
    if (child === trigger) continue;
    if (content && contains(child, content)) {
      if (!isCarrier(cx, child, content, trigger))
        return cx.todo(root, resolved, ctx, 'the content sits inside other markup — move it out, then run again');
      carrier = child;
    } else if (trigger && contains(child, trigger)) {
      return cx.todo(root, resolved, ctx, 'the trigger sits inside other markup — Box Kite renders the trigger itself');
    } else {
      (trigger && child.pos < trigger.pos ? before : after).push(child);
    }
  }
  if (spec.strict && (before.length || after.length)) {
    return cx.todo(root, resolved, ctx, 'markup beside the trigger and the panel — a Box Kite Collapsible renders the two alone');
  }

  const inner: Ctx = { ...ctx, frame: { family, origin: resolved.origin } };
  const attrs = new Attrs(cx, ctx);
  const rootOutcome = attrs.map(root, spec.root);
  const rootNotes: string[] = [];

  let triggerFn: string | undefined;
  if (trigger) {
    const converted = convertTrigger(cx, trigger, cx.resolve(trigger)!, inner);
    if (converted.todo) return cx.todo(root, resolved, ctx, converted.todo);
    triggerFn = converted.fn;
    cx.lifted.add(trigger);
  }

  let body = '';
  if (content) {
    cx.handled.add(content);
    const contentOutcome = attrs.map(content, spec.content);
    settle(cx, content, cx.resolve(content)!, contentOutcome, attrs, notesFor(cx, content, family));
    if (spec.contentAsProp) {
      // A tooltip's content is a prop, so the portal around it goes with it.
      for (let node: ts.Node = content.parent; node && node !== root; node = node.parent) {
        if (isJsxEl(node) && cx.resolve(node)?.part === 'Portal') cx.record(node, cx.resolve(node)!, 'removed');
      }
      for (const kid of meaningfulChildren(content)) {
        if (isJsxEl(kid) && cx.resolve(kid)?.part === 'Arrow') {
          cx.record(kid, cx.resolve(kid)!, 'removed', ['Box Kite layers draw no arrow']);
          cx.lifted.add(kid);
        }
      }
      body = nodeValue(cx, content, inner) ?? '';
    } else if (carrier) {
      body = cx.rewrite(carrier, inner);
    }
  }

  for (const [name, value] of Object.entries(spec.defaults ?? {})) {
    if (!(content && findAttr(content, name))) attrs.push(`${name}="${value}"`);
  }
  if (triggerFn && !spec.contentAsProp) attrs.set('trigger', triggerFn);
  if (spec.contentAsProp && body) attrs.set('content', body);
  if (family === 'dialog' && resolved.origin === 'shadcn' && content && findAttr(content, 'showCloseButton') === undefined) {
    rootNotes.push(
      'shadcn\'s `DialogContent` drew a close (×) button — Escape and a press outside close this one; add a `<form method="dialog">` button for a visible one',
    );
  }

  settle(cx, root, resolved, rootOutcome, attrs, rootNotes);
  const local = cx.local(resolved.family.target);
  const children = spec.contentAsProp ? (triggerFn ? `{${triggerFn}}` : '') : body;
  const out = element(local, attrs.render(), children);

  if (!before.length && !after.length) return out;
  if (findAttr(root, 'key'))
    return cx.todo(root, resolved, ctx, 'a keyed root with markup beside its trigger — wrap the result in a keyed `<Fragment>`');

  return `<>${before.map((child) => cx.rewrite(child, ctx)).join('')}${out}${after.map((child) => cx.rewrite(child, ctx)).join('')}</>`;
}

function notesFor(cx: Transformer, content: JsxEl, family: string): string[] {
  const notes: string[] = [];
  if (attributesOf(content).some((item) => item.kind === 'attr' && item.attr.name === 'className') && family !== 'collapsible') {
    notes.push('`className` moved from the content onto the layer itself');
  }

  return notes;
}

/** The parts that only mean something inside their root, met outside one or a second time inside it. */
export function strayLayerPart(cx: Transformer, el: JsxEl, resolved: Resolved, ctx: Ctx): string {
  return cx.todo(
    el,
    resolved,
    ctx,
    `${resolved.family.prefix}${resolved.part} outside the root it belongs to — move it into its root, then run again`,
  );
}
