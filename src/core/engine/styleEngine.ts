/* eslint-disable @typescript-eslint/no-explicit-any */
import { BoxStyleProps, BoxStyles, PseudoClassesType } from '../../types';
import ObjectUtils from '../../utils/object/objectUtils';
import Animations from '../animations';
import {
  breakpoints,
  containerQuery,
  cssStyles as defaultCssStyles,
  generatesContent,
  mediaFeatures,
  mediaQuery,
  NO_QUERY,
  pseudo1,
  pseudo2,
  pseudoClassesOfWeight,
  pseudoClassesWeight,
  pseudoElements,
  PseudoElementKey,
  pseudoGroupClasses,
  pseudoSelector,
  queryKeys,
  reachesDescendants,
  startingStyleKey,
  StyleQuery,
  themeGroupClass,
} from '../boxStyles';
import { CatalogSource } from '../catalog/boxCatalog';
import Containers from '../containers';
import { BoxStyle, BoxStyleValue } from '../coreTypes';
import defaultBoxComponents, { BoxComponent, Components } from '../extends/boxComponents';
import { resolveComponentStyles } from '../extends/useComponents';
import Filters from '../filters';
import Groups from '../groups';
import { stableHash } from '../hash';
import IdentityFactory from '../identity';
import { mergeDeep } from '../mergeDeep';
import Palette from '../palette';
import Shadows from '../shadows';
import Variables from '../variables';
import Variants from '../variants';
import { createFlushCoordinator, FlushScheduler, microtaskScheduler } from './flushScheduler';
import createKeyframesRegistry, { KeyframeStops, Keyframes } from './keyframes';
import { createSink, RULE_PRECEDENCE, SinkMode, SortedRule, StyleElementDescriptor, StyleSink } from './styleSink';

/** Explicit engine configuration — replaces the previous NODE_ENV-based sniffing. */
export interface StylesConfiguration {
  /**
   * How class names are emitted: `'hashed'` (default, through the identity factory), `'readable'`
   * (kept as-is, for tests) or `'stable'` (content-hashed, so two processes agree — element mode's default).
   */
  classNames?: 'hashed' | 'readable' | 'stable';
  /**
   * Where rules are written: `'cssom'` (`insertRule`), `'textContent'`, `'string'` (in memory, for
   * `getStyles()`) or `'element'` (nowhere — they come back as `<style href precedence>` descriptors,
   * which is what works in a Server Component). Defaults to the environment; changing it re-emits everything.
   */
  sink?: SinkMode;
  /**
   * What the base class transitions — `'all'` by default, one of the `transition` prop's groups, or
   * `false` to declare nothing at all and leave transitions entirely to the props. Changing it after the
   * first render re-emits every rule, since the base block is written once.
   */
  transition?: string | false;
}

export interface StyleEngineOptions extends StylesConfiguration {
  /** The id of the `<style>` element this engine owns, so two engines cannot corrupt each other's rule order. */
  styleElementId?: string;
  /** When pending rules reach the sink — see `FlushScheduler`. `flushSync()` works regardless. */
  scheduler?: FlushScheduler;
}

/**
 * An isolated styling engine: its own class-name cache, rule registry, identity factory, variables,
 * prop registry (`Box.extend`) and component registry (`Box.components`) — nothing in module scope.
 */
export interface StyleEngine {
  /** The id of the `<style>` element this engine writes to. */
  readonly styleElementId: string;
  /**
   * The class list for a Box's props, cached. `signature` is null when the props would not serialize;
   * `styleElements` is element mode only, the base element first.
   */
  resolveClassNames(
    props: BoxStyleProps<any>,
    isSvg: boolean,
  ): { classNames: string[]; signature: string | null; styleElements?: StyleElementDescriptor[] };
  /**
   * The class list as a `class` attribute value — the whole API a non-React adapter needs. The CSS
   * follows on the engine's own schedule; throws in element mode, where `resolveClassNames` is the way in.
   */
  classNames(props: BoxStyleProps<any>, options?: { svg?: boolean }): string;
  /** Rules targeting a root selector (`html`) rather than a class. Returns style elements like `resolveClassNames`. */
  addGlobalStyles(props: BoxStyleProps<any>, selector: string): StyleElementDescriptor[] | undefined;
  /** Write every pending rule to this engine's sink, now. */
  flushSync(): void;
  /**
   * Say that rules are pending and let the `FlushScheduler` pick the moment, so many calls in one turn
   * produce one flush. The engine calls it itself; an adapter needs it only for rules it queued alone.
   */
  scheduleFlush(): void;
  /** The CSS emitted so far, as text. Flushes first, so a server render — where no effect runs — is complete. */
  getStyles(): string;
  /**
   * Drop everything emitted: rules, cached class lists, the name counter, resolved variables, the sink.
   * Registration (extended props, components, declared variables) survives. Call it between SSR requests.
   */
  clear(): void;
  /** Apply explicit configuration. Cached class names are dropped when the configuration changes. */
  configure(config: StylesConfiguration): void;
  extend<TProps extends Record<string, BoxStyle[]>, TPropTypes extends Record<string, BoxStyle[]>>(
    variables: Record<string, string>,
    extendedProps: TProps,
    extendedPropTypes: TPropTypes,
  ): { extendedProps: TProps; extendedPropTypes: TPropTypes };
  components<T extends Components>(components: T): T;
  /**
   * Register `@keyframes` sequences, whose steps are Box props. Nothing is emitted until a rule names
   * one, so registering a library of them costs no CSS.
   */
  keyframes<T extends Keyframes>(keyframes: T): T;
  getComponentsStyles(): Components;
  getVariableValue(name: string): string;
  /**
   * What this engine can render, for `catalog()` to describe: the prop registry with `extend()`'s additions
   * in it, every colour name a colour prop takes, and the `@keyframes` sequences registered. One method
   * rather than three getters, because nothing but a catalog has a use for any of them.
   */
  getCatalogSource(): Pick<CatalogSource, 'styleProps' | 'colors' | 'animations'>;
}

