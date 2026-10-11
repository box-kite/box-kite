import { RefObject, useCallback, useEffect, useState } from 'react';

interface Fullscreen {
  /** On screen alone, whichever way it got there. */
  full: boolean;
  /** The browser's own full screen rather than the fallback, which fills the window instead. */
  native: boolean;
  toggle(): void;
}

/** The Keyboard Lock API: Chromium-only, so not in the DOM typings. */
type LockableNavigator = Navigator & { keyboard?: { lock?(keys: string[]): Promise<void> } };

/**
 * The element on its own, filling the screen. The Fullscreen API where there is one — an iPhone has none, so
 * there the element fills the window instead and `full` is the caller's cue to pin it there.
 */
export default function useFullscreen(ref: RefObject<HTMLElement | null>): Fullscreen {
  const [native, setNative] = useState(false);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const change = () => setNative(!!ref.current && document.fullscreenElement === ref.current);

    document.addEventListener('fullscreenchange', change);

    return () => document.removeEventListener('fullscreenchange', change);
  }, [ref]);

  const toggle = useCallback(() => {
    const element = ref.current;
    if (!element) return;

    if (document.fullscreenElement) return void document.exitFullscreen();
    if (fallback) return setFallback(false);
    if (!document.fullscreenEnabled || !element.requestFullscreen) return setFallback(true);

    element.requestFullscreen().then(
      // Escape belongs to the editor (it closes the suggestions); with the lock, holding it is what leaves.
      () => (navigator as LockableNavigator).keyboard?.lock?.(['Escape']).catch(() => {}),
      () => setFallback(true),
    );
  }, [ref, fallback]);

  return { full: native || fallback, native, toggle };
}
