import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { headings } from '../utils/markdownUtils';
import { FIRST_POST, parsePosts, postBody, postRoutes, POSTS_PATH } from './posts';
import { parseReleases, releaseRoutes } from './releases';
import { SITE_URL, siteRoutes } from './site';

const post = (title: string, meta: string, intro = 'Something is explained here. More words follow.') =>
  `# ${title}\n\n_${meta}_\n\n${intro}\n\n## A section\n\nText.\n`;

describe('parsePosts', () => {
  it('reads the slug from the file name and the date and level from the meta line, newest first', () => {
    const posts = parsePosts({
      '../../posts/older.md': post('Older', '1 September 2026 · Beginner'),
      'newer-one.md': post('Newer', '9 October 2026 · Use case'),
    });

    expect(posts.map((entry) => entry.slug)).toEqual(['newer-one', 'older']);
    expect(posts[0]).toMatchObject({ path: `${POSTS_PATH}/newer-one`, title: 'Newer', date: '9 October 2026', level: 'Use case' });
    expect(posts[0].summary).toBe('Something is explained here.');
  });

  it('counts reading time from the prose, not the code', () => {
    const prose = Array.from({ length: 660 }, () => 'word').join(' ');
    const code = `\`\`\`tsx\n${Array.from({ length: 2000 }, () => 'token').join(' ')}\n\`\`\``;
    const [entry] = parsePosts({ 'a.md': post('A', '1 May 2027 · Beginner', `${prose}.\n\n${code}`) });

    expect(entry.readingTime).toBe(3);
  });

  it('refuses a file the index could not describe', () => {
    expect(() => parsePosts({ 'Bad Name.md': post('A', '1 May 2027 · Beginner') })).toThrow(/file name/);
    expect(() => parsePosts({ 'a.md': post('A', 'May 2027 · Beginner') })).toThrow(/date/);
    expect(() => parsePosts({ 'a.md': post('A', '1 May 2027 · Expert') })).toThrow(/level/);
    expect(() => parsePosts({ 'a.md': '# A\n_1 May 2027 · Beginner_\n\n## Straight to a section\n' })).toThrow(/intro/);
  });
});

describe('postRoutes and postBody', () => {
  it('names the route after the article and describes it with the summary', () => {
    const [route] = postRoutes(parsePosts({ 'a-b.md': post('An article', '1 May 2027 · Beginner') }));

    expect(route).toEqual({ path: '/blog/a-b', name: 'An article', description: 'Something is explained here.' });
  });

  it('drops the H1 and the meta line, which the page header shows', () => {
    expect(postBody(post('A', '1 May 2027 · Beginner'))).toBe('Something is explained here. More words follow.\n\n## A section\n\nText.\n');
  });
});

// The owner's rules for an article, over the files the site really serves: a count goes stale the next PR, a
// relative link breaks on every platform the article is copied to, and the site names no competitor (G11).
describe('posts/', () => {
  const root = process.cwd();
  const read = (dir: string) =>
    Object.fromEntries(
      readdirSync(resolve(root, dir))
        .filter((file) => file.endsWith('.md'))
        .map((file) => [file, readFileSync(resolve(root, dir, file), 'utf8')]),
    );
  const files = read('posts');
  const posts = parsePosts(files);
  const routes = new Set(
    [...siteRoutes, ...releaseRoutes(parseReleases(read('releases'))), ...postRoutes(posts)].map((route) => route.path),
  );
  const propCount: number = JSON.parse(readFileSync(resolve(root, 'api/props.json'), 'utf8')).propCount;
  const mcpReadme = readFileSync(resolve(root, 'mcp/README.md'), 'utf8');

  it('has an article at each level, and the beginner one the homepage links to', () => {
    expect(new Set(posts.map((entry) => entry.level))).toEqual(new Set(['Beginner', 'Use case']));
    expect(posts.find((entry) => entry.path === FIRST_POST)?.level).toBe('Beginner');
  });

  it.each(Object.entries(files))('%s states no exact count of anything the library has', (_, markdown) => {
    const counted =
      /\b\d+\s+(?:typed\s+|css\s+|style\s+)*(?:props?|properties|components|rules|tools|primitives|families|colou?rs|hooks|entries|entry points)\b/i;

    expect(markdown).not.toMatch(counted);
    expect(markdown).not.toMatch(new RegExp(`\\b${propCount}\\b`));
  });

  it.each(Object.entries(files))('%s links to the site absolutely, and only to pages that exist', (_, markdown) => {
    const links = [...markdown.matchAll(/\]\(([^)\s]+)\)/g)].map((match) => match[1]);

    expect(links.filter((href) => href.startsWith('/') || href.startsWith('./'))).toEqual([]);

    for (const href of links.filter((link) => link.startsWith(SITE_URL))) {
      const path = new URL(href).pathname.replace(/\/+$/, '') || '/';

      expect(routes.has(path), `${href} is not a page on the site`).toBe(true);
    }
  });

  it.each(Object.entries(files))('%s names no competing library', (_, markdown) => {
    const prose = markdown.replace(/\]\([^)]*\)/g, ']');

    expect(prose).not.toMatch(
      /\b(tailwind|radix|chakra|mantine|material[ -]ui|mui|styled-components|emotion|stitches|base ui|headless ui|ag grid)\b/i,
    );
  });

  it.each(Object.entries(files))('%s names only MCP tools the server has', (_, markdown) => {
    for (const [, tool] of markdown.matchAll(/`((?:get|check|search)_[a-z]+)`/g)) expect(mcpReadme, tool).toContain(`\`${tool}\``);
  });

  it('keeps every summary whole inside a search result, and every section anchor unique', () => {
    for (const entry of posts) {
      expect(entry.summary.endsWith('…'), `${entry.slug}'s first sentence is over 160 characters`).toBe(false);

      const ids = headings(postBody(entry.markdown)).map((heading) => heading.id);
      expect(new Set(ids).size, entry.slug).toBe(ids.length);
    }
  });
});
