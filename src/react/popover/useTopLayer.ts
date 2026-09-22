import { useSyncExternalStore } from 'react';
import { supportsPopover } from '../../utils/environment/environmentUtils';

/** Nothing ever changes the answer — a browser either has the API or it does not — so nothing subscribes. */
const subscribe = () => () => {};

/** What a server emits: the shape every browser that has the API will hydrate into. */
const serverSnapshot = () => true;

/**
 * Whether a floating layer goes in the top layer or in a portal — and, which is the point of reading it
 * through a store, *when* that is decided. Asking the browser directly during a server render answers
 * false (there is no `HTMLElement`), so the portal branch is taken and renders nothing, while the client
 * renders the layer: one React #418 per load for any layer that is open in server-rendered HTML (bug
 * #197). The server snapshot is therefore the top-layer shape.
 *
 * React reads that snapshot only while hydrating, so the two paths — which are different *positions* in
 * the React tree, and so a remount — cost one correction on exactly one path: a browser with no Popover
 * API adopting HTML that already holds the layer, where nothing can have been focused inside it yet. A
 * layer a browser mounts (a dropdown opening) reads the real answer on its first render and never moves,
 * which is what B2 stage 2 fixed and what a `useState(true)` corrected in an effect gives up.
 *
 * The consequence for a caller: while hydrating, this says `true` in a browser that has no `showPopover`
 * to call, so an effect that calls one asks `supportsPopover()` rather than trusting this.
 */
export default function useTopLayer(): boolean {
  return useSyncExternalStore(subscribe, supportsPopover, serverSnapshot);
}
