import Anchors from './anchors';
import Animations from './animations';
import { BoxStylesFormatters } from './boxStylesFormatters';
import Containers from './containers';
import Content from './content';
import { BoxStyle, BoxStyleValue } from './coreTypes';
import Css from './css';
import Filters from './filters';
import Gradients from './gradients';
import Palette from './palette';
import Shadows from './shadows';
import Variables from './variables';

/** The opacity scale shared by `opacity`, `fillOpacity` and `strokeOpacity`. */
const opacityValues = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1] as const;

/**
 * `url(#id)` or `var(--name)` — a gradient, a pattern, a clip path: something the document defines
 * rather than a token this library knows. Declared after each prop's token list, which `find` gives
 * first refusal, and deliberately unformatted: someone else's variable is not ours to resolve.
 */
const referenceValues = {
  values: Variables.reference,
  match: Variables.isReference,
} satisfies BoxStyle;

/**
 * The opacity modifier every colour prop takes: `bgColor="blue-500/40"` is the token mixed with
 * `transparent`. It carries its own `match` because `values` is a template type, and a scalar `values` is
 * matched by `typeof` alone — which would take every string, the way it did before bug #31.
 */
const colorAlphaValue = {
  values: Palette.alpha,
  match: Palette.isAlpha,
  valueFormat: (value: string, getVariableValue: (name: string) => string) => Palette.mix(value, getVariableValue),
} satisfies BoxStyle;

/**
 * The percentage every spacing, sizing, inset and translate prop accepts. It carries its own `match`
 * because `values` is a plain string, and a scalar `values` is matched by `typeof` alone — which made all
 * thirty of them an unvalidated catch-all (bug #31).
 */
const percentValue = {
  values: Variables.percentString,
  match: Variables.isPercentString,
} satisfies BoxStyle;

/**
 * A ratio written compactly — `aspectRatio="4/3"` — spaced out into the `4 / 3` CSS reads. It carries its
 * own `match` for the reason every template type does: a scalar `values` is matched by `typeof` alone, so
 * `"4:3"` would otherwise reach CSS verbatim and the box would size itself off nothing (bug #31).
 */
const ratioValue = {
  values: Variables.ratio,
  match: Variables.isRatio,
  valueFormat: (value: string) => value.replace('/', ' / '),
} satisfies BoxStyle;

/**
 * The overflow-safe alignments, on every alignment prop: `safe center` centres until the content stops
 * fitting and then aligns to `start`. Plain `center` overflows both edges, and the half above the
 * scrollable origin cannot be reached at all — a centred dialog taller than the viewport loses its top.
 */
const safeAlignments = ['safe center', 'safe start', 'safe end', 'unsafe center', 'unsafe start', 'unsafe end'] as const;

/**
 * One axis of the composed `translate`. Both axes used to write `transform`, so a Box asking for both kept
 * whichever rule landed last; each now sets its own custom property and both write the same declaration,
 * which still transitions because `var()` substitutes at computed-value time.
 */
function translate(axis: 'X' | 'Y', format: (value: BoxStyleValue) => string) {
  return (value: BoxStyleValue) => `--boxTranslate${axis}:${format(value)};translate:var(--boxTranslateX, 0) var(--boxTranslateY, 0)`;
}

/**
 * One shadow layer's colour, as the three definitions every colour prop has. It lands in a custom
 * property rather than a CSS one, so it shows nothing until the layer that reads it is painted —
 * `shadowColor` alone is as inert as `borderColor` with no border width.
 */
function shadowColor(layer: Shadows.Colored) {
  return [
    {
      values: Variables.colorValues,
      declarations: (value: BoxStyleValue, getVariableValue: (name: string) => string) =>
        Shadows.colorDeclaration(layer, getVariableValue(value as string)),
    },
    {
      values: Variables.systemColorValues,
      declarations: (value: BoxStyleValue) => Shadows.colorDeclaration(layer, value as string),
    },
    {
      values: Palette.alpha,
      match: Palette.isAlpha,
      declarations: (value: BoxStyleValue, getVariableValue: (name: string) => string) =>
        Shadows.colorDeclaration(layer, Palette.mix(value, getVariableValue)),
    },
  ];
}

/**
 * One filter function as a prop: its own custom property, and the composed declaration every layer of that
 * property shares. A number is the function's own unit — a percentage for the six that take one, degrees
 * for `hue-rotate` — and `none` clears just this function, the way it clears just one shadow layer.
 */
function filterFunction(layer: Filters.Layer, name: string, unit: string) {
  return [
    {
      values: ['none'] as const,
      declarations: () => Filters.layerDeclarations(layer, Filters.cleared),
    },
    {
      values: 0,
      declarations: (value: BoxStyleValue) => Filters.layerDeclarations(layer, `${name}(${value}${unit})`),
    },
  ];
}

/** The blur function, which has a scale beside its number: Tailwind's steps, `xs` (4px) to `xxxl` (64px). */
function blurFunction(layer: 'Blur' | 'BackdropBlur') {
  return [
    {
      values: Filters.blurScale,
      declarations: (value: BoxStyleValue) => Filters.layerDeclarations(layer, `blur(${Filters.blur(value as string)}px)`),
    },
    ...filterFunction(layer, 'blur', 'px'),
  ];
}

