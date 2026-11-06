import { useId } from 'react';

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
 */
export default function useIdentifier(prefix = 'box'): string {
  return `${prefix}-${usable(useId())}`;
}
