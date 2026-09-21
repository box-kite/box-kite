/**
 * Box Kite against Radix UI and Base UI, as data rather than JSX so `radixComparison.test.ts` can hold
 * it honest: every pattern this library ships links to a demo that exists, every figure names the entry
 * it was measured from, and the table keeps the rows this library loses.
 *
 * Every byte below came out of `node dev/published-size.mjs`, which ships in this repo — so the numbers
 * can be re-derived rather than believed. The commands are in the method section of the page.
 */

/** The day the three libraries were installed, measured and read. */
export const VERIFIED_ON = '2026-09-21';

/**
 * What `Box` costs before a single component: the engine, the palette, the prop registry and the style
 * trees. It is the number that makes the per-component figures here small and the first-component figure
 * large, which is the whole argument of this page and the reason both are printed.
 */
export const BOX_BASELINE = 31961;

export type LibraryId = 'box-kite' | 'radix' | 'base-ui';

export interface Library {
  id: LibraryId;
  name: string;
  /** What the column above it is headed — the full name is too wide for three columns of figures. */
  column: string;
  /** The package the figures were measured from. */
  pkg: string;
  version: string;
  href: string;
  /** What an app pays before the first component — the engine here, and nothing at all there. */
  engine: number;
  /** What all thirteen patterns below cost on top of that, measured as one bundle. */
  thirteen: number;
  /**
   * Whether the components arrive with a look. None of the three ships a `.css` file — the difference is
   * that this one's styles are in the JavaScript already counted, and the other two have none anywhere,
   * so the CSS an app writes for them is real weight that appears in no figure on this page.
   */
  styled: boolean;
}

/**
 * The three, in the order the page argues about them. `radix-ui` is the single package Radix publishes
 * now; the figures were measured from the individual `@radix-ui/react-*` packages it re-exports, which
 * is what an app that installed one of them at a time has.
 */
export const libraries: readonly Library[] = [
  {
    id: 'box-kite',
    name: 'Box Kite',
    column: 'Box Kite',
    pkg: '@box-kite/react',
    version: '2.0.1',
    href: 'https://github.com/box-kite/box-kite',
    engine: BOX_BASELINE,
    thirteen: 23411,
    styled: true,
  },
  {
    id: 'radix',
    name: 'Radix UI',
    column: 'Radix',
    pkg: 'radix-ui',
    version: '1.6.7',
    href: 'https://www.radix-ui.com/primitives',
    engine: 0,
    thirteen: 55749,
    styled: false,
  },
  {
    id: 'base-ui',
    name: 'Base UI',
    column: 'Base UI',
    pkg: '@base-ui/react',
    version: '1.8.0',
    href: 'https://base-ui.com',
    engine: 0,
    thirteen: 97888,
    styled: false,
  },
];

export interface SizeCell {
  /** What was measured — the package entry, or the entries a `+` bundled into one. */
  entry: string;
  /** What one more of this costs an app that already has the other twelve. */
  marginal: number;
  /** What it costs alone, which is the figure a package page prints and the one that compares nothing. */
  solo: number;
}

export interface SizeRow {
  pattern: string;
  /** What the pattern is, in a line. */
  what: string;
  /** Where it is demonstrated on this site. */
  demo: string;
  /** The generated reference the keyboard map and the APG pattern are checked against, where there is one. */
  component: string | null;
  cells: Record<LibraryId, SizeCell>;
}

/**
 * The thirteen patterns all three libraries ship, so the comparison is about the same software. What
 * only one or two of them have is the coverage table below, which is the more interesting half.
 */
