import { forwardRef, Ref, RefAttributes, useCallback, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Box, { BoxProps } from '../box';
import usePortalContainer from '../react/hooks/usePortalContainer';
import { ExtractElementFromTag } from '../react/reactTypes';
import { ComponentsAndVariants } from '../types';
import { ElementLike, htmlElementOf, isRtl } from '../utils/dom/domUtils';

const positionDigitsAfterComma = 2;

interface OverlayProps {
  /** Fires whenever the layer is repositioned, with the page coordinates it was moved to. */
  onPositionChange?(position: { top: number; left: number; windowScrollX: number; windowScrollY: number }): void;
  /** Nudge the layer along the inline axis, as a CSS length. */
  adjustTranslateX?: string;
  /** Nudge the layer along the block axis, as a CSS length. */
  adjustTranslateY?: string;
  /**
   * Measure this element instead of the layer's own placeholder — right when the layer belongs to an element
   * next to it rather than to the spot it was declared in. The placeholder is a real box: inside a flex row
   * it becomes a flex item, so opening the layer shifts everything after it by one `gap`.
   */
  anchor?: ElementLike;
  /** Which edge of the anchor the layer starts from. Default `'top'`. */
  anchorSide?: 'top' | 'bottom';
  /**
   * The content Box, which is the one that animates. `ref` is the positioning wrapper, whose transform
   * follows the anchor and which therefore transitions nothing on purpose — so a `<Presence>` measuring
   * an exit has to reach past it.
   */
  contentRef?: Ref<HTMLDivElement>;
  /**
   * Whether the layer takes the measured width of the anchor. Default true, so a dropdown popup
   * lines up with its trigger; a tooltip sizes to its own content and turns it off.
   */
  matchWidth?: boolean;
}

type Props = OverlayProps & BoxProps;

/**
 * A floating layer, rendered into the portal container at the place it is declared: it measures where it
 * sits, then renders its children into `#box-kite-portal` translated to that spot, so they escape
 * `overflow: hidden` and every clipped ancestor. It owns no open state, no ARIA and no dismissal — a
 * layer is not a pattern, and `Tooltip`, `Dropdown` and the DataGrid menu each need a different one.
 * (This was called `Tooltip` until A3, which is the one thing it is not.)
 *
 * @a11y No role, no `aria-*` and no focus handling: whatever renders a layer owns the pattern, and a
 * layer given a role it does not implement is worse than one with none.
 * @a11y The layer is portalled out of the subtree it was declared in, so it carries the direction it was
 * measured in as a `dir` of its own — a container hanging off the body inherits nothing.
 * @a11y It renders where it is declared in the React tree, so the DOM order a screen reader reads and
 * the tab order both follow the markup rather than the portal.
 */
function OverlayImpl(props: Props, ref: Ref<HTMLDivElement>) {
  const {
    onPositionChange,
    adjustTranslateX = '0px',
    adjustTranslateY = '0px',
    anchor,
    anchorSide = 'top',
    contentRef,
    matchWidth = true,
    ...restProps
  } = props;

  const positionRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<
    { top: number; left: number; width?: number; windowScrollX: number; windowScrollY: number; rtl: boolean } | undefined
  >();
  const portalContainer = usePortalContainer();

  const observeScroll = useCallback((element: HTMLElement, callback: (el: HTMLElement) => void) => {
    const listener = (e: Event) => {
      if ((e.target as HTMLElement).contains(element)) {
        callback(element);
      }
    };

    const controller = new AbortController();
    document.addEventListener('scroll', listener, { signal: controller.signal, capture: true });
    return () => controller.abort();
  }, []);

  const observeResize = useCallback((element: HTMLElement, callback: (el: HTMLElement) => void) => {
    const listener = (_e: Event) => {
      callback(element);
    };

    const controller = new AbortController();
    window.addEventListener('resize', listener, { signal: controller.signal, capture: true });
    return () => controller.abort();
  }, []);

  const positionHandler = useCallback(
    (el: HTMLElement) => {
      const rect = el.getBoundingClientRect();

      const edge = anchorSide === 'bottom' ? rect.bottom : rect.top;
      const top = Math.round((edge + window.scrollY) * positionDigitsAfterComma) / positionDigitsAfterComma;
      const left = Math.round((rect.left + window.scrollX) * positionDigitsAfterComma) / positionDigitsAfterComma;
      const windowScrollX = window.scrollX;
      const windowScrollY = window.scrollY;
      // The portal container is a child of the body, so nothing of the direction the layer was
      // declared in reaches it by inheritance — it is measured here and written back on as `dir`.
      const rtl = isRtl(el);

      if (
        position?.top !== top ||
        position?.left !== left ||
        position?.windowScrollX !== windowScrollX ||
        position?.windowScrollY !== windowScrollY ||
        position?.rtl !== rtl
      ) {
        onPositionChange?.({ top, left, windowScrollX, windowScrollY });
        setPosition({ top, left, width: rect.width > 0 ? rect.width : undefined, windowScrollX, windowScrollY, rtl });
      }
    },
    [anchorSide, position, onPositionChange],
  );

  useLayoutEffect(() => {
    const element = htmlElementOf(anchor) ?? positionRef.current;

    if (element) {
      positionHandler(element);
      const scrollHandlerDispose = observeScroll(element, positionHandler);
      const resizeHandlerDispose = observeResize(element, positionHandler);

      return () => {
        scrollHandlerDispose();
        resizeHandlerDispose();
      };
    }
  }, [anchor, positionHandler, observeScroll, observeResize]);

  return (
    <>
      {/* Only when there is nothing else to measure — see `anchor`. */}
      {!anchor && <Box ref={positionRef} />}
      {position &&
        portalContainer &&
        createPortal(
          <Box
            ref={ref}
            position="absolute"
            top={0}
            // Physical on purpose: the transform below is in page coordinates, so the box it moves
            // from has to be the page's own origin in both directions.
            left={0}
            transition="none"
            props={{ dir: position.rtl ? 'rtl' : 'ltr' }}
            style={{
              transform: `translate3d(calc(${position.left}px + ${adjustTranslateX}),calc(${position.top}px + ${adjustTranslateY}), 0)`,
              willChange: 'transform',
              width: matchWidth ? position.width : undefined,
            }}
          >
            <Box ref={contentRef} {...restProps} />
          </Box>,
          portalContainer,
        )}
    </>
  );
}

const Overlay = forwardRef(OverlayImpl);
Overlay.displayName = 'Overlay';

export default Overlay as <TTag extends keyof React.JSX.IntrinsicElements = 'div', TKey extends keyof ComponentsAndVariants = never>(
  props: BoxProps<TTag, TKey> & RefAttributes<ExtractElementFromTag<TTag>> & OverlayProps,
) => React.ReactNode;
