/**
 * What the playground's completion popup offers and what taking an offer writes. Framework-free: the
 * popup renders a `Completion` and hands back a `Suggestion`, and everything between the two is here.
 *
 * Three sources, none of which is written down in this file. `catalog()` says which props a component
 * takes and what each one accepts, the MCP server's vocabulary names every nesting key the engine
 * dispatches on, and `api/props.json` carries the example the engine measured for each style prop.
 */
import { NestingKey, nestingKeys, nestingKindLabel, reservedProps } from '../../mcp/src/vocabulary';
import { pseudoClasses } from '../../src/core/boxStyles';
import type { BoxCatalog, CatalogSchema } from '../../src/core/catalog/catalogTypes';
import Containers from '../../src/core/containers';
import type { StyleEngine } from '../../src/core/engine/styleEngine';
import type { PropEntry } from '../pages/box';
import type { Classifier, NameKind } from './codeTokens';
import { CompletionContext, Span } from './playgroundContext';

/** The editor's font, which the popup's names and values are set in too. */
export const MONO_FONT = "'JetBrains Mono', 'Fira Code', 'SF Mono', Consolas, 'Liberation Mono', Menlo, monospace";

/** A row's id, which the textarea's `aria-activedescendant` names. */
export const optionId = (id: string, index: number) => `${id}-option-${index}`;

export type EntryKind = 'prop' | 'style' | 'nesting' | 'event' | 'reserved';

/** One name a tag or a style object takes, and everything the popup says about it. */
export interface Entry {
  name: string;
  kind: EntryKind;
  description: string;
  schema?: CatalogSchema;
  /** A style prop's family, as the /box finder files it. */
  category?: string;
  /** The CSS properties a style prop writes — searched as well, so `padding` finds `p`. */
  properties?: string[];
  /** A value the engine was asked for and the declaration it answered with. */
  example?: { value: unknown; css: string };
  nesting?: NestingKey;
  deprecated?: boolean;
  /** A component prop's TypeScript type, as the reference prints it. */
  type?: string;
}

export interface TagEntry {
  name: string;
  description: string;
}

export interface Vocabulary {
  tags: TagEntry[];
  colors: string[];
  /** Every name the tag takes: its own props and events first, then the style props and the nesting keys. */
  entries(tag: string): Entry[];
  /** What a nested style object takes, which is the same for every tag. */
  styleEntries: Entry[];
  entry(tag: string, name: string): Entry | undefined;
  /** Whether the catalog describes this tag — the only tags whose unknown props are worth flagging. */
  describes(tag: string): boolean;
}

/** One prop out of `api/components/*.json`, which is read off the components themselves and misses none. */
export interface ApiProp {
  name: string;
  type: string;
  description: string;
}

export interface ApiComponent {
  name: string;
  props: ApiProp[];
  parts: { name: string; props?: ApiProp[] }[];
}

export interface VocabularySource {
  catalog: BoxCatalog;
  props: readonly PropEntry[];
  /** The generated component reference: every prop the catalog leaves out (a slot, `size`, a part's own). */
  components?: readonly ApiComponent[];
  /** The names a snippet may use without importing them — the ones worth offering after a `<`. */
  scope: readonly string[];
  /** A style prop's family, as the /box finder files it — passed in, so this module stays out of that page's chunk. */
  category?: (prop: PropEntry) => string;
}

const firstSentence = (text: string) => {
  const end = text.search(/\.(\s|$)/);

  return end < 0 ? text : text.slice(0, end + 1);
};

/**
 * A TypeScript type, as far as a value list can use it: a union of literals is an enum, and the three
 * primitives are themselves. Anything richer — a function, a node, a generic — is described, not listed.
 */