export const sizeRows: readonly SizeRow[] = [
  {
    pattern: 'Accordion + Collapsible',
    what: 'A disclosure, and a set of them where one opens at a time.',
    demo: '/accordion',
    component: 'Accordion',
    cells: {
      'box-kite': { entry: 'accordion', marginal: 1164, solo: 1795 },
      radix: { entry: '@radix-ui/react-accordion + react-collapsible', marginal: 1739, solo: 8779 },
      'base-ui': { entry: '@base-ui/react/accordion + /collapsible', marginal: 3262, solo: 9796 },
    },
  },
  {
    pattern: 'Dialog + AlertDialog',
    what: 'A modal, and the one that cannot be dismissed by clicking away from it.',
    demo: '/dialog',
    component: 'Dialog',
    cells: {
      'box-kite': { entry: 'dialog', marginal: 1138, solo: 2569 },
      radix: { entry: '@radix-ui/react-dialog + react-alert-dialog', marginal: 1649, solo: 14130 },
      'base-ui': { entry: '@base-ui/react/dialog + /alert-dialog', marginal: 2427, solo: 23639 },
    },
  },
  {
    pattern: 'Menu',
    what: "APG's menu button, with checkbox items, radio items and submenus.",
    demo: '/menu',
    component: 'Menu',
    cells: {
      'box-kite': { entry: 'menu', marginal: 2010, solo: 6276 },
      radix: { entry: '@radix-ui/react-dropdown-menu', marginal: 4492, solo: 31529 },
      'base-ui': { entry: '@base-ui/react/menu', marginal: 8755, solo: 52240 },
    },
  },
  {
    pattern: 'Popover',
    what: 'A panel anchored to a trigger, with light dismiss and focus return.',
    demo: '/popover',
    component: 'Popover',
    cells: {
      'box-kite': { entry: 'popover', marginal: 235, solo: 4085 },
      radix: { entry: '@radix-ui/react-popover', marginal: 1036, solo: 24146 },
      'base-ui': { entry: '@base-ui/react/popover', marginal: 3004, solo: 41115 },
    },
  },
  {
    pattern: 'Tabs',
    what: 'A tablist and its panels, with both activation modes.',
    demo: '/tabs',
    component: 'Tabs',
    cells: {
      'box-kite': { entry: 'tabs', marginal: 1828, solo: 2999 },
      radix: { entry: '@radix-ui/react-tabs', marginal: 678, solo: 9138 },
      'base-ui': { entry: '@base-ui/react/tabs', marginal: 2975, solo: 13418 },
    },
  },
  {
    pattern: 'Slider',
    what: 'One thumb or several, with the keyboard and a committed value.',
    demo: '/slider',
    component: 'Slider',
    cells: {
      'box-kite': { entry: 'slider', marginal: 1591, solo: 2167 },
      radix: { entry: '@radix-ui/react-slider', marginal: 3166, solo: 9714 },
      'base-ui': { entry: '@base-ui/react/slider', marginal: 6751, solo: 14331 },
    },
  },
  {
    pattern: 'Progress',
    what: 'A determinate bar and an indeterminate one.',
    demo: '/progress',
    component: 'Progress',
    cells: {
      'box-kite': { entry: 'progress', marginal: 176, solo: 310 },
      radix: { entry: '@radix-ui/react-progress', marginal: 680, solo: 2857 },
      'base-ui': { entry: '@base-ui/react/progress', marginal: 716, solo: 3327 },
    },
  },
  {
    pattern: 'Tooltip',
    what: 'A description on hover and on focus, dismissible and hoverable.',
    demo: '/tooltip',
    component: 'Tooltip',
    cells: {
      'box-kite': { entry: 'tooltip', marginal: 496, solo: 4042 },
      radix: { entry: '@radix-ui/react-tooltip', marginal: 2178, solo: 19270 },
      'base-ui': { entry: '@base-ui/react/tooltip', marginal: 4429, solo: 34334 },
    },
  },
  {
    pattern: 'Toast',
    what: 'A message sent from anywhere, queued, paused on hover and reachable by keyboard.',
    demo: '/toaster',
    component: 'Toaster',
    cells: {
      'box-kite': { entry: 'toaster', marginal: 3127, solo: 4148 },
      radix: { entry: '@radix-ui/react-toast', marginal: 3537, solo: 12057 },
      'base-ui': { entry: '@base-ui/react/toast', marginal: 6463, solo: 26359 },
    },
  },
  {
    pattern: 'Checkbox',
    what: 'A real input, with the indeterminate state.',
    demo: '/checkbox',
    component: 'Checkbox',
    cells: {
      'box-kite': { entry: 'checkbox', marginal: 14, solo: 478 },
      radix: { entry: '@radix-ui/react-checkbox', marginal: 660, solo: 5841 },
      'base-ui': { entry: '@base-ui/react/checkbox', marginal: 1560, solo: 8014 },
    },
  },
  {
    pattern: 'Switch',
    what: 'The same input read out as a switch.',
    demo: '/switch',
    component: 'Switch',
    cells: {
      'box-kite': { entry: 'switch', marginal: 111, solo: 673 },
      radix: { entry: '@radix-ui/react-switch', marginal: 542, solo: 4905 },
      'base-ui': { entry: '@base-ui/react/switch', marginal: 708, solo: 6072 },
    },
  },
  {
    pattern: 'Radio group',
    what: 'A named set of radios the arrow keys move between.',
    demo: '/radiobutton',
    component: 'RadioGroup',
    cells: {
      'box-kite': { entry: 'radioGroup + radioButton', marginal: 537, solo: 1485 },
      radix: { entry: '@radix-ui/react-radio-group', marginal: 1504, solo: 10314 },
      'base-ui': { entry: '@base-ui/react/radio-group', marginal: 898, solo: 11977 },
    },
  },
  {
    pattern: 'Select',
    what: 'A listbox of options behind a trigger, with typeahead.',
    demo: '/dropdown',
    component: 'Dropdown',
    cells: {
      'box-kite': { entry: 'dropdown', marginal: 5179, solo: 9488 },
      radix: { entry: '@radix-ui/react-select', marginal: 5873, solo: 31401 },
      'base-ui': { entry: '@base-ui/react/select', marginal: 9315, solo: 44734 },
    },
  },
];

