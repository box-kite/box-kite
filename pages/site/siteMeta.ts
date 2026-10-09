import { SITE_NAME, SITE_URL, SiteRoute, siteRoutes } from './site';

// The table keeps its literal type so that `SiteRoutePath` can be a union of its paths; widen it
// once here, where the optional fields have to be readable.
const routes: readonly SiteRoute[] = siteRoutes;

/** What a single page tells browsers, crawlers and link previews about itself. */
export interface PageMeta {
  title: string;
  description: string;
  /** Absent on the not-found shell: there is no address it is the canonical copy of. */
  canonical?: string;
  indexable: boolean;
}

/**
 * The absolute URL of a route. Every path but the home page ends in a slash, because that is what GitHub
 * Pages serves (`<route>/index.html`) and a request without it is answered with a redirect — so the
 * canonical links, the sitemap and the shells all agree on the served form.
 */
export function canonicalUrl(path: string, siteUrl: string = SITE_URL): string {
  return path === '/' ? `${siteUrl}/` : `${siteUrl}${path}/`;
}

/** The `<title>` for a route: its own when it carries one, `<name> — Box Kite` otherwise. */
export function documentTitle(route: SiteRoute): string {
  return route.title ?? `${route.name} — ${SITE_NAME}`;
}

/** Everything a route publishes about itself, in one shape the head tags can be built from. */
export function pageMeta(route: SiteRoute): PageMeta {
  return {
    title: documentTitle(route),
    description: route.description,
    canonical: canonicalUrl(route.path),
    indexable: route.indexable !== false,
  };
}

/** What the 404 shell says, and what the app says at an address the router does not serve. */
export const notFoundMeta: PageMeta = {
  title: `Page not found — ${SITE_NAME}`,
  description: `This address is not part of the ${SITE_NAME} documentation.`,
  indexable: false,
};

/**
 * The route serving a pathname, or `undefined` for anything the router does not know. The table is the
 * default; the app passes its full list, which adds one route per file in `releases/`.
 */
export function routeFor(pathname: string, within: readonly SiteRoute[] = routes): SiteRoute | undefined {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;

  return within.find((route) => route.path === path);
}

/** The routes search engines are meant to list — everything but the unlisted demos. */
export function indexableRoutes(within: readonly SiteRoute[] = routes): readonly SiteRoute[] {
  return within.filter((route) => route.indexable !== false);
}

/**
 * `sitemap.xml` for the whole site. No `<lastmod>`: the only date the build knows is its own, and a
 * sitemap that claims every page changed on every deploy is worse than one that says nothing.
 */
export function buildSitemap(siteUrl: string = SITE_URL, within: readonly SiteRoute[] = routes): string {
  const urls = indexableRoutes(within)
    .map((route) => `  <url>\n    <loc>${canonicalUrl(route.path, siteUrl)}</loc>\n  </url>`)
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

/**
 * The AI crawlers named explicitly in `robots.txt`. `User-agent: *` already allows them; naming them says
 * the allowance is deliberate.
 */
const AI_CRAWLERS = ['ClaudeBot', 'Claude-User', 'Claude-SearchBot', 'GPTBot', 'OAI-SearchBot', 'PerplexityBot', 'Google-Extended'];

/**
 * `robots.txt`. The unlisted demo is deliberately not disallowed: a crawler that may not fetch a page
 * never sees its `noindex`, and can still index the URL from a link elsewhere.
 */
export function buildRobotsTxt(siteUrl: string = SITE_URL): string {
  const agents = ['*', ...AI_CRAWLERS].map((agent) => `User-agent: ${agent}\nAllow: /\n`).join('\n');

  return `${agents}\nSitemap: ${siteUrl}/sitemap.xml\n`;
}

/** The comments in `pages/index.html` between which the metadata block is written. */
export const META_START = '<!--site-metadata-->';
export const META_END = '<!--/site-metadata-->';

/** The card a shared link shows: one image for the whole site, 1200×630 as every network asks. */
export const SOCIAL_IMAGE = { path: '/og.png', width: 1200, height: 630, alt: 'Box Kite — every CSS property is a typed prop' };

const escapeText = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escapeAttribute = (value: string) => escapeText(value).replace(/"/g, '&quot;');

/**
 * The head a page carries before a single line of JavaScript runs — which is all a crawler that
 * executes none of it ever sees. `DocumentHead` keeps the same tags in step while the app runs.
 */
export function buildHeadHtml(meta: PageMeta): string {
  const tags = [
    `<title>${escapeText(meta.title)}</title>`,
    `<meta name="description" content="${escapeAttribute(meta.description)}" />`,
    ...(meta.canonical ? [`<link rel="canonical" href="${meta.canonical}" />`] : []),
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${escapeAttribute(SITE_NAME)}" />`,
    `<meta property="og:title" content="${escapeAttribute(meta.title)}" />`,
    `<meta property="og:description" content="${escapeAttribute(meta.description)}" />`,
    ...(meta.canonical ? [`<meta property="og:url" content="${meta.canonical}" />`] : []),
    `<meta property="og:image" content="${SITE_URL}${SOCIAL_IMAGE.path}" />`,
    `<meta property="og:image:width" content="${SOCIAL_IMAGE.width}" />`,
    `<meta property="og:image:height" content="${SOCIAL_IMAGE.height}" />`,
    `<meta property="og:image:alt" content="${escapeAttribute(SOCIAL_IMAGE.alt)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:image" content="${SITE_URL}${SOCIAL_IMAGE.path}" />`,
    ...(meta.indexable ? [] : [`<meta name="robots" content="noindex, follow" />`]),
  ];

  return tags.map((tag) => `    ${tag}`).join('\n');
}

/**
 * The same HTML with one page's metadata between the markers — used once on `index.html` during
 * the build, then again on the copy written for each route.
 */
export function withHeadHtml(html: string, meta: PageMeta): string {
  const start = html.indexOf(META_START);
  const end = html.indexOf(META_END);

  if (start < 0 || end < 0 || end < start) {
    throw new Error(`pages/index.html must keep its ${META_START} … ${META_END} markers: the page metadata is written between them.`);
  }

  return `${html.slice(0, start + META_START.length)}\n${buildHeadHtml(meta)}\n    ${html.slice(end)}`;
}
