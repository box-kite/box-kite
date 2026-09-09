import { forwardRef, Ref, RefAttributes, useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Box, { BoxProps } from '../box';
import useAnchorPosition from '../react/anchor/useAnchorPosition';
import { useIsomorphicLayoutEffect } from '../react/effects';
import usePortalContainer from '../react/hooks/usePortalContainer';
import { ExtractElementFromTag } from '../react/reactTypes';
import { ComponentsAndVariants } from '../types';
import { AnchorAlign, AnchorSide } from '../utils/anchor/anchorUtils';
import { ElementLike, htmlElementOf, isRtl } from '../utils/dom/domUtils';

interface OverlayProps {
  /**
   * Which side of the anchor the layer sits on: `top`/`bottom` are the block axis, `start`/`end` the
   * inline one, so a layer beside its anchor mirrors in a right-to-left page. Default `'bottom'`.
   */
  side?: AnchorSide;
  /** Which of the anchor's edges to line up with along the other axis. Default `'center'`. */
  align?: AnchorAlign;
  /** The gap between anchor and layer, on the ÷4 spacing scale — `offset={2}` is 8px. Default `0`. */
  offset?: number;
  /**
   * Whether a side with no room may be swapped for its opposite. Default `true`. It shadows the CSS prop
   * of that name — a mirrored layer is a rarity, and one placement vocabulary across the hook, this and
   * `Tooltip` is worth more than the transform, which a child of the layer can still take.
   */
  flip?: boolean;
  /**
   * Fires with the side the layer ended up on, which is the requested one unless a flip moved it — what
   * a popup that grows away from its trigger needs to know to animate the right way. Asking for it is
   * what turns on the one read the CSS path otherwise never does, so leave it out when nothing uses it.
   */
  onSideChange?(side: AnchorSide): void;
  /**
   * Anchor to this element rather than to the spot the layer was declared in. A trigger is almost always
   * the right answer: the placeholder is a real box with no size, so `align` and `matchWidth` have
   * nothing to work from, and inside a flex row it becomes a flex item of its own.
   */
  anchor?: ElementLike;
  /**
   * The content Box, which is the one that animates. `ref` is the anchored layer, which transitions
   * nothing on purpose — so a `<Presence>` measuring an exit has to reach past it.
   */
  contentRef?: Ref<HTMLDivElement>;
  /**
   * Whether the layer is at least as wide as its anchor. Default true, so a dropdown popup lines up with
   * its trigger; a tooltip sizes to its own content and turns it off.
   */
  matchWidth?: boolean;
}

type Props = OverlayProps & Omit<BoxProps, 'flip'>;

/**
 * A floating layer: anchored by the browser, portalled for the stacking order. `position-area` puts it on
 * the side of its anchor asked for and `position-try-fallbacks` flips it when there is no room, so on the
 * CSS path nothing here runs at all — no measurement, no scroll listener, no state (`useAnchorPosition`
 * measures instead where the browser cannot, and the layer is `position: fixed` either way).
 *
 * The portal is still the answer to the other half of the problem: `position: fixed` escapes every
 * `overflow: hidden` ancestor but neither a *transformed* one nor the page's stacking order, and a layer
 * has to come out on top of both. It owns no open state, no ARIA and no dismissal — a layer is not a
 * pattern, and `Tooltip`, `Dropdown` and the DataGrid menu each need a different one.
 *
 * @a11y No role, no `aria-*` and no focus handling: whatever renders a layer owns the pattern, and a
 * layer given a role it does not implement is worse than one with none.
 * @a11y The layer is portalled out of the subtree it was declared in, so it carries the direction it was
 * read in as a `dir` of its own — a container hanging off the body inherits nothing.
 * @a11y It renders where it is declared in the React tree, so the DOM order a screen reader reads and
 * the tab order both follow the markup rather than the portal.
 */
function OverlayImpl(props: Props, ref: Ref<HTMLDivElement>) {
  const {
    side = 'bottom',
    align = 'center',
    offset = 0,
    flip = true,
    onSideChange,
    anchor,
    contentRef,
    matchWidth = true,
    ...restProps
  } = props;

  const [placeholder, setPlaceholder] = useState<HTMLElement | null>(null);
  const [rtl, setRtl] = useState(false);
  const reported = useRef<AnchorSide | null>(null);
  const portalContainer = usePortalContainer();

  const position = useAnchorPosition({
    side,
    align,
    offset,
    flip,
    matchWidth,
    // Whatever there is to anchor to: the element the caller named, or the spot the layer was declared in.
    anchor: anchor ?? placeholder,
    trackSide: !!onSideChange,
  });

  // The portal container is a child of the body, so nothing of the direction the layer was declared in
  // reaches it by inheritance — it is read off the anchor here and written back on as `dir`.
  useIsomorphicLayoutEffect(() => {
    const element = htmlElementOf(anchor) ?? placeholder;
    setRtl(!!element && isRtl(element));
  }, [anchor, placeholder]);

  // Every commit, and reports only a change: the caller's handler is often a literal, and a dependency
  // on it would tell a dropdown which way it opened once per keystroke.
  useIsomorphicLayoutEffect(() => {
    if (reported.current === position.side) return;

    reported.current = position.side;
    onSideChange?.(position.side);
  });

  // Two refs for one element — the hook's, when it has something to measure, and the caller's, which is
  // what a dismissal treats as inside the popup. React writes one ref per element, so this writes both.
  const hookRef = position.layerProps.ref;
  const layerRef = useCallback(
    (element: HTMLDivElement | null) => {
      hookRef?.(element);

      if (typeof ref === 'function') ref(element);
      else if (ref) (ref as { current: HTMLDivElement | null }).current = element;
    },
    [hookRef, ref],
  );

  return (
    <>
      {/* Only when there is nothing else to anchor to — see `anchor`. */}
      {!anchor && <Box ref={setPlaceholder} />}
      {portalContainer &&
        createPortal(
          <Box {...position.layerProps} ref={layerRef} transition="none" props={{ dir: rtl ? 'rtl' : 'ltr' }}>
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
  props: Omit<BoxProps<TTag, TKey>, 'flip'> & RefAttributes<ExtractElementFromTag<TTag>> & OverlayProps,
) => React.ReactNode;
