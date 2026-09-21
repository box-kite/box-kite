import { MARKDOWN_HINT, isBlock, isChrome } from './pageMarkdown';
import { SiteRoute } from './site';

/**
 * The docs search index: every page cut into the blocks a result can point at, plus one entry per prop
 * (G5). Built from the prerendered markup rather than written a second time — the same rule the
 * markdown mirror follows, and for the same reason: an index that can fall behind the page sends
 * readers to text that is not there.
 *
 * Two things it deliberately leaves out. **Code blocks**, because a snippet is the answer a page gives
 * rather than the question a reader types, and the props they are written with are indexed as props
 * anyway. And **the body of a release note** — 204 KB of the 573 KB of prose — whose headings are kept:
 * the page documenting a feature is a better answer than the note announcing it.
 */

/** Where the built index is served, in the dev server and in `dist-pages/` alike. */
export const SEARCH_INDEX_PATH = '/search-index.json';

/** What a release page keeps: its headings, and the first line under each. */
export const RELEASE_TEXT_LIMIT = 200;

/** As much of a prop's description as a result line can show. */
const PROP_DESCRIPTION_LIMIT = 160;

/** One block of a page: what titles it, where it is, and the text under it. */
export interface SearchSection {
  /** The heading or labelled block above the text. Empty for the lead, which sits above the first one. */
  title: string;
  /** The `id` a result scrolls to — the nearest one around the heading. Absent on a page carrying none. */
  hash?: string;
  text: string;
}

export interface SearchIndexPage {
  path: string;
  /** The route's own name, which is what the results group under. */
  name: string;
  description: string;
  sections: SearchSection[];
}

/** A prop, out of the generated reference — the half of the index that is not a page. */
export interface SearchIndexProp {
  name: string;
  description: string;
  /** The declaration the engine wrote for it, measured when the reference was generated. */
  css: string;
  /** The values it names, so a reader searching `space-between` finds the prop that takes it. */
  values?: string;
}

export interface SearchIndex {
  /** The version these pages document. The dialog says it, so a cached index cannot lie about its age. */
  version: string;
  pages: SearchIndexPage[];
  props: SearchIndexProp[];
}

export interface SectionOptions {
  /** Characters of text kept per section. A release page passes `RELEASE_TEXT_LIMIT`; a docs page keeps it all. */
  maxText?: number;
}

const TEXT_NODE = 3;
const ELEMENT_NODE = 1;

const HEADINGS = new Set(['H1', 'H2', 'H3', 'H4', 'H5', 'H6']);

/**
 * A code block is skipped whole: the snippet is the page's answer, not the words a reader types. `<code>`
 * on its own is not in here — inline code in a sentence is where half the prop names in the prose are.
 */
const SKIPPED_TAGS = new Set(['PRE']);

/**
 * The parts of a table, which the markdown mirror handles in a converter of its own and so never needed
 * in its own block list. Without them a row of cells reads `}}startingStyleWhat a just-mounted element…`.
 */
const TABLE_PARTS = new Set(['TR', 'TD', 'TH', 'DT', 'DD']);

const endsLine = (element: Element) => isBlock(element) || TABLE_PARTS.has(element.tagName);

const collapse = (text: string) => text.replace(/\s+/g, ' ').trim();

/** The same, without the trim: a text node's own spaces are what keep two words apart. */
const squash = (text: string) => text.replace(/\s+/g, ' ');

/** Where a result scrolls to: the nearest `id` around the heading, which is what the docs pages carry. */
function anchorOf(element: Element, root: Element): string | undefined {
  for (let node: Element | null = element; node && node !== root; node = node.parentElement) {
    if (node.id) return node.id;
  }

  return undefined;
}

/** A heading, or a `data-md="label"` line — which is what titles a block on a component page. */
function isTitle(element: Element): boolean {
  return HEADINGS.has(element.tagName) || element.getAttribute(MARKDOWN_HINT) === 'label';
}

/**
 * The text of an element, with a space where a block ended. `textContent` alone runs the two lines of the
 * home page's `<h1>` together into "…already knows.Every CSS property…" — the markdown mirror puts the
 * same space in, for the same reason.
 */
