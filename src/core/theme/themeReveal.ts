import { documentOrNull } from '../../utils/environment/environmentUtils';
import startViewTransition, { ViewTransitionHandle } from '../viewTransition';

/**
 * The reveal: a theme change that grows out of the control that asked for it, as a circle. Its own chunk,
 * fetched by `prepareReveal()` in `themeTransition`, so a bundle that never reveals does not carry it.
 */

interface Point {
  x: number;
  y: number;
}

const DURATION = 500;
// A press older than this did not ask for the change — a keyboard did, or a timer.
const PRESS_WINDOW = 1000;

let lastPress: (Point & { time: number }) | null = null;
let watchers = 0;

function recordPress(event: PointerEvent) {
  lastPress = { x: event.clientX, y: event.clientY, time: event.timeStamp };
}

/** Remember where presses land, which is where a reveal grows from. Returns the unsubscribe. */
export function watchPresses(): () => void {
  const doc = documentOrNull();
  if (!doc) return () => {};

  if (watchers++ === 0) doc.addEventListener('pointerdown', recordPress, { capture: true, passive: true });

  return () => {
    if (--watchers === 0) doc.removeEventListener('pointerdown', recordPress, { capture: true });
  };
}

/** The press that just happened, else the focused control (a key press), else the middle of the viewport. */
export function revealOrigin(doc: Document): Point {
  const view = doc.defaultView;
  if (lastPress && view && view.performance.now() - lastPress.time < PRESS_WINDOW) return lastPress;

  const focused = doc.activeElement;
  if (focused && focused !== doc.body && focused !== doc.documentElement) {
    const rect = focused.getBoundingClientRect();

    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }

  return { x: (view?.innerWidth ?? 0) / 2, y: (view?.innerHeight ?? 0) / 2 };
}

/** The radius that reaches the farthest corner of a `width` × `height` viewport from `origin`. */
export function revealRadius(origin: Point, width: number, height: number): number {
  return Math.ceil(Math.hypot(Math.max(origin.x, width - origin.x), Math.max(origin.y, height - origin.y)));
}

/** Run `update` inside a view transition that reveals the new state from the press. */
export default function reveal(update: () => void): ViewTransitionHandle {
  const doc = documentOrNull();
  const origin = doc ? revealOrigin(doc) : null;
  const handle = startViewTransition(update);
  if (!handle.transitioned || !doc || !origin) return handle;

  handle.ready.then(
    () => {
      const view = doc.defaultView;
      const radius = revealRadius(origin, view?.innerWidth ?? 0, view?.innerHeight ?? 0);
      const at = `at ${origin.x}px ${origin.y}px`;
      // Script animations composite above CSS ones, so this holds both screenshots over the browser's cross-fade — a
      // stylesheet switching it off would restyle the whole page on the click (bug #244).
      const hold = { opacity: [1, 1], mixBlendMode: ['normal', 'normal'] };
      const timing = { duration: DURATION, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' };

      doc.documentElement.animate(hold, { ...timing, pseudoElement: '::view-transition-old(root)' });
      doc.documentElement.animate(
        { ...hold, clipPath: [`circle(0px ${at})`, `circle(${radius}px ${at})`] },
        { ...timing, pseudoElement: '::view-transition-new(root)' },
      );
    },
    () => {},
  );

  return handle;
}
