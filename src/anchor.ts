/**
 * `@box-kite/react/anchor` — where a floating layer goes. One hook: it hands the trigger a name and the
 * layer the props that place it against that name, which on a browser with CSS anchor positioning is the
 * whole of it — no measuring, no scroll listener, no state. Where the browser has none it measures instead,
 * and the flip and the shift are the same model worked out by hand.
 *
 * Its own entry rather than a corner of `/a11y`, because positioning is not an accessibility mechanic: a
 * consumer wanting `useDismiss` should not carry the placement model, or the other way round. A client
 * hook, so the entry carries a `'use client'` banner — a layer that needs no JS at all is `positionArea`
 * and the props beside it, which any Box takes.
 */
export { default as useAnchorPosition } from './react/anchor/useAnchorPosition';
export type { AnchorElementProps, AnchorLayerProps, AnchorPosition, AnchorPositionOptions } from './react/anchor/useAnchorPosition';

export type { AnchorAlign, AnchorSide } from './utils/anchor/anchorUtils';
