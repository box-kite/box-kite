import startViewTransition, { ViewTransitionHandle } from '../viewTransition';

/**
 * `'fade'` cross-fades the page, `'reveal'` grows the new theme out of the control that asked for it as a circle.
 * Both animate screenshots on the compositor, so a page of ten thousand elements costs what one of ten does.
 */
export type ThemeTransition = 'fade' | 'reveal';

let reveal: typeof import('./themeReveal') | undefined;

/** Fetch the reveal and start remembering presses. A provider calls it on mount, so it is in before the first press. */
export function prepareReveal(): () => void {
  let stop: (() => void) | undefined;
  let cancelled = false;

  import('./themeReveal').then((module) => {
    reveal = module;
    if (!cancelled) stop = module.watchPresses();
  });

  return () => {
    cancelled = true;
    stop?.();
  };
}

/** Run a theme change inside a view transition; in React, `update` has to flush. A reveal not yet fetched fades. */
export default function transitionTheme(update: () => void, kind: ThemeTransition): ViewTransitionHandle {
  return kind === 'reveal' && reveal ? reveal.default(update) : startViewTransition(update);
}
