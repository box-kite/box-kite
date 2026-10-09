import {
  applyThemeToElement,
  clearStoredTheme,
  documentRoot,
  getSystemTheme,
  pauseTransitions,
  readStoredTheme,
  watchSystemTheme,
  writeStoredTheme,
} from './themeRuntime';

/**
 * Theming with no framework: the state machine `<Box.Theme>` holds in React state, as a plain object any
 * adapter can own. Same rules as the provider — explicit beats persisted beats the system preference,
 * which is followed live — with one difference: the *first* value is already the real one, since there is
 * no hydration to stay consistent with. Theme rules are ancestor-scoped, so writing the name on an
 * element restyles everything inside it.
 */

export interface ThemeControllerOptions {
  /**
   * The element that carries the theme name (as a class) and `data-theme`. Defaults to the document root,
   * which is what `theme={{ dark: … }}` props expect; pass an element to theme a subtree, `null` to write
   * nothing and keep only the state.
   */
  target?: Element | null;
  /** When set, the chosen theme is persisted under this `localStorage` key and restored on start. */
  storageKey?: string;
  /** Start on this theme and stop following the system preference — the same as calling `set()` immediately. */
  theme?: string;
}

export interface ThemeController {
  /** The theme in effect right now. */
  readonly theme: string;
  /** Whether the current theme was chosen rather than read from the system preference. */
  readonly isOverridden: boolean;
  /** Switch theme, persisting it when a `storageKey` was given. `null` hands control back to the system. */
  set(theme: string | null): void;
  /** Run `listener` on every change. Returns the unsubscribe function. */
  subscribe(listener: (theme: string) => void): () => void;
  /** Stop watching the system preference and remove what was written to the target element. */
  destroy(): void;
}

export default function createThemeController(options: ThemeControllerOptions = {}): ThemeController {
  const { storageKey, theme: initialTheme } = options;
  // `undefined` means "not given" — `null` is a deliberate "write nowhere", so it must survive.
  const target = options.target === undefined ? documentRoot() : options.target;

  const stored = !initialTheme && storageKey ? readStoredTheme(storageKey) : null;

  let isOverridden = initialTheme !== undefined || stored !== null;
  let theme = initialTheme ?? stored ?? getSystemTheme();
  let removeFromTarget: (() => void) | undefined;

  const listeners = new Set<(theme: string) => void>();

  function apply(next: string) {
    if (next === theme) return;

    theme = next;
    const resume = target ? pauseTransitions() : undefined;
    removeFromTarget?.();
    removeFromTarget = target ? applyThemeToElement(target, next) : undefined;
    resume?.();

    for (const listener of [...listeners]) listener(next);
  }

  // The listener stays registered while overridden: `set(null)` hands control back without
  // needing to re-subscribe, and an unsubscribed listener would miss preference flips in between.
  const unwatch = watchSystemTheme((systemTheme) => {
    if (!isOverridden) apply(systemTheme);
  });

  // Writes the initial theme to the target — `theme` is already correct, so `apply` would bail.
  removeFromTarget = target ? applyThemeToElement(target, theme) : undefined;

  return {
    get theme() {
      return theme;
    },

    get isOverridden() {
      return isOverridden;
    },

    set(next: string | null) {
      if (next === null) {
        if (storageKey) clearStoredTheme(storageKey);
        isOverridden = false;

        return apply(getSystemTheme());
      }

      if (storageKey) writeStoredTheme(storageKey, next);
      isOverridden = true;

      apply(next);
    },

    subscribe(listener: (theme: string) => void) {
      listeners.add(listener);

      return () => listeners.delete(listener);
    },

    destroy() {
      unwatch();
      removeFromTarget?.();
      removeFromTarget = undefined;
      listeners.clear();
    },
  };
}
