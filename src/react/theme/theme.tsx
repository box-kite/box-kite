import React, { useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import Box from '../../box';
import {
  applyThemeToElement,
  clearStoredTheme,
  defaultThemeName,
  documentRoot,
  getSystemTheme,
  pauseTransitions,
  prepareReveal,
  readStoredTheme,
  ThemeTransition,
  transitionTheme,
  watchSystemTheme,
  writeStoredTheme,
} from '../../core';
import { BoxStyleProps } from '../../types';
import { useIsomorphicInsertionEffect } from '../effects';
import { useGlobalStyles } from '../useStyles';
import ThemeContext from './themeContext';

interface ThemeProps {
  children: React.ReactNode;
  theme?: string; // Optional: auto-detects using prefers-color-scheme when not provided
  use?: 'global' | 'local';
  /** When provided, persists the user-selected theme to localStorage under this key. */
  storageKey?: string;
  /**
   * App-wide Box style props applied to the document root (`<html>`). Only takes effect when `use="global"`.
   * Supports the same shape as Box props, including theme-keyed values:
   * `globalStyles={{ scrollbarColor: ['violet-500', 'transparent'], theme: { dark: { scrollbarColor: [...] } } }}`.
   */
  globalStyles?: BoxStyleProps;
  /**
   * Animate a theme change where the browser has view transitions: `true` or `'fade'` cross-fades the page,
   * `'reveal'` grows the new theme out of the control that was pressed (or focused) as a circle. Off by
   * default, because a transition is a decision about the app rather than about theming.
   *
   * It exists as a prop rather than a recipe because the recipe has a trap in it: `startViewTransition`
   * screenshots the page the moment its callback returns, and a `setState` has not rendered by then — so
   * a hand-rolled version captures the old theme twice and nothing appears to change. This flushes the
   * update inside the callback. Reduced motion skips the transition and keeps the theme change.
   */
  viewTransition?: boolean | ThemeTransition;
}

/**
 * The React binding for the theme system. Everything that actually touches the platform — reading
 * and watching `prefers-color-scheme`, persisting the choice, writing the theme onto an element —
 * lives in the framework-free `core/theme/themeRuntime`; this component only holds the React state
 * and context around it.
 */
function Theme(props: ThemeProps) {
  const { children, theme, use = 'local', storageKey, globalStyles, viewTransition } = props;

  // In element mode the global rules come back as `<style>` elements to render: they target `html`,
  // so no Box owns them and nothing else would put them in the document.
  const globalStyleElements = useGlobalStyles(use === 'global' ? globalStyles : undefined, 'html');
  // Initialize with the default for SSR consistency - actual system theme is set in useLayoutEffect
  const [themeName, setThemeName] = useState(theme ?? defaultThemeName);
  const [isUserOverride, setIsUserOverride] = useState(theme !== undefined);
  // The theme detection just queued a re-render to. Applying the default first flips an `<html>` the shell
  // already themed through `class="dark light"`, a full-page recalc (bug #204).
  const resolvingRef = useRef<string | null>(null);
  const committedRef = useRef(themeName);
  const resumeTransitionsRef = useRef<((after?: PromiseLike<unknown>) => void) | null>(null);
  // The running view transition: transitions stay paused until it is over, so their resumption costs it no frame.
  const transitionRef = useRef<PromiseLike<unknown> | undefined>(undefined);

  const handleSetTheme = useCallback(
    (value: string | null) => {
      const apply = () => {
        if (value === null) {
          if (storageKey) clearStoredTheme(storageKey);
          setIsUserOverride(false);
        } else {
          if (storageKey) writeStoredTheme(storageKey, value);
          setThemeName(value);
          setIsUserOverride(true);
        }
      };

      // `flushSync` is the whole point of the prop: the transition screenshots the page when this callback
      // returns, so an unflushed `setState` is captured as the theme that was already there.
      if (viewTransition) {
        const handle = transitionTheme(() => flushSync(apply), viewTransition === 'reveal' ? 'reveal' : 'fade');
        transitionRef.current = handle.finished;
        handle.finished.then(
          () => (transitionRef.current = undefined),
          () => (transitionRef.current = undefined),
        );
      } else apply();
    },
    [storageKey, viewTransition],
  );

  const revealing = viewTransition === 'reveal';
  useEffect(() => (revealing ? prepareReveal() : undefined), [revealing]);

  // Sync with theme prop changes (render-phase, no effect — initial state already covers mount).
  const [prevTheme, setPrevTheme] = useState(theme);
  if (theme !== prevTheme) {
    setPrevTheme(theme);
    if (theme !== undefined) {
      setThemeName(theme);
      setIsUserOverride(true);
    } else {
      setIsUserOverride(false);
    }
  }

  // Detect system theme and listen for changes (client-only, prevents hydration mismatch).
  // setState here is intentional: the actual system/persisted theme must be applied after
  // hydration to keep SSR output deterministic, so this can't move to a render-phase derivation.
  /* eslint-disable react-hooks/set-state-in-effect */
  useLayoutEffect(() => {
    if (isUserOverride) return;

    // Restore persisted theme from localStorage before falling back to system detection
    const stored = storageKey ? readStoredTheme(storageKey) : null;
    const resolved = stored ?? getSystemTheme();
    // Only a change queues the re-render that consumes it; one left behind would skip the next apply.
    if (resolved !== committedRef.current) resolvingRef.current = resolved;
    setThemeName(resolved);
    if (stored) {
      setIsUserOverride(true);
      return;
    }

    return watchSystemTheme(setThemeName);
  }, [isUserOverride, storageKey]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Ahead of every layout effect, since one that reads a style would start a transition on every element (bug #243).
  useIsomorphicInsertionEffect(() => {
    if (themeName !== committedRef.current) resumeTransitionsRef.current ??= pauseTransitions();
  }, [themeName]);

  useLayoutEffect(() => {
    committedRef.current = themeName;
    // The re-render the detection effect just queued applies the resolved theme, before the browser paints.
    if (resolvingRef.current !== null && resolvingRef.current !== themeName) return;
    resolvingRef.current = null;

    const resumeTransitions = resumeTransitionsRef.current;
    resumeTransitionsRef.current = null;
    const root = use === 'global' ? documentRoot() : null;
    const removeTheme = root ? applyThemeToElement(root, themeName) : undefined;
    resumeTransitions?.(transitionRef.current);

    return removeTheme;
  }, [themeName, use]);

  if (use === 'local') {
    return (
      <ThemeContext.Provider value={{ theme: themeName, setTheme: handleSetTheme }}>
        {globalStyleElements}
        <Box className={themeName} props={{ 'data-theme': themeName }}>
          {children}
        </Box>
      </ThemeContext.Provider>
    );
  }

  return (
    <ThemeContext.Provider value={{ theme: themeName, setTheme: handleSetTheme }}>
      {globalStyleElements}
      {children}
    </ThemeContext.Provider>
  );
}

namespace Theme {
  export function useTheme(): [string, (theme: string | null) => void] {
    const { theme, setTheme } = useContext(ThemeContext);

    return [theme, setTheme];
  }
}

export default Theme;
