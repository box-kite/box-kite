import type { InteractionJson } from './interactionTypes';

/**
 * A value as plain JSON, or `undefined` for what has none: a function, a React element, a DOM node, a class instance.
 * A `Date` is its ISO string, a `Set` an array and a `Map` a record; an object met a second time is left out, which cuts a cycle.
 */
export function toInteractionJson(value: unknown): InteractionJson | undefined {
  const seen = new WeakSet<object>();
  const text = JSON.stringify(value, (_key, item: unknown) => {
    if (typeof item === 'bigint') return item.toString();
    if (typeof item !== 'object' || item === null) return item;
    if (item instanceof Set) return Array.from(item);
    if (item instanceof Map) return Object.fromEntries(item);
    if (seen.has(item)) return undefined;

    const prototype = Object.getPrototypeOf(item);
    if (!Array.isArray(item) && ((prototype !== Object.prototype && prototype !== null) || '$$typeof' in item)) return undefined;
    seen.add(item);

    return item;
  });

  return text === undefined ? undefined : JSON.parse(text);
}
