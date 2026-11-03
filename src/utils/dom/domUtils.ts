/**
 * "Did this happen inside that?" — the question behind every popup that closes when you click away, asked
 * identically by `useVisibility` and `useDismiss`. `ElementLike` is structural rather than
 * `React.RefObject`, which keeps the file framework-free. Named exports rather than a namespace, for the
 * reason in `environmentUtils.ts`: a namespace object cannot be tree-shaken a function at a time.
 */
export type ElementLike = { readonly current: Element | null } | Element | null | undefined;

/** The element behind a ref or an element, whichever the caller happens to be holding. */
export function elementOf(value: ElementLike): Element | null {
  if (!value) return null;

  return 'current' in value ? value.current : value;
}

/** React's `Ref<T>`, structurally: a callback or an object, either of which a caller may hand a component. */
export type RefLike<T> = ((element: T | null) => unknown) | { current: T | null } | null | undefined;

/** Hand an element to a ref of either kind — the half of a merged ref that is the caller's. */
export function assignRef<T>(ref: RefLike<T>, element: T | null): void {
  if (typeof ref === 'function') ref(element);
  else if (ref) ref.current = element;
}

/** The same, narrowed to an `HTMLElement` — for callers that need `focus()` or `style`. */
export function htmlElementOf(value: ElementLike): HTMLElement | null {
  const element = elementOf(value);

  return element instanceof HTMLElement ? element : null;
}

/**
 * Whether an event happened inside any of these elements. `composedPath()` first, so an event from a
 * shadow root counts as inside its host; `contains()` as the fallback, since the path is populated only
 * while the event is being dispatched.
 */
export function isEventInside(event: Event, elements: readonly ElementLike[]): boolean {
  const path = typeof event.composedPath === 'function' ? event.composedPath() : [];

  return elements.some((value) => {
    const element = elementOf(value);
    if (!element) return false;

    return path.includes(element) || (event.target instanceof Node && element.contains(event.target));
  });
}

/**
 * Whether this element reads right to left — the direction the browser *resolved*, which is the only
 * form of the answer that accounts for a `dir="auto"` or a `<bdi>` above it. Nothing but
 * `getComputedStyle` knows it, and jsdom computes no direction at all, so a test environment reads as
 * left to right — which is the initial value anyway.
 */
export function isRtl(value: ElementLike): boolean {
  const element = elementOf(value);
  const view = element?.ownerDocument?.defaultView;

  return !!element && !!view && view.getComputedStyle(element).direction === 'rtl';
}

/**
 * Drop whatever the document has selected. A double press selects the word under it before any handler
 * runs, so a widget that *replaces* what was pressed leaves a range over content that no longer exists —
 * which the browser repairs to the nearest boundary and then paints over whatever is rendered inside it.
 */
export function clearSelection(element: ElementLike): void {
  const selection = elementOf(element)?.ownerDocument?.defaultView?.getSelection();

  if (selection && !selection.isCollapsed) selection.removeAllRanges();
}

/** What a `<Dialog>` dispatches on its document when it opens or closes as a modal, since everything outside one is inert. */
export const MODAL_EVENT = 'box-kite:modal';
export type ModalEventDetail = { dialog: HTMLElement; open: boolean };

export function announceModal(dialog: HTMLElement, open: boolean): void {
  dialog.ownerDocument.dispatchEvent(new CustomEvent<ModalEventDetail>(MODAL_EVENT, { detail: { dialog, open } }));
}
