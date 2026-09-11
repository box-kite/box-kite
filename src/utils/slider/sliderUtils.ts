/** Which axis the thumbs run along. Horizontal is the reading axis, so its arrows mirror in a right-to-left page. */
export type SliderOrientation = 'horizontal' | 'vertical';

/** What a key means on a thumb: one step, one page, or a jump to an end of the range. */
export interface SliderMove {
  kind: 'step' | 'page' | 'edge';
  /** `1` towards the maximum, `-1` towards the minimum. */
  delta: number;
}

/** The scale a slider measures on. `step` is the grid every value but `min` and `max` lands on. */
export interface SliderScale {
  min: number;
  max: number;
  step: number;
}

/**
 * Where a thumb sits and what a pointer means, with no DOM and no React in it. The geometry is
 * deliberately physical — a rectangle has no reading order — and the one place direction enters is
 * `moveFor`, which is the half of a right-to-left slider no logical property can fix.
 */
namespace SliderUtils {
  /**
   * How many decimals a step carries, so a value snapped onto its grid does not come back as
   * `0.30000000000000004`. An exponent-form step (`1e-7`) has no readable decimals, so it snaps at the
   * float's own precision instead.
   */
  export function decimals(step: number): number {
    const text = String(Math.abs(step));
    if (text.includes('e')) return 12;

    const dot = text.indexOf('.');

    return dot === -1 ? 0 : text.length - dot - 1;
  }

  /** A value with the float noise taken back off it. */
  function round(value: number, places: number): number {
    return Number(value.toFixed(Math.min(places, 15)));
  }

  /** Inside the scale, nothing else. */
  export function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }

  /**
   * The nearest value on the step grid, counted from `min`. A `max` that is not itself on the grid stays
   * out of reach here — End is what puts a thumb on it, the way a native range input does.
   */
  export function snap(value: number, scale: SliderScale): number {
    const { min, max, step } = scale;
    const clamped = clamp(value, min, max);
    if (!(step > 0)) return clamped;

    const snapped = min + Math.round((clamped - min) / step) * step;

    return clamp(round(snapped, decimals(step) + decimals(min)), min, max);
  }

  /** Where a value sits on the scale, 0–100. A scale with no width puts everything at its start. */
  export function percent(value: number, min: number, max: number): number {
    if (max <= min) return 0;

    return (clamp(value, min, max) - min) * (100 / (max - min));
  }

  /** The same as a CSS length, rounded to a hundredth of a percent — finer than any screen, and short enough to compare. */
  export function percentage(value: number, min: number, max: number): string {
    return `${Math.round(percent(value, min, max) * 100) / 100}%`;
  }

  /** Whatever shape the consumer gave, as the array the component works in. */
  export function thumbs(value: number | readonly number[]): number[] {
    return typeof value === 'number' ? [value] : [...value];
  }

  /** And back out again, in the shape it arrived as: a number in, a number out. */
  export function shaped<T extends number | number[]>(sample: T, values: readonly number[]): T {
    return (typeof sample === 'number' ? values[0] : [...values]) as T;
  }

  /**
   * One thumb moved, held between its neighbours. A thumb may meet the one beside it and never pass it:
   * crossing would renumber the thumbs under the focus that is on one of them.
   */
  export function move(values: readonly number[], index: number, next: number, scale: SliderScale): number[] {
    const low = index > 0 ? values[index - 1] : scale.min;
    const high = index < values.length - 1 ? values[index + 1] : scale.max;
    const moved = [...values];
    moved[index] = clamp(snap(next, scale), low, high);

    return moved;
  }

  /** Whether two sets of thumbs say the same thing, so a drag that moved nothing costs no render. */
  export function same(left: readonly number[], right: readonly number[]): boolean {
    return left.length === right.length && left.every((value, index) => value === right[index]);
  }

  /**
   * Which thumb a press belongs to: the nearest, and the *last* of two equally near ones, so a pair
   * sitting on top of each other at the minimum can still be pulled apart.
   */
  export function nearest(values: readonly number[], target: number): number {
    let best = 0;
    let distance = Infinity;

    values.forEach((value, index) => {
      const gap = Math.abs(value - target);
      if (gap <= distance) {
        best = index;
        distance = gap;
      }
    });

    return best;
  }

  /**
   * The value a pointer is over. Physical coordinates against a physical rectangle: a vertical slider
   * counts up from its bottom edge, and a right-to-left one from its right.
   */
  export function valueAt(rect: DOMRect, clientX: number, clientY: number, orientation: SliderOrientation, rtl: boolean): number {
    const fraction =
      orientation === 'vertical'
        ? rect.height === 0
          ? 0
          : (rect.bottom - clientY) / rect.height
        : rect.width === 0
          ? 0
          : rtl
            ? (rect.right - clientX) / rect.width
            : (clientX - rect.left) / rect.width;

    return Math.min(Math.max(fraction, 0), 1);
  }

  /**
   * What a key does on a thumb. Both arrow pairs work on both orientations, which is APG's rule — and
   * only the sideways pair mirrors, because the block axis has no reading order to follow.
   */
  export function moveFor(key: string, rtl = false): SliderMove | undefined {
    if (key === 'Home') return { kind: 'edge', delta: -1 };
    if (key === 'End') return { kind: 'edge', delta: 1 };
    if (key === 'PageUp') return { kind: 'page', delta: 1 };
    if (key === 'PageDown') return { kind: 'page', delta: -1 };
    if (key === 'ArrowUp') return { kind: 'step', delta: 1 };
    if (key === 'ArrowDown') return { kind: 'step', delta: -1 };
    if (key === 'ArrowRight') return { kind: 'step', delta: rtl ? -1 : 1 };
    if (key === 'ArrowLeft') return { kind: 'step', delta: rtl ? 1 : -1 };

    return undefined;
  }

  /** Where a move lands, before the neighbours have their say. An edge move ignores the grid: End is `max` itself. */
  export function moved(current: number, key: SliderMove, scale: SliderScale, largeStep: number): number {
    if (key.kind === 'edge') return key.delta > 0 ? scale.max : scale.min;

    const by = key.kind === 'page' ? largeStep : scale.step;

    return current + key.delta * by;
  }
}

export default SliderUtils;
