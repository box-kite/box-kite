import { parsePosts, postRoutes } from './posts';
import { parseReleases, releaseRoutes } from './releases';
import { SiteRoute, siteRoutes } from './site';

// Read at build time: one file per version, the draft excluded by its name. The Vite config reads the
// same folder with `fs`, because a config runs in Node where this glob does not exist.
const files = import.meta.glob<string>('../../releases/*.md', { query: '?raw', import: 'default', eager: true });
const postFiles = import.meta.glob<string>('../../posts/*.md', { query: '?raw', import: 'default', eager: true });

/** Every release, newest first. */
export const releases = parseReleases(files);

/** Every article, newest first. */
export const posts = parsePosts(postFiles);

/** Every route the app serves: the table, then one page per release, then one per article. */
export const routes: readonly SiteRoute[] = [...siteRoutes, ...releaseRoutes(releases), ...postRoutes(posts)];
