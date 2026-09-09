import { CSSProperties, useCallback, useState } from 'react';
import { BoxStyleProps } from '../../types';
import { AnchorAlign, AnchorRect, AnchorSide, Placement, areaFor, fallbacksFor, place, sideOfArea } from '../../utils/anchor/anchorUtils';
import { ElementLike, htmlElementOf, isRtl } from '../../utils/dom/domUtils';
import { useIsomorphicLayoutEffect } from '../effects';
import useIdentifier from '../identity/useIdentifier';

/** The spacing scale is quarters of a rem, and the fallback works in pixels. */
const SPACING_DIVIDER = 4;

const DEFAULT_ROOT_FONT_SIZE = 16;

/** Which margin is the gap: the one on the side facing the anchor. A flip flips it too — measured in Chrome 152. */
const offsetProp: Record<AnchorSide, 'mt' | 'mb' | 'ms' | 'me'> = { top: 'mb', bottom: 'mt', start: 'me', end: 'ms' };

export interface AnchorPositionOptions {
  /** Which side of the anchor to sit on. `top`/`bottom` are the block axis, `start`/`end` the inline one. Default `'bottom'`. */
  side?: AnchorSide;
  /** Which of the anchor's edges to line up with along the other axis. Default `'center'`. */
  align?: AnchorAlign;
  /** The gap between anchor and layer, on the ÷4 spacing scale — `offset: 2` is 8px. Default `0`. */
  offset?: number;
  /**
   * Whether the browser may move the layer where it does not fit: the side swapped for its opposite, the
   * alignment mirrored, or both — three candidates, since a candidate has to fit on both axes. Default `true`.
   */
  flip?: boolean;
  /** Whether the layer is at least as wide as its anchor, the way a select popup is. Default `false`. */
  matchWidth?: boolean;
  /** The anchor's name. Generated per instance when omitted, which is what keeps two layers apart. */
  name?: string;
  /**
   * The anchor as an element rather than props to spread — for a caller handed a trigger it does not
   * render itself. The name is written onto it in a layout effect, so a ref is read when the layer mounts.
   */
  anchor?: ElementLike;
  /**
   * Whether `side` reports where the layer ended up rather than where it was asked to go. Off by default,
   * because on the CSS path it costs the one thing that path otherwise never does: a read after layout.
   */
  trackSide?: boolean;
}

/** The two anchor-positioning properties, which csstype does not know yet. An inline style, deliberately — see the hook. */
type AnchorStyle = CSSProperties & { anchorName?: string; positionAnchor?: string };

/** What goes on the anchor: its name, and — where the browser cannot place the layer — a ref to measure it by. */
export interface AnchorElementProps {
  ref?: (element: HTMLElement | null) => void;
  style: AnchorStyle;
}

/** What goes on the floating layer. The geometry is shared props; only the identity and the fallback's coordinates are inline. */
export interface AnchorLayerProps extends Pick<
  BoxStyleProps,
  'position' | 'positionArea' | 'positionTryFallbacks' | 'minWidth' | 'mt' | 'mb' | 'ms' | 'me'
> {
  ref?: (element: HTMLElement | null) => void;
  style: AnchorStyle;
}

export interface AnchorPosition {
  /** Whether the browser is placing the layer. `false` means this hook measured it instead. */
  css: boolean;
  /** The side the layer is on: the requested one, unless `trackSide` is on and a flip moved it. */
  side: AnchorSide;
  anchorProps: AnchorElementProps;
  layerProps: AnchorLayerProps;
}

/** Whether the browser has CSS anchor positioning. Asked once per mount rather than cached, so a test can answer for it. */
function supportsAnchorPositioning(): boolean {
  return typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && CSS.supports('anchor-name: --a');
}

function rootFontSize(): number {
  const root = typeof document === 'undefined' ? null : document.documentElement;
  const size = root ? parseFloat(getComputedStyle(root).fontSize) : NaN;

  return Number.isFinite(size) && size > 0 ? size : DEFAULT_ROOT_FONT_SIZE;
}

function rectOf(element: Element): AnchorRect {
  const { top, left, width, height } = element.getBoundingClientRect();

  return { top, left, width, height };
}

/** What one pass of the fallback found: where the layer goes, and the width `matchWidth` copies. */
interface Measured extends Placement {
  anchorWidth: number;
}

function same(a: Measured | null, b: Measured): boolean {
  return a !== null && a.top === b.top && a.left === b.left && a.side === b.side && a.anchorWidth === b.anchorWidth;
}

/**
 * A floating layer placed against an anchor — in CSS where the browser has anchor positioning, and by
 * measurement where it does not. Spread `anchorProps` on the trigger and `layerProps` on the layer;
 * nothing else is needed, and on the CSS path nothing runs at all: no scroll listener, no state, no
 * measurement, because `position-area` and `position-try-fallbacks` are the flip a positioning library
 * ships JS for.
 *
 * ```tsx
 * const { anchorProps, layerProps } = useAnchorPosition({ side: 'bottom', offset: 2, matchWidth: true });
 *
 * <Button {...anchorProps} onClick={toggle}>Options</Button>
 * {open && <Box {...layerProps} component="menu">…</Box>}
 * ```
 *
 * Two things worth knowing. The layer is `position: fixed`, so it escapes every `overflow: hidden`
 * ancestor without a portal — but not a *transformed* one, which is a fixed element's containing block in
 * either path, and not the stacking order, which is still the page's. And the anchor's **name is an inline
 * style rather than a prop**: an identity is per-instance, so a class for it would be a rule per instance
 * that is never freed — the same rule that makes a sparkline's `d` an attribute and its stroke a class.
 *
 * @a11y None of it. A layer is not a pattern: the role, the dismissal and the focus belong to whatever
 * renders one — `useDismiss` and `useFocusReturn` from `@box-kite/react/a11y` are the other half.
 */
