import { SITE_NAME, SITE_URL, SiteRoute } from './site';
import { canonicalUrl } from './siteMeta';

/**
 * The markdown mirror of a docs page: the same content an agent would otherwise have to parse out of
 * the HTML, converted from the prerendered markup rather than written a second time (AI2).
 *
 * The conversion reads the DOM the page renders, so nothing here can fall behind the page. Where the
 * markup alone does not say what the markdown should be — a rendered demo, a row of chips, a toolbar
 * — the component says so with a `data-md` hint; the vocabulary is `MarkdownHint`, and
 * `docs/WEBSITE.md` documents where each one is used.
 */

/** The attribute a docs component uses to say what its markup is, when the tags do not. */
export const MARKDOWN_HINT = 'data-md';

/**
 * `skip` — a control or a rendered demo: the snippet beside it is the content, the markup is not.
 * `label` — a line that titles the block under it, emitted bold.
 * `inline` — children that belong on one line: a row of chips, a family of colour swatches.
 */
export type MarkdownHint = 'skip' | 'label' | 'inline';

const HEADINGS: Record<string, string> = { H1: '#', H2: '##', H3: '###', H4: '####', H5: '#####', H6: '######' };

/** Chrome and controls: a landmark that repeats on every page, or an element that only does something. */
const SKIPPED = new Set(['NAV', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'SCRIPT', 'STYLE', 'SVG', 'IMG', 'TEMPLATE']);

/** Tags that always start a block of their own, so an element holding one is walked rather than flattened. */
const BLOCK_SELECTOR = 'h1,h2,h3,h4,h5,h6,pre,table,ul,ol,hr,blockquote';

/** The same tags plus the containers Box renders: a direct child of one of these means recurse. */
const BLOCK_TAGS = new Set([
  'DIV',
  'P',
  'MAIN',
  'SECTION',
  'ARTICLE',
  'ASIDE',
  'HEADER',
  'FOOTER',
  'FIGURE',
  'FIGCAPTION',
  'BLOCKQUOTE',
  'HR',
  'PRE',
  'TABLE',
  'UL',
  'OL',
  'LI',
  ...Object.keys(HEADINGS),
]);

const TEXT_NODE = 3;
const ELEMENT_NODE = 1;

const collapse = (text: string) => text.replace(/\s+/g, ' ');

const hint = (node: Element) => node.getAttribute(MARKDOWN_HINT) as MarkdownHint | null;

const skipped = (node: Element) => SKIPPED.has(node.tagName) || hint(node) === 'skip';

/**
 * An internal link, as the markdown mirror of the page it points at: an agent following a link out of
 * a `.md` file has no reason to be handed HTML. A path that already names a file is left alone.
 */
export function markdownHref(href: string, siteUrl: string = SITE_URL): string {
  if (!href.startsWith('/')) return href;

  const [path, hash] = href.split('#');
  const anchor = hash ? `#${hash}` : '';

  // A file extension starts with a letter: `/releases/1.0.0` is a route whose last segment is `.0`.
  return /\.[a-z][a-z0-9]{1,4}$/i.test(path) ? `${siteUrl}${path}${anchor}` : `${siteUrl}${markdownPath(path)}${anchor}`;
}

/** Where a route's markdown lives: `/box` → `/box.md`, `/` → `/index.md`. */
export function markdownPath(path: string): string {
  return path === '/' ? '/index.md' : `${path.replace(/\/$/, '')}.md`;
}

/** The text of an element and its descendants, with the markdown for the inline markup inside it. */
function inlineMarkdown(node: ChildNode, siteUrl: string): string {
  if (node.nodeType === TEXT_NODE) return collapse(node.textContent ?? '');
  if (node.nodeType !== ELEMENT_NODE) return '';

  const element = node as Element;
  if (skipped(element)) return '';
  if (element.tagName === 'BR') return '\n';

  // A row of chips: laid out with a gap and written with no whitespace between the elements, so the
  // separator has to be put back — `` `display``inline` `` is what concatenating them gives.
  if (hint(element) === 'inline') {
    return Array.from(element.children)
      .map((child) => inlineMarkdown(child, siteUrl).trim())
      .filter(Boolean)
      .join(' · ');
  }

  // A block element inside inline content is still a break in the text: without the spaces, a card
  // wrapped in one link reads `[Box Kite 1.0.0Latest4 September 2026]`.
  const inner = Array.from(element.childNodes)
    .map((child) => {
      const text = inlineMarkdown(child, siteUrl);

      return child.nodeType === ELEMENT_NODE && BLOCK_TAGS.has((child as Element).tagName) ? ` ${text} ` : text;
    })
    .join('');
  const trimmed = collapse(inner).trim();

  if (!trimmed) return '';
  if (element.tagName === 'CODE') return `\`${trimmed}\``;
  if (element.tagName === 'STRONG' || element.tagName === 'B') return `**${trimmed}**`;
  if (element.tagName === 'EM' || element.tagName === 'I') return `_${trimmed}_`;
  if (element.tagName === 'DEL' || element.tagName === 'S') return `~~${trimmed}~~`;
  if (element.tagName === 'A') {
    const href = element.getAttribute('href');

    return href ? `[${trimmed}](${markdownHref(href, siteUrl)})` : trimmed;
  }

  return inner;
}

