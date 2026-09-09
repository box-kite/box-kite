import { cleanup, render, renderHook, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import useAnchorPosition, { AnchorPositionOptions } from './useAnchorPosition';

/** The support check is asked once per mount, so a test can answer for the browser. */
function withAnchorSupport(supported: boolean) {
  vi.stubGlobal('CSS', { supports: (value: string) => supported && value.startsWith('anchor-name') });
}

describe('useAnchorPosition', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  const positionOf = (options: AnchorPositionOptions = {}) => renderHook(() => useAnchorPosition(options)).result.current;

  describe('where the browser has anchor positioning', () => {
    it('places the layer with props and nothing else — no ref, no measurement', () => {
      withAnchorSupport(true);

      const { css, anchorProps, layerProps } = positionOf({ side: 'bottom', align: 'start', offset: 2, matchWidth: true });

      expect(css).toBe(true);
      expect(anchorProps.ref).toBeUndefined();
      expect(layerProps.ref).toBeUndefined();
      expect(layerProps).toMatchObject({
        position: 'fixed',
        positionArea: 'block-end span-inline-end',
        positionTryFallbacks: 'flip-block',
        minWidth: 'anchor-size(width)',
        mt: 2,
      });
    });

    it('puts the gap on the side facing the anchor, which is the margin a flip flips too', () => {
      withAnchorSupport(true);

      expect(positionOf({ side: 'top', offset: 3 }).layerProps).toMatchObject({ mb: 3 });
      expect(positionOf({ side: 'end', offset: 3 }).layerProps).toMatchObject({ ms: 3 });
      expect(positionOf({ side: 'start', offset: 3 }).layerProps).toMatchObject({ me: 3 });
    });

    it('names the anchor in an inline style, since an identity is per instance rather than shared', () => {
      withAnchorSupport(true);

      const { anchorProps, layerProps } = positionOf({ name: 'menu' });

      expect(anchorProps.style).toEqual({ anchorName: '--menu' });
      expect(layerProps.style).toEqual({ positionAnchor: '--menu' });
    });

    it('takes a name written either way, and generates one per instance when given none', () => {
      withAnchorSupport(true);

      expect(positionOf({ name: '--menu' }).anchorProps.style.anchorName).toBe('--menu');

      const first = positionOf().anchorProps.style.anchorName;
      const second = positionOf().anchorProps.style.anchorName;

      expect(first).toMatch(/^--anchor-/);
      expect(second).not.toBe(first);
    });

    it('leaves out what was not asked for, so an unflipped layer carries no fallback list', () => {
      withAnchorSupport(true);

      const { layerProps } = positionOf({ flip: false });

      expect(layerProps.positionTryFallbacks).toBeUndefined();
      expect(layerProps.minWidth).toBeUndefined();
      expect(layerProps.mt).toBeUndefined();
    });
  });

  describe('where it does not', () => {
    function Layer(props: AnchorPositionOptions) {
      const { css, anchorProps, layerProps } = useAnchorPosition(props);

      return (
        <>
          <button {...anchorProps} data-testid="anchor">
            Open
          </button>
          <div {...layerProps} data-testid="layer" data-css={String(css)}>
            Layer
          </div>
        </>
      );
    }

    /** happy-dom lays nothing out, so the two rects are the fixture — the flip and the shift are arithmetic. */
    function stubRects(anchor: DOMRect, layer: DOMRect) {
      vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
        return this.getAttribute('data-testid') === 'anchor' ? anchor : layer;
      });
    }

    const rect = (top: number, left: number, width: number, height: number) => ({ top, left, width, height }) as DOMRect;

    it('measures the layer into place instead, and says so', () => {
      withAnchorSupport(false);
      stubRects(rect(300, 400, 80, 30), rect(0, 0, 120, 40));

      render(<Layer offset={2} />);

      const layer = screen.getByTestId('layer');

      expect(layer.dataset.css).toBe('false');
      // Below the anchor by the ÷4 offset (8px at the default root font size), centred on it.
      expect(layer.style.top).toBe('338px');
      expect(layer.style.left).toBe('380px');
    });

    it('flips when the requested side has no room, the way `position-try-fallbacks` would have', () => {
      withAnchorSupport(false);
      stubRects(rect(740, 400, 80, 30), rect(0, 0, 120, 40));

      render(<Layer />);

      // The viewport is 768 tall here, so `bottom` cannot hold a 40px layer and `top` can.
      expect(screen.getByTestId('layer').style.top).toBe('700px');
    });

    it('copies the anchor’s width when asked, since `anchor-size()` is not available either', () => {
      withAnchorSupport(false);
      stubRects(rect(300, 400, 80, 30), rect(0, 0, 40, 40));

      render(<Layer matchWidth />);

      expect(screen.getByTestId('layer').style.minWidth).toBe('80px');
    });
  });
});
