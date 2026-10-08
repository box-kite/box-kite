/**
 * Where a style engine's CSS ends up. `flush()` decides *what* to write and in which order; a sink
 * decides *how* — a live stylesheet, the text of a `<style>` element, or a string for a server. Every
 * implementation must produce the same order for the same calls, so SSR and the browser agree.
 */
import { documentHead } from '../../utils/environment/environmentUtils';
import { stableHash } from '../hash';

/** A generated rule plus the sort key that fixes its position in the cascade. */
export interface SortedRule {
  sortKey: number;
  rule: string;
}

/**
 * One hoistable `<style>` element: its CSS, the `href` React 19 dedupes it by, and its precedence group.
 * Element mode hands these to the adapter instead of writing anywhere, which is what makes it work in a
 * Server Component, where there is no effect and no DOM.
 */
export interface StyleElementDescriptor {
  /** Content-addressed: the same CSS always produces the same href, in every process. */
  href: string;
  css: string;
  precedence: string;
  /** Cascade position, so a list of descriptors can be kept in rule order. */
  sortKey: number;
}

/** The precedence group of the engine's base element (reset, `:root`, the cascade-layer order). */
export const BASE_PRECEDENCE = 'rb-base';
/** The precedence group every generated rule element belongs to. */
export const RULE_PRECEDENCE = 'rb';

export type SinkMode = 'cssom' | 'textContent' | 'string' | 'element';

export interface StyleSink {
  /** Which implementation this is. */
  readonly mode: SinkMode;
  /** The engine's base rules (reset + the first `:root` block), written once when it initializes. */
  writeBase(rules: readonly string[]): void;
  /** A `:root` block for variables first used after initialization. Goes ahead of everything else. */
  writeVariables(rule: string): void;
  /** Generated rules, each placed by its sort key. */
  writeRules(rules: readonly SortedRule[]): void;
  /** `@keyframes` blocks, which need no cascade position. A sink without it writes them with the base rules. */
  writeKeyframes?(rules: readonly string[]): void;
  /** Everything written so far, as CSS text. */
  getStyles(): string;
  /** Drop everything written so far. */
  reset(): void;
  /**
   * Element mode only: the base rules (reset, `:root`, the layer order) as one hoistable element, null
   * before anything is written. The href follows the content, so a longer version is a new element rather
   * than a silently-dropped duplicate.
   */
  baseElement?(): StyleElementDescriptor | null;
  /** The in-memory sinks only: the generated rules in cascade order with their sort keys, for an adoption manifest. */
  generatedRules?(): { rules: readonly string[]; sortKeys: readonly number[] };
}

/** Where an adopted sheet's generated rules start, and the sort key of each one after that. */
export interface AdoptedRules {
  baseRulesCount: number;
  sortKeys: number[];
}

/** First index whose key is strictly greater than `key` — so equal keys keep insertion order. */
function upperBound(keys: readonly number[], key: number): number {
  let lo = 0;
  let hi = keys.length;

  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (key < keys[mid]) {
      hi = mid;
    } else {
      lo = mid + 1;
    }
  }

  return lo;
}

/**
 * A chain of at-rules holding one style rule (`@media{@scope{.x{…}}}`): the innermost block, keyed by the chain's
 * text without that rule — serialized by the browser, so a rule parsed apart and one in the sheet compare equal.
 */
function blockOf(rule: CSSRule | undefined): [key: string, block: CSSGroupingRule] | null {
  let block: CSSRule | undefined;
  let inner = rule;

  while (inner && !('selectorText' in inner)) {
    block = inner;
    inner = (inner as CSSGroupingRule).cssRules?.[0];
  }

  return rule && inner && block ? [rule.cssText.replace(inner.cssText, ''), block as CSSGroupingRule] : null;
}

/**
 * The ordered rule model the string and textContent sinks share, mirroring what the CSSOM sink does to a
 * real stylesheet: base rules first, late `:root` blocks in front of them, generated rules sorted.
 */
function createRuleBuffer() {
  let variableRules: string[] = [];
  let baseRules: string[] = [];
  let rules: string[] = [];
  let sortKeys: number[] = [];

  return {
    writeBase(next: readonly string[]) {
      baseRules = [...baseRules, ...next];
    },
    writeVariables(rule: string) {
      variableRules = [rule, ...variableRules];
    },
    writeRules(batch: readonly SortedRule[]) {
      for (const { sortKey, rule } of batch) {
        const index = upperBound(sortKeys, sortKey);
        sortKeys.splice(index, 0, sortKey);
        rules.splice(index, 0, rule);
      }
    },
    generatedRules() {
      return { rules, sortKeys };
    },
    /** The base rules only: the reset, the `:root` blocks, and in element mode the layer order. */
    getBaseStyles() {
      return [...variableRules, ...baseRules].join('\n');
    },
    getStyles() {
      // Base rules stay newline-separated and generated rules are concatenated, the way the
      // engine has always written them — the output is what SSR ships and tests read.
      return [...variableRules, ...baseRules].join('\n') + rules.join('');
    },
    reset() {
      variableRules = [];
      baseRules = [];
      rules = [];
      sortKeys = [];
    },
  };
}

