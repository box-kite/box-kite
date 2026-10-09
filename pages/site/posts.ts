import { asDescription, documentHeader } from '../utils/markdownUtils';
import { SiteRoute } from './site';

/** The index of every article, and the prefix of each article's own page. */
export const POSTS_PATH = '/blog';

/** The beginner article the homepage sends a newcomer to. */
export const FIRST_POST = `${POSTS_PATH}/start-building-with-box-kite`;

/** Who an article is for: someone starting out, or someone with a problem to solve. */
export const POST_LEVELS = ['Beginner', 'Use case'] as const;

export type PostLevel = (typeof POST_LEVELS)[number];

export interface Post {
  /** The file name without `.md`, and the last segment of the address. */
  slug: string;
  /** The page serving the article: `/blog/dark-mode-without-the-flash`. */
  path: string;
  title: string;
  /** The date the way the article prints it: `9 October 2026`. */
  date: string;
  level: PostLevel;
  /** Minutes, counted from the words rather than written by hand, so an edit cannot leave it stale. */
  readingTime: number;
  /** The intro's first sentence — the meta description, and the index line. */
  summary: string;
  markdown: string;
}

const SLUG_FILE = /(?:^|\/)([a-z0-9]+(?:-[a-z0-9]+)*)\.md$/;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WORDS_PER_MINUTE = 220;

/**
 * `posts/<slug>.md` → an article, newest first. Keyed by file path the way `import.meta.glob` and
 * `readdirSync` both produce, like `parseReleases`. A file without a date and a level is an error rather
 * than a page with holes in it: the header is what the index and the meta tags are built from.
 */
export function parsePosts(files: Record<string, string>): Post[] {
  return Object.entries(files)
    .map(([file, markdown]) => {
      const slug = file.match(SLUG_FILE)?.[1];
      if (!slug) throw new Error(`${file}: a post's file name is its address, so it has to be lowercase words joined by hyphens.`);

      const { title, meta, sentence } = documentHeader(markdown);
      const [date = '', level] = meta;

      if (!title) throw new Error(`${file}: a post opens with its title as an H1.`);
      if (Number.isNaN(timeOf(date))) throw new Error(`${file}: the meta line has to start with a date like _9 October 2026 · Beginner_.`);
      if (!isLevel(level)) throw new Error(`${file}: the meta line's second cell is the level, one of ${POST_LEVELS.join(', ')}.`);
      if (!sentence)
        throw new Error(`${file}: a post needs an intro paragraph under the meta line — its first sentence is the description.`);

      return {
        slug,
        path: `${POSTS_PATH}/${slug}`,
        title,
        date,
        level,
        readingTime: readingTime(markdown),
        summary: asDescription(sentence),
        markdown,
      };
    })
    .sort((a, b) => timeOf(b.date) - timeOf(a.date) || a.slug.localeCompare(b.slug));
}

/** One route per article, named by its own title. */
export function postRoutes(posts: readonly Post[]): SiteRoute[] {
  return posts.map(({ path, title, summary }) => ({ path, name: title, description: summary }));
}

/** The article without its H1 and meta line: the page header shows both. */
export function postBody(markdown: string): string {
  return markdown.replace(/^# [^\n]*\n+(_[^\n]*_\s*\n+)?/, '');
}

function isLevel(value: string | undefined): value is PostLevel {
  return (POST_LEVELS as readonly string[]).includes(value ?? '');
}

function timeOf(date: string): number {
  const [day, month, year] = date.split(' ');
  const index = MONTHS.indexOf(month);

  return /^\d{1,2}$/.test(day ?? '') && index >= 0 && /^\d{4}$/.test(year ?? '') ? Date.UTC(Number(year), index, Number(day)) : NaN;
}

// Prose words only: a code block is read at a different speed, and counting it would make a tutorial look longer than it is.
function readingTime(markdown: string): number {
  const prose = markdown.replace(/```[\s\S]*?```/g, '');

  return Math.max(1, Math.round(prose.split(/\s+/).filter(Boolean).length / WORDS_PER_MINUTE));
}
