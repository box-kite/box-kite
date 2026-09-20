import { component, components, props, rules } from './data';
import { nestingKeys, nestingKindLabel } from './vocabulary';

/**
 * One entry point over the four corpora, because an agent mid-task knows what it wants the UI to do
 * and not which of them holds the answer. Ranked rather than filtered: a query with no exact hit
 * should still come back with the three things most worth reading, since an empty result sends the
 * model back to its priors — which is the failure this whole package exists to prevent.
 */

export type HitKind = 'prop' | 'component' | 'nesting' | 'rule';

export interface Hit {
  kind: HitKind;
  /** What to pass to `get_props`, `get_component` or `get_rules` for the whole record. */
  name: string;
  summary: string;
  score: number;
}

const WORD = /[a-z0-9]+/g;

/**
 * Words that carry no signal and a great deal of noise: `in` matches `inline`, `inRange` and
 * `insetRing` before it matches anything the reader meant. Measured — "fade in when it mounts"
 * returned twelve hits about anchoring before this list existed.
 */
const STOPWORDS = new Set([
  'in',
  'it',
  'is',
  'to',
  'of',
  'on',
  'at',
  'an',
  'as',
  'be',
  'by',
  'or',
  'if',
  'do',
  'my',
  'we',
  'so',
  'up',
  'me',
  'no',
  'a',
  'i',
  'the',
  'and',
  'for',
  'with',
  'that',
  'this',
  'when',
  'what',
  'how',
  'can',
  'should',
  'does',
  'from',
  'into',
  'onto',
  'its',
  'his',
  'her',
  'their',
  'you',
  'your',
  'are',
  'was',
  'were',
  'have',
  'has',
  'but',
  'not',
  'all',
  'any',
  'one',
  'two',
  'out',
  'off',
  'use',
  'using',
  'make',
  'want',
  'need',
  'box',
  'css',
  'react',
  'prop',
  'props',
  'component',
  'components',
]);

/** A term and the stem behind it, so `mounts`/`mounted`/`mounting` all reach `mount`. */
function stems(term: string): string[] {
  const stem = term.replace(/(ies)$/, 'y').replace(/(ing|ed|es|s)$/, '');

  return stem.length >= 3 && stem !== term ? [term, stem] : [term];
}

/**
 * Query terms, the camelCase a prop name is written in split into words beside them, stemmed. The
 * stopwords come back when they were the whole query: `not`, `has` and `group` are all real keys.
 */
function terms(query: string): string[] {
  const spaced = query.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase();
  const words = (spaced.match(WORD) ?? []).filter((word) => word.length > 1);
  const carrying = words.filter((word) => !STOPWORDS.has(word));

  return [...new Set((carrying.length ? carrying : words).flatMap(stems))];
}

/** A whole-word hit is worth more than a substring: `p` inside `opacity` says nothing about padding. */
function occurrences(haystack: string, term: string): number {
  let count = 0;
  let index = haystack.indexOf(term);

  while (index >= 0) {
    const before = haystack[index - 1];
    const after = haystack[index + term.length];
    count += (before && /[a-z0-9]/.test(before)) || (after && /[a-z0-9]/.test(after)) ? 1 : 3;
    index = haystack.indexOf(term, index + term.length);
  }

  return count;
}

/**
 * Multiplied by how many of the query's terms were matched at all, so three words landing on one
 * entry beat one word landing hard: "style every other row" wants `nth`, and without the coverage
 * factor `borderStyle` wins it on the one word it has in its name.
 */
function score(query: string[], name: string, body: string): number {
  const spacedName = name.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase();
  const text = body.toLowerCase();

  // A rule's body runs to two thousand characters and so contains nearly any common word, where a
  // prop's description is a sentence. Without this the four corpora are not comparable at all and
  // every multi-word query answers with rules.
  const density = Math.min(1, 400 / Math.max(1, text.length));
  let matched = 0;

  const total = query.reduce((running, term) => {
    const inName = occurrences(spacedName, term);
    const inBody = occurrences(text, term);
    if (inName || inBody) matched += 1;

    // An exact name is the answer, not a candidate: a search for `gap` should not be outranked by a
    // rule that says "gap" nine times.
    return running + (spacedName === term ? 100 : 0) + inName * 8 + Math.min(inBody, 6) * density;
  }, 0);

  // Multiplied by how many of the query's terms landed at all, so three words hitting one entry beat
  // one word hitting hard: "style every other row" wants `nth`, not `borderStyle`.
  return total * matched;
}

const truncate = (text: string, limit = 160) => (text.length <= limit ? text : `${text.slice(0, limit - 1).trimEnd()}…`);

