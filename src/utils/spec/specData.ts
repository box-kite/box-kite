/**
 * Where a spec's values come from when they are not written in it. A model emits the *shape* of a view
 * and the host owns the numbers, so a prop can be a reference — `{ $data: 'stats.revenue' }` — resolved
 * against the data the renderer was handed and then validated like any other value.
 *
 * Reading only, and by path only: there is no expression here to evaluate, which is the reason the
 * contract is a path and not a template.
 */
import { SpecRef, SpecScope } from './specTypes';

namespace SpecData {
  /** A props object nested deeper than this is a cycle or a mistake; a spec from `JSON.parse` has neither. */
  const MAX_DEPTH = 16;

  /** A reference is a plain object carrying exactly one of the three keys, and nothing beside it. */
  export function isRef(value: unknown): value is SpecRef {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;

    const keys = Object.keys(value);
    if (keys.length !== 1) return false;

    const record = value as Record<string, unknown>;

    if (keys[0] === '$data') return typeof record.$data === 'string';
    if (keys[0] === '$item') return typeof record.$item === 'string';

    return keys[0] === '$index' && record.$index === true;
  }

  /** `stats.revenue.0`, or the JSON Pointer `/stats/revenue/0` a json-render spec would carry. */
  function segments(path: string): string[] {
    if (path === '' || path === '.' || path === '/') return [];

    return path.startsWith('/') ? path.slice(1).split('/') : path.split('.');
  }

  /** One step down. Own properties only, so nothing inherited — `constructor` resolves to nothing. */
  function step(value: unknown, key: string): { value: unknown; found: boolean } {
    if (Array.isArray(value)) {
      const index = /^\d+$/.test(key) ? Number(key) : -1;

      return index >= 0 && index < value.length ? { value: value[index], found: true } : { value: undefined, found: false };
    }

    if (typeof value === 'object' && value !== null && Object.hasOwn(value, key)) {
      return { value: (value as Record<string, unknown>)[key], found: true };
    }

    return { value: undefined, found: false };
  }

  /** What a reference points at, and whether it pointed at anything — `undefined` is an answer either way. */
  export function resolve(ref: SpecRef, scope: SpecScope): { value: unknown; found: boolean } {
    if ('$index' in ref) return scope.repeating ? { value: scope.index, found: true } : { value: undefined, found: false };

    const path = '$item' in ref ? ref.$item : ref.$data;
    const root = '$item' in ref ? scope.item : scope.data;

    if ('$item' in ref && !scope.repeating) return { value: undefined, found: false };

    return segments(path).reduce<{ value: unknown; found: boolean }>(
      (current, key) => (current.found ? step(current.value, key) : current),
      { value: root, found: true },
    );
  }

  /** The text of a reference, for the message that says it resolved to nothing. */
  export function pathOf(ref: SpecRef): string {
    if ('$index' in ref) return '$index';

    return '$item' in ref ? `$item ${ref.$item}` : `$data ${ref.$data}`;
  }

  /**
   * A value with every reference inside it resolved — a prop is `{ $data: … }`, an array of them, or an
   * object with one in a corner (a gradient's stops, a chart's series). Reported rather than dropped:
   * the caller decides, because a reference that resolves to nothing mid-stream is ordinary.
   */
  export function deep(value: unknown, scope: SpecScope, onMissing?: (path: string) => void, depth = 0): unknown {
    if (depth > MAX_DEPTH) return undefined;

    if (isRef(value)) {
      const resolved = resolve(value, scope);

      if (!resolved.found) onMissing?.(pathOf(value));

      return resolved.value;
    }

    if (Array.isArray(value)) return value.map((item) => deep(item, scope, onMissing, depth + 1));

    // `fromEntries` rather than an assignment: `all['__proto__'] = …` runs the setter, and a spec is
    // `JSON.parse` output, where `__proto__` is an ordinary own key.
    if (typeof value === 'object' && value !== null) {
      return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, deep(entry, scope, onMissing, depth + 1)]));
    }

    return value;
  }
}

export default SpecData;
