/**
 * The Tailwind v4.3 → Box prop map, and the honest gaps. Data rather than JSX so a test can hold it to
 * the registry: every prop named here has to exist, and every prop that exists has to be named
 * (`tailwindParity.test.ts`). A prop the library adds and this table forgets fails the suite.
 */

export type ParityStatus = 'has' | 'partial' | 'none';

export interface ParityRow {
  /** The Tailwind utility family, spelled as its documentation spells it. */
  tailwind: string;
  /** The props that cover it, or an empty list. */
  props: string[];
  status: ParityStatus;
  /** What is missing, or why it is not a prop. Required for anything but `has`. */
  note?: string;
}

export interface ParityGroup {
  name: string;
  rows: ParityRow[];
}

/** The note a row carries when the honest reason is that nobody has asked for it. */
const notYet = 'no demand yet';

export const propertyGroups: ParityGroup[] = [
  {
    name: 'Layout',
    rows: [
      { tailwind: 'aspect-ratio', props: ['aspectRatio'], status: 'has' },
      { tailwind: 'box-sizing', props: ['boxSizing'], status: 'has' },
      { tailwind: 'display', props: ['display', 'inline'], status: 'has', note: 'inline is the shorthand for the inline- pair' },
      { tailwind: 'object-fit', props: ['objectFit'], status: 'has' },
      { tailwind: 'overflow', props: ['overflow', 'overflowX', 'overflowY'], status: 'has' },
      { tailwind: 'position', props: ['position'], status: 'has' },
      {
        tailwind: 'top / right / bottom / left / inset / start / end',
        props: ['top', 'right', 'bottom', 'left', 'inset', 'insetX', 'insetY', 'insetStart', 'insetEnd'],
        status: 'has',
        note: 'insetX/insetY are the logical inset-inline/inset-block, insetStart/insetEnd their two sides',
      },
      {
        tailwind: 'anchor positioning',
        props: ['anchorName', 'positionAnchor', 'positionArea', 'positionTryFallbacks', 'positionTryOrder', 'positionVisibility'],
        status: 'has',
        note: 'no Tailwind utility — the browser places and flips the layer, so a floating element costs no JS',
      },
      {
        tailwind: 'border-collapse / border-spacing / table-layout',
        props: ['borderCollapse', 'borderSpacing', 'tableLayout'],
        status: 'has',
        note: 'the three that make a <table> look like one; borderSpacing is on the ÷4 scale',
      },
      { tailwind: 'visibility', props: ['visibility'], status: 'has' },
      { tailwind: 'z-index', props: ['zIndex'], status: 'has' },
      { tailwind: '@container', props: ['container', 'containerName', 'containerType'], status: 'has' },
      { tailwind: 'clip-path', props: ['clipPath'], status: 'has', note: 'takes url(#id) and var(--name), so a shape is a value' },
      { tailwind: 'content-visibility', props: ['contentVisibility'], status: 'has', note: 'no Tailwind utility' },
      { tailwind: 'interpolate-size', props: ['interpolateSize'], status: 'has', note: 'no Tailwind utility' },
      { tailwind: 'object-position', props: [], status: 'none', note: 'the fit, without the position' },
      { tailwind: 'float / clear', props: [], status: 'none', note: 'grid and flex replace both' },
      { tailwind: 'isolation', props: [], status: 'none', note: notYet },
      { tailwind: 'overscroll-behavior', props: [], status: 'none', note: notYet },
      { tailwind: 'columns / break-* / box-decoration-break', props: [], status: 'none', note: 'multi-column and print breaks' },
    ],
  },
  {
    name: 'Flexbox & Grid',
    rows: [
      { tailwind: 'flex-direction', props: ['d'], status: 'has' },
      { tailwind: 'flex-wrap', props: ['flexWrap'], status: 'has' },
      { tailwind: 'flex', props: ['flex1'], status: 'partial', note: 'flex1 is flex: 1; auto, initial and none are not values' },
      { tailwind: 'flex-grow / flex-shrink', props: ['flexGrow', 'flexShrink'], status: 'has' },
      { tailwind: 'order', props: ['order'], status: 'has' },
      { tailwind: 'grid-template-columns / -rows', props: ['gridTemplateColumns', 'gridTemplateRows'], status: 'has' },
      {
        tailwind: 'grid-column / grid-row',
        props: ['gridColumn', 'gridColumnStart', 'gridColumnEnd', 'gridRow', 'gridRowStart', 'gridRowEnd'],
        status: 'has',
      },
      { tailwind: 'gap', props: ['gap', 'rowGap', 'columnGap'], status: 'has' },
      { tailwind: 'justify-content / align-items', props: ['jc', 'ai'], status: 'has', note: 'the two short names this library keeps' },
      {
        tailwind: 'the rest of box alignment',
        props: ['justifyItems', 'justifySelf', 'alignContent', 'alignSelf', 'placeContent', 'placeItems'],
        status: 'has',
        note: "all eight take the overflow-safe values ('safe center')",
      },
      { tailwind: 'place-self', props: [], status: 'none', note: 'alignSelf and justifySelf together' },
      { tailwind: 'flex-basis', props: [], status: 'none', note: 'width, on a flex child' },
      { tailwind: 'grid-auto-flow / -columns / -rows', props: [], status: 'none', note: notYet },
    ],
  },
  {
    name: 'Spacing & Sizing',
    rows: [
      {
        tailwind: 'padding',
        props: ['p', 'px', 'py', 'pt', 'pr', 'pb', 'pl', 'ps', 'pe'],
        status: 'has',
        note: 'divider 4 — p={4} is 1rem; ps/pe are the logical pair, and px is already padding-inline',
      },
      {
        tailwind: 'margin',
        props: ['m', 'mx', 'my', 'mt', 'mr', 'mb', 'ml', 'ms', 'me'],
        status: 'has',
        note: 'ms/me are the logical pair',
      },
      { tailwind: 'width', props: ['width', 'minWidth', 'maxWidth'], status: 'has', note: "'fit' is 100%, '1/2' is 50%" },
      { tailwind: 'height', props: ['height', 'minHeight', 'maxHeight'], status: 'has' },
      { tailwind: 'size', props: [], status: 'none', note: 'width and height, written twice' },
      { tailwind: 'space-x / space-y', props: [], status: 'none', note: 'gap — which Tailwind now recommends over both' },
    ],
  },
  {
    name: 'Typography',
    rows: [
      { tailwind: 'font-size', props: ['fontSize'], status: 'has', note: 'divider 16 — fontSize={14} is 14px' },
      { tailwind: 'font-style / font-weight', props: ['fontStyle', 'fontWeight'], status: 'has' },
      { tailwind: 'letter-spacing / line-height', props: ['letterSpacing', 'lineHeight'], status: 'has', note: 'lineHeight is direct px' },
      { tailwind: 'text-align', props: ['textAlign'], status: 'has', note: "takes 'start'/'end', which follow the text direction" },
      { tailwind: 'color', props: ['color'], status: 'has', note: 'twenty-six OKLCH families, and an opacity modifier on any of them' },
      { tailwind: 'text-transform', props: ['textTransform'], status: 'has' },
      { tailwind: 'text-overflow / text-wrap / white-space', props: ['textOverflow', 'textWrap', 'whiteSpace'], status: 'has' },
      { tailwind: 'text-shadow', props: ['textShadow', 'textShadowColor'], status: 'has' },
      { tailwind: 'content', props: ['content'], status: 'has', note: 'text is quoted for you; attr()/counter()/var() are written as CSS' },
      {
        tailwind: 'text-decoration-line',
        props: ['textDecoration'],
        status: 'partial',
        note: 'the line only — colour, style and thickness are not props',
      },
      { tailwind: 'list-style-type', props: ['listStyle'], status: 'partial', note: 'square and none, plus the two positions' },
      { tailwind: 'font-family', props: [], status: 'none', note: 'a project-wide decision: one vars entry, or the base stylesheet' },
      { tailwind: 'line-clamp', props: [], status: 'none', note: notYet },
      { tailwind: 'font-variant-numeric / font-stretch / font-smoothing', props: [], status: 'none', note: notYet },
      { tailwind: 'text-indent / vertical-align / word-break / hyphens', props: [], status: 'none', note: notYet },
    ],
  },
  {
    name: 'Backgrounds & Borders',
    rows: [
      { tailwind: 'background-color', props: ['bgColor'], status: 'has' },
      {
        tailwind: 'background-image',
        props: ['bgImage', 'bgGradient'],
        status: 'has',
        note: 'a gradient is a record whose stops are palette values, so it is themed and shares a class',
      },
      { tailwind: 'background-clip', props: ['bgClip'], status: 'has', note: 'needs color="transparent" beside it to show' },
      {
        tailwind: 'border-width',
        props: ['b', 'bx', 'by', 'bt', 'br', 'bb', 'bl', 'bs', 'be'],
        status: 'has',
        note: 'direct px — b={1} is 1px; bs/be are the logical pair',
      },
      { tailwind: 'border-color / border-style', props: ['borderColor', 'borderStyle'], status: 'has' },
      {
        tailwind: 'border-radius',
        props: [
          'borderRadius',
          'borderRadiusTop',
          'borderRadiusRight',
          'borderRadiusBottom',
          'borderRadiusLeft',
          'borderRadiusTopLeft',
          'borderRadiusTopRight',
          'borderRadiusBottomRight',
          'borderRadiusBottomLeft',
          'borderRadiusStart',
          'borderRadiusEnd',
          'borderRadiusStartStart',
          'borderRadiusStartEnd',
          'borderRadiusEndEnd',
          'borderRadiusEndStart',
        ],
        status: 'has',
        note: 'divider 4, the spacing scale',
      },
      { tailwind: 'outline', props: ['outline', 'outlineStyle', 'outlineOffset', 'outlineColor'], status: 'has' },
      {
        tailwind: 'ring',
        props: ['ring', 'insetRing', 'ringColor', 'insetRingColor'],
        status: 'has',
        note: 'a width in px that follows borderRadius and costs no layout',
      },
      {
        tailwind: 'background-position / -repeat / -size / -attachment / -origin',
        props: [],
        status: 'none',
        note: 'the gradient and mask records cover what most pages want from them',
      },
      { tailwind: 'divide-*', props: [], status: 'none', note: 'a border on the child, with nth to drop the last one' },
    ],
  },
  {
    name: 'Effects & Filters',
    rows: [
      {
        tailwind: 'box-shadow',
        props: ['shadow', 'insetShadow', 'shadowColor', 'insetShadowColor'],
        status: 'has',
        note: 'four layers of one property, so they stack instead of overwriting',
      },
      { tailwind: 'opacity', props: ['opacity'], status: 'has' },
      {
        tailwind: 'filter',
        props: ['blur', 'brightness', 'contrast', 'grayscale', 'hueRotate', 'invert', 'saturate', 'sepia', 'dropShadow', 'dropShadowColor'],
        status: 'has',
        note: 'nine functions, each its own layer of one composed filter',
      },
      {
        tailwind: 'backdrop-filter',
        props: [
          'backdropBlur',
          'backdropBrightness',
          'backdropContrast',
          'backdropGrayscale',
          'backdropHueRotate',
          'backdropInvert',
          'backdropOpacity',
          'backdropSaturate',
          'backdropSepia',
          'backdropFilter',
        ],
        status: 'has',
      },
      {
        tailwind: 'mask-image',
        props: ['maskImage'],
        status: 'partial',
        note: 'the image — it takes the gradient record; mask-size/position/repeat/composite are not props',
      },
      { tailwind: 'mix-blend-mode / background-blend-mode', props: [], status: 'none', note: notYet },
      {
        tailwind: 'forced-color-adjust',
        props: [],
        status: 'none',
        note: 'the forcedColors block is the way in, with the system colours as values',
      },
    ],
  },
  {
    name: 'Transitions, Animation & Transforms',
    rows: [
      {
        tailwind: 'transition-property / -duration / -timing-function / -delay / -behavior',
        props: ['transition', 'transitionDuration', 'transitionTimingFunction', 'transitionDelay', 'transitionBehavior'],
        status: 'has',
        note: 'times are milliseconds; a spring name goes on the curve *and* the duration',
      },
      {
        tailwind: 'animation',
        props: [
          'animation',
          'animationName',
          'animationDuration',
          'animationDelay',
          'animationDirection',
          'animationFillMode',
          'animationIterationCount',
          'animationPlayState',
          'animationTimingFunction',
        ],
        status: 'has',
        note: 'four presets that stop under reduced motion on their own, and Box.keyframes() for the rest',
      },
      {
        tailwind: 'rotate / scale / translate',
        props: ['rotate', 'scale', 'flip', 'translateX', 'translateY'],
        status: 'has',
        note: 'CSS longhands, so they compose instead of overwriting one transform',
      },
      { tailwind: 'will-change', props: ['willChange'], status: 'has' },
      { tailwind: 'skew / transform-origin', props: [], status: 'none', note: notYet },
      { tailwind: 'perspective / transform-style / backface-visibility', props: [], status: 'none', note: '3D transforms' },
    ],
  },
  {
    name: 'Interactivity',
    rows: [
      {
        tailwind: 'accent-color / caret-color',
        props: ['accentColor', 'caretColor'],
        status: 'has',
        note: 'the parts of a native control the page does not draw',
      },
      { tailwind: 'appearance', props: ['appearance'], status: 'has' },
      { tailwind: 'color-scheme', props: ['colorScheme'], status: 'has' },
      { tailwind: 'cursor', props: ['cursor'], status: 'has' },
      { tailwind: 'field-sizing', props: ['fieldSizing'], status: 'has' },
      { tailwind: 'pointer-events', props: ['pointerEvents'], status: 'has' },
      { tailwind: 'resize', props: ['resize'], status: 'has' },
      {
        tailwind: 'user-select',
        props: ['userSelect'],
        status: 'partial',
        note: 'contain is deliberately absent: Chrome computes it to auto',
      },
      { tailwind: 'scrollbar', props: ['scrollbarWidth', 'scrollbarColor', 'scrollbarGutter'], status: 'has', note: 'no Tailwind utility' },
      { tailwind: 'scroll-behavior / scroll-margin / scroll-padding / scroll-snap-*', props: [], status: 'none', note: notYet },
      { tailwind: 'touch-action', props: [], status: 'none', note: notYet },
    ],
  },
  {
    name: 'SVG',
    rows: [
      {
        tailwind: 'fill',
        props: ['fill', 'fillOpacity', 'fillRule'],
        status: 'has',
        note: 'takes url(#id) and var(--name), so a gradient is a value',
      },
      { tailwind: 'stroke / stroke-width', props: ['stroke', 'strokeOpacity', 'strokeWidth'], status: 'has' },
      {
        tailwind: 'the rest of stroke',
        props: ['strokeLinecap', 'strokeLinejoin', 'strokeMiterlimit', 'strokeDasharray', 'strokeDashoffset'],
        status: 'has',
        note: 'no Tailwind utility — and a dash length that transitions is what animates a chart',
      },
      {
        tailwind: 'paint and text rendering',
        props: ['paintOrder', 'vectorEffect', 'shapeRendering', 'textAnchor', 'dominantBaseline'],
        status: 'has',
        note: 'no Tailwind utility',
      },
      {
        tailwind: 'geometry',
        props: ['cx', 'cy', 'r', 'rx', 'ry', 'x', 'y'],
        status: 'has',
        note: 'no Tailwind utility: real CSS, so unlike the attributes they transition',
      },
    ],
  },
  {
    name: 'Tables',
    rows: [
      {
        tailwind: 'border-collapse / border-spacing / table-layout / caption-side',
        props: [],
        status: 'none',
        note: "the four table properties — this site's own tables still reach for a style attribute",
      },
    ],
  },
  {
    name: 'Custom properties',
    rows: [
      {
        tailwind: '--custom-property',
        props: ['vars'],
        status: 'has',
        note: 'the answer for markup this library does not render — a chart, a third-party widget',
      },
      {
        tailwind: 'arbitrary properties ([mask-type:luminance])',
        props: ['css'],
        status: 'has',
        note: 'the typed escape hatch: a style object compiled to a class, never an inline style — the 5% every other row is not',
      },
    ],
  },
];