/** What a library does about a pattern: its own component, an ordinary prop, or nothing at all. */
export type Coverage = 'component' | 'prop' | 'none';

export interface CoverageCell {
  has: Coverage;
  /** What it is called there, or the one line that says why there is nothing to call. */
  as?: string;
  /** What it costs alone, for the two rows where the size is the interesting half of the answer. */
  solo?: number;
}

export interface CoverageRow {
  pattern: string;
  /** Where it is demonstrated here, for the rows this library does ship. */
  demo?: string;
  cells: Record<LibraryId, CoverageCell>;
}

/**
 * Everything at least one of the three does not have. The thirteen above are the fair size comparison
 * and this is the honest one: nine rows here are a cross in this library's own column, which is what a
 * comparison table written by the library it favours has to carry to be worth reading.
 */
export const coverageRows: readonly CoverageRow[] = [
  {
    pattern: 'Combobox',
    demo: '/combobox',
    cells: {
      'box-kite': { has: 'component', as: 'Combobox', solo: 9505 },
      radix: { has: 'none', as: 'primitives#1342, open since 2022' },
      'base-ui': { has: 'component', as: 'combobox, autocomplete', solo: 51290 },
    },
  },
  {
    pattern: 'Data grid',
    demo: '/datagrid',
    cells: {
      'box-kite': { has: 'component', as: 'DataGrid' },
      radix: { has: 'none' },
      'base-ui': { has: 'none' },
    },
  },
  {
    pattern: 'Dashboard grid',
    demo: '/dashboard',
    cells: {
      'box-kite': { has: 'component', as: 'DashboardGrid, Widget' },
      radix: { has: 'none' },
      'base-ui': { has: 'none' },
    },
  },
  {
    pattern: 'Charts',
    demo: '/charts',
    cells: {
      'box-kite': { has: 'component', as: 'Sparkline, Gauge, ProgressRing, MiniDonut' },
      radix: { has: 'none' },
      'base-ui': { has: 'none' },
    },
  },
  {
    pattern: "An agent's turn",
    demo: '/agent',
    cells: {
      'box-kite': { has: 'component', as: 'ToolCallCard, ApprovalCard, Reasoning, StreamingText' },
      radix: { has: 'none' },
      'base-ui': { has: 'none' },
    },
  },
  {
    pattern: 'Navigation menu',
    cells: {
      'box-kite': { has: 'none' },
      radix: { has: 'component', as: 'NavigationMenu' },
      'base-ui': { has: 'component', as: 'navigation-menu' },
    },
  },
  {
    pattern: 'Menubar',
    cells: {
      'box-kite': { has: 'none' },
      radix: { has: 'component', as: 'Menubar' },
      'base-ui': { has: 'component', as: 'menubar' },
    },
  },
  {
    pattern: 'Context menu',
    cells: {
      'box-kite': { has: 'none' },
      radix: { has: 'component', as: 'ContextMenu' },
      'base-ui': { has: 'component', as: 'context-menu' },
    },
  },
  {
    pattern: 'Scroll area',
    cells: {
      'box-kite': { has: 'none', as: 'the native scrollbar, with scrollbarGutter' },
      radix: { has: 'component', as: 'ScrollArea' },
      'base-ui': { has: 'component', as: 'scroll-area' },
    },
  },
  {
    pattern: 'Hover card',
    cells: {
      'box-kite': { has: 'none' },
      radix: { has: 'component', as: 'HoverCard' },
      'base-ui': { has: 'component', as: 'preview-card' },
    },
  },
  {
    pattern: 'Toolbar',
    cells: {
      'box-kite': { has: 'none' },
      radix: { has: 'component', as: 'Toolbar' },
      'base-ui': { has: 'component', as: 'toolbar' },
    },
  },
  {
    pattern: 'Toggle and toggle group',
    cells: {
      'box-kite': { has: 'none' },
      radix: { has: 'component', as: 'Toggle, ToggleGroup' },
      'base-ui': { has: 'component', as: 'toggle, toggle-group' },
    },
  },
  {
    pattern: 'Avatar',
    cells: {
      'box-kite': { has: 'none' },
      radix: { has: 'component', as: 'Avatar' },
      'base-ui': { has: 'component', as: 'avatar' },
    },
  },
  {
    pattern: 'Number field',
    cells: {
      'box-kite': { has: 'none', as: 'Textbox with type="number"' },
      radix: { has: 'none' },
      'base-ui': { has: 'component', as: 'number-field' },
    },
  },
  {
    pattern: 'Aspect ratio',
    demo: '/box',
    cells: {
      'box-kite': { has: 'prop', as: 'aspectRatio' },
      radix: { has: 'component', as: 'AspectRatio' },
      'base-ui': { has: 'none' },
    },
  },
  {
    pattern: 'Screen-reader-only text',
    demo: '/icon',
    cells: {
      'box-kite': { has: 'component', as: 'VisuallyHidden' },
      radix: { has: 'component', as: 'VisuallyHidden, AccessibleIcon' },
      'base-ui': { has: 'none' },
    },
  },
  {
    pattern: 'Reading direction',
    demo: '/rtl',
    cells: {
      'box-kite': { has: 'prop', as: 'rtl, ltr — the browser resolves dir' },
      radix: { has: 'component', as: 'Direction' },
      'base-ui': { has: 'component', as: 'direction-provider' },
    },
  },
  {
    pattern: 'Portal',
    demo: '/overlay',
    cells: {
      'box-kite': { has: 'none', as: 'the top layer, so there is nothing to portal' },
      radix: { has: 'component', as: 'Portal' },
      'base-ui': { has: 'none', as: 'a portal prop on each layer' },
    },
  },
];

