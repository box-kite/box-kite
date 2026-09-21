import propsApi from '../../api/props.json';
import { createStyleEngine } from '../../src/core';
import type { BoxStyleProps } from '../../src/types';

/**
 * What the /box and /box-functions pages say, as data — so `box.test.ts` can hold each claim to the thing
 * it is a claim about: a scale row to the CSS the engine writes for it, a category to `api/props.json`,
 * the member list to `src/box.ts`. The page below is rendering only.
 */

/** One prop out of the generated reference, as this page reads it. */
export interface PropEntry {
  name: string;
  description: string;
  /** The CSS properties it writes — what the category is derived from. */
  properties: string[];
  /** A value the engine was actually asked for, and the declaration it answered with. */
  example: { value: string | number | boolean; css: string };
  numeric: boolean;
  /** Whether a value outside `values` is accepted — a number, a token, an arbitrary string. */
  open: boolean;
  /** The values it names. Absent past forty of them, where `valueCount` is the figure instead. */
  values?: (string | number | boolean)[];
  valueCount?: number;
}

export const props = propsApi.props as PropEntry[];
export const propCount = propsApi.propCount;

/**
 * An engine of this page's own: readable class names and an in-memory sink, so the scale table below can
 * ask what a prop really writes instead of repeating a divider that would then be free to drift. It is
 * never rendered — nothing reads its CSS but the string this module pulls out of it.
 */
const probe = createStyleEngine({ classNames: 'readable', sink: 'string', styleElementId: 'box-page-probe' });

/** What a Box with no props at all wears — the reset, which is not any prop's answer. */
const baseClasses = probe.classNames({}).split(' ');

/** A class name as it appears in rule text: the engine escapes everything that is not an identifier character. */
const escapeClass = (name: string) => name.replace(/[^a-zA-Z0-9_-]/g, (character) => `\\${character}`);

/**
 * The declarations one prop writes for one value, measured. An empty string is an answer too: a value a
 * prop does not accept emits no rule and no class name, which is the page's point about typed values.
 */
export function declarationsFor(prop: string, value: number | string): string {
  // Diffed against the base class every Box carries: a refused value leaves that class alone on the list,
  // and reading the last one regardless would hand back the reset block as if it were the prop's answer.
  const classes = probe.classNames({ [prop]: value } as BoxStyleProps).split(' ');
  const className = classes.filter((name) => !baseClasses.includes(name)).pop();
  if (!className) return '';

  const css = probe.getStyles();
  const start = css.lastIndexOf(`.${escapeClass(className)}{`);
  if (start === -1) return '';

  const open = css.indexOf('{', start);
  const body = css.slice(open + 1, css.indexOf('}', open));

  // Spaced the way `scripts/propsApi.mjs` spaces the generated examples, so the two tables on this page
  // read as one. Only the first colon of a declaration, since a `url(data:…)` value carries its own.
  return body
    .split(';')
    .map((declaration) => declaration.replace(':', ': '))
    .join('; ');
}

/**
 * The number families, in the order the page walks them. Every row is the same number written on a
 * different prop, which is the whole lesson: the divider belongs to the prop, not to the library.
 */
export interface ScaleRow {
  /** The prop, spelled as it is written in JSX. */
  prop: string;
  /** What the number is measured in, once the prop has had it. */
  unit: string;
  /** Why it is that and not pixels. */
  note: string;
}

export const scaleRows: readonly ScaleRow[] = [
  { prop: 'p', unit: 'rem, ÷4', note: 'The spacing scale. 4 is 1rem, which is the step everything else is a multiple of.' },
  { prop: 'gap', unit: 'rem, ÷4', note: 'Same scale as padding and margin, so a gap lines up with the space around it.' },
  { prop: 'width', unit: 'rem, ÷4', note: 'Sizes are on the spacing scale too — and take "1/2", "fit" and "fit-screen" besides.' },
  { prop: 'borderRadius', unit: 'rem, ÷4', note: 'The spacing scale again, so a radius matches the padding inside it.' },
  { prop: 'fontSize', unit: 'rem, ÷16', note: 'Divided by 16, so the number you write is the pixel size you meant.' },
  { prop: 'lineHeight', unit: 'px', note: 'A line box is a measurement, not a step on a scale.' },
  { prop: 'b', unit: 'px', note: 'A border is drawn in device pixels. 1 means one pixel, not a quarter of a rem.' },
  { prop: 'strokeWidth', unit: 'user units', note: 'SVG has its own coordinate system, so no divider and no unit at all.' },
  { prop: 'transitionDuration', unit: 'ms', note: 'Every time on every prop is milliseconds.' },
];

