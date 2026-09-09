import React, { useState } from 'react';

// `useId` arrived in React 18 and the peer range starts at 16.14, so there has to be a fallback.
// It is called unconditionally either way — a hook behind an `if` is a hook that breaks the moment
// the peer version changes under it.
const useReactId = (React as { useId?: () => string }).useId ?? (() => undefined);

let sequence = 0;

/**
 * React's own id, formatted so it can also be a CSS selector. `useId` returns `:r1:` (React 18) or `«r1»`
 * (React 19), which `querySelector` rejects; the punctuation carries no information, so dropping it keeps
 * the id unique and makes it addressable.
 */
function usable(id: string): string {
  return id.replace(/[^\w-]/g, '');
}

/**
 * A stable, unique id for wiring one element to another — `aria-labelledby`, `aria-controls`,
 * `aria-activedescendant`, `<label for>`.
 *
 * Stable means: the same across renders, the same on the server and on the client (so hydration
 * does not throw the markup away), and different for every instance of a component. Derive related
 * ids from one call rather than calling the hook per element:
 *
 * ```ts
 * const id = useIdentifier('select');
 * // `${id}-trigger`, `${id}-listbox`
 * ```
 *
 * On React 16/17 the fallback is a module counter, which cannot match between a server render and
 * the client one — pass ids in explicitly there if the tree is hydrated.
 */
export default function useIdentifier(prefix = 'box'): string {
  const reactId = useReactId();
  // Only used when React has no `useId`; a counter increments once per mounted component because
  // the initializer runs once. `useState` rather than `useRef` so it is not recomputed in a render
  // React throws away.
  const [fallback] = useState(() => `${++sequence}`);

  return `${prefix}-${reactId ? usable(reactId) : fallback}`;
}