export function schemaOfType(type: string): CatalogSchema | undefined {
  const parts = type.split('|').map((part) => part.trim());
  const literals = parts.filter((part) => /^'[^']*'$/.test(part)).map((part) => part.slice(1, -1));
  const members: CatalogSchema[] = [];

  if (literals.length) members.push({ type: 'string', enum: literals });
  if (parts.includes('boolean')) members.push({ type: 'boolean' });
  if (parts.includes('number')) members.push({ type: 'number' });
  if (parts.includes('string')) members.push({ type: 'string' });
  if (!members.length) return undefined;

  return members.length === 1 ? members[0] : { anyOf: members };
}

/** Components whose reference entry is empty on purpose, because their props are another's. */
const SHARED_PROPS: Record<string, { from: string; without: string[] }> = {
  AlertDialog: { from: 'Dialog', without: ['modal', 'dismissible', 'lockScroll'] },
};

/** The props every Box takes beside its styles: the `Box.components()` trio, and the id. */
const SYSTEM_PROPS: Record<string, string> = {
  component: 'Which `Box.components()` style tree to draw this element from — `component="button"`.',
  variant: 'The component variant, or several: `variant="ghost"`, `variant={{ compact: true }}`.',
  clean: 'Leave out the component’s default styles and keep only what is written here.',
  id: 'The HTML `id` attribute — the one attribute Box takes at the top level.',
};

export function buildVocabulary({ catalog, props, scope, components = [], category }: VocabularySource): Vocabulary {
  const box = catalog.components.Box;
  const examples = new Map(props.map((prop) => [prop.name, prop]));
  const styleSchemas = box.props.properties ?? {};

  const style: Entry[] = Object.entries(styleSchemas).map(([name, schema]) => {
    const prop = examples.get(name);

    return {
      name,
      kind: 'style',
      description: schema.description ?? prop?.description ?? '',
      schema,
      ...(prop ? { category: category?.(prop), properties: prop.properties, example: prop.example } : {}),
    };
  });

  const nesting: Entry[] = nestingKeys.map((key) => ({
    name: key.key,
    kind: 'nesting',
    description: `Styles for ${nestingKindLabel(key.kind)}: \`${key.compiles}\`.`,
    nesting: key,
    deprecated: key.deprecated,
  }));

  const reserved: Entry[] = Object.entries(reservedProps)
    .filter(([name]) => name !== 'children')
    .map(([name, description]): Entry => ({ name, kind: 'reserved', description }))
    .concat(Object.entries(SYSTEM_PROPS).map(([name, description]) => ({ name, kind: 'reserved', description })));
  const api = new Map<string, ApiProp[]>();
  for (const component of components) {
    api.set(component.name, [...(api.get(component.name) ?? []), ...component.props]);
    // A part named `Combobox (multiple)` is one half of the component's own union, not a part of it.
    for (const part of component.parts) {
      const name = part.name.startsWith(`${component.name} (`) ? component.name : part.name;
      api.set(name, [...(api.get(name) ?? []), ...(part.props ?? [])]);
    }
  }
  // The reference lists a shared prop set once (scripts/componentsApi.mjs says why), so borrow it back.
  for (const [name, { from, without }] of Object.entries(SHARED_PROPS)) {
    if (!api.get(name)?.length)
      api.set(
        name,
        (api.get(from) ?? []).filter((prop) => !without.includes(prop.name)),
      );
  }

  const styleEntries = [...style, ...nesting];
  const styleNames = new Set(styleEntries.map((entry) => entry.name));
  const cache = new Map<string, Entry[]>();

  function entries(tag: string): Entry[] {
    const cached = cache.get(tag);
    if (cached) return cached;

    const component = catalog.components[tag];
    const own: Entry[] = [];

    if (component && tag !== 'Box') {
      for (const [name, schema] of Object.entries(component.props.properties ?? {})) {
        // A prop the component settled differently from Box (`Rect`'s `width`) is its own, not a style prop.
        if (styleNames.has(name) && JSON.stringify(schema) === JSON.stringify(styleSchemas[name])) continue;
        own.push({ name, kind: 'prop', description: schema.description ?? '', schema });
      }
      for (const name of component.events) {
        if (!own.some((entry) => entry.name === name))
          own.push({ name, kind: 'event', description: `Called by the component: \`${name}\`.` });
      }
    }

    // What the catalog left out, because a spec cannot write it: slots, render props, a part's own props.
    for (const prop of api.get(tag) ?? []) {
      if (own.some((entry) => entry.name === prop.name) || ['children', 'props', 'style'].includes(prop.name)) continue;

      const event = /^on[A-Z]/.test(prop.name) || prop.type.includes('=>');
      const schema = schemaOfType(prop.type);
      own.push({
        name: prop.name,
        kind: event ? 'event' : 'prop',
        description: prop.description,
        type: prop.type,
        ...(schema ? { schema } : {}),
      });
    }

    const claimed = new Set(own.map((entry) => entry.name));
    const list = [...own, ...styleEntries.filter((entry) => !claimed.has(entry.name)), ...reserved];
    cache.set(tag, list);

    return list;
  }

  const described = new Map(Object.entries(catalog.components).map(([name, component]) => [name, firstSentence(component.description)]));
  const tagNames = [...new Set([...scope.filter((name) => /^[A-Z]/.test(name)), ...Object.keys(catalog.components)])];

  return {
    tags: tagNames.map((name) => ({ name, description: described.get(name) ?? '' })),
    colors: catalog.tokens.colors,
    entries,
    styleEntries,
    entry: (tag, name) => entries(tag).find((entry) => entry.name === name),
    // A component its reference lists, or an element that takes nothing but style props (`Link`, `Flex`) —
    // no events, no named slots.
    describes: (tag) =>
      !!api.get(tag)?.length ||
      (tag in catalog.components &&
        !catalog.components[tag].events.length &&
        catalog.components[tag].slots.every((slot) => slot === 'default') &&
        Object.keys(catalog.components[tag].props.properties ?? {}).every((name) => styleNames.has(name))),
  };
}