/** Collects CSS in memory. The server-rendering sink, and the fallback wherever there is no DOM. */
export function createStringSink(): StyleSink {
  const { getBaseStyles: _, ...buffer } = createRuleBuffer();

  return { mode: 'string', ...buffer };
}

/**
 * Element mode: nothing is written anywhere. Each rule becomes a `StyleElementDescriptor` the adapter
 * renders as `<style href precedence>`, which React 19 hoists and dedupes. This sink keeps the same
 * in-memory model as the string one, so `getStyles()` still returns the whole stylesheet.
 */
export function createElementSink(): StyleSink {
  const buffer = createRuleBuffer();
  let base: StyleElementDescriptor | null = null;
  // Hashing the base block (a few kB) on every Box render would be wasteful, so it is recomputed
  // only after something actually changed it — a new variable, or the very first flush.
  let baseChanged = true;

  return {
    mode: 'element',
    writeBase(rules) {
      buffer.writeBase(rules);
      baseChanged = true;
    },
    writeVariables(rule) {
      buffer.writeVariables(rule);
      baseChanged = true;
    },
    writeRules: buffer.writeRules,
    getStyles: buffer.getStyles,
    reset() {
      buffer.reset();
      base = null;
      baseChanged = true;
    },
    baseElement() {
      if (baseChanged) {
        const css = buffer.getBaseStyles();
        base = css ? { href: `${BASE_PRECEDENCE}-${stableHash(css)}`, css, precedence: BASE_PRECEDENCE, sortKey: -1 } : null;
        baseChanged = false;
      }

      return base;
    },
  };
}

/** Writes the whole rule model into the style element's text on every change. */
export function createTextContentSink(getElement: () => HTMLStyleElement): StyleSink {
  const buffer = createRuleBuffer();

  function write() {
    getElement().textContent = buffer.getStyles();
  }

  return {
    mode: 'textContent',
    writeBase(rules) {
      buffer.writeBase(rules);
      write();
    },
    writeVariables(rule) {
      buffer.writeVariables(rule);
      write();
    },
    writeRules(rules) {
      buffer.writeRules(rules);
      write();
    },
    getStyles: buffer.getStyles,
    reset() {
      buffer.reset();
      write();
    },
  };
}

/**
 * Inserts into the element's live `CSSStyleSheet` — what a browser uses. `adopted` is a server-rendered
 * sheet already in the element, so the rules added after it are placed among its own.
 */
