/**
 * "Is there a DOM, and what may I touch?" — asked in seven places and once answered with a hand-written
 * `typeof` in each. The answers are not interchangeable: a server render has no `document`, a `document`
 * may have no `<head>`, and `matchMedia` is missing from environments that look like browsers. Named
 * exports rather than a namespace, which compiles to an IIFE that ships whole, and every chunk imports this.
 */

/** A browser: a window with a document. What an effect that touches layout needs to exist. */
export function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.document !== 'undefined';
}

/** Whether there is a document at all — false during a server render. */
export function hasDocument(): boolean {
  return typeof document !== 'undefined';
}

/** The document, or null when there is none, so a caller can `?.` instead of branching. */
export function documentOrNull(): Document | null {
  return hasDocument() ? document : null;
}

/** The document root (`<html>`), or null when there is no DOM. */
export function documentRoot(): Element | null {
  return documentOrNull()?.documentElement ?? null;
}

/** The `<head>` to write a stylesheet into, or null when there is nothing to write to. */
export function documentHead(): HTMLHeadElement | null {
  return documentOrNull()?.head ?? null;
}

/**
 * Whether the browser has the Popover API, which is what puts a floating layer in the top layer. Asked
 * per mount rather than cached, so a test can install the contract and answer for the browser.
 */
export function supportsPopover(): boolean {
  return typeof HTMLElement !== 'undefined' && typeof HTMLElement.prototype.showPopover === 'function';
}

/**
 * Whether the browser owns a `<dialog>`'s light dismiss: `closedby="any"` closes it on a press outside,
 * and `closedby="closerequest"` gives a non-modal one Escape. Asked per mount, like `supportsPopover`.
 */
export function supportsDialogClosedBy(): boolean {
  return typeof HTMLDialogElement !== 'undefined' && 'closedBy' in HTMLDialogElement.prototype;
}

/** A media query, or null where `matchMedia` does not exist — a server, or a bare jsdom. */
export function matchMedia(query: string): MediaQueryList | null {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return null;

  return window.matchMedia(query);
}