// ---------------------------------------------------------------------------------------------------------
// Matching

export interface Match {
  score: number;
  /** Indices into the label, for the letters the query matched. */
  indices: number[];
}

const isBoundary = (label: string, index: number) =>
  index === 0 || /[-_./ ]/.test(label[index - 1]) || (/[A-Z0-9]/.test(label[index]) && /[a-z]/.test(label[index - 1]));

/**
 * A fuzzy match the way an editor's is: the letters in order, scored for starting the label, for landing
 * on word starts (`bgC` is **b**ack**g**round-**C**olor's humps) and for running together.
 */
export function fuzzyMatch(query: string, label: string): Match | null {
  if (!query) return { score: 0, indices: [] };

  const lower = label.toLowerCase();
  const wanted = query.toLowerCase();
  // Every prefix match ties, so the list's own order decides between them: a component's props, then the registry's.
  if (lower.startsWith(wanted)) return { score: 1000 + (label.startsWith(query) ? 5 : 0), indices: [...wanted].map((_, i) => i) };

  const indices: number[] = [];
  let score = 0;
  let from = 0;

  for (const letter of wanted) {
    // Prefer the next word start carrying this letter over the next occurrence of it.
    let index = -1;
    for (let at = from; at < lower.length; at += 1) {
      if (lower[at] !== letter) continue;
      if (index < 0) index = at;
      if (isBoundary(label, at)) {
        index = at;
        break;
      }
    }
    if (index < 0) return null;
    // The first letter starts a word, or the match is noise: `disp` is not borDerradIuSToP.
    if (!indices.length && !isBoundary(label, index)) return null;

    score += isBoundary(label, index) ? 30 : indices.length && indices[indices.length - 1] === index - 1 ? 15 : 1;
    indices.push(index);
    from = index + 1;
  }

  return { score: score - label.length, indices };
}

// ---------------------------------------------------------------------------------------------------------
// Values

export interface TypeHint {
  type: 'number' | 'string' | 'boolean' | 'object' | 'array' | 'pattern';
  /** How the popup says it: "a number", "a string like 50%". */
  label: string;
  examples?: (string | number | boolean)[];
}