/** The four things a plausible memory of another library gets wrong, plus the one that makes the rest compose. */
export interface Trap {
  id: string;
  /** What is true, in the fewest words — the line a reader skimming takes away. */
  title: string;
  /** What a reader arrives believing, printed small above it so the card is never read the wrong way round. */
  guess: string;
  /** What is true instead. */
  answer: string;
  /** The line that shows it, and the line it replaces. */
  wrong?: string;
  right: string;
  /** Where the whole story is. */
  more?: { label: string; to: string };
}

export const traps: readonly Trap[] = [
  {
    id: 'numbers',
    title: 'A number is a step on that prop’s own scale',
    guess: 'A number is a pixel value.',
    answer:
      'Spacing, sizing and radius divide by 4; fontSize divides by 16; border width, line height and every duration are written out as they stand. The table two sections down is all nine families with one number in them.',
    wrong: '<Box p={16} fontSize={14} b={1} />  // 16px of padding?',
    right: '<Box p={4} fontSize={14} b={1} />  // padding: 1rem · font-size: 0.875rem · border-width: 1px',
  },
  {
    id: 'style',
    title: 'There is no style prop — css is, and it is a class',
    guess: 'Anything the props miss goes in style={{ }}.',
    answer:
      'It takes the same style object and compiles it into a shared class, so it nests inside hover, a breakpoint or a theme like every other prop and renders on a server. An inline style can do none of that.',
    wrong: "<Box style={{ mixBlendMode: 'multiply' }} />",
    right: "<Box css={{ mixBlendMode: 'multiply' }} />",
    more: { label: 'Escape Hatch', to: '/escape-hatch' },
  },
  {
    id: 'element',
    title: 'The element comes from the component',
    guess: 'You pick the element with tag.',
    answer:
      'There is one per tag you are likely to want, each with its defaults already decided. tag is the fallback for the rest, and a display value is never how you pick one.',
    wrong: '<Box tag="button"> · <Box tag="h1"> · <Box display="flex">',
    right: '<Button> · <H1> · <Flex>',
  },
  {
    id: 'attributes',
    title: 'HTML attributes go in props',
    guess: 'HTML attributes sit beside the style props.',
    answer:
      'Box forwards that object and nothing else. An href or a data-state written at the top level still typechecks — JSX allows any hyphenated attribute — and is then dropped, with nothing anywhere to say so.',
    wrong: '<Link href="/about" data-state="open">',
    right: "<Link props={{ href: '/about', 'data-state': 'open' }}>",
  },
  {
    id: 'nesting',
    title: 'Every prop nests',
    guess: 'A hover style needs a second prop, a class or a state hook.',
    answer:
      'hover, focus, a breakpoint, a theme and a dozen others each take the same props again, so one element carries every state it has. None of them re-renders anything: they were all in the stylesheet before the page loaded.',
    right: "<Box bgColor=\"slate-100\" hover={{ bgColor: 'slate-200' }} md={{ p: 6 }} theme={{ dark: { bgColor: 'slate-800' } }} />",
  },
];

/** Every key that takes a nested block of props, with the one line that says when to reach for it. */
export interface NestingKey {
  /** The keys themselves, as they are written. */
  keys: string;
  /** What they select. */
  what: string;
  example: string;
  more?: { label: string; to: string };
}

