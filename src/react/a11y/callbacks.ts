import { useCallback, useRef } from 'react';
import { useIsomorphicLayoutEffect } from '../effects';

/**
 * Handler identity, which every hook here has the same problem with: a document listener must not
 * be torn down and re-registered on every render, but it must still call the consumer's *current*
 * handler — and consumers write handlers inline, so a new one arrives with every render.
 */

/**
 * The latest value, readable from an event handler that must not be re-registered when it changes. Written
 * from an effect rather than during render, which costs nothing here: it is only read from an event.
 */
export function useLatest<T>(value: T): React.RefObject<T> {
  const ref = useRef(value);

  useIsomorphicLayoutEffect(() => {
    ref.current = value;
  });

  return ref;
}

/** A callback with a stable identity that always calls the *latest* function it was given. */
export function useEventCallback<TArgs extends unknown[], TResult>(
  fn: ((...args: TArgs) => TResult) | undefined,
): (...args: TArgs) => TResult | undefined {
  const ref = useLatest(fn);

  return useCallback((...args: TArgs) => ref.current?.(...args), [ref]);
}
