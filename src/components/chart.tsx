import { forwardRef, Ref, RefAttributes } from 'react';
import Box, { BoxProps } from '../box';
import { mergeDeep } from '../core';
import { ExtractElementFromTag } from '../react/reactTypes';
import { BoxStyleProps, ComponentsAndVariants } from '../types';
import ChartUtils from '../utils/chart/chartUtils';
import { Circle, Path, Svg, SvgProps } from './svg';

/**
 * The chart micro-primitives: the small drawings a dashboard is made of, as Boxes. Deliberately not a chart
 * *library* — no axes, no legends, no data transformations; what you get instead is that every prop,
 * breakpoint and theme works. Two rules run through all four: **shape is an attribute, paint is a class**
 * (so ten thousand rows share one rule), and a ring's fill is a **rounded fraction**, because a dash length
 * lands in a class name and still has to transition. Naming is `Svg`'s: no `label` means `aria-hidden`.
 */

/**
 * The props every primitive shares: an `Svg`'s, minus the `viewBox` and `variant` they own and with
 * `children` narrowed to SVG content — a chart's children are a label in a ring, never a render prop.
 */
type ChartProps = Omit<SvgProps, 'viewBox' | 'variant' | 'children'> & { children?: React.ReactNode };

/** The box every primitive draws in — the components own it, so the numbers can be plain. */
const VIEW_BOX = `0 0 ${ChartUtils.VIEW} ${ChartUtils.VIEW}`;

/** A paint value: a colour token, or the `url(#…)`/`var(--…)` a gradient or a theme provides. */
type Paint = NonNullable<BoxStyleProps['fill']>;

/**
 * The colours a `<MiniDonut>` cycles through when it is not given any — the six a `<ChartContainer>`
 * declares, so a donut inside one matches the charts beside it. Tokens rather than `var(--chart-n)`, so
 * a donut with no container above it still draws something.
 */
const DEFAULT_COLORS: readonly Paint[] = ChartUtils.PALETTE;

export interface SparklineProps extends ChartProps {
  /** The numbers to draw, oldest first. */
  data: readonly number[];
  /** `line` (default), `area` — the line with the space beneath it filled — or `bar`. */
  variant?: 'line' | 'area' | 'bar';
  /**
   * Fix the ends of the value axis. Without them the line uses its own lowest and highest value, so
   * every row of a table is scaled to itself; with them a column of sparklines is comparable.
   */
  min?: number;
  /** The top of the value axis — see `min`, which it is written beside. */
  max?: number;
}

/**
 * A trend line with no axes, no legend and no labels: the shape of a series, small enough to sit in a
 * table cell. `variant` draws it as a line, an area or bars.
 *
 * @a11y The `<svg>` is `aria-hidden` unless it is given a `label`, because a sparkline usually repeats
 * a number that is already in the row beside it.
 * @a11y A chart is not a substitute for the values: where the shape *is* the information, give it a
 * `label` saying what it shows, and keep the numbers reachable in text.
 */
function SparklineImpl(props: SparklineProps, ref: Ref<SVGSVGElement>) {
  const { data, variant = 'line', min, max, children, ...svgProps } = props;
  const domain = { min, max };
  const points = ChartUtils.points(data, domain);

  return (
    <Svg
      viewBox={VIEW_BOX}
      // The one primitive not drawn to scale: it fills whatever box it is given, and `non-scaling-stroke`
      // keeps the line one width thick after the stretch. Both are ordinary props, so a caller can opt out.
      preserveAspectRatio="none"
      vectorEffect="non-scaling-stroke"
      width="100%"
      height="1.5rem"
      overflow="visible"
      stroke="currentColor"
      fill="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      ref={ref}
      {...svgProps}
    >
      {variant === 'bar' ? (
        <Path d={ChartUtils.barsPath(data, domain)} stroke="none" />
      ) : (
        <>
          {/* Two paths for an area, because one closed path would stroke its own baseline and sides. */}
          {variant === 'area' && <Path d={ChartUtils.areaPath(points)} stroke="none" fillOpacity={0.2} />}
          <Path d={ChartUtils.linePath(points)} fill="none" />
        </>
      )}
      {children}
    </Svg>
  );
}

/** A line, area or bar chart small enough to sit inside a line of text or a table cell. */
export const Sparkline = /* @__PURE__ */ forwardRef(SparklineImpl);
Sparkline.displayName = 'Sparkline';