export const cssStyles = {
  /**
   * The appearance CSS property is used to display UI elements with platform-specific styling, based on the operating system's theme.
   * @example appearance="none" → appearance: none
   */
  appearance: [
    {
      values: ['none', 'auto', 'menulist-button', 'textfield', 'button', 'checkbox'] as const,
    },
  ],
  /**
   * One of the four presets — their `@keyframes` are registered already and their durations ride
   * `--transitionTime`, so `prefers-reduced-motion` stops them with no opt-in. Declared before the
   * longhands below, so `animationDuration` and friends override what a preset chose.
   * @example animation="spin" → animation: spin calc(4 * var(--transitionTime)) linear infinite
   */
  animation: [
    {
      values: [...Animations.presetNames, 'none'] as const,
      valueFormat: (value: string) => Animations.presets[value as Animations.PresetName] ?? 'none',
      keyframes: (value: BoxStyleValue) => [value as string],
    },
  ],
  /**
   * The animation-delay CSS property specifies the amount of time to wait from applying the animation to an element before beginning to perform the animation. Milliseconds, like every other time here.
   * @example animationDelay={150} → animation-delay: 150ms
   */
  animationDelay: [
    {
      values: 0,
      styleName: 'animation-delay',
      valueFormat: BoxStylesFormatters.Value.ms,
    },
  ],
  /**
   * The animation-direction CSS property sets whether an animation should play forward, backward, or alternate back and forth between playing the sequence forward and backward.
   * @example animationDirection="normal" → animation-direction: normal
   */
  animationDirection: [
    {
      values: ['normal', 'reverse', 'alternate', 'alternate-reverse'] as const,
      styleName: 'animation-direction',
    },
  ],
  /**
   * The animation-duration CSS property sets the length of time that an animation takes to complete one cycle. Milliseconds: `animationDuration={1100}` is `1100ms`, and it names its own time, so reduced motion cannot reach it — say so with `motionReduce`. A spring name is that spring's settling time.
   * @example animationDuration={1100} → animation-duration: 1100ms
   */
  animationDuration: [
    {
      values: 0,
      styleName: 'animation-duration',
      valueFormat: BoxStylesFormatters.Value.ms,
    },
    {
      values: [...Animations.springNames] as const,
      styleName: 'animation-duration',
      valueFormat: (value: string) => Animations.springDuration(value as Animations.SpringName),
    },
  ],
  /**
   * The animation-fill-mode CSS property sets how a CSS animation applies styles to its target before and after its execution.
   * @example animationFillMode="none" → animation-fill-mode: none
   */
  animationFillMode: [
    {
      values: ['none', 'forwards', 'backwards', 'both'] as const,
      styleName: 'animation-fill-mode',
    },
  ],
  /**
   * The animation-iteration-count CSS property sets the number of times an animation sequence should be played before stopping.
   * @example animationIterationCount={3} → animation-iteration-count: 3
   */
  animationIterationCount: [
    {
      values: ['infinite'] as const,
      styleName: 'animation-iteration-count',
    },
    {
      values: 0,
      styleName: 'animation-iteration-count',
    },
  ],
  /**
   * Which `@keyframes` to run: a sequence registered with `Box.keyframes()`, one of the four preset
   * names, or a name from a stylesheet this library never wrote — an unknown name is left alone rather
   * than dropped, because `@keyframes` can come from anywhere.
   * @example animationName="spin" → animation-name: spin
   */
  animationName: [
    {
      values: '',
      styleName: 'animation-name',
      keyframes: (value: BoxStyleValue) => String(value).split(/[\s,]+/),
    },
  ],
  /**
   * The animation-play-state CSS property sets whether an animation is running or paused.
   * @example animationPlayState="running" → animation-play-state: running
   */
  animationPlayState: [
    {
      values: ['running', 'paused'] as const,
      styleName: 'animation-play-state',
    },
  ],
  /**
   * How an animation progresses through each cycle: a keyword, one of the four sampled springs, or a curve
   * of your own — `cubic-bezier()`, `steps()` and `linear()` are values. A spring names its duration too.
   * @example animationTimingFunction="linear" → animation-timing-function: linear
   */
  animationTimingFunction: [
    {
      values: ['linear', 'ease', 'ease-in', 'ease-in-out', 'ease-out', 'step-start', 'step-end'] as const,
      styleName: 'animation-timing-function',
    },
    {
      values: [...Animations.springNames] as const,
      styleName: 'animation-timing-function',
      declarations: (value) =>
        Animations.easingDeclarations('animation-timing-function', Animations.springEasing(value as Animations.SpringName)),
    },
    {
      values: Animations.timingFunction,
      match: Animations.isTimingFunction,
      styleName: 'animation-timing-function',
      declarations: (value) => Animations.easingDeclarations('animation-timing-function', value as string),
    },
  ],
  /**
   * The border-width shorthand CSS property sets the width of an element's border.
   * @example b={4} → border-width: 4px
   */
  b: [
    {
      values: 0,
      styleName: 'border-width',
      valueFormat: BoxStylesFormatters.Value.px,
    },
  ],
  /**
   * The border-width shorthand CSS property sets the width of an element's left and right border.
   * @example bx={4} → border-inline-width: 4px
   */
  bx: [
    {
      values: 0,
      styleName: 'border-inline-width',
      valueFormat: BoxStylesFormatters.Value.px,
    },
  ],
  /**
   * The border-width shorthand CSS property sets the width of an element's top and bottom border.
   * @example by={4} → border-block-width: 4px
   */
  by: [
    {
      values: 0,
      styleName: 'border-block-width',
      valueFormat: BoxStylesFormatters.Value.px,
    },
  ],
  /**
   * The border-top-width CSS property sets the width of the top border of an element.
   * @example bt={4} → border-top-width: 4px
   */
  bt: [
    {
      values: 0,
      styleName: 'border-top-width',
      valueFormat: BoxStylesFormatters.Value.px,
    },
  ],
  /**
   * The border-right-width CSS property sets the width of the right border of an element.
   * @example br={4} → border-right-width: 4px
   */
  br: [
    {
      values: 0,
      styleName: 'border-right-width',
      valueFormat: BoxStylesFormatters.Value.px,
    },
  ],
  /**
   * The border-bottom-width CSS property sets the width of the bottom border of an element.
   * @example bb={4} → border-bottom-width: 4px
   */
  bb: [
    {
      values: 0,
      styleName: 'border-bottom-width',
      valueFormat: BoxStylesFormatters.Value.px,
    },
  ],
  /**
   * The border-left-width CSS property sets the width of the left border of an element.
   * @example bl={4} → border-left-width: 4px
   */
  bl: [
    {
      values: 0,
      styleName: 'border-left-width',
      valueFormat: BoxStylesFormatters.Value.px,
    },
  ],
  /**
   * The border-inline-start-width CSS property sets the width of the border on the side the text starts from: `bl` in a left-to-right writing mode, `br` in a right-to-left one.
   * @example bs={4} → border-inline-start-width: 4px
   */
  bs: [
    {
      values: 0,
      styleName: 'border-inline-start-width',
      valueFormat: BoxStylesFormatters.Value.px,
    },
  ],
  /**
   * The border-inline-end-width CSS property sets the width of the border on the side the text ends at: `br` in a left-to-right writing mode, `bl` in a right-to-left one.
   * @example be={4} → border-inline-end-width: 4px
   */
  be: [
    {
      values: 0,
      styleName: 'border-inline-end-width',
      valueFormat: BoxStylesFormatters.Value.px,
    },
  ],
  /**
   * The border-style shorthand CSS property sets the line style for all four sides of an element's border.
   * @example borderStyle="solid" → border-style: solid
   */
  borderStyle: [
    {
      styleName: 'border-style',
      values: ['solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset', 'none', 'hidden'] as const,
    },
  ],
  /**
   * The border-radius CSS property rounds the corners of an element's outer border edge. You can set a single radius to make circular corners, or two radii to make elliptical corners.
   * @example borderRadius={4} → border-radius: 1rem
   */
  borderRadius: [
    {
      styleName: 'border-radius',
      values: 0,
      valueFormat: BoxStylesFormatters.Value.rem,
    },
  ],
  /**
   * The border-top-radius CSS property rounds the top corners of an element by specifying the radius (or the radius of the semi-major and semi-minor axes) of the ellipse defining the curvature of the corner.
   * @example borderRadiusTop={4} → border-top-left-radius: 1rem; border-top-right-radius: 1rem
   */
  borderRadiusTop: [
    {
      values: 0,
      styleName: ['border-top-left-radius', 'border-top-right-radius'],
      valueFormat: BoxStylesFormatters.Value.rem,
    },
  ],
  /**
   * The border-right-radius CSS property rounds the right corners of an element by specifying the radius (or the radius of the semi-major and semi-minor axes) of the ellipse defining the curvature of the corner.
   * @example borderRadiusRight={4} → border-top-right-radius: 1rem; border-bottom-right-radius: 1rem
   */
  borderRadiusRight: [
    {
      values: 0,
      styleName: ['border-top-right-radius', 'border-bottom-right-radius'],
      valueFormat: BoxStylesFormatters.Value.rem,
    },
  ],
  /**
   * The border-bottom-radius CSS property rounds the bottom corners of an element by specifying the radius (or the radius of the semi-major and semi-minor axes) of the ellipse defining the curvature of the corner.
   * @example borderRadiusBottom={4} → border-bottom-left-radius: 1rem; border-bottom-right-radius: 1rem
   */
  borderRadiusBottom: [
    {
      values: 0,
      styleName: ['border-bottom-left-radius', 'border-bottom-right-radius'],
      valueFormat: BoxStylesFormatters.Value.rem,
    },
  ],
  /**
   * The border-left-radius CSS property rounds the left corners of an element by specifying the radius (or the radius of the semi-major and semi-minor axes) of the ellipse defining the curvature of the corner.
   * @example borderRadiusLeft={4} → border-top-left-radius: 1rem; border-bottom-left-radius: 1rem
   */
  borderRadiusLeft: [
    {
      values: 0,
      styleName: ['border-top-left-radius', 'border-bottom-left-radius'],
      valueFormat: BoxStylesFormatters.Value.rem,
    },
  ],
  /**
   * The border-top-left-radius CSS property rounds the top-left corner of an element by specifying the radius (or the radius of the semi-major and semi-minor axes) of the ellipse defining the curvature of the corner.
   * @example borderRadiusTopLeft={4} → border-top-left-radius: 1rem
   */
  borderRadiusTopLeft: [
    {
      values: 0,
      styleName: 'border-top-left-radius',
      valueFormat: BoxStylesFormatters.Value.rem,
    },
  ],
  /**
   * The border-top-right-radius CSS property rounds the top-right corner of an element by specifying the radius (or the radius of the semi-major and semi-minor axes) of the ellipse defining the curvature of the corner.
   * @example borderRadiusTopRight={4} → border-top-right-radius: 1rem
   */
  borderRadiusTopRight: [
    {
      values: 0,
      styleName: 'border-top-right-radius',
      valueFormat: BoxStylesFormatters.Value.rem,
    },
  ],
  /**
   * The border-bottom-right-radius CSS property rounds the bottom-right corner of an element by specifying the radius (or the radius of the semi-major and semi-minor axes) of the ellipse defining the curvature of the corner.
   * @example borderRadiusBottomRight={4} → border-bottom-right-radius: 1rem
   */
  borderRadiusBottomRight: [
    {
      values: 0,
      styleName: 'border-bottom-right-radius',
      valueFormat: BoxStylesFormatters.Value.rem,
    },
  ],
  /**
   * The border-bottom-left-radius CSS property rounds the bottom-left corner of an element by specifying the radius (or the radius of the semi-major and semi-minor axes) of the ellipse defining the curvature of the corner.
   * @example borderRadiusBottomLeft={4} → border-bottom-left-radius: 1rem
   */
  borderRadiusBottomLeft: [
    {
      values: 0,
      styleName: 'border-bottom-left-radius',
      valueFormat: BoxStylesFormatters.Value.rem,
    },
  ],
  /**
   * Rounds both corners on the side the text starts from: the left ones in a left-to-right writing mode, the right ones in a right-to-left one.
   * @example borderRadiusStart={4} → border-start-start-radius: 1rem; border-end-start-radius: 1rem
   */
  borderRadiusStart: [
    {
      values: 0,
      styleName: ['border-start-start-radius', 'border-end-start-radius'],
      valueFormat: BoxStylesFormatters.Value.rem,
    },
  ],
  /**
   * Rounds both corners on the side the text ends at: the right ones in a left-to-right writing mode, the left ones in a right-to-left one.
   * @example borderRadiusEnd={4} → border-start-end-radius: 1rem; border-end-end-radius: 1rem
   */
  borderRadiusEnd: [
    {
      values: 0,
      styleName: ['border-start-end-radius', 'border-end-end-radius'],
      valueFormat: BoxStylesFormatters.Value.rem,
    },
  ],
  /**
   * Rounds the block-start, inline-start corner: top-left in a left-to-right writing mode, top-right in a right-to-left one.
   * @example borderRadiusStartStart={4} → border-start-start-radius: 1rem
   */
  borderRadiusStartStart: [
    {
      values: 0,
      styleName: 'border-start-start-radius',
      valueFormat: BoxStylesFormatters.Value.rem,
    },
  ],
  /**
   * Rounds the block-start, inline-end corner: top-right in a left-to-right writing mode, top-left in a right-to-left one.
   * @example borderRadiusStartEnd={4} → border-start-end-radius: 1rem
   */
  borderRadiusStartEnd: [
    {
      values: 0,
      styleName: 'border-start-end-radius',
      valueFormat: BoxStylesFormatters.Value.rem,
    },
  ],
  /**
   * Rounds the block-end, inline-end corner: bottom-right in a left-to-right writing mode, bottom-left in a right-to-left one.
   * @example borderRadiusEndEnd={4} → border-end-end-radius: 1rem
   */
  borderRadiusEndEnd: [
    {
      values: 0,
      styleName: 'border-end-end-radius',
      valueFormat: BoxStylesFormatters.Value.rem,
    },
  ],
  /**
   * Rounds the block-end, inline-start corner: bottom-left in a left-to-right writing mode, bottom-right in a right-to-left one.
   * @example borderRadiusEndStart={4} → border-end-start-radius: 1rem
   */
  borderRadiusEndStart: [
    {
      values: 0,
      styleName: 'border-end-start-radius',
      valueFormat: BoxStylesFormatters.Value.rem,
    },
  ],
  /**
   * The position CSS property sets how an element is positioned in a document. The top, right, bottom, and left properties determine the final location of positioned elements.
   * @example position="absolute" → position: absolute
   */
  position: [
    {
      values: ['static', 'relative', 'absolute', 'fixed', 'sticky'] as const,
    },
  ],
  /**
   * Names this element as an anchor, so a floating layer can hang off it by name. The `--` is optional
   * here and added on the way out, the way a `vars` key's is, so `anchorName="trigger"` and
   * `anchorName="--trigger"` are one class. A name is global to the document, so a component rendering
   * many of them needs one per instance.
   * @example anchorName="trigger" → anchor-name: --trigger
   */
  anchorName: [
    {
      values: '' as Anchors.Name,
      match: Anchors.isName,
      styleName: 'anchor-name',
      valueFormat: (value: string) => Anchors.dashedName(value),
    },
    {
      values: ['none'] as const,
      styleName: 'anchor-name',
    },
  ],
  /**
   * Which anchor this element is positioned against, by the name `anchorName` gave it. Needs
   * `position="absolute"` or `"fixed"` beside it — an anchored element is an absolutely positioned one
   * whose containing block comes from the anchor. `auto` picks up the anchor an `anchor()` value names.
   * @example positionAnchor="trigger" → position-anchor: --trigger
   */
  positionAnchor: [
    {
      values: '' as Anchors.Name,
      match: Anchors.isName,
      styleName: 'position-anchor',
      valueFormat: (value: string) => Anchors.dashedName(value),
    },
    {
      values: ['auto', 'none'] as const,
      styleName: 'position-anchor',
    },
  ],
  /**
   * Which cell of the 3x3 grid around the anchor to sit in, and the whole of what a side and an
   * alignment used to take JS to work out. **Block axis first, inline axis second** — the order
   * `borderRadiusStartStart` reads in — and the two keywords have to come from one family: `top left`
   * and `block-start inline-start` are values, `top inline-start` is not. `center` and `span-all` join
   * whichever family the other half names. Offset the layer from its anchor with a margin.
   * @example positionArea="block-end center" → position-area: block-end center
   */
  positionArea: [
    {
      values: '' as Anchors.Area,
      match: Anchors.isArea,
      styleName: 'position-area',
    },
  ],
  /**
   * Where to put the layer when it does not fit: `flip-block` tries the opposite side of the block axis,
   * `flip-inline` the inline one, `flip-start` swaps the two axes, and space-separated flips are one
   * position tried together. A comma-separated list is tried in order until one fits, which is the
   * browser doing what a positioning library measures for.
   *
   * **A position has to fit on _both_ axes to be taken**, so an overflow the flips cannot fix disqualifies
   * every candidate and the layer silently stays where it started. Measured in Chrome 152: with
   * `positionArea="block-end center"` a layer wider than its anchor overflows the centre column, and
   * `flip-block` then does nothing at all. Span the axis being kept — `"block-end span-all"` — and it flips.
   * @example positionTryFallbacks="flip-block" → position-try-fallbacks: flip-block
   */
  positionTryFallbacks: [
    {
      values: '' as Anchors.TryFallbacks,
      match: Anchors.isTryFallbacks,
      styleName: 'position-try-fallbacks',
    },
  ],
  /**
   * How to choose among the fallbacks rather than taking the first that fits: `most-width`,
   * `most-height`, `most-block-size` and `most-inline-size` each pick the position that leaves the layer
   * most room on that axis. `normal` is first-fit.
   * @example positionTryOrder="normal" → position-try-order: normal
   */
  positionTryOrder: [
    {
      values: ['normal', 'most-width', 'most-height', 'most-block-size', 'most-inline-size'] as const,
      styleName: 'position-try-order',
    },
  ],
  /**
   * When to hide the layer instead of positioning it: `anchors-visible` hides it once the anchor is
   * scrolled out of sight, `no-overflow` once the layer itself would overflow, and the two combine.
   * `always` is the default and shows it wherever it lands.
   *
   * **It hides at paint time**, so the layer keeps its box and its computed `visibility` still reads
   * `visible` — `checkVisibility()` agrees. Both were measured in Chrome 152 by sampling the pixel: the
   * only thing that changes is that nothing is painted and nothing hit-tests. A test asserting this needs
   * a screenshot, not a computed style.
   * @example positionVisibility="always" → position-visibility: always
   */
  positionVisibility: [
    {
      values: ['always', 'anchors-visible', 'no-overflow', 'anchors-visible no-overflow'] as const,
      styleName: 'position-visibility',
    },
  ],
  /**
   * The top CSS property sets the vertical position of a positioned element. This inset property has no effect on non-positioned elements.
   * @example top={4} → top: 1rem
   */
  top: [
    {
      values: 0,
      valueFormat: BoxStylesFormatters.Value.rem,
    },
    {
      values: ['auto'] as const,
    },
    {
      values: Variables.percentages,
      valueFormat: BoxStylesFormatters.Value.fraction,
    },
    {
      values: Variables.negativePercentages,
      valueFormat: BoxStylesFormatters.Value.fraction,
    },
    {
      ...percentValue,
    },
  ],
  /**
   * The right CSS property participates in specifying the horizontal position of a positioned element. This inset property has no effect on non-positioned elements.
   * @example right={4} → right: 1rem
   */
  right: [
    {
      values: 0,
      valueFormat: BoxStylesFormatters.Value.rem,
    },
    {
      values: ['auto'] as const,
    },
    {
      values: Variables.percentages,
      valueFormat: BoxStylesFormatters.Value.fraction,
    },
    {
      values: Variables.negativePercentages,
      valueFormat: BoxStylesFormatters.Value.fraction,
    },
    {
      ...percentValue,
    },
  ],
  /**
   * The bottom CSS property participates in setting the vertical position of a positioned element. This inset property has no effect on non-positioned elements.
   * @example bottom={4} → bottom: 1rem
   */
  bottom: [
    {
      values: 0,
      valueFormat: BoxStylesFormatters.Value.rem,
    },
    {
      values: ['auto'] as const,
    },
    {
      values: Variables.percentages,
      valueFormat: BoxStylesFormatters.Value.fraction,
    },
    {
      values: Variables.negativePercentages,
      valueFormat: BoxStylesFormatters.Value.fraction,
    },
    {
      ...percentValue,
    },
  ],
  /**
   * The left CSS property participates in specifying the horizontal position of a positioned element. This inset property has no effect on non-positioned elements.
   * @example left={4} → left: 1rem
   */
  left: [
    {
      values: 0,
      valueFormat: BoxStylesFormatters.Value.rem,
    },
    {
      values: ['auto'] as const,
    },
    {
      values: Variables.percentages,
      valueFormat: BoxStylesFormatters.Value.fraction,
    },
    {
      values: Variables.negativePercentages,
      valueFormat: BoxStylesFormatters.Value.fraction,
    },
    {
      ...percentValue,
    },
  ],
  /**
   * The inset CSS property is a shorthand that corresponds to the top, right, bottom, and/or left properties. It has the same multi-value syntax of the margin shorthand.
   * @example inset={4} → inset: 1rem
   */
  inset: [
    {
      values: 0,
      valueFormat: BoxStylesFormatters.Value.rem,
    },
    {
      values: ['auto'] as const,
    },
    {
      values: Variables.percentages,
      valueFormat: BoxStylesFormatters.Value.fraction,
    },
    {
      values: Variables.negativePercentages,
      valueFormat: BoxStylesFormatters.Value.fraction,
    },
    {
      ...percentValue,
    },
  ],
  /**
   * The inset-inline CSS shorthand sets both insets on the inline axis: `insetX` is `left` and `right` in a left-to-right writing mode, the way `mx` is `margin-inline`.
   * @example insetX={4} → inset-inline: 1rem
   */
  insetX: [
    {
      values: 0,
      styleName: 'inset-inline',
      valueFormat: BoxStylesFormatters.Value.rem,
    },
    {
      values: ['auto'] as const,
      styleName: 'inset-inline',
    },
    {
      values: Variables.percentages,
      styleName: 'inset-inline',
      valueFormat: BoxStylesFormatters.Value.fraction,
    },
    {
      values: Variables.negativePercentages,
      styleName: 'inset-inline',
      valueFormat: BoxStylesFormatters.Value.fraction,
    },
    {
      ...percentValue,
      styleName: 'inset-inline',
    },
  ],
  /**
   * The inset-block CSS shorthand sets both insets on the block axis — `top` and `bottom` in a horizontal writing mode.
   * @example insetY={4} → inset-block: 1rem
   */
  insetY: [
    {
      values: 0,
      styleName: 'inset-block',
      valueFormat: BoxStylesFormatters.Value.rem,
    },
    {
      values: ['auto'] as const,
      styleName: 'inset-block',
    },
    {
      values: Variables.percentages,
      styleName: 'inset-block',
      valueFormat: BoxStylesFormatters.Value.fraction,
    },
    {
      values: Variables.negativePercentages,
      styleName: 'inset-block',
      valueFormat: BoxStylesFormatters.Value.fraction,
    },
    {
      ...percentValue,
      styleName: 'inset-block',
    },
  ],
  /**
   * The inset-inline-start CSS property sets the distance from the edge the text starts at: `left` in a left-to-right writing mode, `right` in a right-to-left one.
   * @example insetStart={4} → inset-inline-start: 1rem
   */
  insetStart: [
    {
      values: 0,
      styleName: 'inset-inline-start',
      valueFormat: BoxStylesFormatters.Value.rem,
    },
    {
      values: ['auto'] as const,
      styleName: 'inset-inline-start',
    },
    {
      values: Variables.percentages,
      valueFormat: BoxStylesFormatters.Value.fraction,
      styleName: 'inset-inline-start',
    },
    {
      values: Variables.negativePercentages,
      valueFormat: BoxStylesFormatters.Value.fraction,
      styleName: 'inset-inline-start',
    },
    {
      ...percentValue,
      styleName: 'inset-inline-start',
    },
  ],
  /**
   * The inset-inline-end CSS property sets the distance from the edge the text ends at: `right` in a left-to-right writing mode, `left` in a right-to-left one.
   * @example insetEnd={4} → inset-inline-end: 1rem
   */
  insetEnd: [
    {
      values: 0,
      styleName: 'inset-inline-end',
      valueFormat: BoxStylesFormatters.Value.rem,
    },
    {
      values: ['auto'] as const,
      styleName: 'inset-inline-end',
    },
    {
      values: Variables.percentages,
      valueFormat: BoxStylesFormatters.Value.fraction,
      styleName: 'inset-inline-end',
    },
    {
      values: Variables.negativePercentages,
      valueFormat: BoxStylesFormatters.Value.fraction,
      styleName: 'inset-inline-end',
    },
    {
      ...percentValue,
      styleName: 'inset-inline-end',
    },
  ],
  /**
   * The `box-sizing` CSS property sets how the total width and height of an element is calculated.
   * @example boxSizing="border-box" → box-sizing: border-box
   */
  boxSizing: [
    {
      values: ['border-box', 'content-box'] as const,
      styleName: 'box-sizing',
    },
  ],
  /**
   * The content-visibility CSS property controls whether or not an element renders its contents at all, along with forcing a strong set of containments, allowing user agents to potentially omit large swathes of layout and rendering work until it becomes needed. It enables the user agent to skip an element's rendering work (including layout and painting) until it is needed — which makes the initial page load much faster.
   * @example contentVisibility="visible" → content-visibility: visible
   */
  contentVisibility: [
    {
      values: ['visible', 'hidden'] as const,
      styleName: 'content-visibility',
    },
  ],
  /**
   * The clip-path CSS property creates a clipping region that sets what part of an element should be shown. Parts that are inside the region are shown, while those outside are hidden. `inset(50%)` clips an element away entirely without removing it from the accessibility tree — the visually-hidden recipe. A `<ClipPath>` in the document is `clipPath="url(#frame)"`.
   * @example clipPath="inset(50%)" → clip-path: inset(50%)
   */
  clipPath: [
    {
      values: ['inset(50%)', 'none'] as const,
      styleName: 'clip-path',
    },
    { ...referenceValues, styleName: 'clip-path' },
  ],
  /**
   * The cursor CSS property sets the mouse cursor, if any, to show when the mouse pointer is over an element.
   * @example cursor="pointer" → cursor: pointer
   */
  cursor: [
    {
      values: [
        'auto',
        'default',
        'none',
        'context-menu',
        'help',
        'pointer',
        'progress',
        'wait',
        'cell',
        'crosshair',
        'text',
        'vertical-text',
        'alias',
        'copy',
        'move',
        'no-drop',
        'not-allowed',
        'e-resize',
        'n-resize',
        'ne-resize',
        'nw-resize',
        's-resize',
        'se-resize',
        'sw-resize',
        'w-resize',
        'ew-resize',
        'ns-resize',
        'nesw-resize',
        'nwse-resize',
        'col-resize',
        'row-resize',
        'all-scroll',
        'zoom-in',
        'zoom-out',
        'grab',
        'grabbing',
      ] as const,
    },
  ],
  /**
   * The `display` CSS property sets whether an element is treated as a block or inline box and the layout used for its children, such as flow layout, grid or flex.
   * @example display="none" → display: none
   */
  display: [
    {
      values: [
        'none',
        'block',
        'inline',
        'inline-block',
        'flex',
        'inline-flex',
        'grid',
        'inline-grid',
        'contents',
        'list-item',
        'table',
        'table-header-group',
        'table-row-group',
        'table-row',
        'table-cell',
      ] as const,
    },
  ],
  /**
   * The `inline` property is a shortcut to transform `block`, `flex` and `grid` value to `inline-block`, `inline-flex` and `inline-grid` respectively.
   * @example inline → display: inline-block
   */
  inline: [
    {
      values: [true] as const,
      styleName: 'display',
      valueFormat: () => 'inline-block',
    },
  ],
  /**
   * Whether a table's cell borders are shared or every cell keeps its own. `collapse` is what makes a
   * bordered table read as one grid rather than as a row of boxes, and it is the value `borderSpacing`
   * has nothing to space.
   * @example borderCollapse="collapse" → border-collapse: collapse
   */
  borderCollapse: [
    {
      values: ['collapse', 'separate'] as const,
      styleName: 'border-collapse',
    },
  ],
  /**
   * The gap between the cells of a `separate` table, on the spacing scale. It is a property of the
   * table, not of a cell: a cell's own `p` is inside its border, this is the space outside it.
   * @example borderSpacing={2} → border-spacing: 0.5rem
   */
  borderSpacing: [
    {
      values: 0,
      styleName: 'border-spacing',
      valueFormat: BoxStylesFormatters.Value.rem,
    },
  ],
  /**
   * `fixed` sizes a table from its own width and its first row rather than from every cell in it, so one
   * long cell cannot widen the column it sits in — and the table lays out in one pass instead of after
   * measuring all of it.
   * @example tableLayout="fixed" → table-layout: fixed
   */
  tableLayout: [
    {
      values: ['auto', 'fixed'] as const,
      styleName: 'table-layout',
    },
  ],
  /**
   * Makes this element a query container, so the `cq` styles inside it answer to *its* width: `container`
   * alone is an anonymous one (the nearest container `cq={{ md: … }}` finds), a name is what
   * `cq={{ 'sidebar/md': … }}` addresses. Both mean `container-type: inline-size` — the only type that
   * does not need the element to have a size of its own. The three props are declared shorthand-first, so
   * `containerType` beside `container` overrides the type and keeps the name.
   * @example container → container-type: inline-size
   */
  container: [
    {
      values: [true] as const,
      styleName: 'container-type',
      valueFormat: () => 'inline-size',
    },
    {
      values: '' as string,
      match: Containers.isContainerName,
      styleName: 'container',
      valueFormat: (value: string) => `${value} / inline-size`,
    },
  ],
  /**
   * The name `cq={{ 'sidebar/md': … }}` addresses. Only a query container answers, so pair it with `containerType`.
   * @example containerName="sidebar" → container-name: sidebar
   */
  containerName: [
    {
      values: '' as string,
      match: Containers.isContainerName,
      styleName: 'container-name',
    },
  ],
  /**
   * What may be asked about this container: `inline-size` (its width, what `container` sets), `size` (both
   * axes — which needs the element to have a block size of its own, or its content stops laying it out),
   * or `normal` to stop being a query container at all.
   * @example containerType="inline-size" → container-type: inline-size
   */
  containerType: [
    {
      values: ['inline-size', 'size', 'normal'] as const,
      styleName: 'container-type',
    },
  ],
  /**
   * Whether `height`/`width` may interpolate to and from a keyword — `auto`, `min-content`, `fit-content`.
   * Inherited, so it belongs on the container and every size inside it animates; Chromium-only for now,
   * and elsewhere a `height: auto` transition simply snaps, which is what it already does today.
   * @example interpolateSize="numeric-only" → interpolate-size: numeric-only
   */
  interpolateSize: [
    {
      styleName: 'interpolate-size',
      values: ['numeric-only', 'allow-keywords'] as const,
    },
  ],
  /**
   * The CSS justify-content property defines how the browser distributes space between and around content items along the main axis of a flex container and the inline axis of grid and multicol containers.
   * @example jc="start" → justify-content: start
   */
  jc: [
    {
      styleName: 'justify-content',
      values: [
        'start',
        'end',
        'flex-start',
        'flex-end',
        'center',
        'left',
        'right',
        'space-between',
        'space-around',
        'space-evenly',
        'stretch',
        ...safeAlignments,
      ] as const,
    },
  ],
  /**
   * The CSS align-items property sets the align-self value on all direct children as a group. In flexbox, it controls the alignment of items on the cross axis. In grid layout, it controls the alignment of items on the block axis within their grid areas.
   * @example ai="stretch" → align-items: stretch
   */
  ai: [
    {
      styleName: 'align-items',
      values: [
        'stretch',
        'flex-start',
        'flex-end',
        'center',
        'baseline',
        'start',
        'end',
        'self-start',
        'self-end',
        ...safeAlignments,
      ] as const,
    },
  ],
  /**
   * The CSS justify-items property sets the `justify-self` of every item in the box: in a grid, where each one sits on the inline axis of its own area.
   * @example justifyItems="normal" → justify-items: normal
   */
  justifyItems: [
    {
      styleName: 'justify-items',
      values: [
        'normal',
        'start',
        'end',
        'center',
        'stretch',
        'baseline',
        'left',
        'right',
        'self-start',
        'self-end',
        ...safeAlignments,
      ] as const,
    },
  ],
  /**
   * The place-items CSS shorthand sets `align-items` and `justify-items` in one declaration — `placeItems="center"` is the whole of grid centring.
   * @example placeItems="normal" → place-items: normal
   */
  placeItems: [
    {
      styleName: 'place-items',
      values: ['normal', 'start', 'end', 'center', 'stretch', 'baseline', 'self-start', 'self-end', ...safeAlignments] as const,
    },
  ],
  /**
   * The place-content CSS shorthand sets `alignContent` and `justifyContent` at once, so one keyword
   * places a grid’s tracks on both axes. It takes the overflow-safe alignments too, and they apply to both.
   * @example placeContent="start" → place-content: start
   */
  placeContent: [
    {
      styleName: 'place-content',
      values: [
        'start',
        'end',
        'flex-start',
        'flex-end',
        'center',
        'space-between',
        'space-around',
        'space-evenly',
        'stretch',
        'baseline',
        ...safeAlignments,
      ] as const,
    },
  ],
  /**
   * The CSS align-content property sets the distribution of space between and around content items along a flexbox's cross axis, or a grid or block-level element's block axis.
   * @example alignContent="flex-start" → align-content: flex-start
   */
  alignContent: [
    {
      styleName: 'align-content',
      values: [
        'flex-start',
        'flex-end',
        'center',
        'space-between',
        'space-around',
        'space-evenly',
        'stretch',
        'start',
        'end',
        'baseline',
        'normal',
        ...safeAlignments,
      ] as const,
    },
  ],
  /**
   * The flex CSS shorthand property sets flex to fit the space available in its flex container.
   * @example flex1 → flex: 1
   */
  flex1: [
    {
      styleName: 'flex',
      values: [true] as const,
      valueFormat: () => '1',
    },
  ],
  /**
   * The flex-direction CSS property sets how flex items are placed in the flex container defining the main axis and the direction (normal or reversed).
   * @example d="row" → flex-direction: row
   */
  d: [
    {
      styleName: 'flex-direction',
      values: ['row', 'row-reverse', 'column', 'column-reverse'] as const,
    },
  ],
  /**
   * The flex-wrap CSS property sets whether flex items are forced onto one line or can wrap onto multiple lines. If wrapping is allowed, it sets the direction that lines are stacked.
   * @example flexWrap="nowrap" → flex-wrap: nowrap
   */
  flexWrap: [
    {
      styleName: 'flex-wrap',
      values: ['nowrap', 'wrap', 'wrap-reverse'] as const,
    },
  ],
  /**
   * The flex-grow CSS property sets the flex grow factor, which specifies how much of the flex container's positive free space, if any, should be assigned to the flex item's main size.
   * @example flexGrow={4} → flex-grow: 4
   */
  flexGrow: [
    {
      styleName: 'flex-grow',
      values: 0,
    },
  ],
  /**
   * The flex-shrink CSS property sets the flex shrink factor of a flex item. If the size of all flex items is larger than the flex container, the flex items can shrink to fit according to their flex-shrink value. Each flex line's negative free space is distributed between the line's flex items that have a flex-shrink value greater than 0.
   * @example flexShrink={4} → flex-shrink: 4
   */
  flexShrink: [
    {
      styleName: 'flex-shrink',
      values: 0,
    },
  ],
  /**
   * The align-self CSS property overrides a grid or flex item's align-items value. In grid, it aligns the item inside the grid area. In flexbox, it aligns the item on the cross axis.
   * @example alignSelf="auto" → align-self: auto
   */
  alignSelf: [
    {
      styleName: 'align-self',
      values: [
        'auto',
        'flex-start',
        'flex-end',
        'center',
        'baseline',
        'stretch',
        'start',
        'end',
        'self-start',
        'self-end',
        'anchor-center',
        ...safeAlignments,
      ] as const,
    },
  ],
  /**
   * The CSS justify-self property sets the way a box is justified inside its alignment container along the appropriate axis.
   * @example justifySelf="auto" → justify-self: auto
   */
  justifySelf: [
    {
      styleName: 'justify-self',
      values: [
        'auto',
        'flex-start',
        'flex-end',
        'center',
        'baseline',
        'stretch',
        'start',
        'end',
        'left',
        'right',
        'self-start',
        'self-end',
        'anchor-center',
        ...safeAlignments,
      ] as const,
    },
  ],
  /**
   * The font-size CSS property sets the size of the font. Its divider is **16**, not the spacing scale’s 4, so the
   * number is the pixel size a reader was reaching for: `fontSize={14}` is `0.875rem`. Font-size-relative units
   * (`em`, `ex`) resolve against it.
   * @example fontSize={14} → font-size: 0.875rem
   */
  fontSize: [
    {
      styleName: 'font-size',
      values: 0,
      valueFormat: (value: number) => `${value / 16}rem`,
    },
    {
      styleName: 'font-size',
      values: ['inherit'] as const,
    },
  ],
  /**
   * The font-style CSS property sets whether a font should be styled with a normal, italic, or oblique face from its font-family.
   * @example fontStyle="italic" → font-style: italic
   */
  fontStyle: [
    {
      styleName: 'font-style',
      values: ['italic', 'normal', 'oblique'] as const,
    },
  ],
  /**
   * The font-weight CSS property sets the weight (or boldness) of the font. The weights available depend on the font-family that is currently set.
   * @example fontWeight={700} → font-weight: 700
   */
  fontWeight: [
    {
      styleName: 'font-weight',
      values: [100, 200, 300, 400, 500, 600, 700, 800, 900] as const,
    },
  ],
  /**
   * The gap CSS shorthand property sets the gaps (also called gutters) between rows and columns. This property applies to multi-column, flex, and grid containers.
   * @example gap={4} → gap: 1rem
   */
  gap: [
    {
      values: 0,
      valueFormat: BoxStylesFormatters.Value.rem,
    },
    {
      ...percentValue,
    },
  ],
  /**
   * The row-gap CSS property sets the size of the gap (gutter) between an element's rows.
   * @example rowGap={4} → row-gap: 1rem
   */
  rowGap: [
    {
      styleName: 'row-gap',
      values: 0,
      valueFormat: BoxStylesFormatters.Value.rem,
    },
    {
      styleName: 'row-gap',
      ...percentValue,
    },
  ],
  /**
   * The column-gap CSS property sets the size of the gap (gutter) between an element's columns.
   * @example columnGap={4} → column-gap: 1rem
   */
  columnGap: [
    {
      styleName: 'column-gap',
      values: 0,
      valueFormat: BoxStylesFormatters.Value.rem,
    },
    {
      styleName: 'column-gap',
      ...percentValue,
    },
  ],
  /**
   * The order CSS property sets the order to lay out an item in a flex or grid container. Items in a container are sorted by ascending order value and then by their source code order. Items not given an explicit order value are assigned the default value of 0.
   * @example order={4} → order: 4
   */
  order: [
    {
      styleName: 'order',
      values: 0,
    },
  ],
  /**
   * The height CSS property specifies the height of an element. By default, the property defines the height of the content area. If box-sizing is set to border-box, however, it instead determines the height of the border area.
   * @example height={4} → height: 1rem
   */
  height: [
    { values: 0, valueFormat: BoxStylesFormatters.Value.rem },
    {
      values: ['fit'] as const,
      valueFormat: () => '100%',
    },
    {
      values: ['fit-screen'] as const,
      valueFormat: () => '100vh',
    },
    {
      values: Variables.percentages,
      valueFormat: BoxStylesFormatters.Value.fraction,
    },
    {
      values: ['auto', 'fit-content', 'max-content', 'min-content'] as const,
    },
    {
      ...percentValue,
    },
  ],
  /**
   * The min-height CSS property sets the minimum height of an element. It prevents the used value of the height property from becoming smaller than the value specified for min-height.
   * @example minHeight={4} → min-height: 1rem
   */
  minHeight: [
    { styleName: 'min-height', values: 0, valueFormat: BoxStylesFormatters.Value.rem },
    {
      styleName: 'min-height',
      values: ['fit'] as const,
      valueFormat: () => '100%',
    },
    {
      styleName: 'min-height',
      values: ['fit-screen'] as const,
      valueFormat: () => '100vh',
    },
    {
      styleName: 'min-height',
      values: Variables.percentages,
      valueFormat: BoxStylesFormatters.Value.fraction,
    },
    {
      styleName: 'min-height',
      values: ['auto', 'fit-content', 'max-content', 'min-content'] as const,
    },
    {
      styleName: 'min-height',
      ...percentValue,
    },
  ],
  /**
   * The max-height CSS property sets the maximum height of an element. It prevents the used value of the height property from becoming larger than the value specified for max-height.
   * @example maxHeight={4} → max-height: 1rem
   */
  maxHeight: [
    { styleName: 'max-height', values: 0, valueFormat: BoxStylesFormatters.Value.rem },
    {
      styleName: 'max-height',
      values: ['fit'] as const,
      valueFormat: () => '100%',
    },
    {
      styleName: 'max-height',
      values: ['fit-screen'] as const,
      valueFormat: () => '100vh',
    },
    {
      styleName: 'max-height',
      values: Variables.percentages,
      valueFormat: BoxStylesFormatters.Value.fraction,
    },
    {
      styleName: 'max-height',
      values: ['auto', 'fit-content', 'max-content', 'min-content'] as const,
    },
    {
      styleName: 'max-height',
      ...percentValue,
    },
  ],
  /**
   * The width CSS property sets an element's width. By default, it sets the width of the content area, but if box-sizing is set to border-box, it sets the width of the border area.
   * @example width={4} → width: 1rem
   */
  width: [
    { values: 0, valueFormat: BoxStylesFormatters.Value.rem },
    {
      values: ['fit'] as const,
      valueFormat: () => '100%',
    },
    {
      values: ['fit-screen'] as const,
      valueFormat: () => '100vw',
    },
    {
      values: Variables.percentages,
      valueFormat: BoxStylesFormatters.Value.fraction,
    },
    {
      values: ['auto', 'fit-content', 'max-content', 'min-content'] as const,
    },
    {
      ...percentValue,
    },
  ],
  /**
   * The min-width CSS property sets the minimum width of an element. It prevents the used value of the width property from becoming smaller than the value specified for min-width.
   * @example minWidth={4} → min-width: 1rem
   */
  minWidth: [
    { styleName: 'min-width', values: 0, valueFormat: BoxStylesFormatters.Value.rem },
    {
      styleName: 'min-width',
      values: ['fit'] as const,
      valueFormat: () => '100%',
    },
    {
      styleName: 'min-width',
      values: ['fit-screen'] as const,
      valueFormat: () => '100vw',
    },
    {
      styleName: 'min-width',
      values: Variables.percentages,
      valueFormat: BoxStylesFormatters.Value.fraction,
    },
    {
      styleName: 'min-width',
      values: ['auto', 'fit-content', 'max-content', 'min-content'] as const,
    },
    {
      styleName: 'min-width',
      ...percentValue,
    },
  ],
  /**
   * The max-width CSS property sets the maximum width of an element. It prevents the used value of the width property from becoming larger than the value specified by max-width.
   * @example maxWidth={4} → max-width: 1rem
   */
  maxWidth: [
    { styleName: 'max-width', values: 0, valueFormat: BoxStylesFormatters.Value.rem },
    {
      styleName: 'max-width',
      values: ['fit'] as const,
      valueFormat: () => '100%',
    },
    {
      styleName: 'max-width',
      values: ['fit-screen'] as const,
      valueFormat: () => '100vw',
    },
    {
      styleName: 'max-width',
      values: Variables.percentages,
      valueFormat: BoxStylesFormatters.Value.fraction,
    },
    {
      styleName: 'max-width',
      values: ['auto', 'fit-content', 'max-content', 'min-content'] as const,
    },
    {
      styleName: 'max-width',
      ...percentValue,
    },
  ],
  /**
   * The aspect-ratio CSS property sets a preferred ratio for the box, which the sizing props then fill in
   * one axis of: `aspectRatio="video" width="fit"` is a 16/9 embed. Two names (`square`, `video`), a ratio
   * written compactly (`'4/3'`), or a number — the only prop taking both a fraction string and a division.
   * @example aspectRatio="video" → aspect-ratio: 16 / 9
   */
  aspectRatio: [
    {
      styleName: 'aspect-ratio',
      values: ['auto', 'square', 'video'] as const,
      valueFormat: (value: string) => Variables.aspectRatios[value] ?? value,
    },
    {
      styleName: 'aspect-ratio',
      ...ratioValue,
    },
    {
      styleName: 'aspect-ratio',
      values: 0,
    },
  ],
  /**
   * The letter-spacing CSS property sets the horizontal spacing behavior between text characters. This value is added to the natural spacing between characters while rendering the text. Positive values of letter-spacing causes characters to spread farther apart, while negative values of letter-spacing bring characters closer together.
   * @example letterSpacing={4} → letter-spacing: 4px
   */
  letterSpacing: [
    {
      styleName: 'letter-spacing',
      values: 0,
      valueFormat: BoxStylesFormatters.Value.px,
    },
  ],
  /**
   * The line-height CSS property sets the height of a line box. Direct **pixels** here — `lineHeight={24}` is
   * `24px`, not the unitless multiple of the font size CSS takes as well; `"font-size"` is that multiple, at 1.
   * @example lineHeight={24} → line-height: 24px
   */
  lineHeight: [
    {
      styleName: 'line-height',
      values: 0,
      valueFormat: BoxStylesFormatters.Value.px,
    },
    {
      styleName: 'line-height',
      values: ['font-size'] as const,
      valueFormat: () => '1',
    },
  ],
  /**
   * The list-style CSS shorthand property allows you to set all the list style properties at once.
   * @example listStyle="disc" → list-style: disc
   */
  listStyle: [
    {
      styleName: 'list-style',
      values: ['disc', 'circle', 'square', 'decimal', 'inside', 'outside', 'none'] as const,
    },
  ],
  /**
   * The margin CSS shorthand property sets the margin area on all four sides of an element.
   * @example m={4} → margin: 1rem
   */
  m: [
    {
      values: 0,
      styleName: 'margin',
      valueFormat: BoxStylesFormatters.Value.rem,
    },
    {
      values: ['auto'] as const,
      styleName: 'margin',
    },
    {
      styleName: 'margin',
      values: Variables.percentages,
      valueFormat: BoxStylesFormatters.Value.fraction,
    },
    {
      styleName: 'margin',
      values: Variables.negativePercentages,
      valueFormat: BoxStylesFormatters.Value.fraction,
    },
    {
      ...percentValue,
      styleName: 'margin',
    },
  ],
  /**
   * The margin-inline CSS shorthand property is a shorthand property that defines both the logical inline start and end margins of an element, which maps to physical margins depending on the element's writing mode, directionality, and text orientation.
   * @example mx={4} → margin-inline: 1rem
   */
  mx: [
    {
      values: 0,
      styleName: 'margin-inline',
      valueFormat: BoxStylesFormatters.Value.rem,
    },
    {
      values: ['auto'] as const,
      styleName: 'margin-inline',
    },
    {
      styleName: 'margin-inline',
      values: Variables.percentages,
      valueFormat: BoxStylesFormatters.Value.fraction,
    },
    {
      styleName: 'margin-inline',
      values: Variables.negativePercentages,
      valueFormat: BoxStylesFormatters.Value.fraction,
    },
    {
      ...percentValue,
      styleName: 'margin-inline',
    },
  ],
  /**
   * The margin-block CSS shorthand property defines the logical block start and end margins of an element, which maps to physical margins depending on the element's writing mode, directionality, and text orientation.
   * @example my={4} → margin-block: 1rem
   */
  my: [
    {
      values: 0,
      styleName: 'margin-block',
      valueFormat: BoxStylesFormatters.Value.rem,
    },
    {
      values: ['auto'] as const,
      styleName: 'margin-block',
    },
    {
      styleName: 'margin-block',
      values: Variables.percentages,
      valueFormat: BoxStylesFormatters.Value.fraction,
    },
    {
      styleName: 'margin-block',
      values: Variables.negativePercentages,
      valueFormat: BoxStylesFormatters.Value.fraction,
    },
    {
      ...percentValue,
      styleName: 'margin-block',
    },
  ],
  /**
   * The margin-top CSS property sets the margin area on the top of an element. A positive value places it farther from its neighbors, while a negative value places it closer.
   * @example mt={4} → margin-top: 1rem
   */
  mt: [
    {
      values: 0,
      styleName: 'margin-top',
      valueFormat: BoxStylesFormatters.Value.rem,
    },
    {
      values: ['auto'] as const,
      styleName: 'margin-top',
    },
    {
      values: Variables.percentages,
      valueFormat: BoxStylesFormatters.Value.fraction,
      styleName: 'margin-top',
    },
    {
      values: Variables.negativePercentages,
      valueFormat: BoxStylesFormatters.Value.fraction,
      styleName: 'margin-top',
    },
    {
      ...percentValue,
      styleName: 'margin-top',
    },
  ],
  /**
   * The margin-right CSS property sets the margin area on the right side of an element. A positive value places it farther from its neighbors, while a negative value places it closer.
   * @example mr={4} → margin-right: 1rem
   */
  mr: [
    {
      values: 0,
      styleName: 'margin-right',
      valueFormat: BoxStylesFormatters.Value.rem,
    },
    {
      values: ['auto'] as const,
      styleName: 'margin-right',
    },
    {
      values: Variables.percentages,
      valueFormat: BoxStylesFormatters.Value.fraction,
      styleName: 'margin-right',
    },
    {
      values: Variables.negativePercentages,
      valueFormat: BoxStylesFormatters.Value.fraction,
      styleName: 'margin-right',
    },
    {
      ...percentValue,
      styleName: 'margin-right',
    },
  ],
  /**
   * The margin-bottom CSS property sets the margin area on the bottom of an element. A positive value places it farther from its neighbors, while a negative value places it closer.
   * @example mb={4} → margin-bottom: 1rem
   */
  mb: [
    {
      values: 0,
      styleName: 'margin-bottom',
      valueFormat: BoxStylesFormatters.Value.rem,
    },
    {
      values: ['auto'] as const,
      styleName: 'margin-bottom',
    },
    {
      values: Variables.percentages,
      valueFormat: BoxStylesFormatters.Value.fraction,
      styleName: 'margin-bottom',
    },
    {
      values: Variables.negativePercentages,
      valueFormat: BoxStylesFormatters.Value.fraction,
      styleName: 'margin-bottom',
    },
    {
      ...percentValue,
      styleName: 'margin-bottom',
    },
  ],
  /**
   * The margin-left CSS property sets the margin area on the left side of an element. A positive value places it farther from its neighbors, while a negative value places it closer.
   * @example ml={4} → margin-left: 1rem
   */
  ml: [
    {
      values: 0,
      styleName: 'margin-left',
      valueFormat: BoxStylesFormatters.Value.rem,
    },
    {
      values: ['auto'] as const,
      styleName: 'margin-left',
    },
    {
      values: Variables.percentages,
      valueFormat: BoxStylesFormatters.Value.fraction,
      styleName: 'margin-left',
    },
    {
      values: Variables.negativePercentages,
      valueFormat: BoxStylesFormatters.Value.fraction,
      styleName: 'margin-left',
    },
    {
      ...percentValue,
      styleName: 'margin-left',
    },
  ],
  /**
   * The margin-inline-start CSS property sets the margin on the side the text starts from: `ml` in a left-to-right writing mode, `mr` in a right-to-left one.
   * @example ms={4} → margin-inline-start: 1rem
   */
  ms: [
    {
      values: 0,
      styleName: 'margin-inline-start',
      valueFormat: BoxStylesFormatters.Value.rem,
    },
    {
      values: ['auto'] as const,
      styleName: 'margin-inline-start',
    },
    {
      values: Variables.percentages,
      valueFormat: BoxStylesFormatters.Value.fraction,
      styleName: 'margin-inline-start',
    },
    {
      values: Variables.negativePercentages,
      valueFormat: BoxStylesFormatters.Value.fraction,
      styleName: 'margin-inline-start',
    },
    {
      ...percentValue,
      styleName: 'margin-inline-start',
    },
  ],
  /**
   * The margin-inline-end CSS property sets the margin on the side the text ends at: `mr` in a left-to-right writing mode, `ml` in a right-to-left one.
   * @example me={4} → margin-inline-end: 1rem
   */
  me: [
    {
      values: 0,
      styleName: 'margin-inline-end',
      valueFormat: BoxStylesFormatters.Value.rem,
    },
    {
      values: ['auto'] as const,
      styleName: 'margin-inline-end',
    },
    {
      values: Variables.percentages,
      valueFormat: BoxStylesFormatters.Value.fraction,
      styleName: 'margin-inline-end',
    },
    {
      values: Variables.negativePercentages,
      valueFormat: BoxStylesFormatters.Value.fraction,
      styleName: 'margin-inline-end',
    },
    {
      ...percentValue,
      styleName: 'margin-inline-end',
    },
  ],
  /**
   * The padding CSS shorthand property sets the padding area on all four sides of an element at once.
   * @example p={4} → padding: 1rem
   */
  p: [
    {
      values: 0,
      styleName: 'padding',
      valueFormat: BoxStylesFormatters.Value.rem,
    },
    {
      values: Variables.percentages,
      valueFormat: BoxStylesFormatters.Value.fraction,
      styleName: 'padding',
    },
    {
      ...percentValue,
      styleName: 'padding',
    },
  ],
  /**
   * The padding-inline CSS shorthand property defines the logical inline start and end padding of an element, which maps to physical padding properties depending on the element's writing mode, directionality, and text orientation.
   * @example px={4} → padding-inline: 1rem
   */
  px: [
    {
      values: 0,
      styleName: 'padding-inline',
      valueFormat: BoxStylesFormatters.Value.rem,
    },
    {
      values: Variables.percentages,
      valueFormat: BoxStylesFormatters.Value.fraction,
      styleName: 'padding-inline',
    },
    {
      ...percentValue,
      styleName: 'padding-inline',
    },
  ],
  /**
   * The padding-block CSS shorthand property defines the logical block start and end padding of an element, which maps to physical padding properties depending on the element's writing mode, directionality, and text orientation.
   * @example py={4} → padding-block: 1rem
   */
  py: [
    {
      values: 0,
      styleName: 'padding-block',
      valueFormat: BoxStylesFormatters.Value.rem,
    },
    {
      values: Variables.percentages,
      valueFormat: BoxStylesFormatters.Value.fraction,
      styleName: 'padding-block',
    },
    {
      ...percentValue,
      styleName: 'padding-block',
    },
  ],
  /**
   * The padding-top CSS property sets the height of the padding area on the top of an element.
   * @example pt={4} → padding-top: 1rem
   */
  pt: [
    {
      values: 0,
      styleName: 'padding-top',
      valueFormat: BoxStylesFormatters.Value.rem,
    },
    {
      values: Variables.percentages,
      valueFormat: BoxStylesFormatters.Value.fraction,
      styleName: 'padding-top',
    },
    {
      ...percentValue,
      styleName: 'padding-top',
    },
  ],
  /**
   * The padding-right CSS property sets the width of the padding area on the right of an element.
   * @example pr={4} → padding-right: 1rem
   */
  pr: [
    {
      values: 0,
      styleName: 'padding-right',
      valueFormat: BoxStylesFormatters.Value.rem,
    },
    {
      values: Variables.percentages,
      valueFormat: BoxStylesFormatters.Value.fraction,
      styleName: 'padding-right',
    },
    {
      ...percentValue,
      styleName: 'padding-right',
    },
  ],
  /**
   * The padding-bottom CSS property sets the height of the padding area on the bottom of an element.
   * @example pb={4} → padding-bottom: 1rem
   */
  pb: [
    {
      values: 0,
      styleName: 'padding-bottom',
      valueFormat: BoxStylesFormatters.Value.rem,
    },
    {
      values: Variables.percentages,
      valueFormat: BoxStylesFormatters.Value.fraction,
      styleName: 'padding-bottom',
    },
    {
      ...percentValue,
      styleName: 'padding-bottom',
    },
  ],
  /**
   * The padding-left CSS property sets the width of the padding area to the left of an element.
   * @example pl={4} → padding-left: 1rem
   */
  pl: [
    {
      values: 0,
      styleName: 'padding-left',
      valueFormat: BoxStylesFormatters.Value.rem,
    },
    {
      values: Variables.percentages,
      valueFormat: BoxStylesFormatters.Value.fraction,
      styleName: 'padding-left',
    },
    {
      ...percentValue,
      styleName: 'padding-left',
    },
  ],
  /**
   * The padding-inline-start CSS property sets the padding on the side the text starts from: `pl` in a left-to-right writing mode, `pr` in a right-to-left one.
   * @example ps={4} → padding-inline-start: 1rem
   */
  ps: [
    {
      values: 0,
      styleName: 'padding-inline-start',
      valueFormat: BoxStylesFormatters.Value.rem,
    },
    {
      values: Variables.percentages,
      valueFormat: BoxStylesFormatters.Value.fraction,
      styleName: 'padding-inline-start',
    },
    {
      ...percentValue,
      styleName: 'padding-inline-start',
    },
  ],
  /**
   * The padding-inline-end CSS property sets the padding on the side the text ends at: `pr` in a left-to-right writing mode, `pl` in a right-to-left one.
   * @example pe={4} → padding-inline-end: 1rem
   */
  pe: [
    {
      values: 0,
      styleName: 'padding-inline-end',
      valueFormat: BoxStylesFormatters.Value.rem,
    },
    {
      values: Variables.percentages,
      valueFormat: BoxStylesFormatters.Value.fraction,
      styleName: 'padding-inline-end',
    },
    {
      ...percentValue,
      styleName: 'padding-inline-end',
    },
  ],
  /**
   * The object-fit CSS property sets how the content of a replaced element, such as an <img> or <video>, should be resized to fit its container.
   * @example objectFit="fill" → object-fit: fill
   */
  objectFit: [
    {
      styleName: 'object-fit',
      values: ['fill', 'contain', 'cover', 'scale-down', 'none'] as const,
    },
  ],
  /**
   * The opacity CSS property sets the opacity of an element. Opacity is the degree to which content behind an element is hidden, and is the opposite of transparency.
   * @example opacity={0.5} → opacity: 0.5
   */
  opacity: [
    {
      values: opacityValues,
    },
  ],
  /**
   * The CSS outline-width property sets the thickness of an element's outline. An outline is a line that is drawn around an element, outside the border. A width alone is enough: the style comes with it, and `outlineStyle` — declared after this — is what changes it.
   * @example outline={4} → outline-width: 4px; outline-style: solid
   */
  outline: [
    {
      // A width with no style draws nothing (`outline-style` starts at `none`), and the UA only supplies
      // a style for `:focus` — which is why a `highlighted` variant's outline was invisible while the
      // class, the rule and the tests all looked right (bug #54).
      values: 0,
      declarations: (value) => `outline-width:${BoxStylesFormatters.Value.px(value as number)};outline-style:solid`,
    },
  ],
  /**
   * The outline-style CSS property sets the style of an element's outline. An outline is a line that is drawn around an element, outside the border.
   * @example outlineStyle="solid" → outline-style: solid
   */
  outlineStyle: [
    {
      styleName: 'outline-style',
      values: ['solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset', 'none', 'hidden'] as const,
    },
  ],
  /**
   * The outline-offset CSS property sets the amount of space between an outline and the edge or border of an element.
   * @example outlineOffset={4} → outline-offset: 4px
   */
  outlineOffset: [
    {
      styleName: 'outline-offset',
      values: 0,
      valueFormat: BoxStylesFormatters.Value.px,
    },
  ],
  /**
   * The overflow CSS shorthand property sets the desired behavior when content does not fit in the element's padding box (overflows) in the horizontal and/or vertical direction.
   * @example overflow="auto" → overflow: auto
   */
  overflow: [
    {
      values: ['auto', 'hidden', 'scroll', 'visible'] as const,
    },
  ],
  /**
   * The overflow-x CSS property sets what shows when content overflows a block-level element's left and right edges. This may be nothing, a scroll bar, or the overflow content. This property may also be set by using the overflow shorthand property.
   * @example overflowX="auto" → overflow-x: auto
   */
  overflowX: [
    {
      styleName: 'overflow-x',
      values: ['auto', 'hidden', 'scroll', 'visible'] as const,
    },
  ],
  /**
   * The overflow-y CSS property sets what shows when content overflows a block-level element's top and bottom edges. This may be nothing, a scroll bar, or the overflow content. This property may also be set by using the overflow shorthand property.
   * @example overflowY="auto" → overflow-y: auto
   */
  overflowY: [
    {
      styleName: 'overflow-y',
      values: ['auto', 'hidden', 'scroll', 'visible'] as const,
    },
  ],
  /**
   * The pointer-events CSS property sets under what circumstances (if any) a particular graphic element can become the target of pointer events.
   * @example pointerEvents="none" → pointer-events: none
   */
  pointerEvents: [
    {
      styleName: 'pointer-events',
      values: ['none', 'auto', 'all'] as const,
    },
  ],
  /**
   * The resize CSS property sets whether an element is resizable, and if so, in which directions.
   * @example resize="none" → resize: none
   */
  resize: [
    {
      values: ['none', 'both', 'horizontal', 'vertical', 'block', 'inline'] as const,
    },
  ],
  /**
   * The rotate CSS property allows you to specify rotation transforms individually and independently of the transform property. This maps better to typical user interface usage, and saves having to remember the exact order of transform functions to specify in the transform property.
   * @example rotate={45} → rotate: 45deg
   */
  rotate: [
    {
      values: [0, 45, 90, 135, 180, 270, 360, -45, -90, -135, -180, -270] as const,
      valueFormat: (value: number) => `${value}deg`,
    },
  ],
  /**
   * Mirrors the element: `xAxis` flips it left to right, `yAxis` top to bottom. It writes the `scale`
   * property, which is what `scale` writes too — use one of them. `rtl={{ flip: 'xAxis' }}` is the arrow
   * that has to point the other way in a right-to-left reading.
   * @example flip="xAxis" → scale: -1 1
   */
  flip: [
    {
      styleName: 'scale',
      values: ['xAxis', 'yAxis'] as const,
      valueFormat: (value: string) => (value === 'xAxis' ? '-1 1' : '1 -1'),
    },
  ],
  /**
   * The scale CSS property lets you specify scale transforms individually and independently of the transform property: `scale={1.05}` is 105% in both axes. Declared after `flip`, which writes the same property — use one or the other, not both.
   * @example scale={4} → scale: 4
   */
  scale: [
    {
      values: 0,
    },
  ],
  /**
   * The text-align CSS property sets the horizontal alignment of the inline-level content inside a block
   * element or table-cell box. `start`/`end` follow the text direction where `left`/`right` do not.
   * @example textAlign="left" → text-align: left
   */
  textAlign: [
    {
      styleName: 'text-align',
      values: ['left', 'right', 'start', 'end', 'center', 'justify'] as const,
    },
  ],
  /**
   * The text-decoration shorthand CSS property sets the appearance of decorative lines on text. It is a shorthand for text-decoration-line, text-decoration-color, text-decoration-style, and the newer text-decoration-thickness property.
   * @example textDecoration="none" → text-decoration: none
   */
  textDecoration: [
    {
      styleName: 'text-decoration',
      values: ['none', 'underline', 'overline', 'line-through'] as const,
    },
  ],
  /**
   * The text-overflow CSS property sets how hidden overflow content is signaled to users. It can be clipped, display an ellipsis ('…'), or display a custom string.
   * @example textOverflow="clip" → text-overflow: clip
   */
  textOverflow: [
    {
      styleName: 'text-overflow',
      values: ['clip', 'ellipsis'] as const,
    },
  ],
  /**
   * The text-transform CSS property specifies how to capitalize an element's text. It can be used to make text appear in all-uppercase or all-lowercase, or with each word capitalized. It also can help improve legibility for ruby.
   * @example textTransform="none" → text-transform: none
   */
  textTransform: [
    {
      styleName: 'text-transform',
      values: ['none', 'capitalize', 'lowercase', 'uppercase'] as const,
    },
  ],
  /**
   * The text-wrap CSS shorthand property controls how text inside an element is wrapped. The different values provide:
   * @example textWrap="wrap" → text-wrap: wrap
   */
  textWrap: [
    {
      styleName: 'text-wrap',
      values: ['wrap', 'nowrap', 'balance', 'pretty'] as const,
    },
  ],
  /**
   * What a transition applies to: `all` (what the base class already does), `none`, or one of the property groups — `colors`, `opacity`, `shadow`, `transform`, `size`, `filter`.
   * @example transition="colors" → transition-property: color, background-color, border-color, outline-color, text-decoration-color, fi…
   */
  transition: [
    {
      styleName: 'transition-property',
      values: ['none', 'all', ...Animations.propertyGroupNames] as const,
      valueFormat: (value: string) => Animations.propertyGroups[value as Animations.PropertyGroup] ?? value,
    },
  ],
  /**
   * Whether the properties that cannot be interpolated transition at all: `display`, `overlay`,
   * `content-visibility`. `allow-discrete` flips them at the *end* of the transition instead of the start,
   * which is what keeps an element in the DOM long enough to animate out of it.
   * @example transitionBehavior="normal" → transition-behavior: normal
   */
  transitionBehavior: [
    {
      styleName: 'transition-behavior',
      values: ['normal', 'allow-discrete'] as const,
    },
  ],
  /**
   * The transition-delay CSS property specifies the duration to wait before starting a property's transition effect when its value changes. Milliseconds.
   * @example transitionDelay={150} → transition-delay: 150ms
   */
  transitionDelay: [
    {
      styleName: 'transition-delay',
      values: 0,
      valueFormat: BoxStylesFormatters.Value.ms,
    },
  ],
  /**
   * How long a transition takes. Milliseconds, like every other time here — or a spring name, which is
   * that spring's settling time in `--transitionTime` units, so a spring stops under reduced motion.
   * @example transitionDuration={200} → transition-duration: 200ms
   */
  transitionDuration: [
    {
      styleName: 'transition-duration',
      values: 0,
      valueFormat: BoxStylesFormatters.Value.ms,
    },
    {
      styleName: 'transition-duration',
      values: [...Animations.springNames] as const,
      valueFormat: (value: string) => Animations.springDuration(value as Animations.SpringName),
    },
  ],
  /**
   * How a transition gets from one value to the other: a keyword, one of the four sampled springs
   * (`spring`, `spring-gentle`, `spring-bouncy`, `spring-snappy`), or a curve — `cubic-bezier()`,
   * `steps()` and `linear()` are values. A spring's other half is `transitionDuration`, which takes the
   * same four names.
   * @example transitionTimingFunction="linear" → transition-timing-function: linear
   */
  transitionTimingFunction: [
    {
      styleName: 'transition-timing-function',
      values: ['linear', 'ease', 'ease-in', 'ease-in-out', 'ease-out', 'step-start', 'step-end'] as const,
    },
    {
      values: [...Animations.springNames] as const,
      styleName: 'transition-timing-function',
      declarations: (value) =>
        Animations.easingDeclarations('transition-timing-function', Animations.springEasing(value as Animations.SpringName)),
    },
    {
      values: Animations.timingFunction,
      match: Animations.isTimingFunction,
      styleName: 'transition-timing-function',
      declarations: (value) => Animations.easingDeclarations('transition-timing-function', value as string),
    },
  ],
  /**
   * The will-change CSS property warns the browser that a property is about to change, so it can promote
   * the element first instead of mid-animation. A hint with a real cost — a promoted layer holds memory
   * and can force text off subpixel rendering — so it belongs on the few elements that animate, not on a list.
   * @example willChange="transform" → will-change: transform
   */
  willChange: [
    {
      styleName: 'will-change',
      values: ['auto', 'scroll-position', 'contents', 'transform', 'opacity', 'filter'] as const,
    },
  ],
  /**
   * The user-select CSS property controls whether the user can select text. This doesn't have any effect on content loaded as part of a browser's user interface (its chrome), except in textboxes.
   * @example userSelect="none" → user-select: none
   */
  userSelect: [
    {
      styleName: 'user-select',
      // `contain` is deliberately absent: no engine implements it — Chrome computes it to `auto`, measured —
      // and a typed value that does nothing is the one promise this library must not make.
      values: ['none', 'auto', 'text', 'all'] as const,
    },
  ],
  /**
   * The visibility CSS property shows or hides an element without changing the layout of a document. The property can also hide rows or columns in a <table>.
   * @example visibility="visible" → visibility: visible
   */
  visibility: [
    {
      styleName: 'visibility',
      values: ['visible', 'hidden', 'collapse'] as const,
    },
  ],
  /**
   * The white-space CSS property sets how white space inside an element is handled.
   * @example whiteSpace="break-spaces" → white-space: break-spaces
   */
  whiteSpace: [
    {
      styleName: 'white-space',
      values: ['break-spaces', 'normal', 'nowrap', 'pre', 'pre-line', 'pre-wrap'] as const,
    },
  ],
  /**
   * The z-index CSS property sets the z-order of a positioned element and its descendants or flex and grid items. Overlapping elements with a larger z-index cover those with a smaller one.
   * @example zIndex={1} → z-index: 1
   */
  zIndex: [
    {
      styleName: 'z-index',
      values: [1, 2, 3, 4, 5, 10, 11, 12, 13, 14, 15, 100, 101, 102, 103, 104, 105, 1000, 1001, 1002, 1003, 1004, 1005] as const,
    },
  ],
  /**
   * The grid-template-columns CSS property defines the line names and track sizing functions of the grid columns.
   * @example gridTemplateColumns={4} → grid-template-columns: repeat(4,minmax(0,1fr))
   */
  gridTemplateColumns: [
    {
      styleName: 'grid-template-columns',
      values: 0,
      valueFormat: (value: number) => `repeat(${value},minmax(0,1fr))`,
    },
    {
      styleName: 'grid-template-columns',
      values: ['subgrid'] as const,
    },
  ],
  /**
   * The grid-template-rows CSS property defines the line names and track sizing functions of the grid rows.
   * @example gridTemplateRows={4} → grid-template-rows: repeat(4,minmax(0,1fr))
   */
  gridTemplateRows: [
    {
      styleName: 'grid-template-rows',
      values: 0,
      valueFormat: (value: number) => `repeat(${value},minmax(0,1fr))`,
    },
    {
      styleName: 'grid-template-rows',
      values: ['subgrid'] as const,
    },
  ],
  /**
   * The grid-column CSS shorthand property specifies a grid item's size and location within a grid column by contributing a line, a span, or nothing (automatic) to its grid placement, thereby specifying the inline-start and inline-end edge of its grid area.
   * @example gridColumn={4} → grid-column: span 4/span 4
   */
  gridColumn: [
    {
      styleName: 'grid-column',
      values: 0,
      valueFormat: (value: number) => `span ${value}/span ${value}`,
    },
    {
      styleName: 'grid-column',
      values: ['full-row'] as const,
      valueFormat: () => '1/-1',
    },
  ],
  /**
   * The grid-column-start CSS property specifies a grid item's start position within the grid column by contributing a line, a span, or nothing (automatic) to its grid placement. This start position defines the block-start edge of the grid area.
   * @example gridColumnStart={4} → grid-column-start: 4
   */
  gridColumnStart: [
    {
      styleName: 'grid-column-start',
      values: 0,
    },
  ],
  /**
   * The grid-column-end CSS property specifies a grid item's end position within the grid column by contributing a line, a span, or nothing (automatic) to its grid placement, thereby specifying the block-end edge of its grid area.
   * @example gridColumnEnd={4} → grid-column-end: 4
   */
  gridColumnEnd: [
    {
      styleName: 'grid-column-end',
      values: 0,
    },
  ],
  /**
   * The grid-row CSS shorthand property specifies a grid item's size and location within a grid row by contributing a line, a span, or nothing (automatic) to its grid placement, thereby specifying the inline-start and inline-end edge of its grid area.
   * @example gridRow={4} → grid-row: span 4/span 4
   */
  gridRow: [
    {
      styleName: 'grid-row',
      values: 0,
      valueFormat: (value: number) => `span ${value}/span ${value}`,
    },
    {
      styleName: 'grid-row',
      values: ['full-column'] as const,
      valueFormat: () => '1/-1',
    },
  ],
  /**
   * The grid-row-start CSS property specifies a grid item's start position within the grid row by contributing a line, a span, or nothing (automatic) to its grid placement, thereby specifying the inline-start edge of its grid area.
   * @example gridRowStart={4} → grid-row-start: 4
   */
  gridRowStart: [
    {
      styleName: 'grid-row-start',
      values: 0,
    },
  ],
  /**
   * The grid-row-end CSS property specifies a grid item's end position within the grid row by contributing a line, a span, or nothing (automatic) to its grid placement, thereby specifying the inline-end edge of its grid area.
   * @example gridRowEnd={4} → grid-row-end: 4
   */
  gridRowEnd: [
    {
      styleName: 'grid-row-end',
      values: 0,
    },
  ],
  /**
   * The color CSS property sets the foreground color value of an element's text and text decorations, and sets the currentcolor value.
   * @example color="sky-500" → color: var(--sky-500)
   */
  color: [
    {
      values: Variables.colorValues,
      valueFormat: (value, getVariableValue) => getVariableValue(value),
    },
    {
      // Every colour prop takes the system colours too, unformatted: they are keywords rather than
      // tokens, and they are the only palette a forced-colors mode keeps (bug #65).
      values: Variables.systemColorValues,
    },
    colorAlphaValue,
  ],
  /**
   * The background-color CSS property sets the background color of an element.
   * @example bgColor="sky-500" → background-color: var(--sky-500)
   */
  bgColor: [
    {
      values: Variables.colorValues,
      valueFormat: (value, getVariableValue) => getVariableValue(value),
      styleName: 'background-color',
    },
    {
      values: Variables.systemColorValues,
      styleName: 'background-color',
    },
    { ...colorAlphaValue, styleName: 'background-color' },
  ],
  /**
   * The border-color shorthand CSS property sets the color of an element's border.
   * @example borderColor="sky-500" → border-color: var(--sky-500)
   */
  borderColor: [
    {
      values: Variables.colorValues,
      valueFormat: (value, getVariableValue) => getVariableValue(value),
      styleName: 'border-color',
    },
    {
      values: Variables.systemColorValues,
      styleName: 'border-color',
    },
    { ...colorAlphaValue, styleName: 'border-color' },
  ],
  /**
   * The outline-color CSS property sets the color of an element's outline.
   * @example outlineColor="sky-500" → outline-color: var(--sky-500)
   */
  outlineColor: [
    {
      values: Variables.colorValues,
      valueFormat: (value, getVariableValue) => getVariableValue(value),
      styleName: 'outline-color',
    },
    {
      values: Variables.systemColorValues,
      styleName: 'outline-color',
    },
    { ...colorAlphaValue, styleName: 'outline-color' },
  ],
  /**
   * The accent-color CSS property tints the parts of a native control the page does not draw: a checkbox's
   * tick, a radio's dot, a range track, a progress bar. The one way to brand them without `appearance="none"`
   * and a rebuild, and it inherits — set it once on a form.
   * @example accentColor="sky-500" → accent-color: var(--sky-500)
   */
  accentColor: [
    {
      values: Variables.colorValues,
      valueFormat: (value, getVariableValue) => getVariableValue(value),
      styleName: 'accent-color',
    },
    {
      values: Variables.systemColorValues,
      styleName: 'accent-color',
    },
    { ...colorAlphaValue, styleName: 'accent-color' },
  ],
  /**
   * The caret-color CSS property sets the colour of the insertion caret in a text field or any editable element.
   * @example caretColor="sky-500" → caret-color: var(--sky-500)
   */
  caretColor: [
    {
      values: Variables.colorValues,
      valueFormat: (value, getVariableValue) => getVariableValue(value),
      styleName: 'caret-color',
    },
    {
      values: Variables.systemColorValues,
      styleName: 'caret-color',
    },
    { ...colorAlphaValue, styleName: 'caret-color' },
  ],
  /**
   * The color-scheme CSS property tells the browser which schemes the element is *built* for, and native
   * UI follows it: scrollbars, form controls, the spellcheck underline, `Canvas`/`CanvasText`. A dark theme
   * that leaves this alone gets light scrollbars over its dark page — `Box.Theme` sets it on the root.
   * @example colorScheme="normal" → color-scheme: normal
   */
  colorScheme: [
    {
      styleName: 'color-scheme',
      values: ['normal', 'light', 'dark', 'light dark', 'only light', 'only dark'] as const,
    },
  ],
  /**
   * The field-sizing CSS property lets a form control size itself to its content: `fieldSizing="content"` is a textarea that grows as it is typed into, with no JavaScript measuring anything.
   * @example fieldSizing="content" → field-sizing: content
   */
  fieldSizing: [
    {
      styleName: 'field-sizing',
      values: ['content', 'fixed'] as const,
    },
  ],
  /**
   * The fill CSS property defines how SVG text content and the interior canvas of SVG shapes are filled or painted. If present, it overrides the element's fill attribute. Takes a colour token, a paint server the document defines (`fill="url(#sky)"` — a `<LinearGradient>` or a pattern) or a variable somebody else declared (`fill="var(--chart-1)"`).
   * @example fill="sky-500" → fill: var(--sky-500)
   */
  fill: [
    {
      values: Variables.colorValues,
      valueFormat: (value, getVariableValue) => getVariableValue(value),
    },
    {
      values: Variables.systemColorValues,
    },
    colorAlphaValue,
    referenceValues,
  ],
  /**
   * The fill-opacity CSS property defines the opacity of the paint applied to the interior of an SVG shape or to SVG text.
   * @example fillOpacity={0.5} → fill-opacity: 0.5
   */
  fillOpacity: [
    {
      values: opacityValues,
      styleName: 'fill-opacity',
    },
  ],
  /**
   * The fill-rule CSS property defines which parts of a self-intersecting SVG shape count as inside it, and are therefore filled.
   * @example fillRule="nonzero" → fill-rule: nonzero
   */
  fillRule: [
    {
      values: ['nonzero', 'evenodd'] as const,
      styleName: 'fill-rule',
    },
  ],
  /**
   * The stroke CSS property defines the color or SVG paint server used to draw an element's stroke. Takes a colour token, `stroke="url(#sky)"` for a paint server the document defines, or `stroke="var(--chart-1)"` for a variable somebody else declared.
   * @example stroke="sky-500" → stroke: var(--sky-500)
   */
  stroke: [
    {
      values: Variables.colorValues,
      valueFormat: (value, getVariableValue) => getVariableValue(value),
    },
    {
      values: Variables.systemColorValues,
    },
    colorAlphaValue,
    referenceValues,
  ],
  /**
   * The stroke-opacity CSS property defines the opacity of the paint applied to an SVG element's stroke.
   * @example strokeOpacity={0.5} → stroke-opacity: 0.5
   */
  strokeOpacity: [
    {
      values: opacityValues,
      styleName: 'stroke-opacity',
    },
  ],
  /**
   * The stroke-width CSS property sets the width of an SVG element's stroke, in user units — `strokeWidth={2}` is `stroke-width: 2`, no divider.
   * @example strokeWidth={4} → stroke-width: 4
   */
  strokeWidth: [
    {
      values: 0,
      styleName: 'stroke-width',
    },
  ],
  /**
   * The stroke-linecap CSS property defines the shape drawn at the two ends of an open SVG subpath.
   * @example strokeLinecap="butt" → stroke-linecap: butt
   */
  strokeLinecap: [
    {
      values: ['butt', 'round', 'square'] as const,
      styleName: 'stroke-linecap',
    },
  ],
  /**
   * The stroke-linejoin CSS property defines the shape drawn where two segments of an SVG path meet.
   * @example strokeLinejoin="miter" → stroke-linejoin: miter
   */
  strokeLinejoin: [
    {
      values: ['miter', 'round', 'bevel'] as const,
      styleName: 'stroke-linejoin',
    },
  ],
  /**
   * The stroke-miterlimit CSS property sets how far a miter join may extend before it is cut back to a bevel. Values below 1 are invalid.
   * @example strokeMiterlimit={4} → stroke-miterlimit: 4
   */
  strokeMiterlimit: [
    {
      values: 0,
      styleName: 'stroke-miterlimit',
    },
  ],
  /**
   * The stroke-dasharray CSS property turns an SVG stroke into dashes: a single number is the dash and the gap alike, a string is the full pattern (`'8 4'`). Lengths are user units.
   * @example strokeDasharray={4} → stroke-dasharray: 4
   */
  strokeDasharray: [
    {
      values: 0,
      styleName: 'stroke-dasharray',
    },
    {
      values: '' as string,
      // The one string prop that is a *list* rather than a token, so it cannot be matched by `typeof`
      // alone either: dashes and gaps, numbers or percentages, and nothing that could end the rule.
      match: (value) => typeof value === 'string' && /^\s*[\d.]+%?(\s*[\s,]\s*[\d.]+%?)*\s*$/.test(value),
      styleName: 'stroke-dasharray',
    },
  ],
  /**
   * The stroke-dashoffset CSS property moves the dash pattern along the path — the property a path-drawing animation transitions. A percentage is of the path's own length.
   * @example strokeDashoffset={4} → stroke-dashoffset: 4
   */
  strokeDashoffset: [
    {
      values: 0,
      styleName: 'stroke-dashoffset',
    },
    {
      ...percentValue,
      styleName: 'stroke-dashoffset',
    },
  ],
  /**
   * The paint-order CSS property sets what is painted first. `paintOrder="stroke"` puts the stroke behind the fill, which is how outlined SVG text stays legible.
   * @example paintOrder="normal" → paint-order: normal
   */
  paintOrder: [
    {
      values: ['normal', 'fill', 'stroke', 'markers'] as const,
      styleName: 'paint-order',
    },
  ],
  /**
   * How an SVG element's stroke reacts to the transforms above it: `non-scaling-stroke` keeps a hairline
   * one pixel wide at any scale. Not inherited, so its rule targets the element *and* its descendants —
   * the only way the prop can mean anything on an `<svg>`.
   * @example vectorEffect="none" → vector-effect: none
   */
  vectorEffect: [
    {
      values: ['none', 'non-scaling-stroke'] as const,
      styleName: 'vector-effect',
      selector: (className, pseudoClass) => `${className}${pseudoClass},${className}${pseudoClass} *`,
    },
  ],
  /**
   * The shape-rendering CSS property tells the renderer what to trade away when drawing an SVG shape — `crispEdges` turns off anti-aliasing, which is what pixel-exact gridlines want.
   * @example shapeRendering="auto" → shape-rendering: auto
   */
  shapeRendering: [
    {
      values: ['auto', 'optimizeSpeed', 'crispEdges', 'geometricPrecision'] as const,
      styleName: 'shape-rendering',
    },
  ],
  /**
   * Which part of SVG text sits on its `x`: `middle` centres an axis label under a tick. Inherited, so a
   * value on the `<svg>` is the default for every label in it.
   * @example textAnchor="start" → text-anchor: start
   */
  textAnchor: [
    {
      values: ['start', 'middle', 'end'] as const,
      styleName: 'text-anchor',
    },
  ],
  /**
   * Which baseline of SVG text sits on its `y`: `central` centres a number inside a gauge. Not inherited,
   * so like `vectorEffect` its rule names the element *and* its descendants.
   * @example dominantBaseline="auto" → dominant-baseline: auto
   */
  dominantBaseline: [
    {
      values: ['auto', 'text-bottom', 'alphabetic', 'ideographic', 'middle', 'central', 'mathematical', 'hanging', 'text-top'] as const,
      styleName: 'dominant-baseline',
      selector: (className, pseudoClass) => `${className}${pseudoClass},${className}${pseudoClass} *`,
    },
  ],
  /**
   * The centre of a `<circle>` or `<ellipse>`, horizontally, in user units. Real CSS, so unlike the
   * attribute it transitions — moving a point on hover is one prop and no JavaScript.
   * @example cx={4} → cx: 4
   */
  cx: [
    {
      values: 0,
    },
    {
      ...percentValue,
    },
  ],
  /**
   * The cy CSS property positions the centre of a `<circle>` or an `<ellipse>` vertically, in user units. Transitions like `cx`.
   * @example cy={4} → cy: 4
   */
  cy: [
    {
      values: 0,
    },
    {
      ...percentValue,
    },
  ],
  /**
   * The r CSS property sets the radius of a `<circle>`, in user units. Transition it and the circle grows; a percentage is of the viewport's diagonal.
   * @example r={4} → r: 4
   */
  r: [
    {
      values: 0,
    },
    {
      ...percentValue,
    },
  ],
  /**
   * The horizontal radius of an `<ellipse>` or corner radius of a `<rect>` — `borderRadius` for SVG, in
   * user units rather than on the spacing scale. `auto` takes the radius from `ry`.
   * @example rx={4} → rx: 4
   */
  rx: [
    {
      values: 0,
    },
    {
      values: ['auto'] as const,
    },
    {
      ...percentValue,
    },
  ],
  /**
   * The ry CSS property sets the vertical radius of an `<ellipse>` or the vertical corner radius of a `<rect>`, in user units. `auto` takes it from `rx`.
   * @example ry={4} → ry: 4
   */
  ry: [
    {
      values: 0,
    },
    {
      values: ['auto'] as const,
    },
    {
      ...percentValue,
    },
  ],
  /**
   * Positions a `<rect>`, `<image>`, `<use>`, `<foreignObject>` or nested `<svg>` horizontally, in user
   * units. Not `<text>`, whose `x` takes a list of positions and stays an attribute — pass it in `props`.
   * @example x={4} → x: 4
   */
  x: [
    {
      values: 0,
    },
    {
      ...percentValue,
    },
  ],
  /**
   * The y CSS property positions a `<rect>`, `<image>`, `<use>`, `<foreignObject>` or a nested `<svg>` vertically, in user units. Not for `<text>` — see `x`.
   * @example y={4} → y: 4
   */
  y: [
    {
      values: 0,
    },
    {
      ...percentValue,
    },
  ],
  /**
   * The background-image CSS property sets one or more background images on an element.
   * @example bgImage="gradient-primary" → background-image: var(--gradient-primary)
   */
  bgImage: [
    {
      values: Variables.bgImageValues,
      valueFormat: (value, getVariableValue) => getVariableValue(value),
      styleName: 'background-image',
    },
  ],
  /**
   * A gradient written as a value: the key names the kind and carries its geometry (`linear` a direction
   * or an angle, `radial` a shape, `conic` an angle to start from), `colors` are the stops in order — a
   * palette token, one with an opacity modifier, or a `[colour, position]` pair. `interpolate="oklch"` is
   * what keeps a two-stop gradient out of the grey middle sRGB runs it through. Writes `background-image`,
   * so it and `bgImage` are the same property: use one.
   * @example bgGradient={{ linear: 'r', colors: ['blue-500', 'pink-500'] }} → background-image: linear-gradient(to right,var(--blue-500),var(--pink-500))
   */
  bgGradient: [
    {
      values: {} as Gradients.Gradient,
      match: Gradients.isGradient,
      declarations: (value, getVariableValue) => `background-image:${Gradients.css(value, getVariableValue)}`,
    },
  ],
  /**
   * The elevation of the box: `xxs` through `xxl` on Tailwind's scale, or one of the three original
   * presets (`small`, `medium`, `large`, which carry their own colour). `shadowColor` recolours the
   * scale, and the shadow stacks with `ring`, `insetRing` and `insetShadow` rather than replacing them.
   * @example shadow="xxs" → --boxShadow: 0 1px var(--boxShadowColor, rgb(0 0 0 / .05)); box-shadow: var(--boxInsetShadow, 0 0 #0…
   */
  shadow: [
    {
      values: Shadows.boxSizes,
      declarations: (value) => Shadows.shadow('Shadow', value as string),
    },
    {
      values: Variables.shadowValues,
      declarations: (value, getVariableValue) => Shadows.layerDeclarations('Shadow', getVariableValue(value as string)),
    },
  ],
  /**
   * What colour `shadow` draws in — the scale's own translucent black otherwise. Shows nothing on its own.
   * @example shadowColor="sky-500" → --boxShadowColor: var(--sky-500)
   */
  shadowColor: shadowColor('Shadow'),
  /**
   * A shadow drawn inside the border box: `xxs`, `xs` or `sm`. Its own layer, so it composes with `shadow`.
   * @example insetShadow="xxs" → --boxInsetShadow: inset 0 1px var(--boxInsetShadowColor, rgb(0 0 0 / .05)); box-shadow: var(--boxIns…
   */
  insetShadow: [
    {
      values: Shadows.insetSizes,
      declarations: (value) => Shadows.shadow('InsetShadow', value as string),
    },
  ],
  /**
   * What colour `insetShadow` draws in. Shows nothing on its own.
   * @example insetShadowColor="sky-500" → --boxInsetShadowColor: var(--sky-500)
   */
  insetShadowColor: shadowColor('InsetShadow'),
  /**
   * A hard-edged shadow outside the border box, in px — `ring={2}`. Unlike `outline` it takes part in the
   * shadow stack, so a ring and an elevation coexist; it follows `borderRadius` and costs no layout.
   * @example ring={4} → --boxRing: 0 0 0 4px var(--boxRingColor, currentColor); box-shadow: var(--boxInsetShadow, 0 0 #0000)…
   */
  ring: [
    {
      values: 0,
      declarations: (value) => Shadows.ring('Ring', value as number),
    },
  ],
  /**
   * What colour `ring` draws in. `currentColor` otherwise, the way Tailwind's is.
   * @example ringColor="sky-500" → --boxRingColor: var(--sky-500)
   */
  ringColor: shadowColor('Ring'),
  /**
   * The same ring, drawn inside the border box: an inner hairline that needs no second element.
   * @example insetRing={4} → --boxInsetRing: inset 0 0 0 4px var(--boxInsetRingColor, currentColor); box-shadow: var(--boxInsetSh…
   */
  insetRing: [
    {
      values: 0,
      declarations: (value) => Shadows.ring('InsetRing', value as number),
    },
  ],
  /**
   * What colour `insetRing` draws in. `currentColor` otherwise.
   * @example insetRingColor="sky-500" → --boxInsetRingColor: var(--sky-500)
   */
  insetRingColor: shadowColor('InsetRing'),
  /**
   * A shadow behind the text rather than the box: `xxs` through `lg`, recoloured by `textShadowColor`.
   * @example textShadow="xxs" → text-shadow: 0px 1px 0px var(--boxTextShadowColor, rgb(0 0 0 / .15))
   */
  textShadow: [
    {
      values: Shadows.textSizes,
      styleName: 'text-shadow',
      valueFormat: (value: string) => Shadows.textShadow(value),
    },
  ],
  /**
   * What colour `textShadow` draws in. Shows nothing on its own.
   * @example textShadowColor="sky-500" → --boxTextShadowColor: var(--sky-500)
   */
  textShadowColor: shadowColor('TextShadow'),
  /**
   * How far the element's own pixels are blurred: a step of Tailwind's scale (`xs` 4px through `xxxl` 64px)
   * or a radius in px. One of nine functions that compose into a single `filter`, so a blur and a
   * `brightness` coexist; `none` clears this one and leaves the rest.
   * @example blur={3} → --boxBlur: blur(3px); filter: var(--boxBlur,) var(--boxBrightness,) var(--boxContrast,) var(--boxGra…
   */
  blur: blurFunction('Blur'),
  /**
   * How bright the element is rendered, as a percentage: `brightness={110}` is 10% brighter, `{50}` is half.
   * @example brightness={110} → --boxBrightness: brightness(110%); filter: var(--boxBlur,) var(--boxBrightness,) var(--boxContrast,)…
   */
  brightness: filterFunction('Brightness', 'brightness', '%'),
  /**
   * How much contrast the element is rendered with, as a percentage — `100` being the element as it is.
   * @example contrast={125} → --boxContrast: contrast(125%); filter: var(--boxBlur,) var(--boxBrightness,) var(--boxContrast,) var…
   */
  contrast: filterFunction('Contrast', 'contrast', '%'),
  /**
   * How far the element is desaturated, as a percentage: `grayscale={100}` removes colour entirely.
   * @example grayscale={100} → --boxGrayscale: grayscale(100%); filter: var(--boxBlur,) var(--boxBrightness,) var(--boxContrast,) v…
   */
  grayscale: filterFunction('Grayscale', 'grayscale', '%'),
  /**
   * How far every hue in the element is rotated round the colour circle, in degrees.
   * @example hueRotate={90} → --boxHueRotate: hue-rotate(90deg); filter: var(--boxBlur,) var(--boxBrightness,) var(--boxContrast,)…
   */
  hueRotate: filterFunction('HueRotate', 'hue-rotate', 'deg'),
  /**
   * How far the element's colours are inverted, as a percentage: `invert={100}` is a photographic negative.
   * @example invert={100} → --boxInvert: invert(100%); filter: var(--boxBlur,) var(--boxBrightness,) var(--boxContrast,) var(--b…
   */
  invert: filterFunction('Invert', 'invert', '%'),
  /**
   * How saturated the element is rendered, as a percentage — over `100` to push the colour, under to drain it.
   * @example saturate={180} → --boxSaturate: saturate(180%); filter: var(--boxBlur,) var(--boxBrightness,) var(--boxContrast,) var…
   */
  saturate: filterFunction('Saturate', 'saturate', '%'),
  /**
   * How far the element is pushed towards sepia, as a percentage.
   * @example sepia={100} → --boxSepia: sepia(100%); filter: var(--boxBlur,) var(--boxBrightness,) var(--boxContrast,) var(--box…
   */
  sepia: filterFunction('Sepia', 'sepia', '%'),
  /**
   * A shadow cast by the element's *shape* rather than its box — the one that follows a transparent PNG's
   * outline or an SVG's path, where `shadow` would draw a rectangle. `xs` through `xxl`, recoloured by
   * `dropShadowColor`. It is a filter function, so it composes with `blur` and the rest rather than with
   * the shadow stack.
   * @example dropShadow="xs" → --boxDropShadow: drop-shadow(0 1px 1px var(--boxDropShadowColor, rgb(0 0 0 / .05))); filter: var(--b…
   */
  dropShadow: [
    {
      values: Shadows.dropSizes,
      declarations: (value) =>
        Filters.layerDeclarations('DropShadow', value === 'none' ? Filters.cleared : Shadows.dropShadow(value as string)),
    },
  ],
  /**
   * What colour `dropShadow` draws in. Shows nothing on its own.
   * @example dropShadowColor="sky-500" → --boxDropShadowColor: var(--sky-500)
   */
  dropShadowColor: shadowColor('DropShadow'),
  /**
   * How far what is *behind* the element is blurred — the glassmorphism half. Needs something translucent in front of it.
   * @example backdropBlur="sm" → --boxBackdropBlur: blur(8px); backdrop-filter: var(--boxBackdropBlur,) var(--boxBackdropBrightness,)…
   */
  backdropBlur: blurFunction('BackdropBlur'),
  /**
   * How bright what is behind the element is rendered, as a percentage.
   * @example backdropBrightness={110} → --boxBackdropBrightness: brightness(110%); backdrop-filter: var(--boxBackdropBlur,) var(--boxBackdro…
   */
  backdropBrightness: filterFunction('BackdropBrightness', 'brightness', '%'),
  /**
   * How much contrast what is behind the element is rendered with, as a percentage.
   * @example backdropContrast={125} → --boxBackdropContrast: contrast(125%); backdrop-filter: var(--boxBackdropBlur,) var(--boxBackdropBri…
   */
  backdropContrast: filterFunction('BackdropContrast', 'contrast', '%'),
  /**
   * How far what is behind the element is desaturated, as a percentage.
   * @example backdropGrayscale={100} → --boxBackdropGrayscale: grayscale(100%); backdrop-filter: var(--boxBackdropBlur,) var(--boxBackdropB…
   */
  backdropGrayscale: filterFunction('BackdropGrayscale', 'grayscale', '%'),
  /**
   * How far every hue behind the element is rotated round the colour circle, in degrees.
   * @example backdropHueRotate={90} → --boxBackdropHueRotate: hue-rotate(90deg); backdrop-filter: var(--boxBackdropBlur,) var(--boxBackdro…
   */
  backdropHueRotate: filterFunction('BackdropHueRotate', 'hue-rotate', 'deg'),
  /**
   * How far the colours behind the element are inverted, as a percentage.
   * @example backdropInvert={100} → --boxBackdropInvert: invert(100%); backdrop-filter: var(--boxBackdropBlur,) var(--boxBackdropBrightn…
   */
  backdropInvert: filterFunction('BackdropInvert', 'invert', '%'),
  /**
   * How opaque what is behind the element is rendered, as a percentage. `filter` has no use for this one, so there is no `opacity` twin.
   * @example backdropOpacity={80} → --boxBackdropOpacity: opacity(80%); backdrop-filter: var(--boxBackdropBlur,) var(--boxBackdropBright…
   */
  backdropOpacity: filterFunction('BackdropOpacity', 'opacity', '%'),
  /**
   * How saturated what is behind the element is rendered, as a percentage.
   * @example backdropSaturate={180} → --boxBackdropSaturate: saturate(180%); backdrop-filter: var(--boxBackdropBlur,) var(--boxBackdropBri…
   */
  backdropSaturate: filterFunction('BackdropSaturate', 'saturate', '%'),
  /**
   * How far what is behind the element is pushed towards sepia, as a percentage.
   * @example backdropSepia={100} → --boxBackdropSepia: sepia(100%); backdrop-filter: var(--boxBackdropBlur,) var(--boxBackdropBrightnes…
   */
  backdropSepia: filterFunction('BackdropSepia', 'sepia', '%'),
  /**
   * What the element is masked by: the alpha channel of an image decides which of its pixels are painted.
   * Takes the same gradient record `bgGradient` does — so a fade to `transparent` is the whole edge-fade
   * recipe — or a `url(#id)`/`var(--name)` somebody else defined. One mask, not a stack.
   * @example maskImage={{ linear: 'b', colors: ['black', 'transparent'] }} → mask-image: linear-gradient(to bottom,var(--black),var(--transparent))
   */
  maskImage: [
    {
      values: ['none'] as const,
      styleName: 'mask-image',
    },
    { ...referenceValues, styleName: 'mask-image' },
    {
      values: {} as Gradients.Gradient,
      match: Gradients.isGradient,
      declarations: (value, getVariableValue) => `mask-image:${Gradients.css(value, getVariableValue)}`,
    },
  ],
  /**
   * Which box the background is painted inside — and `text`, which clips it to the glyphs themselves. That
   * is how a gradient becomes lettering, and it needs `color="transparent"` beside it or the text paints
   * over its own background.
   * @example bgClip="text" → background-clip: text
   */
  bgClip: [
    {
      values: ['border', 'padding', 'content', 'text'] as const,
      styleName: 'background-clip',
      valueFormat: (value: string) => (value === 'text' ? value : `${value}-box`),
    },
  ],
  /**
   * Moves an element horizontally on the 2D plane, on the ÷4 spacing scale, as a fraction of its own width (`'1/2'`) or as a percentage. Composes with `translateY`.
   * @example translateX={4} → --boxTranslateX: 1rem; translate: var(--boxTranslateX, 0) var(--boxTranslateY, 0)
   */
  translateX: [
    {
      values: 0,
      declarations: translate('X', (value) => BoxStylesFormatters.Value.rem(value as number)),
    },
    {
      values: Variables.percentages,
      declarations: translate('X', (value) => BoxStylesFormatters.Value.fraction(value as string)),
    },
    {
      values: Variables.negativePercentages,
      declarations: translate('X', (value) => BoxStylesFormatters.Value.fraction(value as string)),
    },
    {
      ...percentValue,
      declarations: translate('X', String),
    },
  ],
  /**
   * Moves an element vertically on the 2D plane, on the ÷4 spacing scale, as a fraction of its own height (`'1/2'`) or as a percentage. Composes with `translateX`.
   * @example translateY={4} → --boxTranslateY: 1rem; translate: var(--boxTranslateX, 0) var(--boxTranslateY, 0)
   */
  translateY: [
    {
      values: 0,
      declarations: translate('Y', (value) => BoxStylesFormatters.Value.rem(value as number)),
    },
    {
      values: Variables.percentages,
      declarations: translate('Y', (value) => BoxStylesFormatters.Value.fraction(value as string)),
    },
    {
      values: Variables.negativePercentages,
      declarations: translate('Y', (value) => BoxStylesFormatters.Value.fraction(value as string)),
    },
    {
      ...percentValue,
      declarations: translate('Y', String),
    },
  ],
  /**
   * What a `::before`/`::after` renders — and whether it renders at all: a generated element with no
   * `content` produces no box. `content="empty"` is `''` (the value a decoration wants), a quoted string
   * or a function (`attr()`, `counter()`, `url()`) is written out as CSS, and **anything else is text and
   * gets quoted for you** — `content="New"` is `content: "New"`.
   * @example content="New" → content: "New"
   */
  content: [
    {
      values: Content.keywords,
      valueFormat: Content.keyword,
    },
    {
      values: Content.cssValue,
      match: Content.isCssValue,
    },
    {
      values: Content.text,
      valueFormat: Content.quote,
    },
  ],
  /**
   * The whole `backdrop-filter` at once, written as CSS. Superseded by the nine `backdrop*` props, which
   * compose — this one writes the same property, so it and they are the same declaration: use one.
   * @example backdropFilter="none" → backdrop-filter: none
   */
  backdropFilter: [
    {
      values: ['none', 'blur(12px)', 'blur(8px)', 'blur(4px)'] as const,
      styleName: 'backdrop-filter',
    },
  ],
  /**
   * How wide a scrollbar the browser draws. `none` hides it without taking the scrolling away, so a wheel
   * and the keys still reach the content — unlike `overflow: hidden`, which stops both.
   * @example scrollbarWidth="auto" → scrollbar-width: auto
   */
  scrollbarWidth: [
    {
      values: ['auto', 'thin', 'none'] as const,
      styleName: 'scrollbar-width',
    },
  ],
  /**
   * The scrollbar-color CSS property sets the color of the scrollbar thumb and track. The value pair is [thumbColor, trackColor].
   * @example scrollbarColor={['gray-400', 'gray-100']} → scrollbar-color: var(--gray-400) var(--gray-100)
   */
  scrollbarColor: [
    {
      tuple: true,
      values: [Variables.colorValues, Variables.colorValues] as const,
      styleName: 'scrollbar-color',
      valueFormat: (value, getVariableValue) => `${getVariableValue(value[0] as string)} ${getVariableValue(value[1] as string)}`,
    },
  ],
  /**
   * The scrollbar-gutter CSS property reserves the space a scrollbar would take before there is one, so a
   * panel does not shift sideways the moment its content overflows. `stable` reserves the end edge,
   * `stable both-edges` both — which is what keeps centred content centred.
   * @example scrollbarGutter="auto" → scrollbar-gutter: auto
   */
  scrollbarGutter: [
    {
      styleName: 'scrollbar-gutter',
      values: ['auto', 'stable', 'stable both-edges'] as const,
    },
  ],
  /**
   * CSS custom properties on this element, inherited by everything inside it: `vars={{ 'color-x': 'sky-500' }}`
   * emits `--color-x: var(--sky-500)`. The one prop whose declaration *names* come from its value, which is
   * what makes it the answer for markup this library does not render — a Recharts `<Line>`, a third-party
   * widget. A colour token becomes the variable behind it, anything else is written out as it stands.
   * @example vars={{ 'color-revenue': 'sky-500' }} → --color-revenue: var(--sky-500)
   */
  vars: [
    {
      values: {} as Variables.CustomProperties,
      match: Variables.isCustomProperties,
      declarations: Variables.customProperties as NonNullable<BoxStyle['declarations']>,
    },
  ],
  /**
   * The escape hatch: a style object for the properties this library has no prop for, compiled into a class
   * through the same pipeline as every other prop — shared, nestable, server-rendered — rather than an inline
   * style. Declared last on purpose: its rule sorts after every typed prop's, so on one element it wins the
   * property both name. A colour token resolves the way a `vars` value does; a number is written as it stands.
   * @example css={{ mixBlendMode: 'multiply' }} → mix-blend-mode: multiply
   */
  css: [
    {
      values: {} as Css.Declarations,
      match: Css.isDeclarations,
      declarations: Css.declarations as NonNullable<BoxStyle['declarations']>,
    },
  ],
} satisfies Record<string, BoxStyle[]>;

