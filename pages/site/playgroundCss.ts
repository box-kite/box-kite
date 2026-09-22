/**
 * Which of the engine's rules a rendered demo is actually using — the pane no Tailwind playground has an
 * answer for, because there the class is the name of a rule somebody wrote and here it is the name of one
 * the engine generated from a prop.
 *
 * The browser does the parsing: this walks the live `CSSRuleList` rather than the text of `getStyles()`, so
 * what the pane prints is what the page is being styled by, at-rules and cascade order included. The shape
 * it walks is the structural part of the CSSOM, which is what lets a test hand it plain objects.
 */

/** As much of a `CSSRule` as this needs — a grouping rule (`@media`, `@scope`, `@starting-style`) has both. */
export interface CssRuleLike {
  cssText: string;
  selectorText?: string;
  /** `@keyframes`, which is named rather than selected, so a rule that uses one is what keeps it. */
  name?: string;
  cssRules?: ArrayLike<CssRuleLike>;
}

/** One rule the demo is using, with the at-rules it sits inside named from the outside in. */
export interface UsedRule {
  /** The selector, or the `@keyframes` name. */
  selector: string;
  /** `@media (min-width: 48rem)`, `@scope (.dark) to ([data-theme])` — outermost first, empty at the top level. */
  context: string[];
  /** The declarations, as the browser reports them. */
  declarations: string;
}

/** The prelude of a grouping rule: everything up to the `{` that opens it. */
function preludeOf(rule: CssRuleLike): string {
  return rule.cssText.slice(0, rule.cssText.indexOf('{')).trim();
}

/** The declarations of a style rule: what is between its outermost braces. */
function declarationsOf(rule: CssRuleLike): string {
  const open = rule.cssText.indexOf('{');
  const close = rule.cssText.lastIndexOf('}');

  return open < 0 || close < open ? '' : rule.cssText.slice(open + 1, close).trim();
}

/** Every class name a selector mentions — `.a.b:hover .c` is `a`, `b`, `c`. */
export function classesIn(selector: string): string[] {
  return [...selector.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map((match) => match[1]);
}

/**
 * The rules that style these classes, in sheet order — which is the engine's own cascade order, so reading
 * the pane top to bottom is reading the cascade. A `@keyframes` is kept when something kept names it: an
 * animation whose sequence was left out would be a rule with nothing to explain it.
 */
export default function usedRules(sheet: ArrayLike<CssRuleLike>, classes: ReadonlySet<string>): UsedRule[] {
  const used: UsedRule[] = [];
  const keyframes: UsedRule[] = [];

  const walk = (rules: ArrayLike<CssRuleLike>, context: string[]) => {
    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i];

      if (rule.name !== undefined && rule.selectorText === undefined) {
        keyframes.push({ selector: `@keyframes ${rule.name}`, context, declarations: declarationsOf(rule) });
        continue;
      }

      // A selector first, and only then a group. Since nested CSS shipped, a plain `CSSStyleRule` carries a
      // `cssRules` of its own — empty, but an object, so testing it first read every rule on the page as an
      // at-rule and found no selectors at all (measured in Chrome 152: 349 groups, 0 style rules).
      if (rule.selectorText) {
        if (classesIn(rule.selectorText).some((name) => classes.has(name))) {
          used.push({ selector: rule.selectorText, context, declarations: declarationsOf(rule) });
        }

        continue;
      }

      if (rule.cssRules?.length) walk(rule.cssRules, [...context, preludeOf(rule)]);
    }
  };

  walk(sheet, []);

  const named = used.map((rule) => rule.declarations).join(' ');

  return [...used, ...keyframes.filter((rule) => named.includes(rule.selector.slice('@keyframes '.length)))];
}

/** Every class on an element and everything inside it — what the demo is asking the engine for. */
export function classesOf(root: Element): Set<string> {
  const classes = new Set<string>();

  for (const element of [root, ...root.querySelectorAll('*')]) {
    for (const name of element.classList) classes.add(name);
  }

  return classes;
}
