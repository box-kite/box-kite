// The agent-facing files this repository *commits*, as opposed to the ones the tarball is given
// (agent-docs.mjs): the skill roughly forty-five coding agents install with one command, the Cursor
// rules file beside it, and the marketplace entry Claude Code installs the plugin from. Generated for
// the same reason as the tarball's half — an agent trusts a file it finds over its own priors, so
// every fact in one comes from the place that fact is defined: the rules file, `api/props.json`,
// `AGENTS.md`'s lead block, the `@deprecated` tags in the sources.
//
// The four references beside the skill are the exception. They are prose nothing can generate, so
// they are sources here, and all this module does with them is refuse to write a skill that points at
// one that has gone missing.
//
// Run: npm run docs:agents (write) · npm run check:agents (fail on drift)
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import prettier from 'prettier';
import { deprecations, priorFacts, rulesBody } from './agentSources.mjs';
import { PACKAGE_NAME } from './moduleGraph.mjs';
import { API_FILE, writeAttribute } from './propsApi.mjs';

const root = join(import.meta.dirname, '..');

export const SKILL_DIRECTORY = '.claude/skills/box-kite';

export const SKILL_FILE = `${SKILL_DIRECTORY}/SKILL.md`;

export const CURSOR_FILE = '.cursor/rules/box-kite.mdc';

export const MARKETPLACE_FILE = '.claude-plugin/marketplace.json';

/** The GitHub repository, in the `owner/repo` form every install command takes. */
const REPO = 'box-kite/box-kite';

const read = (file) => readFileSync(join(root, file), 'utf8');

const manifest = () => JSON.parse(read('package.json'));

/**
 * The references, and the one line each nav table row says about when to read it. The prose is this
 * script's; the title comes out of the file, so a renamed reference changes the table rather than
 * quietly pointing at nothing.
 */
const REFERENCES = [
  ['styling.md', 'writing props: the categories, the six kinds of nesting, the theme'],
  ['components.md', 'choosing a component, or wiring a Dropdown, a Select or a DataGrid'],
  ['extending.md', 'a value used twice, or a prop that does not exist yet'],
  ['patterns.md', 'server rendering, the behaviour hooks, portals, form controls, the tooltip'],
];

/**
 * The measured dividers, four of them written with the same `4` so that `b={4}` sitting at 4px among
 * three 1rems is the row that argues. It is the single most expensive thing to get wrong here, which
 * is why the table is built from the examples the engine wrote into `api/props.json`.
 */
const DIVIDERS = [
  ['p', 'spacing — `p`/`m`/`gap`/`px`/`py`/`pt`… all of them'],
  ['width', 'sizing — `width`/`height` and the four `min`/`max` props'],
  ['borderRadius', 'the corner radius, on the spacing scale'],
  ['b', 'border width — `b`/`bx`/`by`/`bt`/`bs`…'],
  ['fontSize', 'the one that is ÷16'],
  ['lineHeight', 'and `letterSpacing`'],
  ['strokeWidth', 'SVG lengths — and the geometry props `cx`/`cy`/`r`/`x`/`y`'],
  ['animationDuration', 'every animation and transition time'],
];

/** The install and update line per package manager, and the lock file that names it. */
const MANAGERS = [
  ['npm', 'package-lock.json', `npm install ${PACKAGE_NAME}`, `npm update ${PACKAGE_NAME}`],
  ['yarn', 'yarn.lock', `yarn add ${PACKAGE_NAME}`, `yarn upgrade ${PACKAGE_NAME}`],
  ['pnpm', 'pnpm-lock.yaml', `pnpm add ${PACKAGE_NAME}`, `pnpm update ${PACKAGE_NAME}`],
  ['bun', 'bun.lockb', `bun add ${PACKAGE_NAME}`, `bun update ${PACKAGE_NAME}`],
];

const table = (header, rows) => [`| ${header.join(' | ')} |`, `| ${header.map(() => '---').join(' | ')} |`, ...rows].join('\n');

/** A reference file's own H1, so the nav table cannot name a file that is no longer there. */
function referenceTitle(file) {
  const heading = /^#\s+(.+)$/m.exec(read(`${SKILL_DIRECTORY}/references/${file}`));

  if (!heading) throw new Error(`${SKILL_DIRECTORY}/references/${file} has no H1: the skill's own table of contents is built from it.`);

  return heading[1].trim();
}

