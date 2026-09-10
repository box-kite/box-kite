/** Which way a tablist runs. Horizontal is the reading axis, so its arrows mirror in a right-to-left page. */
export type TabsOrientation = 'horizontal' | 'vertical';

/** What a key means in a tablist: a step to the neighbouring tab, or a jump to an end. */
export interface TabsMove {
  kind: 'step' | 'edge';
  /** `1` forward, `-1` back — and on an `edge` move, the first tab or the last. */
  delta: number;
}

/** Where a tab sits inside its list, along the axis the tabs run on. Physical pixels: a measured length has no reading order. */
export interface TabsBounds {
  /** From the list's own start edge — its left horizontally, its top vertically. */
  start: number;
  /** The tab's own length on that axis. */
  size: number;
}

/**
 * Which tab a tablist's keyboard lands on, read off the DOM rather than out of a registry: a tab is a real
 * focusable element and its position is where it was written — including one a consumer wrapped, put
 * behind a condition, or rendered from a list. The measurements the travelling indicator and the resizing
 * panel container need are here for the same reason: what is on screen is the only thing that knows.
 */
namespace TabsUtils {
  export const TAB_SELECTOR = '[role="tab"]';
  export const LIST_SELECTOR = '[role="tablist"]';
  export const PANEL_SELECTOR = '[role="tabpanel"]';

  /** Whether this tablist is the one a node belongs to, rather than one nested inside it. */
  export function owns(list: Element, node: EventTarget | null): boolean {
    return node instanceof Element && node.closest(LIST_SELECTOR) === list;
  }

  /** The tabs a tablist owns, in DOM order. A nested set of tabs belongs to its own list. */
  export function tabs(list: Element | null | undefined): HTMLElement[] {
    if (!list) return [];

    return [...list.querySelectorAll<HTMLElement>(TAB_SELECTOR)].filter((tab) => owns(list, tab));
  }

  /**
   * A tab no selection can land on. Skipped by every movement, unlike a disabled menu item, which APG asks
   * stay reachable: selection follows focus here, so a tab focus could reach and selection could not would
   * leave the pattern with no state to be in.
   */
  export function isDisabled(tab: Element): boolean {
    return tab.hasAttribute('disabled') || tab.getAttribute('aria-disabled') === 'true';
  }

  /** What a tab stands for. The one thing the markup has to carry for the model to work. */
  export function valueOf(tab: HTMLElement): string | undefined {
    return tab.dataset.value;
  }

  /**
   * A value turned into an id fragment. `aria-controls` is a space-separated list and the id has to survive
   * a CSS selector, so everything but a letter, a digit and a hyphen is escaped by code point rather than
   * dropped — two values differing only in punctuation must not come out naming one element. The `_` that
   * delimits an escape is escaped along with the rest, which is what keeps the mapping one-to-one.
   */
  export function token(value: string): string {
    return value.replace(/[^A-Za-z0-9-]/g, (character) => `_${character.codePointAt(0)!.toString(36)}_`);
  }

  /** The next selectable tab in a direction, or `undefined` when there is none. Disabled tabs are stepped over. */
  export function step(tabs: readonly HTMLElement[], from: number, delta: number, loop: boolean): HTMLElement | undefined {
    const count = tabs.length;
    if (count === 0) return undefined;

    // Nothing focused yet, or focus outside the list: a move in either direction starts from that end.
    let index = from < 0 || from >= count ? (delta > 0 ? -1 : count) : from;

    for (let taken = 0; taken < count; taken++) {
      index += delta;

      if (index < 0 || index >= count) {
        if (!loop) return undefined;
        index = ((index % count) + count) % count;
      }

      if (!isDisabled(tabs[index])) return tabs[index];
    }

    return undefined;
  }

  /** The first (`delta: 1`) or last (`delta: -1`) selectable tab. */
  export function edge(tabs: readonly HTMLElement[], delta: number): HTMLElement | undefined {
    return step(tabs, delta === 1 ? -1 : tabs.length, delta, false);
  }

  /** Where a tab a move should start from sits, or `-1` when the node is not one of these tabs. */
  export function indexOf(tabs: readonly HTMLElement[], node: EventTarget | null): number {
    return node instanceof HTMLElement ? tabs.indexOf(node) : -1;
  }

  /**
   * What a key does in a tablist of this orientation. The off-axis arrows deliberately mean nothing — APG
   * leaves them to the page, so a horizontal tablist does not eat Up and Down.
   */
  export function moveFor(key: string, orientation: TabsOrientation, rtl = false): TabsMove | undefined {
    if (key === 'Home') return { kind: 'edge', delta: 1 };
    if (key === 'End') return { kind: 'edge', delta: -1 };

    const vertical = orientation === 'vertical';
    const forward = vertical ? 'ArrowDown' : rtl ? 'ArrowLeft' : 'ArrowRight';
    const back = vertical ? 'ArrowUp' : rtl ? 'ArrowRight' : 'ArrowLeft';

    if (key === forward) return { kind: 'step', delta: 1 };
    if (key === back) return { kind: 'step', delta: -1 };

    return undefined;
  }

  /** The tab a move arrives at, or `undefined` when there is nowhere to go. */
  export function target(tabs: readonly HTMLElement[], from: number, move: TabsMove, loop: boolean): HTMLElement | undefined {
    return move.kind === 'edge' ? edge(tabs, move.delta) : step(tabs, from, move.delta, loop);
  }

  /** The tab whose panel is showing, read off the attribute the component writes rather than matched on a value. */
  export function selectedTab(list: Element | null | undefined): HTMLElement | undefined {
    if (!list) return undefined;

    return tabs(list).find((tab) => tab.getAttribute('aria-selected') === 'true');
  }

  /**
   * Where the travelling indicator has to be, measured off the two rectangles rather than `offsetLeft` —
   * whose origin is the nearest positioned ancestor, which need not be the list. The scroll offset is
   * added back because scrolling a list that outgrows its container is the consumer's to set up (#140),
   * so a list that does scroll must not drag the indicator off its tab.
   */
  export function bounds(list: Element, tab: Element, orientation: TabsOrientation): TabsBounds {
    const listBox = list.getBoundingClientRect();
    const tabBox = tab.getBoundingClientRect();

    return orientation === 'vertical'
      ? { start: tabBox.top - listBox.top + list.scrollTop, size: tabBox.height }
      : { start: tabBox.left - listBox.left + list.scrollLeft, size: tabBox.width };
  }

  /** Whether a fresh measurement says anything new, so a reflow that moved nothing costs no render. */
  export function sameBounds(left: TabsBounds | undefined, right: TabsBounds | undefined): boolean {
    if (!left || !right) return left === right;

    return left.start === right.start && left.size === right.size;
  }

  /**
   * The panel a container is showing: the one that is not hidden, so `keepMounted` measures the panel on
   * screen rather than the first one written.
   */
  export function visiblePanel(container: Element | null | undefined): HTMLElement | undefined {
    if (!container) return undefined;

    return [...container.querySelectorAll<HTMLElement>(PANEL_SELECTOR)].find((panel) => !panel.hasAttribute('hidden'));
  }
}

export default TabsUtils;