/** What a ring and a dial have in common: one value, and how thick the arc drawing it is. */
export interface ProgressRingProps extends ChartProps {
  /** How full the arc is, from 0 to 1. Rounded to half a percent — see `ChartUtils.FRACTION_STEP`. */
  value: number;
  /** The width of the ring in view units, out of the 100 the box is wide. */
  thickness?: number;
  /** The unfilled part of the ring, as the same colour faded — so the track follows the theme too. */
  trackOpacity?: NonNullable<BoxStyleProps['strokeOpacity']>;
}

/**
 * A circular progress arc: one value from 0 to 1, drawn as the filled part of a ring over its own track.
 *
 * @a11y `aria-hidden` with no `label`, and a `label` makes it `role="img"`. For progress a user is
 * *waiting* on, put the value in text or in a `role="progressbar"` of your own — an image role does not
 * announce a change.
 */
function ProgressRingImpl(props: ProgressRingProps, ref: Ref<SVGSVGElement>) {
  const { value, thickness = 10, trackOpacity = 0.2, children, ...svgProps } = props;
  const radius = ChartUtils.radius(thickness);
  const length = ChartUtils.circumference(radius);

  return (
    <Svg
      viewBox={VIEW_BOX}
      width="3rem"
      height="3rem"
      stroke="currentColor"
      fill="none"
      strokeWidth={thickness}
      strokeLinecap="round"
      ref={ref}
      {...svgProps}
    >
      <Circle cx={ChartUtils.CENTRE} cy={ChartUtils.CENTRE} r={radius} strokeOpacity={trackOpacity} />
      {/*
       * Turned by the `transform` *attribute*, which carries its own centre: the CSS `rotate` prop turns a
       * shape around the corner of the viewBox, and there is no `transformOrigin` prop yet (AN1).
       */}
      <Circle
        cx={ChartUtils.CENTRE}
        cy={ChartUtils.CENTRE}
        r={radius}
        transform={`rotate(-90 ${ChartUtils.CENTRE} ${ChartUtils.CENTRE})`}
        {...ChartUtils.dash(length, value)}
      />
      {children}
    </Svg>
  );
}

/** A full circle filled to `value`, starting at twelve o'clock — the percentage-complete ring. */
export const ProgressRing = /* @__PURE__ */ forwardRef(ProgressRingImpl);
ProgressRing.displayName = 'ProgressRing';

export interface GaugeProps extends ProgressRingProps {
  /** How far round the dial goes, in degrees. Three quarters of a turn by default. */
  sweep?: number;
  /** Where it starts, in degrees clockwise from twelve o'clock. Bottom left by default. */
  start?: number;
}

/**
 * A `ProgressRing` that stops short of a full turn: `sweep` is how far round the dial goes and `start`
 * where it begins, so a value reads as a needle position rather than as a proportion.
 *
 * @a11y `aria-hidden` with no `label`, and a `label` makes it `role="img"`. The value itself belongs
 * in text: a dial's angle is not readable by anyone who cannot see it.
 */
function GaugeImpl(props: GaugeProps, ref: Ref<SVGSVGElement>) {
  const { value, thickness = 10, trackOpacity = 0.2, sweep = 270, start = 225, children, ...svgProps } = props;
  const radius = ChartUtils.radius(thickness);
  const length = ChartUtils.arcLength(radius, sweep);
  // Constants of the shape, not of the data, so both arcs are the same string in every gauge.
  const d = ChartUtils.arcPath(radius, start, sweep);

  return (
    <Svg
      viewBox={VIEW_BOX}
      width="4rem"
      height="4rem"
      stroke="currentColor"
      fill="none"
      strokeWidth={thickness}
      strokeLinecap="round"
      ref={ref}
      {...svgProps}
    >
      <Path d={d} strokeOpacity={trackOpacity} />
      <Path d={d} {...ChartUtils.dash(length, value)} />
      {children}
    </Svg>
  );
}

/** A dial: an arc of `sweep` degrees filled to `value`. A gauge with `sweep={360}` is a ring. */
export const Gauge = /* @__PURE__ */ forwardRef(GaugeImpl);
Gauge.displayName = 'Gauge';

export interface MiniDonutProps extends ChartProps {
  /** One value per segment. Each is drawn as its share of the whole, so they need no total. */
  data: readonly number[];
  /** One colour per segment, cycled if there are fewer than there are values. */
  colors?: readonly Paint[];
  /** The width of the ring in view units, out of the 100 the box is wide. */
  thickness?: number;
}