export default function useAnchorPosition(options: AnchorPositionOptions = {}): AnchorPosition {
  const { side = 'bottom', align = 'center', offset = 0, flip = true, matchWidth = false, name, anchor, trackSide = false } = options;

  const generated = useIdentifier('anchor');
  const anchorName = `--${(name ?? generated).replace(/^--/, '')}`;

  // Starts as the CSS path so a server render and the first client render agree; a browser without
  // anchor positioning says so before it paints.
  const [css, setCss] = useState(true);
  const [spreadAnchor, setSpreadAnchor] = useState<HTMLElement | null>(null);
  const [layerElement, setLayerElement] = useState<HTMLElement | null>(null);
  const [measured, setMeasured] = useState<Measured | null>(null);
  const [usedSide, setUsedSide] = useState<AnchorSide | null>(null);

  useIsomorphicLayoutEffect(() => {
    if (!supportsAnchorPositioning()) setCss(false);
  }, []);

  // An anchor handed to the hook rather than one it hands props to: the name still has to reach the
  // element, and an element somebody else rendered can only be written to in an effect.
  useIsomorphicLayoutEffect(() => {
    const element = htmlElementOf(anchor);
    if (!element) return;

    element.style.setProperty('anchor-name', anchorName);

    return () => {
      element.style.removeProperty('anchor-name');
    };
  }, [anchor, anchorName]);

  // Which side the browser settled on, read off the *used* `position-area` (see `sideOfArea`, which is
  // where the shape of that value is written down). Once per layout, because a flip is sticky.
  useIsomorphicLayoutEffect(() => {
    if (!css || !trackSide || !layerElement) return;

    setUsedSide(sideOfArea(getComputedStyle(layerElement).getPropertyValue('position-area')));
  }, [css, trackSide, layerElement, side, align, flip]);

  useIsomorphicLayoutEffect(() => {
    // Resolved here rather than during render: `anchor` may be a ref, and a ref read in a render is
    // both a lint error and a staleness bug — the element it points at attaches after that render.
    const anchorElement = htmlElementOf(anchor) ?? spreadAnchor;
    if (css || !anchorElement || !layerElement) return;

    const measure = () => {
      const anchorRect = rectOf(anchorElement);
      const layer = rectOf(layerElement);
      const viewport = { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight };
      const width = matchWidth ? Math.max(layer.width, anchorRect.width) : layer.width;
      const placement = place(anchorRect, { ...layer, width }, viewport, {
        side,
        align,
        offset: (offset / SPACING_DIVIDER) * rootFontSize(),
        flip,
        rtl: isRtl(anchorElement),
      });

      const next = { ...placement, anchorWidth: anchorRect.width };
      setMeasured((previous) => (same(previous, next) ? previous : next));
    };

    measure();

    // Capture phase: the anchor moves when *any* ancestor scrolls, and a scroll event does not bubble.
    const controller = new AbortController();
    document.addEventListener('scroll', measure, { signal: controller.signal, capture: true, passive: true });
    window.addEventListener('resize', measure, { signal: controller.signal, passive: true });

    return () => controller.abort();
  }, [css, anchor, spreadAnchor, layerElement, side, align, offset, flip, matchWidth]);

  const anchorRef = useCallback((element: HTMLElement | null) => setSpreadAnchor(element), []);
  const layerRef = useCallback((element: HTMLElement | null) => setLayerElement(element), []);

  // The name goes on the anchor either way: a property the browser does not know costs nothing in an
  // inline style, and emitting it in both paths is what keeps a hydrated anchor from mismatching.
  const anchorProps: AnchorElementProps = { ref: css ? undefined : anchorRef, style: { anchorName } };

  if (css) {
    return {
      css,
      // Whatever the browser settled on, or the requested side while nobody has asked which it was.
      side: usedSide ?? side,
      anchorProps,
      layerProps: {
        // Nothing to measure the layer for unless the used side is being read off it.
        ...(trackSide ? { ref: layerRef } : {}),
        position: 'fixed',
        positionArea: areaFor(side, align),
        ...(flip ? { positionTryFallbacks: fallbacksFor(side) } : {}),
        ...(matchWidth ? { minWidth: 'anchor-size(width)' as const } : {}),
        ...(offset ? { [offsetProp[side]]: offset } : {}),
        style: { positionAnchor: anchorName },
      },
    };
  }

  return {
    css,
    // The fallback flips in the model, so its side costs nothing and needs no `trackSide`.
    side: measured?.side ?? side,
    anchorProps,
    layerProps: {
      ref: layerRef,
      position: 'fixed',
      style: measured
        ? {
            top: `${measured.top}px`,
            left: `${measured.left}px`,
            ...(matchWidth ? { minWidth: `${measured.anchorWidth}px` } : {}),
          }
        : // Nothing to place it by yet. The measurement lands in a layout effect, so this never paints.
          { top: 0, left: 0, visibility: 'hidden' },
    },
  };
}
