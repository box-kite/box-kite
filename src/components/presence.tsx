import { FunctionComponent } from 'react';
import usePresence, { Presence as PresenceHandle } from '../react/animation/usePresence';

interface Props {
  /** Whether the child should be there. The exit starts the moment this goes false. */
  present: boolean;
  /** The subtree, told which way it is going. */
  children: (presence: PresenceHandle) => React.ReactNode;
}

/**
 * The exit half of the animation story: it keeps rendering its child with `present: false` until the
 * child's own CSS says its transition is over, and only then lets React remove it. `startingStyle` is the
 * entrance and needs no JavaScript at all — this is the ~1 KB the other direction costs, because React
 * unmounts synchronously and there is nothing left to transition.
 *
 * ```tsx
 * <Presence present={open}>
 *   {({ present, ref, props }) => (
 *     <Box ref={ref} props={props} opacity={present ? 1 : 0} startingStyle={{ opacity: 0 }} transitionDuration={200} />
 *   )}
 * </Presence>
 * ```
 *
 * A render prop rather than a cloned child, for the same reason `Tooltip`'s trigger is one: the child has
 * to be told which way it is going, and cloning would have to guess where a `data-state` belongs — a Box
 * takes DOM attributes in a `props` bag, a plain element takes them on top. The `ref` is not decoration
 * either: whichever element it lands on is the one whose computed style the wait is measured from, so it
 * belongs on the element that carries the transition.
 *
 * @a11y The exit is measured from the element's own `transition-duration`/`animation-duration`, so
 * `prefers-reduced-motion` — which zeroes `--transitionTime` — removes the node in the same commit
 * with no opt-in.
 * @a11y `data-state` is `'open'` or `'closed'` on the child, which is what a CSS exit selects on. A
 * node on its way out is still in the accessibility tree, so anything hiding it has to say so itself.
 */
function Presence(props: Props) {
  const presence = usePresence({ present: props.present });

  return <>{presence.mounted ? props.children(presence) : null}</>;
}

(Presence as FunctionComponent).displayName = 'Presence';

export default Presence;
export type { Presence as PresenceHandle, PresenceState } from '../react/animation/usePresence';