/** One divider row: the prop, what a reader writes, and the declaration measured for it. */
function dividerRow(props, [name, what]) {
  const prop = props.find((entry) => entry.name === name);

  if (!prop) throw new Error(`${API_FILE} has no \`${name}\`: the divider table is measured from its example.`);

  return `| \`${name}\` | ${what} | \`${writeAttribute(name, prop.example.value)}\` | \`${prop.example.css}\` |`;
}

/** The frontmatter every client reads. Only the Agent Skills fields, so the skill packages anywhere. */
function frontmatter(propCount) {
  const description =
    `${PACKAGE_NAME} (Box Kite) expert — the runtime CSS-in-JS library whose Box component takes ${propCount} typed CSS` +
    ` props and writes the CSS itself. Use for any work with Box props, the Flex/Grid/Button/Textbox/Dropdown/DataGrid` +
    ` components, themes, Box.extend() or Box.components() — and read it before writing props, because the prop names` +
    ` collide with Tailwind's and Chakra's while the numbers mean different things. Also covers installing and updating` +
    ` the package.`;

  // Double quotes because prettier formats the frontmatter too, and this is the shape it writes.
  return ['---', 'name: box-kite', `description: "${description.replace(/"/g, '\\"')}"`, 'license: MIT', '---'].join('\n');
}

/** What the package ships beside the skill, and what the site answers with — the same facts, two addresses. */
function whereElse(propCount, homepage) {
  return [
    table(
      ['Read', 'When the question is'],
      [
        ...REFERENCES.map(([file, when]) => `| [\`references/${file}\`](references/${file}) — ${referenceTitle(file)} | ${when} |`),
        `| \`node_modules/${PACKAGE_NAME}/docs/props.md\` | one prop exactly: all ${propCount}, the CSS each writes,` +
          ` one measured example |`,
        `| \`node_modules/${PACKAGE_NAME}/BOX_KITE_AI_CONTEXT.md\` | the long-form reference, when a reference above is` + ' not enough |',
      ],
    ),
    `With the package not installed, the prop reference is ${homepage}/props.md, and ${homepage}/llms.txt indexes every` +
      ' documentation page as markdown beside it.',
  ].join('\n\n');
}

/** The skill: the facts, the rules, the numbers, where to look next, and how to install the package. */
export function skillMarkdown() {
  const { propCount, props } = JSON.parse(read(API_FILE));
  const { homepage } = manifest();

  return [
    frontmatter(propCount),
    `# ${PACKAGE_NAME}`,
    `Runtime CSS-in-JS. \`Box\` takes ${propCount} typed CSS props and generates the CSS for them at runtime — no` +
      ' stylesheet, no class name to invent, and two elements written with the same value share one class.',
    '## This library is not in your training data',
    'It was renamed at 1.0.0 (September 2026) and its prop surface nearly doubled on the way, so a plausible-looking' +
      ' memory of it is a memory of a different library. Four facts first, because each one is silently wrong in the' +
      ' APIs this most resembles:',
    priorFacts()
      .map((fact) => `- ${fact}`)
      .join('\n'),
    '## The numbers, measured',
    'The divider is per prop, so the same number is a different length depending on which prop it is written on —' +
      ' `p={4}` is 16px and `b={4}` is 4px. Every row here is what the engine emitted for that example, not what a doc' +
      ' claims about it:',
    table(
      ['Prop', 'Which props', 'Written', 'Emitted'],
      DIVIDERS.map((divider) => dividerRow(props, divider)),
    ),
    '## Read this next',
    whereElse(propCount, homepage),
    '## Installing and updating',
    'Detect the package manager from the lock file rather than asking:',
    table(
      ['Lock file', 'Manager', 'Install', 'Update'],
      MANAGERS.map(([name, lock, install, update]) => `| \`${lock}\` | ${name} | \`${install}\` | \`${update}\` |`),
    ),
    `\`${PACKAGE_NAME}\` needs React 18 or 19 as a peer, and installs \`@box-kite/core\` (the engine) with itself.`,
    '## Still working, but no longer the spelling to write',
    deprecations()
      .map(({ name, instead }) => `- \`${name}\` — ${instead}`)
      .join('\n'),
    '## The rules',
    rulesBody('Full reference: `references/` beside this file, and `docs/props.md` inside the package.'),
  ].join('\n\n');
}

