import { ElementLike, elementOf } from '../dom/domUtils';

/**
 * The element that scrolls `value` into view, or `null` for the page: the nearest ancestor that scrolls and has
 * something to scroll. Both halves count — `overflow-x: hidden` alone computes `overflow-y` to `auto`.
 */
export function scrollParentOf(value: ElementLike): HTMLElement | null {
  const element = elementOf(value);
  const view = element?.ownerDocument?.defaultView;
  if (!element || !view) return null;

  const root = element.ownerDocument.scrollingElement ?? element.ownerDocument.documentElement;
  for (
    let parent = element.parentElement;
    parent && parent !== root && parent !== element.ownerDocument.body;
    parent = parent.parentElement
  ) {
    if (/auto|scroll|overlay/.test(view.getComputedStyle(parent).overflowY) && parent.scrollHeight > parent.clientHeight) return parent;
  }

  return null;
}