/**
 * A ring of segments, each drawn as its share of the whole — so the values need no total, and the
 * colours cycle through the six a `ChartContainer` declares.
 *
 * @a11y `aria-hidden` with no `label`, and a `label` makes it `role="img"`. Segments are told apart by
 * colour alone, so the breakdown has to exist somewhere a reader can get at it.
 */
function MiniDonutImpl(props: MiniDonutProps, ref: Ref<SVGSVGElement>) {
  const { data, colors = DEFAULT_COLORS, thickness = 20, children, ...svgProps } = props;
  const radius = ChartUtils.radius(thickness);
  const length = ChartUtils.circumference(radius);

  return (
    <Svg viewBox={VIEW_BOX} width="3rem" height="3rem" fill="none" strokeWidth={thickness} ref={ref} {...svgProps}>
      {ChartUtils.donutSegments(data, length).map((segment) => (
        <Circle
          key={segment.index}
          cx={ChartUtils.CENTRE}
          cy={ChartUtils.CENTRE}
          r={radius}
          stroke={colors[segment.index % colors.length]}
          strokeDasharray={segment.strokeDasharray}
          // Where the segment starts, as an attribute — so the angles of a donut generate no rules.
          transform={`rotate(${segment.rotate - 90} ${ChartUtils.CENTRE} ${ChartUtils.CENTRE})`}
        />
      ))}
      {children}
    </Svg>
  );
}

/** A ring divided into one segment per value — a pie chart with its middle left for a number. */
export const MiniDonut = /* @__PURE__ */ forwardRef(MiniDonutImpl);
MiniDonut.displayName = 'MiniDonut';

/**
 * The series a `<ChartContainer>` draws: `series={['revenue', 'cost']}` takes the palette in order,
 * `series={{ revenue: 'emerald-600' }}` names its own paint. A name becomes part of a custom-property
 * name, so it has to be a CSS identifier — a dot-path `dataKey` is skipped rather than taking the rest.
 */
export type ChartSeries = readonly string[] | Readonly<Record<string, Paint>>;

export interface ChartContainerProps<
  TTag extends keyof React.JSX.IntrinsicElements = 'div',
  TKey extends keyof ComponentsAndVariants = never,
> extends BoxProps<TTag, TKey> {
  /** The series drawn inside, and what colour each of them is. */
  series?: ChartSeries;
}

/**
 * The theming bridge for a chart somebody else draws: a Box that declares `--chart-1` … `--chart-6` in
 * both themes plus one `--color-<series>` per series, so a Recharts `<Line stroke="var(--color-revenue)">`
 * names no colour of its own and its dark mode belongs to the page.
 *
 * @a11y It is a `<div>` with variables on it — no role, no name, nothing in the accessibility tree.
 * Whatever the chart library renders inside owns its own accessibility.
 */
function ChartContainerImpl<TTag extends keyof React.JSX.IntrinsicElements = 'div'>(
  props: ChartContainerProps<TTag>,
  ref: Ref<ExtractElementFromTag<TTag>>,
) {
  const { series, vars, theme, ...boxProps } = props;

  // The caller's own `vars` come last, so overriding one slot needs no prop of its own.
  const declared = {
    ...ChartUtils.paletteVariables(ChartUtils.PALETTE),
    ...(series ? ChartUtils.seriesVariables(series) : {}),
    ...vars,
  };

  // The dark palette arrives through the same theme selector every other prop uses, which is the whole
  // trick. Merged rather than replaced, so a caller's own `theme` survives.
  const themes = mergeDeep<NonNullable<ChartContainerProps<TTag>['theme']>>(
    { dark: { vars: ChartUtils.paletteVariables(ChartUtils.DARK_PALETTE) } },
    theme ?? {},
  );

  return <Box ref={ref} vars={declared} theme={themes} {...boxProps} />;
}

const ChartContainerComponent = forwardRef(ChartContainerImpl);
ChartContainerComponent.displayName = 'ChartContainer';

/**
 * The theming bridge: a Box that declares the variables a chart reads, so the chart itself names no
 * colour. `vars` is an ordinary prop, so the palette is themed and responsive like everything else and
 * lands in a *class* — two containers with the same series share one rule, and it renders on a server.
 * The names are the ecosystem's, so a chart copied from shadcn works unchanged. It adds no ARIA.
 */
export const ChartContainer = ChartContainerComponent as <
  TTag extends keyof React.JSX.IntrinsicElements = 'div',
  TKey extends keyof ComponentsAndVariants = never,
>(
  props: ChartContainerProps<TTag, TKey> & RefAttributes<ExtractElementFromTag<TTag>>,
) => React.ReactNode;
