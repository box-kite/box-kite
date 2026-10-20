import { useCallback, useContext, useRef } from 'react';
import { emitInteraction } from '../../utils/interactions/interactionChannel';
import { useIsomorphicLayoutEffect } from '../effects';
import { InteractionsQuiet } from './quietInteractions';
import type { ChangeDetails } from './useControllableState';

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

/** `useEventCallback` for a change handler that `Box.onInteraction` hears as well, under `component` and `type`. */
export function useInteractionCallback<T, TDetails extends ChangeDetails>(
  fn: ((value: T, details: TDetails) => void) | undefined,
  component: string,
  type: string,
): (value: T, details: TDetails) => void {
  const ref = useLatest(fn);
  const quiet = useContext(InteractionsQuiet);

  return useCallback(
    (value: T, details: TDetails) => {
      ref.current?.(value, details);
      if (quiet) return;

      const { reason, event, ...rest } = details;

      emitInteraction({ component, type, reason, value, details: rest, event });
    },
    [ref, quiet, component, type],
  );
}