export const pseudo1 = {
  hover: ':hover',
  focus: ':focus-within',
  // What `focus` cannot express: the ring a keyboard user needs and a mouse user does not. A cell
  // in a grid, a card, anything focused programmatically — `:focus-within` lights all of them up on
  // a click, and the browser already knows which presses deserve a ring.
  focusVisible: ':focus-visible',
  hasFocus: ':has(:focus)',
  active: ':active',
  valid: ':user-valid',
  hasValid: ':has(:valid)',
  invalid: ':user-invalid',
  hasInvalid: ':has(:user-invalid)',
  optional: ':optional',
  hasChecked: ':has(:checked)',
  hasRequired: ':has(:required)',
  hasDisabled: ':has([disabled])',
  /** A link the browser has been to. **Colour properties only** — the privacy rule, and the browser lies about the rest. */
  visited: ':visited',
  /** The element the URL fragment points at, so a deep link can highlight what it landed on. */
  target: ':target',
  /**
   * Open, whichever way the element says so: a `<details>`/`<dialog>` with the attribute, a popover, or
   * the native `:open` a `<select>` gets. One `:is()` because it is one state, and a forgiving list — a
   * browser without `:open` keeps the other two rather than dropping the rule.
   */
  open: ':is([open],:popover-open,:open)',
  /** An empty field still showing its placeholder — the label-inside-the-input trick, with no JavaScript. */
  placeholderShown: ':placeholder-shown',
  /** A field the browser filled in itself. */
  autofill: ':autofill',
  /** A numeric or date field inside its `min`/`max`. */
  inRange: ':in-range',
  /** Outside it — the pair `inRange` is worth nothing without. */
  outOfRange: ':out-of-range',
  /** Made inert, the subtree included: `[inert]` does not inherit, but inertness does. */
  inert: ':is([inert],[inert] *)',
  /**
   * The element's own resolved direction, which is what `dir` on any ancestor (usually `<html>`) settles.
   * `:dir()` rather than Tailwind's `[dir="rtl"] &`, because direction is a property of *this* element and
   * an ancestor selector cannot see a `<bdi>` or a `dir="auto"` that flipped it. Note the consequence:
   * with no `dir` anywhere the document is left-to-right, so `ltr` matches — it is the state, not an attribute.
   */
  rtl: ':dir(rtl)',
  /** The other half of the pair: what a left-to-right reader sees, and the default with no `dir` set. */
  ltr: ':dir(ltr)',
};

