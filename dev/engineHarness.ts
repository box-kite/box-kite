import { HTMLStyleElement } from 'happy-dom';
import { createStyleEngine, StyleEngine, StyleEngineOptions } from '../src/core/engine/styleEngine';
import { BoxStyleProps } from '../src/types';

/**
 * Shared helpers for engine-level tests: readable class names and the `textContent` sink, so a test can
 * assert exact rule text, and an explicit element id, so each test owns its own `<style>` element.
 */

/**
 * The selector of the last rule the engine writes when it initializes — everything past its closing
 * brace is generated CSS. The selector rather than the whole rule, because what is inside it is the base
 * transition, and changing those declarations once detached every engine test at once (bug #109).
 */
export const LAST_BASE_SELECTOR = '._s path,._s circle,._s ellipse,._s rect,._s line,._s polygon,._s polyline,._s text {';

export function makeEngine(styleElementId: string, options: StyleEngineOptions = {}): StyleEngine {
  return createStyleEngine({ classNames: 'readable', sink: 'textContent', styleElementId, ...options });
}

/** Everything in the engine's style element, base rules included. */
export function rulesOf(engine: StyleEngine): string {
  const element = document.getElementById(engine.styleElementId) as unknown as HTMLStyleElement | null;

  return element?.innerText ?? '';
}

/** The inert rule the engine opens one block per static prelude with (bug #207), in any sink's formatting. */
const PLACEHOLDER = /:not\(\*\)\s*\{\s*\}/g;

/** Only the rules generated from props — the base reset, `:root` blocks and the placeholder blocks are dropped. */
export function generatedRulesIn(css: string): string {
  const index = css.indexOf(LAST_BASE_SELECTOR);
  const end = index === -1 ? -1 : css.indexOf('}', index + LAST_BASE_SELECTOR.length);
  const generated = index === -1 || end === -1 ? css : css.slice(end + 1);

  // A placeholder block nothing joined is left empty, and goes with it.
  return generated.replace(PLACEHOLDER, '').replace(/\s*@[^{}]*\{\s*\}/g, '');
}

/** Only the rules generated from props, read out of the engine's style element. */
export function generatedRulesOf(engine: StyleEngine): string {
  return generatedRulesIn(rulesOf(engine));
}

/** Resolve a Box's class names and flush, the way a render would. */
export function renderStyles(engine: StyleEngine, props: BoxStyleProps, isSvg = false): string[] {
  const { classNames } = engine.resolveClassNames(props, isSvg);
  engine.flushSync();

  return classNames;
}

/** The generated rules of a CSS string as a list, e.g. `['.p-4{padding:1rem}']`. Media queries stay intact. */
export function ruleListIn(css: string): string[] {
  const rules: string[] = [];
  let depth = 0;
  let current = '';

  for (const char of generatedRulesIn(css)) {
    current += char;

    if (char === '{') depth++;
    if (char === '}') {
      depth--;
      if (depth === 0) {
        // Base rules are newline-separated, generated ones are not: drop a separator that came
        // along with the rule so callers can compare rule text directly.
        rules.push(current.trim());
        current = '';
      }
    }
  }

  return rules;
}

/** The generated rules in the engine's style element, as a list. */
export function ruleList(engine: StyleEngine): string[] {
  return ruleListIn(rulesOf(engine));
}
