# Box Kite next

_Unreleased. A PR that changes what a consumer sees adds its section here — see CONTRIBUTING.md, "Release notes"._

<!-- Intro: one or two sentences on what this release is about. The first one becomes the CHANGELOG line. -->

## Highlights

<!-- One bullet per section below, linking to it: **[Heading](#heading)** — one line on why it matters. -->

- **[A design can stop at the edge of a subtree](#a-design-can-stop-at-the-edge-of-a-subtree)** — two designs on one page, one stylesheet.
- **[Every block has a page of its own](#every-block-has-a-page-of-its-own)** — the block running in light and dark, every file it writes, and a link from `get_blocks`.
- **[A store to start from](#a-store-to-start-from)** — four linked pages and eight blocks of one design, each installed with one command.

<!-- One `##` per change, above Breaking changes: a sentence for the heading, a paragraph on what and why, an example if it helps. -->

## A design can stop at the edge of a subtree

`Box.components()` styles the whole app: every call merges into one registry, so two designs could never share a page. `Box.createComponents()` takes the same shape and registers nothing. It returns a design, and `<Box.Components value>`, or the new `components` prop on `Box.Theme`, applies it to every Box inside, the pre-built components included. Props still beat the design. A white-label app with a design per tenant, a redesign landing one screen at a time, a page of templates that each look different: one stylesheet, and each design ends where its subtree does.

```tsx
const pill = Box.createComponents({ button: { styles: { borderRadius: 999 } } });

<Box.Theme use="local" components={pill}>
  <Button>Pill, in light and dark</Button>
</Box.Theme>
```

A design merges over the app's own `Box.components()` unless `base: 'builtin'` says otherwise, and `MergeComponentsAndVariants` types two designs that both name a component. See [Box.createComponents()](https://www.box-kite.dev/box-functions/#createcomponents).

## Every block has a page of its own

The three registry blocks each have a page at [box-kite.dev/blocks](https://www.box-kite.dev/blocks/): the block running in light and dark side by side, the install command, every file it writes, and a full-screen demo. `get_blocks` in `@box-kite/mcp` now links a block's page beside its install command. The dashboard shell block takes a `theme` prop, the theme to open in, for a page that shows it in a fixed one.

```tsx
<DashboardShell title="Overview" theme="dark">
  <DashboardStats />
</DashboardShell>
```

## A store to start from

Four complete pages of one design are at [box-kite.dev/templates](https://www.box-kite.dev/templates/): a storefront, a product page, a cart and a checkout, linked to each other, in light and dark, with every product picture a lucide icon on a tile in the product's colour, so swapping in your photographs means replacing one component. Their eight sections are blocks of their own, among them a [credit card form](https://www.box-kite.dev/blocks/react-credit-card-form/), a [product grid with filters](https://www.box-kite.dev/blocks/react-product-grid/) and an [order summary](https://www.box-kite.dev/blocks/react-order-summary/). The design is one `Box.createComponents()` registry, so it stops at the edge of the store. A template installs with its design and its blocks in one command:

```bash
npx shadcn@latest add https://www.box-kite.dev/r/checkout-page.json
```

## Breaking changes

None.

## Fixes

<!-- One bullet per fix: **What was wrong.** What it does now. -->

- **A component built on another with `extends` was unstyled until the app called `Box.components()`, and missed a later override of its base.** The built-in `gauge` (`extends: 'progressRing'`) rendered without its ring paint in an app that registered nothing. `extends` is now resolved over everything registered, chains included, every time the registry changes.
- **A prop you wrote lost to a component's dark-theme default.** `<Button bgColor="red-500">` stayed indigo in dark mode: the button's own `theme.dark.bgColor` survived the merge, and a theme rule outranks a plain class. A prop now replaces the component's value for that prop in every theme, at the level you wrote it (`bgColor` clears `theme.*.bgColor`, and `hover.bgColor` clears the themed hover), while everything you did not mention keeps its dark styling. If you relied on the old result, write the dark value yourself: `theme={{ dark: { bgColor: 'indigo-500' } }}`.
- **Two settings forms on one page labelled each other's slider.** The settings form block gave its density caption a fixed `id`, so a second copy pointed its slider at the first one's caption. The id now comes from `useId`. Run `npx shadcn@latest add https://www.box-kite.dev/r/settings-form.json` again to take the fix.
- **A prop or variant that set a gradient's colours added them to the component's instead of replacing them.** A component whose styles carried `bgGradient={{ linear: 'r', colors: ['orange-700', 'rose-700'] }}` and a variant naming two colours of its own rendered all four stops, so a secondary button wore the primary's gradient; `scrollbarColor` pairs and `maskImage` stops did the same. An array is now one value, and the later one replaces it.
