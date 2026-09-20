import {
  breakpoints,
  mediaFeatures,
  pseudoClasses,
  pseudoElements,
  pseudoGroupClasses,
  startingStyleKey,
  themeGroupClass,
} from '../../src/core/boxStyles';
import Containers from '../../src/core/containers';
import Groups from '../../src/core/groups';
import Variants from '../../src/core/variants';

/**
 * Every key a Box takes that is *not* one of the 221 style props: the nesting keys, and the four
 * reserved names. Imported from the engine's own records rather than listed here, so a key added to
 * the library is in the MCP server the same day — the whole reason this package lives in this repo.
 */

/** What a nesting key is for, in one line — the engine's records carry the selector, not the reason. */
const KINDS = {
  pseudoClass: 'a state of this element',
  pseudoElement: 'a pseudo-element of this element (one per Box)',
  breakpoint: 'a viewport width, min-width and up',
  media: 'a reader preference or input device',
  container: 'the width of the nearest query container',
  variant: "an attribute or position on this element's own selector",
  group: "an ancestor's or a preceding sibling's state",
  theme: 'one named theme',
  startingStyle: 'what these props start from, the first time the element is styled',
} as const;

export type NestingKind = keyof typeof KINDS;

export interface NestingKey {
  key: string;
  kind: NestingKind;
  /** What it compiles to — a selector fragment, an at-rule prelude, or a width in px. */
  compiles: string;
  deprecated: boolean;
}

/** The five older group spellings, kept working and deprecated in favour of `group={{ 'card/hover': … }}`. */
const DEPRECATED = new Set<string>([...Object.keys(pseudoGroupClasses), 'placeholderStyles']);

const from = (record: Record<string, string | number>, kind: NestingKind): NestingKey[] =>
  Object.entries(record).map(([key, value]) => ({ key, kind, compiles: String(value), deprecated: DEPRECATED.has(key) }));

/** Every nesting key the engine dispatches on, in the order a reader meets them. */
export const nestingKeys: readonly NestingKey[] = [
  ...from(pseudoClasses, 'pseudoClass'),
  ...from(pseudoElements, 'pseudoElement'),
  ...from(Object.fromEntries(Object.entries(breakpoints).map(([key, width]) => [key, `@media (min-width: ${width}px)`])), 'breakpoint'),
  ...from(Object.fromEntries(Object.entries(mediaFeatures).map(([key, query]) => [key, `@media ${query}`])), 'media'),
  ...from(Containers.containerQueryKey, 'container'),
  ...from(Variants.variantKeys, 'variant'),
  ...from(Groups.groupKeys, 'group'),
  ...from(pseudoGroupClasses, 'group'),
  ...from(themeGroupClass, 'theme'),
  ...from(startingStyleKey, 'startingStyle'),
];

const byKey = new Map(nestingKeys.map((entry) => [entry.key, entry]));

export const nestingKey = (key: string): NestingKey | undefined => byKey.get(key);

export const nestingKindLabel = (kind: NestingKind): string => KINDS[kind];

/**
 * The four names a Box takes that are neither a style prop nor a nesting key. `props` is the one an
 * agent gets wrong most often: an HTML attribute written at the top level typechecks and is dropped.
 */
export const reservedProps: Readonly<Record<string, string>> = {
  props: 'Every HTML/SVG attribute and event handler: `<Link props={{ href: "/about" }}>`. `data-*` and `aria-*` go here too.',
  tag: 'The element to render, when no component shortcut exists. Prefer `<Flex>`, `<Button>`, `<H1>`, `<Path>`.',
  className: 'Extra class names, merged with the generated ones — how an element joins a `group`/`peer`.',
  children: "The element's content.",
};

/**
 * HTML attributes an agent most often writes at the top level, where Box drops them. Names the engine
 * already claims are filtered out rather than listed away: `checked` and `placeholder` are nesting
 * keys on a Box, and a hint that contradicted the engine would be worse than no hint.
 */
export const attributeNames: ReadonlySet<string> = new Set(
  [
    'href',
    'target',
    'rel',
    'src',
    'alt',
    'type',
    'name',
    'value',
    'placeholder',
    'title',
    'id',
    'role',
    'form',
    'action',
    'method',
    'autoComplete',
    'checked',
    'defaultChecked',
    'defaultValue',
    'maxLength',
    'minLength',
    'pattern',
    'readOnly',
    'required',
    'rows',
    'cols',
    'colSpan',
    'rowSpan',
    'tabIndex',
    'loading',
    'download',
  ].filter((attribute) => !byKey.has(attribute)),
);
