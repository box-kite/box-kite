/**
 * Adoption: the browser engine takes over a server-rendered stylesheet instead of building it again. The
 * server writes a manifest beside its CSS — each generated rule's sort key, plus a checksum of which class
 * each one styles — and the browser checks it against what it parsed before trusting a single index.
 */
import { documentOrNull } from '../../utils/environment/environmentUtils';
import { stableHash } from '../hash';
import { AdoptedRules } from './styleSink';

/** The attribute the manifest travels in, on the engine's own `<style>`. */
export const ADOPTION_ATTRIBUTE = 'data-box-kite';

const VERSION = '1';

// A rule's identity is the first stable class it names; the base classes `_b` and `_s` are too short to match.
const generatedClass = /\._[0-9a-z]{2,}/;
const customProperty = /--([^\s:;{}]+)\s*:/g;

/** What an adopted sheet already holds, for the engine to treat as generated. */
export interface AdoptedSheet extends AdoptedRules {
  /** Every rule in the sheet by the class it styles, and a rule on a root selector by `rootIdentity`. */
  identities: Set<string>;
  /** The custom properties its `:root` blocks declare, without the `--`. */
  variables: string[];
  keyframes: string[];
}

function identityOf(text: string): string {
  return generatedClass.exec(text)?.[0].slice(1) ?? '';
}

/** A rule on a root selector styles no class of its own, so the manifest names it. */
export function rootIdentity(selector: string, className: string): string {
  return `${className}@${encodeURIComponent(selector)}`;
}

/**
 * The manifest for a stylesheet's generated rules: their sort keys as runs of `delta*count` in base 36,
 * the checksum, and the root-selector rules. Every character is attribute-safe.
 */
export function adoptionManifest(rules: readonly string[], sortKeys: readonly number[], rootRules: Iterable<string>): string {
  const runs: string[] = [];
  let previous = 0;

  for (let i = 0; i < sortKeys.length;) {
    const key = sortKeys[i];
    let count = 0;
    while (sortKeys[i] === key) {
      count++;
      i++;
    }

    runs.push(`${(key - previous).toString(36)}${count > 1 ? `*${count.toString(36)}` : ''}`);
    previous = key;
  }

  return [VERSION, runs.join('.'), stableHash(rules.map(identityOf).join(',')), [...rootRules].join(',')].join(';');
}

function decodeRuns(runs: string): number[] | null {
  const keys: number[] = [];
  let key = 0;

  for (const run of runs ? runs.split('.') : []) {
    const [delta, count = '1'] = run.split('*');
    key += parseInt(delta, 36);
    const times = parseInt(count, 36);
    if (Number.isNaN(key) || Number.isNaN(times)) return null;

    for (let n = 0; n < times; n++) keys.push(key);
  }

  return keys;
}

/** The selector of the first style rule inside `rule`, however many at-rules wrap it. */
function firstSelector(rule: CSSRule): string {
  if ('selectorText' in rule) return (rule as CSSStyleRule).selectorText;

  const children = (rule as CSSGroupingRule).cssRules;
  for (let i = 0; children && i < children.length; i++) {
    const selector = firstSelector(children[i]);
    if (selector) return selector;
  }

  return '';
}

function read(element: HTMLStyleElement, manifest: string): AdoptedSheet | null {
  const [version, runs, checksum, roots] = manifest.split(';');
  const rules = element.sheet?.cssRules;
  const sortKeys = decodeRuns(runs);
  if (version !== VERSION || !rules || !sortKeys) return null;

  // Counted from the end, because the base is where a browser drops what it does not know (`@property`).
  const baseRulesCount = rules.length - sortKeys.length;
  if (baseRulesCount < 0) return null;

  const identities = new Set<string>();
  const sequence: string[] = [];
  for (let i = baseRulesCount; i < rules.length; i++) {
    const identity = identityOf(firstSelector(rules[i]));
    sequence.push(identity);
    if (identity) identities.add(identity);
  }

  // A dropped generated rule shifts every index after it, and only the sequence can tell.
  if (stableHash(sequence.join(',')) !== checksum) return null;

  if (roots) roots.split(',').forEach((root) => identities.add(root));

  const variables: string[] = [];
  const keyframes: string[] = [];
  for (let i = 0; i < baseRulesCount; i++) {
    const rule = rules[i];
    if ('appendRule' in rule) keyframes.push((rule as CSSKeyframesRule).name);
    else if ((rule as CSSStyleRule).selectorText === ':root') {
      for (const [, name] of rule.cssText.matchAll(customProperty)) variables.push(name);
    }
  }

  return { baseRulesCount, sortKeys, identities, variables, keyframes };
}

/**
 * Takes over the server-rendered `<style>` with this id, or returns null. One it cannot adopt keeps styling the
 * page under no id, with the engine's own element after it so every rule regenerated on the client wins.
 */
export function adoptStyleElement(styleElementId: string, canAdopt: boolean): AdoptedSheet | null {
  const document = documentOrNull();
  const element = document?.getElementById(styleElementId) as HTMLStyleElement | null;
  const manifest = element?.getAttribute(ADOPTION_ATTRIBUTE);
  if (!document || !element || manifest == null) return null;

  element.removeAttribute(ADOPTION_ATTRIBUTE);
  const adopted = canAdopt ? read(element, manifest) : null;

  if (!adopted) {
    const own = document.createElement('style');
    element.removeAttribute('id');
    own.setAttribute('id', styleElementId);
    own.setAttribute('type', 'text/css');
    element.after(own);
  }

  return adopted;
}