export const pseudo2 = {
  indeterminate: ':indeterminate',
  checked: ':checked',
  required: ':required',
  disabled: '[disabled]',
  selected: '[aria-selected="true"]',
};

export const pseudoClasses = { ...pseudo1, ...pseudo2 };

/**
 * The pseudo-*elements*, and their own dimension rather than more pseudo-class keys: a compound selector
 * holds **at most one**, and it has to come last. Mixed into the pseudo-class list they were assembled in
 * declaration order, so `checked: { before: {…} }` came out as the invalid `::before:checked` and the
 * browser dropped the whole rule; a slot of their own puts the element last by construction, and lets the
 * types refuse a second one instead of emitting `::before::after`, which matches nothing.
 */
export const pseudoElements = {
  before: '::before',
  after: '::after',
  placeholder: '::placeholder',
  selection: '::selection',
  marker: '::marker',
  firstLine: '::first-line',
  firstLetter: '::first-letter',
  backdrop: '::backdrop',
  fileButton: '::file-selector-button',
  /** @deprecated The name is `placeholder` now — this spelling still works and means the same thing. */
  placeholderStyles: '::placeholder',
};

export type PseudoElementKey = keyof typeof pseudoElements;

/** The two that generate a box of their own, and so need `content` before they render anything at all. */
const generatedElements: readonly PseudoElementKey[] = ['before', 'after'];

