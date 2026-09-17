// DOM matchers (toBeChecked, toHaveFocus, toHaveAccessibleName, ...). The accessibility tests lean
// on them heavily, and they read better than hand-rolled attribute assertions everywhere else too.
import '@testing-library/jest-dom/vitest';
import { Window } from 'happy-dom';
import { StylesContext } from '../src/react/useStyles';

// Node 26 defines `localStorage` itself, as a global getter that is `undefined` unless the process was
// started with --localstorage-file — and it outranks the one the happy-dom environment installs, so the
// whole Web Storage API reads as missing. Hand the two globals back to happy-dom, whose Storage works.
if (!globalThis.localStorage) {
  const window = new Window({ url: 'http://localhost/' });
  for (const key of ['localStorage', 'sessionStorage'] as const) {
    Object.defineProperty(globalThis, key, { value: window[key], configurable: true, writable: true });
  }
}

// Tests assert readable class names and rule text. Configure the engine explicitly —
// this replaces the NODE_ENV === 'test' sniffing the engine used to do internally.
StylesContext.configure({ classNames: 'readable', sink: 'textContent' });
