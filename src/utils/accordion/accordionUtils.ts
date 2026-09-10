/** What a key means in an accordion: a step to the neighbouring header, or a jump to an end. */
export interface AccordionMove {
  kind: 'step' | 'edge';
  /** `1` forward, `-1` back — and on an `edge` move, the first header or the last. */
  delta: number;
}

/**
 * Which header an accordion's keyboard lands on, and which panels stand open, read off the DOM rather
 * than out of a registry — B4's and B5's precedent, for the same reason: a header a consumer wrapped,
 * rendered from a list or put behind a condition is in the order it was written.
 */
namespace AccordionUtils {
  /** The root marks itself so a header can say which accordion it belongs to. Neither attribute is ARIA: an accordion has no container role. */
  export const ROOT_ATTRIBUTE = 'data-accordion';
  export const TRIGGER_ATTRIBUTE = 'data-accordion-trigger';
  export const ROOT_SELECTOR = '[data-accordion]';
  export const TRIGGER_SELECTOR = '[data-accordion-trigger]';

  /** Whether this accordion is the one a node belongs to, rather than one nested in a panel inside it. */
  export function owns(root: Element, node: EventTarget | null): boolean {
    return node instanceof Element && node.closest(ROOT_SELECTOR) === root;
  }

  /** The headers an accordion owns, in DOM order. A nested accordion's headers belong to their own root. */
  export function triggers(root: Element | null | undefined): HTMLElement[] {
    if (!root) return [];

    return [...root.querySelectorAll<HTMLElement>(TRIGGER_SELECTOR)].filter((trigger) => owns(root, trigger));
  }

  /**
   * A header nothing can open. Skipped by every movement, the way a disabled tab is: it is the `disabled`
   * attribute here, so the browser has already taken it out of the tab sequence, and arrows that still
   * stopped on it would be reaching what Tab cannot.
   */
  export function isDisabled(trigger: Element): boolean {
    return trigger.hasAttribute('disabled') || trigger.getAttribute('aria-disabled') === 'true';
  }

  /** The next enabled header in a direction, or `undefined` when there is none. */
  export function step(triggers: readonly HTMLElement[], from: number, delta: number, loop: boolean): HTMLElement | undefined {
    const count = triggers.length;
    if (count === 0) return undefined;

    // Focus outside the accordion: a move in either direction starts from that end.
    let index = from < 0 || from >= count ? (delta > 0 ? -1 : count) : from;

    for (let taken = 0; taken < count; taken++) {
      index += delta;

      if (index < 0 || index >= count) {
        if (!loop) return undefined;
        index = ((index % count) + count) % count;
      }

      if (!isDisabled(triggers[index])) return triggers[index];
    }

    return undefined;
  }

  /** The first (`delta: 1`) or last (`delta: -1`) enabled header. */
  export function edge(triggers: readonly HTMLElement[], delta: number): HTMLElement | undefined {
    return step(triggers, delta === 1 ? -1 : triggers.length, delta, false);
  }

  /** Where the header a move starts from sits, or `-1` when the node is not one of them. */
  export function indexOf(triggers: readonly HTMLElement[], node: EventTarget | null): number {
    return node instanceof HTMLElement ? triggers.indexOf(node) : -1;
  }

  /**
   * What a key does on an accordion header. An accordion stacks along the block axis whatever the reading
   * order is, so unlike a tablist there is nothing here to mirror — and the sideways pair is left to the
   * page, which is where APG leaves it.
   */
  export function moveFor(key: string): AccordionMove | undefined {
    if (key === 'ArrowDown') return { kind: 'step', delta: 1 };
    if (key === 'ArrowUp') return { kind: 'step', delta: -1 };
    if (key === 'Home') return { kind: 'edge', delta: 1 };
    if (key === 'End') return { kind: 'edge', delta: -1 };

    return undefined;
  }

  /** The header a move arrives at, or `undefined` when there is nowhere to go. */
  export function target(triggers: readonly HTMLElement[], from: number, move: AccordionMove, loop: boolean): HTMLElement | undefined {
    return move.kind === 'edge' ? edge(triggers, move.delta) : step(triggers, from, move.delta, loop);
  }

  /**
   * The panels standing open after one header is pressed. Closing the open one is always allowed, so a
   * single-panel accordion needs no second prop to say whether it can stand empty.
   */
  export function toggle(open: readonly string[], value: string, multiple: boolean): string[] {
    if (open.includes(value)) return open.filter((each) => each !== value);

    return multiple ? [...open, value] : [value];
  }
}

export default AccordionUtils;
