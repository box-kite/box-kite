import { RefCallback, useCallback, useMemo, useRef, useState } from 'react';
import AnimationUtils from '../../utils/animation/animationUtils';
import { useIsomorphicLayoutEffect } from '../effects';

/** The Radix / Base UI attribute value, so a `[data-state]` selector written for either works here too. */
export type PresenceState = 'open' | 'closed';

/** Where the subtree is in its own lifetime. `leaving` is the whole of the exit; `closed` is gone. */
export type ExitPhase = 'open' | 'leaving' | 'closed';

export interface PresenceOptions {
  /** Whether the subtree should be there. The exit starts the moment this goes false. */
  present: boolean;
}

export interface Presence {
  /** Whether to render anything at all: true for the whole exit, false once it has finished. */
  mounted: boolean;
  /** False from the first frame of the exit — the flag the leaving styles hang off. */
  present: boolean;
  state: PresenceState;
  /** Goes on the element that carries the transition: its computed style is what the wait is measured from. */
  ref: RefCallback<HTMLElement>;
  /** `{ 'data-state': … }`, ready to spread into a Box's `props`. */
  props: { 'data-state': PresenceState };
}

/**
 * Holds a subtree long enough for its exit to run, then lets it go. React removes a node the instant it
 * stops rendering it, which is why `startingStyle` can animate an entrance with no JavaScript and nothing
 * can animate an exit: by the time the styles would change, the element is already gone.
 *
 * **The wait is the duration the element's own CSS declares**, read off the node the moment the exit
 * starts. `transitionend` would be more precise but fires once per property with no way to know how many
 * are coming, so the first one cuts a two-property exit short — and a transition that never starts fires
 * nothing at all, so an event-driven wait needs this timer as a backstop anyway. One mechanism, sized from
 * the real CSS: a zero duration (nothing declared, or `prefers-reduced-motion`) unmounts in the same commit.
 */
export default function usePresence(options: PresenceOptions): Presence {
  const nodeRef = useRef<HTMLElement | null>(null);

  const ref = useCallback<RefCallback<HTMLElement>>((node) => {
    nodeRef.current = node;
  }, []);

  const readNode = useCallback(() => nodeRef.current, []);
  const current = useExitPhase(options.present, readNode);

  return useMemo(() => {
    const state: PresenceState = current === 'open' ? 'open' : 'closed';

    return { mounted: current !== 'closed', present: current === 'open', state, ref, props: { 'data-state': state } };
  }, [current, ref]);
}

/** The phase machine behind `usePresence`, for any element whose exit is its own CSS. `readNode` is called as the exit starts. */
export function useExitPhase(present: boolean, readNode: () => HTMLElement | null): ExitPhase {
  const [phase, setPhase] = useState<ExitPhase>(present ? 'open' : 'closed');

  // Derived during render rather than in an effect: an effect would let the browser paint one frame of
  // the leaving element with its open styles still on, so every exit would start a frame late.
  const current: ExitPhase = present ? 'open' : phase === 'closed' ? 'closed' : 'leaving';
  if (current !== phase) setPhase(current);

  useIsomorphicLayoutEffect(() => {
    if (current !== 'leaving') return;

    const node = readNode();
    // No element, or an element whose CSS declares no exit: there is nothing to wait for.
    const duration = node ? AnimationUtils.activeDuration(getComputedStyle(node)) : 0;

    if (duration <= 0) {
      setPhase('closed');
      return;
    }

    const timer = setTimeout(() => setPhase('closed'), duration + AnimationUtils.SETTLE_FRAME);
    return () => clearTimeout(timer);
  }, [current, readNode]);

  return current;
}