function textOf(node: ChildNode): string {
  if (node.nodeType === TEXT_NODE) return squash(node.textContent ?? '');
  if (node.nodeType !== ELEMENT_NODE) return '';

  const element = node as Element;
  if (isChrome(element)) return '';

  const inner = Array.from(element.childNodes).map(textOf).join('');

  return endsLine(element) ? ` ${inner} ` : inner;
}

class Sections {
  readonly done: SearchSection[] = [];
  private title = '';
  private hash: string | undefined;
  private parts: string[] = [];

  constructor(private readonly maxText: number) {}

  /** Starts the block under a heading, keeping whatever text stood above it. */
  open(title: string, hash: string | undefined): void {
    this.flush();
    this.title = title;
    this.hash = hash;
  }

  add(text: string): void {
    // The cap is a stop rather than a truncation of the final string: a release page has sections long
    // enough that building them whole and cutting afterwards is most of the work for none of the bytes.
    if (this.length() < this.maxText) this.parts.push(text);
  }

  flush(): void {
    const text = collapse(this.parts.join('')).slice(0, this.maxText);

    if (this.title || text) this.done.push({ title: this.title, ...(this.hash ? { hash: this.hash } : {}), text });

    this.parts = [];
  }

  private length(): number {
    return this.parts.reduce((total, part) => total + part.length, 0);
  }
}

function walk(node: ChildNode, root: Element, sections: Sections): void {
  if (node.nodeType === TEXT_NODE) return void sections.add(squash(node.textContent ?? ''));
  if (node.nodeType !== ELEMENT_NODE) return;

  const element = node as Element;
  if (isChrome(element) || SKIPPED_TAGS.has(element.tagName)) return;

  if (isTitle(element)) return void sections.open(collapse(textOf(element)), anchorOf(element, root));

  const block = endsLine(element);

  // A block is a break in the text, so two paragraphs are two sentences rather than one long word.
  if (block) sections.add(' ');
  for (const child of Array.from(element.childNodes)) walk(child, root, sections);
  if (block) sections.add(' ');
}

/**
 * One page's blocks, read off the rendered `<main>`. The walk is the markdown mirror's — it skips the
 * same chrome, by the same `data-md` vocabulary — so a demo that is not content in one is not content
 * in the other.
 */
export function pageSections(root: Element, { maxText = Infinity }: SectionOptions = {}): SearchSection[] {
  const sections = new Sections(maxText);

  for (const child of Array.from(root.childNodes)) walk(child, root, sections);
  sections.flush();

  return sections.done.filter((section) => section.title || section.text);
}

/** A prop's description, cut at the sentence that runs past what a result line can show. */
export function propSummary(description: string): string {
  // The descriptions are JSDoc, so they carry the markdown a doc comment is written in.
  const text = collapse(description).replace(/[`*_]/g, '');
  if (text.length <= PROP_DESCRIPTION_LIMIT) return text;

  const stop = text.lastIndexOf('. ', PROP_DESCRIPTION_LIMIT);

  return stop > PROP_DESCRIPTION_LIMIT / 2 ? text.slice(0, stop + 1) : `${text.slice(0, PROP_DESCRIPTION_LIMIT).trimEnd()}…`;
}

export interface SearchIndexInput {
  version: string;
  pages: readonly { route: SiteRoute; sections: SearchSection[] }[];
  /** `api/props.json`'s entries, as much of each as a result needs. */
  props: readonly { name: string; description: string; example: { css: string }; values?: readonly (string | number | boolean)[] }[];
}

/** The file the browser fetches: every page's blocks, and every prop. */
export function buildSearchIndex({ version, pages, props }: SearchIndexInput): SearchIndex {
  return {
    version,
    pages: pages.map(({ route, sections }) => ({
      path: route.path,
      name: route.name,
      description: route.description,
      sections,
    })),
    props: props.map((prop) => ({
      name: prop.name,
      description: propSummary(prop.description),
      css: prop.example.css,
      // The generated reference holds these up to forty of them, and prints a count past that.
      ...(prop.values?.length ? { values: prop.values.join(', ') } : {}),
    })),
  };
}