export const nestingKeys: readonly NestingKey[] = [
  {
    keys: 'hover, focus, active, disabled, checked, visited, open, …',
    what: 'A state the browser knows the element is in.',
    example: `hover={{ bgColor: 'slate-200' }}`,
  },
  {
    keys: 'sm, md, lg, xl, xxl',
    what: 'A viewport at least that wide — 640, 768, 1024, 1280, 1536px.',
    example: `md={{ p: 6 }}`,
  },
  {
    keys: 'cq',
    what: 'The width of the nearest container, rather than of the window.',
    example: `cq={{ md: { d: 'row' } }}`,
    more: { label: 'Container Queries', to: '/container-queries' },
  },
  {
    keys: 'theme',
    what: 'A named theme on an ancestor — light and dark, or one of your own.',
    example: `theme={{ dark: { bgColor: 'slate-800' } }}`,
    more: { label: 'Theme Setup', to: '/theme-setup' },
  },
  {
    keys: 'dataAttr, ariaAttr, has, not, nth',
    what: 'A state your own code sets, what the element contains, or where it sits among its siblings.',
    example: `dataAttr={{ 'state=open': { rotate: 180 } }}`,
    more: { label: 'State Variants', to: '/variants' },
  },
  {
    keys: 'group, peer',
    what: 'Something an ancestor or a preceding sibling is doing.',
    example: `group={{ 'card/hover': { opacity: 1 } }}`,
    more: { label: 'State Variants', to: '/variants' },
  },
  {
    keys: 'before, after, placeholder, selection, marker, …',
    what: 'A pseudo-element. CSS allows one, so the types allow one.',
    example: `after={{ content: 'New', color: 'amber-500' }}`,
    more: { label: 'Pseudo-Elements', to: '/pseudo-elements' },
  },
  {
    keys: 'startingStyle',
    what: 'What a just-mounted element starts from, so it transitions in.',
    example: `startingStyle={{ opacity: 0, translateY: 2 }}`,
    more: { label: 'Animation', to: '/animation' },
  },
  {
    keys: 'motionReduce, forcedColors, contrastMore, pointerCoarse, pointerFine',
    what: 'What the reader asked their operating system for. Ranked above every breakpoint.',
    example: `motionReduce={{ transition: 'none' }}`,
  },
  {
    keys: 'rtl, ltr',
    what: 'The direction this element resolved to, read off dir.',
    example: `rtl={{ flip: 'xAxis' }}`,
    more: { label: 'Right to Left', to: '/rtl' },
  },
];

/** The props that are not styles — the ones a reader looks for in the finder and does not find. */
export interface PlainProp {
  name: string;
  type: string;
  what: string;
}

export const plainProps: readonly PlainProp[] = [
  { name: 'tag', type: `'div' | 'section' | 'button' | …`, what: 'The element to render. The fallback for a tag no component covers.' },
  {
    name: 'props',
    type: `attributes of that tag`,
    what: 'Every HTML attribute: href, type, name, onClick, role, data-* and aria-*. Box forwards this object and nothing else.',
  },
  { name: 'id', type: 'string', what: 'Lifted to the top level because an id is written so often. It reaches the element unchanged.' },
  {
    name: 'className',
    type: 'string | string[] | Record<string, boolean>',
    what: 'Merged with the classes the engine resolved — for a class from somewhere else, not for styling.',
  },
  {
    name: 'component, variant',
    type: 'a registered name',
    what: 'The styles a Box.components() entry holds, and one of its variants. Both names are typed.',
  },
  { name: 'clean', type: 'boolean', what: 'Drop the component defaults this element would otherwise inherit and start from nothing.' },
  { name: 'children', type: 'ReactNode | (({ isHover }) => ReactNode)', what: 'The content. A function form is handed the hover state.' },
  {
    name: 'style',
    type: 'CSSProperties',
    what: 'It exists, and it is almost never the answer — use css instead. The library itself reaches for it three times, all per instance and per frame: a slider thumb’s offset, an anchor’s name and a dragged widget’s position.',
  },
];

/** The categories the finder filters by, in the order it offers them. First match wins, so the order is the decision. */
export interface PropCategory {
  id: string;
  label: string;
  /** One line about what the family is for, shown when the filter is on it. */
  blurb: string;
  match(prop: PropEntry): boolean;
}

