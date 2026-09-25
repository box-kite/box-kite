import { nestingKeys, reservedProps } from '../../mcp/src/vocabulary';
import { getDefaultEngine } from '../../src/core';
import type { Classifier, NameKind } from './codeTokens';

/** The nesting kinds whose first level is names — a theme, a container size, an attribute, a group. */
export const RECORD_KINDS: ReadonlySet<string> = new Set(['theme', 'container', 'variant', 'group']);

/** Props every Box takes beside its styles, React's own included. */
const RESERVED = new Set([...Object.keys(reservedProps), 'component', 'variant', 'clean', 'id', 'key', 'ref', 'style']);

let cached: Classifier | undefined;

/**
 * How a code block tells a style prop from a nesting key from anything else: the live registry, so a
 * `Box.extend()` prop the site declares is a style prop too. It knows no component's own props — that is
 * the playground's heavier vocabulary — so it flags nothing: an unknown name is just another prop.
 */
export function registryClassifier(): Classifier {
  if (cached) return cached;

  const style = new Set(Object.keys(getDefaultEngine().getCatalogSource().styleProps));
  const nesting = new Map(nestingKeys.map((entry) => [entry.key, entry.kind]));
  const kind = (name: string): NameKind =>
    style.has(name) ? 'style' : nesting.has(name) ? 'nesting' : RESERVED.has(name) ? 'reserved' : /^on[A-Z]/.test(name) ? 'event' : 'prop';

  cached = {
    // A lowercase tag is an HTML element, whose attributes are attributes.
    attribute: (tag, name) => (/^[A-Z]/.test(tag) ? kind(name) : RESERVED.has(name) ? 'reserved' : 'prop'),
    key: (name) => (style.has(name) ? 'style' : nesting.has(name) ? 'nesting' : 'prop'),
    records: (name) => RECORD_KINDS.has(nesting.get(name) ?? ''),
  };

  return cached;
}