/** Everything an app using all thirteen ships: the engine, where there is one, plus the components. */
export function totalFor(id: LibraryId): number {
  const library = libraries.find((each) => each.id === id);

  return library ? library.engine + library.thirteen : 0;
}

/** The leave-one-out figures added up — always less than the bundle, which is the point of printing both. */
export function marginalSum(id: LibraryId): number {
  return sizeRows.reduce((sum, row) => sum + row.cells[id].marginal, 0);
}

/** The solo figures added up: what thirteen separate package pages would have you believe they cost. */
export function soloSum(id: LibraryId): number {
  return sizeRows.reduce((sum, row) => sum + row.cells[id].solo, 0);
}

/** One pattern's figures, by the name the tables give it — so the prose quotes the table rather than a literal. */
export function sizeOf(pattern: string, id: LibraryId): SizeCell {
  const row = sizeRows.find((each) => each.pattern === pattern);

  if (!row) throw new Error(`no size row named ${pattern}`);

  return row.cells[id];
}

/** The same for the coverage table, where only two cells carry a figure at all. */
export function coverageOf(pattern: string, id: LibraryId): CoverageCell {
  const row = coverageRows.find((each) => each.pattern === pattern);

  if (!row) throw new Error(`no coverage row named ${pattern}`);

  return row.cells[id];
}

/** How many of the coverage rows a library answers with something, a prop included. */
export function countCovered(id: LibraryId): number {
  return coverageRows.filter((row) => row.cells[id].has !== 'none').length;
}

/** `1164` → `1.16`. Kilobytes to two places, the way every size claim in this repo is written. */
export function kb(bytes: number): string {
  return (bytes / 1000).toFixed(2);
}
