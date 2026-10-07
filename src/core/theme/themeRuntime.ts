/**
 * The framework-free half of the theme system: reading the system preference, watching it, and writing a
 * theme name onto an element. `<Box.Theme>` is a thin wrapper over these three calls, and a non-React
 * adapter can drive theming with the same ones. Every function is a no-op without a DOM.
 */
import { documentRoot as environmentDocumentRoot, matchMedia } from '../../utils/environment/environmentUtils';

const DARK_QUERY = '(prefers-color-scheme: dark)';

/** The theme name used when the system preference cannot be read (server, no `matchMedia`). */
export const defaultThemeName = 'light';

function mediaQuery(): MediaQueryList | null {
  return matchMedia(DARK_QUERY);
}

/** The document root (`<html>`), or `null` when there is no DOM. */
export function documentRoot(): Element | null {
  return environmentDocumentRoot();
}

/** `'dark'` or `'light'` from `prefers-color-scheme`; `'light'` when the preference is unreadable. */
export function getSystemTheme(): string {
  const query = mediaQuery();

  return query?.matches ? 'dark' : defaultThemeName;
}

/**
 * Call `onChange` whenever the system preference flips. Returns the unsubscribe function — a no-op
 * when there is nothing to listen to, so callers never need to branch.
 */
export function watchSystemTheme(onChange: (theme: string) => void): () => void {
  const query = mediaQuery();
  if (!query) return () => {};

  const handleChange = (e: MediaQueryListEvent) => onChange(e.matches ? 'dark' : defaultThemeName);

  query.addEventListener('change', handleChange);

  return () => query.removeEventListener('change', handleChange);
}

/**
 * Mark `element` as carrying `themeName`: the theme name as a class (what the generated
 * ancestor-scoped selectors match on — `.dark .className`) plus a `data-theme` attribute for
 * consumers' own CSS. Returns the cleanup that removes exactly what was added.
 */
export function applyThemeToElement(element: Element, themeName: string): () => void {
  // Both writes are mutations even when nothing changes, so an element the shell already themed is left alone.
  if (!element.classList.contains(themeName)) element.classList.add(themeName);
  if (element.getAttribute('data-theme') !== themeName) element.setAttribute('data-theme', themeName);

  return () => {
    element.classList.remove(themeName);
    element.removeAttribute('data-theme');
  };
}

/**
 * The `data-theme` attribute on its own, for an element that already carries the theme class
 * (a local `<Box.Theme>` wrapper gets the class through `className`).
 */
export function setThemeAttribute(element: Element, themeName: string): void {
  element.setAttribute('data-theme', themeName);
}

/** The persisted theme name, or `null` when nothing is stored or storage is unavailable. */
export function readStoredTheme(storageKey: string): string | null {
  try {
    return localStorage.getItem(storageKey);
  } catch {
    // localStorage may be unavailable (server, privacy mode, storage disabled)
    return null;
  }
}

/** Persist `themeName`; silently does nothing when storage is unavailable. */
export function writeStoredTheme(storageKey: string, themeName: string): void {
  try {
    localStorage.setItem(storageKey, themeName);
  } catch {
    // see readStoredTheme
  }
}

/** Forget the persisted theme, handing control back to the system preference. */
export function clearStoredTheme(storageKey: string): void {
  try {
    localStorage.removeItem(storageKey);
  } catch {
    // see readStoredTheme
  }
}
