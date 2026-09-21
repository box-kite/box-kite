/**
 * What the homepage claims, as data, so `home.test.ts` can hold every claim to the thing it is a claim
 * about: a completion row to the prop reference the engine measured, the pattern table to the component
 * references generated from the components themselves, the compiler diagnostic to the compiler. A number
 * typed in by hand here is a number that can quietly stop being true, which on this page of all pages is
 * the one thing that must not happen.
 *
 * The counts are written out rather than imported: `api/props.json` is 120 KB and the generated component
 * references are thirty-eight files, and neither belongs in the chunk the site's most-visited page fetches.
 * The test reads all of them and fails on a digit.
 */

/**
 * The four numbers the page prints about itself. `props` is `api/props.json`'s own count; the other three
 * are the whole axe sweep, not just the ten rows below. The last one is the one worth printing — the
 * `knownViolations` ledger fails both ways, so a listed violation that stopped firing is a failure too,
 * and an empty ledger means empty.
 */
export const totals = { props: 221, components: 38, keyboardRows: 105, fixtures: 51, knownViolations: 0 } as const;

/** The four pillars G6 names, in the order the page tells them. The `id` is the anchor its card jumps to. */
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
    id: 'typed',
    title: 'Typed props, not class strings',
    claim: `${totals.props} CSS properties your editor completes and the compiler checks, so a colour that is not in the palette is an error rather than an element with no background.`,
    proof: 'A real compiler diagnostic',
  },
  {
    id: 'accessible',
    title: 'The keyboard is already in them',
    claim:
      'Ten components implement a published W3C pattern, and the arrow keys, the roles and the focus moves are tested on every commit rather than described in a README.',
    proof: 'The pattern table, generated',
  },
  {
    id: 'server',
    title: 'It renders in a Server Component',
    claim:
      "No 'use client', no provider and no stylesheet: the react-server build has no hook and no effect in it, and its CSS is part of the HTML React streams.",
    proof: 'The mechanism, in eight lines',
  },
  {
    id: 'grid',
    title: 'The data grid costs nothing',
    claim:
      'Sorting, grouping, virtualization, tree data, a server-side row model, range selection and an XLSX export — under MIT, in the same package as everything else.',
    proof: 'What the others charge',
  },
];

/**
 * The hero's completion list: six props whose measured CSS is the whole argument for the editor knowing
 * them. Five of the six take a number and no two of those numbers mean the same thing — which is exactly
 * the knowledge a class string keeps in your head and a typed prop keeps in the type.
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
 * The typo, twice. `bg-blue-550` is a string a bundler has nothing to check against — it compiles, it
 * ships, and it paints nothing — and `bgColor="blue-550"` is the same mistake made where the type system
 * can see it.
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

/** The paid tiers the grid section quotes, by their id in `gridComparison.ts` — the prices live there. */
export const quotedTiers = ['ag-enterprise', 'mui-pro', 'mui-premium'] as const;