export const variantGroups: ParityGroup[] = [
  {
    name: 'States',
    rows: [
      {
        tailwind: 'hover / focus / focus-visible / focus-within / active',
        props: ['hover', 'focus', 'focusVisible', 'active'],
        status: 'has',
        note: 'focus is :focus-within, which is what a wrapper wants',
      },
      {
        tailwind: 'disabled / checked / indeterminate / required / valid / invalid / optional',
        props: ['disabled', 'checked', 'indeterminate', 'required', 'valid', 'invalid', 'optional', 'selected'],
        status: 'has',
        note: 'valid/invalid are :user-valid — the state after the user has had a turn',
      },
      {
        tailwind: 'visited / target / open / placeholder-shown / autofill / in-range / out-of-range / inert',
        props: ['visited', 'target', 'open', 'placeholderShown', 'autofill', 'inRange', 'outOfRange', 'inert'],
        status: 'has',
      },
      {
        tailwind: 'has-*',
        props: ['has', 'hasFocus', 'hasChecked', 'hasValid', 'hasInvalid', 'hasRequired', 'hasDisabled'],
        status: 'has',
        note: 'the general key, plus the six worth a name of their own',
      },
      { tailwind: 'not-*', props: ['not'], status: 'has', note: 'keyed by state name, so it stays typed' },
      { tailwind: 'data-* / aria-*', props: ['dataAttr', 'ariaAttr'], status: 'has', note: 'a bare aria key means ="true"' },
      { tailwind: 'first / last / only / odd / even / nth-*', props: ['nth'], status: 'has', note: "one key: 'first', '2n+1', 'last 2'" },
      {
        tailwind: 'group-* / peer-*',
        props: ['group', 'peer'],
        status: 'has',
        note: "a state on the default class or a named one — 'card/hover', 'row/data-state=open'",
      },
      { tailwind: 'read-only / default / empty', props: [], status: 'none', note: notYet },
      { tailwind: 'first-of-type / last-of-type / nth-of-type', props: [], status: 'none', note: 'nth counts children, not types' },
    ],
  },
  {
    name: 'Pseudo-elements',
    rows: [
      {
        tailwind: 'before / after',
        props: ['before', 'after'],
        status: 'has',
        note: "both come with content: '' — a generated element with none renders nothing",
      },
      {
        tailwind: 'placeholder / selection / marker / first-line / first-letter / backdrop / file',
        props: ['placeholder', 'selection', 'marker', 'firstLine', 'firstLetter', 'backdrop', 'fileButton'],
        status: 'has',
        note: "marker and selection reach descendants, as Tailwind's do",
      },
    ],
  },
  {
    name: 'Media, container and theme',
    rows: [
      { tailwind: 'sm … 2xl', props: ['sm', 'md', 'lg', 'xl', 'xxl'], status: 'has' },
      {
        tailwind: '@sm … @2xl (container)',
        props: ['cq'],
        status: 'has',
        note: 'six sizes, each with a complement — maxMd is not (min-width)',
      },
      { tailwind: 'dark', props: ['theme'], status: 'has', note: 'any number of themes, not just two' },
      {
        tailwind: 'motion-reduce / contrast-more / forced-colors',
        props: ['motionReduce', 'contrastMore', 'forcedColors'],
        status: 'has',
        note: 'reduced motion is the default: the base transition rides a variable it zeroes',
      },
      { tailwind: 'pointer-coarse / pointer-fine', props: ['pointerCoarse', 'pointerFine'], status: 'has' },
      {
        tailwind: 'starting',
        props: ['startingStyle'],
        status: 'has',
        note: 'every starting rule is emitted !important, or specificity kills the entrance',
      },
      { tailwind: 'max-sm … max-2xl', props: [], status: 'none', note: 'the container sizes have complements; the breakpoints do not' },
      {
        tailwind: 'rtl / ltr',
        props: ['rtl', 'ltr'],
        status: 'has',
        note: String.raw`:dir(), not [dir="rtl"] & — the direction belongs to this element, so a <bdi> or dir="auto" is seen`,
      },
      { tailwind: 'print / motion-safe / supports-*', props: [], status: 'none', note: notYet },
      {
        tailwind: 'arbitrary variants ([&>*]:)',
        props: [],
        status: 'none',
        note: 'a selector this library did not compile is the one thing it will not emit',
      },
    ],
  },
];

/** Every row in the table, both halves. */
export const allGroups: ParityGroup[] = [...propertyGroups, ...variantGroups];

export function countBy(groups: ParityGroup[], status: ParityStatus): number {
  return groups.reduce((sum, group) => sum + group.rows.filter((row) => row.status === status).length, 0);
}