export interface ValueShape {
  /** The values the prop names, in the registry's order. */
  choices: (string | number | boolean)[];
  /** A palette token, with the opacity modifier. */
  color: boolean;
  /** What it takes beyond the list — the part a list cannot show. */
  types: TypeHint[];
}

const COLOR_REF = '#/$defs/color';

/** A pattern's reader-facing name, read off the examples the catalog gives it. */
function patternLabel(examples: (string | number | boolean)[] = []): string {
  const first = String(examples[0] ?? '');
  if (first.endsWith('%')) return 'a percentage';
  if (first.startsWith('anchor-size(')) return "an anchor's size";
  if (first.startsWith('anchor(')) return "an anchor's edge";
  if (/^\d+(\.\d+)?\/\d+/.test(first)) return 'a ratio';

  return 'a string of this shape';
}

export function valueShape(schema: CatalogSchema | undefined): ValueShape {
  const shape: ValueShape = { choices: [], color: false, types: [] };
  if (!schema) return shape;

  const visit = (part: CatalogSchema) => {
    if (part.$ref === COLOR_REF) shape.color = true;
    else if (part.anyOf) part.anyOf.forEach(visit);
    else if (part.enum) shape.choices.push(...part.enum);
    else if (part.pattern) shape.types.push({ type: 'pattern', label: patternLabel(part.examples), examples: part.examples });
    else if (part.type === 'number' || part.type === 'integer') shape.types.push({ type: 'number', label: 'a number' });
    else if (part.type === 'boolean') shape.choices.push(true, false);
    else if (part.type === 'string') shape.types.push({ type: 'string', label: 'any string' });
    else if (part.type === 'object') shape.types.push({ type: 'object', label: 'an object' });
    else if (part.type === 'array') shape.types.push({ type: 'array', label: 'a list' });
  };
  visit(schema);
  shape.choices = [...new Set(shape.choices)];

  return shape;
}

/** How a value is written as a prop — a string in quotes, everything else in braces. */
export const writtenAs = (name: string, value: unknown): string =>
  typeof value === 'string' ? `${name}="${value}"` : `${name}={${JSON.stringify(value)}}`;

/**
 * A few numbers worth measuring for a numeric prop: its example, half and double it. That is what makes
 * the divider readable — `fontSize` answering 0.875rem for 14 says ÷16 without anybody writing it.
 */
export function numberSamples(example: unknown): number[] {
  if (typeof example !== 'number' || example === 0) return [1, 2, 4, 8];

  return [...new Set([example / 2, example, example * 2].map((value) => Math.round(value * 100) / 100))];
}

/** Rules every engine writes before any prop does, which a measurement subtracts. */
function splitRules(css: string): string[] {
  const rules: string[] = [];
  let depth = 0;
  let start = 0;

  for (let index = 0; index < css.length; index += 1) {
    if (css[index] === '{') depth += 1;
    if (css[index] !== '}') continue;
    depth -= 1;
    if (depth > 0) continue;
    rules.push(css.slice(start, index + 1).trim());
    start = index + 1;
  }

  return rules.filter(Boolean);
}

/**
 * The declarations one prop writes, measured on a throwaway engine — the same question the MCP server's
 * `check_styles` asks. Empty when the engine does not accept the value, which is itself the answer.
 */
export function createMeasure(createEngine: () => StyleEngine): (name: string, value: unknown) => string {
  const cache = new Map<string, string>();
  const base = (() => {
    const engine = createEngine();
    engine.flushSync();

    return new Set(splitRules(engine.getStyles()));
  })();

  return (name, value) => {
    const key = `${name}\u0000${JSON.stringify(value)}`;
    const cached = cache.get(key);
    if (cached !== undefined) return cached;

    const engine = createEngine();
    engine.classNames({ [name]: value });
    engine.flushSync();
    const rule = splitRules(engine.getStyles()).find((candidate) => !base.has(candidate) && !candidate.startsWith(':root'));
    // The innermost block: a rule inside `@media` or `@scope` still has its declarations last.
    const declarations = rule ? rule.slice(rule.lastIndexOf('{') + 1, rule.indexOf('}')).trim() : '';
    const css = declarations
      .split(';')
      .map((part) => part.trim().replace(/:\s*/, ': '))
      .filter(Boolean)
      .join('; ');
    cache.set(key, css);

    return css;
  };
}

