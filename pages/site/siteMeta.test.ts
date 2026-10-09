import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';
import { SECTIONS } from './sections';
import { SITE_URL, siteRoutes } from './site';
import {
  buildHeadHtml,
  buildRobotsTxt,
  buildSitemap,
  canonicalUrl,
  documentTitle,
  indexableRoutes,
  META_END,
  META_START,
  notFoundMeta,
  pageMeta,
  routeFor,
  SOCIAL_IMAGE,
  withHeadHtml,
} from './siteMeta';

describe('the route table', () => {
  it('gives every route a unique absolute path', () => {
    const paths = siteRoutes.map((route) => route.path);

    expect(new Set(paths).size).toBe(paths.length);
    expect(paths.every((path) => path.startsWith('/'))).toBe(true);
  });

  it('keeps every description inside what a search result shows', () => {
    const tooLong = siteRoutes.filter((route) => route.description.length > 160);

    expect(tooLong.map((route) => route.path)).toEqual([]);
  });

  // The sidebar is written by hand and the route table drives the prerender, so the two can disagree:
  // C5 added /gradients-shadows, which prerendered and was reachable by URL but had no menu entry at
  // all (bug #112). A route that opts out with `indexable: false` is the one exception.
  it('gives every listed route a link in the sidebar or the section bar', () => {
    const sidebar = readFileSync(resolve(process.cwd(), 'pages/app/sidebar.tsx'), 'utf8');
    const linked = new Set([...[...sidebar.matchAll(/to="([^"]+)"/g)].map((match) => match[1]), ...SECTIONS.map((section) => section.to)]);
    const missing = indexableRoutes()
      .map((route) => route.path)
      .filter((path) => !linked.has(path));

    expect(missing).toEqual([]);
  });
});

describe('canonicalUrl', () => {
  it('ends every address in the slash GitHub Pages serves', () => {
    expect(canonicalUrl('/')).toBe(`${SITE_URL}/`);
    expect(canonicalUrl('/dropdown')).toBe(`${SITE_URL}/dropdown/`);
  });
});

describe('documentTitle', () => {
  it('suffixes the site name, unless the route brings its own title', () => {
    expect(documentTitle({ path: '/dropdown', name: 'Dropdown', description: '' })).toBe('Dropdown — Box Kite');
    expect(documentTitle({ path: '/', name: 'Introduction', title: 'Box Kite', description: '' })).toBe('Box Kite');
  });
});

describe('routeFor', () => {
  it('finds a route by pathname, trailing slash or not', () => {
    expect(routeFor('/dropdown')?.name).toBe('Dropdown');
    expect(routeFor('/dropdown/')?.name).toBe('Dropdown');
    expect(routeFor('/')?.path).toBe('/');
  });

  it('returns nothing for an address the site does not serve', () => {
    expect(routeFor('/nope')).toBeUndefined();
  });
});

describe('buildSitemap', () => {
  it('lists every indexable route as an absolute URL', () => {
    const sitemap = buildSitemap();

    for (const route of indexableRoutes()) {
      expect(sitemap).toContain(`<loc>${canonicalUrl(route.path)}</loc>`);
    }

    expect(sitemap.match(/<loc>/g)).toHaveLength(indexableRoutes().length);
    expect(sitemap.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
  });

  it('lists every route while none of them opts out', () => {
    expect(indexableRoutes().length).toBe(siteRoutes.length);
  });

  // The filter itself, which no route exercises now that the FIDO demo is gone. It is still reached
  // by the not-found shell, and it is what an unlisted demo would rely on.
  it('would leave a route out as soon as one declared itself unlisted', () => {
    expect(pageMeta({ ...siteRoutes[0], indexable: false }).indexable).toBe(false);
    expect(pageMeta(siteRoutes[0]).indexable).toBe(true);
  });

  it('follows the site address, so the domain cutover is one constant', () => {
    expect(buildSitemap('https://www.box-kite.dev')).toContain('<loc>https://www.box-kite.dev/dropdown/</loc>');
  });
});

describe('buildRobotsTxt', () => {
  it('points at the sitemap and allows the assistants by name', () => {
    const robots = buildRobotsTxt();

    expect(robots).toContain(`Sitemap: ${SITE_URL}/sitemap.xml`);
    expect(robots).toContain('User-agent: *\nAllow: /');
    expect(robots).toContain('User-agent: ClaudeBot\nAllow: /');
    expect(robots).toContain('User-agent: GPTBot\nAllow: /');
  });

  it('blocks nothing, so a noindex is always reachable to be read', () => {
    expect(buildRobotsTxt()).not.toContain('Disallow');
  });
});

describe('buildHeadHtml', () => {
  it('writes the title, description, canonical and Open Graph tags a crawler reads without scripts', () => {
    const head = buildHeadHtml(pageMeta(siteRoutes[0]));

    expect(head).toContain(`<title>${documentTitle(siteRoutes[0])}</title>`);
    expect(head).toContain(`<link rel="canonical" href="${SITE_URL}/" />`);
    expect(head).toContain(`<meta property="og:url" content="${SITE_URL}/" />`);
    expect(head).not.toContain('robots');
  });

  it('gives every shared link a large card, and points it at an image that ships with the site', () => {
    const head = buildHeadHtml(pageMeta(siteRoutes[0]));

    expect(head).toContain(`<meta property="og:image" content="${SITE_URL}/og.png" />`);
    expect(head).toContain('<meta name="twitter:card" content="summary_large_image" />');
    expect(existsSync(resolve(process.cwd(), 'pages/public', SOCIAL_IMAGE.path.slice(1)))).toBe(true);
  });

  it('marks an unlisted route noindex, and leaves the not-found shell without a canonical', () => {
    const unlisted = pageMeta({ ...siteRoutes[0], path: '/unlisted-demo', indexable: false });

    expect(buildHeadHtml(unlisted)).toContain('<meta name="robots" content="noindex, follow" />');

    const notFound = buildHeadHtml(notFoundMeta);

    expect(notFound).toContain('<meta name="robots" content="noindex, follow" />');
    expect(notFound).not.toContain('canonical');
    expect(notFound).not.toContain('og:url');
  });

  it('escapes text that would otherwise close an attribute or a tag', () => {
    const head = buildHeadHtml({ title: 'a "quoted" <title>', description: 'ampersands & angles <>', indexable: true });

    expect(head).toContain('<title>a "quoted" &lt;title&gt;</title>');
    expect(head).toContain('content="ampersands &amp; angles &lt;&gt;"');
  });
});

describe('withHeadHtml', () => {
  const shell = `<head>\n    ${META_START}\n    ${META_END}\n  </head>`;

  it('replaces whatever sits between the markers, so a shell can be rewritten per route', () => {
    const once = withHeadHtml(shell, pageMeta(siteRoutes[0]));
    const twice = withHeadHtml(once, pageMeta(routeFor('/colors')!));

    expect(twice).toContain('<title>Colors — Box Kite</title>');
    expect(twice).not.toContain(documentTitle(siteRoutes[0]));
    expect(twice.match(/<title>/g)).toHaveLength(1);
  });

  it('refuses to guess when index.html has lost its markers', () => {
    expect(() => withHeadHtml('<head></head>', notFoundMeta)).toThrow(/markers/);
  });
});
