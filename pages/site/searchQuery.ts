import type { SearchIndex, SearchIndexPage, SearchIndexProp, SearchSection } from './searchIndex';

/**
 * The other half of docs search: an index (`searchIndex.ts`) and what somebody typed, scored into the
 * list the dialog renders. Framework-free and synchronous — a keystroke scans the whole 460 KB index and
 * renders the list in 4–8 ms (measured in Chrome on the built site), so there is no worker, no debounce
 * and no stemmer: `container query` does not find a heading that says Container Queries.
 *
 * What it is tuned for, in order: a page by its name (`dropdown`), a prop by its own (`fontsize`), and
 * then the prose. A term has to match *somewhere* in a result or the result is out — the AND every
 * search box is expected to do — and the excerpt is cut around the first term that matched, with the
 * ranges the dialog marks up.
 */

export type SearchKind = 'page' | 'section' | 'prop';

export interface SearchResult {
  kind: SearchKind;
  /** Where Enter goes: a route, with the section's anchor or the prop finder's query on it. */
  href: string;
  /** The page this came out of — what the list groups under. */
  page: string;
  /** The result's own name: the page, the heading, or the prop. */
  title: string;
  /** A line of context, cut around the match. */
  excerpt: string;
  /** Ranges in `excerpt` that matched, for the highlight. */
  ranges: readonly (readonly [number, number])[];
  score: number;
}

/** The prop finder on /box reads this, so a prop result opens the page with that one prop showing. */
export const PROP_QUERY = 'prop';

/** How many results one page may contribute, so a long page cannot fill the list. */
const PER_PAGE = 3;

const DEFAULT_LIMIT = 20;

/** Characters of context around a match. */
const EXCERPT_BEFORE = 50;
const EXCERPT_LENGTH = 170;

/** What a match is worth in each field, before the kind's own bonus. */
const TITLE_WEIGHT = 10;
const PAGE_WEIGHT = 5;
const TEXT_WEIGHT = 3;

/**
 * A page beats its own sections, and a prop beats the prose that mentions it. The page's is the big one
 * because a one-word query is usually the name of a page — `install` has to answer with Installation,
 * which has one hit, over the six sections whose own heading is the whole word.
 */
const KIND_BONUS: Record<SearchKind, number> = { page: 20, prop: 5, section: 0 };

/**
 * A whole-word hit on the thing itself — `dropdown` typed, `Dropdown` the page. A section does not get
 * it: the Icon page has one headed `Install`, and the page a reader typing that wants is Installation.
 */
const EXACT_TITLE_BONUS = 25;

const WORD = /[a-z0-9]/i;

/** The words a query asks for: lowercased, deduped, and capped where somebody pastes a paragraph. */
export function queryTerms(query: string): string[] {
  return [
    ...new Set(
      query
        .toLowerCase()
        .split(/[^a-z0-9]+/i)
        .filter(Boolean),
    ),
  ].slice(0, 6);
}

/**
 * What one term is worth against one field: 3 for a whole word, 2 for the start of one, 1 for a hit
 * inside it. A capital counts as the start of a word, which is the whole of `size` finding `fontSize`.
 */
function scoreField(field: string, lower: string, term: string): number {
  let best = 0;

  for (let at = lower.indexOf(term); at !== -1; at = lower.indexOf(term, at + 1)) {
    const before = at === 0 ? '' : field[at - 1];
    const after = field[at + term.length] ?? '';
    const starts = at === 0 || !WORD.test(before) || (field[at] >= 'A' && field[at] <= 'Z');
    const ends = !WORD.test(after) || (after >= 'A' && after <= 'Z');
    const score = starts && ends ? 3 : starts ? 2 : 1;

    if (score > best) best = score;
    if (best === 3) break;
  }

  return best;
}

interface Document {
  kind: SearchKind;
  href: string;
  page: string;
  title: string;
  text: string;
  /** Where the excerpt is cut from. Empty on a result whose title is all there is. */
  context: string;
}

/** A name with the spaces taken out — `datagrid` typed, `Data Grid` the page it wants. */
const squeeze = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '');

const lowered = new WeakMap<Document, { title: string; page: string; text: string; context: string; names: string }>();

function lower(document: Document) {
  let fields = lowered.get(document);

  if (!fields) {
    fields = {
      title: document.title.toLowerCase(),
      page: document.page.toLowerCase(),
      text: document.text.toLowerCase(),
      context: document.context.toLowerCase(),
      // The two names only: squeezing a whole page's prose would match across every word boundary in it.
      names: `${squeeze(document.title)} ${squeeze(document.page)}`,
    };
    lowered.set(document, fields);
  }

  return fields;
}

/** What one term is worth against a document, or 0 where it is not in it at all. */
function scoreTerm(document: Document, fields: ReturnType<typeof lower>, term: string): number {
  const title = scoreField(document.title, fields.title, term);
  const page = scoreField(document.page, fields.page, term);
  const text = scoreField(document.text, fields.text, term);
  const best = Math.max(title * TITLE_WEIGHT, page * PAGE_WEIGHT, text * TEXT_WEIGHT);

  // A name with its spaces removed is worth a word start, which is what it is.
  return best === 0 && fields.names.includes(term) ? 2 * TITLE_WEIGHT : best;
}

