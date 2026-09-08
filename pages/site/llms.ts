import { markdownPath } from './pageMarkdown';
import { RELEASES_PATH } from './releases';
import { SITE_NAME, SITE_URL, SiteRoute } from './site';

/**
 * `llms.txt` and `llms-full.txt`: the map an agent reads before fetching anything, and the whole
 * corpus for the rare case that wants it (AI2).
 *
 * Everything in here is built from something else — the route table's own descriptions, the lead
 * block of `AGENTS.md`, the `@deprecated` tags in the sources — because a hand-written index of a
 * site that changes weekly is a list of dead links, and an agent trusts what it fetches.
 */

export interface Deprecation {
  /** The prop or component that still works. */
  name: string;
  /** What its doc comment says to write instead. */
  instead: string;
}

export interface LlmsInput {
  /** What a reader installs, and the version of it these pages document. */
  packageName: string;
  version: string;
  /** Every route worth fetching, in nav order — the release pages included. */
  routes: readonly SiteRoute[];
  /** The facts a model's priors get wrong, as `AGENTS.md` states them. */
  facts: readonly string[];
  deprecated: readonly Deprecation[];
  siteUrl?: string;
}

const isRelease = (route: SiteRoute) => route.path.startsWith(`${RELEASES_PATH}/`);

const link = (route: SiteRoute, siteUrl: string) => `- [${route.name}](${siteUrl}${markdownPath(route.path)}): ${route.description}`;

/**
 * The index. The shape is llms.txt's — an H1, a blockquote summary, prose, then H2 sections of links
 * — and the block after the summary is Stripe's: what this library's current version does that a
 * model's memory of a library with these prop names does not.
 */
export function buildLlmsTxt({ packageName, version, routes, facts, deprecated, siteUrl = SITE_URL }: LlmsInput): string {
  const pages = routes.filter((route) => !isRelease(route));
  const releases = routes.filter(isRelease);
  const summary = pages[0]?.description ?? '';

  const sections = [
    `# ${SITE_NAME}`,
    `> ${summary}`,
    `${SITE_NAME} is \`${packageName}\` on npm, version ${version}. Every page below is served as markdown at the` +
      ` address given: append \`.md\` to any documentation URL. The files are converted from the pages themselves at` +
      ` build time, so they cannot fall behind what the site shows.`,
    '## Read this before writing any props',
    facts.map((fact) => `- ${fact}`).join('\n'),
    `The whole rule set is in \`AGENTS.md\` inside the package (\`node_modules/${packageName}/AGENTS.md\`), and every` +
      ` prop with the CSS it writes is at ${siteUrl}/props.md.`,
    '## Still working, no longer the spelling to write',
    deprecated.map(({ name, instead }) => `- \`${name}\` — ${instead}`).join('\n'),
    '## Docs',
    pages.map((route) => link(route, siteUrl)).join('\n'),
    '## Reference',
    [
      `- [Every prop](${siteUrl}/props.md): all of them, the CSS each writes, and one example measured from the engine` +
        ` rather than quoted from a doc.`,
      `- [The skill](${siteUrl}/skill.md): the rules, the measured dividers and what to read next, as an Agent Skill —` +
        ` \`npx skills add box-kite/box-kite\` installs it, and this address is the same file.`,
      `- [The Cursor rule](${siteUrl}/box-kite.mdc): the same rules as a \`.mdc\` for \`.cursor/rules/\`.`,
    ].join('\n'),
    '## Optional',
    [
      `- [llms-full.txt](${siteUrl}/llms-full.txt): every page above in one file. Fetch the page you need instead —` +
        ` this is here for a tool that indexes a whole site, not for a prompt.`,
      ...releases.map((route) => link(route, siteUrl)),
    ].join('\n'),
    '',
  ];

  return sections.join('\n\n');
}

export interface LlmsPage {
  path: string;
  markdown: string;
}

/** Every page in one file, each under the address it came from. */
export function buildLlmsFull(pages: readonly LlmsPage[], { version, siteUrl = SITE_URL }: LlmsInput): string {
  const documents = pages.map(({ path, markdown }) => `# ${siteUrl}${markdownPath(path)}\n\n${markdown.trim()}`);

  return [
    `<!-- ${SITE_NAME} ${version} — every documentation page, converted from the site at build time.`,
    `     The index, which is the one to read first, is ${siteUrl}/llms.txt -->`,
    '',
    documents.join('\n\n---\n\n'),
    '',
  ].join('\n');
}
