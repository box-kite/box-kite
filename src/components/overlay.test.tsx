import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ignoreLogs, installPopoverApi } from '../../dev/tests';
import Overlay from './overlay';

/**
 * The positioning primitive on its own — what `Tooltip`, `Dropdown` and the DataGrid menu all stand on.
 * Two independent choices, tested apart: *where* the layer goes (the top layer since B2 stage 2, a portal
 * where the browser has no Popover API) and *how* it is placed (the browser's anchor positioning, or the
 * coordinates the hook measured).
 *
 * The test environment implements no Popover API, so the default here is the portal — which is why the
 * whole suite kept passing through the migration and proves nothing about the top layer on its own.
 * `installPopoverApi` puts the contract back for the tests that are about what the component says to the
 * browser; what the platform itself does is verified in Chrome.
 */
describe('Overlay', () => {
  ignoreLogs();

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const portal = () => document.getElementById('box-kite-portal');
  const layer = () => screen.getByText('anywhere').parentElement!;
  // React writes a camelCase style property by assigning it, and jsdom knows no `position-anchor` to
  // assign to — so the property it set is where the value is, rather than the style attribute.
  const positionAnchor = () => (layer().style as unknown as Record<string, string>).positionAnchor;

  /** The support check is asked once per mount, so a test can answer for the browser. */
  function withAnchorSupport(supported: boolean) {
    vi.stubGlobal('CSS', { supports: (value: string) => supported && value.startsWith('anchor-name') });
  }

  /** A rect for the anchor and nothing for the layer, which is what jsdom would answer anyway. */
  function withRects(anchor: Partial<DOMRect>) {
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
      return (portal()?.contains(this) ? { top: 0, left: 0, width: 100, height: 40 } : { top: 0, left: 0, ...anchor }) as DOMRect;
    });
  }

  describe('where the browser has the Popover API', () => {
    let uninstall: () => void;

    // Installed before the render, since the path is decided on the first one — a layer is a different
    // position in the React tree on each, so nothing may move it afterwards.
    const withPopoverApi = () => {
      uninstall = installPopoverApi();
    };

    afterEach(() => uninstall?.());

    it('leaves the layer where it was declared and puts it in the top layer instead of a portal', () => {
      withPopoverApi();

      const { container } = render(<Overlay anchor={document.createElement('div')}>anywhere</Overlay>);

      const content = screen.getByText('anywhere');
      expect(container).toContainElement(content);
      expect(portal()).toBeNull();
    });

    it('shows the layer as `popover="manual"` — a layer owns no dismissal, and light dismiss is one', () => {
      withPopoverApi();

      render(<Overlay anchor={document.createElement('div')}>anywhere</Overlay>);

      expect(layer()).toHaveAttribute('popover', 'manual');
      expect(layer().matches(':popover-open')).toBe(true);
    });

    it('writes no direction of its own: a top-layer element inherits the one around it', () => {
      withPopoverApi();
      vi.spyOn(window, 'getComputedStyle').mockReturnValue({ direction: 'rtl', fontSize: '16px' } as CSSStyleDeclaration);

      render(<Overlay anchor={document.createElement('div')}>anywhere</Overlay>);

      expect(layer()).not.toHaveAttribute('dir');
    });
  });

  it('renders its children into the portal container, not where it was declared', () => {
    const { container } = render(<Overlay>anywhere</Overlay>);

    const content = screen.getByText('anywhere');
    expect(portal()).toContainElement(content);
    expect(container).not.toContainElement(content);
  });

  it('carries no ARIA of its own — the pattern belongs to whatever is rendered into it', () => {
    render(<Overlay>anywhere</Overlay>);

    expect(screen.getByText('anywhere').closest('[role]')).toBeNull();
  });

  it('carries the direction it was declared in across the portal, since the container inherits none', () => {
    const anchor = document.createElement('div');
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({ direction: 'rtl', fontSize: '16px' } as CSSStyleDeclaration);

    render(<Overlay anchor={anchor}>anywhere</Overlay>);

    expect(layer()).toHaveAttribute('dir', 'rtl');
  });

  describe('where the browser has anchor positioning', () => {
    it('names the anchor and points the layer at it, and measures nothing', () => {
      withAnchorSupport(true);
      const rect = vi.spyOn(Element.prototype, 'getBoundingClientRect');

      const { container } = render(<Overlay>anywhere</Overlay>);

      // The placeholder is the anchor when there is nothing else: it carries the name the layer names.
      const name = (container.firstElementChild as HTMLElement).style.getPropertyValue('anchor-name');
      expect(name).toMatch(/^--/);
      expect(positionAnchor()).toBe(name);
      expect(layer().style.top).toBe('');
      expect(rect).not.toHaveBeenCalled();
    });

    it('writes the name onto the anchor it is given rather than rendering a placeholder', () => {
      withAnchorSupport(true);
      const anchor = document.createElement('div');

      const { container, unmount } = render(<Overlay anchor={anchor}>anywhere</Overlay>);

      // Nothing at all in the caller's layout — the placeholder is what makes an anchored layer
      // shift the row it was declared in.
      expect(container.childElementCount).toBe(0);
      expect(anchor.style.getPropertyValue('anchor-name')).toBe(positionAnchor());

      // The name is the layer's, so it leaves with it: an anchor still named after an unmounted
      // layer is one another layer can flip to.
      unmount();
      expect(anchor.style.getPropertyValue('anchor-name')).toBe('');
    });
  });

  describe('where it has none', () => {
    it('places the layer at the coordinates it measured', () => {
      withAnchorSupport(false);
      withRects({ top: 10, left: 5, width: 90, height: 24 });

      render(<Overlay anchor={document.createElement('div')}>anywhere</Overlay>);

      // Under the anchor by default: its own bottom edge, in viewport coordinates, `position: fixed`.
      expect(layer().style.top).toBe('34px');
      expect(layer().style.left).toBe('0px');
    });

    it('takes the width of the anchor by default, and leaves it alone when asked not to', () => {
      withAnchorSupport(false);
      withRects({ top: 0, left: 0, width: 200, height: 20 });

      const { rerender } = render(<Overlay anchor={document.createElement('div')}>anywhere</Overlay>);
      expect(layer().style.minWidth).toBe('200px');

      rerender(
        <Overlay anchor={document.createElement('div')} matchWidth={false}>
          anywhere
        </Overlay>,
      );
      expect(layer().style.minWidth).toBe('');
    });

    it('reports the side it settled on, so a popup knows which way it grew', () => {
      withAnchorSupport(false);
      // No room under an anchor at the bottom of the viewport (768px in jsdom), and plenty above it.
      withRects({ top: 740, left: 0, width: 90, height: 24 });
      const onSideChange = vi.fn();

      render(
        <Overlay anchor={document.createElement('div')} onSideChange={onSideChange}>
          anywhere
        </Overlay>,
      );

      expect(onSideChange).toHaveBeenLastCalledWith('top');
    });
  });
});