export const DEFAULT_STYLE_ELEMENT_ID = 'box-kite-styles';

// The value lists that hold variable-backed tokens. A `Box.extend({ variables })` token is accepted
// wherever one of them is declared.
const variableBackedValues: ReadonlySet<unknown> = new Set([Variables.colorValues, Variables.bgImageValues, Variables.shadowValues]);

// An id sequence for engines the caller did not name, not engine state.
let engineSequence = 0;

// Characters a CSS identifier cannot hold. A readable name for `1/2` or `50%` would otherwise build a
// selector the parser rejects; hashed names are alphanumeric, so this is a no-op there.
const invalidInCssIdentifier = /[^\w\u00A0-\uFFFF-]/g;

/** A class name escaped for use inside a CSS selector: `width-1/2` becomes `width-1\/2`. */
function escapeClassName(className: string): string {
  return className.replace(invalidInCssIdentifier, (char) => `\\${char}`);
}

/**
 * A prop value as the text its class name and rule key are built from. A record (`vars`) becomes its
 * `name-value` pairs in declaration order — the order its declarations are emitted in too.
 */
function serializeValue(value: unknown): string {
  if (Array.isArray(value)) return value.join('_');
  if (ObjectUtils.isObject(value)) {
    return Object.entries(value)
      .map(([name, entry]) => `${name}-${entry}`)
      .join('_');
  }

  return String(value);
}

/**
 * Where `@starting-style` ranks: after every ordinary rule, keeping the query order inside its own half.
 * The browser computes the before-change style from the whole cascade, so a starting declaration that lands
 * *before* the ordinary declaration of the same property loses and nothing transitions at all — proved in
 * a browser, because no test in this repo can see it.
 */
const STARTING_RANK = queryKeys.length;

/** The layer the base rules live in — the reset has to lose against every generated rule. */
const BASE_LAYER = 'rb';

/** The layer one rank owns. Base36 keeps it one character, so `rb1` and `rb10` cannot be the same name. */
function rankLayerName(rank: number): string {
  return `${BASE_LAYER}${rank.toString(36)}`;
}

/**
 * The cascade layer of one generated rule: rank-major, then prop declaration order — and the prop is a
 * *sub-layer* of the rank rather than a name of its own. That is what keeps `layerOrder()` from naming
 * rank × prop layers: the inner order is one identical statement per rank (see `layerOrder`).
 */
function layerName(rank: number, sortIndex: number): string {
  return `${rankLayerName(rank)}.p${sortIndex.toString(36)}`;
}

/**
 * `@starting-style`'s layers: one per media rank and no prop dimension, because two starting declarations
 * only ever collide when they are the same property — and then specificity and the media rank settle it.
 * An underscore keeps them out of `layerName`'s alphabet (base36, so a rank could spell `rbs0`) and out of
 * nobody's regex — the Next example greps the order statement for `[w,]`.
 */
function startingLayerName(rank: number): string {
  return `${BASE_LAYER}_s${rank.toString(36)}`;
}

/**
 * Where a rule lands, as opposed to what it declares: everything the nesting keys accumulate on the way
 * down. One object rather than a seventh positional argument, which is how the wrong one gets passed.
 */
interface StyleContext {
  /** The pseudo-class keys collected so far; the weight the class name is built from encodes this set. */
  pseudoClasses: PseudoClassesType[];
  /**
   * The one pseudo-element this rule is about, if any. A slot rather than a list: a compound selector
   * holds at most one, and it goes last — after the variants, and on the *target* when a group or a theme
   * puts an ancestor in front of it.
   */
  element?: PseudoElementKey;
  /** Which at-rule block the rule belongs in: none, a breakpoint, a preference feature, or a container query. */
  query: StyleQuery;
  /**
   * What stands in front of the element's own selector, outermost first: the theme class, an ancestor in
   * a state (`group`), a sibling in one (`peer`). A list rather than a name, which is what keeps a
   * group's state off the element's own compound — nested in the pseudo-class mask the two collapsed
   * into one bit, and `hoverGroup={{ card: { hover: … } }}` silently styled the group's hover twice.
   */
  parents: readonly Groups.Parent[];
  /** A selector to style instead of a generated class (`addGlobalStyles`). */
  rootSelector?: string;
  /** Compiled variant fragments on the element's own compound selector, in canonical order. */
  variants: readonly Variants.Variant[];
}

/** What the class-name cache holds per style signature. `elements` is null outside element mode. */
interface ResolvedStyles {
  classNames: string[];
  elements: StyleElementDescriptor[] | null;
}

function resolveExtends(components: Components): Components {
  const resolved = { ...components };

  for (const [name, component] of Object.entries(resolved)) {
    if (!component.extends) continue;

    const baseComponent = resolved[component.extends];
    if (!baseComponent) continue;

    const { extends: _, ...override } = component;
    resolved[name] = mergeDeep<BoxComponent>({}, baseComponent, override);
  }

  return resolved;
}

