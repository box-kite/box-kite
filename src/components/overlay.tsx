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
import { supportsPopover } from '../utils/environment/environmentUtils';

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
 * A floating layer: anchored by the browser, and in the browser's **top layer** for the stacking order.
 * `position-area` puts it on the side of its anchor asked for and `position-try-fallbacks` flips it when
 * there is no room, so on the CSS path nothing here runs at all — no measurement, no scroll listener, no
 * state (`useAnchorPosition` measures instead where the browser cannot, and the layer is `position: fixed`
 * either way).
 *
 * The top layer is the answer to the other half of the problem, and **there is no portal**: `position:
 * fixed` escapes every `overflow: hidden` ancestor but neither a *transformed* one nor the page's stacking
 * order, and a layer has to come out on top of both. The layer carries `popover="manual"` and is shown as
 * soon as it mounts — `manual` because this component owns no dismissal, and light dismiss is a pattern:
 * it owns no open state, no ARIA and no focus handling either, and `Tooltip`, `Dropdown` and the DataGrid
 * menu each need a different one. `Popover` is the light-dismissing pattern, on `popover="auto"`.
 *
 * Staying where it was declared is what a portal costs: the layer inherits the theme, the custom
 * properties and the text direction around it, a press inside it is a press inside whatever popover it
 * was declared in (so a dropdown in a `Popover` panel no longer dismisses the panel), and the tab order
 * follows the markup. Where the browser has no Popover API it is portalled instead, which is the old
 * behaviour and all of its compromises. Measured in Chrome 152: the top layer paints over a
 * `z-index: 9999` sibling that covers a plain `position: fixed` control at the same coordinates.
 *
 * **The layer keeps the side it chose when it opened.** Chrome re-evaluates `position-try-fallbacks` on
 * scroll for an ordinary positioned element and *never* for one in the top layer (measured in 152, with
 * hand-written CSS and with the library) — so a layer left open while the page scrolls does not flip when
 * its side runs out of room, and slides past the viewport edge instead. The side is chosen correctly on
 * every open, because a layer that mounts when it opens is laid out for the first time then; it is only a
 * scroll *while* open that this affects. Nothing but leaving and re-entering the top layer re-arms the
 * browser, so a page that scrolls far under an open layer should close it. The portal fallback, which
 * measures, does not have this limitation.
 *
 * @a11y No role, no `aria-*` and no focus handling: whatever renders a layer owns the pattern, and a
 * layer given a role it does not implement is worse than one with none.
 * @a11y The layer stays in the DOM where it was declared, so the order a screen reader reads and the tab
 * order both follow the markup — a layer declared after its trigger is reached by Tab from it. It must
 * therefore not be declared *inside* its trigger: interactive content in a `<button>` is unreachable.
 * @a11y Only on the portal fallback does it leave that subtree, and there it carries the direction it was
 * read in as a `dir` of its own, since a container hanging off the body inherits nothing.
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
  // Decided on the first render rather than corrected in an effect, which is what the other two
  // capability checks in this library do. A layer is a *different position* in the React tree on the two
  // paths — in place, or inside a portal — so flipping the answer afterwards unmounts the layer and mounts
  // a replacement, and anything the caller had focused inside it drops to `<body>` (measured: it is what
  // took the DataGrid column menu's first item away). With no DOM this answers false and the portal
  // branch renders nothing, which is exactly what a server render did before there was a top layer.
  const [topLayer] = useState(supportsPopover);
  const layerElement = useRef<HTMLElement | null>(null);
  const portalContainer = usePortalContainer(!topLayer);

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

  // Into the top layer as soon as it is in the DOM, and no dependencies: the element arrives through a
  // ref rather than state, so this runs on the commit that mounted it instead of a render later — the
  // difference is one frame of a layer sitting in the flow, because every Box declares `display: block`
  // and any author rule outranks the UA's `[popover]:not(:popover-open){display:none}`.
  //
  // Idempotent, so running it on every commit costs a `matches` and nothing else. There is no hide to
  // pair with it: `manual` is never shown or hidden by the browser, and removing the element hides it.
  useIsomorphicLayoutEffect(() => {
    const element = layerElement.current;
    if (!topLayer || !element || !element.isConnected || element.matches(':popover-open')) return;

    element.showPopover();
  });

  // Only the portal needs this: its container is a child of the body, so nothing of the direction the
  // layer was declared in reaches it by inheritance. A top-layer element inherits normally.
  useIsomorphicLayoutEffect(() => {
    if (topLayer) return;

    const element = htmlElementOf(anchor) ?? placeholder;
    setRtl(!!element && isRtl(element));
  }, [anchor, placeholder, topLayer]);

  // Every commit, and reports only a change: the caller's handler is often a literal, and a dependency
  // on it would tell a dropdown which way it opened once per keystroke.
  useIsomorphicLayoutEffect(() => {
    if (reported.current === position.side) return;

    reported.current = position.side;
    onSideChange?.(position.side);
  });

  // Three refs for one element — the hook's, when it has something to measure; this component's, which is
  // what the show effect above needs; and the caller's, which is what a dismissal treats as inside the
  // popup. React writes one ref per element, so this writes all three.
  const hookRef = position.layerProps.ref;
  const layerRef = useCallback(
    (element: HTMLDivElement | null) => {
      hookRef?.(element);
      layerElement.current = element;

      if (typeof ref === 'function') ref(element);
      else if (ref) (ref as { current: HTMLDivElement | null }).current = element;
    },
    [hookRef, ref],
  );

  const layer = (
    <Box
      {...position.layerProps}
      ref={layerRef}
      transition="none"
      // `popover` rather than the React 19 `popoverTarget` family of props, for the reason `Popover`
      // writes its attributes on: CI runs React 18 too, and it drops the ones it does not know.
      props={topLayer ? { popover: 'manual' } : { dir: rtl ? 'rtl' : 'ltr' }}
    >
      <Box ref={contentRef} {...restProps} />
    </Box>
  );

  return (
    <>
      {/* Only when there is nothing else to anchor to — see `anchor`. */}
      {!anchor && <Box ref={setPlaceholder} />}
      {/* In place in the top layer, or through the portal where the browser has no top layer to reach. */}
      {topLayer ? layer : portalContainer && createPortal(layer, portalContainer)}
    </>
  );
}

const Overlay = forwardRef(OverlayImpl);
Overlay.displayName = 'Overlay';

export default Overlay as <TTag extends keyof React.JSX.IntrinsicElements = 'div', TKey extends keyof ComponentsAndVariants = never>(
  props: Omit<BoxProps<TTag, TKey>, 'flip'> & RefAttributes<ExtractElementFromTag<TTag>> & OverlayProps,
) => React.ReactNode;