const COLOR_PROPERTIES = new Set([
  'color',
  'background-color',
  'border-color',
  'outline-color',
  'accent-color',
  'caret-color',
  'color-scheme',
]);
const SVG_PROPERTIES = new Set([
  'paint-order',
  'vector-effect',
  'shape-rendering',
  'text-anchor',
  'dominant-baseline',
  'cx',
  'cy',
  'r',
  'rx',
  'ry',
  'x',
  'y',
]);

const writes = (prop: PropEntry, matches: (property: string) => boolean) => prop.properties.some(matches);
const onlyWrites = (prop: PropEntry, matches: (property: string) => boolean) => prop.properties.every(matches);

/**
 * A prop's family, derived from the CSS it writes rather than typed out beside it — so a prop added to the
 * registry is filed by the same rule as the 221 already here, and `box.test.ts` fails if one is not.
 */
export const propCategories: readonly PropCategory[] = [
  {
    id: 'spacing',
    label: 'Spacing',
    blurb: 'Margin, padding and gap, all on the ÷4 scale. The logical pairs (ms/me, ps/pe) mirror with the reading order.',
    match: (prop) =>
      onlyWrites(
        prop,
        (css) => css.startsWith('margin') || css.startsWith('padding') || css === 'gap' || css === 'row-gap' || css === 'column-gap',
      ),
  },
  {
    id: 'sizing',
    label: 'Size',
    blurb: 'Width, height and their bounds — on the ÷4 scale, or a fraction ("1/2"), "fit" for 100% and "fit-screen" for the viewport.',
    match: (prop) =>
      writes(
        prop,
        (css) =>
          ['width', 'height', 'aspect-ratio', 'box-sizing', 'interpolate-size', 'object-fit'].includes(css) ||
          css.startsWith('min-') ||
          css.startsWith('max-'),
      ),
  },
  {
    id: 'layout',
    label: 'Layout',
    blurb: 'Flexbox, grid, alignment and the table and container-type longhands. Reach for <Flex> and <Grid> rather than display.',
    match: (prop) =>
      writes(
        prop,
        (css) =>
          ['display', 'order', 'border-collapse', 'border-spacing', 'table-layout'].includes(css) ||
          css.startsWith('flex') ||
          css.startsWith('justify') ||
          css.startsWith('align') ||
          css.startsWith('place') ||
          css.startsWith('grid-') ||
          css.startsWith('container-'),
      ),
  },
  {
    id: 'position',
    label: 'Position',
    blurb: 'Where an element sits and what it is anchored to — the inset props take fractions and "auto" as well as the ÷4 scale.',
    match: (prop) =>
      writes(
        prop,
        (css) =>
          ['position', 'z-index', 'top', 'right', 'bottom', 'left', 'anchor-name'].includes(css) ||
          css.startsWith('inset') ||
          css.startsWith('position-'),
      ),
  },
  {
    id: 'typography',
    label: 'Text',
    blurb: 'fontSize divides by 16 and lineHeight is written in pixels — the one pair on this page that do not share a scale.',
    match: (prop) =>
      writes(
        prop,
        (css) =>
          css.startsWith('font-') ||
          css.startsWith('text-') ||
          css === '--boxTextShadowColor' ||
          ['line-height', 'letter-spacing', 'white-space', 'list-style', 'content'].includes(css),
      ),
  },
  {
    id: 'color',
    label: 'Color',
    blurb:
      'Every colour prop takes a palette token, and every token takes an opacity modifier: "blue-500/40" is a mix, not a second palette.',
    match: (prop) => onlyWrites(prop, (css) => COLOR_PROPERTIES.has(css)),
  },
  {
    id: 'border',
    label: 'Border',
    blurb: 'Width in pixels, radius on the ÷4 scale. Outline is here too; a ring, which costs no layout, is under effects.',
    match: (prop) =>
      onlyWrites(
        prop,
        (css) => (css.startsWith('border-') && css !== 'border-collapse' && css !== 'border-spacing') || css.startsWith('outline'),
      ),
  },
  {
    id: 'effects',
    label: 'Background & effects',
    blurb: 'Gradients, the four shadow layers and the nine filters — each one its own prop, all stacking into one declaration.',
    match: (prop) =>
      writes(
        prop,
        (css) =>
          ['box-shadow', 'filter', 'backdrop-filter', 'opacity', 'background-image', 'background-clip', 'mask-image'].includes(css) ||
          css.startsWith('--box'),
      ),
  },
  {
    id: 'motion',
    label: 'Transform & motion',
    blurb: 'The transform props are longhands, so they compose. Every duration and delay is milliseconds.',
    match: (prop) =>
      writes(
        prop,
        (css) =>
          ['translate', 'rotate', 'scale', 'will-change'].includes(css) || css.startsWith('transition-') || css.startsWith('animation'),
      ),
  },
  {
    id: 'svg',
    label: 'SVG',
    blurb: 'Paint and geometry as props, so a fill can be themed and hovered. No divider and no unit: the number is SVG user units.',
    match: (prop) => writes(prop, (css) => css.startsWith('fill') || css.startsWith('stroke') || SVG_PROPERTIES.has(css)),
  },
  {
    id: 'control',
    label: 'Interaction & overflow',
    blurb: 'What the pointer, the caret and the scrollbar do — and what happens to content that does not fit.',
    // The catch-all: it is tried last, so what reaches it is what no family above claimed.
    match: () => true,
  },
  {
    id: 'escape',
    label: 'Escape hatches',
    blurb:
      'The two props whose value is not a fixed set: a CSS property with no prop, and a custom property for markup this library does not render.',
    match: (prop) => ['vars', 'css'].includes(prop.name),
  },
];

