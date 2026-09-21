/**
 * What the homepage claims, as data, so `home.test.ts` can hold every claim to the thing it is a claim
 * about: a completion row to the prop reference the engine measured, the pattern table to the component
 * references generated from the components themselves, the shipped-file table to the generator that
 * writes those files, the compiler diagnostic to the compiler. A number typed in by hand here is a
 * number that can quietly stop being true, which on this page of all pages is the one thing that must
 * not happen.
 *
 * The counts are written out rather than imported: `api/props.json` is 120 KB and the generated component
 * references are thirty-eight files, and neither belongs in the chunk the site's most-visited page fetches.
 * The test reads all of them and fails on a digit.
 */

/**
 * The numbers the page prints about itself. `props` is `api/props.json`'s own count; the three a11y ones
 * are the whole axe sweep, not just the ten rows below. `knownViolations` is the one worth printing — the
 * ledger fails both ways, so a listed violation that stopped firing is a failure too, and an empty ledger
 * means empty.
 */
export const totals = { props: 235, components: 38, keyboardRows: 105, fixtures: 51, knownViolations: 0 } as const;

/** The four pillars, in the order the page tells them. The `id` is the anchor its card jumps to. */
export interface Pillar {
  id: string;
  /** What the pillar is, in the fewest words that are still a claim. */
  title: string;
  /** The claim itself — one sentence, and the section below it is the proof. */
  claim: string;
  /** The words on the card that say what kind of proof is waiting. */
  proof: string;
}

export const pillars: readonly Pillar[] = [
  {
    id: 'agent',
    title: 'An agent writes it correctly',
    claim: `The rules, every prop with the CSS it emits, and an MCP server that runs the real engine all ship inside the package — generated from the prop registry, so what a model reads is never a version behind what it is writing against.`,
    proof: 'What is in the tarball',
  },
  {
    id: 'typed',
    title: 'And the compiler catches the rest',
    claim: `${totals.props} CSS properties the compiler checks, so a value a model invented is an error in your editor rather than an element that renders with no background.`,
    proof: 'A real compiler diagnostic',
  },
  {
    id: 'generative',
    title: 'A model can compose the UI at runtime',
    claim:
      'catalog() describes every component and every value its props take as JSON Schema, and <SpecRenderer> renders what comes back against the components your app allows — an unknown name renders nothing.',
    proof: 'The schema, and what it refuses',
  },
  {
    id: 'finished',
    title: 'What it writes is finished',
    claim:
      'Ten components implement a published W3C pattern with the keyboard tested on every commit, every one of them renders in a Server Component, and the data grid is in the box.',
    proof: 'The pattern table, generated',
  },
];

/**
 * The hero's completion list: six props whose measured CSS is the whole argument for the editor — and the
 * model reading the same types — knowing them. Five of the six take a number and no two of those numbers
 * mean the same thing, which is exactly the knowledge a class string keeps in your head and a typed prop
 * keeps in the type.
 *
 * Every row is one prop's `@example` out of `api/props.json`, which `npm run docs:props` measures from the
 * engine. Writing a row by hand would make this list the one place on the site that is not measured.
 */
export interface Completion {
  /** The prop, spelled as it is written in JSX. */
  prop: string;
  /** The value, spelled as it is written in JSX — braces for a number, quotes for a string. */
  written: string;
  /** The declaration the engine emits for it. */
  css: string;
  /** Why the number means what it means — the sentence the editor's hover is standing in for. */
  note: string;
}

export const completions: readonly Completion[] = [
  { prop: 'p', written: '{4}', css: 'padding: 1rem', note: 'spacing is ÷4' },
  { prop: 'fontSize', written: '{14}', css: 'font-size: 0.875rem', note: 'type is ÷16, so the number is the pixel size' },
  { prop: 'borderRadius', written: '{4}', css: 'border-radius: 1rem', note: 'the spacing scale again' },
  { prop: 'b', written: '{4}', css: 'border-width: 4px', note: 'a border is measured in pixels' },
  { prop: 'lineHeight', written: '{24}', css: 'line-height: 24px', note: 'so is a line box' },
  { prop: 'bgColor', written: '"sky-500"', css: 'background-color: var(--sky-500)', note: 'a token, so a theme can move it' },
];

/**
 * What the package carries for whatever is writing the code, and what writes each file. Everything here
 * is generated at build time from the prop registry, the component types or the rules file — which is the
 * claim the section makes, so the test holds every path to `scripts/agent-docs.mjs`, the generator that
 * emits them. A file this table names and the build does not write fails the suite.
 */
export interface ShippedFile {
  /** Its path inside the installed package. */
  path: string;
  /** What it is, in a line. */
  what: string;
}