export function generatesContent(key: PseudoElementKey): boolean {
  return generatedElements.includes(key);
}

/**
 * The two that belong to a *descendant*: a `::marker` is the list item's, a `::selection` is whatever
 * holds the text — but the prop is written on the list or the paragraph, so their rules name the
 * descendants as well. The same two selectors Tailwind's `marker:`/`selection:` variants emit.
 */
const inheritedElements: readonly PseudoElementKey[] = ['marker', 'selection'];

export function reachesDescendants(key: PseudoElementKey): boolean {
  return inheritedElements.includes(key);
}

/** A set of pseudo-class keys as one compound selector suffix. The pseudo-element is appended after it. */
export function pseudoSelector(keys: readonly (keyof typeof pseudoClasses)[]): string {
  return keys.map((key) => pseudoClasses[key]).join('');
}
export const pseudoClassesWeight = Object.entries(pseudoClasses).reduce(
  (acc, [key], index) => {
    acc[key as keyof typeof pseudoClasses] = Math.pow(2, index);

    return acc;
  },
  {} as Record<keyof typeof pseudoClasses, number>,
);

// The keys in declaration order — the order a weight decodes back into, so a class name built from one
// reads the way it always has. A 32-bit mask, so this map cannot grow past 31 keys.
const pseudoClassKeys = Object.keys(pseudoClasses) as (keyof typeof pseudoClasses)[];

