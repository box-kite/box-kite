import Springs from '../../src/core/springs';

/**
 * The showcase's claims, kept where a test can hold them to the engine rather than to a memory of it.
 * Every figure here is either read off `Springs` or checked against it in `motion.test.ts`.
 */

/** One demo. `costs` is the honest half — what the same effect costs in JavaScript, and what it costs here. */
export interface Demo {
  id: string;
  label: string;
  /** The heading: what the reader is looking at. */
  title: string;
  /** What a JavaScript implementation of this would have to run every frame. */
  instead: string;
}

export const demos: readonly Demo[] = [
  {
    id: 'presets',
    label: 'Presets',
    title: 'Four animations that ship with the engine',
    instead: 'a keyframes block per project, and a media query to stop it',
  },
  {
    id: 'springs',
    label: 'Springs',
    title: 'Spring physics, tuned live, running as CSS',
    instead: 'a physics loop on the main thread for as long as the motion lasts',
  },
  {
    id: 'entry-exit',
    label: 'Entry & exit',
    title: 'A panel that animates both ways without unmounting',
    instead: 'an animation library holding the node open until its exit finishes',
  },
  {
    id: 'scroll',
    label: 'Scroll-driven',
    title: 'A chart that draws itself as it arrives',
    instead: 'an IntersectionObserver, a scroll listener and a requestAnimationFrame',
  },
  {
    id: 'view-transitions',
    label: 'View transitions',
    title: 'A layout change the browser animates between',
    instead: 'measuring both layouts and interpolating the difference by hand (FLIP)',
  },
  {
    id: 'drawing',
    label: 'Path drawing',
    title: 'An SVG path that draws itself',
    instead: 'a per-frame write to the dash offset of every path on screen',
  },
];

/** The playground's three dials. `initial` is `Springs.spring()`'s own default, which the test pins. */
export const dials = [
  { key: 'stiffness', label: 'Stiffness', initial: 180, min: 40, max: 400, step: 10 },
  { key: 'damping', label: 'Damping', initial: 20, min: 4, max: 60, step: 1 },
  { key: 'mass', label: 'Mass', initial: 1, min: 1, max: 6, step: 1 },
] as const;

export type DialKey = (typeof dials)[number]['key'];

/** The four sampled presets, in the order the showcase prints them. */
export const springPresets = Springs.presetNames;

/**
 * A curve as an SVG path: time across, progress up, drawn from the very points the CSS receives. The
 * box is 100×100 with the target at y=28 and the resting line at y=88, so an overshoot has room above.
 */
export function curvePath(easing: string): string {
  const points = easing.slice('linear('.length, -1).split(',').map(Number);

  return points
    .map((value, index) => `${index ? 'L' : 'M'}${(2 + (index / (points.length - 1)) * 96).toFixed(1)},${(88 - value * 60).toFixed(1)}`)
    .join(' ');
}
