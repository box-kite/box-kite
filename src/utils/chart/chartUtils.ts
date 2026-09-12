import * as ChartPalette from './chartPalette';

/**
 * The model behind the chart primitives: every number a `<Sparkline>`, `<ProgressRing>`, `<Gauge>` or
 * `<MiniDonut>` draws with, the palette a `<ChartContainer>` declares, and no React. Components render,
 * models decide — which is also what makes a path string testable with no DOM. Everything is measured
 * in one square of `VIEW` user units.
 */
namespace ChartUtils {
  /** The side of the square every primitive draws inside. */
  export const VIEW = 100;

  /** The centre of that square, where a ring or a donut is centred. */
  export const CENTRE = VIEW / 2;

  /**
   * The step a ring fraction is rounded to. A dash length lands in a *class name*, so an unrounded
   * fraction would mean a rule per value; half a percent of a 96px ring is a third of a pixel, and the
   * arc can still transition. Data-driven *paths* need none of this — a `d` attribute generates no CSS.
   */
  export const FRACTION_STEP = 0.005;

  export interface Point {
    x: number;
    y: number;
  }

  /** The ends of the value axis. Either can be fixed, so many rows can share one scale. */
  export interface Domain {
    min?: number;
    max?: number;
  }

  /** Two decimals is finer than any screen, and keeps a path string short enough to compare. */
  function round(value: number): number {
    return Math.round(value * 100) / 100;
  }

  /** Rounded to `FRACTION_STEP` and clamped to the path: a ring cannot be more than full. */
  export function fraction(value: number): number {
    const clamped = Math.min(Math.max(value, 0), 1);

    return Math.round(clamped / FRACTION_STEP) * FRACTION_STEP;
  }

  /**
   * The data as points in the view box, `y` already flipped for SVG's downward axis. Two decisions rather
   * than guards: one datum is a flat line across the box, and data that never changes sits in the middle
   * (`max === min` has no scale) instead of collapsing onto the floor.
   */
  export function points(data: readonly number[], domain: Domain = {}): Point[] {
    if (data.length === 0) return [];

    const min = domain.min ?? Math.min(...data);
    const max = domain.max ?? Math.max(...data);
    const span = max - min;

    const y = (value: number) => round(span === 0 ? CENTRE : VIEW - ((value - min) / span) * VIEW);

    if (data.length === 1) {
      return [
        { x: 0, y: y(data[0]) },
        { x: VIEW, y: y(data[0]) },
      ];
    }

    const step = VIEW / (data.length - 1);

    return data.map((value, index) => ({ x: round(index * step), y: y(value) }));
  }