// ---------------------------------------------------------------------------------------------------------
// Suggestions

export type SuggestionKind = 'component' | EntryKind | 'value' | 'color';

export interface Suggestion {
  id: string;
  label: string;
  kind: SuggestionKind;
  /** The quiet text on the right: a type, a family, what a key compiles to. */
  detail: string;
  indices: number[];
  /** The CSS property the query matched instead of the name, when that is how it was found. */
  alias?: string;
  entry?: Entry;
  value?: string | number | boolean;
  /** A component's one-line description, for a suggestion that has no entry. */
  description?: string;
}

export interface Completion {
  context: CompletionContext;
  suggestions: Suggestion[];
  /** The prop being valued — and what it takes, for a value context. */
  entry?: Entry;
  shape?: ValueShape;
  /** The number typed so far, when the prop takes one: what the popup measures live. */
  typed?: number;
}

const NESTING_DETAIL: Record<NestingKey['kind'], string> = {
  pseudoClass: 'state',
  pseudoElement: 'element',
  breakpoint: 'breakpoint',
  media: 'media',
  container: 'container',
  variant: 'selector',
  group: 'group',
  theme: 'theme',
  startingStyle: 'entrance',
};

const capitalized = (text: string) => text[0].toUpperCase() + text.slice(1);

/**
 * The keys a nesting record takes where they are a closed set: a theme's names, a container size and its
 * complement, a state for `not`, a position for `nth`. Null where the keys are the reader's own
 * (`dataAttr`, `group`), which leaves nothing to offer until the object inside.
 */
function recordKeys(name: string): { key: string; detail: string }[] | null {
  if (name === 'theme') return ['light', 'dark'].map((key) => ({ key, detail: 'theme' }));
  if (name === 'cq') {
    return Object.entries(Containers.containerSizes).flatMap(([size, rem]) => [
      { key: size, detail: `min ${rem}rem` },
      { key: `max${capitalized(size)}`, detail: `below ${rem}rem` },
    ]);
  }
  if (name === 'not') return Object.entries(pseudoClasses).map(([key, selector]) => ({ key, detail: `:not(${selector})` }));
  if (name === 'nth') return ['first', 'last', 'only', 'odd', 'even'].map((key) => ({ key, detail: 'position' }));

  return null;
}

/** A short type for a list row: "number", "enum", "color", "{ }". */
export function entryDetail(entry: Entry): string {
  if (entry.kind === 'nesting') return NESTING_DETAIL[entry.nesting!.kind];
  if (entry.kind === 'event') return 'event';
  if (entry.kind === 'reserved') return entry.name === 'props' ? 'attributes' : 'string';

  const shape = valueShape(entry.schema);
  if (shape.color) return 'color';

  const types = shape.types.map((hint) => (hint.type === 'pattern' ? 'string' : hint.type));
  if (shape.choices.length && shape.choices.every((choice) => typeof choice === 'boolean')) return 'boolean';
  if (types.includes('object')) return '{ }';
  if (types.includes('array')) return '[ ]';
  if (types.includes('number')) return shape.choices.length ? 'number | enum' : 'number';
  if (shape.choices.length) return 'enum';

  return types[0] ?? entry.type ?? 'any';
}

interface RankOptions<T> {
  /** The CSS properties an item writes, searched when its name does not match. */
  alias?: (item: T) => string[] | undefined;
  /** Where an item stands on a tie, before the alphabet: a component's own props ahead of the style props. */
  group?: (item: T) => number;
  /** Break a tie alphabetically, the way an editor lists names — a value list keeps its own order instead. */
  alphabetical?: boolean;
}

