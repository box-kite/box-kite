import { useState, useSyncExternalStore } from 'react';

// Whether the prerendered HTML has been adopted yet. The site's one piece of state React does not
// own: what mounts *with* the page is already on screen, what mounts after it is a real mount.
let hydrated = false;

export function hasHydrated(): boolean {
  return hydrated;
}

const listeners = new Set<() => void>();

export function hydrationFinished(): void {
  hydrated = true;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  return () => void listeners.delete(listener);
}

/**
 * The same answer as a value that re-renders when it changes — for a page whose content depends on
 * something the prerender could not know, such as a query string. It reads `false` while the HTML is
 * being adopted (which is what the HTML says) and `true` on the render after, so the page can differ
 * from its prerendered copy without the mismatch that would otherwise be React #418.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => hydrated,
    () => false,
  );
}

/**
 * Whether *this* mount is a real one rather than the prerendered first paint — which is the whole
 * question an entrance animation has to answer here. `startingStyle` fires the first time an element is
 * styled, and for prerendered HTML that is the initial paint, so every entrance on the site is gated on
 * this and only a client-side navigation (or a keyed swap) animates. Read once, on purpose: the answer
 * belongs to the mount, not to the render.
 */
export function useIsRealMount(): boolean {
  const [real] = useState(hasHydrated);

  return real;
}