  /** The points as a polyline: `M x y L x y …`. */
  export function linePath(points: readonly Point[]): string {
    if (points.length === 0) return '';

    return points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x} ${point.y}`).join('');
  }

  /** The same line, closed down both sides to the floor of the box so it can be filled. */
  export function areaPath(points: readonly Point[]): string {
    if (points.length === 0) return '';

    const last = points[points.length - 1];

    return `${linePath(points)}L${last.x} ${VIEW}L${points[0].x} ${VIEW}Z`;
  }

  /**
   * The data as bars in **one** path, because these are drawn fifty rows at a time inside a scrolling
   * grid. `gap` is the share of each slot left empty; every bar keeps a floor of one unit, so a
   * bottom-of-the-scale value reads as a mark on the axis rather than as missing data.
   */
  export function barsPath(data: readonly number[], domain: Domain = {}, gap = 0.25): string {
    if (data.length === 0) return '';

    const slot = VIEW / data.length;
    const width = round(slot * (1 - gap));
    const offset = round((slot - width) / 2);

    return points(data, domain)
      .map((point, index) => {
        const top = Math.min(point.y, VIEW - 1);

        return `M${round(index * slot + offset)} ${top}h${width}v${round(VIEW - top)}h${-width}Z`;
      })
      .join('');
  }

  /** The radius that fits a stroke of `thickness` inside the box, without clipping either edge. */
  export function radius(thickness: number): number {
    return round(CENTRE - thickness / 2);
  }

  /** The length of a full circle of that radius. */
  export function circumference(radius: number): number {
    return round(2 * Math.PI * radius);
  }

  /**
   * The dash pair that reveals `value` (0–1) of a path `length` long: one dash as long as the whole path,
   * offset backwards, so the arc grows from its own beginning. Both are Box props, so it transitions.
   */
  export function dash(length: number, value: number): { strokeDasharray: number; strokeDashoffset: number } {
    return { strokeDasharray: round(length), strokeDashoffset: round(length * (1 - fraction(value))) };
  }

  /** A point on the circle, measured clockwise from twelve o'clock, the way a dial is read. */
  function polar(radius: number, angle: number): Point {
    const radians = ((angle - 90) * Math.PI) / 180;

    return { x: round(CENTRE + radius * Math.cos(radians)), y: round(CENTRE + radius * Math.sin(radians)) };
  }

  /** How long an arc of `sweep` degrees is — the path length a `dash` is measured against. */
  export function arcLength(radius: number, sweep: number): number {
    return round(circumference(radius) * (Math.min(Math.abs(sweep), 360) / 360));
  }

  /**
   * An arc as a path, from `start` degrees clockwise through `sweep`. Only constants of the shape reach
   * this, so it is the same string for every gauge alike and belongs in the `d` attribute. A full turn is
   * split in half — one arc whose ends coincide draws nothing at all.
   */
  export function arcPath(radius: number, start: number, sweep: number): string {
    if (Math.abs(sweep) >= 360) {
      const from = polar(radius, start);
      const opposite = polar(radius, start + 180);

      return `M${from.x} ${from.y}A${radius} ${radius} 0 0 1 ${opposite.x} ${opposite.y}A${radius} ${radius} 0 0 1 ${from.x} ${from.y}`;
    }

    const from = polar(radius, start);
    const to = polar(radius, start + sweep);
    const largeArc = Math.abs(sweep) > 180 ? 1 : 0;
    const clockwise = sweep < 0 ? 0 : 1;

    return `M${from.x} ${from.y}A${radius} ${radius} 0 ${largeArc} ${clockwise} ${to.x} ${to.y}`;
  }

  /** One segment of a donut: the dash that draws it, and how far round the circle it starts. */
  export interface Segment {
    /** The visible run and the gap that follows it, as a `strokeDasharray` value. */
    strokeDasharray: string;
    /** Degrees clockwise from twelve o'clock — written as the `transform` attribute. */
    rotate: number;
    /** The datum this segment was drawn from, and its position in the data. */
    value: number;
    index: number;
  }

  /**
   * One segment per value, each the share of the circle it is worth: the same circle dashed to its own
   * length and turned by an *attribute*, so the angles generate no rules. Values summing to nothing give
   * no segments rather than a division by zero, and a negative value counts as none.
   */
  export function donutSegments(data: readonly number[], length: number): Segment[] {
    const total = data.reduce((sum, value) => sum + Math.max(value, 0), 0);

    if (total <= 0) return [];

    let start = 0;

    return data.map((value, index) => {
      const share = fraction(Math.max(value, 0) / total);
      const run = round(length * share);
      const rotate = round(start * 360);

      start += share;

      return { strokeDasharray: `${run} ${round(length - run)}`, rotate, value, index };
    });
  }

  // The palette is its own module, because `boxComponents.ts` declares it and the engine must not pay
  // for the geometry in this file to do so. Re-exported here, so the names are where they always were.
  export const PALETTE = ChartPalette.PALETTE;
  export const DARK_PALETTE = ChartPalette.DARK_PALETTE;
  export const paletteVariables = ChartPalette.paletteVariables;

  /**
   * The variables a chart's series read, named as the ecosystem names them: `{ 'color-revenue':
   * 'var(--chart-1)' }`. A list takes the palette in order, which is the whole case for the container — a
   * chart naming no colour has its dark mode decided by the page. A record names its own paint per series.
   */
  export function seriesVariables(series: readonly string[] | Readonly<Record<string, string>>, slots: number = PALETTE.length) {
    const entries: readonly (readonly [string, string])[] = Array.isArray(series)
      ? series.map((name, index) => [name, `var(--chart-${(index % slots) + 1})`] as const)
      : Object.entries(series as Record<string, string>);

    return entries.reduce<Record<string, string>>((acc, [name, paint]) => {
      acc[`color-${name}`] = paint;

      return acc;
    }, {});
  }
}

export default ChartUtils;