/**
 * The same rules as a Cursor rule. Frontmatter is Cursor's three fields: the description is what makes
 * an agent-requested rule fire, and the globs attach it to the files where a prop gets written — an
 * `alwaysApply` rule would tax every request in the repository for the sake of the few that style
 * something.
 */
export function cursorRules() {
  const { propCount } = JSON.parse(read(API_FILE));
  const { homepage } = manifest();

  const description =
    `${PACKAGE_NAME} (Box Kite): the runtime CSS-in-JS library whose Box component takes ${propCount} typed CSS props.` +
    ' Read before writing Box props, a component, a theme or an extension — the prop names collide with Tailwind and' +
    ' Chakra while the numbers mean different things.';

  return [
    ['---', `description: ${description}`, 'globs: **/*.tsx,**/*.jsx,**/*.ts', 'alwaysApply: false', '---'].join('\n'),
    `# ${PACKAGE_NAME} rules`,
    'This library is not in your training data: it was renamed at 1.0.0 (September 2026) and its prop surface nearly' +
      ' doubled on the way. Four facts before the rules, because each one is silently wrong in the APIs this most' +
      ' resembles:',
    priorFacts()
      .map((fact) => `- ${fact}`)
      .join('\n'),
    rulesBody(
      `Full reference: \`node_modules/${PACKAGE_NAME}/docs/props.md\` in the project, or ${homepage}/props.md —` +
        ` every prop, the CSS it writes and one measured example.`,
    ),
  ].join('\n\n');
}

/**
 * The marketplace this repository *is*, so `/plugin marketplace add box-kite/box-kite` finds one plugin
 * carrying the skill above. `skills` names it explicitly because the other three skills here are
 * contributor tooling, and `strict: false` makes this entry the whole definition — there is no
 * `plugin.json` to keep in step with it. No `version`: a pinned plugin only updates when that string
 * changes, and a rules skill is wanted current, not pinned.
 */
export function marketplaceManifest() {
  const { author, description, keywords, license, homepage } = manifest();

  return {
    name: 'box-kite',
    owner: { name: author, url: `https://github.com/${REPO}` },
    description: `The Box Kite skill: how to write ${PACKAGE_NAME} correctly, generated from the library it describes.`,
    plugins: [
      {
        name: 'box-kite',
        source: './',
        displayName: 'Box Kite',
        description,
        author: { name: author },
        homepage: `${homepage}/ai-context`,
        repository: `https://github.com/${REPO}`,
        license,
        keywords,
        category: 'development',
        skills: [`./${SKILL_DIRECTORY}`],
        strict: false,
      },
    ],
  };
}

/** Through prettier, so a generated file is not one the repository's own formatter would rewrite. */
async function formatted(file, content) {
  // `.mdc` is markdown with Cursor's frontmatter on top, and prettier infers no parser from that
  // extension — `.prettierrc` names one in an override, which `resolveConfig` reads for this path.
  const options = await prettier.resolveConfig(join(root, file));

  return prettier.format(content, { ...options, filepath: file });
}

/** What writes each generated file, keyed by the path it is committed at. */
const GENERATED = {
  [SKILL_FILE]: skillMarkdown,
  [CURSOR_FILE]: cursorRules,
  [MARKETPLACE_FILE]: () => JSON.stringify(marketplaceManifest()),
};

/**
 * One generated file, formatted — the bytes that are committed. The docs site serves the skill and
 * the Cursor rule from here rather than reading the committed copies, so what it answers with cannot
 * be a hand-edit of them.
 */
export async function agentFile(file) {
  const build = GENERATED[file];

  if (!build) throw new Error(`${file} is not a generated agent file: ${Object.keys(GENERATED).join(', ')} are.`);

  return formatted(file, build());
}

/** Every generated agent file, as the pair the check and the write both work from. */
export async function generatedAgentFiles() {
  return Promise.all(Object.keys(GENERATED).map(async (file) => ({ file, content: await agentFile(file) })));
}