function score(document: Document, terms: readonly string[], all: boolean): number {
  const fields = lower(document);
  let total = KIND_BONUS[document.kind];
  let matched = 0;

  for (const term of terms) {
    const best = scoreTerm(document, fields, term);

    // Every term has to land somewhere, or the result is about something else — until nothing at all
    // does, where a result matching one of the words beats telling a reader there is nothing here.
    if (best === 0 && all) return 0;
    if (best > 0) matched++;

    total += best;
  }

  if (matched === 0) return 0;

  const exact = fields.title === terms[0] || squeeze(document.title) === terms[0];

  if (terms.length === 1 && exact && document.kind !== 'section') total += EXACT_TITLE_BONUS;

  return total;
}

/** The window of text a result shows: around the first term that matched, on word boundaries. */
function excerptOf(document: Document, terms: readonly string[]): { excerpt: string; ranges: (readonly [number, number])[] } {
  const context = document.context;
  const fields = lower(document);
  const hits = terms.map((term) => fields.context.indexOf(term)).filter((at) => at !== -1);
  const first = hits.length > 0 ? Math.min(...hits) : 0;

  let start = Math.max(0, first - EXCERPT_BEFORE);
  let end = Math.min(context.length, start + EXCERPT_LENGTH);

  // Whole words at both ends, and an ellipsis for what was cut — `…he mix wraps the variable` reads as
  // a bug rather than as an excerpt.
  if (start > 0) {
    const space = context.indexOf(' ', start);
    start = space === -1 || space > first ? start : space + 1;
  }
  if (end < context.length) {
    const space = context.lastIndexOf(' ', end);
    end = space > first ? space : end;
  }

  const body = context.slice(start, end);
  const excerpt = `${start > 0 ? '…' : ''}${body}${end < context.length ? '…' : ''}`;
  const ranges: (readonly [number, number])[] = [];
  const lowerExcerpt = excerpt.toLowerCase();

  for (const term of terms) {
    for (let at = lowerExcerpt.indexOf(term); at !== -1; at = lowerExcerpt.indexOf(term, at + 1)) {
      ranges.push([at, at + term.length] as const);
    }
  }

  return { excerpt, ranges: mergeRanges(ranges) };
}

/** Overlapping hits (two terms sharing letters) are one highlight, or the markup nests. */
function mergeRanges(ranges: (readonly [number, number])[]): (readonly [number, number])[] {
  const sorted = [...ranges].sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];

  for (const [start, end] of sorted) {
    const last = merged[merged.length - 1];

    if (last && start <= last[1]) last[1] = Math.max(last[1], end);
    else merged.push([start, end]);
  }

  return merged;
}

const sectionHref = (page: SearchIndexPage, section: SearchSection) => (section.hash ? `${page.path}#${section.hash}` : page.path);

/** Where a prop lands: /box's finder, filtered to it — the page reads `?prop=` and shows that one row. */
export const propHref = (name: string) => `/box?${PROP_QUERY}=${name}#finder`;

function documentsOf(index: SearchIndex): Document[] {
  const documents: Document[] = [];

  for (const page of index.pages) {
    documents.push({ kind: 'page', href: page.path, page: page.name, title: page.name, text: page.description, context: page.description });

    for (const section of page.sections) {
      if (!section.title && !section.text) continue;

      documents.push({
        kind: 'section',
        href: sectionHref(page, section),
        page: page.name,
        title: section.title || page.name,
        text: section.text,
        // No fallback to the title: a Code block's section is a title with no prose, and an excerpt
        // repeating the line above it says nothing.
        context: section.text,
      });
    }
  }

  for (const prop of index.props) documents.push(propDocument(prop));

  return documents;
}

const propDocument = (prop: SearchIndexProp): Document => {
  // The values are searched as well as the description: a reader looking for `space-between` is
  // looking for the prop that takes it, which is how the finder this links to reads a query too.
  const values = prop.values ? ` · ${prop.values}` : '';

  return {
    kind: 'prop',
    href: propHref(prop.name),
    page: 'Box props',
    title: prop.name,
    text: `${prop.css} ${prop.description}${values}`,
    context: `${prop.css} — ${prop.description}${values}`,
  };
};

/** The index, read once into the flat list the scorer walks. Kept per index object, which is fetched once. */
const documentCache = new WeakMap<SearchIndex, Document[]>();

function documents(index: SearchIndex): Document[] {
  let list = documentCache.get(index);

  if (!list) {
    list = documentsOf(index);
    documentCache.set(index, list);
  }

  return list;
}

export interface SearchOptions {
  limit?: number;
  /** Results one page may contribute. The page's own entry counts, so a page never takes the whole list. */
  perPage?: number;
}

/** What somebody typed, as the list the dialog shows: best first, and no page filling it. */
export function searchDocs(index: SearchIndex, query: string, { limit = DEFAULT_LIMIT, perPage = PER_PAGE }: SearchOptions = {}) {
  const terms = queryTerms(query);
  if (terms.length === 0) return [];

  const rank = (all: boolean) => {
    const scored: { document: Document; score: number }[] = [];

    for (const document of documents(index)) {
      const value = score(document, terms, all);

      if (value > 0) scored.push({ document, score: value });
    }

    return scored.sort((a, b) => b.score - a.score);
  };

  // Every word, and only where that finds nothing at all, any of them.
  const scored = rank(true);
  const ranked = scored.length > 0 || terms.length === 1 ? scored : rank(false);

  const results: SearchResult[] = [];
  const taken = new Map<string, number>();

  for (const { document, score: value } of ranked) {
    if (results.length >= limit) break;

    const count = taken.get(document.page) ?? 0;
    if (count >= perPage) continue;
    taken.set(document.page, count + 1);

    const { excerpt, ranges } = excerptOf(document, terms);

    results.push({ kind: document.kind, href: document.href, page: document.page, title: document.title, excerpt, ranges, score: value });
  }

  return results;
}
