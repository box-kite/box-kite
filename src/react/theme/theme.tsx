import React, { useCallback, useContext, useLayoutEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import Box from '../../box';
import {
  applyThemeToElement,
  clearStoredTheme,
  defaultThemeName,
  documentRoot,
  getSystemTheme,
  readStoredTheme,
  startViewTransition,
  watchSystemTheme,
  writeStoredTheme,
} from '../../core';
import { BoxStyleProps } from '../../types';
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
   * Cross-fade the page when the theme changes, where the browser has view transitions. Off by default,
   * because a transition is a decision about the app rather than about theming.
   *
   * It exists as a prop rather than a recipe because the recipe has a trap in it: `startViewTransition`
   * screenshots the page the moment its callback returns, and a `setState` has not rendered by then — so
   * a hand-rolled version captures the old theme twice and nothing appears to change. This flushes the
   * update inside the callback. Reduced motion skips the transition and keeps the theme change.
   */
  viewTransition?: boolean;
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
      if (viewTransition) startViewTransition(() => flushSync(apply));
      else apply();
    },
    [storageKey, viewTransition],
  );

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
    if (stored) {
      setThemeName(stored);
      setIsUserOverride(true);
      return;
    }

    // Set actual system theme after hydration, then follow it
    setThemeName(getSystemTheme());

    return watchSystemTheme(setThemeName);
  }, [isUserOverride, storageKey]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useLayoutEffect(() => {
    if (use === 'local') return;

    const root = documentRoot();
    if (!root) return;

    return applyThemeToElement(root, themeName);
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
