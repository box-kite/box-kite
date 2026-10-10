import { ReactNode } from 'react';
import Box from '../../src/box';
import { useIsRealMount } from '../app/hydration';

// Keyframes rather than `startingStyle`: a theme change pauses every transition, and the theme toggle swaps its icon then.
Box.keyframes({
  'icon-swap-turn': { from: { opacity: 0, rotate: -90 }, to: { opacity: 1, rotate: 0 } },
  'icon-swap-grow': { from: { opacity: 0, scale: 0.8 }, to: { opacity: 1, scale: 1 } },
});

interface Props {
  children: ReactNode;
  /** How the arriving icon comes in: turning a quarter, or growing. */
  motion: 'turn' | 'grow';
}

/**
 * One icon replacing another: give it a `key` and the arriving icon animates in. Deliberately no exit —
 * a `<Presence>` here would hold two icons inside one button for the length of a fade, and the outgoing
 * one has nowhere to go. Gated on hydration like every other entrance on this site, so the icon the
 * prerendered page is already showing does not spin on arrival.
 */
export default function IconSwap({ children, motion }: Props) {
  const animate = useIsRealMount();

  return (
    <Box
      animationName={animate ? `icon-swap-${motion}` : undefined}
      animationDuration={150}
      animationTimingFunction="ease-out"
      motionReduce={{ animationName: 'none' }}
    >
      {children}
    </Box>
  );
}
