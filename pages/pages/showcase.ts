/**
 * What the showcase draws, as data — so `showcase.test.ts` can hold it to `api/components/*.json`
 * rather than to a memory of what the library ships. A component with a generated reference and no
 * entry here fails the suite, which is the only thing that keeps a page like this from going stale.
 *
 * The page keys its demos by `name` through an exhaustive record, so an entry with nothing to render
 * is a compile error. The two gates together are the whole point: the list cannot fall behind the
 * library, and the page cannot fall behind the list.
 */

/** The sections, in the order the page draws them. */
export const groups = [
  { id: 'forms', label: 'Forms', note: 'A real native control each, and the label that names it.' },
  { id: 'layers', label: 'Layers', note: "In the browser's top layer: no portal, no z-index, no focus trap written here." },
  { id: 'disclosure', label: 'Disclosure', note: 'Open and shut, animated by a grid track rather than a measured height.' },
  { id: 'feedback', label: 'Feedback', note: 'What is happening, what happened, and what is not there yet.' },
  { id: 'data', label: 'Data', note: 'Rows, and the space somebody rearranges them in.' },
  { id: 'charts', label: 'Charts', note: 'Box props on a shape. Not a chart library — no axes, no legends.' },
  { id: 'agent', label: 'Agent', note: 'What a model ran, what it wants permission for, and what it said.' },
  { id: 'primitives', label: 'Primitives', note: 'The three that are the element they name.' },
] as const;

export type ShowcaseGroup = (typeof groups)[number]['id'];

export interface ShowcaseEntry {
  /** The component's own name, exactly as its generated reference reports it. */
  name: string;
  /** The page that documents it — the same route that reference names, which the test checks. */
  route: string;
  group: ShowcaseGroup;
  /** What the card is showing, for a reader scanning rather than reading. */
  note: string;
}

export const entries = [
  { name: 'Button', route: '/button', group: 'forms', note: 'Three variants, and the disabled state of one.' },
  { name: 'Textbox', route: '/textbox', group: 'forms', note: 'An input, with the placeholder styled as a nested prop.' },
  { name: 'Textarea', route: '/textarea', group: 'forms', note: 'The same field, taller, and growing with what is typed.' },
  { name: 'Checkbox', route: '/checkbox', group: 'forms', note: 'A native input; the label is the component’s own job.' },
  { name: 'RadioGroup', route: '/radiobutton', group: 'forms', note: 'The APG radio group: one name, one tab stop, arrow keys.' },
  { name: 'RadioButton', route: '/radiobutton', group: 'forms', note: 'The same input on its own, for a group you assemble.' },
  { name: 'Switch', route: '/switch', group: 'forms', note: 'role="switch" over a checkbox, so Enter toggles it too.' },
  { name: 'Slider', route: '/slider', group: 'forms', note: 'One thumb or two — the value’s shape decides which.' },

  {
    name: 'Popover',
    route: '/popover',
    group: 'layers',
    note: 'The Popover API: light dismiss and focus return are the browser’s. At rest, its trigger.',
  },
  { name: 'Dialog', route: '/dialog', group: 'layers', note: 'A real <dialog> with showModal(). At rest, its trigger.' },
  { name: 'AlertDialog', route: '/dialog', group: 'layers', note: 'The same, never dismissed by a press outside. At rest, its trigger.' },
  { name: 'Menu', route: '/menu', group: 'layers', note: 'APG’s menu button, submenus included. At rest, its trigger.' },
  { name: 'Tooltip', route: '/tooltip', group: 'layers', note: 'Hover or focus the button. At rest, its trigger.' },
  { name: 'Dropdown', route: '/dropdown', group: 'layers', note: 'The select-only combobox, closed — which is the control itself.' },
  { name: 'Combobox', route: '/combobox', group: 'layers', note: 'The editable one: a row in is a row out, typed.' },
  { name: 'Overlay', route: '/overlay', group: 'layers', note: 'Positioning with no pattern on it — shown open, beside its anchor.' },

  { name: 'Tabs', route: '/tabs', group: 'disclosure', note: 'One tab stop for the list, and selection follows focus.' },
  { name: 'Accordion', route: '/accordion', group: 'disclosure', note: 'A heading per section, and a panel that is never measured.' },
  { name: 'Collapsible', route: '/accordion', group: 'disclosure', note: 'One disclosure, with a trigger of your own and no heading.' },

  { name: 'Progress', route: '/progress', group: 'feedback', note: 'A value, and the indeterminate state that reports none.' },
  {
    name: 'Toaster',
    route: '/toaster',
    group: 'feedback',
    note: 'A viewport is one per app, so the page mounts one. Press to send it a toast.',
  },
  { name: 'Skeleton', route: '/agent', group: 'feedback', note: 'Bars with a travelling gloss, aria-hidden unless labelled.' },
  { name: 'Presence', route: '/animation', group: 'feedback', note: 'The ~1 KB that lets a node animate on its way out.' },

  { name: 'DataGrid', route: '/datagrid', group: 'data', note: 'Four rows of the grid that does a million.' },
  { name: 'DashboardGrid', route: '/dashboard', group: 'data', note: 'A layout in cells, compacted upward. Add editable for the handles.' },
  { name: 'Widget', route: '/dashboard', group: 'data', note: 'The chrome, and its four states — here: filled, loading, empty.' },

  { name: 'Sparkline', route: '/charts', group: 'charts', note: 'A line, an area and bars off the same eight numbers.' },
  { name: 'ProgressRing', route: '/charts', group: 'charts', note: 'A fraction, rounded into a class so it still transitions.' },
  { name: 'Gauge', route: '/charts', group: 'charts', note: 'The same arithmetic over a sweep you choose.' },
  { name: 'MiniDonut', route: '/charts', group: 'charts', note: 'The one primitive that needs a list of colours.' },
  { name: 'ChartContainer', route: '/charts', group: 'charts', note: 'Declares --color-<series>, so the chart names no colour at all.' },

  { name: 'ToolCallCard', route: '/agent', group: 'agent', note: 'Four statuses, each carrying its own word beside the dot.' },
  { name: 'ApprovalCard', route: '/agent', group: 'agent', note: 'A question somebody answers, not a stage a call passes through.' },
  { name: 'Reasoning', route: '/agent', group: 'agent', note: 'Closed by default, opening in the accordion’s own grid track.' },
  { name: 'StreamingText', route: '/agent', group: 'agent', note: 'Give it the message so far; a whole one paints at once.' },

  { name: 'Flex', route: '/flex', group: 'primitives', note: 'display: flex, and every alignment prop that goes with it.' },
  { name: 'Grid', route: '/grid', group: 'primitives', note: 'display: grid, with the track props as values.' },
  { name: 'Icon', route: '/icon', group: 'primitives', note: 'Box props on an icon somebody else drew.' },
] as const satisfies readonly ShowcaseEntry[];

/** One card, with its own name kept as a literal — which is what makes the page's demo record exhaustive. */
export type ShowcaseCard = (typeof entries)[number];

/** Every component the showcase draws — the page keys its demos by this, so one it misses will not compile. */
export type ShowcaseName = ShowcaseCard['name'];

export function entriesIn(group: ShowcaseGroup): readonly ShowcaseCard[] {
  return entries.filter((entry) => entry.group === group);
}