/**
 * The order the rules are tried in, which is not the order they are offered in: `svg` before `typography`
 * so `textAnchor` is an SVG prop, `color` before `border` so `borderColor` is a colour, and `control`
 * last because it is the catch-all.
 */
const MATCH_ORDER = [
  'escape',
  'svg',
  'spacing',
  'color',
  'typography',
  'border',
  'position',
  'motion',
  'effects',
  'layout',
  'sizing',
  'control',
];

const orderedCategories = MATCH_ORDER.map((id) => propCategories.find((category) => category.id === id)!);

/** Which family a prop belongs to. Every prop belongs to one, which is what the test checks. */
export function categoryOf(prop: PropEntry): PropCategory {
  return orderedCategories.find((category) => category.match(prop))!;
}

/** How many props each family holds, for the filter's counts. */
export function categoryCounts(entries: readonly PropEntry[] = props): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const prop of entries) {
    const { id } = categoryOf(prop);
    counts[id] = (counts[id] ?? 0) + 1;
  }

  return counts;
}

/**
 * A prop's measured example as it is written in JSX — `p={4}`, `display="flex"`, `flex1`. The value is
 * whatever the engine was handed, so an object or a list is printed as the braces a reader would type.
 */
export function writtenExample(prop: PropEntry): string {
  const { value } = prop.example as { value: unknown };

  if (value === true) return prop.name;
  if (typeof value === 'number') return `${prop.name}={${value}}`;
  if (typeof value === 'string') return `${prop.name}="${value}"`;

  return `${prop.name}={${JSON.stringify(value)
    .replace(/"([^"]+)":/g, '$1: ')
    .replace(/,/g, ', ')}}`;
}

/**
 * The line under a prop's description saying what it accepts. Past forty values the reference keeps a
 * count instead of the list, and a prop that names none takes whatever its type allows — a number, a
 * token, a length — which is what `numeric` and `open` are for.
 */
export function namedValues(prop: PropEntry): string {
  const lead = prop.open ? 'Includes' : 'One of';

  if (prop.valueCount) return `${lead}: ${prop.valueCount} named values`;

  const values = prop.values ?? [];
  if (values.length === 0) return prop.numeric ? 'Takes a number' : '';

  const shown = values.slice(0, 12).map(String).join(', ');

  return `${lead}: ${shown}${values.length > 12 ? ` and ${values.length - 12} more` : ''}`;
}

