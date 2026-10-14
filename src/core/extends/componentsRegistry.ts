import { stableHash } from '../hash';
import { Components } from './boxComponents';

/** What a registry's own components are merged over: the built-ins, the app's `Box.components()`, or another registry. */
export type ComponentsBase = 'builtin' | 'global' | ComponentsRegistry;

/**
 * A design that belongs to a subtree rather than to the app: component defaults resolved only for the Boxes
 * under `<Box.Components value>` (or `<Box.Theme components>`). Plain data, so any engine can resolve it.
 */
export interface ComponentsRegistry<T extends Components = Components> {
  /** Content-addressed, so a registry built inline in render is the same cache entry every time. */
  readonly id: string;
  readonly components: T;
  readonly base: ComponentsBase;
}

/**
 * `Box.createComponents({ button: { styles: { borderRadius: 999 } } })` — the same shape `Box.components()`
 * takes, registered nowhere. `base` defaults to `'global'`, so the design starts from the app's own;
 * `'builtin'` ignores the app's registrations, and a registry chains onto that registry's design.
 */
export default function createComponents<T extends Components>(components: T, options?: { base?: ComponentsBase }): ComponentsRegistry<T> {
  const base = options?.base ?? 'global';

  return { id: `${typeof base === 'string' ? base : base.id}.${stableHash(JSON.stringify(components))}`, components, base };
}
