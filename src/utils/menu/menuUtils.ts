import TypeaheadUtils from '../keyboard/typeaheadUtils';

/**
 * Which item a menu's keyboard lands on, read off the DOM rather than out of a registry: a menu's items
 * are real focusable elements, and their order is the order they are written in — including the ones a
 * consumer wrapped in a group, put behind a condition, or declared in a submenu of its own.
 */
namespace MenuUtils {
  /** The three roles an item can carry. A separator, a group and a label are not items. */
  export const ITEM_SELECTOR = '[role="menuitem"],[role="menuitemcheckbox"],[role="menuitemradio"]';

  /** Whether this panel is the menu a node belongs to, rather than one nested inside it. */
  export function owns(panel: Element, node: EventTarget | null): boolean {
    return node instanceof Element && node.closest('[role="menu"]') === panel;
  }

  /** The items a panel owns, in DOM order. A submenu's items belong to the submenu, however deep it sits. */
  export function items(panel: Element): HTMLElement[] {
    return [...panel.querySelectorAll<HTMLElement>(ITEM_SELECTOR)].filter((item) => owns(panel, item));
  }

  /**
   * A disabled item, which is `aria-disabled` and never the `disabled` attribute: APG asks that a
   * disabled menu item stay focusable, so that a keyboard user can find out it is there at all.
   */
  export function isDisabled(item: Element): boolean {
    return item.getAttribute('aria-disabled') === 'true';
  }

  /** An item that opens a submenu. */
  export function isSubTrigger(item: Element): boolean {
    return item.getAttribute('aria-haspopup') === 'menu';
  }

  /** The next item in a direction, wrapping at the ends the way a menu does. Nothing is skipped — see `isDisabled`. */
  export function step(items: readonly HTMLElement[], from: number, delta: number): HTMLElement | undefined {
    if (items.length === 0) return undefined;

    const index = from < 0 ? (delta > 0 ? 0 : items.length - 1) : (((from + delta) % items.length) + items.length) % items.length;

    return items[index];
  }

  /** The item a typed prefix points at, on the shared APG rules. */
  export function typeaheadTarget(items: readonly HTMLElement[], query: string, from: number): HTMLElement | undefined {
    const index = TypeaheadUtils.target(query, from, items.length, (position) => items[position].textContent ?? '');

    return index < 0 ? undefined : items[index];
  }
}

export default MenuUtils;