/** A prop matches a search when its name, its CSS or its description does. */
export function matchesSearch(prop: PropEntry, search: string): boolean {
  const term = search.trim().toLowerCase();
  if (!term) return true;

  return (
    prop.name.toLowerCase().includes(term) ||
    prop.properties.some((css) => css.includes(term)) ||
    prop.description.toLowerCase().includes(term) ||
    (prop.values ?? []).some((value) => String(value).toLowerCase() === term)
  );
}

/** Everything on Box that is not a prop, plus the two hooks exported beside it. */
export interface BoxMember {
  id: string;
  /** How it is written, with its arguments. */
  name: string;
  signature: string;
  /** One sentence: what it is for. */
  summary: string;
  /** Where the whole story is, when another page already tells it. */
  more?: { label: string; to: string };
}

export const boxMembers: readonly BoxMember[] = [
  {
    id: 'extend',
    name: 'Box.extend()',
    signature: 'Box.extend(variables, newProps, newValues)',
    summary:
      'Add CSS variables, props of your own, and extra values on props that already exist. Afterwards they are indistinguishable from built-ins.',
    more: { label: 'Style Grouping', to: '/style-grouping' },
  },
  {
    id: 'components',
    name: 'Box.components()',
    signature: 'Box.components({ card: { styles, variants, children, extends } })',
    summary: 'Name a set of styles — with variants, named parts and inheritance — and wear it with component="card".',
  },
  {
    id: 'keyframes',
    name: 'Box.keyframes()',
    signature: 'Box.keyframes({ slideIn: { from: {…}, to: {…} } })',
    summary: 'Register an @keyframes sequence whose steps are Box props. Nothing is emitted until a rule names it.',
    more: { label: 'Animation', to: '/animation' },
  },
  {
    id: 'spring',
    name: 'Box.spring()',
    signature: 'Box.spring({ stiffness, damping, mass, velocity })',
    summary:
      'Sample a damped oscillator into { easing, duration } — the two halves the timing-function and duration props take. No runtime.',
    more: { label: 'Animation', to: '/animation' },
  },
  {
    id: 'viewtransition',
    name: 'Box.viewTransition()',
    signature: 'Box.viewTransition(update, { reducedMotion, types })',
    summary:
      'Run a DOM change inside a view transition where the browser has one, and plainly where it has not — the same three promises either way.',
    more: { label: 'Animation', to: '/animation' },
  },
  {
    id: 'theme',
    name: 'Box.Theme',
    signature: '<Box.Theme use="global" storageKey="theme" globalStyles={…}>',
    summary:
      'The provider that writes a theme class onto <html> or onto a wrapper of its own, follows the system preference and persists a choice.',
    more: { label: 'Theme Setup', to: '/theme-setup' },
  },
  {
    id: 'usetheme',
    name: 'Box.useTheme()',
    signature: 'const [theme, setTheme] = Box.useTheme()',
    summary: 'Read the theme the nearest provider settled on, and set it. Passing null hands control back to the system preference.',
    more: { label: 'Theme Setup', to: '/theme-setup' },
  },
  {
    id: 'configure',
    name: 'Box.configure()',
    signature: 'Box.configure({ classNames, sink, transition })',
    summary:
      'Tell the engine how to name classes, where to write rules and what the base class transitions. Call it once, before the first render.',
    more: { label: 'Server Components', to: '/server-components' },
  },
  {
    id: 'getvariablevalue',
    name: 'Box.getVariableValue()',
    signature: 'Box.getVariableValue("sky-500")',
    summary: 'The var(--…) reference behind a token, declared on first use — for handing a themed colour to something that takes a string.',
  },
  {
    id: 'useclassnames',
    name: 'useClassNames()',
    signature: 'const { className, styles } = useClassNames(props)',
    summary:
      'Box props as a class attribute, for an element Box cannot render: a router’s NavLink, a motion.div, an icon from another library.',
  },
  {
    id: 'usevisibility',
    name: 'useVisibility()',
    signature: 'const [visible, setVisible, ref] = useVisibility(options)',
    summary: 'Open/closed state that closes itself on an outside press, on Escape, and optionally on scroll or resize.',
  },
];
