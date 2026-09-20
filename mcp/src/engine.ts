import { styleEngine } from './data';

/**
 * What one prop writes, measured. Every answer this server gives about a value — the example, the
 * scale, the verdict — comes through here rather than out of a table, so a changed divider changes
 * the documentation in the same commit and a rejected value is reported as what it is: nothing.
 */

/**
 * The sheet as a list of top-level rules. A brace counter rather than a split on `}`, because a
 * `@media`, `@container` or `@scope` block carries rules of its own and a nested one must stay with
 * its wrapper — and because the sink writes several rules to a line, so a line is not a rule.
 */
export function splitRules(css: string): string[] {
  const rules: string[] = [];
  let depth = 0;
  let start = 0;

  for (let index = 0; index < css.length; index += 1) {
    const character = css[index];
    if (character === '{') depth += 1;
    if (character !== '}') continue;

    depth -= 1;
    if (depth > 0) continue;

    rules.push(css.slice(start, index + 1).trim());
    start = index + 1;
  }

  return rules.filter(Boolean);
}

/** The base stylesheet every engine writes before any prop does: `:root`, the `@property` pair, the reset. */
const BASE = new Set(
  (() => {
    const engine = styleEngine();
    engine.flushSync();

    return splitRules(engine.getStyles());
  })(),
);

export interface Measured {
  /** The rules this prop added, at-rules included — empty when the value was not accepted. */
  css: string;
  /** The class names it produced, without the base class every Box carries. */
  classNames: string[];
}

/** One prop resolved on an engine of its own, so nothing it writes can hide behind another prop's class. */
export function measure(name: string, value: unknown): Measured {
  const engine = styleEngine();
  const classNames = engine
    .classNames({ [name]: value })
    .split(' ')
    .filter((className) => className && className !== '_b');

  engine.flushSync();
  const css = splitRules(engine.getStyles())
    .filter((rule) => !BASE.has(rule) && !rule.startsWith(':root'))
    .join('\n');

  return { css, classNames };
}

/** Just the declarations, for a table where the selector is noise: `padding:1rem`. */
export function declarations(name: string, value: unknown): string {
  const { css } = measure(name, value);
  const open = css.indexOf('{');

  return open < 0 ? '' : css.slice(open + 1, css.lastIndexOf('}')).trim();
}

/** How a value is written in JSX — a string in quotes, everything else in braces. */
export const written = (name: string, value: unknown): string =>
  typeof value === 'string' ? `${name}="${value}"` : `${name}={${JSON.stringify(value)}}`;