function rank<T>(items: T[], query: string, label: (item: T) => string, { alias, group, alphabetical }: RankOptions<T> = {}) {
  return items
    .map((item, order) => {
      const name = label(item);
      const direct = fuzzyMatch(query, name);
      if (direct) return { item, order, score: direct.score, indices: direct.indices, alias: undefined as string | undefined };

      // Found by the CSS it writes rather than by its name: typed `padding`, offered `p`.
      if (query.length < 3) return null;
      const property = alias?.(item)?.find((candidate) => candidate.replace(/-/g, '').startsWith(query.toLowerCase().replace(/-/g, '')));

      return property ? { item, order, score: 200 - name.length, indices: [], alias: property } : null;
    })
    .filter((ranked) => ranked !== null)
    .sort(
      (a, b) =>
        (query ? b.score - a.score : 0) ||
        (query && group ? group(a.item) - group(b.item) : 0) ||
        (query && alphabetical ? label(a.item).localeCompare(label(b.item)) : 0) ||
        a.order - b.order,
    );
}

/** Whether a value picked from a list is a string the reader typed the start of, or a number. */
const valueLabel = (value: string | number | boolean) => String(value);

const ENTRY_GROUP: Record<EntryKind, number> = { prop: 0, event: 0, style: 1, nesting: 2, reserved: 3 };

export function complete(vocabulary: Vocabulary, context: CompletionContext): Completion | null {
  if (context.kind === 'tag') {
    const suggestions = rank(vocabulary.tags, context.query, (tag) => tag.name, { alphabetical: true }).map(({ item, indices }) => ({
      id: `tag:${item.name}`,
      label: item.name,
      kind: 'component' as const,
      detail: 'component',
      indices,
      description: item.description,
    }));

    return { context, suggestions };
  }

  if (context.kind === 'attribute' || context.kind === 'key') {
    // The first level of a record keyed by names rather than by props: a closed set, or nothing at all.
    const parent = context.kind === 'key' ? context.path[context.path.length - 1] : undefined;
    const parentEntry = parent === undefined ? undefined : vocabulary.styleEntries.find((entry) => entry.name === parent);
    const record = parentEntry?.kind === 'nesting' && context.kind === 'key' ? recordKeys(parent!) : null;
    const freeKeys = parentEntry?.nesting && ['variant', 'group'].includes(parentEntry.nesting.kind);

    if (record) {
      const keys = record.filter(({ key }) => !context.present.includes(key));
      const suggestions = rank(keys, context.query, ({ key }) => key).map(({ item, indices }) => ({
        id: `key:${item.key}`,
        label: item.key,
        kind: 'nesting' as const,
        detail: item.detail,
        indices,
      }));

      return { context, suggestions };
    }
    if (
      context.kind === 'key' &&
      parent !== undefined &&
      (freeKeys || (parentEntry && parentEntry.kind !== 'nesting') || (!parentEntry && context.path.length === 1))
    )
      return null;

    const pool = context.kind === 'attribute' ? vocabulary.entries(context.tag) : vocabulary.styleEntries;
    const available = pool.filter((entry) => entry.name !== context.query && !context.present.includes(entry.name));
    const exact = pool.find((entry) => entry.name === context.query);
    const suggestions = rank([...(exact ? [exact] : []), ...available], context.query, (entry) => entry.name, {
      alias: (entry) => entry.properties,
      group: (entry) => ENTRY_GROUP[entry.kind],
      alphabetical: true,
    }).map(({ item, indices, alias }) => ({
      id: `${item.kind}:${item.name}`,
      label: item.name,
      kind: item.kind,
      detail: entryDetail(item),
      indices,
      entry: item,
      ...(alias ? { alias } : {}),
    }));

    return { context, suggestions };
  }

  // A value: the prop is the last name on the path, looked up the way the tag or the style object would.
  const name = context.path[context.path.length - 1];
  const entry = context.site === 'attribute' ? vocabulary.entry(context.tag, name) : vocabulary.styleEntries.find((e) => e.name === name);
  if (!entry || entry.kind === 'nesting' || entry.kind === 'event') return null;

  const shape = valueShape(entry.schema);
  const query = context.query;
  let values: (string | number | boolean)[] = shape.choices;
  let suggestions: Suggestion[];

  if (shape.color) {
    // `sky-500/4`: the token half picks the colour, the modifier rides along unchanged.
    const slash = query.indexOf('/');
    const base = slash < 0 ? query : query.slice(0, slash);
    const alpha = slash < 0 ? '' : query.slice(slash);
    const colors = rank(vocabulary.colors, base, (color) => color).map(({ item, indices }) => ({
      id: `color:${item}${alpha}`,
      label: `${item}${alpha}`,
      kind: 'color' as const,
      detail: alpha ? `${alpha.slice(1) || '…'}%` : 'token',
      indices,
      value: `${item}${alpha}`,
    }));
    values = [];
    suggestions = colors;
  } else {
    suggestions = [];
  }

  suggestions = [
    ...suggestions,
    ...rank(values, query, valueLabel).map(({ item, indices }) => ({
      id: `value:${String(item)}`,
      label: valueLabel(item),
      kind: 'value' as const,
      detail: typeof item,
      indices,
      value: item,
    })),
  ];

  const typed = /^-?\d+(\.\d+)?$/.test(query) && shape.types.some((hint) => hint.type === 'number') ? Number(query) : undefined;

  return { context, suggestions, entry, shape, ...(typed !== undefined ? { typed } : {}) };
}

