/**
 * Where the docs site lives. Everything address-bound is built from `SITE_URL` — the canonical links,
 * `sitemap.xml`, `robots.txt`, the `CNAME` — so a move is this constant plus the DNS records
 * (checklist in `docs/WEBSITE.md`). Nothing else in `pages/` may hard-code a host.
 */
export const SITE_URL = 'https://www.box-kite.dev';

/** Second half of every document title, and the Open Graph site name. */
export const SITE_NAME = 'Box Kite';

export interface SiteRoute {
  /** The path react-router matches, and the one the sitemap prints. */
  path: string;
  /** First half of the document title — `Dropdown — Box Kite`. */
  name: string;
  /** The meta description, and the Open Graph description. */
  description: string;
  /** The whole `<title>`, for a route the `<name> — Box Kite` form does not suit. */
  title?: string;
  /** Unlisted demos set this to `false`: out of the sitemap, and `noindex` for crawlers. */
  indexable?: boolean;
}

/**
 * Every route the site serves, in nav order. Adding a page means adding an entry here: `app.tsx`
 * maps this list to its `<Route>` elements through an exhaustive record, so a route with no
 * metadata does not compile, and the sitemap can never fall behind the router.
 */
export const siteRoutes = [
  {
    path: '/',
    name: 'Introduction',
    title: 'Box Kite — build beautiful UIs without writing CSS',
    description:
      'A React library where every CSS property is a typed prop. Classes are generated at runtime and shared between components, so there is no stylesheet to import.',
  },
  {
    path: '/installation',
    name: 'Installation',
    description: 'Install Box Kite and render your first Box: two dependencies, no bundler plugin, and no stylesheet to import.',
  },
  {
    path: '/migrating',
    name: 'Migrating',
    title: 'Migrating to Box Kite — from @cronocode/react-box',
    description:
      'The library was @cronocode/react-box until 1.0.0. One find-and-replace, a compatibility bridge if you are not ready, and the three things it cannot forward.',
  },
  {
    path: '/releases',
    name: 'Releases',
    description:
      'What changed in each version of Box Kite, written as it landed: new props and components, breaking changes with their migration notes, and fixes.',
  },
  {
    path: '/theme-setup',
    name: 'Theme Setup',
    description: 'Declare light and dark variants next to the styles they override, and switch them at runtime with Box.Theme.',
  },
  {
    path: '/server-components',
    name: 'React Server Components',
    description:
      "Box renders on the server with no 'use client', no provider and no stylesheet to import. Its CSS is part of the HTML React streams.",
  },
  {
    path: '/box',
    name: 'Box',
    description: 'The foundational component: 221 CSS properties as type-safe props, with the numeric formatters explained.',
  },
  {
    path: '/svg',
    name: 'SVG',
    description:
      'Fourteen SVG paint and stroke properties as typed Box props — dashes, caps, joins, fill rules and a stroke that ignores the scale, all themeable.',
  },
  {
    path: '/icon',
    name: 'Icon',
    description:
      'Box props on an icon somebody else drew — one adapter for lucide, Tabler, react-icons and a raw <svg>: sized on the ÷4 scale, themed, and named on purpose.',
  },
  {
    path: '/charts',
    name: 'Charts',
    description:
      'Sparklines, progress rings, gauges and mini donuts as Boxes — no chart library — plus the container that themes a Recharts chart with the variables it reads.',
  },
  {
    path: '/variants',
    name: 'State Variants',
    description:
      'Style by a data-* or aria-* attribute, by what an element contains, by where it sits among its siblings, or by what an ancestor or a sibling is doing.',
  },
  {
    path: '/pseudo-elements',
    name: 'Pseudo-Elements',
    description:
      'before, after, placeholder, selection, marker and four more as nested props — with the content a generated element needs supplied for you.',
  },
  {
    path: '/container-queries',
    name: 'Container Queries',
    description:
      'A component that answers to the space it was given rather than to the window: cq, six sizes and their complements, against the nearest container or a named one.',
  },
  {
    path: '/anchor',
    name: 'Anchor Positioning',
    description:
      'A floating layer placed against its trigger by the browser: one hook, no measuring, and a measured fallback where the browser has none.',
  },
  {
    path: '/rtl',
    name: 'Right to Left',
    description:
      'One dir attribute mirrors the whole page: logical sides, arrow keys that follow the reading order, and pinned grid columns that hold their edges.',
  },
  {
    path: '/tailwind-parity',
    name: 'Tailwind Parity',
    description:
      'Every Tailwind v4.3 utility family against the props this library ships — what is covered, what is partial, and the one-line answer for the rest.',
  },
  {
    path: '/escape-hatch',
    name: 'Escape Hatch',
    description:
      'The css prop: a style object for the properties this library has no prop for, compiled into a shared class like every other prop — never an inline style.',
  },
  {
    path: '/animation',
    name: 'Animation',
    description:
      'Keyframes, presets and transitions as typed props: Box.keyframes() takes Box props as its steps, and a preset stops on its own under reduced motion.',
  },
  {
    path: '/button',
    name: 'Button',
    description: 'A real button element with variants, sizes and states, styled entirely through Box props.',
  },
  {
    path: '/textbox',
    name: 'Textbox',
    description: 'A labelled text input for collecting user data, with the states and customization Box props give every element.',
  },
  {
    path: '/textarea',
    name: 'Textarea',
    description: 'A labelled multiline input for longer user data.',
  },
  {
    path: '/checkbox',
    name: 'Checkbox',
    description: 'A native checkbox that turns an option on, off or mixed, with the label markup included.',
  },
  {
    path: '/radiobutton',
    name: 'Radio Button',
    description:
      'One choice out of a set. RadioGroup is the APG pattern — a named group, a shared field name, and arrow keys between options.',
  },
  {
    path: '/switch',
    name: 'Switch',
    description:
      'An on/off control: a real checkbox input wearing role=switch, so screen readers say on and off and forms still submit it.',
  },
  {
    path: '/tooltip',
    name: 'Tooltip',
    description:
      'A description that appears on hover and on focus, wired to its trigger with aria-describedby — the APG tooltip, WCAG 1.4.13 rules included.',
  },
  {
    path: '/popover',
    name: 'Popover',
    description:
      "A panel anchored to its trigger on the platform's Popover API: top layer, light dismiss and focus return, with no portal and no z-index.",
  },
  {
    path: '/dialog',
    name: 'Dialog',
    description:
      "A modal dialog on the native <dialog> element: the top layer, the backdrop, an inert page, Escape and focus containment are the browser's.",
  },
  {
    path: '/menu',
    name: 'Menu',
    description:
      "A menu button and its menu on the Popover API: APG's roles and keys, submenus as nested popovers, and no portal or focus trap.",
  },
  {
    path: '/overlay',
    name: 'Overlay',
    description:
      'A layer rendered where it is declared, in the top layer, so it escapes overflow: hidden, clipped ancestors and stacking contexts.',
  },
  {
    path: '/dropdown',
    name: 'Dropdown',
    description: 'The APG select-only combobox: choose one option or many, from the keyboard as well as the mouse.',
  },
  {
    path: '/datagrid',
    name: 'Data Grid',
    description: 'A virtualized data grid with sorting, filtering, grouping, column resizing and full keyboard navigation.',
  },
  {
    path: '/flex',
    name: 'Flex',
    description: 'A shortcut component for display: flex, with alignment, direction and spacing props.',
  },
  {
    path: '/grid',
    name: 'Grid',
    description: 'A shortcut component for display: grid, with template, gap and placement props.',
  },
  {
    path: '/style-grouping',
    name: 'Style Grouping',
    description: 'Group several CSS properties under a single prop, each with its own value. One prop, one class name, many declarations.',
  },
  {
    path: '/colors',
    name: 'Colors',
    description:
      'The complete colour palette in OKLCH — twenty-six families of eleven steps — and the opacity modifier every colour value takes.',
  },
  {
    path: '/gradients-shadows',
    name: 'Gradients & Effects',
    description:
      'A gradient written as a value, with palette tokens for stops — plus the shadow layers, filter functions and masks that stack instead of overwriting each other.',
  },
  {
    path: '/ai-context',
    name: 'AI Assistant Context',
    description:
      'What the package ships for the agent writing the code, and what the site serves for one reading it: AGENTS.md, llms.txt, and a markdown copy of every page.',
  },
] as const satisfies readonly SiteRoute[];

/** The union of every path the site serves — `app.tsx` keys its route components by it. */
export type SiteRoutePath = (typeof siteRoutes)[number]['path'];
