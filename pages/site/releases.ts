import { asDescription, documentHeader } from '../utils/markdownUtils';
import { SITE_NAME, SiteRoute } from './site';

/** The index of every release, and the prefix of each release's own page. */
export const RELEASES_PATH = '/releases';

export interface Release {
  version: string;
  /** The page serving the notes: `/releases/1.0.0`. */
  path: string;
  /** The date the way the notes print it: `4 September 2026`. */
  date: string;
  /** The intro's first sentence with the emphasis markers taken off — the meta description, and the index line. */
  summary: string;
  markdown: string;
}

const VERSION_FILE = /(\d+\.\d+\.\d+)\.md$/;

/**
 * `releases/<version>.md` → a release, newest first. Keyed by file path the way `import.meta.glob` and
 * `readdirSync` both produce, so the app and the Vite config read the same folder the same way. The
 * draft, `next.md`, names no version and is not one.
 */
export function parseReleases(files: Record<string, string>): Release[] {
  return Object.entries(files)
    .flatMap(([file, markdown]) => {
      const version = file.match(VERSION_FILE)?.[1];
      if (!version) return [];

      return [{ version, path: `${RELEASES_PATH}/${version}`, ...describe(markdown, version), markdown }];
    })
    .sort((a, b) => compareVersions(b.version, a.version));
}

/** One route per release. The title is its own, so the `<name> — Box Kite` form is never used for it. */
export function releaseRoutes(releases: readonly Release[]): SiteRoute[] {
  return releases.map(({ version, path, summary }) => ({
    path,
    name: `${SITE_NAME} ${version}`,
    title: `${SITE_NAME} ${version} release notes`,
    description: summary,
  }));
}

/** The notes without their H1: the page header already shows the version. */
export function withoutTitle(markdown: string): string {
  return markdown.replace(/^# [^\n]*\n+/, '');
}

// The header the release script writes: an H1, an italic meta line whose first cell is the date, the intro.
function describe(markdown: string, version: string): { date: string; summary: string } {
  const { meta, sentence } = documentHeader(markdown);

  return { date: meta[0] ?? '', summary: asDescription(sentence || `What changed in ${SITE_NAME} ${version}.`) };
}

function compareVersions(a: string, b: string): number {
  const [x, y] = [a, b].map((version) => version.split('.').map(Number));

  return x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
}
