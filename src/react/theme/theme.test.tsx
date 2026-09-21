import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ignoreLogs } from '../../../dev/tests';
import Box from '../../box';
import Theme from './theme';

const testId = 'test-content';

describe('Theme', () => {
  ignoreLogs();

  let matchMediaListeners: ((e: MediaQueryListEvent) => void)[] = [];
  let matchesDark = false;

  const mockMatchMedia = (matches: boolean) => {
    matchesDark = matches;
    return vi.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-color-scheme: dark)' ? matchesDark : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn((event: string, callback: (e: MediaQueryListEvent) => void) => {
        if (event === 'change') {
          matchMediaListeners.push(callback);
        }
      }),
      removeEventListener: vi.fn((event: string, callback: (e: MediaQueryListEvent) => void) => {
        if (event === 'change') {
          matchMediaListeners = matchMediaListeners.filter((cb) => cb !== callback);
        }
      }),
      dispatchEvent: vi.fn(),
    }));
  };

  beforeEach(() => {
    matchMediaListeners = [];
    matchesDark = false;
    window.matchMedia = mockMatchMedia(false);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe('getSystemTheme() SSR behavior', () => {
    it('returns light theme when window is undefined (SSR)', () => {
      // We can't truly test SSR in happy-dom, but we can verify
      // the component renders with a default theme
      render(
        <Theme>
          <Box id={testId}>Content</Box>
        </Theme>,
      );

      const content = document.getElementById(testId)!;
      // In light mode (default), parent should have 'light' class
      expect(content.parentElement?.classList.contains('light')).toBe(true);
    });
  });

  describe('auto-detection with prefers-color-scheme', () => {
    it('detects light mode when system prefers light', () => {
      window.matchMedia = mockMatchMedia(false);

      render(
        <Theme>
          <Box id={testId}>Content</Box>
        </Theme>,
      );

      const content = document.getElementById(testId)!;
      expect(content.parentElement?.classList.contains('light')).toBe(true);
    });

    it('detects dark mode when system prefers dark', () => {
      window.matchMedia = mockMatchMedia(true);

      render(
        <Theme>
          <Box id={testId}>Content</Box>
        </Theme>,
      );

      const content = document.getElementById(testId)!;
      expect(content.parentElement?.classList.contains('dark')).toBe(true);
    });
  });

  describe('system theme change listener', () => {
    it('updates theme when system preference changes from light to dark', () => {
      window.matchMedia = mockMatchMedia(false);

      render(
        <Theme>
          <Box id={testId}>Content</Box>
        </Theme>,
      );

      const content = document.getElementById(testId)!;
      expect(content.parentElement?.classList.contains('light')).toBe(true);

      // Simulate system theme change
      act(() => {
        matchMediaListeners.forEach((listener) => {
          listener({ matches: true } as MediaQueryListEvent);
        });
      });

      expect(content.parentElement?.classList.contains('dark')).toBe(true);
    });

    it('updates theme when system preference changes from dark to light', () => {
      window.matchMedia = mockMatchMedia(true);

      render(
        <Theme>
          <Box id={testId}>Content</Box>
        </Theme>,
      );

      const content = document.getElementById(testId)!;
      expect(content.parentElement?.classList.contains('dark')).toBe(true);

      // Simulate system theme change
      act(() => {
        matchMediaListeners.forEach((listener) => {
          listener({ matches: false } as MediaQueryListEvent);
        });
      });

      expect(content.parentElement?.classList.contains('light')).toBe(true);
    });

    it('cleans up event listener on unmount', () => {
      window.matchMedia = mockMatchMedia(false);

      const { unmount } = render(
        <Theme>
          <Box id={testId}>Content</Box>
        </Theme>,
      );

      expect(matchMediaListeners.length).toBe(1);

      unmount();

      expect(matchMediaListeners.length).toBe(0);
    });
  });

  describe('explicit theme prop', () => {
    it('uses explicit theme instead of auto-detection', () => {
      window.matchMedia = mockMatchMedia(true); // System prefers dark

      render(
        <Theme theme="light">
          <Box id={testId}>Content</Box>
        </Theme>,
      );

      const content = document.getElementById(testId)!;
      // Should use explicit 'light' even though system prefers dark
      expect(content.parentElement?.classList.contains('light')).toBe(true);
    });

    it('does not add event listener when theme is explicitly provided', () => {
      window.matchMedia = mockMatchMedia(false);

      render(
        <Theme theme="dark">
          <Box id={testId}>Content</Box>
        </Theme>,
      );

      // No listener should be added when theme is explicit
      expect(matchMediaListeners.length).toBe(0);
    });

    it('ignores system theme changes when theme is explicitly provided', () => {
      window.matchMedia = mockMatchMedia(false);

      render(
        <Theme theme="dark">
          <Box id={testId}>Content</Box>
        </Theme>,
      );

      const content = document.getElementById(testId)!;
      expect(content.parentElement?.classList.contains('dark')).toBe(true);

      // Simulate system theme change - should have no effect
      act(() => {
        matchMediaListeners.forEach((listener) => {
          listener({ matches: false } as MediaQueryListEvent);
        });
      });

      // Should still be dark (explicit theme)
      expect(content.parentElement?.classList.contains('dark')).toBe(true);
    });
  });

  describe('useTheme hook', () => {
    it('returns current theme and setTheme function', () => {
      let capturedTheme: string | undefined;
      let capturedSetTheme: ((theme: string) => void) | undefined;

      function TestComponent() {
        const [theme, setTheme] = Theme.useTheme();
        capturedTheme = theme;
        capturedSetTheme = setTheme;
        return <Box id={testId}>{theme}</Box>;
      }

      render(
        <Theme theme="light">
          <TestComponent />
        </Theme>,
      );

      expect(capturedTheme).toBe('light');
      expect(typeof capturedSetTheme).toBe('function');
    });

    it('allows programmatic theme change via setTheme', () => {
      let capturedSetTheme: ((theme: string) => void) | undefined;

      function TestComponent() {
        const [theme, setTheme] = Theme.useTheme();
        capturedSetTheme = setTheme;
        return <Box id={testId}>{theme}</Box>;
      }

      render(
        <Theme theme="light">
          <TestComponent />
        </Theme>,
      );

      const content = document.getElementById(testId)!;
      expect(content.textContent).toBe('light');

      act(() => {
        capturedSetTheme?.('dark');
      });

      expect(content.textContent).toBe('dark');
    });
  });

  describe('use prop (local vs global)', () => {
    it('wraps children in Box with theme class when use="local" (default)', () => {
      render(
        <Theme theme="dark">
          <Box id={testId}>Content</Box>
        </Theme>,
      );

      const content = document.getElementById(testId)!;
      // Parent should be a Box wrapper with 'dark' class
      expect(content.parentElement?.classList.contains('dark')).toBe(true);
      expect(content.parentElement?.classList.contains('_b')).toBe(true); // Box base class
    });

    it('adds theme class to document root when use="global"', () => {
      render(
        <Theme theme="dark" use="global">
          <Box id={testId}>Content</Box>
        </Theme>,
      );

      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('removes theme class from document root on unmount when use="global"', () => {
      const { unmount } = render(
        <Theme theme="dark" use="global">
          <Box id={testId}>Content</Box>
        </Theme>,
      );

      expect(document.documentElement.classList.contains('dark')).toBe(true);

      unmount();

      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('does not wrap children in Box when use="global"', () => {
      render(
        <Theme theme="dark" use="global">
          <Box id={testId}>Content</Box>
        </Theme>,
      );

      const content = document.getElementById(testId)!;
      // Parent should NOT be a Box wrapper (no '_b' class on immediate parent)
      expect(content.parentElement?.classList.contains('_b')).toBe(false);
    });
  });

  describe('custom theme names', () => {
    it('supports custom theme names beyond light/dark', () => {
      render(
        <Theme theme="high-contrast">
          <Box id={testId}>Content</Box>
        </Theme>,
      );

      const content = document.getElementById(testId)!;
      expect(content.parentElement?.classList.contains('high-contrast')).toBe(true);
    });
  });

  describe('reset to system theme', () => {
    it('setTheme(null) resets to system light', () => {
      window.matchMedia = mockMatchMedia(false);
      let capturedSetTheme: ((theme: string | null) => void) | undefined;

      function TestComponent() {
        const [theme, setTheme] = Theme.useTheme();
        capturedSetTheme = setTheme;
        return <Box id={testId}>{theme}</Box>;
      }

      render(
        <Theme>
          <TestComponent />
        </Theme>,
      );

      const content = document.getElementById(testId)!;
      expect(content.textContent).toBe('light');

      act(() => {
        capturedSetTheme?.('dark');
      });

      expect(content.textContent).toBe('dark');

      act(() => {
        capturedSetTheme?.(null);
      });

      expect(content.textContent).toBe('light');
    });

    it('setTheme(null) resets to system dark', () => {
      window.matchMedia = mockMatchMedia(true);
      let capturedSetTheme: ((theme: string | null) => void) | undefined;

      function TestComponent() {
        const [theme, setTheme] = Theme.useTheme();
        capturedSetTheme = setTheme;
        return <Box id={testId}>{theme}</Box>;
      }

      render(
        <Theme>
          <TestComponent />
        </Theme>,
      );

      const content = document.getElementById(testId)!;
      expect(content.textContent).toBe('dark');

      act(() => {
        capturedSetTheme?.('light');
      });

      expect(content.textContent).toBe('light');

      act(() => {
        capturedSetTheme?.(null);
      });

      expect(content.textContent).toBe('dark');
    });

    it('after reset, system theme changes are tracked again', () => {
      window.matchMedia = mockMatchMedia(false);
      let capturedSetTheme: ((theme: string | null) => void) | undefined;

      function TestComponent() {
        const [theme, setTheme] = Theme.useTheme();
        capturedSetTheme = setTheme;
        return <Box id={testId}>{theme}</Box>;
      }

      render(
        <Theme>
          <TestComponent />
        </Theme>,
      );

      const content = document.getElementById(testId)!;

      // Override to dark
      act(() => {
        capturedSetTheme?.('dark');
      });

      expect(content.textContent).toBe('dark');
      expect(matchMediaListeners.length).toBe(0);

      // Reset to system
      act(() => {
        capturedSetTheme?.(null);
      });

      expect(content.textContent).toBe('light');
      expect(matchMediaListeners.length).toBe(1);

      // System changes should be tracked again
      act(() => {
        matchMediaListeners.forEach((listener) => {
          listener({ matches: true } as MediaQueryListEvent);
        });
      });

      expect(content.textContent).toBe('dark');
    });

    it('system changes are ignored during user override', () => {
      window.matchMedia = mockMatchMedia(false);
      let capturedSetTheme: ((theme: string | null) => void) | undefined;

      function TestComponent() {
        const [theme, setTheme] = Theme.useTheme();
        capturedSetTheme = setTheme;
        return <Box id={testId}>{theme}</Box>;
      }

      render(
        <Theme>
          <TestComponent />
        </Theme>,
      );

      const content = document.getElementById(testId)!;

      act(() => {
        capturedSetTheme?.('dark');
      });

      expect(content.textContent).toBe('dark');

      // Simulate system change — should have no effect since listener is removed
      act(() => {
        matchMediaListeners.forEach((listener) => {
          listener({ matches: false } as MediaQueryListEvent);
        });
      });

      expect(content.textContent).toBe('dark');
    });

    it('multiple override/reset cycles work correctly', () => {
      window.matchMedia = mockMatchMedia(false);
      let capturedSetTheme: ((theme: string | null) => void) | undefined;

      function TestComponent() {
        const [theme, setTheme] = Theme.useTheme();
        capturedSetTheme = setTheme;
        return <Box id={testId}>{theme}</Box>;
      }

      render(
        <Theme>
          <TestComponent />
        </Theme>,
      );

      const content = document.getElementById(testId)!;
      expect(content.textContent).toBe('light');

      // Cycle 1
      act(() => {
        capturedSetTheme?.('dark');
      });
      expect(content.textContent).toBe('dark');

      act(() => {
        capturedSetTheme?.(null);
      });
      expect(content.textContent).toBe('light');

      // Cycle 2
      act(() => {
        capturedSetTheme?.('dark');
      });
      expect(content.textContent).toBe('dark');

      act(() => {
        capturedSetTheme?.(null);
      });
      expect(content.textContent).toBe('light');
    });

    it('event listener removed on override, re-added on reset', () => {
      window.matchMedia = mockMatchMedia(false);
      let capturedSetTheme: ((theme: string | null) => void) | undefined;

      function TestComponent() {
        const [, setTheme] = Theme.useTheme();
        capturedSetTheme = setTheme;
        return <Box id={testId}>Content</Box>;
      }

      render(
        <Theme>
          <TestComponent />
        </Theme>,
      );

      expect(matchMediaListeners.length).toBe(1);

      act(() => {
        capturedSetTheme?.('dark');
      });

      expect(matchMediaListeners.length).toBe(0);

      act(() => {
        capturedSetTheme?.(null);
      });

      expect(matchMediaListeners.length).toBe(1);
    });

    it('reset works with use="global"', () => {
      window.matchMedia = mockMatchMedia(false);
      let capturedSetTheme: ((theme: string | null) => void) | undefined;

      function TestComponent() {
        const [, setTheme] = Theme.useTheme();
        capturedSetTheme = setTheme;
        return <Box id={testId}>Content</Box>;
      }

      render(
        <Theme use="global">
          <TestComponent />
        </Theme>,
      );

      expect(document.documentElement.classList.contains('light')).toBe(true);

      act(() => {
        capturedSetTheme?.('dark');
      });

      expect(document.documentElement.classList.contains('dark')).toBe(true);

      act(() => {
        capturedSetTheme?.(null);
      });

      expect(document.documentElement.classList.contains('light')).toBe(true);
    });
  });

  describe('data-theme attribute', () => {
    it('sets data-theme on wrapper Box in local mode', () => {
      render(
        <Theme theme="dark">
          <Box id={testId}>Content</Box>
        </Theme>,
      );

      const content = document.getElementById(testId)!;
      expect(content.parentElement?.getAttribute('data-theme')).toBe('dark');
    });

    it('sets data-theme on document root in global mode', () => {
      render(
        <Theme theme="dark" use="global">
          <Box id={testId}>Content</Box>
        </Theme>,
      );

      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('removes data-theme from document root on unmount in global mode', () => {
      const { unmount } = render(
        <Theme theme="dark" use="global">
          <Box id={testId}>Content</Box>
        </Theme>,
      );

      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

      unmount();

      expect(document.documentElement.getAttribute('data-theme')).toBeNull();
    });

    it('updates data-theme when theme changes', () => {
      let capturedSetTheme: ((theme: string | null) => void) | undefined;

      function TestComponent() {
        const [, setTheme] = Theme.useTheme();
        capturedSetTheme = setTheme;
        return <Box id={testId}>Content</Box>;
      }

      render(
        <Theme theme="light">
          <TestComponent />
        </Theme>,
      );

      const content = document.getElementById(testId)!;
      expect(content.parentElement?.getAttribute('data-theme')).toBe('light');

      act(() => {
        capturedSetTheme?.('dark');
      });

      expect(content.parentElement?.getAttribute('data-theme')).toBe('dark');
    });
  });

  describe('globalStyles', () => {
    const getStyleSheet = () => document.getElementById('box-kite-styles') as unknown as HTMLStyleElement;

    it('emits a rule targeting `html` when use="global"', () => {
      render(
        <Theme use="global" globalStyles={{ scrollbarColor: ['violet-500', 'transparent'] }}>
          <Box id={testId}>Content</Box>
        </Theme>,
      );

      expect(getStyleSheet().innerText).toContain('html{scrollbar-color:var(--violet-500) var(--transparent)}');
    });

    it('emits a compound selector `html.<theme>` for theme-keyed values', () => {
      render(
        <Theme theme="dark" use="global" globalStyles={{ theme: { dark: { scrollbarColor: ['violet-700', 'gray-900'] } } }}>
          <Box id={testId}>Content</Box>
        </Theme>,
      );

      expect(getStyleSheet().innerText).toContain('html.dark{scrollbar-color:var(--violet-700) var(--gray-900)}');
    });

    it('does NOT emit an `html` rule when use="local"', () => {
      render(
        <Theme use="local" globalStyles={{ scrollbarColor: ['fuchsia-500', 'transparent'] }}>
          <Box id={testId}>Content</Box>
        </Theme>,
      );

      expect(getStyleSheet().innerText).not.toContain('html{scrollbar-color:var(--fuchsia-500)');
    });

    it('emits multiple global props in a single Theme', () => {
      render(
        <Theme use="global" globalStyles={{ scrollbarColor: ['emerald-500', 'transparent'], scrollbarWidth: 'thin' }}>
          <Box id={testId}>Content</Box>
        </Theme>,
      );

      const sheet = getStyleSheet().innerText;
      expect(sheet).toContain('html{scrollbar-color:var(--emerald-500) var(--transparent)}');
      expect(sheet).toContain('html{scrollbar-width:thin}');
    });
  });

  describe('localStorage persistence', () => {
    const storageKey = 'test-theme';

    beforeEach(() => {
      localStorage.clear();
    });

    it('persists user-selected theme to localStorage', () => {
      let capturedSetTheme: ((theme: string | null) => void) | undefined;

      function TestComponent() {
        const [, setTheme] = Theme.useTheme();
        capturedSetTheme = setTheme;
        return <Box id={testId}>Content</Box>;
      }

      render(
        <Theme storageKey={storageKey}>
          <TestComponent />
        </Theme>,
      );

      act(() => {
        capturedSetTheme?.('dark');
      });

      expect(localStorage.getItem(storageKey)).toBe('dark');
    });

    it('restores persisted theme on mount', () => {
      localStorage.setItem(storageKey, 'dark');
      window.matchMedia = mockMatchMedia(false); // System prefers light

      render(
        <Theme storageKey={storageKey}>
          <Box id={testId}>Content</Box>
        </Theme>,
      );

      const content = document.getElementById(testId)!;
      expect(content.parentElement?.classList.contains('dark')).toBe(true);
    });

    it('clears localStorage on setTheme(null)', () => {
      let capturedSetTheme: ((theme: string | null) => void) | undefined;

      function TestComponent() {
        const [, setTheme] = Theme.useTheme();
        capturedSetTheme = setTheme;
        return <Box id={testId}>Content</Box>;
      }

      render(
        <Theme storageKey={storageKey}>
          <TestComponent />
        </Theme>,
      );

      act(() => {
        capturedSetTheme?.('dark');
      });

      expect(localStorage.getItem(storageKey)).toBe('dark');

      act(() => {
        capturedSetTheme?.(null);
      });

      expect(localStorage.getItem(storageKey)).toBeNull();
    });

    it('does not persist when storageKey is not provided', () => {
      let capturedSetTheme: ((theme: string | null) => void) | undefined;

      function TestComponent() {
        const [, setTheme] = Theme.useTheme();
        capturedSetTheme = setTheme;
        return <Box id={testId}>Content</Box>;
      }

      render(
        <Theme>
          <TestComponent />
        </Theme>,
      );

      act(() => {
        capturedSetTheme?.('dark');
      });

      expect(localStorage.getItem(storageKey)).toBeNull();
    });

    it('restores persisted theme then tracks system changes after reset', () => {
      localStorage.setItem(storageKey, 'dark');
      window.matchMedia = mockMatchMedia(false);
      let capturedSetTheme: ((theme: string | null) => void) | undefined;

      function TestComponent() {
        const [theme, setTheme] = Theme.useTheme();
        capturedSetTheme = setTheme;
        return <Box id={testId}>{theme}</Box>;
      }

      render(
        <Theme storageKey={storageKey}>
          <TestComponent />
        </Theme>,
      );

      const content = document.getElementById(testId)!;
      expect(content.textContent).toBe('dark');

      // Reset to system
      act(() => {
        capturedSetTheme?.(null);
      });

      expect(content.textContent).toBe('light');
      expect(localStorage.getItem(storageKey)).toBeNull();

      // System changes should be tracked
      act(() => {
        matchMediaListeners.forEach((listener) => {
          listener({ matches: true } as MediaQueryListEvent);
        });
      });

      expect(content.textContent).toBe('dark');
    });
  });

  /**
   * The prop exists because the recipe has a trap: `startViewTransition` screenshots the page when its
   * callback returns, so an unflushed `setState` is captured as the theme that was already there.
   */
  describe('viewTransition', () => {
    type Doc = Record<'startViewTransition', unknown>;

    function captureThemeDuringTransition() {
      const seen: (string | null)[] = [];

      (document as unknown as Doc).startViewTransition = (update: () => void) => {
        update();
        // Read after the callback returns, which is exactly when the browser takes its second screenshot.
        seen.push(document.documentElement.getAttribute('data-theme'));

        const done = Promise.resolve();

        return { ready: done, finished: done, updateCallbackDone: done, skipTransition: vi.fn() };
      };

      return seen;
    }

    afterEach(() => {
      delete (document as unknown as Partial<Doc>).startViewTransition;
    });

    function Toggle() {
      const [theme, setTheme] = Theme.useTheme();

      return (
        <Box tag="button" id={testId} props={{ onClick: () => setTheme('dark') }}>
          {theme}
        </Box>
      );
    }

    it('has the new theme in the DOM before the transition screenshots it', () => {
      const seen = captureThemeDuringTransition();

      render(
        <Theme theme="light" use="global" viewTransition>
          <Toggle />
        </Theme>,
      );

      act(() => {
        document.getElementById(testId)?.click();
      });

      expect(seen).toEqual(['dark']);
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('changes theme without a transition when the prop is off', () => {
      const seen = captureThemeDuringTransition();

      render(
        <Theme theme="light" use="global">
          <Toggle />
        </Theme>,
      );

      act(() => {
        document.getElementById(testId)?.click();
      });

      expect(seen).toEqual([]);
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });
  });
});