export function createCssomSink(getElement: () => HTMLStyleElement, adopted?: AdoptedRules): StyleSink {
  // Number of base rules at the front of the sheet; generated rules are inserted after them.
  let baseRulesCount = adopted?.baseRulesCount ?? 0;
  // Sort keys of the generated rules already in the sheet, ascending — the index of a key here is
  // the index of its rule in the sheet (offset by baseRulesCount).
  let sortKeys: number[] = adopted?.sortKeys ?? [];
  // A top-level at-rule inserted late makes Blink restyle the whole document (bugs #206, #207), while a style rule
  // added inside an existing block is diffed like any other — so an at-rule joins a block of its prelude chain, in
  // key order. A chain belongs to one rank, and inside a rank two chains never tie on source order: a theme's
  // `:scope` outranks an unscoped rule by specificity or proximity, and two themes never share an element.
  const blocks = new Map<string, [keys: number[], block: CSSGroupingRule][]>();
  let blocksIndexed = !adopted;
  let scratch: CSSStyleSheet | undefined;
  // A late `@keyframes` costs the same full restyle in the engine's sheet and nothing in one holding only keyframes.
  let keyframes: HTMLStyleElement | undefined;

  // Re-resolved per write: the element can be recreated (or first gain a sheet) between flushes.
  function sheetOf(): CSSStyleSheet | null {
    return (getElement().sheet as CSSStyleSheet | null) ?? null;
  }

  /** A new block, in its chain's list by first key — the order the blocks have in the sheet. */
  function remember(sortKey: number, rule: CSSRule | undefined) {
    const [chain, block] = blockOf(rule) ?? [];
    // Stable, so a block opened at a key already taken goes after it, where `upperBound` put it in the sheet.
    if (block)
      blocks.set(
        chain!,
        [...(blocks.get(chain!) ?? []), [[sortKey], block] as [number[], CSSGroupingRule]].sort(([a], [b]) => a[0] - b[0]),
      );
  }

  // The one base block a generated rule may join: a starting rule is `!important`, so it can sit ahead of its rank.
  function rememberBase(rule: CSSRule | undefined) {
    if (rule?.cssText.startsWith('@starting-style')) remember(-1, rule);
  }

  function joinBlock(sheet: CSSStyleSheet, sortKey: number, rule: string): boolean {
    if (!blocksIndexed) {
      blocksIndexed = true;
      for (let index = 0; index < baseRulesCount; index++) rememberBase(sheet.cssRules[index]);
      sortKeys.forEach((key, index) => remember(key, sheet.cssRules[baseRulesCount + index]));
    }

    try {
      // Parsed in a detached sheet first, which is what tells which chain (if any) it belongs to.
      (scratch ??= new CSSStyleSheet()).replaceSync(rule);
      const [chain, parsed] = blockOf(scratch.cssRules[0]) ?? [];
      const list = parsed && blocks.get(chain!);
      if (!list) return false;

      // The last block starting at or before this key, or the first when none does, keeps the chain in key order.
      const [keys, block] = list.findLast(([keys]) => keys[0] <= sortKey) ?? list[0];
      if (block.parentStyleSheet !== sheet) return false;

      const index = upperBound(keys, sortKey);
      block.insertRule(parsed.cssRules[0].cssText, index);
      keys.splice(index, 0, sortKey);

      return true;
    } catch {
      return false;
    }
  }

  return {
    mode: 'cssom',
    writeBase(rules) {
      const sheet = sheetOf();
      if (!sheet) return;

      for (const rule of rules) {
        try {
          sheet.insertRule(rule, baseRulesCount);
          rememberBase(sheet.cssRules[baseRulesCount++]);
        } catch {
          // Skip invalid rules.
        }
      }
    },
    writeVariables(rule) {
      const sheet = sheetOf();
      if (!sheet) return;

      try {
        sheet.insertRule(rule, 0);
        baseRulesCount++;
      } catch {
        // Skip if invalid.
      }
    },
    writeRules(rules) {
      const sheet = sheetOf();
      if (!sheet) return;

      for (const { sortKey, rule } of rules) {
        if (rule.startsWith('@') && joinBlock(sheet, sortKey, rule)) continue;

        const index = upperBound(sortKeys, sortKey);

        try {
          sheet.insertRule(rule, baseRulesCount + index);
          sortKeys.splice(index, 0, sortKey);
          remember(sortKey, sheet.cssRules[baseRulesCount + index]);
        } catch {
          try {
            // Fallback: append. Wrapped as well, so one rule the parser rejects cannot abort the
            // whole flush and take every rule after it down with it.
            sheet.insertRule(rule, sheet.cssRules.length);
            sortKeys.push(sortKey);
          } catch {
            // Nothing to record — the rule never made it into the sheet.
          }
        }
      }
    },
    writeKeyframes(rules) {
      const element = getElement();
      if (!element.sheet) return;

      if (!keyframes?.isConnected) {
        keyframes = document.createElement('style');
        keyframes.id = `${element.id}-keyframes`;
        element.after(keyframes);
      }

      for (const rule of rules) {
        try {
          keyframes.sheet!.insertRule(rule, keyframes.sheet!.cssRules.length);
        } catch {
          // Skip invalid rules.
        }
      }
    },
    getStyles() {
      const sheet = sheetOf();

      return sheet ? [...sheet.cssRules, ...(keyframes?.sheet?.cssRules ?? [])].map((rule) => rule.cssText).join('\n') : '';
    },
    reset() {
      const sheet = sheetOf();
      baseRulesCount = 0;
      sortKeys = [];
      blocks.clear();
      blocksIndexed = true;
      if (!sheet) return;

      keyframes?.remove();
      keyframes = undefined;

      while (sheet.cssRules.length > 0) {
        sheet.deleteRule(0);
      }
    },
  };
}

function canUseDom(): boolean {
  return !!documentHead();
}

/** The engine's `<style>` element, created (at the top of `<head>`) the first time it is needed. */
export function resolveStyleElement(styleElementId: string): HTMLStyleElement {
  let element = document.getElementById(styleElementId) as HTMLStyleElement | null;

  if (!element) {
    element = document.createElement('style');
    element.setAttribute('id', styleElementId);
    element.setAttribute('type', 'text/css');
    document.head.insertBefore(element, document.head.firstChild);
  }

  return element;
}

/**
 * The sink for a mode. With none given it follows the environment — a stylesheet in the browser, a
 * string on a server, which is why server rendering needs no fake `document`.
 */
export function createSink(styleElementId: string, mode?: SinkMode): StyleSink {
  // Element mode has to be asked for: it changes what the adapter renders, not just where CSS
  // goes, so it can never be inferred from the environment.
  if (mode === 'element') return createElementSink();
  if (mode === 'string' || !canUseDom()) return createStringSink();

  const getElement = () => resolveStyleElement(styleElementId);

  if (mode === 'textContent') return createTextContentSink(getElement);

  // A style element only has a `sheet` once it is in a document; without one (some test DOMs,
  // a detached element) rule text is the only way to write.
  return getElement().sheet ? createCssomSink(getElement) : createTextContentSink(getElement);
}