export function createStyleEngine(options: StyleEngineOptions = {}): StyleEngine {
  const styleElementId = options.styleElementId ?? `${DEFAULT_STYLE_ELEMENT_ID}-${++engineSequence}`;

  // Recreated by clear(): names come from a counter, so request 2 would otherwise differ from request 1.
  let identity = new IdentityFactory();
  const variables = Variables.createRegistry();
  const keyframesRegistry = createKeyframesRegistry();

  // What `._b` transitions. `false` writes no declaration at all.
  let baseTransition: string | false = options.transition ?? 'all';

  // Undefined means "follow the sink": counter-hashed normally, content-hashed in element mode.
  let classNamesMode: StylesConfiguration['classNames'] = options.classNames;
  // Undefined means "follow the environment", resolved when first needed so importing touches no DOM.
  let sinkMode: SinkMode | undefined = options.sink;
  let sink: StyleSink | undefined;

  function getSink(): StyleSink {
    if (!sink) sink = createSink(styleElementId, sinkMode);

    return sink;
  }

  /**
   * Element mode: rules go to the adapter as `<style>` descriptors. It also turns on cascade layers and
   * content-hashed names, because a hoisted element's position in `<head>` is render order.
   */
  function isElementMode(): boolean {
    return sinkMode === 'element';
  }

  function namingMode(): NonNullable<StylesConfiguration['classNames']> {
    return classNamesMode ?? (isElementMode() ? 'stable' : 'hashed');
  }

  // The prop registry. Copied per engine so `extend()` on one engine cannot leak into another.
  const cssStyles = { ...defaultCssStyles };
  // Rule sort order, from prop declaration order. Rebuilt by `extend()` so new props sort after the built-ins.
  let cssStylesIndex: Record<string, number> = {};

  function rebuildCssStylesIndex() {
    cssStylesIndex = Object.keys(cssStyles).reduce<Record<string, number>>((acc, key, index) => {
      acc[key] = index;
      return acc;
    }, {});
  }

  rebuildCssStylesIndex();

  let componentsStyles: Components = defaultBoxComponents;

  // style signature → resolved class names. A Box's list is fully determined by its inputs, so
  // structurally identical Boxes (every DataGrid cell) collapse to one lookup. Rules dedupe separately.
  const styleCache = new Map<string, ResolvedStyles>();
  const generatedRules = new Set<string>();
  // Element mode: every rule's descriptor by rule key. A Box whose rule someone else generated still has
  // to render its `<style>`, so these are kept rather than consumed (React dedupes by href).
  const ruleElements = new Map<string, StyleElementDescriptor>();
  // The descriptors the resolve in progress walked over. Non-null for one call, in element mode only.
  let collecting: StyleElementDescriptor[] | null = null;
  // Rule keys that matched no definition. `generatedRules` short-circuits the second occurrence, so
  // without this the first Box would get no class and every later one a class with no rule.
  const unsupportedRules = new Set<string>();
  // Pending rules to be flushed: [sortIndex, mediaOrder, rule]
  const pendingRules: [number, number, string][] = [];
  // `@keyframes` blocks waiting for the next flush, already built into rule text.
  const pendingKeyframes: string[] = [];
  let requireFlush = true;
  let isInitialized = false;

  const boxClassName = '_b';
  const svgClassName = '_s';

  // Whether a prop key affects the class list. Checked live rather than snapshotted, because `extend()`
  // adds keys at runtime; mirrors `addClassNames` exactly.
  function isStyleKey(key: string): boolean {
    return (
      ObjectUtils.isKeyOf(key, cssStyles) ||
      ObjectUtils.isKeyOf(key, pseudo1) ||
      ObjectUtils.isKeyOf(key, pseudo2) ||
      ObjectUtils.isKeyOf(key, pseudoElements) ||
      ObjectUtils.isKeyOf(key, breakpoints) ||
      ObjectUtils.isKeyOf(key, mediaFeatures) ||
      ObjectUtils.isKeyOf(key, Containers.containerQueryKey) ||
      ObjectUtils.isKeyOf(key, Groups.groupKeys) ||
      ObjectUtils.isKeyOf(key, pseudoGroupClasses) ||
      ObjectUtils.isKeyOf(key, themeGroupClass) ||
      ObjectUtils.isKeyOf(key, startingStyleKey) ||
      ObjectUtils.isKeyOf(key, Variants.variantKeys)
    );
  }

  /**
   * A stable cache key for the inputs that decide a class list. Values go through JSON so `p={4}` and
   * `p="4"` cannot collide; null when something will not serialize, and the caller falls back.
   */
  function computeSignature(props: BoxStyleProps<any>, isSvg: boolean): string | null {
    try {
      let sig = `${isSvg ? 's' : 'b'}|${props.clean ? 'c' : ''}|${props.component ?? ''}|`;
      if (props.variant !== undefined) sig += JSON.stringify(props.variant);
      sig += '|';

      for (const key in props) {
        if (key === 'clean' || key === 'component' || key === 'variant') continue;
        const value = (props as Record<string, unknown>)[key];
        // Mirror addClassName's early return on null/undefined so they don't affect the key.
        if (value === undefined || value === null) continue;
        if (isStyleKey(key)) {
          sig += `${key}:${JSON.stringify(value)};`;
        }
      }

      return sig;
    } catch {
      return null;
    }
  }

  /** The context a walk starts from: nothing nested yet. */
  function rootContext(): StyleContext {
    return { pseudoClasses: [], query: NO_QUERY, variants: [], parents: [] };
  }

  function addClassNames(props: BoxStyleProps<any>, classNames: string[], context: StyleContext) {
    Object.entries(props).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      if (ObjectUtils.isKeyOf(key, cssStyles)) {
        addClassName(key, value, classNames, context);
      } else if (ObjectUtils.isKeyOf(key, pseudo1)) {
        addClassNames(value as BoxStyleProps, classNames, { ...context, pseudoClasses: [...context.pseudoClasses, key] });
      } else if (ObjectUtils.isKeyOf(key, pseudoElements)) {
        // One per compound selector — the types refuse a second, and a merged component style cannot
        // sneak one in either.
        if (context.element) return;

        const nested = { ...context, element: key };
        // A `::before` with no `content` generates no box at all, which is the trap this prop exists to
        // hide: declare one yourself (`content="none"` included) and nothing is added.
        if (generatesContent(key) && (value as BoxStyles).content === undefined) {
          addClassName('content', 'empty', classNames, nested);
        }

        addClassNames(value as BoxStyleProps, classNames, nested);
      } else if (ObjectUtils.isKeyOf(key, pseudo2)) {
        const nested = { ...context, pseudoClasses: [...context.pseudoClasses, key] };
        if (Array.isArray(value)) {
          const [_, styles] = value as [unknown, BoxStyleProps];
          addClassNames(styles, classNames, nested);
        }
        if (ObjectUtils.isObject(value)) {
          addClassNames(value as BoxStyleProps, classNames, nested);
        }
      } else if (ObjectUtils.isKeyOf(key, startingStyleKey)) {
        // Plain props only. The block wraps a whole rule, so a media query or a selector nested *inside*
        // it would have nowhere to go — they nest around `startingStyle` instead, and the types say so.
        Object.entries(value as BoxStyles).forEach(([startingKey, startingValue]) => {
          if (!ObjectUtils.isKeyOf(startingKey, cssStyles)) return;

          addClassName(startingKey, startingValue, classNames, context, true);
        });
      } else if (ObjectUtils.isKeyOf(key, breakpoints) || ObjectUtils.isKeyOf(key, mediaFeatures)) {
        // Both fill the same slot — one `@media` block per rule — and the types already refuse the nesting.
        addClassNames(value as BoxStyleProps, classNames, { ...context, query: mediaQuery(key) });
      } else if (ObjectUtils.isKeyOf(key, Containers.containerQueryKey)) {
        Object.entries(value as Record<string, BoxStyleProps>).forEach(([queryKey, queryProps]) => {
          // The same one slot a breakpoint fills, so a container query cannot nest in one or the other
          // way round. A key the grammar rejects drops its whole block, the way a variant's does.
          const query = containerQuery(queryKey);
          if (!query) return;

          addClassNames(queryProps, classNames, { ...context, query });
        });
      } else if (ObjectUtils.isKeyOf(key, Variants.variantKeys)) {
        Object.entries(value as Record<string, BoxStyleProps>).forEach(([name, variantProps]) => {
          const variant = Variants.variant(key, name);
          // A key the grammar rejects drops its whole block: no rule and no class name, the way an
          // unmatched prop value does. A typo is invisible rather than a selector nobody wrote.
          if (!variant) return;

          addClassNames(variantProps, classNames, { ...context, variants: Variants.add(context.variants, variant) });
        });
      } else if (ObjectUtils.isKeyOf(key, Groups.groupKeys)) {
        Object.entries(value as Record<string, BoxStyleProps>).forEach(([name, groupProps]) => {
          const parent = Groups.parent(key, name);
          // A key the grammar rejects drops its whole block, the way a variant's does: the ancestor's
          // class name lands in rule text, so it is validated before it becomes any.
          if (!parent) return;

          addClassNames(groupProps, classNames, { ...context, parents: [...context.parents, parent] });
        });
      } else if (ObjectUtils.isKeyOf(key, pseudoGroupClasses)) {
        // The five original spellings, rewritten into the general one: `hoverGroup={{ card: … }}` is
        // `group={{ 'card/hover': … }}`, and both compile to the same parent, so they share a class.
        Object.entries(value as Record<string, BoxStyleProps>).forEach(([name, groupProps]) => {
          const parent = Groups.parent('group', `${name}/${pseudoGroupClasses[key]}`);
          if (!parent) return;

          addClassNames(groupProps, classNames, { ...context, parents: [...context.parents, parent] });
        });
      } else if (ObjectUtils.isKeyOf(key, themeGroupClass)) {
        Object.entries(value as Record<string, BoxStyleProps>).forEach(([name, themeProps]) => {
          const parent = Groups.theme(name);
          if (!parent) return;

          // A group nested inside a theme needs no special case any more: it pushes a second parent, and
          // the two come out in nesting order — `.dark .card:hover .className`.
          addClassNames(themeProps, classNames, { ...context, parents: [...context.parents, parent] });
        });
      }
    });
  }

  function addClassName<TKey extends keyof BoxStyles, TValue extends BoxStyles[TKey]>(
    key: TKey,
    value: TValue | undefined | null,
    classNames: string[],
    context: StyleContext,
    startingStyle?: boolean,
  ) {
    if (value === undefined || value === null) return;

    const { query, parents, rootSelector, variants, element } = context;
    const weight = context.pseudoClasses.reduce((sum, pseudoClass) => sum + pseudoClassesWeight[pseudoClass], 0);
    const className = createClassName(key, value, weight, context, startingStyle);

    const serializedValue = serializeValue(value);
    const variantKey = variants.map((variant) => variant.name).join('_');
    const parentKey = parents.map((parent) => parent.name).join('_');
    const ruleKey = `${query.key}-${weight}-${element ?? ''}-${key}-${serializedValue}-${parentKey}-${rootSelector ?? ''}-${startingStyle ? 'start' : ''}-${variantKey}`;

    if (!generatedRules.has(ruleKey)) {
      generatedRules.add(ruleKey);

      const result = generateRule(key, value as BoxStyleValue, weight, context, startingStyle);
      if (result) {
        pendingRules.push([result.sortIndex, result.mediaOrder, result.rule]);
        requireFlush = true;
        if (isElementMode()) {
          ruleElements.set(ruleKey, {
            href: `${RULE_PRECEDENCE}-${stableHash(result.rule)}`,
            css: result.rule,
            precedence: RULE_PRECEDENCE,
            sortKey: sortKeyOf(result.sortIndex, result.mediaOrder),
          });
        }
        // The engine owns "something is pending", so an adapter that never flushes still gets its CSS.
        scheduleFlush();
      } else {
        unsupportedRules.add(ruleKey);
      }
    }

    // No rule means no class name either — an unmatched value used to leave a dangling class behind.
    if (unsupportedRules.has(ruleKey)) return;

    if (collecting) {
      const element = ruleElements.get(ruleKey);
      if (element) collecting.push(element);
    }

    classNames.push(className);
  }

  /**
   * The body of one rule: normally the definition's `styleName`s with the formatted value, and for a
   * definition that declares its own `declarations` (`vars`) the property names come from the value.
   */
  function declarations(itemValue: BoxStyle, key: string, value: BoxStyleValue) {
    if (itemValue.declarations) return itemValue.declarations(value, variables.getVariableValue);

    const styleName = Array.isArray(itemValue.styleName) ? itemValue.styleName : [itemValue.styleName ?? key];

    return styleName.map((s) => `${s}:${(itemValue.valueFormat as any)?.(value, variables.getVariableValue, s) ?? value}`).join(';');
  }

  /** The definition a prop's value matches, or null when nothing accepts it — no rule, and no class name. */
  function findDefinition(key: string, value: BoxStyleValue): BoxStyle | null {
    const item = cssStyles[key as keyof typeof cssStyles] as BoxStyle[] | undefined;
    if (!item) return null;

    let itemValue = item.find((x) => {
      // A definition that names its values judges them itself: `typeof` cannot tell `url(#sky)` from a typo.
      if (x.match) return x.match(value);

      if (Array.isArray(x.values)) {
        if (Array.isArray(value)) {
          // Tuple definition: each position must accept the value at that position.
          if (x.values.length > 0 && Array.isArray(x.values[0])) {
            return x.values.length === value.length && (x.values as unknown[][]).every((allowed, i) => allowed.includes(value[i]));
          }
          return x.values.length === value.length && x.values.every((v, i) => typeof v === typeof value[i]);
        }
        return (x.values as readonly unknown[]).includes(value);
      }
      return typeof value === typeof x.values;
    });

    if (!itemValue && typeof value === 'string') {
      // `Box.extend({ variables })` tokens are accepted on the props whose values resolve to `var(--token)`,
      // and so is an opacity modifier on one — the mix applies to the variable, whatever it was declared as.
      const alpha = Palette.alphaOf(value);

      if (alpha && variables.isUserVariable(alpha.color)) itemValue = item.find((x) => x.match === Palette.isAlpha);
      else if (variables.isUserVariable(value)) itemValue = item.find((x) => variableBackedValues.has(x.values));
    }

    return itemValue ?? null;
  }

  // Built now rather than at flush time: a colour token in a step has to be pending before the flush
  // writes the `:root` block it belongs in.
  function buildPendingKeyframes() {
    if (!keyframesRegistry.hasPending()) return;

    for (const [name, stops] of keyframesRegistry.drainPending()) {
      pendingKeyframes.push(keyframesRule(name, stops));
    }
  }

  /** One `@keyframes` sequence as its rule: every stop's Box props resolved the way a rule's would be. */
  function keyframesRule(name: string, stops: KeyframeStops): string {
    const body = Object.entries(stops)
      .map(([stop, props]) => {
        const stopDeclarations = Object.entries(props as BoxStyles)
          .map(([key, value]) => {
            const definition = findDefinition(key, value as BoxStyleValue);

            return definition ? declarations(definition, key, value as BoxStyleValue) : null;
          })
          .filter(Boolean)
          .join(';');

        return `${stop}{${stopDeclarations}}`;
      })
      .join('');

    return `@keyframes ${name}{${body}}`;
  }

  function generateRule(
    key: string,
    value: BoxStyleValue,
    weight: number,
    context: StyleContext,
    startingStyle?: boolean,
  ): { rule: string; sortIndex: number; mediaOrder: number } | null {
    const { query, parents, rootSelector } = context;
    const itemValue = findDefinition(key, value);
    if (!itemValue) return null;

    // A value that names a sequence is what puts it in the stylesheet — registration alone emits nothing.
    if (itemValue.keyframes) {
      keyframesRegistry.use(itemValue.keyframes(value));
      buildPendingKeyframes();
    }

    const sortIndex = cssStylesIndex[key] ?? 0;
    const rank = query.rank;
    // Filled in below, once the parents are walked: one `@scope` prelude per theme in front of this rule.
    const scopes: string[] = [];
    // The rank a starting rule is pushed into — see `STARTING_RANK`. It is the same dimension the query
    // uses, so a preference still beats a breakpoint inside each half.
    const mediaOrder = rank + (startingStyle ? STARTING_RANK : 0);

    /**
     * The finished rule: inside `@starting-style` when that is what was asked for, in its `@media` or
     * `@container` block, and in element mode in its cascade layer.
     */
    function finish(rule: string) {
      const starting = startingStyle ? `@starting-style{${rule}}` : rule;
      const scoped = scopes.reduceRight((inner, prelude) => `${prelude}{${inner}}`, starting);
      const wrapped = query.prelude === null ? scoped : `${query.prelude}{${scoped}}`;
      const layer = startingStyle ? startingLayerName(rank) : layerName(rank, sortIndex);

      return {
        rule: isElementMode() ? `@layer ${layer}{${wrapped}}` : wrapped,
        sortIndex,
        mediaOrder,
      };
    }

    /**
     * The rule body — with every starting declaration marked important. `STARTING_RANK` puts a starting
     * rule after every ordinary one, but source order settles a *tie* in specificity and nothing else: a
     * starting rule at `.x` (0,1,0) loses to the value it is supposed to start from at `.x[data-state=…]`
     * or `.dark .x` (0,2,0), and the entrance then silently never runs. Importance is the one thing that
     * outranks specificity, and inside `@starting-style` it reaches nothing but the before-change style.
     */
    function body(definition: BoxStyle): string {
      const rule = declarations(definition, key, value);

      return startingStyle
        ? rule
            .split(';')
            .map((declaration) => `${declaration}!important`)
            .join(';')
        : rule;
    }

    const className = escapeClassName(
      createClassName(key as keyof BoxStyles, value as BoxStyles[keyof BoxStyles], weight, context, startingStyle),
    );
    // The variants describe *this* element, so they join its own compound selector — before any
    // pseudo-element, and on the last compound when a group or a theme puts an ancestor in front.
    const variantSelector = context.variants.map((variant) => variant.selector).join('');
    const elementSelector = context.element ? pseudoElements[context.element] : '';

    /**
     * The pseudo-element, last and on the *target* — a group's pseudo-classes belong to the ancestor, so
     * appending the element with them produced `.group:hover::before .x`, a descendant of a
     * pseudo-element, which matches nothing. `::marker` and `::selection` name the descendants too, since
     * the prop is written on the list or the paragraph rather than on the item that draws the marker.
     */
    function withElement(target: string): string {
      if (!context.element) return target;

      const own = `${target}${elementSelector}`;

      return reachesDescendants(context.element) ? `${target} *${elementSelector},${own}` : own;
    }

    // A theme is the one parent a root selector can express, and it goes *on* it (`html.dark`): a group
    // or a peer describes another element, and a root rule has nobody else to name.
    const themeOnRoot = !!rootSelector && parents.length === 1 && parents[0].kind === 'theme';
    if (rootSelector && parents.length > 0 && !themeOnRoot) return null;

    /**
     * A theme is an `@scope` block rather than a plain ancestor, so a local `<Box.Theme>` inside a themed
     * page wins: its styles reach the subtree the theme owns and stop at the next element declaring one.
     * A root rule keeps the theme *on* it (`html.dark`), where nothing can nest inside it anyway.
     */
    const ancestors = themeOnRoot
      ? ''
      : parents
          .map((parent) => {
            if (parent.kind !== 'theme') return `${parent.selector}${parent.combinator}`;

            scopes.push(Groups.themeScope(parent));

            return `:scope${parent.combinator}`;
          })
          .join('');
    const pseudoClassesToUse = pseudoSelector(pseudoClassesOfWeight(weight));
    const baseSelector = `${ancestors}${rootSelector ?? `.${className}`}${themeOnRoot ? parents[0].selector : ''}${variantSelector}`;
    // The element goes in the suffix the `selector` hook is handed, so whatever it builds keeps it last.
    const selector =
      itemValue.selector?.(baseSelector, `${pseudoClassesToUse}${elementSelector}`) ?? withElement(`${baseSelector}${pseudoClassesToUse}`);

    return finish(`${selector}{${body(itemValue)}}`);
  }

  function createClassName<TKey extends keyof BoxStyles, TValue extends BoxStyles[TKey]>(
    key: TKey,
    value: TValue,
    weight: number,
    context: StyleContext,
    startingStyle?: boolean,
  ) {
    const { query, parents, variants, element } = context;
    const pseudoClassList = pseudoClassesOfWeight(weight);
    const serializedValue = serializeValue(value);
    const variantNames = variants.map((variant) => `${variant.name}-`).join('');
    const parentNames = parents.map((parent) => `${parent.name}-`).join('');

    const className = `${query.prelude === null ? '' : `${query.key}-`}${startingStyle ? 'starting-' : ''}${pseudoClassList.map((p) => `${p}-`).join('')}${element ? `${element}-` : ''}${variantNames}${parentNames}${key}-${serializedValue}`;

    switch (namingMode()) {
      case 'readable':
        // A value can carry a space (`strokeDasharray='8 4'`); escaping keeps the selector legal but splits the
        // class attribute in two, so the space becomes an underscore — the separator a tuple value already uses.
        return className.replace(/\s+/g, '_');
      case 'stable':
        return `_${stableHash(className)}`;
      default:
        return identity.getIdentity(className);
    }
  }

  /**
   * Every cascade layer, in cascade order: one statement naming the ranks, then each rank's own naming the
   * props inside it. Element mode gives up control of where a rule lands in `<head>` (React hoists in
   * render order), so a layer per (rank, prop) is what makes element order irrelevant. A prop `extend()`
   * registers after the first render lands after every prop named here, inside its rank.
   */
  function layerOrder(): string {
    const names = [BASE_LAYER];

    for (let rank = 0; rank < STARTING_RANK; rank++) {
      names.push(rankLayerName(rank));
    }

    // Last, and one name per query rank rather than one per rank and prop: every `@starting-style` rule
    // has to outrank every ordinary one, whatever property it is about. **Descending**, because every
    // starting declaration is `!important` and layer order reverses for those — a preference's starting
    // value has to come first here to keep beating a breakpoint's.
    for (let rank = STARTING_RANK - 1; rank >= 0; rank--) {
      names.push(startingLayerName(rank));
    }

    // The prop order *inside* each rank, as the same statement repeated once per rank. Naming every
    // (rank, prop) pair up front was 3,277 names and 6.6 KB gz once the container queries added twelve
    // ranks; one repeated block is 0.6 KB, because what gzip stores is the repetition.
    const props = Object.keys(cssStyles)
      .map((_, index) => `p${index.toString(36)}`)
      .join(',');
    const ranks = names
      .slice(1, STARTING_RANK + 1)
      .map((rank) => `@layer ${rank}{@layer ${props};}`)
      .join('');

    return `@layer ${names.join(',')};${ranks}`;
  }

  /**
   * What the base classes transition, as a declaration — empty when the engine was told to declare none.
   * The longhands, not the shorthand: a group is a *list* of properties, and `transition: a, b var(--t)`
   * reads the duration as part of the last item, leaving every other one at 0s (bug #109).
   */
  function baseTransitionOf(time: string): string {
    if (baseTransition === false) return '';

    const property = Animations.propertyGroups[baseTransition as Animations.PropertyGroup] ?? baseTransition;

    return `transition-property: ${property};transition-duration: var(${time});`;
  }

  /** The reset + `:root` block every engine writes before its first generated rule. */
  function baseRules(): string[] {
    // Skipped when there are none: an empty `:root{}` is valid CSS but noise in every SSR payload.
    const usedVariables = variables.generateVariables();

    const rules = [
      ...(usedVariables ? [`:root{${usedVariables}}`] : []),
      `:root{--borderColor: black;--outlineColor: black;--lineHeight: 1.2;--fontSize: 14px;--transitionTime: 0.25s;--svgTransitionTime: 0.3s;}`,
      // Every Box transitions on these two, so zeroing them is the whole reduced-motion default. A component
      // that still wants movement declares it under `motionReduce`, later in the cascade.
      `@media (prefers-reduced-motion: reduce){:root{--transitionTime: 0s;--svgTransitionTime: 0s;}}`,
      // The two axes `translate` is composed from. Registering them is what makes them *interpolable*: a
      // transition reads the substituted `translate` and works either way, but inside `@keyframes` an
      // unregistered custom property animates discretely — the loading bar sat at -100% and teleported.
      `@property --boxTranslateX{syntax: "<length-percentage>";inherits: false;initial-value: 0;}`,
      `@property --boxTranslateY{syntax: "<length-percentage>";inherits: false;initial-value: 0;}`,
      // The four shadow layers and their colours. Registering them is what stops them *inheriting*: a child
      // asking for a ring would otherwise read its parent's `--boxShadow` through the fallback and wear its
      // elevation. The universal syntax with no initial value is deliberate — anything else makes the
      // property always valid, and the `var()` fallback carrying each step's own alpha unreachable.
      ...Shadows.properties,
      // The eighteen filter functions, for the same reason: `filter` is inherited by nobody, but a custom
      // property is, so an unregistered `--boxBlur` would blur every descendant that names any filter of
      // its own a second time.
      ...Filters.properties,
      `#box-kite-portal {position: absolute;top: 0;left: 0;height: 0;z-index:99999;}`,
      `html{font-size: 16px;font-family: Arial, sans-serif;}`,
      `body{margin: 0;line-height: var(--lineHeight);font-size: var(--fontSize);}`,
      `a,ul{all: unset;}`,
      `button{color: inherit;}`,
      `input[type="number"]{-moz-appearance: textfield;}`,
      `input[type="number"]::-webkit-outer-spin-button,input[type="number"]::-webkit-inner-spin-button{-webkit-appearance: none;margin: 0;}`,
      `.${boxClassName}{display: block;border: 0 solid var(--borderColor);outline: 0px solid var(--outlineColor);margin: 0;padding: 0;background-color: initial;${baseTransitionOf('--transitionTime')}box-sizing: border-box;font-family: inherit;font-size: inherit;}`,
      `.${svgClassName}{display: block;border: 0 solid var(--borderColor);outline: 0px solid var(--outlineColor);margin: 0;padding: 0;${baseTransitionOf('--svgTransitionTime')}}`,
      // The shapes inside an <svg> transition on their own variable. Listed explicitly rather than `*`, so the
      // rule cannot reach a <foreignObject>'s HTML.
      `.${svgClassName} path,.${svgClassName} circle,.${svgClassName} ellipse,.${svgClassName} rect,.${svgClassName} line,.${svgClassName} polygon,.${svgClassName} polyline,.${svgClassName} text {${baseTransitionOf('--svgTransitionTime')}}`,
    ];

    if (!isElementMode()) return rules;

    // Unlayered CSS beats every layer, so once generated rules are layered the reset has to be too.
    return [layerOrder(), `@layer ${BASE_LAYER}{${rules.join('')}}`];
  }

  /** A rule's position in the cascade: media first, then prop declaration order. */
  function sortKeyOf(sortIndex: number, mediaOrder: number): number {
    return mediaOrder * 100000 + sortIndex;
  }

  /**
   * Empty the pending queue into a sorted batch. The sort key is the cascade position a rule must end up
   * at, whichever flush it happens to arrive in.
   */
  function drainPendingRules(): SortedRule[] {
    if (pendingRules.length === 0) return [];

    pendingRules.sort((a, b) => a[1] - b[1] || a[0] - b[0]);

    const drained = pendingRules.map(([sortIndex, mediaOrder, rule]) => ({ sortKey: sortKeyOf(sortIndex, mediaOrder), rule }));
    pendingRules.length = 0;

    return drained;
  }

  function flush() {
    const hasPendingVars = variables.hasPendingVariables();
    if (!requireFlush && !hasPendingVars && pendingKeyframes.length === 0) return;

    const target = getSink();

    if (!isInitialized) {
      target.writeBase(baseRules());
      // The base block already carries every variable used so far, so drop them from the pending queue.
      variables.getPendingVariables();
      isInitialized = true;
    } else if (hasPendingVars) {
      const pendingVars = variables.getPendingVariables();
      target.writeVariables(
        `:root{${Object.entries(pendingVars)
          .map(([key, val]) => `--${key}: ${val};`)
          .join('')}}`,
      );
    }

    // With the base rules: a sequence belongs to no single class, and `@keyframes` needs no position in
    // the cascade — a name resolves wherever the block sits.
    if (pendingKeyframes.length > 0) {
      target.writeBase(pendingKeyframes.splice(0, pendingKeyframes.length));
    }

    const drained = drainPendingRules();
    if (drained.length > 0) target.writeRules(drained);

    requireFlush = false;
  }

  const scheduleFlush = createFlushCoordinator(flush, options.scheduler ?? microtaskScheduler);

  /**
   * A class-name walk plus the style elements its rules need. Null outside element mode, where nothing
   * would render them anyway.
   */
  function collect(walk: () => void): StyleElementDescriptor[] | null {
    if (!isElementMode()) {
      walk();

      return null;
    }

    const elements: StyleElementDescriptor[] = [];
    collecting = elements;

    try {
      walk();
    } finally {
      collecting = null;
    }

    // Deduped (a Box can reach one rule twice) and in cascade order, so the list reads like a stylesheet.
    const seen = new Set<string>();
    const unique = elements.filter((element) => {
      if (seen.has(element.href)) return false;

      seen.add(element.href);

      return true;
    });

    return unique.sort((a, b) => a.sortKey - b.sortKey);
  }

  /**
   * A Box's elements with the engine's base element in front: the base block belongs to no single Box, so
   * every Box carries it and React dedupes the copies by href.
   */
  function withBaseElement(elements: StyleElementDescriptor[]): StyleElementDescriptor[] {
    // Nothing else would move the base rules out of the queue: no effect in element mode, no commit on a server.
    flush();
    const base = getSink().baseElement?.() ?? null;

    return base ? [base, ...elements] : elements;
  }

  /** Forget everything emitted so far, in the sink and in the engine's own bookkeeping. */
  function clear() {
    generatedRules.clear();
    unsupportedRules.clear();
    ruleElements.clear();
    pendingRules.length = 0;
    pendingKeyframes.length = 0;
    isInitialized = false;
    // The next flush has to write the base rules again — the sink no longer holds them.
    requireFlush = true;
    // Cached class lists must be recomputed and re-registered, or SSG drops styles.
    styleCache.clear();
    // Names come from a counter and variables accumulate into `:root`, so without this request N of a
    // long-lived server differs from request 1. Registered user variables survive — they are configuration.
    identity = new IdentityFactory();
    variables.reset();
    // Emitted sequences go with the sink; the rules that named them regenerate, so they come back with it.
    keyframesRegistry.reset();
    sink?.reset();
  }

  function resolveClassNames(props: BoxStyleProps<any>, isSvg: boolean) {
    const signature = computeSignature(props, isSvg);

    let resolved = signature !== null ? styleCache.get(signature) : undefined;

    if (!resolved) {
      const componentStyles = resolveComponentStyles(props, componentsStyles) as BoxStyleProps;
      const propsToUse = componentStyles ? mergeDeep(componentStyles, props) : props;

      const classNames = [isSvg ? svgClassName : boxClassName];
      resolved = { classNames, elements: collect(() => addClassNames(propsToUse, classNames, rootContext())) };

      if (signature !== null) styleCache.set(signature, resolved);
    }

    const { classNames, elements } = resolved;

    return elements ? { classNames, signature, styleElements: withBaseElement(elements) } : { classNames, signature };
  }

  return {
    styleElementId,

    resolveClassNames,

    classNames(props: BoxStyleProps<any>, options?: { svg?: boolean }) {
      if (isElementMode()) {
        throw new Error(
          '[box-kite] classNames() has nowhere to put its CSS in element mode: the rules come back from resolveClassNames() as style elements for the adapter to render.',
        );
      }

      return resolveClassNames(props, options?.svg ?? false).classNames.join(' ');
    },

    addGlobalStyles(props: BoxStyleProps<any>, selector: string) {
      const throwawayClassNames: string[] = [];
      const elements = collect(() => addClassNames(props, throwawayClassNames, { ...rootContext(), rootSelector: selector }));

      return elements ? withBaseElement(elements) : undefined;
    },

    flushSync: flush,

    scheduleFlush,

    getStyles() {
      // A server render finishes before any scheduled flush, so draining here is what completes the CSS.
      flush();

      return getSink().getStyles();
    },

    clear,

    configure(config: StylesConfiguration) {
      if (config.classNames) classNamesMode = config.classNames;

      if (config.transition !== undefined && config.transition !== baseTransition) {
        baseTransition = config.transition;
        // The base block is written once, so the only way to change it afterwards is to write it again.
        if (isInitialized) clear();
      }

      if (config.sink && config.sink !== (sink?.mode ?? sinkMode)) {
        // Rules already written live in the old sink, so the engine forgets them too — otherwise every rule
        // rendered so far would be missing with no way back. Nothing is written yet on the first configure.
        if (sink) clear();
        sink = undefined;
        sinkMode = config.sink;
      }

      // Cached class lists may have been resolved under a different naming mode.
      styleCache.clear();
    },

    extend(variablesToSet, extendedProps, extendedPropTypes) {
      variables.setUserVariables(variablesToSet);

      Object.entries(extendedProps).forEach(([key, val]) => {
        (cssStyles as Record<string, BoxStyle[]>)[key] = val;
      });

      Object.entries(extendedPropTypes).forEach(([key, val]) => {
        const prev = cssStyles[key as keyof typeof cssStyles];
        (cssStyles as Record<string, BoxStyle[]>)[key] = prev ? [...val, ...prev] : val;
      });

      // New props change both what counts as a style key and the sort order, and new variables can turn a
      // value that matched nothing into a supported one.
      rebuildCssStylesIndex();
      unsupportedRules.forEach((ruleKey) => generatedRules.delete(ruleKey));
      unsupportedRules.clear();
      styleCache.clear();

      return { extendedProps, extendedPropTypes };
    },

    components(components) {
      // Merge into what this engine holds, not the defaults: sequential calls used to drop earlier ones.
      componentsStyles = resolveExtends(mergeDeep<Components>(componentsStyles, components));
      // Cached class lists were resolved against the previous component defaults.
      styleCache.clear();

      return components;
    },

    keyframes(keyframesToRegister) {
      keyframesRegistry.register(keyframesToRegister);
      // Only a sequence redefined after something used it has anything to write here.
      buildPendingKeyframes();
      if (pendingKeyframes.length > 0) scheduleFlush();

      return keyframesToRegister;
    },

    getComponentsStyles() {
      return componentsStyles;
    },

    getVariableValue(name: string) {
      const value = variables.getVariableValue(name);
      // Reading a variable makes it pending: it has to reach `:root` even with no rule beside it.
      scheduleFlush();

      return value;
    },

    getCatalogSource() {
      return {
        styleProps: cssStyles,
        colors: [...Object.keys(Palette.colors), ...variables.userVariableNames()],
        animations: keyframesRegistry.names(),
      };
    },
  };
}
