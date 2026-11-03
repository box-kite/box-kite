import { useCallback, useState } from 'react';
import { useExitPhase } from './usePresence';

/**
 * A layer that is always rendered (a `<dialog>`, a popover) keeps the content it last showed open until its
 * own exit transition has run. Without it `{open && <Form />}` empties the panel in the closing commit, and
 * the exit animates a blank box (bug #314).
 */
export default function useHeldContent<T>(content: T, open: boolean, element: HTMLElement | null): T {
  const readNode = useCallback(() => element, [element]);
  const phase = useExitPhase(open, readNode);
  const [held, setHeld] = useState(content);

  // The last content rendered open, kept as state from the render it arrived in: by the closing render it is gone.
  if (open && held !== content) setHeld(content);

  return phase === 'leaving' ? held : content;
}
