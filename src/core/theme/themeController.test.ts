import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import createThemeController from './themeController';

// The vanilla half of theming: same rules as `<Box.Theme>`, no React in sight. What this file
// pins down is the precedence — explicit over stored over system — and that the system preference
// keeps being followed until something overrides it.

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

describe('createThemeController', () => {
  const originalMatchMedia = window.matchMedia;
  let target: HTMLElement;

  beforeEach(() => {
    target = document.createElement('div');
    document.body.append(target);
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    vi.restoreAllMocks();
    target.remove();
    localStorage.clear();
    document.documentElement.className = '';
    document.documentElement.removeAttribute('data-theme');
  });

  it('starts on the system preference and writes it to the target', () => {
    stubMatchMedia(true);

    const controller = createThemeController({ target });

    expect(controller.theme).toBe('dark');
    expect(controller.isOverridden).toBe(false);
    expect(target.className).toBe('dark');
    expect(target.getAttribute('data-theme')).toBe('dark');
  });

  it('defaults its target to the document root', () => {
    stubMatchMedia(false);

    const controller = createThemeController();

    expect(document.documentElement.getAttribute('data-theme')).toBe('light');

    controller.destroy();
  });

  it('follows the system preference until something overrides it', () => {
    const media = stubMatchMedia(false);
    const controller = createThemeController({ target });
    const seen: string[] = [];
    controller.subscribe((theme) => seen.push(theme));

    media.fire(true);
    expect(controller.theme).toBe('dark');
    expect(target.className).toBe('dark');

    controller.set('light');
    media.fire(true);

    // The override wins, and the class the previous theme added is gone rather than accumulated.
    expect(controller.theme).toBe('light');
    expect(target.className).toBe('light');
    expect(seen).toEqual(['dark', 'light']);
  });

  it('hands control back to the system on set(null)', () => {
    const media = stubMatchMedia(false);
    const controller = createThemeController({ target });

    controller.set('dark');
    expect(controller.isOverridden).toBe(true);

    controller.set(null);
    expect(controller.isOverridden).toBe(false);
    expect(controller.theme).toBe('light');

    media.fire(true);
    expect(controller.theme).toBe('dark');
  });

  it('starts overridden when an explicit theme is given', () => {
    const media = stubMatchMedia(false);
    const controller = createThemeController({ target, theme: 'sepia' });

    expect(controller.theme).toBe('sepia');
    expect(controller.isOverridden).toBe(true);

    media.fire(true);
    expect(controller.theme).toBe('sepia');
  });

  describe('persistence', () => {
    it('restores a stored theme over the system preference', () => {
      stubMatchMedia(true);
      localStorage.setItem('key', 'light');

      const controller = createThemeController({ target, storageKey: 'key' });

      expect(controller.theme).toBe('light');
      expect(controller.isOverridden).toBe(true);
    });

    it('loses to an explicit theme', () => {
      stubMatchMedia(false);
      localStorage.setItem('key', 'light');

      expect(createThemeController({ target, storageKey: 'key', theme: 'dark' }).theme).toBe('dark');
    });

    it('persists a choice and forgets it on set(null)', () => {
      stubMatchMedia(false);
      const controller = createThemeController({ target, storageKey: 'key' });

      controller.set('dark');
      expect(localStorage.getItem('key')).toBe('dark');

      controller.set(null);
      expect(localStorage.getItem('key')).toBeNull();
    });

    it('stores nothing without a storage key', () => {
      stubMatchMedia(false);
      createThemeController({ target }).set('dark');

      expect(localStorage.length).toBe(0);
    });
  });

  it('keeps state but writes nowhere when the target is null', () => {
    stubMatchMedia(false);
    const controller = createThemeController({ target: null });
    const seen: string[] = [];
    controller.subscribe((theme) => seen.push(theme));

    controller.set('dark');

    expect(controller.theme).toBe('dark');
    expect(seen).toEqual(['dark']);
    expect(document.documentElement.className).toBe('');
  });

  it('notifies only on an actual change', () => {
    stubMatchMedia(false);
    const controller = createThemeController({ target });
    const listener = vi.fn();
    controller.subscribe(listener);

    controller.set('light');
    controller.set('dark');
    controller.set('dark');

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith('dark');
  });

  it('stops notifying an unsubscribed listener', () => {
    stubMatchMedia(false);
    const controller = createThemeController({ target });
    const listener = vi.fn();

    const unsubscribe = controller.subscribe(listener);
    unsubscribe();
    controller.set('dark');

    expect(listener).not.toHaveBeenCalled();
  });

  it('writes a theme change with every transition paused, and resumes them afterwards (bug #243)', async () => {
    stubMatchMedia(false);
    const paused = () =>
      [...document.head.querySelectorAll('style')].filter((style) =>
        /transition:\s*none\s*!important/.test(style.sheet?.cssRules[0]?.cssText ?? ''),
      ).length;
    // Earlier tests switch themes too, and each pause lifts a couple of frames later.
    await vi.waitFor(() => expect(paused()).toBe(0));
    const controller = createThemeController({ target });
    const seen: number[] = [];
    const add = target.classList.add.bind(target.classList);
    vi.spyOn(target.classList, 'add').mockImplementation((...names) => {
      seen.push(paused());
      add(...names);
    });

    controller.set('dark');

    expect(seen).toEqual([1]);
    await vi.waitFor(() => expect(paused()).toBe(0));
  });

  it('releases the media listener and the target on destroy', () => {
    const media = stubMatchMedia(false);
    const controller = createThemeController({ target });

    expect(media.listenerCount).toBe(1);

    controller.destroy();

    expect(media.listenerCount).toBe(0);
    expect(target.className).toBe('');
    expect(target.hasAttribute('data-theme')).toBe(false);
  });
});