const pseudoClassesCache = new Map<number, (keyof typeof pseudoClasses)[]>();

/**
 * The pseudo keys one weight stands for, decoded from the bitmask and kept — a page asks for the same
 * few combinations over and over. This used to be a table of *every* subset: 2²² arrays, 1.5 GB of heap
 * and 1.4 s, built at import time, whether a page styled anything or not.
 */
export function pseudoClassesOfWeight(weight: number): (keyof typeof pseudoClasses)[] {
  const cached = pseudoClassesCache.get(weight);
  if (cached) return cached;

  const keys = pseudoClassKeys.filter((key) => weight & pseudoClassesWeight[key]);
  pseudoClassesCache.set(weight, keys);

  return keys;
}

/**
 * The five original group keys, one state each. They are `group` with the state written into the prop
 * name, and the engine rewrites them into it — `hoverGroup={{ card: … }}` is `group={{ 'card/hover': … }}`
 * and shares its class. Kept because they are in every consumer's markup; `group` is where new states are.
 */
export const pseudoGroupClasses = {
  /** @deprecated `group={{ 'card/hover': … }}` — the same rule, and every other state beside it. */
  hoverGroup: 'hover',
  /** @deprecated `group={{ 'card/focus': … }}`. */
  focusGroup: 'focus',
  /** @deprecated `group={{ 'card/active': … }}`. */
  activeGroup: 'active',
  /** @deprecated `group={{ 'card/disabled': … }}`. */
  disabledGroup: 'disabled',
  /** @deprecated `group={{ 'card/selected': … }}`. */
  selectedGroup: 'selected',
} satisfies { [key: string]: keyof typeof pseudoClasses };