export const shipped: readonly ShippedFile[] = [
  { path: 'AGENTS.md', what: 'The rules, and the block that tells a model its prior is a different library. Read first.' },
  { path: 'docs/props.md', what: 'Every prop, the values it takes and one example measured from the engine.' },
  {
    path: 'docs/components.md',
    what: "Every component, its import specifier and whether it renders on a server — read off the built chunks' own exports.",
  },
  { path: 'docs/a11y.md', what: 'The behaviour hooks, for a pattern this library does not ship.' },
  { path: 'docs/anchor.md', what: 'Where a floating layer goes, in CSS and in the measured fallback.' },
  { path: 'docs/catalog.md', what: 'What a generated UI may build, and how it renders.' },
  { path: 'docs/interop.md', what: 'The agentic runtimes, each verified against its own published package.' },
  { path: 'docs/mcp.md', what: 'The MCP server, and why one tool of it cannot be replaced by a file.' },
  { path: 'BOX_KITE_AI_CONTEXT.md', what: 'The long-form reference: prop tables, the DataGrid API, debugging.' },
  { path: '.claude/skills/box-kite/', what: 'The same rules as an installable skill, with four references beside it.' },
  { path: '.cursor/rules/box-kite.mdc', what: 'That skill as a Cursor rule.' },
];

/**
 * The MCP server's tools. `check_styles` is the reason the server exists at all and is listed last for
 * it: a value this library does not accept writes no CSS and says nothing about having done so, which is
 * the one answer a documentation file cannot give however complete it is.
 */
export interface AgentTool {
  name: string;
  what: string;
}

export const agentTools: readonly AgentTool[] = [
  { name: 'search_docs', what: 'The prop, component, nesting key or rule for what you are building — ranked across all four.' },
  { name: 'get_props', what: "A prop's whole record, with a numeric prop's scale measured at 1/2/4/8 rather than described." },
  { name: 'get_component', what: "One component's contract: props and defaults, sub-parts, the keyboard map and the ARIA it writes." },
  { name: 'get_rules', what: 'The rules the library is written by, as an index or in full.' },
  { name: 'get_blocks', what: 'Whole sections the shadcn CLI installs — a data-grid page, a settings form, a dashboard shell.' },
  { name: 'check_styles', what: 'A prop bag through the real engine: the CSS each prop wrote, or why it wrote none.' },
];

/** The one command each of the three install routes takes. */
export const installs = [
  { label: 'Any agent that reads a root AGENTS.md', command: 'cp node_modules/@box-kite/react/AGENTS.md ./AGENTS.md' },
  { label: 'As a skill, in roughly forty-five agents', command: 'npx skills add box-kite/box-kite' },
  { label: 'As an MCP server, with the engine behind it', command: 'npx @box-kite/mcp' },
] as const;

/**
 * The typo, twice. A value in a class string is something a bundler has nothing to check against — it
 * compiles, it ships, and it paints nothing — and `bgColor="blue-550"` is the same mistake made where the
 * type system can see it. It is the mistake a model makes most: a plausible value from a neighbouring
 * scale.
 *
 * The diagnostic is the compiler's own, re-run by the test rather than transcribed: the test asserts the
 * code and both ends of the message. The union in the middle is elided here because it is the palette,
 * which the compiler prints and then elides itself.
 */
export const typeProof = {
  /** What both columns get wrong. No palette family has a 550 step. */
  wrong: 'blue-550',
  /** What the compiler offers instead, which is the part no string could do. */
  nearest: 'blue-50',
  code: 2820,
  /** The start of the message, asserted as a prefix. */
  head: `Type '"blue-550"' is not assignable to type`,
  /** The end of it, asserted as a suffix. */
  tail: `. Did you mean '"blue-50"'?`,
  /** What stands where the message lists every colour token it accepts. */
  elision: 'every colour token in the palette',
} as const;

/**
 * The components that implement a published pattern, with the two numbers that say it was tested rather
 * than intended: how many keyboard rows the component's reference documents, and how many fixtures the axe
 * sweep renders it in. Both are read back out of `api/components/*.json` by the test, so a component that
 * gains a keyboard row and forgets this table fails the suite.
 */
export interface PatternRow {
  /** The component, as its reference names it. */
  name: string;
  /** Its page on this site. */
  route: string;
  /** The APG pattern, as the last segment of its URL — `menu-button`, `combobox`. */
  pattern: string;
  keyboard: number;
  fixtures: number;
}

export const patternRows: readonly PatternRow[] = [
  { name: 'Dropdown', route: '/dropdown', pattern: 'combobox', keyboard: 18, fixtures: 3 },
  { name: 'DataGrid', route: '/datagrid', pattern: 'grid', keyboard: 16, fixtures: 6 },
  { name: 'Menu', route: '/menu', pattern: 'menu-button', keyboard: 7, fixtures: 1 },
  { name: 'Tooltip', route: '/tooltip', pattern: 'tooltip', keyboard: 6, fixtures: 2 },
  { name: 'Slider', route: '/slider', pattern: 'slider', keyboard: 5, fixtures: 1 },
  { name: 'Tabs', route: '/tabs', pattern: 'tabs', keyboard: 5, fixtures: 3 },
  { name: 'Accordion', route: '/accordion', pattern: 'accordion', keyboard: 4, fixtures: 1 },
  { name: 'RadioGroup', route: '/radiobutton', pattern: 'radio', keyboard: 4, fixtures: 1 },
  { name: 'Switch', route: '/switch', pattern: 'switch', keyboard: 3, fixtures: 1 },
  { name: 'Checkbox', route: '/checkbox', pattern: 'checkbox', keyboard: 2, fixtures: 2 },
];

/** Where the pattern names above resolve to. */
export const APG_PATTERNS = 'https://www.w3.org/WAI/ARIA/apg/patterns/';
