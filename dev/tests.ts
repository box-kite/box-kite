import { afterEach, beforeEach, vi } from 'vitest';

/**
 * What the browser answers when asked which side a floating layer ended up on: the *used*
 * `position-area`, which is `block-start …` once a `position-try` fallback has flipped it. Nothing lays
 * out in a test environment, so a flip has to be said out loud — and only that one property is answered
 * for, since `<Presence>` times its exit off `transition-duration` on the same object.
 */
export function withUsedPositionArea(area: string) {
  const real = window.getComputedStyle.bind(window);

  vi.spyOn(window, 'getComputedStyle').mockImplementation((...args: Parameters<typeof real>) => {
    const style = real(...args);
    const inner = style.getPropertyValue.bind(style);

    style.getPropertyValue = (name: string) => (name === 'position-area' ? area : inner(name));

    return style;
  });
}

// Mock console.log to prevent noise in test output
export function ignoreLogs() {
  const originalConsoleLog = console.log;
  const originalConsoleDebug = console.debug;

  beforeEach(() => {
    console.log = vi.fn();
    console.debug = vi.fn();
  });

  afterEach(() => {
    console.log = originalConsoleLog;
    console.debug = originalConsoleDebug;
  });
}