/**
 * What a reader calls a nesting key when they do not know its name. Search terms only — the facts
 * about each key stay in the engine's own records — but without them `startingStyle` is unreachable
 * from "fade in when it mounts", which is exactly how somebody asks for it.
 */
const SYNONYMS: Readonly<Record<string, string>> = {
  startingStyle: 'entrance enter appear mount mounted fade in animate on mount initial from',
  cq: 'container query responsive to the element rather than the viewport',
  dataAttr: 'data attribute state open closed selector',
  ariaAttr: 'aria attribute state expanded selected checked selector',
  has: 'contains a descendant child selector',
  not: 'except unless negate',
  nth: 'odd even first last nth-child position stripe striped zebra alternate row rows every other',
  motionReduce: 'reduced motion accessibility prefers',
  forcedColors: 'high contrast windows forced colours accessibility',
  contrastMore: 'prefers contrast accessibility',
  group: 'parent ancestor hover reveal on hover of the card',
  peer: 'sibling input checked label',
  theme: 'dark mode light mode themes',
  before: 'pseudo element generated content',
  after: 'pseudo element generated content',
  placeholder: 'input placeholder text',
  selection: 'selected text highlight',
  marker: 'list bullet number',
  backdrop: 'dialog popover behind overlay',
  rtl: 'right to left direction arabic hebrew',
  ltr: 'left to right direction',
  focusVisible: 'keyboard focus ring',
  pointerCoarse: 'touch finger mobile tap target',
  pointerFine: 'mouse pointer desktop',
};

/** The four corpora, ranked together. `kind` narrows it when the caller already knows which it wants. */
export function search(query: string, options: { kind?: HitKind; limit?: number } = {}): Hit[] {
  const query_ = terms(query);
  if (!query_.length) return [];

  const hits: Hit[] = [];

  if (!options.kind || options.kind === 'prop') {
    for (const record of props) {
      // A query naming a *value* nearly always wants the prop that takes it, so `sticky` has to
      // outrank the many descriptions that merely say the word: value hits are scored apart.
      const values = new Set((record.values ?? []).map((entry) => String(entry).toLowerCase()));
      const named = query_.filter((term) => values.has(term)).length * 20;
      const value = score(query_, record.name, `${record.description} ${record.properties.join(' ')}`) + named;
      if (value > 0)
        hits.push({
          kind: 'prop',
          name: record.name,
          summary: `${record.properties.join(', ')} — ${truncate(record.description)}`,
          score: value,
        });
    }
  }

  if (!options.kind || options.kind === 'component') {
    for (const record of components) {
      const propNames = record.props.map((entry) => entry.name).join(' ');
      const value = score(query_, record.name, `${record.description} ${propNames} ${(record.a11y ?? []).join(' ')}`);
      if (value > 0) hits.push({ kind: 'component', name: record.name, summary: truncate(record.description), score: value });
    }
  }

  if (!options.kind || options.kind === 'nesting') {
    for (const entry of nestingKeys) {
      if (entry.deprecated) continue;
      // A synonym is a curated way of asking for this key, so it is worth more than a word that
      // happens to be in a description — "dark mode" has to reach `theme` past `animationFillMode`.
      const synonyms = SYNONYMS[entry.key]?.split(' ') ?? [];
      const asked = query_.filter((term) => synonyms.includes(term)).length * 20;
      const value = score(query_, entry.key, `${entry.compiles} ${nestingKindLabel(entry.kind)}`) + asked;
      if (value > 0)
        hits.push({ kind: 'nesting', name: entry.key, summary: `${nestingKindLabel(entry.kind)} → \`${entry.compiles}\``, score: value });
    }
  }

  if (!options.kind || options.kind === 'rule') {
    for (const rule of rules) {
      const value = score(query_, `rule ${rule.number}`, `${rule.heading} ${rule.body}`);
      if (value > 0) hits.push({ kind: 'rule', name: String(rule.number), summary: truncate(rule.heading), score: value });
    }
  }

  return hits.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name)).slice(0, options.limit ?? 12);
}

/**
 * The components whose own props a name belongs to — what a search for `onValueChange` should answer
 * with, since the same prop name lives on six widgets and none of them is in the prop registry.
 */
export function componentsWithProp(name: string): string[] {
  const wanted = name.toLowerCase();

  return components
    .filter((record) =>
      [...record.props, ...(record.parts ?? []).flatMap((part) => part.props)].some((entry) => entry.name.toLowerCase() === wanted),
    )
    .map((record) => record.name);
}

/** Case-insensitive component lookup that also answers for a part (`Tabs.Tab` → `Tabs`). */
export function resolveComponent(name: string) {
  return component(name) ?? component(name.split('.')[0] ?? '');
}
