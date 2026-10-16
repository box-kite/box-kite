/** Which tray a swipe reveals: `start` sits under the inline start edge, so in a left-to-right page a swipe to the right shows it. */
export type SwipeSide = 'start' | 'end';

/** How wide each tray is when it is fully open, in px. `0` is a side with no actions, which a swipe cannot open. */
export interface SwipeTrays {
  start: number;
  end: number;
}

/** Where a released swipe comes to rest: open on one side, closed, or carried through to the outermost action. */
export interface SwipeRest {
  open: SwipeSide | null;
  full: SwipeSide | null;
}

/**
 * The model behind `<SwipeItem>`. Every offset here is **logical**: positive moves the content towards the
 * inline end and reveals the `start` tray, so the arithmetic is the same in a right-to-left page and only
 * the component turns it back into a physical translate. No DOM and no React — a swipe is numbers.
 */
namespace SwipeUtils {
  /** How far a press travels before it is a gesture at all, in px — under it, a press is a tap. */
  export const SLOP = 8;

  /** A release faster than this, in px per ms, is a flick: it goes the way it was going, however far it got. */
  export const FLICK = 0.4;

  /** How much of the item a full swipe has to cross before letting go performs the outermost action. */
  export const FULL_RATIO = 0.6;

  /**
   * What a press is once it has moved past the slop: a swipe when it went more sideways than up or down,
   * otherwise a scroll the page owns. `null` until then.
   */
  export function intent(dx: number, dy: number): 'swipe' | 'scroll' | null {
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SLOP) return null;

    return Math.abs(dx) > Math.abs(dy) ? 'swipe' : 'scroll';
  }

  /** iOS's rubber band: past the edge every pixel travelled moves the content less, and never past `dimension`. */
  function rubber(over: number, dimension: number): number {
    return (1 - 1 / ((over * 0.55) / dimension + 1)) * dimension;
  }

  /** The offset for a press that started at `rest` and has travelled `travel` along the reading order. */
  export function offsetFor(rest: number, travel: number, trays: SwipeTrays, width: number, fullSwipe: boolean): number {
    const raw = rest + travel;
    const sign = raw < 0 ? -1 : 1;
    const limit = raw < 0 ? trays.end : trays.start;
    const distance = Math.abs(raw);

    // A side with nothing in it does not move at all: a resisting empty tray reads as a broken one.
    if (limit === 0) return 0;
    if (distance <= limit) return raw;
    if (fullSwipe) return sign * Math.min(distance, width);

    return sign * (limit + rubber(distance - limit, Math.max(width, 1)));
  }

  /** The side whose outermost action a release would perform, or `null` when it has not been carried far enough. */
  export function armed(offset: number, trays: SwipeTrays, width: number, fullSwipe: boolean): SwipeSide | null {
    if (!fullSwipe || offset === 0) return null;

    const side: SwipeSide = offset > 0 ? 'start' : 'end';
    const tray = trays[side];
    if (tray === 0) return null;

    // Past the tray by a margin as well as most of the way across, so a narrow item cannot arm on opening.
    return Math.abs(offset) >= Math.max(tray + SLOP * 4, width * FULL_RATIO) ? side : null;
  }

  /**
   * Where a release settles. A flick goes the way it was moving; otherwise a tray past half open opens and
   * one short of it closes — the rule every platform swipe follows, because the eye judges halfway.
   */
  export function settle(offset: number, velocity: number, trays: SwipeTrays, width: number, fullSwipe: boolean): SwipeRest {
    const full = armed(offset, trays, width, fullSwipe);
    if (full) return { open: null, full };
    if (offset === 0) return { open: null, full: null };

    const side: SwipeSide = offset > 0 ? 'start' : 'end';
    const tray = trays[side];
    if (tray === 0) return { open: null, full: null };

    if (Math.abs(velocity) >= FLICK) return { open: Math.sign(velocity) === Math.sign(offset) ? side : null, full: null };

    return { open: Math.abs(offset) >= tray / 2 ? side : null, full: null };
  }

  /** A pointer sample: when, in ms, and where along the line, in px. */
  export interface Sample {
    t: number;
    x: number;
  }

  /** How far back a release looks to judge its speed: the last tenth of a second is the flick, not the whole drag. */
  export const VELOCITY_WINDOW = 100;

  /** The samples worth keeping once `next` arrives: those inside the window, and `next`. */
  export function track(samples: readonly Sample[], next: Sample): Sample[] {
    return [...samples.filter((sample) => next.t - sample.t <= VELOCITY_WINDOW), next];
  }

  /** The speed along the line at release, in px per ms. Under a frame of samples is no measurement at all, so `0`. */
  export function velocity(samples: readonly Sample[]): number {
    const first = samples[0];
    const last = samples[samples.length - 1];
    if (!first || !last || last.t - first.t < 16) return 0;

    return (last.x - first.x) / (last.t - first.t);
  }

  /** The offset a tray rests at: its whole width, towards the side it is on. */
  export function restOffset(open: SwipeSide | null, trays: SwipeTrays): number {
    if (open === 'start') return trays.start;
    if (open === 'end') return -trays.end;

    return 0;
  }
}

export default SwipeUtils;