// ---------------------------------------------------------------------------------------------------------
// Taking a suggestion

export interface Edit {
  source: string;
  caret: number;
  /** Whether the popup should open again on what was written — a prop's value, a nested object's keys. */
  reopen: boolean;
}

const replace = (source: string, span: Span, text: string, caretOffset = text.length): Edit => ({
  source: source.slice(0, span.from) + text + source.slice(span.to),
  caret: span.from + caretOffset,
  reopen: false,
});

/**
 * What follows a name: `=""` for a string, `={}` for a number, `={{  }}` for a nested object — with the
 * caret where the value goes, so choosing a prop and choosing its value are one motion.
 */
function nameTail(entry: Entry | undefined, site: 'attribute' | 'object'): { text: string; caret: number; reopen: boolean } {
  const attribute = site === 'attribute';
  const object = attribute ? '={{  }}' : ': {  }';
  const objectCaret = 4;

  if (!entry) return { text: '', caret: 0, reopen: false };
  if (entry.kind === 'nesting' || entry.name === 'props') return { text: object, caret: objectCaret, reopen: entry.kind === 'nesting' };
  if (entry.kind === 'event')
    return attribute ? { text: '={() => {}}', caret: 9, reopen: false } : { text: ': () => {}', caret: 9, reopen: false };

  const shape = valueShape(entry.schema);
  const types = new Set(shape.types.map((hint) => hint.type));
  const strings = shape.color || types.has('string') || types.has('pattern') || shape.choices.some((choice) => typeof choice === 'string');

  if (shape.choices.length && shape.choices.every((choice) => choice === true) && !types.size)
    return attribute ? { text: '', caret: 0, reopen: false } : { text: ': true', caret: 6, reopen: false };
  if (types.has('object')) return { text: object, caret: objectCaret, reopen: false };
  if (types.has('array')) return attribute ? { text: '={[]}', caret: 3, reopen: false } : { text: ': []', caret: 3, reopen: false };
  // A number wins the braces even beside a keyword or two: `fontSize` takes `inherit` and is still a number.
  if (types.has('number')) return attribute ? { text: '={}', caret: 2, reopen: true } : { text: ': ', caret: 2, reopen: true };
  if (strings) return attribute ? { text: '=""', caret: 2, reopen: true } : { text: ": ''", caret: 3, reopen: true };

  return attribute ? { text: '={}', caret: 2, reopen: true } : { text: ': ', caret: 2, reopen: true };
}

