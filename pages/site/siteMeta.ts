import { SITE_NAME, SITE_URL, SiteRoute, siteRoutes, SocialImage } from './site';

// The table keeps its literal type so that `SiteRoutePath` can be a union of its paths; widen it
// once here, where the optional fields have to be readable.
const routes: readonly SiteRoute[] = siteRoutes;

/** The card a shared link shows unless a page has its own: 1200×630 as every network asks. */
export const SOCIAL_IMAGE: SocialImage = {
  path: '/og.png',
  width: 1200,
  height: 630,
  alt: 'Box Kite — every CSS property is a typed prop',
};

/** What a search result shows of a title and a description before it cuts them off. */
export const TITLE_LIMIT = 60;
export const DESCRIPTION_LIMIT = 160;

/** What a single page tells browsers, crawlers and link previews about itself. */
export interface PageMeta {
  title: string;
  description: string;
  /** Absent on the not-found shell: there is no address it is the canonical copy of. */
  canonical?: string;
  indexable: boolean;
  image: SocialImage;
  /** Every structured-data block the page carries, breadcrumbs first. */
  jsonLd: readonly object[];
}

export interface Crumb {
  name: string;
  path: string;
}

/**
 * The absolute URL of a route. Every path but the home page ends in a slash, because that is what GitHub
 * Pages serves (`<route>/index.html`) and a request without it is answered with a redirect — so the
 * canonical links, the sitemap and the shells all agree on the served form.
 */
export function canonicalUrl(path: string, siteUrl: string = SITE_URL): string {
  return path === '/' ? `${siteUrl}/` : `${siteUrl}${path}/`;
}

/**
 * The `<title>` for a route: its own when it carries one, `<name> — Box Kite` otherwise — unless the name
 * says Box Kite already, or the suffix would push it past what a search result shows.
 */
export function documentTitle(route: SiteRoute): string {
  if (route.title) return route.title;

  const suffixed = `${route.name} — ${SITE_NAME}`;

  return route.name.includes(SITE_NAME) || suffixed.length > TITLE_LIMIT ? route.name : suffixed;
}

/**
 * The trail to a page: home, every ancestor that is a route, then the page. Only a page with a section
 * between it and home has one — `Box Kite › Button` tells a reader nothing the address does not.
 */
export function breadcrumbsFor(path: string, within: readonly SiteRoute[] = routes): Crumb[] {
  const segments = path.split('/').filter(Boolean);
  const ancestors = segments.slice(0, -1).flatMap((_, index) => {
    const route = routeFor(`/${segments.slice(0, index + 1).join('/')}`, within);

    return route ? [{ name: route.name, path: route.path }] : [];
  });
  const page = routeFor(path, within);

  return page && ancestors.length ? [{ name: SITE_NAME, path: '/' }, ...ancestors, { name: page.name, path: page.path }] : [];
}

/** The same trail as structured data, which is what a search result shows in place of the address. */
export function breadcrumbList(crumbs: readonly Crumb[]): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: canonicalUrl(crumb.path),
    })),
  };
}

/**
 * Everything a route publishes about itself, in one shape the head tags can be built from. `within` is
 * where the breadcrumbs look up their ancestors: the app's full list, releases and blocks included.
 */
export function pageMeta(route: SiteRoute, within: readonly SiteRoute[] = routes): PageMeta {
  const crumbs = breadcrumbsFor(route.path, within);

  return {
    title: documentTitle(route),
    description: route.description,
    canonical: canonicalUrl(route.path),
    indexable: route.indexable !== false,
    image: route.image ?? SOCIAL_IMAGE,
    jsonLd: [...(crumbs.length ? [breadcrumbList(crumbs)] : []), ...(route.jsonLd ?? [])],
  };
}

/** What the 404 shell says, and what the app says at an address the router does not serve. */
export const notFoundMeta: PageMeta = {
  title: `Page not found — ${SITE_NAME}`,
  description: `This address is not part of the ${SITE_NAME} documentation.`,
  indexable: false,
  image: SOCIAL_IMAGE,
  jsonLd: [],
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
 * `sitemap.xml` for the whole site. `lastmod` is the newest commit to a route's own sources, never the
 * build's date: a sitemap claiming every page changed on every deploy is worse than one saying nothing.
 */
export function buildSitemap(
  siteUrl: string = SITE_URL,
  within: readonly SiteRoute[] = routes,
  lastModified: (path: string) => string | undefined = () => undefined,
): string {
  const urls = indexableRoutes(within)
    .map((route) => {
      const date = lastModified(route.path);
      const lastmod = date ? `\n    <lastmod>${date}</lastmod>` : '';

      return `  <url>\n    <loc>${canonicalUrl(route.path, siteUrl)}</loc>${lastmod}\n  </url>`;
    })
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

/**
 * The page left at an address that moved. A zero-second refresh is what Google reads as a permanent redirect when
 * the host cannot send one, the canonical link names the new page, and the script keeps the query and the hash.
 */
export function buildRedirectHtml(to: string, siteUrl: string = SITE_URL): string {
  const target = canonicalUrl(to, siteUrl);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Moved — ${SITE_NAME}</title>
    <link rel="canonical" href="${target}" />
    <meta http-equiv="refresh" content="0; url=${target}" />
    <script>location.replace(${JSON.stringify(target)} + location.search + location.hash)</script>
  </head>
  <body>
    <p>This page has moved to <a href="${target}">${target}</a>.</p>
  </body>
</html>
`;
}

/** The markdown left at a moved page's `.md` address, for an agent following an old link. */
export function buildRedirectMarkdown(to: string, siteUrl: string = SITE_URL): string {
  return `# Moved\n\nThis page is now at ${canonicalUrl(to, siteUrl)} — its markdown copy is ${siteUrl}${to}.md\n`;
}

/** The comments in `pages/index.html` between which the metadata block is written. */
export const META_START = '<!--site-metadata-->';
export const META_END = '<!--/site-metadata-->';

/** Marks the structured data the site writes, so a navigation replaces it and leaves anything else alone. */
export const JSON_LD_ATTRIBUTE = 'data-site-jsonld';

const escapeText = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escapeAttribute = (value: string) => escapeText(value).replace(/"/g, '&quot;');

/** JSON for a `<script>` element, with every `<` escaped so no string inside it can close the element. */
export const jsonLdText = (data: object) => JSON.stringify(data).replace(/</g, '\\u003c');

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
    `<meta property="og:image" content="${SITE_URL}${meta.image.path}" />`,
    `<meta property="og:image:width" content="${meta.image.width}" />`,
    `<meta property="og:image:height" content="${meta.image.height}" />`,
    `<meta property="og:image:alt" content="${escapeAttribute(meta.image.alt)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:image" content="${SITE_URL}${meta.image.path}" />`,
    ...(meta.indexable ? [] : [`<meta name="robots" content="noindex, follow" />`]),
    ...meta.jsonLd.map((data) => `<script type="application/ld+json" ${JSON_LD_ATTRIBUTE}>${jsonLdText(data)}</script>`),
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
