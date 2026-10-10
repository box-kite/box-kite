import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  applyThemeToElement,
  clearStoredTheme,
  defaultThemeName,
  documentRoot,
  getSystemTheme,
  pauseTransitions,
  readStoredTheme,
  setThemeAttribute,
  watchSystemTheme,
  writeStoredTheme,
} from './themeRuntime';

// No React anywhere in this file — that is the point. These helpers are the whole platform-facing
// surface of the theme system, so a non-React adapter (CO6) can theme with the same three calls.

type Listener = (e: MediaQueryListEvent) => void;

/** A `matchMedia` stand-in that reports `matches` and lets a test fire a change. */
function stubMatchMedia(matches: boolean) {
  const listeners: Listener[] = [];

  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query === '(prefers-color-scheme: dark)' ? matches : false,
    media: query,
    addEventListener: (event: string, listener: Listener) => event === 'change' && listeners.push(listener),
    removeEventListener: (event: string, listener: Listener) => {
      if (event !== 'change') return;
      const index = listeners.indexOf(listener);
      index > -1 && listeners.splice(index, 1);
    },
  }));

  return {
    fire: (dark: boolean) => listeners.forEach((l) => l({ matches: dark } as MediaQueryListEvent)),
    get listenerCount() {
      return listeners.length;
    },
  };
}

describe('themeRuntime', () => {
  const originalMatchMedia = window.matchMedia;

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    vi.restoreAllMocks();
    document.documentElement.className = '';
    document.documentElement.removeAttribute('data-theme');
  });

  describe('getSystemTheme', () => {
    it('reads the dark preference', () => {
      stubMatchMedia(true);

      expect(getSystemTheme()).toBe('dark');
    });

    it('falls back to light when the preference is not dark', () => {
      stubMatchMedia(false);

      expect(getSystemTheme()).toBe('light');
      expect(defaultThemeName).toBe('light');
    });

    it('falls back to light when matchMedia is unavailable', () => {
      (window as { matchMedia?: unknown }).matchMedia = undefined;

      expect(getSystemTheme()).toBe(defaultThemeName);
    });
  });

  describe('watchSystemTheme', () => {
    it('reports preference changes and stops on unsubscribe', () => {
      const media = stubMatchMedia(false);
      const seen: string[] = [];

      const unsubscribe = watchSystemTheme((theme) => seen.push(theme));
      media.fire(true);
      media.fire(false);

      expect(seen).toEqual(['dark', 'light']);
      expect(media.listenerCount).toBe(1);

      unsubscribe();

      expect(media.listenerCount).toBe(0);

      media.fire(true);

      expect(seen).toEqual(['dark', 'light']);
    });

    it('returns a no-op unsubscribe when there is nothing to listen to', () => {
      (window as { matchMedia?: unknown }).matchMedia = undefined;
      const onChange = vi.fn();

      const unsubscribe = watchSystemTheme(onChange);

      expect(onChange).not.toHaveBeenCalled();
      expect(() => unsubscribe()).not.toThrow();
    });
  });

  describe('applyThemeToElement', () => {
    it('writes the class and the attribute, and its cleanup removes both', () => {
      const element = document.createElement('div');
      element.classList.add('existing');

      const cleanup = applyThemeToElement(element, 'dark');

      expect(element.classList.contains('dark')).toBe(true);
      expect(element.getAttribute('data-theme')).toBe('dark');

      cleanup();

      expect(element.classList.contains('dark')).toBe(false);
      expect(element.hasAttribute('data-theme')).toBe(false);
      expect(element.classList.contains('existing')).toBe(true);
    });

    it('sets the attribute alone for an element that already carries the class', () => {
      const element = document.createElement('div');

      setThemeAttribute(element, 'dark');

      expect(element.getAttribute('data-theme')).toBe('dark');
      expect(element.classList.contains('dark')).toBe(false);
    });
  });

  describe('documentRoot', () => {
    it('is the html element when there is a DOM', () => {
      expect(documentRoot()).toBe(document.documentElement);
    });
  });

  describe('theme persistence', () => {
    const key = 'themeRuntime-test-key';

    afterEach(() => localStorage.removeItem(key));

    it('round-trips through storage and clears', () => {
      expect(readStoredTheme(key)).toBeNull();

      writeStoredTheme(key, 'dark');

      expect(readStoredTheme(key)).toBe('dark');

      clearStoredTheme(key);

      expect(readStoredTheme(key)).toBeNull();
    });

    it('degrades to null instead of throwing when storage is unavailable', () => {
      const denied = () => {
        throw new Error('storage denied');
      };
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(denied);
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(denied);
      vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(denied);

      expect(readStoredTheme(key)).toBeNull();
      expect(() => writeStoredTheme(key, 'dark')).not.toThrow();
      expect(() => clearStoredTheme(key)).not.toThrow();
    });
  });

  describe('pauseTransitions', () => {
    const paused = () =>
      [...document.head.querySelectorAll('style')].filter((style) =>
        [...(style.sheet?.cssRules ?? [])].some((rule) => /transition:\s*none\s*!important/.test(rule.cssText)),
      ).length;

    const frames = () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

    it('switches every transition off until a frame after it is resumed, and leaves nothing behind', async () => {
      const resume = pauseTransitions();

      expect(paused()).toBe(1);

      resume();

      // Removing it at once would restyle the page a second time before the first paint (bug #244).
      expect(paused()).toBe(1);
      await vi.waitFor(() => expect(paused()).toBe(0));
    });

    it('stays paused until a running view transition has finished', async () => {
      let finish = () => {};
      const finished = new Promise<void>((resolve) => (finish = resolve));

      pauseTransitions()(finished);
      await frames();
      await frames();

      expect(paused()).toBe(1);

      finish();

      await vi.waitFor(() => expect(paused()).toBe(0));
    });
  });
});
