import { DESCRIPTION_LIMIT, TITLE_LIMIT } from './siteMeta';

/**
 * What every prerendered page is checked for (G14): the half of SEO and accessibility a build can see.
 * Run by `scripts/prerender-pages.mjs` over each page's own markup, so a page that breaks a rule fails
 * the build rather than a search result.
 */

/** A live demo inside a docs page is a document of its own: its headings are the ones it will have where it is installed. */
export const PREVIEW_SELECTOR = '[data-preview]';

export interface PageAudit {
  problems: string[];
  /** Every site-relative link, as a path with no hash, query or trailing slash — resolved once every file is written. */
  links: string[];
}

const outsidePreview = (element: Element) => !element.closest(PREVIEW_SELECTOR);

/** The page's own checks. `root` is the rendered page; the title and description are the ones its head carries. */
export function auditPage(root: ParentNode, head: { title: string; description: string }): PageAudit {
  const problems: string[] = [];
  const headings = [...root.querySelectorAll('h1, h2, h3, h4, h5, h6')].filter(outsidePreview);
  const h1s = headings.filter((heading) => heading.tagName === 'H1');

  if (h1s.length !== 1) problems.push(`${h1s.length} <h1> elements, expected exactly one`);

  headings.reduce((previous, heading) => {
    const level = Number(heading.tagName[1]);
    if (level > previous + 1) problems.push(`<h${level}> "${text(heading)}" follows an <h${previous}>, skipping a level`);

    return level;
  }, 1);

  if (head.title.length > TITLE_LIMIT) problems.push(`the title is ${head.title.length} characters, over ${TITLE_LIMIT}: "${head.title}"`);
  if (head.description.length > DESCRIPTION_LIMIT) {
    problems.push(`the description is ${head.description.length} characters, over ${DESCRIPTION_LIMIT}`);
  }

  // An empty `alt` is a statement that the image is decoration; a missing one says nothing at all.
  for (const image of root.querySelectorAll('img:not([alt])')) problems.push(`an <img> with no alt: ${image.getAttribute('src')}`);

  for (const image of root.querySelectorAll('[role="img"]')) {
    const named = image.getAttribute('aria-label')?.trim() || image.getAttribute('aria-labelledby')?.trim();
    if (!named) problems.push(`a role="img" with no name: <${image.tagName.toLowerCase()} class="${image.getAttribute('class') ?? ''}">`);
  }

  const links = [...root.querySelectorAll('a[href^="/"]:not([href^="//"])')].map((link) => sitePath(link.getAttribute('href')!));

  return { problems, links: [...new Set(links)] };
}

/** `/box/#props` → `/box`, the form the route table and the file system both answer to. */
export function sitePath(href: string): string {
  const path = href.split(/[?#]/)[0];

  return path.length > 1 ? path.replace(/\/+$/, '') : path;
}

const text = (element: Element) => (element.textContent ?? '').trim().slice(0, 60);
