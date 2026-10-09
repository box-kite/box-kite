import { useCallback, useEffect, useRef } from 'react';
import { useEventCallback } from '../../react/a11y/callbacks';
import { useIsomorphicLayoutEffect } from '../../react/effects';

/** How long typing settles before a filter input commits. */
const COMMIT_DELAY_MS = 300;

/**
 * A debounced input over a value the grid owns. When the grid's value changes to something the draft does
 * not already say — "Clear filters" in the footer, a controlled prop — the draft takes it and any pending
 * commit is dropped; a copy read once at mount kept showing a filter that was gone.
 */
export default function useFilterDraft<T>(committed: T, matches: (committed: T) => boolean, adopt: (committed: T) => void) {
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const cancel = useCallback(() => {
    for (const timer of timers.current.values()) clearTimeout(timer);
    timers.current.clear();
  }, []);

  /** Runs `commit` once typing in the input named `key` has settled. */
  const debounce = useCallback((key: string, commit: () => void) => {
    clearTimeout(timers.current.get(key));
    timers.current.set(
      key,
      setTimeout(() => {
        timers.current.delete(key);
        commit();
      }, COMMIT_DELAY_MS),
    );
  }, []);

  useEffect(() => cancel, [cancel]);

  const sync = useEventCallback(() => {
    if (matches(committed)) return;

    cancel();
    adopt(committed);
  });

  // Before paint, so the stale text is never on screen.
  useIsomorphicLayoutEffect(sync, [committed, sync]);

  return { debounce, cancel };
}