/**
 * The theme nesting key. A theme is an *ancestor class* rather than a state of this element, which is why
 * it is no longer a pseudo-class key with an empty selector: `Groups.theme()` compiles it beside a group
 * and a peer, and the mask keeps the bit.
 */
export const themeGroupClass = {
  /** Styles for one theme: `theme={{ dark: { bgColor: 'gray-900' } }}` → `.dark .className`. */
  theme: 'theme',
};

/**
 * The one nesting key that is neither a selector nor a media query: `@starting-style` holds the values a
 * property had *before* the element's first style change, which is the whole difference between an element
 * appearing already finished and one transitioning in. Wraps the rule rather than joining the selector, so
 * it composes with every other kind of nesting.
 */
export const startingStyleKey = {
  /** What these props start from the first time this element is styled — an entrance, with no JavaScript. */
  startingStyle: '@starting-style',
};

export const breakpoints = {
  /** Styles applied for small screens and larger. >= 640 */
  sm: 640,
  /** Styles applied for medium screens and larger. >= 768 */
  md: 768,
  /** Styles applied for large screens and larger. >= 1024 */
  lg: 1024,
  /** Styles applied for extra-large screens and larger. >= 1280 */
  xl: 1280,
  /** Styles applied for 2x extra-large screens and larger. >= 1536 */
  xxl: 1536,
};

