import { act } from '@testing-library/react';
import React from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, MockInstance, vi } from 'vitest';
import { installPopoverApi } from '../dev/tests';
import Box from './box';
import Flex from './components/flex';
import Overlay from './components/overlay';
import Toaster from './components/toaster';
import { DEFAULT_STYLE_ELEMENT_ID } from './core/engine/styleEngine';
import { StylesContext } from './react/useStyles';

/**
 * Class names are generated, so a mismatch between the server pass and the hydration pass shows up
 * as React throwing the whole subtree away and re-rendering it — a silent performance and
 * flash-of-unstyled cliff. These tests hydrate real server output and fail on any mismatch React
 * reports.
 */
// Every phrasing React 18 and React 19 use to report a hydration mismatch. Deliberately narrow:
// React 18 also warns that `useLayoutEffect` does nothing on the server whenever a DOM-shaped test
// environment renders to string, and that warning is not a mismatch.
const mismatchWarning = /hydration failed|did not match|didn't match|expected server html|hydrated but some attributes/i;

type ConsoleSpy = MockInstance<typeof console.error>;

function hydrationErrors(spy: ConsoleSpy) {
  return spy.mock.calls.map((args) => args.map((arg) => String(arg)).join(' ')).filter((message) => mismatchWarning.test(message));
}

describe('hydration', () => {
  let errorSpy: ConsoleSpy;
  let container: HTMLDivElement;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    errorSpy.mockRestore();
    container.remove();
    StylesContext.clear();
    const styleElement = document.getElementById(DEFAULT_STYLE_ELEMENT_ID);
    if (styleElement) styleElement.textContent = '';
  });

  /**
   * Server pass, then hydration pass. `browser` runs between the two, which is the only place a
   * capability the server did not have can be installed — both passes share this environment, so a
   * contract installed around the call is one the server read too, and the asymmetry disappears.
   */
  async function hydrate(element: React.ReactElement, browser?: () => void) {
    container.innerHTML = renderToString(element);
    const serverHtml = container.innerHTML;
    browser?.();

    let root: ReturnType<typeof hydrateRoot>;
    await act(async () => {
      root = hydrateRoot(container, element);
    });

    return { serverHtml, unmount: () => act(() => root.unmount()) };
  }

  it('hydrates generated class names without a mismatch', async () => {
    const { serverHtml, unmount } = await hydrate(
      <Flex d="column" gap={2} p={4}>
        <Box fontSize={14} color="gray-700">
          text
        </Box>
      </Flex>,
    );

    expect(hydrationErrors(errorSpy)).toEqual([]);
    // Hydration reuses the server markup instead of replacing it.
    expect(container.innerHTML).toBe(serverHtml);
    await unmount();
  });

  it('hydrates boolean and tag attributes without a mismatch', async () => {
    const { unmount } = await hydrate(
      <Box tag="input" disabled required props={{ type: 'checkbox', name: 'agree' }} b={1} borderRadius={1} />,
    );

    expect(hydrationErrors(errorSpy)).toEqual([]);
    expect(container.querySelector('input')?.hasAttribute('disabled')).toBe(true);
    await unmount();
  });

  it('hydrates a Theme provider that resolves to a different theme on the client', async () => {
    // The provider renders `light` on the server on purpose and only reads the system preference
    // after hydration, so a dark-mode client must still hydrate cleanly and then switch.
    const matchMedia = vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    vi.stubGlobal('matchMedia', matchMedia);

    const element = (
      <Box.Theme>
        <Box theme={{ dark: { bgColor: 'gray-900' } }}>themed</Box>
      </Box.Theme>
    );

    try {
      const { serverHtml, unmount } = await hydrate(element);

      expect(hydrationErrors(errorSpy)).toEqual([]);
      expect(serverHtml).toContain('class="_b light"');
      // After hydration the effect applies the system preference.
      expect(container.innerHTML).toContain('class="_b dark"');
      await unmount();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('hydrates a Toaster, whose viewport a server renders in the shape the top layer gives it', async () => {
    const { serverHtml, unmount } = await hydrate(<Toaster />);

    // The one that bit: reading the capability during render answered false on the server (no
    // HTMLElement) and true in the browser, so the server emitted nothing where the client put the
    // region — React #418 on every load of the page. The viewport has to be in the server markup.
    expect(serverHtml).toContain('aria-live="polite"');
    expect(hydrationErrors(errorSpy)).toEqual([]);
    await unmount();
  });

  it('hydrates an open Overlay into the top layer the server could not read', async () => {
    let uninstall = () => {};

    try {
      const { serverHtml, unmount } = await hydrate(<Overlay>layer</Overlay>, () => (uninstall = installPopoverApi()));

      // Bug #197: read during render, the capability answered false on the server, so the portal branch
      // emitted nothing where the client put the layer — React #418 on every load of a page holding an
      // open one. Nothing this library ships had met it: they all mount their Overlay when it opens.
      expect(serverHtml).toContain('popover="manual"');
      expect(hydrationErrors(errorSpy)).toEqual([]);

      const layer = container.querySelector('[popover="manual"]');
      expect(layer).toHaveTextContent('layer');
      expect(layer?.matches(':popover-open')).toBe(true);
      await unmount();
    } finally {
      uninstall();
    }
  });

  it('corrects an open Overlay into a portal only after hydrating, where the browser has no Popover API', async () => {
    // The environment implements none, which is the browser this is about. The server snapshot is what
    // hydrates — matching the markup — and the real answer arrives on the render after, where the layer
    // moves. Safe here and nowhere else: a layer that arrives with the HTML has had nothing focused in it.
    const { serverHtml, unmount } = await hydrate(<Overlay>layer</Overlay>);

    expect(serverHtml).toContain('popover="manual"');
    expect(hydrationErrors(errorSpy)).toEqual([]);
    expect(container.querySelector('[popover]')).toBeNull();
    expect(document.getElementById('box-kite-portal')).toHaveTextContent('layer');
    await unmount();
  });

  it('keeps the server CSS valid for the hydrated markup', async () => {
    const { unmount } = await hydrate(<Box p={4} bgColor="red-500" hover={{ p: 8 }} />);

    const styles = document.getElementById(DEFAULT_STYLE_ELEMENT_ID)?.textContent ?? '';
    const rendered = container.firstElementChild as HTMLElement;

    for (const className of rendered.className.split(' ')) {
      expect(styles).toContain(`.${className}`);
    }
    await unmount();
  });
});