const inlineText = (node: Element, siteUrl: string) => collapse(inlineMarkdown(node, siteUrl)).trim();

/** A cell's markdown, with the one character a table row cannot carry escaped. */
const cellMarkdown = (cell: Element, siteUrl: string) => inlineText(cell, siteUrl).replace(/\|/g, '\\|');

function tableMarkdown(table: Element, siteUrl: string): string {
  const rows = Array.from(table.querySelectorAll('tr')).map((row) => Array.from(row.children).map((cell) => cellMarkdown(cell, siteUrl)));
  if (rows.length === 0) return '';

  const [head, ...body] = rows;
  const line = (cells: string[]) => `| ${cells.join(' | ')} |`;

  return [line(head), line(head.map(() => '---')), ...body.map(line)].join('\n');
}

function listMarkdown(list: Element, siteUrl: string): string {
  const ordered = list.tagName === 'OL';

  return Array.from(list.children)
    .map((item, index) => {
      const nested = item.querySelector('ul,ol');
      const text = nested ? inlineText(withoutNested(item), siteUrl) : inlineText(item, siteUrl);
      const marker = ordered ? `${index + 1}.` : '-';
      const sublist = nested ? `\n${listMarkdown(nested, siteUrl).replace(/^/gm, '  ')}` : '';

      return `${marker} ${text}${sublist}`;
    })
    .join('\n');
}

/** A list item's own text, without the list nested under it — that becomes the indented block below. */
function withoutNested(item: Element): Element {
  const copy = item.cloneNode(true) as Element;

  for (const list of Array.from(copy.querySelectorAll('ul,ol'))) list.remove();

  return copy;
}

function codeMarkdown(pre: Element): string {
  const language = /language-([\w-]+)/.exec(String(pre.className ?? ''))?.[1] ?? '';
  const code = (pre.textContent ?? '').replace(/\s+$/, '');

  return `\`\`\`${language === 'auto' ? '' : language}\n${code}\n\`\`\``;
}

function walk(node: ChildNode, siteUrl: string, blocks: string[]): void {
  if (node.nodeType === TEXT_NODE) {
    const text = collapse(node.textContent ?? '').trim();
    if (text) blocks.push(text);

    return;
  }
  if (node.nodeType !== ELEMENT_NODE) return;

  const element = node as Element;
  if (skipped(element)) return;

  const heading = HEADINGS[element.tagName];
  if (heading) {
    const text = inlineText(element, siteUrl).replace(/\*\*/g, '');
    if (text) blocks.push(`${heading} ${text}`);

    return;
  }

  if (element.tagName === 'PRE') return void blocks.push(codeMarkdown(element));
  if (element.tagName === 'HR') return void blocks.push('---');
  if (element.tagName === 'TABLE') {
    const table = tableMarkdown(element, siteUrl);
    if (table) blocks.push(table);

    return;
  }
  if (element.tagName === 'UL' || element.tagName === 'OL') {
    const list = listMarkdown(element, siteUrl);
    if (list.trim()) blocks.push(list);

    return;
  }
  if (element.tagName === 'BLOCKQUOTE') {
    const quote = inlineText(element, siteUrl);
    if (quote) blocks.push(quote.replace(/^/gm, '> '));

    return;
  }

  if (hint(element) === 'inline') {
    const text = inlineText(element, siteUrl);
    if (text) blocks.push(text);

    return;
  }

  // A container is walked; anything else is a paragraph, which is what prose in a Box comes out as.
  const children = Array.from(element.childNodes);
  const holdsBlock = children.some(
    (child) =>
      child.nodeType === ELEMENT_NODE && (BLOCK_TAGS.has((child as Element).tagName) || (child as Element).querySelector(BLOCK_SELECTOR)),
  );

  if (holdsBlock) {
    for (const child of children) walk(child, siteUrl, blocks);

    return;
  }

  const text = inlineText(element, siteUrl);
  if (text) blocks.push(hint(element) === 'label' ? `**${text}**` : text);
}

/** The markdown of a rendered page: the blocks its markup produced, in order. */
export function elementMarkdown(element: Element, siteUrl: string = SITE_URL): string {
  const blocks: string[] = [];

  walk(element, siteUrl, blocks);

  return blocks.join('\n\n');
}

export interface PageMarkdownOptions {
  route: SiteRoute;
  /** The converted body, or the markdown a page was written in — a release page has one already. */
  body: string;
  version: string;
  siteUrl?: string;
}

/**
 * One page's file: its own H1, a line saying which address this is a copy of and which version wrote
 * it, then the body. The trailer points at the two files an agent wants next.
 */
export function pageMarkdown({ route, body, version, siteUrl = SITE_URL }: PageMarkdownOptions): string {
  const [first, ...rest] = body.trim().split('\n\n');
  const titled = first.startsWith('# ');
  const heading = titled ? first : `# ${route.name}`;
  const content = (titled ? rest : [first, ...rest]).join('\n\n').trim();

  return [
    heading,
    `_${SITE_NAME} ${version} · a markdown copy of ${canonicalUrl(route.path, siteUrl)}_`,
    content,
    '---',
    `_Every page: ${siteUrl}/llms.txt · every prop, measured: ${siteUrl}/props.md_`,
    '',
  ].join('\n\n');
}