/**
 * What the device can do and what the reader asked for, shaped exactly like a breakpoint and ranked
 * *after* every breakpoint: a screen wide enough for `xxl` is not a reason to override either. The
 * pointer pair comes first, so a preference outranks a device capability where both apply.
 * `motionReduce` has a default behind it — the base rule transitions on `var(--transitionTime)`, which
 * `prefers-reduced-motion` zeroes, so declaring it is how you opt back *in*.
 */
export const mediaFeatures = {
  /**
   * Styles applied on a touch or pen device — a bigger hit target, a control that is never hovered.
   * `@media (pointer: coarse)`. Ranked *below* the three preferences: what the pointer can do is a fact
   * about the device, and a statement about the reader still outranks it.
   */
  pointerCoarse: '(pointer: coarse)',
  /** Styles applied where the primary pointer is a mouse or a trackpad. `@media (pointer: fine)` */
  pointerFine: '(pointer: fine)',
  /** Styles applied when the user asked for less motion. `@media (prefers-reduced-motion: reduce)` */
  motionReduce: '(prefers-reduced-motion: reduce)',
  /** Styles applied in a forced-colors mode, e.g. Windows High Contrast. `@media (forced-colors: active)` */
  forcedColors: '(forced-colors: active)',
  /** Styles applied when the user asked for more contrast. `@media (prefers-contrast: more)` */
  contrastMore: '(prefers-contrast: more)',
};

/**
 * Where a rule's at-rule block sits: what its prelude says, and where it lands in the cascade. One slot
 * per rule — a breakpoint, a preference and a container query all fill it, and the types refuse to nest
 * one inside another, because a rule lives in exactly one block.
 */
export interface StyleQuery {
  /** The key as written: the class-name segment, and part of the rule key. */
  key: string;
  /** Cascade position — the dimension `@starting-style` is pushed past in its entirety. */
  rank: number;
  /** The at-rule prelude, or null for a rule that needs no block. */
  prelude: string | null;
}

/** A rule with no at-rule block around it, which is where every walk starts. */
export const NO_QUERY: StyleQuery = { key: 'normal', rank: 0, prelude: null };

/**
 * Every cascade slot an at-rule block can take, in order: no query, the breakpoints ascending, the
 * container queries, then the preference features — a screen wide enough for `xxl` is not a reason to
 * override a statement about the reader, and neither is a container. The engine ranks rules by this and
 * names their cascade layer from it.
 */
export const queryKeys: readonly string[] = ['normal', ...Object.keys(breakpoints), ...Containers.rankKeys, ...Object.keys(mediaFeatures)];

const queryRanks = new Map<string, number>(queryKeys.map((key, index) => [key, index]));

// The space after `@media` matters: the CSS parsers in happy-dom and jsdom drop `@media(...)` outright.
const mediaQueries = new Map<string, StyleQuery>(
  [...Object.entries(breakpoints).map(([key, width]) => [key, `(min-width: ${width}px)`] as const), ...Object.entries(mediaFeatures)].map(
    ([key, condition]) => [key, { key, rank: queryRanks.get(key) ?? 0, prelude: `@media ${condition}` }],
  ),
);

/** The `@media` block one breakpoint or preference key stands for. */
export function mediaQuery(key: string): StyleQuery {
  return mediaQueries.get(key) ?? NO_QUERY;
}

// Compiled `cq` keys, kept: they come from source code, so a page asks for the same few over and over.
const containerQueries = new Map<string, StyleQuery | null>();

/** The `@container` block one `cq` key stands for, or null when its grammar rejects it. */
export function containerQuery(key: string): StyleQuery | null {
  const cached = containerQueries.get(key);
  if (cached !== undefined) return cached;

  const compiled = Containers.query(key);
  const query = compiled ? { key: compiled.key, rank: queryRanks.get(compiled.rankKey) ?? 0, prelude: compiled.prelude } : null;
  containerQueries.set(key, query);

  return query;
}
