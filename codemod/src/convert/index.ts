import type { Resolved } from '../bindings';
import { childrenOf, JsxEl } from '../jsx';
import { Ctx, Transformer } from '../transform';
import { Attrs, settle, unwrap } from './common';
import { convertAccordion, convertProgress, convertRadioGroup, convertSelect, convertSlider, convertTabs, convertToggle } from './fields';
import { convertLayerPart } from './layerParts';

type Converter = (cx: Transformer, el: JsxEl, resolved: Resolved, ctx: Ctx) => string;

/** Radix toasts are elements switched on by state; a Box Kite toast is a call made when the thing happens. */
const convertToast: Converter = (cx, el, resolved, ctx) => {
  if (resolved.part === 'Provider') return unwrap(cx, el, resolved, ctx, 'ToastProvider dropped — `toast()` needs none');
  if (resolved.part !== 'Viewport') {
    return cx.todo(el, resolved, ctx, 'a toast is a call here — `toast(title, { description, action })` where this one is opened');
  }
  const attrs = new Attrs(cx, ctx);
  settle(cx, el, resolved, attrs.map(el, { hotkey: { todo: "`hotkey` is a string here — `'F6'` by default" }, label: 'keep' }), attrs);

  return `<${cx.local(resolved.family.target)}${attrs.render().length ? ' ' + attrs.render().join(' ') : ''} />${cx.children(childrenOf(el), ctx)}`;
};

const CONVERTERS: Readonly<Record<string, Converter>> = {
  tooltip: convertLayerPart,
  popover: convertLayerPart,
  dialog: convertLayerPart,
  'alert-dialog': convertLayerPart,
  'dropdown-menu': convertLayerPart,
  collapsible: convertLayerPart,
  tabs: convertTabs,
  accordion: convertAccordion,
  'radio-group': convertRadioGroup,
  checkbox: convertToggle,
  switch: convertToggle,
  slider: convertSlider,
  progress: convertProgress,
  select: convertSelect,
  toast: convertToast,
};

export function convertElement(cx: Transformer, el: JsxEl, resolved: Resolved, ctx: Ctx): string {
  if (ctx.kept === resolved.family.name && resolved.part !== 'Root') {
    return cx.todo(el, resolved, ctx, `left on Radix with the ${resolved.family.prefix} root it belongs to`);
  }

  return CONVERTERS[resolved.family.name](cx, el, resolved, ctx);
}
