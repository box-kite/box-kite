/**
 * An array whose elements are computed when somebody asks for one. A server row model lays out a million
 * rows and renders fifty of them, so allocating an object per row is the one thing it must not do — and
 * every reader of these lists indexes, slices or binary-searches rather than iterating, which is exactly
 * what a proxy can answer. `length` is reported without the target ever holding that many elements.
 *
 * Iterating one (`map`, `flatMap`, a spread) materializes every element, which is the cost this exists to
 * avoid: do that only where the length is known to be small.
 */
export default function lazyList<T>(length: number, at: (index: number) => T): T[] {
  return new Proxy([] as T[], {
    get(target, key, receiver) {
      if (key === 'length') return length;

      const index = indexOf(key, length);

      return index === undefined ? Reflect.get(target, key, receiver) : at(index);
    },
    has(target, key) {
      return indexOf(key, length) !== undefined || Reflect.has(target, key);
    },
    getOwnPropertyDescriptor(target, key) {
      if (indexOf(key, length) === undefined) return Reflect.getOwnPropertyDescriptor(target, key);

      // Configurable, or the proxy invariant refuses to report a property the target has not got.
      return { value: at(indexOf(key, length)!), writable: true, enumerable: true, configurable: true };
    },
  });
}

/** The index a property key names, when it names one inside the list. */
function indexOf(key: string | symbol, length: number): number | undefined {
  if (typeof key !== 'string') return undefined;

  const index = Number(key);

  return Number.isInteger(index) && index >= 0 && index < length ? index : undefined;
}