export function accept(source: string, completion: Completion, suggestion: Suggestion): Edit {
  const { context } = completion;

  if (context.kind !== 'value') {
    // The word after the caret is replaced only when the suggestion ends with it (`bg|Color`); typed
    // straight in front of another word (`bgC|gap`), that word is the reader's and stays.
    const caret = context.from + context.query.length;
    const rest = source.slice(caret, context.to);
    const kept = !!rest && !suggestion.label.endsWith(rest);
    const span = kept ? { from: context.from, to: caret } : context;

    if (context.kind === 'tag') return replace(source, span, suggestion.label + (kept ? ' ' : ''), suggestion.label.length);
    // Renaming a prop that already has its value keeps the value: only the name changes.
    if (!kept && /^\s*[=:]/.test(source.slice(context.to))) return replace(source, span, suggestion.label);

    const tail = suggestion.entry
      ? nameTail(suggestion.entry, context.kind === 'attribute' ? 'attribute' : 'object')
      : { text: ': {  }', caret: 4, reopen: true };
    const separator = kept ? (context.kind === 'key' ? ', ' : ' ') : '';
    const edit = replace(source, span, suggestion.label + tail.text + separator, suggestion.label.length + tail.caret);

    return { ...edit, reopen: tail.reopen };
  }

  const value = suggestion.value!;
  const text =
    context.site === 'attribute'
      ? typeof value === 'string'
        ? `"${value}"`
        : `{${String(value)}}`
      : typeof value === 'string'
        ? `'${value}'`
        : String(value);

  // Written straight after `=` with the next prop already there: a space, or the two run together.
  const gap = context.site === 'attribute' && /[A-Za-z_{]/.test(source[context.outer.to] ?? '') ? ' ' : '';

  return replace(source, context.outer, text + gap, text.length);
}

/**
 * Whether a keystroke should open the popup: a letter where a name is being typed, and the character
 * that starts a value — the `=`, the quote, the brace.
 */
export function opensOn(inserted: string, context: CompletionContext | null): boolean {
  if (!context || inserted.length !== 1) return false;
  if (context.kind === 'value')
    return /[=\s"'{:A-Za-z0-9-]/.test(inserted) && !(context.form === 'bare' && /\s/.test(inserted) && context.query);

  return /[A-Za-z0-9_]/.test(inserted);
}

// ---------------------------------------------------------------------------------------------------------
// Highlighting

/** The nesting keys whose first level is names — a theme, a container size, an attribute, a group. */
const RECORD_KINDS = new Set<NestingKey['kind']>(['theme', 'container', 'variant', 'group']);

/** React's own props, which no component declares and every one of them takes. */
const REACT_PROPS = new Set(['key', 'ref', 'children', 'style', 'className']);

/**
 * What the highlighter needs to colour a name the way this library reads it. An unknown name is only
 * flagged on a tag the catalog describes: an SVG element's `d` is not in it, and a squiggle there would lie.
 */
export function classifierOf(vocabulary: Vocabulary): Classifier {
  const kind = (entry: Entry | undefined): NameKind | null => (entry ? entry.kind : null);

  return {
    attribute(tag, name) {
      if (REACT_PROPS.has(name)) return 'reserved';
      if (!/^[A-Z]/.test(tag)) return null;

      return kind(vocabulary.entry(tag, name)) ?? (vocabulary.describes(tag) ? 'unknown' : null);
    },
    key: (name) => kind(vocabulary.styleEntries.find((entry) => entry.name === name)) ?? 'unknown',
    records: (name) => {
      const nesting = vocabulary.styleEntries.find((entry) => entry.name === name)?.nesting;

      return !!nesting && RECORD_KINDS.has(nesting.kind);
    },
  };
}
