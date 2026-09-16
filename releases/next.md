# Box Kite next

_Unreleased. A PR that changes what a consumer sees adds its section here — see CONTRIBUTING.md, "Release notes"._

The package now carries instructions for the agent writing the code, the documentation site answers in markdown, the same rules install as a skill in about forty-five coding agents, and every component page states its own props, keys and accessibility — all of it generated from the sources the library is built from. A floating layer is also placed by the browser now rather than measured in JavaScript, all the way through: six props, one hook, and every popup the library ships standing on them. Three of those popups are now browser features rather than components: a popover on the Popover API, a modal dialog on `<dialog>`, and a menu button whose submenus are popovers nested inside it. Tabs arrive beside them, on nothing but the keyboard the pattern asks for — with an indicator that travels between them and a panel box that resizes to fit. An accordion arrives with them, opening its panels on a grid track nobody had to measure, and a slider and a progress bar close the set — the two places the platform’s own control cannot be styled or given a second thumb. Last in are the messages an app sends rather than renders: one `<Toaster />`, and `toast()` from anywhere at all.

## Highlights

- **[The package tells an agent how to use it](#the-package-tells-an-agent-how-to-use-it)** — `AGENTS.md` and a `docs/` folder ship in the tarball, generated from the prop registry and the built chunks themselves.
- **[Every docs page is also markdown](#every-docs-page-is-also-markdown)** — append `.md` to any address, or start at `llms.txt`, which indexes all of them and states the four facts a model's priors get wrong.
- **[The rules install as a skill](#the-rules-install-as-a-skill)** — `npx skills add box-kite/box-kite` for about forty-five coding agents, a plugin marketplace for Claude Code, and a `.mdc` for Cursor.
- **[Every component page states its own API](#every-component-page-states-its-own-api)** — props, keys, accessibility and the style tree, generated from each component's types and doc tags, so a table cannot go stale.
- **[Three props for a table, and a list that shows its markers](#three-props-for-a-table-and-a-list-that-shows-its-markers)** — `borderCollapse`, `borderSpacing`, `tableLayout`, plus `display="list-item"` and the markers `listStyle` was missing.
- **[A floating layer is six props, and no JavaScript](#a-floating-layer-is-six-props-and-no-javascript)** — CSS anchor positioning: name an anchor, say which cell of the grid around it to sit in, and let the browser flip the layer when it does not fit.
- **[One hook places a floating layer](#one-hook-places-a-floating-layer-and-a-length-can-come-off-the-anchor)** — `useAnchorPosition` from `@box-kite/react/anchor`, plus `anchor-size()` on every sizing prop and `anchor()` on every inset, so a popup matches its trigger with nothing measured.
- **[Every popup in the library is placed by the browser](#every-popup-in-the-library-is-placed-by-the-browser)** — `Overlay`, `Tooltip`, the `Dropdown` popup and the DataGrid column menu stand on that hook, three home-grown flip heuristics are gone, and one `side`/`align`/`offset`/`flip` vocabulary replaces the transforms they took.
- **[A popover is a browser feature now, not a portal](#a-popover-is-a-browser-feature-now-not-a-portal)** — `<Popover>` on the platform Popover API: the top layer, light dismiss and focus return are the browser's, so there is no portal and no z-index — and it is 3.46 KB gz against Radix Popover's 23.54.
- **[Every floating layer is in the top layer](#every-floating-layer-is-in-the-top-layer-and-the-portal-is-gone)** — `Overlay`, and so `Tooltip`, the `Dropdown` popup and the DataGrid column menu: no portal anywhere in the library, so a popup inherits the theme around it and a dropdown inside a panel no longer dismisses it.
- **[A modal dialog is a browser feature too](#a-modal-dialog-is-a-browser-feature-too)** — `<Dialog>` and `<AlertDialog>` on the native `<dialog>`: `showModal()` supplies the top layer, the backdrop, an inert page, Escape, focus containment and focus return, so the two together add 2.15 KB gz against Radix Dialog's 13.28.
- **[A menu, and its submenus, are nested popovers](#a-menu-and-its-submenus-are-nested-popovers)** — `<Menu>` is APG's menu button on the Popover API: seven parts, the whole keyboard, submenus that nest as deeply as the markup, and 6.36 KB gz against Radix DropdownMenu's 30.85.
- **[Tabs, where selection follows focus](#tabs-where-selection-follows-focus)** — the APG tabs pattern in four parts: one tab stop for the list, arrows that follow the reading order, both activation modes, and 3.03 KB gz against Radix Tabs 9.18. An indicator that travels between tabs and a panel box that resizes between panels are each one opt-in away.
- **[An accordion whose animation is a class](#an-accordion-whose-animation-is-a-class)** — `<Accordion>` and `Collapsible`, where a panel opens in a grid track rather than a measured pixel: no `ResizeObserver`, nothing written per instance, and 1.80 KB gz for both against Radix's 8.78.
- **[A slider whose value keeps its own shape](#a-slider-whose-value-keeps-its-own-shape)** — `<Slider>` takes a number for one thumb and an array for a range, so nothing at the call site has to narrow; `<Progress>` is the bar beside it, and renders on a server. 2.14 KB gz and 0.31 against Radix’s 9.71 and 2.86.
- **[A message you send rather than render](#a-message-you-send-rather-than-render)** — `<Toaster />` once, then `toast()` from anywhere at all: a live region that exists before there is anything in it, a queue rather than a cap, and timers that stop on hover, on focus and off screen. 4.14 KB gz against sonner's 9.86 plus a stylesheet.
- **[A combobox whose value is your own row](#a-combobox-whose-value-is-your-own-row)** — the component Radix never shipped: `<Combobox>` takes your rows and hands one back, the filter composes, the selection can be chips, a query nothing answers can become a row, and a list of ten thousand opens in one frame. 9.53 KB gz on top of Box.
- **[The DataGrid, restyled](#the-datagrid-restyled)** — tabular numerals, a selected row that finally looks selected, pinned columns that float rather than fence, and chrome quiet enough to read the data through.
- **[A column that adds itself up](#a-column-that-adds-itself-up)** — `aggregate` on a DataGrid column totals it over each group row and over a pinned footer of grand totals: five built-ins or a function of your own, respecting the filters, formatted by an `AggregateCell`.
- **[Excel and CSV, with nothing to install](#excel-and-csv-with-nothing-to-install)** — `def.export` writes an `.xlsx` with its groups as Excel outline levels and a CSV beside it: 3.80 KB gz behind a dynamic import, no ExcelJS, against the $999/dev/yr the same feature costs elsewhere.
- **[A grid that fetches its own rows](#a-grid-that-fetches-its-own-rows)** — `def.dataSource` is one function the grid asks for a block at a time: a million rows scrolled with no array in the page, sort and filter round-tripped, a superseded request aborted and a late answer dropped. +2.51 KB gz, against the $999/dev/yr the same row model costs elsewhere.
- **[A group the server counts, and children it fetches when you open one](#a-group-the-server-counts-and-children-it-fetches-when-you-open-one)** — `grouping: true` puts _Group By_ back with a datasource set: the request carries `groupBy` and `groupKeys`, a group row brings its own count and totals, and a group nobody has opened costs the page nothing. +1.45 KB gz.
- **[A grid whose rows hold rows](#a-grid-whose-rows-hold-rows)** — `def.treeData` turns the rows into a tree, nested in the data or named by a path on each row: a chevron and an indent on one column, a `treegrid` with the keyboard APG asks for, a filter that keeps the path to a match, and nothing built under a row nobody has opened.
- **[A tree the server holds, one level per chevron](#a-tree-the-server-holds-one-level-per-chevron)** — `def.treeData` beside `def.dataSource`: the request carries `treeKeys`, `hasChildren` says which rows have a level to ask for, and 144,732 rows cost the page one of them.
- **[A cell you can type into, and one place that judges it](#a-cell-you-can-type-into-and-one-place-that-judges-it)** — `column.editable` plus `def.onCellEdit`, which both validates an edit and is told about it, sync or async: four editors read off the value, APG's keys, a refused value announced in a `role="alert"`, and an edit stream for a host's undo.
- **[Grouping can be declared now, not only clicked](#grouping-can-be-declared-now-not-only-clicked)** — `def.groupBy` and `def.groupDefaultExpanded`: a grid that starts grouped, which is what a server render, a fixture and a demo all needed.
- **[The component contract, written down and enforced](#the-component-contract-written-down-and-enforced)** — five rules every component keeps: state in `useControllableState`, every change reported with a named reason, Box props on every part, a style tree to replace, and a render prop instead of `asChild`. A check with two ledgers that both fail on a stale entry is what keeps them true.

## The package tells an agent how to use it

A coding agent has priors about a library this new, and they are wrong: the prop names collide with Tailwind's and Chakra's while the numbers mean something else, so the failure mode is code that compiles and is laid out wrong. The cheapest fix is a file in the tree it already greps, so the tarball carries one:

```shell
node_modules/@box-kite/react/
  AGENTS.md                the rules, and the block that argues with the model's priors
  docs/props.md            all 221 props, the CSS each writes, and one measured example
  docs/components.md       every component, its import, and whether it renders on a server
  docs/a11y.md             the behaviour hooks, for a pattern the library does not ship
  BOX_KITE_AI_CONTEXT.md   the long-form reference, as before
```

`AGENTS.md` is the file agents look for: Codex, Cursor, Copilot, VS Code, Windsurf, Cline and Zed read a root one natively, and Claude Code reads `CLAUDE.md`, so a file holding the one line `@AGENTS.md` points it at the same place.

```shell
cp node_modules/@box-kite/react/AGENTS.md ./AGENTS.md
```

None of it is written by hand. `docs/props.md` comes from the prop reference, where every example is measured from the CSS the engine emits rather than quoted from a doc; `docs/components.md` is read out of the built chunks' own exports; `AGENTS.md` inlines the rules file. The build fails if a generated file comes out empty, if a component no longer loads, or if the prop count disagrees with the registry.

## Every docs page is also markdown

The other half of the same problem: an agent that fetches a documentation page gets an HTML shell and a JavaScript bundle, and its usual answer is to guess instead. Every page on [box-kite.dev](https://www.box-kite.dev/) now answers in markdown at its own address with `.md` appended, and [llms.txt](https://www.box-kite.dev/llms.txt) is the index — one line per page, the four facts to read before writing any props, and the props and components that still work under an older name.

```shell
curl https://www.box-kite.dev/llms.txt      # the index: every page, and what each one covers
curl https://www.box-kite.dev/box.md        # any page, as markdown — append .md to the address
curl https://www.box-kite.dev/props.md      # every prop, the CSS it writes, one measured example
curl https://www.box-kite.dev/llms-full.txt # all of it in one file, for a tool that indexes a site
```

The pages are **converted from the rendered HTML during the build**, not written a second time: a mirror that can fall behind the page it mirrors is worse than none, because it is the copy an agent trusts. `props.md` is the same file the tarball carries as `docs/props.md`, from the same generator, and the facts in `llms.txt` are read out of `AGENTS.md` — so there is one statement of each of them in the repository. Both forms of the address work, `/box.md` and `/box/index.md`, and each page names the address it is a copy of.

Every page also links its own markdown at the foot of the page.

## The rules install as a skill

The third address for the same instructions, and the first one that is a command rather than a copy. Agent Skills are an open standard about forty-five coding agents read, so one `SKILL.md` reaches nearly all of them — and unlike a file copied into a repository, an install command brings the current one:

```shell
npx skills add box-kite/box-kite                # Claude Code, Cursor, Codex, Copilot, Gemini CLI, Zed…
npx skills add box-kite/box-kite -a cursor -g   # one agent, and globally
```

In Claude Code the repository is also a plugin marketplace, so the skill installs and updates with the plugin machinery:

```shell
/plugin marketplace add box-kite/box-kite
/plugin install box-kite@box-kite
```

Cursor takes the same rules as a rule file of its own, glob-attached to the files where props get written rather than loaded on every request:

```shell
mkdir -p .cursor/rules
cp node_modules/@box-kite/react/.cursor/rules/box-kite.mdc .cursor/rules/
curl -O https://www.box-kite.dev/box-kite.mdc   # or without the package installed
```

The skill is **shorter than the file it replaces and says more**. Its body is the four facts a model's priors get wrong, the twenty-nine rules, a divider table measured from the engine — `p={4}` is `padding: 1rem` and `b={4}` is `border-width: 4px`, the same number twice — the deprecations, and a table of contents. The depth moved into four references it loads only when a question needs one: `styling.md` (every prop by category, the six kinds of nesting, the theme), `components.md` (which component replaces which `<Box tag>`, and the Dropdown, Select and DataGrid), `extending.md` (`Box.extend()` and `Box.components()`) and `patterns.md` (server rendering, the behaviour hooks, portals, form controls, the tooltip). A skill's body loads in full every time it is used, so what an agent pays for on a `p={4}` question dropped from 49 KB to 21 KB.

All three files are generated from the sources the library is built from — the rules file, the prop reference, the lead block of `AGENTS.md`, the `@deprecated` tags — and CI fails if one has been edited by hand instead of its source. The docs site serves the first two at [skill.md](https://www.box-kite.dev/skill.md) and [box-kite.mdc](https://www.box-kite.dev/box-kite.mdc), generated the same way, for an agent that can fetch a URL but not run a command; `llms.txt` lists both.

## Every component page states its own API

Every component page on [box-kite.dev](https://www.box-kite.dev/) now ends in four sections — **props**, **keyboard**, **accessibility** and **style tree** — and not one of them is typed out by hand:

- **Props** come from the component's own props interface: the name, the type as the source writes it, the default read out of the destructuring, and the description from its JSDoc — which is the same text an editor shows on hover. Only the props a component adds are listed; all 221 Box props apply too and stay on [/box](https://www.box-kite.dev/box).
- **Keyboard** comes from `@keyboard` tags on the component, one per row. A component with two maps says which is which: the [Dropdown](https://www.box-kite.dev/dropdown) lists select-only and `isSearchable` separately, and the [DataGrid](https://www.box-kite.dev/datagrid) lists the column resizer apart from the grid.
- **Accessibility** is the APG pattern it implements, the roles and ARIA it owns as `@a11y` lines, and what the axe sweep covered — by fixture name, so "swept" says which states were swept.
- **Style tree** is read out of the component styles themselves: every node `Box.components()` can restyle, its variants, and what it extends.

The point of generating it is the failure mode it removes. A keyboard table written beside a component is true on the day it is written; CI now fails when a documented prop has no prose, when a documented **key** is one no test presses, and when a component's page renders no reference at all — which is how four components turned out to be claiming keys that nothing exercised. They have keyboard tests now.

```shell
npm run docs:components   # write api/components/*.json from the components
npm run check:components  # fail when the reference, the tests or a page have drifted
```

The markdown mirror carries all of it, so `curl box-kite.dev/switch.md` is the whole reference as tables.

## Three props for a table, and a list that shows its markers

`Box` is `display: block` whatever element it renders, which is right until the element brings its own layout — and then there was no prop to say so. The values arrived with the SVG work; the properties that make a table _look_ like a table did not:

```tsx
<Box tag="table" display="table" borderCollapse="collapse" tableLayout="fixed">
  <Box tag="tbody" display="table-row-group">
    <Box tag="tr" display="table-row">
      <Box tag="td" display="table-cell" px={3}>Ada</Box>
```

- **`borderCollapse`** — `collapse` or `separate`, the value that makes a bordered table read as one grid.
- **`borderSpacing`** — the gap between a `separate` table's cells, on the ÷4 spacing scale, so `borderSpacing={2}` is `0.5rem`.
- **`tableLayout`** — `fixed` sizes a table from its own width and first row, so one long cell cannot widen its column.

A list had the same gap from the other direction: `display` gained **`list-item`**, and `listStyle` the markers it was missing (`disc`, `circle`, `decimal` beside `square`), so a `<Ul>` built from Boxes shows bullets and keeps the list semantics Chrome derives from that display value.

## A floating layer is six props, and no JavaScript

Positioning a tooltip, a popup or a badge against something else has meant measuring: read the trigger's rectangle, work out whether the layer fits, listen for scroll and resize, and re-measure. CSS Anchor Positioning moves all of it into the engine, and this release makes it six props:

```tsx
<Button anchorName="menu-trigger">Options</Button>

<Box position="absolute" positionAnchor="menu-trigger" positionArea="block-end span-all" positionTryFallbacks="flip-block" mt={2}>
  …
</Box>
```

- **`anchorName`** names the element other things can hang off. The `--` CSS insists on is optional here and added on the way out, the way a `vars` key's is, so `"menu-trigger"` and `"--menu-trigger"` name the same anchor.
- **`positionAnchor`** is the layer's end of that link, beside `position="absolute"`.
- **`positionArea`** is which cell of the 3×3 grid around the anchor to sit in, and it replaces the side-and-alignment arithmetic entirely. **Block axis first, inline axis second** — the order `borderRadiusStartStart` already reads in — and the two keywords come from one family, so `"block-end center"` and `"top left"` are values while `"top inline-start"` is not. Offset the layer from its anchor with an ordinary margin.
- **`positionTryFallbacks`** is the flip: `flip-block`, `flip-inline`, `flip-start`, space-combined into one candidate position or comma-separated into a list tried in order.
- **`positionTryOrder`** picks the roomiest candidate instead of the first that fits, and **`positionVisibility`** hides the layer once its anchor scrolls out of sight (`anchors-visible`) or once the layer itself would overflow (`no-overflow`).

`justifySelf` and `alignSelf` also gained **`anchor-center`**, which centres a layer on the anchor's other axis.

Two things worth knowing, both measured in Chrome 152 rather than read off the spec. **A candidate position has to fit on _both_ axes to be taken**, so an overflow the flips cannot fix disqualifies every one of them and the layer silently stays put: with `positionArea="block-end center"` a layer wider than its anchor overflows the centre column, and `flip-block` then does nothing at all. Span the axis you are keeping — `"block-end span-all"` — and it flips. And **`positionVisibility` hides at paint time**, so the layer keeps its box and its computed `visibility` still reads `visible`; a test that checks this needs a screenshot, not a computed style.

The engine validates all of it, so a value the browser would drop emits no rule and no class: `positionArea="top inline-start"` mixes two families, `positionTryFallbacks="flip-sideways"` is not a keyword, and `anchorName="2bad"` is not an identifier — none of the three reaches CSS.

Support is Chrome 125+, Firefox 147+ and Safari 26+. Where it is missing the layer simply renders unpositioned, so this is the CSS-first half of the story; `Overlay` still measures, and the shared hook that picks between the two paths is the next step.

## One hook places a floating layer, and a length can come off the anchor

The six props above are the placement; this is the hook that writes them for you, and the two value families that make a layer size itself against its trigger with nothing measured.

```tsx
import { useAnchorPosition } from '@box-kite/react/anchor';

const { css, anchorProps, layerProps } = useAnchorPosition({ side: 'bottom', align: 'start', offset: 2, matchWidth: true });

<Button {...anchorProps} onClick={toggle}>
  Options
</Button>;
{
  isOpen && (
    <Box {...layerProps} component="menu">
      …
    </Box>
  );
}
```

Spread `anchorProps` on the trigger and `layerProps` on the layer, and on a browser with CSS anchor positioning that is the whole of it: nothing runs — no measuring, no scroll listener, no state, nothing to keep in sync when the page moves. `side` is `'top'`/`'bottom'` (the block axis) or `'start'`/`'end'` (the inline one, so it mirrors in a right-to-left page), `align` lines the layer up with one of the anchor's edges, `offset` is the ÷4 spacing scale and lands as the margin on the side facing the anchor, and `flip` is on by default. Where the browser has no anchor positioning — Safari below 26, Firefox below 147 — the hook measures instead, flipping to the opposite side and shifting along the other axis to stay in the viewport; both paths come out of one model, so the fallback is the CSS placement worked out by hand rather than a second set of rules. `css` in the result says which one ran.

`matchWidth` is one line of CSS rather than a measurement, because **every sizing prop now takes an `anchor-size()` value and every single-side inset prop an `anchor()` one**:

```tsx
<Box position="fixed" positionAnchor="menu-trigger" minWidth="anchor-size(width)" maxHeight="anchor-size(height, 20rem)" />
<Box position="fixed" top="anchor(bottom)" insetStart="anchor(left)" />
```

`anchor-size()` takes an axis (`width`, `height`, `block`, `inline` and the `self-` twins), `anchor()` an edge (`top`, `right`, `bottom`, `left`, `start`, `end`, `center`, `inside`, `outside`) or a percentage along one. Both take an optional anchor name first — with the same optional `--` the props take — and an optional fallback after a comma, and both are validated, so a typo emits no rule rather than a broken declaration. Together they are what lets a layer be placed and sized in a Server Component, with no hook at all.

Three things worth knowing, all measured in Chrome 152:

- **The layer is `position: fixed`**, so it escapes every `overflow: hidden` ancestor with no portal — but not a _transformed_ one, which is a fixed element's containing block either way, and not the page's stacking order. [`Overlay`](https://www.box-kite.dev/overlay) is still the answer when the layer has to come out on top of everything.
- **A flip is sticky.** Once the browser takes one it keeps it until the layer is laid out afresh, which is what stops it oscillating as the page scrolls. Hiding the layer and showing it again re-evaluates, so a popup that mounts when it opens always picks the side that fits, while one that stays mounted keeps the side it first chose.
- **The anchor's name is an inline style rather than a prop.** An identity is per instance, so a class for it would be a rule per instance that is never freed — everything shared (the area, the flip, the margin, the width) is an ordinary prop and an ordinary class.

The whole surface is on [/anchor](https://www.box-kite.dev/anchor), with a live playground for the twelve placements.

## Every popup in the library is placed by the browser

The hook above is what the pre-built layers use now. `Overlay` is `useAnchorPosition` plus the browser's top layer (a portal, when that release shipped — see below), and `Tooltip`, the `Dropdown` popup and the DataGrid column menu are `Overlay` — so a popup in this library is placed by `position-area` and flipped by `position-try-fallbacks`, and on a browser with CSS anchor positioning nothing runs to keep it there: no measurement, no scroll listener, no state.

```tsx
<Overlay anchor={triggerElement} side="bottom" align="start" offset={2}>
  anything, anywhere
</Overlay>;

<Tooltip content="Deletes the row for good" side="end" offset={2}>
  {(trigger) => <Button {...trigger}>Delete</Button>}
</Tooltip>;
```

**One placement vocabulary**, the hook's: `side` is `'top'`/`'bottom'` on the block axis or `'start'`/`'end'` on the inline one — so a layer beside its anchor mirrors in a right-to-left page — `align` lines it up with one of the anchor's edges, `offset` is the gap on the ÷4 spacing scale, and `flip` lets the browser move a layer that does not fit. `anchor` is the element to hang off, and `matchWidth` makes the layer at least as wide as it. The transforms and callbacks these components used to take are gone; the migration is in [Breaking changes](#breaking-changes) below.

**Three home-grown flip heuristics went with it.** The dropdown popup opened upward when its trigger was below the middle of the viewport, the column menu opened leftward when its button was in the right half of it, and the tooltip never flipped at all — none of the three asked whether the layer actually fits. The browser does, and it is right in the cases the heuristics were wrong about: a trigger low on a tall page with room under it keeps its popup below, and one with no room gets it above.

Four things worth knowing, all measured in Chrome 152:

- **Escaping a clipped ancestor was never what the portal was for.** `position: fixed` already escapes every `overflow: hidden` ancestor; what it does not escape is a _transformed_ ancestor (a fixed element's containing block) or the page's stacking order. The portal was for those two, and the top layer replaced it for both — see [Every floating layer is in the top layer](#every-floating-layer-is-in-the-top-layer-and-the-portal-is-gone). Either way it composes with anchor positioning, because an `anchor-name` is not scoped to a subtree.
- **A flip needs three candidates, not one.** A candidate position has to fit on _both_ axes, so a lone `flip-block` does nothing at all for a layer that overflows the _cross_ axis — the browser leaves it pressed against the edge of the viewport. `flip` offers the side's own axis, the alignment's, and both, in that order, which is what makes a column menu aligned to its button's end mirror to the other end near the edge of the page instead of running off it.
- **Knowing which side the browser chose costs the entrance.** `Overlay`'s `onSideChange` reads the _used_ `position-area`, and that read is the style resolution `@starting-style` computes its before-change style from — so a class depending on the answer always lands after the entrance has been decided. An exit runs long afterwards and can use it, which is why `dropdown.items` keeps `closedUp` and has no `up`.
- **A used `position-area` is not the value that went in.** A `span-all` half is dropped (`block-end span-all` reads back `block-end`) and a value naming both axes comes back in the `start`/`end` shorthand, where position names the axis rather than a keyword: `block-end span-inline-end` reads back `end span-end`, and `start span-end` once it has flipped.

## A popover is a browser feature now, not a portal

Every floating panel in React has been the same pile of workarounds: a portal so it escapes `overflow: hidden`, a z-index so it lands on top, a click-outside listener, an Escape listener, and code to put focus back. The browser owns all five now, and `<Popover>` is what that looks like:

```tsx
import Popover from '@box-kite/react/components/popover';

<Popover label="Filters" trigger={(t) => <Button {...t}>Filters</Button>}>
  <Checkbox label="Only mine" />
</Popover>;
```

That is the whole thing. The panel carries the `popover` attribute, so it is in the browser's **top layer**; the trigger carries `popovertarget`, so the browser toggles it; light dismiss and focus return come with them. The component supplies what the platform deliberately does not — the `role="dialog"`, the name, `aria-expanded`/`aria-haspopup`/`aria-controls` on the trigger, moving focus into the panel on open, and `onOpenChange(open, { reason })`.

**There is no portal, and that is the point.** A top-layer element paints above every stacking context and outside every clipped ancestor — measured in Chrome 152 against a sibling with `z-index: 9999`, a `transform`ed ancestor and an `overflow: hidden` one, where `position: fixed` loses two of the three. Because nothing is moved, the panel keeps what it inherits where it was written: the theme around it, the custom properties, the text direction, and its place in the tab order — trigger, then panel, then the rest of the page. A portalled layer has none of that for free.

It is also **smaller by a lot**. `@radix-ui/react-popover` is 23.54 KB gz with React external (it bundles its own positioning); `<Popover>` adds **3.46 KB gz** on top of a `Box` an app already has, and 1.03 KB where `Tooltip` or `Dropdown` already ship the placement and behaviour chunks it shares. Both figures measured, minified and gzipped, the same way.

Three things worth knowing, all measured rather than read off the spec:

- **The panel is always rendered**; closed is `display: none`, not unmounted. That is what lets the browser own showing and hiding — and it is what makes the exit a plain CSS transition rather than a `<Presence>`, since nothing leaves the DOM to be held back. The entrance is `startingStyle`, the exit is `transitionBehavior="allow-discrete"`, and both are already in the component's styles. Children that are expensive to build should be gated by the consumer: `{open ? <Heavy /> : null}`.
- **A close cannot be refused.** The platform's `beforetoggle` is cancelable opening and not cancelable closing, so a controlled `<Popover open>` can decline to open but hears about a light dismiss only after it has happened. Keep `open` true and the component shows the panel again rather than arguing with the browser.
- **The trigger has to be a button**, because `popovertarget` is what the browser reads off one — and handing the toggle over is what fixes the trap every hand-rolled popover falls into. Light dismiss closes on `pointerdown`, so a click handler of your own runs afterwards, reads "closed" and opens the panel straight back up; pressing the trigger of an open popover would never close it.

Where the browser has no Popover API the panel falls back to an `Overlay` — a portal — with `useDismiss` and `useFocusReturn` supplying what the platform would have. The props are identical and so is the styling; what is lost is what the portal costs. Both paths are on [/popover](https://www.box-kite.dev/popover).

## Every floating layer is in the top layer, and the portal is gone

`<Popover>` above needs no portal because the browser's top layer replaces one. The same is now true of every other layer the library ships: `Overlay` renders where it is declared and carries `popover="manual"`, and `Tooltip`, the `Dropdown` popup and the DataGrid column menu are `Overlay` — so nothing in the library portals any more.

```tsx
<Box.Theme use="local" theme="dark">
  <Dropdown<string> label="Fruit">
    <Dropdown.Item value="a">Apple</Dropdown.Item>
  </Dropdown>
</Box.Theme>
```

The popup is dark now. That is the change in one example: a layer that stays in the DOM it was written in **inherits** — the theme around it, the custom properties, the text direction — where a portalled one hung off the end of `<body>` and inherited nothing, which is why `Overlay` used to measure the direction off its anchor and copy it back on as a `dir`.

`manual` rather than `auto` is the deliberate part. Light dismiss is a _pattern_, and `Overlay` implements none: `<Popover>` is the `auto` one. The three components built on it each own a dismissal already, and each is stricter than the platform's — a tooltip's Escape has to _last_, which WCAG 1.4.13 asks for and light dismiss does not do, and a dropdown's trigger toggles in JavaScript, which light dismiss fights for the reason the `<Popover>` section describes.

Four things worth knowing, all measured in Chrome 152:

- **The top layer beats what `position: fixed` cannot.** A layer in it paints over a `z-index: 9999` sibling and out of a `transform`ed ancestor; a plain fixed layer at the same coordinates is covered by both. That is what the portal was for, and it is no longer what the portal is needed for.
- **A press inside a layer is a press inside whatever popover it was _declared_ in.** So a `Dropdown` inside a `Popover` panel no longer dismisses the panel when you open its popup or choose an option — the bug a portal caused by moving the popup to the end of the body, where every press in it read as a press outside the panel. Nothing was configured to fix it; DOM containment is simply real again.
- **The tab order follows the markup**, so a layer declared after its trigger is what Tab reaches next, and nothing has to be said with `aria-owns`.
- **Mounting is unchanged.** `<Presence>` still owns it, so a closed dropdown renders none of its options and a closed tooltip renders nothing at all — and an exit transition runs in the top layer like anywhere else. This is the opposite trade from `<Popover>`, whose panel is always rendered because the browser owns its toggle.

One thing the top layer costs, and it is worth knowing before you reach for a layer: **it keeps the side it chose when it opened.** Chrome re-evaluates `position-try-fallbacks` on scroll for an ordinary positioned element and never for one in the top layer, so a layer left open while the page scrolls does not flip when its side runs out of room — it slides past the viewport edge instead. Measured in Chrome 152, both with the library and in hand-written CSS against an otherwise identical element outside the top layer, which does flip.

Every _open_ picks the right side, because a layer that mounts when it opens is laid out for the first time then, and that is the common case: a dropdown opened near the bottom of the window still opens upwards. Only a scroll _while_ the layer is open is affected. Nothing but leaving and re-entering the top layer re-arms the browser, so close a layer if the page can scroll far underneath it — and note that `<Popover>` shares this, since its panel is in the same top layer, while the no-Popover-API fallback measures and therefore flips.

Where the browser has no Popover API the layer is portalled into `#box-kite-portal` exactly as before, with everything a portal costs. The one thing to check when upgrading is in [Breaking changes](#breaking-changes) below: a layer must not be declared _inside_ its trigger any more.

## A modal dialog is a browser feature too

`<Dialog>` is a real `<dialog>` shown with `showModal()`, and that one call is the pattern: the top layer, the `::backdrop`, an inert page behind it, Escape, focus containment and focus return are the browser's. There is no focus trap in this component, no `aria-hidden` sweep over the page, and no `z-index` anywhere.

```tsx
import Dialog, { AlertDialog } from '@box-kite/react/components/dialog';

<Dialog trigger={(t) => <Button {...t}>Rename</Button>}>
  <Dialog.Title>Rename this view</Dialog.Title>
  <Dialog.Description>The name is only shown to you.</Dialog.Description>
  <Textbox name="name" props={{ 'aria-label': 'Name' }} />
</Dialog>;
```

**Rendering a `Dialog.Title` is what names the dialog.** It writes `aria-labelledby`, a `Dialog.Description` writes `aria-describedby`, and neither attribute exists when the part is absent — so a name and a visible heading cannot drift apart, and a reference never points at nothing. A dialog that shows no heading takes `label`, `labelledBy` or `describedBy` instead.

What the component adds on top of the element: `role="dialog"`, the naming above, `aria-haspopup="dialog"`/`aria-expanded`/`aria-controls` on the trigger, `open`/`defaultOpen`/`onOpenChange(open, { reason })` — `trigger`, `escape`, `outside-pointer` or `imperative`, the last covering a `close()` call and a `<form method="dialog">` submit alike — `modal` (`false` is `show()`: no backdrop, nothing inert), `dismissible`, `lockScroll`, and `initialFocus`.

`<AlertDialog>`, a named export of the same module, is the interrupting kind:

```tsx
const cancel = useRef(null);

<AlertDialog initialFocus={cancel} trigger={(t) => <Button {...t}>Delete</Button>}>
  <AlertDialog.Title>Delete this view?</AlertDialog.Title>
  <AlertDialog.Description>Nothing here can be undone.</AlertDialog.Description>
  <Button bgColor="rose-600">Delete</Button>
  <Button ref={cancel}>Cancel</Button>
</AlertDialog>;
```

`role="alertdialog"` tells a screen reader the content is an alert rather than a panel, so the name and the description are announced together the moment it opens. It is always modal and **never dismissed by a press outside** — a decision that can be clicked away is one the user did not make — while Escape still closes it, because a keyboard user must always have a way out. `initialFocus` is APG's requirement that focus land on the least destructive action, so a deletion cannot be confirmed by reflex.

Four things worth knowing, all measured in Chrome 152:

- **The dialog is always rendered**, and closed is `display: none` rather than unmounted — the same shape as `<Popover>`, and what lets the browser own showing and hiding. The exit is therefore a CSS transition (`transitionBehavior="allow-discrete"`, already in the component styles, and it covers the `::backdrop` too) and never a `<Presence>`. Gate expensive children yourself with `{open ? <Heavy /> : null}`.
- **A close cannot be refused.** The `cancel` event is cancelable, but the browser has already closed the dialog by the time `onOpenChange` runs, so a controlled `<Dialog open>` hears about a dismissal afterwards and keeping `open` true shows it again. `dismissible={false}` is how a decision is made unavoidable.
- **For a modal dialog the backdrop _is_ the dialog element.** A press on it targets the `<dialog>`, which is why every hand-rolled outside-press check calls a backdrop click "inside". The platform's own `closedby="any"` gets it right and the component writes it; where a browser has not got that yet, the press is measured against the dialog's own box instead.
- **The platform does not stop the page scrolling** — `overflow` on `<html>` stays `visible` while a modal dialog is open, and a wheel over the backdrop scrolls the page behind it. That is the whole reason `lockScroll` exists, and it defaults to whatever `modal` is rather than being unconditional: it is an `overflow: hidden` class held by a counter, so an inner dialog closing cannot unlock the page under an outer one. The scrollbar's width leaves the page as the lock is applied, so a document that must not shift wants `scrollbarGutter="stable"`.

The style tree in `Box.components('dialog')` deliberately says almost nothing about position or size: the browser's own stylesheet centres a modal dialog in the viewport and caps it at `calc(100% - 6px - 2em)`, which is better than any default here could express. The **one** exception is `margin: auto`, which it has to declare because every Box carries `margin: 0` and an author rule outranks the UA's — without it a modal dialog sits in the corner instead of the middle. `display: none` while closed is declared for exactly the same reason.

It is also **smaller by a lot**. `@radix-ui/react-dialog` is 13.28 KB gz with React external and `@radix-ui/react-alert-dialog` is 13.64 (13.81 for both, since they share code); `<Dialog>` and `<AlertDialog>` together add **2.15 KB gz** on top of a `Box` an app already has. Both figures measured, minified and gzipped, the same way.

Because nothing is portalled, a local `Box.Theme` reaches inside a dialog the way it now reaches inside a dropdown: a top-layer element still matches the `.dark .className` rules of the ancestor it was declared in, and still inherits its custom properties and its text direction. Measured both with the library and in hand-written CSS.

## A menu, and its submenus, are nested popovers

`<Menu>` (`components/menu`) is APG's [menu button](https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/) on the same Popover API `<Popover>` and `<Dialog>` stand on — and a submenu is a popover nested inside its menu, which is what the platform's own nesting rules are for.

```tsx
import Menu from '@box-kite/react/components/menu';

<Menu trigger={(t) => <Button {...t}>Actions</Button>}>
  <Menu.Item onSelect={duplicate}>Duplicate</Menu.Item>
  <Menu.Item disabled>Move</Menu.Item>
  <Menu.Separator />
  <Menu.Group label="View">
    <Menu.CheckboxItem checked={compact} onCheckedChange={setCompact}>
      Compact rows
    </Menu.CheckboxItem>
  </Menu.Group>
  <Menu.RadioGroup label="Sort by" value={sort} onValueChange={setSort}>
    <Menu.RadioItem value="name">Name</Menu.RadioItem>
    <Menu.RadioItem value="date">Date added</Menu.RadioItem>
  </Menu.RadioGroup>
  <Menu.Sub label="Share">
    <Menu.Item onSelect={copyLink}>Copy link</Menu.Item>
  </Menu.Sub>
</Menu>;
```

**The platform's half is the layer.** The menu is in the top layer, so it paints over every stacking context and outside every clipped ancestor with no portal and no `z-index`; light dismiss is the browser's, and it closes the innermost menu first — one layer per Escape, a submenu before the menu it came out of — while a press outside closes the lot. The trigger's toggle is `popovertarget`, including the press that closes an open menu from its own button. All of it measured in Chrome 152.

**The component's half is the pattern.** `role="menu"` named by its trigger (APG's rule, so a menu needs no `label` of its own), `menuitem`, `menuitemcheckbox` and `menuitemradio` with `aria-checked`, `role="group"` around a titled section and `role="separator"` between them. Then the keys: Down and Up wrapping at the ends, Home and End, typeahead where a longer buffer narrows and the same letter again cycles, and Right and Left for a submenu — in **reading order**, so the two swap in a right-to-left menu and the chevron turns round with them from a single `rtl` rule.

`Menu.Sub` renders both halves of a submenu: the item that opens it — `aria-haspopup="menu"`, `aria-expanded`, the chevron — and the menu beside it, declared _inside_ the menu it belongs to. It takes the same four placement props as the menu (`side`/`align`/`offset`/`flip`), defaulting to `side="end"` and `offset={0}` so it abuts the menu it came out of, and submenus nest as deeply as the markup does.

Four things worth knowing, each of them measured:

- **A disabled item is `aria-disabled` and stays focusable.** That is APG's rule, and the `disabled` attribute would break it: an item out of the keyboard's reach is an item a keyboard user cannot discover. The arrows land on it, a screen reader announces it as unavailable, and activating it does nothing.
- **A command closes the menu and a state does not.** `Menu.Item` closes on select, because choosing a command is the end of the visit; `Menu.CheckboxItem` and `Menu.RadioItem` stay open, so several boxes can be ticked in one go. `closeOnSelect` swaps either default. `onOpenChange` reports **`select`** and **`tab`** beside the four reasons every layer in the library reports, so "the user chose something" and "the user dismissed it" are told apart without guessing.
- **The menu is always rendered**, closed being `display: none` rather than unmounted — the same shape as `<Popover>` and `<Dialog>`, and what lets the browser own showing and hiding. The exit is a CSS transition rather than a `<Presence>`; gate expensive items yourself with `{open ? <Items /> : null}`.
- **The platform returns focus for the outermost layer only.** Closing a nested popover drops focus to `<body>` — so a submenu puts focus back on its own item itself, before the browser hides the panel, and the move never lands anywhere visible. Opening a submenu moves focus into it, hover included, which is what keeps the highlight and the keyboard in the same place.

It is **smaller by a lot**: `@radix-ui/react-dropdown-menu` is 30.85 KB gz with React external, where `<Menu>` and all seven of its parts add **6.36 KB gz** on top of a `Box` an app already has. Both figures measured, minified and gzipped, the same way.

The four marks a menu draws — the tick, the radio dot, the chevron and the slot they sit in — are borders and a radius rather than an asset, so the library still ships no icons, and each is a node in the style tree (`menu.item`, `menu.group`, `menu.label`, `menu.separator`, `menu.indicator`, `menu.check`, `menu.dot`, `menu.arrow`). The highlight is drawn on `:focus`, because in a menu focus _is_ the highlight: the pointer moves it, so hover and the keyboard cannot disagree.

One name had to move out of the way. The semantic `<menu>` element is **`MenuList`** in `components/semantics` now; `Menu` is still exported there and still works, but it is deprecated — two exports of that name are one import away from the wrong component.

## Tabs, where selection follows focus

`<Tabs>` is APG's tabs pattern: one list of tabs over one panel at a time, with four parts, a fifth for when the panels should resize, and nothing to wire up.

```tsx
import Tabs from '@box-kite/react/components/tabs';

<Tabs defaultValue="overview" onValueChange={(value, { reason }) => log(value, reason)}>
  <Tabs.List label="Project">
    <Tabs.Tab value="overview">Overview</Tabs.Tab>
    <Tabs.Tab value="activity">Activity</Tabs.Tab>
    <Tabs.Tab value="audit" disabled>
      Audit log
    </Tabs.Tab>
  </Tabs.List>
  <Tabs.Panel value="overview">Who is on it, and what is left.</Tabs.Panel>
  <Tabs.Panel value="activity">What changed this week.</Tabs.Panel>
</Tabs>;
```

**Selection follows focus**, which is APG's default and what a reader expects: one arrow key moves to a tab _and_ shows its panel. `activation="manual"` splits the two — the arrows move, and Enter or Space chooses — which is what a panel too expensive to render on the way past needs.

The keyboard is the pattern's whole surface, and all of it is here. Tab enters the list once, landing on the selected tab, and again leaves it for the panel: one tab stop for the list however many tabs it holds, and the panel carries `tabindex="0"` so its content is reachable whether or not anything inside it is focusable. Right and Left move in a horizontal list, Down and Up in a vertical one, both wrapping at the ends unless `loop={false}`, and Home and End go to the first and last tab. The **off-axis pair is deliberately left to the page**, so a horizontal tablist does not eat a scroll.

The arrows follow the **reading order**: in a right-to-left page ArrowLeft is the _next_ tab, read off the element's own resolved direction rather than an ancestor's `dir` attribute. A vertical list moves its indicator to the inline end for the same reason — `be`, not `br`, so it mirrors with the reading order instead of staying on the right.

Four things worth knowing:

- **A disabled tab is not selectable, and the arrows step over it.** That is the opposite of `Menu.Item`, which APG asks stay reachable, and the difference is what selection following focus costs: a tab focus could land on but selection could not would leave the widget with no state to be in.
- **Only the selected panel is rendered.** An unmounted panel costs nothing and gets an entrance for free, since `startingStyle` runs on the mount — but it also loses whatever state it held, so `keepMounted` renders them all and hides the rest, which is what a panel holding a half-filled form wants. A hidden panel carries the `hidden` attribute _and_ a `display: none` rule of its own, because every Box carries `display: block` and any author rule outranks the UA's `[hidden]` one.
- **The tabs are read off the DOM, not out of a registry.** A tab a consumer wrapped in a layout of their own, rendered from a list or put behind a condition is in the order it was written and navigates like any other — and a nested set of tabs belongs to its own list rather than the one around it.
- **The tab sequence follows the selection.** Change a controlled `value` from somewhere else on the page and the keyboard's entry point moves with it, so Tab never enters the list at a tab whose panel is not the one on screen. Under `activation="manual"` the tab sequence follows the _focus_ instead, which is what APG's own example does: arrow away, Tab out and back, and you return to the tab you had reached.

`onValueChange` reports the new tab and why it changed — `'click'` or `'keyboard'` — and the keyboard reason survives Enter and Space in manual activation, because the handler gets in front of the click a `<button>` would synthesize from the key.

**Two things move, and both are opt-in.** `indicator="sliding"` replaces the border each tab draws with one element for the whole list, which animates between tabs because it _is_ the same element. Wrapping the panels in a `Tabs.Panels` gives that container the height of the panel on screen, so a switch between panels of different heights is a transition rather than a jump.

```tsx
<Tabs defaultValue="summary" indicator="sliding">
  <Tabs.List label="Release">
    <Tabs.Tab value="summary">Summary</Tabs.Tab>
    <Tabs.Tab value="changelog">Changelog</Tabs.Tab>
  </Tabs.List>
  <Tabs.Panels>
    <Tabs.Panel value="summary">One line, and the box is one line tall.</Tabs.Panel>
    <Tabs.Panel value="changelog">Four, and it grows to fit them.</Tabs.Panel>
  </Tabs.Panels>
</Tabs>
```

Both are measured, which has three consequences worth knowing. The travelling indicator **appears once the widget has run**, so until then — every prerendered page, and any reader whose JavaScript never arrives — the tabs keep drawing their own border; the two sit in exactly the same place, so the handover is invisible and a static page is never left with no indicator at all. The panel container **watches the panel and never itself**, because its own height is what it writes: watching that would be the loop, and watching the panel catches a reflow — a line that wraps, a font that lands — as well as a switch. And both ride `--transitionTime`, so under `prefers-reduced-motion` each computes to `0s` and the bar and the box land on their new values in the same frame, with no opt-out to remember.

The container is **clipped only while its height is travelling**. It has to be: a panel already at its full height inside a container still on the way there paints over whatever follows the tabs. But at rest the container is exactly as tall as its panel, so a permanent clip would cut the focus ring off every element sitting at that edge — and it would be a clip on _both_ axes whatever was asked for, since `overflow` computes a `visible` companion to a clipped axis up to `auto`.

It is **smaller**: `@radix-ui/react-tabs` is 9.18 KB gz with React external, where `<Tabs>` and all four of its parts add **3.03 KB gz** on top of a `Box` an app already has. Both figures measured, minified and gzipped, the same way. About 1.16 KB of that is the two things that move, and it is there whether or not they are switched on: `Tabs.Panels` hangs off `Tabs` and the list measures from the same module, so neither shakes out.

Every part is a Box, and the defaults are a style tree — `tabs`, with `tabs.list`, `tabs.tab`, `tabs.panel` beneath it, plus `tabs.indicator` for the travelling bar and `tabs.panels` for the resizing container. The selected state is `aria-selected`, so `ariaAttr={{ selected: … }}` styles it on a tab — inside a style tree the same state is the bare `selected` key, while as a _prop_ `selected` writes the attribute the component owns. The indicator is a border rather than a background, because a forced-colors mode throws every background away and selection would otherwise read identically on and off.

## An accordion whose animation is a class

`<Accordion>` is APG's accordion — a set of sections, each opened by its own header — and `Collapsible`, a named export of the same module, is one disclosure on its own.

```tsx
import Accordion, { Collapsible } from '@box-kite/react/components/accordion';

<Accordion defaultValue={['shipping']} onValueChange={(value, { reason }) => log(value, reason)}>
  <Accordion.Item value="shipping">
    <Accordion.Trigger>Shipping</Accordion.Trigger>
    <Accordion.Panel>Two to four working days, tracked.</Accordion.Panel>
  </Accordion.Item>
  <Accordion.Item value="returns">
    <Accordion.Trigger>Returns</Accordion.Trigger>
    <Accordion.Panel>Thirty days, in the packaging it came in.</Accordion.Panel>
  </Accordion.Item>
</Accordion>;
```

**The height animation is a class, not a measurement.** Every other library measures: an effect reads the panel's height, writes it into a custom property, and a `ResizeObserver` keeps it up to date as the content changes. Nothing here does. The panel sits in a grid of one row whose track runs `1fr` to `0fr`, so the height being animated is the one the browser was going to compute anyway. Three things follow. There is no number to write down, so there is nothing per instance — two shared rules do the whole animation on every accordion on the page, where a measured height is a rule per panel that is never freed. Content that grows while the panel is open simply makes it taller, because nothing was pinned. And a page animates before its JavaScript arrives, since none of it is JavaScript.

**A closed panel is hidden with `visibility`, not `display`.** It has to be hidden by something: content behind a zero-height track is still laid out, and clipped content is still tabbable and still read out. `visibility` is the one that is _animatable_ — it flips to hidden only once the track has finished closing, and back to visible the instant it opens, which is exactly the two moments the content may not be reachable. That is also why there is no `@starting-style` here and no `transitionBehavior="allow-discrete"`: unlike `display`, `visibility` leaves the element with a before-change style to transition from, so the entrance needs nothing declared and a server-rendered open panel does not animate itself open on load. It rides `--transitionTime` like everything else, so `prefers-reduced-motion` turns both directions off with no opt-in.

The consequence to know is the other side of it: **the panel is always in the DOM**, so a half-filled form in one survives being shut — and children too expensive to render closed are yours to gate, with `{open ? … : null}` inside the panel.

**Every header is its own tab stop**, which is the opposite of `Tabs` and is APG's rule for each: an accordion is not a composite widget, so Down and Up are a shortcut between headers rather than the only way in. They wrap unless `loop={false}`, Home and End go to the ends, and the sideways pair is left to the page. Each header is a real `<button>` inside a heading — `level`, default `3`, says which, because a heading level is the document's outline and a screen reader navigates by it. The panel is a `role="region"` named by its header; past half a dozen of them the landmarks are noise, which is APG's own caveat, and `props={{ role: undefined }}` drops it.

**One panel at a time** unless `multiple` says otherwise, and closing the open one is always allowed — so an accordion can stand with everything shut, and there is no second prop to say whether it may. A disabled section is the `disabled` attribute, so the browser has already taken it out of the tab sequence and the arrows step over it for the same reason.

`Collapsible` is the same mechanism with no heading, no group and no arrow keys, because a lone button needs none of them. Note the shape — the trigger is the render prop and the children are the content, the way `<Popover>` reads:

```tsx
<Collapsible trigger={(trigger) => <Button {...trigger}>What is in the box?</Button>}>
  <P>A kite, and the string for it.</P>
</Collapsible>
```

It is **smaller**: `@radix-ui/react-accordion` and `@radix-ui/react-collapsible` are 8.78 KB gz together with React external, where `<Accordion>`, all three of its parts and `Collapsible` add **1.80 KB gz** on top of a `Box` an app already has. Both figures measured the same way, by a harness that ships in the repo — `npm run size:published`, so the number in this paragraph can be re-derived rather than believed. Not measuring is most of the difference.

Every part is a Box, and the defaults are a style tree — `accordion`, with `accordion.item`, `accordion.heading`, `accordion.trigger`, `accordion.arrow` and `accordion.panel` beneath it, plus `collapsible` for the lone one. The open state on a header is its own `aria-expanded`, so `ariaAttr={{ expanded: … }}` styles it and no variant is needed: the attribute the pattern already has to write is the selector. Two parts are not yours: `accordion.track`, the grid whose row animates, and `accordion.clip` inside it, the bare item that clips. Bare is the point — **padding cannot be squeezed**, so a grid item carrying any floors the `0fr` track at exactly that much, and the panel you pad therefore sits inside the clip rather than being it. The panel's own padding is also the room a focus ring at its edge needs, since the clip is permanent.

## A slider whose value keeps its own shape

`<Slider>` is APG's slider and its multi-thumb sibling in one component, and `<Progress>` is the bar beside it. **2.14 KB gz and 0.31 KB gz** on top of Box, against Radix Slider's 9.71 and Radix Progress's 2.86 — 2.31 against 10.43 for both together, measured the same way for all four.

```tsx
import Slider from '@box-kite/react/components/slider';
import Progress from '@box-kite/react/components/progress';

<Slider label="Volume" defaultValue={40} onValueChange={(value) => setVolume(value)} />;
<Slider label="Price" defaultValue={[20, 80]} thumbLabels={['Lowest', 'Highest']} format={(value) => `${value} lei`} />;
<Progress label="Upload" value={62} />;
```

### A number in is a number out

The number of thumbs is the value's own shape. `defaultValue={40}` is one thumb whose `onValueChange` hands back a `number`; `defaultValue={[20, 80]}` is a range whose handler takes a `number[]`. TypeScript infers which from the value you wrote, so there is no second prop saying which kind of slider this is and nothing to narrow at the call site — where a library that always takes an array makes every single-value slider read `value={[volume]}` and `onValueChange={([v]) => …}`.

A thumb may meet the one beside it and never pass it: crossing would renumber the thumbs under the focus that is on one of them. Three and more work the same way, each held between its neighbours.

`onValueChange` fires on every step of a drag, which is what a live preview wants and what a network request does not; `onValueCommit` fires once, when the pointer is let go or the key comes back up. Both report `{ reason: 'pointer' | 'keyboard' }` beside the event.

### Neither is the native element, and that is the one place the platform loses

Every other control in this library is a real form element with a role over it — a `Switch` is a checkbox, a `RadioGroup` is a set of radios, a `Dialog` is a `<dialog>`. A slider is where that stops. `<input type="range">` cannot hold two thumbs, and it and `<progress>` both draw themselves with vendor pseudo-elements — `::-webkit-slider-thumb`, `::-moz-range-track` — that no typed prop can reach, so a styled one is a rewrite of every part and the native element is left supplying only the keyboard.

The half worth keeping is kept: `name` writes one hidden input per thumb, so a range posts two values under that name and a plain `FormData` reads them.

### The position is an inline style, and it is the only thing that is not a class

Everything a slider paints is a shared rule except where its thumbs are. That one value is per _frame_ of a drag, so a class for it would be a rule per frame — written into the stylesheet and never freed. So it is an inline `inset-inline-start`, the exception `useAnchorPosition`'s anchor name and the travelling `Tabs` indicator already take.

It is also the line between these two and `ProgressRing` from `components/chart`, which rounds its fraction to half a percent and puts it in a shared class: nobody drags a ring. Round a thumb that far and a wide track visibly stair-steps under the pointer. A dashboard of a hundred figures still wants the ring.

### A press travels, and a nudge does not

A press on the track is the one move the eye has to follow, so the thumb animates the whole way. Every other move — a drag, an arrow key, a held arrow — takes a short `60ms` linear travel on both the thumb and the fill instead, so they keep up and stay locked together.

Short rather than **off**, because off is exact and steps. A value on a grid can only ever be at its grid positions, so a slider of 1 in 100 moves `3.2px` at a time on a 320px track: nothing is dropped and nothing lags, and it still reads as jumpy next to a press that eases.

Eased **out**, which is neither linear nor eased. A repeat restarts the transition every 33ms, so only its first half is ever seen — and on `ease-out` that half is the straight part, so the thumb glides while the key is held and still decelerates on the last transition, the one allowed to finish. Plain `ease` replays its slow-in on every repeat and pulses: a `2.7×` swing in speed inside each step, against `1.6×`. `linear` is the smoothest of the three while held (`1.15×`) and loses on the other two counts — it rides `1.4 steps` behind the value where `ease-out` rides `0.9`, and it arrives at full speed where `ease-out` lands at `0.6` of cruising. A 33ms wobble is below what the eye resolves as a change of speed; a thumb a whole step stale and a dead stop are not.

And an arrow key is a nudge, not a jump, so it never takes the press travel at all: one tap spent 250ms crossing 3.2px, which is the lag it read as. A tap now arrives in 60ms.

One thing to know when you reach for `value` rather than `defaultValue`: **a controlled slider re-renders whatever component owns its `useState`, thirty times a second while an arrow is held**, so keep the value next to the slider rather than at the top of a page. The slider itself costs `0.3ms` a keystroke; this documentation page was holding three demo values in the page component, and a single arrow key re-rendered all eight sliders, every code block and the API table — `4.2ms` a keystroke and 32ms to paint, against 0.8ms and one frame once each demo held its own.

Both parts have to carry it or they come apart, which is the other half: every Box has a 250ms `all` transition, so a fill left with the default eased towards a thumb that had already arrived — up to 59px behind it mid-drag, and still moving for ~190ms after the pointer stopped.

The real dial is `step`, which is what a slider can be smoother than: `step={0}` is continuous, and the thumb then follows the pointer with nothing to interpolate. The smoothing is one variant, `tracking`, on `slider.fill` and `slider.thumb`.

### It mirrors for free

The fill and the thumbs are placed with `inset-inline-start` and centred with a logical margin, so a right-to-left page draws the minimum on the right with nothing declared twice and no re-render. The half that is not free is the keyboard: the sideways arrows swap — `ArrowLeft` is the increase when the maximum is on the left — and `ArrowUp` never does, because the block axis has no reading order. The direction is read off the element when the key arrives, so a slider inside a `dir="auto"` subtree behaves the way it looks.

Both arrow pairs work on both orientations, `PageUp`/`PageDown` move by `largeStep`, and `Home`/`End` go to the ends themselves — on the step grid or off it. Every thumb is its own tab stop.

### No value on a Progress is a state, not a zero

Leave `value` out and the bar is indeterminate: `aria-valuenow` is omitted entirely rather than written as `0`, because a position nobody measured is the one thing a reader must not be told. The bar sweeps instead, and the sweep names its duration in milliseconds, so it sits outside the `--transitionTime` that `prefers-reduced-motion` zeroes and stops itself.

`Progress` holds no state, runs no effect and measures nothing, so it **renders in a Server Component** — a page paints a real figure before any JavaScript arrives.

### Naming, and the parts

A `role="slider"` has to be named. `label` names the thumb on a single slider; on a range it names the `role="group"` around the thumbs and `thumbLabels` names them one at a time. `format` writes `aria-valuetext` wherever the bare number is not the value — a currency, a rating, a duration. `disabled` is `aria-disabled` rather than the attribute: a value nobody can reach is a value nobody can read, and a `<div>` takes no `disabled` anyway.

Styling is `slider`, `slider.track`, `slider.fill` and `slider.thumb`, every part carrying the `vertical` variant, plus `progress` and `progress.fill`, whose `indeterminate` variant is the sweep.

```tsx
Box.components({
  slider: {
    children: {
      fill: { styles: { bgGradient: { linear: 'r', colors: ['sky-400', 'indigo-500'] } } },
      thumb: { styles: { borderColor: 'sky-500' } },
    },
  },
});
```

## A message you send rather than render

`<Toaster />` goes in once, near the root of the app. Everything after that is `toast()`, from wherever the message actually comes from.

```tsx
import Toaster, { toast } from '@box-kite/react/components/toaster';

<Toaster position="bottom-end" limit={3} />;

// an event handler, a fetch, a router guard, a module with no React in it
toast.success('Saved');
toast('Row deleted', { description: 'Ada Lovelace, added in March.', action: { label: 'Undo', onClick: restore } });
toast.promise(save(), { loading: 'Saving…', success: (saved) => `Saved as ${saved.name}`, error: 'Could not save' });
```

**4.14 KB gz** on top of Box, styled, against sonner's 9.86 KB of JavaScript plus 3.28 KB of stylesheet, react-hot-toast's 4.95 and Radix Toast's 12.06 — which is unstyled, so the CSS for it is still yours to write. All four measured with the same harness — this one as what it adds to an app that already has Box, the other three as the whole package, since that is what installing one costs. The style tree behind it also costs **0.50 KB gz** on every entry that carries the engine, whether or not the app renders a toast: the built-in component styles ship with Box, and this is the largest of them.

### The store has no React in it

`toast()` writes to a plain observable store; `<Toaster>` subscribes and draws what is there. Nothing about a message is a rendering question, so nothing about it needs a component in scope — and a call made _before_ the viewport mounts is queued rather than lost.

`toast(message, options)` returns an id, with `success`, `error`, `warning`, `info` and `loading` beside it, plus `toast.update(id, …)` and `toast.dismiss(id?)`. An `options.id` that is already on screen is an **update**, which is what makes `toast.promise` one toast for the whole call rather than a spinner and then a second message under it. The promise is handed back untouched, so it can still be awaited.

A message is any `ReactNode`, and so is a `description`. `action` is one button, `{ label, onClick }`, and it dismisses the toast it answered unless `closeOnClick: false` says otherwise — an undo that left its own toast standing would invite a second press.

### The limit is a queue, not a cap

Past `limit` (three, by default) a toast waits its turn **with its timer unstarted**, and a counter at the far end of the stack says how many are still to come. A cap would throw the fifth message away; a queue with running timers would expire it unread. Neither is what somebody who fired five requests at once meant.

### The region was already there

The viewport is a `<section aria-live="polite">` from the moment it mounts, empty — because a live region inserted together with its content is not reliably announced, which is the single most common way a toast system is silent to a screen reader. An error toast is `role="alert"`, assertive, and the one announcement pattern every screen reader implements. **Nothing else carries a region of its own**: the nearest live region to a change is the one that speaks, so a second inside the first would take the first's head start away rather than adding anything.

A toast never takes focus when it arrives — an announcement is not an interruption. `F6` (or `hotkey`, which takes `'alt+t'` and the like, or `false`) moves focus to the stack from anywhere on the page, Tab walks the toasts in the order they are on screen, and Escape dismisses the toast focus is in and hands focus back where it came from once there is nothing left to read. The `<section>` is a region landmark too, so a screen reader has a second way in.

Timers stop while the pointer is over the stack, while anything in it has focus, and while the tab is in the background — and resume where they left off rather than starting again. That is WCAG 2.2.1, and it is the only reason a toast is allowed to carry a control at all: a button that can vanish mid-reach is not operable.

### The top layer, and no portal

The viewport carries `popover="manual"` and is shown the moment it mounts, so it paints over every stacking context and outside every clipped or transformed ancestor — and because it never leaves the place it was declared, it inherits the theme, the custom properties and the text direction around it. `manual` rather than `auto`, because a stack of messages owns no dismissal: a press outside has to reach the page.

Which raises the problem a fixed strip across a corner always raises, and it was measured rather than assumed: the viewport takes **no pointer events at all** and the toasts take them back, so a press in the gaps between them goes through to whatever is underneath.

Two more things the UA stylesheet's own `[popover]` rule decides, both found in Chrome 153 and worth knowing before overriding the style tree. `inset: 0` leaves a corner-pinned stack over-constrained — `top` and `left` win over the two sides a `position` variant sets, and the stack lands in the top-left corner whatever you asked for — so all four sides are declared `auto` first. And `overflow: auto` quietly makes the viewport a scroll container, which clips the toasts' own shadows, so it is declared `visible`.

`position` is one of six corners and its inline half is logical, so `'bottom-start'` is the bottom left of a left-to-right page and the bottom right of a right-to-left one. The newest toast is always the one nearest the screen edge, which is why a stack pinned to the top is drawn in the opposite order to one pinned to the bottom.

## A combobox whose value is your own row

`<Combobox>` is APG's editable combobox over a list you already have — a text field that filters a `role="listbox"`, one tab stop however many options are open, and DOM focus that never leaves the input.

```tsx
import Combobox from '@box-kite/react/components/combobox';

<Combobox data={people} def={{ label: 'name', key: 'id' }} label="Assignee" onValueChange={(person) => assign(person)} />;
```

**A row in is a row out.** `data` is the list of objects you already hold, and the value is one of _those rows_ rather than a string dug out of one — `onValueChange` hands the object straight back, typed, so there is no lookup table on the other side of the handler. `def` says how to read a row: `label` is its text (searched, displayed and read out) and `key` is what makes two rows the same row, so a list refetched from the server still shows the selection as chosen. Both take a key of the row or a function, and `disabled` and `display` are the other two.

**`multiple` turns the selection into chips and the value into an array.** It is a prop rather than something inferred from the value, which is the one place this differs from `<Slider>`: a slider always has a value to read the shape off, and a combobox usually starts with nothing in it. Choosing a row that is already chosen takes it off again.

A chip's remove button is deliberately **not** a tab stop — twenty selections would otherwise cost twenty presses to Tab past. Backspace on an empty field removes the last one and the listbox toggles any row back off, so removal is reachable from the keyboard without them, and each button still carries a name for anyone reading the control rather than tabbing through it.

**The filter composes.** The built-in one folds case and strips accents, so `jose` finds `José`, and matches anywhere in the label rather than only at the front. `filter` replaces it and takes the _whole list_, so it can rank as well as reject — and it is handed the label reader, so starting from the built-in one costs nothing:

```tsx
<Combobox
  data={people}
  def={{ label: 'name', key: 'id' }}
  label="Assignee"
  filter={(rows, query, labelOf) => ComboboxUtils.filterRows(rows, query, labelOf).slice(0, 20)}
/>
```

`filter={false}` says the data arrived filtered, which is what a server that already searched needs; `onQueryChange` is the hook that request hangs off, and `loading` makes the popup say the rows are coming rather than that there are none — the difference between "still looking" and "nothing here".

**`createRow` turns what was typed into a row.** Return the row, or `null` to refuse the query. Its presence is what offers the create row at all, and one is never offered for a query a row already answers by name — offering "Create Design" beside Design is how a list grows twins. The change arrives with its own reason, `create`, beside `select`, `deselect` and `remove`.

Typing filters and never highlights a suggestion: that is _list_ autocomplete rather than inline, and a highlight nobody asked for is one Tab away from being committed. The arrows move through what the filter left, Home/End and the sideways arrows move the caret and hand the highlight back to the field, Enter chooses the highlighted row and does nothing when there is none, and Escape closes the listbox keeping what was typed before a second one clears the field.

### Ten thousand options

A list past a hundred rows is windowed: the popup renders the dozen on screen and a few either side, so it opens in one frame whether it holds a hundred rows or ten thousand. Measured in Chrome on the ten-thousand-row demo — fifteen options in the DOM, 49 ms from the press to the open listbox, and sixty consecutive frames of scrolling with none of them over the frame budget. Nothing else about the component changes: the filter still runs over the whole list, the arrows still walk all of it, and the value is still the row you passed in.

The row height is measured rather than declared — the _pitch_, taken from two rendered rows, so a gap or a border between them is part of the step — which means a restyled option windows correctly with nothing to configure. What windowing assumes is that rows are all the **same** height, so a `display` that varies one wants `virtualize={false}`, which renders every row however many there are. `virtualize` also takes `true` to window a short list, and an object to tune it: `threshold` is the row count it starts at, `overscan` how many rows are kept either side, and `itemHeight` the pitch, when it should be stated rather than measured.

**The half of this that is not performance is the ARIA.** A windowed listbox holds a slice of its rows, so every option carries `aria-setsize` and `aria-posinset` — without them a screen reader announces "City 1 of 15" on a list of ten thousand. And **the row the keyboard is on is always rendered**, whatever the scroll position says: `aria-activedescendant` naming a row that was never put in the DOM names nothing at all, so the window goes where the keyboard is and lets the scroll catch up. It does not stay pinned there — a wheel scroll away from the highlight moves the list, or a combobox opened on its first row could never be scrolled at all.

`combobox.window` is the one new style key, the element the slice is rendered into. Its height and its top padding are inline styles rather than classes, because they change with every scroll event and a class per pixel is a rule per frame that is never freed — the same exception a slider's thumb and an anchor's name already take.

**9.53 KB gz on top of Box** — the model, the listbox, the chips, the windowing and the APG keyboard, on top of the anchoring and dismissal every other layer in the library already shares. Radix has never shipped a combobox at all — [radix-ui/primitives#1342](https://github.com/radix-ui/primitives/issues/1342) has been open since 2022 — and `downshift`, the headless library people reach for instead, measures 17.68 KB gz for its own package alone, before the markup, the styling and the ARIA you still have to write around it.

## The component contract, written down and enforced

Twenty components have arrived in this release, and the thing you cannot see from any one of them is
that their APIs were decisions rather than accidents. [The component
contract](https://github.com/box-kite/box-kite/blob/main/docs/component-conventions.md) is those
decisions, in five rules — and `npm run check:conventions` is what stops the library drifting out of
them.

**What a consumer can now rely on.** Every piece of state you may own is held by
`useControllableState`, so controlling a value behaves exactly like not controlling it — including
when you stop, which carries on from the last value you asked for rather than snapping back to the
default. Every change is `onXChange(value, { reason })` with the reason a **named union** you can
`switch` on exhaustively, so no handler has to guess whether a popup closed because something was
picked, Escape was pressed or the page was clicked. Every part takes Box style props and every
component has a node in `boxComponents.ts`, so `<Menu.Item px={3}>` works and the defaults can be
replaced wholesale. And composition is a **render prop** — the answer to `asChild`: a component
hands you a bag to spread and never reaches into the element you rendered, because cloning has to
guess whether a DOM attribute belongs in a Box's `props` bag or on top of a plain element, and a
wrong guess is silent.

**The exceptions are the interesting part, so they are a ledger rather than a habit.** The biggest
is deliberate: a component rendering a real form control — `Checkbox`, `Switch`, `RadioButton`,
`Textbox`, `Textarea`, `Button` — forwards React's own `onChange`/`onInput`/`onClick` unchanged,
because the DOM event _is_ the API there and a second channel beside it would mean two ways to hear
about one keystroke. `Menu.Item`'s `onSelect` is a command with no value to report, `Overlay`'s
`onSideChange` reports what the browser did, and `Icon` is the one component that clones its child —
it styles an icon somebody else drew, so there is no render prop to offer.

Every ledger in the check **fails two ways**: on a new break, and on a listed exception that has
stopped being true. That is the rule the accessibility sweep's `knownViolations` already follows,
and it is what keeps an exception list from becoming a place things go to be forgotten. Its list of
debts is now empty: `DataGrid`, the last component older than the contract, is on it too.

- **`RadioGroup` reports through `onValueChange`.** `onChange` still works and still fires — pass
  either, or both — but it was the one `ChangeHandler` in the library under a DOM event's name, on a
  component that is not an `<input>`. It is deprecated and will go in a future major.

### `Dropdown` and `Select` report through `onValueChange` too

The library's oldest component now holds its selection in `useControllableState` like every other
one, and reports it the way every other one does:

```tsx
<Dropdown<string> label="Fruit" value={fruit} onValueChange={(next, { reason }) => setFruit(next as string)}>
  <Dropdown.Item value="apple">Apple</Dropdown.Item>
</Dropdown>
```

`onValueChange` hands back **the selection in whatever shape `value` takes** — the array in
`multiple` mode, the one chosen option otherwise — and a reason you can `switch` on exhaustively:
`'select'`, `'deselect'`, `'select-all'` and `'clear'`, the last two being the `Dropdown.SelectAll`
and `Dropdown.Unselect` rows, which act on the whole list rather than on one option. `onChange` is
deprecated and still fires with its old `(value, values)` pair, where the first argument is the
option _acted on_; pass either, or both, and nothing needs changing today.

Moving the pair onto the hook is also where a quiet bug went: `defaultValue={0}` and `value={''}`
were read as "nothing selected", because the old code tested the value for truthiness rather than
for being there. A falsy value is a value somebody can pick.

### `RadioGroup` and the chart primitives have style trees

`Box.components()` now reaches all six: `radioGroup` (with a `horizontal` variant) and its `label`,
`sparkline` and its `line`/`area`/`bar` paths, `progressRing` and `gauge` with their `track` and
`arc`, `miniDonut` and its `segment`, and `chartContainer`. What used to be a default written into
the component is a node you can replace, so one override restyles every drawing in an app:

```tsx
Box.components({ sparkline: { styles: { stroke: 'emerald-500', strokeWidth: 2 } } });
```

`ChartContainer`'s node is the interesting one: it holds the `--chart-1` … `--chart-6` palette and
its dark twin, so re-skinning every chart on a page — including a Recharts one that names no colour
of its own — is one override rather than a prop on every container. A `series` prop and a `vars` of
your own still win over it, exactly as before.

One thing to look at when you upgrade: a `RadioGroup`'s `label` now wears the same type as a
`Combobox`'s — `14px` in `gray-700`, `gray-300` in the dark theme — where it used to inherit
whatever was around it. `Box.components({ radioGroup: { children: { label: { styles: … } } } })` is
where to say otherwise.

### `DataGrid` takes Box props, and says why each thing changed

The grid is a Box now, so the element wrapping the bars, the rows and the pager takes the same props
as anything else — `<DataGrid b={1} borderRadius={2} shadow="medium" props={{ 'data-testid': 'orders' }}>`
— with no wrapper `<Box>` around it and no style tree override for a border. A `style` of your own
sits on top of the column-width variables the grid writes there rather than replacing them.

Its eight callbacks report a reason now. Four kept their names, because a handler written
`(value) => …` is still assignable to one that hands it a second argument — so this is additive and
nothing needs changing today:

```tsx
<DataGrid
  data={rows}
  def={def}
  onGlobalFilterChange={(text, { reason }) => reason === 'clear' && resetSearch()}
  onServerStateChange={(state, { reason }) => refetch(state, { debounce: reason === 'filter' })}
/>
```

`onGlobalFilterChange` and `onColumnFiltersChange` say `'filter'` or `'clear'`,
`onExpandedRowKeysChange` says `'expand'` or `'collapse'`, and `onServerStateChange` — the one most
people wire an API to — says which of `'page'`, `'page-size'`, `'sort'`, `'filter'` or `'clear'`
moved. That last one is worth having: the grid sends the pager back to the first page whenever a
query changes underneath it, and until now nothing said whether a page-1 snapshot was a navigation
or a reset.

The other four could not grow a details argument where their second argument already meant something
else, so each has a new name beside it and the old one is deprecated and still fires:

- **`onSelectionChange(event)` → `onSelectedRowKeysChange(keys, { reason })`** — the selection
  itself, and the event's `action` as a named reason: `'select'`, `'deselect'`, `'select-all'` or
  `'clear'`, which are the four `Dropdown` already reports a selection under. The old event's
  `affectedRowKeys` is what it is still for.
- **`onSortChange(columnKey, direction)` → `onSortingChange(sort, { reason })`**, where `sort` is
  `{ columnKey, direction }` or `undefined` once the third press clears it.
- **`onPageChange(page, pageSize)` and `onPageSizeChange(size)` → `onPaginationChange({ page, pageSize }, { reason })`**
  — one callback, because the two always moved together: a new page size always returns to page 1.

## A column that adds itself up

`aggregate` on a column is the half of grouping the grid was missing: the column totals itself over
the rows under each group row, and over the whole grid when `def.footer` is on.

```tsx
<DataGrid
  data={people}
  def={{
    footer: true,
    columns: [
      { key: 'country' },
      { key: 'username', header: 'People', aggregate: 'count' },
      { key: 'age', header: 'Avg age', aggregate: 'avg' },
      { key: 'salary', header: 'Payroll', aggregate: 'sum' },
    ],
  }}
/>
```

Five built-ins — `sum`, `avg`, `min`, `max` and `count` — or a function of your own, handed the
column's values and the rows they came from, so a weighted average can reach the column it weights
by. The four numeric ones read the numbers in the column and skip everything else, so a blank cell
is not a zero and a column holding no number at all answers **`null` rather than `0`**: a total of
nothing is not zero, and a footer reading `0` over an empty grid is a claim about the data. `count`
counts rows rather than values, which is why it is the one that never skips anything. `avg` rounds
to two decimals, because an exact mean is longer than the cell it goes in — any other precision is
an `AggregateCell`, which is to an aggregate what `Cell` is to a row:

```tsx
{
  key: 'salary',
  aggregate: 'sum',
  AggregateCell: ({ cell }) => <Box px={3}>{cell.value === null ? '—' : format(cell.value)}</Box>,
}
```

Every total covers the rows the filters left, so filtering the grid changes them.

Three things worth knowing. **A group row's label stops spanning at the first aggregated column.**
It used to run across every data column beside it, and a number under the wrong heading is worse
than a label with less room — so from there on each column draws its own value, and a group row's
figures line up under the same headings the rows below them do. With nothing aggregating, the span
is exactly what it was. **The footer covers the rows the grid holds**, which under server-side
pagination is the page rather than the table, because those are the only rows it has; a
server-computed total is what E3's row model will be for. And **the footer is a row of the grid in
every sense** — `aria-rowcount` counts it, it is numbered last, Ctrl+End lands in it and Up leaves
it, which is why it is pinned rather than parked at the end of the scroll.

Its style nodes are `datagrid.footer`, `datagrid.footer.cell` and `datagrid.footer.label`, with
`datagrid.body.groupRow.aggregate` for the same value on a group row. `def.footer` also takes
`{ label }`, which replaces the default `Total` in the first column that is not aggregating.

## The DataGrid, restyled

The grid's default appearance was a spreadsheet: a `gray-200` rule under every cell and down every
column boundary, 13px headings as dark as the data under them, and a `large` drop shadow around the
whole thing. It reads as one surface now — the chrome quiet, the data loud.

What changed, and why each one:

- **Numbers line up.** Every body cell is `font-variant-numeric: tabular-nums`, so a column of
  figures shares a digit width instead of drifting. It is the one thing a data grid cannot do
  without, and the registry has no prop for it — `css` is where a property with no prop goes, and it
  still compiles to one shared class.
- **A selected row finally looks selected.** It tints (`indigo-50`, `indigo-950` in the dark), pinned
  columns included. `isRowSelected` had been declared on `datagrid.body.cell` and
  `datagrid.header.cell` since the grid shipped and was applied by **nothing**, so a selected row was
  legible only by its own checkbox. Both dead variants are gone; the appearance comes from
  `aria-selected` on the row, through the library's own `group` prop.
- **A group row reads as a section header**, tinted the same way off its `aria-expanded`.
- **Pinned columns float rather than fence.** The hard border on the frozen edge is a soft directional
  shadow, so the pinned columns sit _over_ the scrolled ones.
- **Quieter chrome.** Row separators drop to `gray-100`, the column resizer from a 2px `gray-400` rule
  to a 1px hairline, the header to 12px tracked `gray-500`, and the bars to the grid's own surface
  with a hairline under them — three stacked greys was what made it read as a spreadsheet. The
  container keeps a tight `xs` shadow instead of `large`.
- **One type scale.** The grid sets `fontSize: 14` once at its root and every part inherits it.

Three colours were measured rather than chosen: a muted row number at `gray-400` is 2.60:1 on white,
and the header's menu button at `gray-400` is 2.49:1 on `gray-50` — both below what text and controls
owe. They are `gray-500` (4.84:1 and 4.63:1), which is as quiet as the contrast allows.

**If you override `datagrid` styles**, the parts are unchanged — only their values. The two removed
variants are the exception, and neither ever painted anything.

### A row-detail panel is a drawer

`rowDetail` shipped with no appearance of its own beyond a grey band. The row that opened the panel
looked like every other row, and the hairline between the two said the panel was the _next_ row rather
than part of this one. They are one block now: the expanded row takes the panel's surface (`gray-50`,
and `gray-950` in the dark — _darker_ than the grid, because a drawer should read as a well) and gives
up its bottom hairline, and a 2px `indigo-500` accent runs down the inline start of the row and on down
the panel, which is the only thing tying a panel this tall back to the row it belongs to. The accent is
logical, so it mirrors with the reading order. The expand chevron is a control rather than data now —
`gray-500` at rest, the accent when open. The row also gets a hover one step off its new surface, since
the grid's own row hover is the colour an expanded row is already painted: it had stopped answering.

A panel that opens below the fold now scrolls itself into view. It is `block: 'nearest'`, so a panel
already on screen moves nothing, and a grid that scrolls internally absorbs the scroll rather than the
page. The row that opened the panel is part of what gets revealed: `datagrid.body.detailRow` carries a
`scroll-margin-block-start` of one row, so a panel taller than the viewport aligns the _row's_ top
rather than its own instead of pushing it off the screen — measured in Chrome, where without the margin
the row lands 40px above the scrollport. The scroll happens where the panel mounts rather than where the
row was toggled, because an `auto` panel's real height exists nowhere else: virtualization carries a
200px estimate for it. `rowDetail: { scrollIntoView: false }` turns it off.

Neutral rather than tinted on purpose: a **selected** row is the one that tints, so the two states stay
legible beside each other. Re-colouring the block is two keys — `body.cell`'s `isExpanded` variant and
`body.detailRow` — which is all the docs site's own Orders demo does now, where it used to spell out a
3px frame across four nodes.

## Excel and CSV, with nothing to install

`def.export` puts two buttons in the grid's top bar, and a `ref` on the grid is the same two calls for
a toolbar of your own:

```tsx
<DataGrid data={people} def={{ topBar: true, export: true }} />
```

```tsx
const grid = useRef<DataGridHandle>(null);

<DataGrid ref={grid} data={people} def={{ columns }} />
<Button onClick={() => grid.current?.exportXlsx({ sheetName: 'Q1' })}>Download</Button>
```

The file is what the grid is showing: the visible columns in their pinned order, the rows the filters
and the sort left, the group rows and their totals. It adds exactly one thing back — a column hidden
_because the grid is grouped by it_. Its values moved to the group rows rather than going away, and a
spreadsheet with no Country column in it is not the grid that was exported.

The workbook is a real `.xlsx`, not a CSV wearing the extension: a bold header on a frozen row, column
widths taken from the grid's own, values that keep their type — a number is a number, a `Date` is a date
cell — an auto-filter, and **the grouping as Excel's own outline levels**, so a group left collapsed in
the grid opens collapsed in Excel with every row still in the file. An export runs no React, so a column
drawn by a `Cell` renderer says what it writes, and a column can name the number format its cells wear:

```tsx
{ key: 'salary', header: 'Payroll', aggregate: 'sum', exportFormat: '$#,##0' },
{ key: 'name', exportValue: (row) => `${row.first} ${row.last}` },
```

**There is no ExcelJS to install.** An `.xlsx` is a ZIP of XML parts, and this writes both — 3.80 KB gz
for the two formats together, in a chunk behind a dynamic import, so a grid nobody exports from carries
none of it and the grid's own entry grows 1.03 KB for the model and the buttons. AG Grid charges
$999/dev/yr for Excel export and MUI $599; the nearest free answer is a CSV and a second dependency.

Two smaller things, both deliberate. A CSV starts with a byte-order mark, without which Excel reads
UTF-8 as the local code page and mangles every accented name. And a CSV value beginning `=`, `+`, `-`
or `@` is quoted into text: a file a page generated must not run a formula somebody typed into a cell.
`exportCsv({ escapeFormulas: false })` writes it as it stands.

Both take `fileName`, `columns`, `groups` and `footer`; `exportXlsx` also takes `sheetName`, `headerFill`
and `headerColor` as `RRGGBB` — a workbook carries one appearance, not a light and a dark one. The
buttons are `datagrid.topBar.export` and `datagrid.topBar.export.button`.

## A grid that fetches its own rows

`def.dataSource` turns the grid the other way round. Instead of handing it an array and wiring five
callbacks to keep that array in step, you hand it one function and it asks:

```tsx
<DataGrid
  def={{
    title: 'One million people',
    globalFilter: true,
    visibleRowsCount: 12,
    columns,
    dataSource: {
      async getRows({ startRow, endRow, page, pageSize, sort, globalFilter, columnFilters, signal }) {
        const res = await fetch(`/api/people?offset=${startRow}&limit=${endRow - startRow}`, { signal });
        const body = await res.json();

        return { rows: body.items, totalCount: body.total };
      },
    },
  }}
/>
```

There is no `data` prop in that call, and no `loading`, `page` or `totalCount` either — the grid owns all
four. Sorting, filtering and paging stop being work the browser does over an array and become part of a
request, which is what lets a grid stand in front of a table nobody could send to a browser at all. The
range arrives twice, as `startRow`/`endRow` for an API that offsets and as `page`/`pageSize` for one that
pages, because they always describe the same block.

**A block is the unit of everything**: one request, one wait, one failure. `blockSize` is how many rows
each asks for — the page size when `def.pagination` is beside it, 100 otherwise — and `maxBlocks` is how
many are kept before the ones furthest from the viewport are dropped and asked for again on the way back.
Rows that have not arrived are drawn as skeletons and are **still counted**, so the scrollbar and
`aria-rowcount` describe the whole result set from the first block rather than growing under whoever is
reading it; a placeholder row says `aria-busy`, and the row number, which is known without the row, is
the one cell it still fills.

A superseded request costs the network nothing: every call carries an `AbortSignal` that fires when the
sort or the filters change underneath it. And a reply that arrives anyway is **dropped** rather than
written over the newer one — the out-of-order race is the whole of what an async row model has to get
right, and it is not something a page should have to write again.

`def.pagination` beside a datasource is the pager rather than the scroller, and the two share one cache:
a page already fetched is shown with no round trip. It needs no `totalCount` any more, since the response
carries one — and a response may leave it out altogether, in which case the grid follows the rows and
treats a block shorter than it asked for as the end of the data.

A failed block shows one strip with the error's own message and a Retry that asks for every block that
failed. The grid invalidates its own cache whenever it changes the query; for the half it cannot see — a
filter of the page's own, a row somebody saved — `refresh()` on the grid's ref throws the blocks away and
asks again.

Two things a server-backed grid must not pretend: a select-all reaches the rows that are loaded, not the
table behind them, and an export writes what the grid holds. Grouping used to be the third — it is the
next section now. The existing `onServerStateChange` grid is untouched and still works — `dataSource` is
the answer for a new one.

The parts are `datagrid.body.cell.placeholder` and its `bar`, and `datagrid.error` with `message` and
`retry`. **+2.51 KB gz** on the DataGrid entry, and 0.15 KB on every other engine-carrying entry for the
two style-tree nodes — `/a11y` and `/anchor`, which carry no engine, moved nothing at all. AG Grid's server-side row model is Enterprise, at $999/dev/yr.

## A group the server counts, and children it fetches when you open one

Grouping was the one thing a datasource did not offer, for a good reason: grouping the blocks that happen
to be in the browser is not grouping the data. So the server does it. Say that it can, and _Group By_
comes back in the column menu:

```tsx
dataSource: {
  // Without this, Group By is not offered at all: a `getRows` that ignored `groupKeys` would
  // answer a group level with leaf rows, and the grid has no way to tell that it had.
  grouping: true,
  async getRows({ startRow, endRow, groupBy, groupKeys, signal }) {
    const res = await fetch(`/api/people?` + new URLSearchParams({
      offset: String(startRow),
      limit: String(endRow - startRow),
      groupBy: groupBy.join(','),      // ['country'] — what to GROUP BY
      groupKeys: groupKeys.join(','),  // [] for the groups, ['Japan'] for what is inside one
    }), { signal });
    const body = await res.json();

    return { rows: body.items, totalCount: body.total, groupCounts: body.counts };
  },
}
```

Every request now carries **`groupBy`**, the columns being grouped by, outermost first, and
**`groupKeys`**, the group it is inside. Shorter than `groupBy` and the rows wanted are _group_ rows, one
per distinct value of `groupBy[groupKeys.length]`, with `groupCounts` beside them; the same length and
they are that group's own rows. One rule covers both directions, and there is no second callback.

A group row is **a row of the same shape**: the level's own column, and whatever it totals. A column with
an `aggregate` reads its value off that row rather than adding up rows the browser has not got — so the
number on a group row is the server's arithmetic over the whole group, not over the fifty rows in hand.
Its count goes in the label; omit `groupCounts` and the label is the value alone.

Nothing under a group is fetched until its chevron is pressed. **Each open group is a cache of its own** —
its own blocks, its own count, its own failure — and shutting one disposes of it and everything beneath.
Eviction keeps the chain _above_ a level in play, so scrolling deep inside a group never drops the group
row it hangs off; that was measured, because the obvious least-recently-used order takes it first.

Two things the grid still declines to pretend. A group whose rows have never been fetched shows **no
select-all checkbox**: it cannot select what the browser has never seen, and a checkbox that did nothing
would be worse than none. And the totals come down with the group row, so a column with no `aggregate`
declared still shows nothing — declaring one is how you say a column totals, whoever does the arithmetic.

Measured in Chrome 152 on the built site, scrolling twelve blocks deep inside an open group: **109 ms**
worst frame gap against **105 ms** for the same scroll through the ungrouped million-row grid beside it,
and **52 ms** back over blocks already cached. The walk over the open levels costs nothing the flat path
did not. **+1.45 KB gz** on the DataGrid entry; every other entry moved by zero.

One fix came out of it. A group row carried `aria-expanded`, which is only defined on a row inside a
`treegrid` and is a serious axe violation inside a `grid` — it had been there since grouping shipped, and
no fixture had ever rendered a group row for the sweep to see. The open state is on the expand button,
where it always also was.

## A grid whose rows hold rows

A file system, an org chart, a bill of materials: rows with rows inside them. `def.treeData` reads that
shape off the data and the grid does the rest — one column grows a chevron and an indent, and the whole
thing reports itself as a `treegrid`:

```tsx
<DataGrid
  data={files}
  def={{
    rowKey: 'id',
    treeData: {
      // Nested data: the field the children live in. `getChildren` works them out instead.
      childrenKey: 'children',
      // Which column carries the chevrons. Default: the first column of your own.
      column: 'name',
      // `true` for every row, a number for a depth, or a list of keys.
      defaultExpanded: 1,
      // Ticking a folder ticks everything in it.
      selection: 'cascade',
    },
    columns: [
      { key: 'name', header: 'Name' },
      { key: 'size', header: 'Size', align: 'end' },
    ],
  }}
/>
```

The tree comes in **two shapes**, and both are the data you already have. Nested, where a row carries its
children (`childrenKey`, or `getChildren` to compute them); or flat, where every row carries the path to
itself (`pathKey`/`getPath`) — which is what an export, a `WHERE path LIKE` or a materialised-path table
hands you. A flat list needs no ordering: shallower rows are read first, and a row whose parent is missing
hangs off the nearest ancestor that is there.

**A filter keeps the path to a match.** Filtering a tree row by row would hide every match three folders
down, so a row survives when it matches _or something under it does_ — what is left is the matches and
the way to them. A row that matches on its own keeps none of the children that did not, and a sort happens
_inside_ each parent, because a tree sorted across its levels is not a tree any more.

**A shut row costs nothing.** Nothing under one is built at all — no models, no cells — so ten thousand
rows nobody has opened cost the page its top level; opening one builds that level and no more. The tree
itself is built once and left alone, so an expand rebuilds none of it.

It is **a `treegrid`**, which is the only place ARIA allows a row to say it is expandable: every row
carries `aria-level`, `aria-posinset` and `aria-setsize`, and a row with something under it carries
`aria-expanded`. On the tree's own column, **Right** opens a shut row and **Left** shuts an open one —
and on a row that is already shut, Left steps out to its parent, which is APG's rule. Both follow the
reading order, so they swap in a right-to-left grid; on every other column they are the ordinary move
along the row.

Two things it does not pretend. Selection cascades only when you ask (`selection: 'cascade'`, which also
makes a half-ticked row read as indeterminate) — a checkbox is otherwise the row it is on, like every
other row in the grid. And _Group By_ is not offered on a tree at all: the rows are already in a shape.

Measured in Chrome on the built site, on the docs page's own ten-thousand-node tree (12 areas × 25
modules × 33 files = 10,212 rows): scrolling it is a **18 ms** worst frame gap against **42 ms** for the
thousand-row flat grid further up the same page, opening a folder is **16 ms** — one frame's work — and
filtering the whole tree costs **82 ms** on the first keystroke and 11–25 ms after, against 112 ms and
12–30 ms for that flat grid's own filter over a tenth as many rows. Right-to-left was measured with a real
`dir`, which no test environment resolves: ArrowLeft opens. **+2.0 KB gz** on the DataGrid entry and ~35 B
on every entry that carries the engine (the three new style-tree nodes); `/a11y`, `/anchor` and the export
chunk moved by zero, which is what attributes the rest.

## A tree the server holds, one level per chevron

The tree above is in the browser. Put `def.treeData` beside `def.dataSource` and it is not: the grid asks
for one level at a time, and a folder nobody has opened costs the page nothing however deep it goes.

```tsx
const dataSource = useMemo(
  () => ({
    async getRows({ startRow, endRow, treeKeys, signal }) {
      // [] is the top of the tree, ['app'] what is in that folder,
      // ['app', 'app/m3'] what is in the one under that.
      const res = await fetch(`/api/files?path=${treeKeys.join('/')}&offset=${startRow}&limit=${endRow - startRow}`, { signal });
      const body = await res.json();

      return { rows: body.items, totalCount: body.total };
    },
  }),
  [],
);

<DataGrid
  def={{
    dataSource,
    rowKey: 'id',
    // The tree is the server's. `hasChildren` is the one thing a row's own
    // values cannot say, since what is under it has never been in the browser.
    treeData: { hasChildren: 'folder', column: 'name' },
    columns: [
      { key: 'name', header: 'Name' },
      { key: 'size', header: 'Size (KB)', align: 'end' },
    ],
  }}
/>;
```

**The path is keys, so the server names a node the way it named it.** `treeKeys` is built from
`def.rowKey` rather than from the values on screen — the ids the server sent come back to it verbatim,
outermost first, `[]` for the top. A row three deep asks with all three, so a query can be written against
the whole path or against the last segment alone.

**A chevron is the server's answer, not a guess.** `hasChildren` names a field (`hasChildren: 'folder'`)
or works the answer out (`hasChildren: (row) => row.kind !== 'file'`). Without one no row grows a chevron:
a grid that offered one on every row would promise a level that may not exist, and a grid that fetched to
find out would defeat the whole thing.

It is **the same mechanism as server-side grouping**, not a second one beside it. A level per open path,
each with its own blocks, its own count and its own failure; a level is created when its row is opened and
disposed of the moment nothing reaches it; and eviction keeps the chain above a level in play, so
scrolling deep inside a folder never drops the row it hangs off. `treeKeys` and `groupKeys` are the same
field of the cache seen from two ends, which is also why the two are mutually exclusive — _Group By_ is
not offered on a tree, whoever holds it.

Everything the eager tree gives the keyboard and the screen reader is unchanged: a `treegrid`, `aria-level`
/`aria-posinset`/`aria-setsize` on every row, `aria-expanded` on the ones that hold rows, and **Right** to
open with **Left** to shut and step out to the parent, following the reading order. Two differences, both
of them the honest answer rather than a gap. `selection: 'cascade'` is not offered — a tick cannot take
rows nobody has fetched — and `defaultExpanded` costs one request per row it opens, so a list of keys is
what it is for and `true` would fetch the whole tree. `onExpandedTreeKeysChange` still reports the rows
that are open _and reachable_: a row under one that has been shut is not open, and its level is gone.

The docs page's demo is a repository of 144,732 rows (12 areas × 60 modules × 200 files) generated a level
at a time and never built — beside the eager tree further up the same page, which holds all 10,212 of its
own, and that neighbour is the control. Measured in Chrome on the built site: scrolling three levels deep
with blocks arriving is a **46 ms** worst frame gap against the eager tree's **56 ms** on the same page and
the same harness, **29 ms** back over cached blocks, and opening a folder is **1 ms** — the level it adds is
a walk, not a rebuild. Thirty-three rows in the DOM either way. Right-to-left was measured with a real
`dir`, which no test environment resolves: ArrowLeft opens and ArrowRight shuts. **+0.56 KB gz** on the
DataGrid entry; `/a11y`, `/anchor`, the export chunk, the core engine and every other component moved by
exactly zero, which is what attributes the rest. AG Grid's server-side tree data is Enterprise, at
$999/dev/yr.

## Grouping can be declared now, not only clicked

Row grouping was reachable only through a column's menu, which meant a grid could not _start_ grouped —
no server render, no fixture, no demo that shows anything before the reader opens a menu. `def.groupBy`
is where the grid starts, and `def.groupDefaultExpanded` says which of those groups start open:

```tsx
def={{
  groupBy: ['country'],        // outermost first; a grouped column is hidden, as the menu hides one
  groupDefaultExpanded: 1,     // `true` for all of them, a number for how many levels down
  columns: [
    { key: 'name', header: 'Name' },
    { key: 'country', header: 'Country' },
    { key: 'salary', header: 'Salary', aggregate: 'avg', align: 'end' },
  ],
}}
```

The menu takes it from there, and a group somebody opens or shuts stays where they left it. It also
closed a hole in the accessibility sweep: a group row had never been rendered by a fixture, because no
fixture could produce one.

## A cell you can type into, and one place that judges it

A grid that only shows rows is a report; the thing that makes it an application surface is being able to
change a value in it. `column.editable` is the whole opt-in, and `def.onCellEdit` is the one function
that both judges an edit and is told about it — answer nothing to accept the value, or a string to refuse
it:

```tsx
<DataGrid
  data={people}
  def={{
    rowKey: 'id',
    onCellEdit: ({ value, columnKey }) => (columnKey === 'name' && !String(value).trim() ? 'A name is required' : undefined),
    columns: [
      { key: 'name', header: 'Name', editable: true },
      { key: 'salary', header: 'Salary', editable: true, align: 'end' },
      { key: 'active', header: 'Active', editable: true },
      { key: 'country', header: 'Country', editable: true, editor: { type: 'select', options: [{ value: 'Japan' }, { value: 'Peru' }] } },
    ],
  }}
/>
```

**Which editor a cell opens is read off the value in it** — a number gets a numeric field, a boolean a
checkbox, everything else a text field — so a column of numbers has a numeric keypad on a phone without
being told. `editor` names one of the four (`text`, `number`, `checkbox`, `select`) or configures it, and
`EditCell` is a control of your own, bound to `cell.draft` with `cell.commitEdit()` and `cell.cancelEdit()`
beside it — the same three calls the built-in four make, so a date picker is a component and not a second
copy of the commit rules.

**A `select` editor opens its list with the editor**, highlighting the value already in the cell, so
choosing one is the single gesture it looks like. The list is the whole control there — an editor that
opened and then waited for a second press to show what could be chosen is the interaction AG Grid
[names as the one flaw](https://www.ag-grid.com/javascript-data-grid/provided-cell-editors-select/) it
cannot design out of a native `<select>`, and it is the same on every way in: a double press, Enter, F2,
a printable character, or Tab arriving from the cell before. Escape closes the list and a second Escape
leaves the editor, which is the two-stage dismissal the pattern already has. `Dropdown` takes the
behaviour as a prop of its own — `defaultOpen` — for anything else built the same way.

**A double press opens the editor, and a single one only chooses.** A press makes a cell the current
one — where the arrow keys carry on from — and a double press on an editable cell opens it, the way a
spreadsheet reads one; a cell that cannot be edited takes both as focus and nothing else. A widget inside
a cell keeps its own presses, so a double press on a tree chevron, or on a link in a `Cell` of your own,
belongs to the widget rather than the editor.

**The keyboard is APG's**: Enter or F2 opens the editor, Escape throws the draft away, Enter commits and
hands the keyboard back to the cell, and **Tab commits and opens the next editable cell** — along the row
and on into the rows after it, so a row of corrections is one gesture. A printable character opens the
editor on that character, replacing the value the way a spreadsheet does, and a press somewhere else
commits. A refused value keeps the editor open and the caret in it, with the message in a `role="alert"`
in the top layer — a bubble inside the scroller would be clipped away on the last row, which is the row a
long grid is most often edited on — and `aria-invalid` plus `aria-describedby` on the field itself.

**`def.onCellEdit` may be async**, so a uniqueness check against a server is the same function: the
editor waits, and an answer to an edit the user has since abandoned is dropped rather than applied to
whatever they are editing now. A rejected promise is its message.

**The grid does not own `data`, so an accepted value is kept as an edit over the rows it was given** and
is what every cell, every `Cell` renderer and every export reads from then on — which is what lets a grid
over a `def.dataSource` be edited at all, since a value that was only reported would be gone on the next
block. `onCellEditsChange` reports the whole list, oldest first, which is the stream an undo is built out
of, and `clearEdits()` on the grid's ref is how a host says its own data has caught up. Two consequences
worth knowing: an edit does **not** re-sort or re-filter the grid — a row jumping out from under the
pointer as it is typed into is not an edit anybody asked for — and `refresh()` on a datasource drops the
edits with the blocks, because what the server says next is the newer answer.

## The grid is one tab stop, the way APG says

A grid is a composite widget, and APG is explicit about what that costs the tab order: "Only one of the
focusable elements contained by the grid is included in the page tab sequence." Until now this one had
**seventy-eight** — measured on the docs site's own grid: one row-selection checkbox per rendered row,
one resizer and one menu button per column, one input per filter. Tab from a cell walked into them one
at a time, so crossing a grid took as many presses as it had rows, and the first of them landed on a
checkbox in a near-empty column with no cell ring drawn anywhere.

Now Tab leaves. Everything the grid draws inside a cell carries `tabindex="-1"`, and the way in is the
one APG names: **Enter or F2** steps into the cell's controls, **Tab walks between them** and wraps
inside that cell, and **Escape** hands the keyboard back. That is also MUI X's default
(`tabNavigation="none"`), and the editor already worked this way — Tab in an open editor commits and
opens the next editable cell, which is APG's "when grid navigation is disabled" half.

**`def.tabNavigation="cells"`** is the other reading, for the screens that want it: Tab walks to the
next cell and on into the rows after it, Shift+Tab walks back, the way AG Grid reads a grid. It is
opt-in because it costs the keyboard its way out — at either end of the grid the key is let through, so
Tab still escapes rather than being swallowed for ever.

**Space selects the row** the focused cell is in, and deselects it again; from the header cell the
select-all box sits in, it toggles every row. This is AG Grid's reading and it is the half that makes
the rest safe: with the checkboxes out of the tab order, Space is how a grid is selected without a
mouse. A grid with no row selection has nothing to toggle, so Space there keeps doing what Enter does.

## Breaking changes

- **Nothing inside a DataGrid cell is a tab stop any more.** The row-selection checkboxes, the select-all box, the column resizers, the column menu buttons and the filter inputs all carry `tabindex="-1"`, so the grid is the single tab stop APG specifies. A page that tabbed into a column's filter box now presses Enter or F2 on that cell instead — or `def.tabNavigation="cells"`, if what it wanted was for Tab to walk the grid at all. A test that tabbed to a grid widget should focus it directly, or drive Enter/F2 from its cell.
- **Space on a grid cell selects the row rather than acting like Enter.** It was an undocumented synonym for Enter (opening an editor, stepping into a widget); it is the selection key now, on every grid that has `def.rowSelection`. Enter and F2 are unchanged and are still the only ways into a cell. Where a grid has no row selection, Space still does what Enter does.
- **`Overlay` places a layer instead of translating one, so its four positioning props are gone.** `anchorSide` is `side` (`anchorSide="bottom"` is the default `side="bottom"`; the old `'top'` overlapped the anchor, which `side="bottom" offset={0}` does not — use a negative margin if you need the overlap). `adjustTranslateX`/`adjustTranslateY` are `offset` on the ÷4 scale for the gap and `align` for the sideways nudge (`adjustTranslateY="4px"` is `offset={1}`). `onPositionChange` is `onSideChange`, which reports the side rather than page coordinates — nothing measures a position any more, so there are none to report.
- **`Tooltip`'s `adjustTranslateX`/`adjustTranslateY` are `side`, `align` and `offset`.** The default gap is unchanged (`offset={1}`, 4px), so a tooltip that took no nudge needs no change.
- **`flip` on `Overlay` and `Tooltip` is the placement prop, not the CSS one.** It shadows the Box prop that writes `scale`, the way `Tooltip` already shadows `content` and `open` — a mirrored layer is a rarity, and one placement vocabulary is worth more. A child of the layer still takes the CSS `flip`.
- **The `dropdown.items` `up` variant is gone; `closedUp` stays.** It only ever carried the entrance's starting style, and the entrance cannot know which way the popup went (see above). A `Box.components()` override that styled `up` should move to `closedUp` or to the base `startingStyle`.
- **A layer must not be declared inside its trigger.** `Overlay` stays in the DOM where it is written now, so `<Button>{overlay}</Button>` puts a `role="listbox"` or a `role="menu"` full of buttons inside a `<button>` — content no keyboard can reach. It used to work by accident, because the portal moved the layer before a browser saw it. Render the layer beside the trigger and pass the trigger as `anchor`. The library's own `Dropdown` popup and DataGrid column menu were both doing this and have moved.
- **Nothing is portalled into `#box-kite-portal` any more**, except on a browser with no Popover API. CSS or a test that reaches a popup through that container — `#box-kite-portal .item`, or a query scoped to it — should target the popup itself instead; it is now a sibling of its trigger. The container is no longer created at all on the top-layer path, and `Box.Theme` needs nothing copied into it, since the layer inherits the theme it was declared in.

## Fixes

<!-- One bullet per fix: **What was wrong.** What it does now. -->

- **A clicked grid cell showed nothing at all.** The current cell was drawn with `:focus-visible`, which is specified _not_ to match pointer input, so the ring appeared only once an arrow key had been pressed — and with an editor now opening on a double press, the cell a press had just chosen was the one thing on screen that did not say so. A body cell draws its ring for the cell that _holds_ focus instead — `:focus-within:not(:has(:focus))`, so a press on a widget the cell holds (a selection checkbox, a tree chevron) leaves the ring where it was rather than drawing a second one around that widget's cell. A header cell keeps `:focus-visible`, because its click sorts and the consequence is already visible. The ring still goes when the grid loses focus: a current cell that survives blur is what a range selection extends from, and it arrives with that.

- **Every option of a grid's `select` editor came up painted as selected text.** A double press selects the word under it before any handler runs, and the editor then replaced the text that selection covered — so Chrome repaired the stranded range to the nearest boundary it could find, and the range reappeared over whatever rendered there next: the whole list, the moment it opened. The press that opens an editor drops the selection it made, since the content it covered is on its way out; and an option is a choice rather than prose, so `dropdown.item` declares `user-select: none` the way the trigger has since it shipped — which also stops a drag across the list painting one.

- **A printable character typed on a `select` or `checkbox` cell became the cell's value.** One character opens the editor on that character, which is what a spreadsheet does with a field — but a list is chosen from rather than typed into, so the draft was seeded with a letter no option could match: the editor came up showing nothing at all, and an Enter after it committed the letter itself into the column. A `checkbox` read the same character as `true`. Only the two editors that are typed into take the keystroke now, and a `number` takes it **as a number** — seeded with the string, an Enter straight after the key committed `'7'` where the column held `7`. A key that is not part of a number opens the field on the value it found.

- **A deprecated _prop_ would have told forty-five coding agents to stop importing the whole component.** The scan behind the skill's "no longer the spelling to write" list took the first `@deprecated` in a component's source and named the **module** after it — fine while every deprecation in `src/components/` was a whole component, and wrong the moment one was a prop: `RadioGroup`'s renamed `onChange` came out as `@box-kite/react/components/radioGroup`, which an agent reads as "do not import this". A tag above a prop signature now names the prop (`…/radioGroup#onChange`) and only a tag elsewhere names the module, and every deprecation in a file is listed rather than just the first.

- **The docs site's own keyboard access, in the two places it was a clickable `<div>`.** The nine category switchers on [/box](https://www.box-kite.dev/box) — the largest prop reference on the site — could only be reached with a mouse, so eight of its nine panels were unreachable and a screen reader was told nothing about them. They are a `role="tablist"` of real buttons over the library's own `useRovingFocus` now, with arrow keys, Home/End and a `role="tabpanel"` that says which tab named it; the forty "Show code" toggles below them are buttons with `aria-expanded`. One caption on the same page also failed contrast at 3.74:1 and does not now.
- **Every table on the docs site rendered as a stack of full-width blocks.** `display: block` on a `<Box tag="table">` costs the table its layout _and_ its semantics, and five pages had written their own copy of the same broken table. There is one shared table now, carrying the display values each element needs — and the props above are what let it stop reaching for the escape hatch to collapse its borders.
- **Inline code in the prose of ten documentation pages was rendered as a block.** Each `<code>` took a line of its own, breaking the paragraph around it into stripes — the local helper was missing `display="inline"`, which is the trap the library's own rules warn about: a `Box` is `display: block` whatever element it renders. Nothing in the library changed; the pages read as paragraphs again. The same pages' tables also lost their last nine inline `style` attributes to `css={{ borderCollapse: 'collapse' }}`, which is what the escape hatch is for.
- **A `Dropdown` could not be given a value of `0` or an empty string.** Both `value` and `defaultValue` were tested for truthiness on the way in, so `<Dropdown<number> defaultValue={0}>` started with nothing selected and `value={0}` selected nothing however many times it was set — while `value={1}` worked, which is what made it read as a puzzle rather than a bug. The test is against `undefined` and `null` now, and a falsy value is a value somebody can pick.
- **Three nodes of the DataGrid style tree could not be styled at all.** `clean` tells the engine to use no component styles, so passing it _beside_ a `component` silently voided the very node that `component` named — and the expand chevron (`body.cell.rowDetail`), the group-row expander (`body.groupRow.expandButton`) and the pager buttons (`bottomBar.pagination.button`) all passed both. Anything written under those three keys, by the library or by a `Box.components()` override, was dropped on the floor. The three call sites name a component and no longer also claim to be clean; `clean` still strips a `Button` that names **no** component, which is the use it was meant for.
- **Every scrolling `DataGrid` showed a horizontal scrollbar it did not need, off by exactly the scrollbar's own width.** The flexible columns were distributed across the width of the **grid container**, but they are laid out inside the scroller — and the vertical scrollbar sits between the two, so the columns came out 15px wider than the space they had and `scrollWidth − clientWidth` measured exactly 15 at every viewport size. The width is measured on the scroller now. Two things follow it. The scroller is `overflow-x: auto` rather than `scroll`, so a grid whose columns genuinely fit no longer reserves a track it never uses; one whose columns do not fit still scrolls, and the virtualized body keeps its vertical scroll from the same rule as before — naming one overflow axis computes the other `visible` companion up to `auto`. And the scroller reserves its vertical scrollbar's space up front (`scrollbar-gutter: stable`), because the columns are now sized to a width the scrollbar can change: without it, opening a row-detail panel on a grid that was not yet scrolling took 15px away and the columns reflowed a frame later, flashing a horizontal scrollbar on the way. A grid that can never scroll vertically — `visibleRowsCount: 'all'` — reserves nothing, since it would only lose the 15px.
- **Six of the DataGrid pager's controls had no accessible name at all.** The four navigation buttons are chevrons and the chevrons are decorative, so a screen reader reached four buttons called nothing; the rows-per-page `<select>` and the page-number input were unlabelled beside them, both critical axe failures. All six are named now — and the a11y sweep grew a paginated grid fixture, which is what found them: the two DataGrid fixtures it already had never rendered a pager.
- **The DataGrid's two tree props were spread onto the element it renders.** `expandedTreeKeys` and `onExpandedTreeKeysChange` were never taken off the props on their way through, so they reached `<Box>` with everything else — exactly what the comment above that line forbids ("a new grid prop cannot leak onto the element by being forgotten"). Nothing was visible, since Box forwards only what is in `props`, but a future prop of that name on Box would have been set by a grid that never meant to. Both come off now.
- **A `DataGrid` given a callback but no value prop did nothing at all.** `<DataGrid onPageChange={track}>` without a `page` beside it fired the callback on every press of the pager and never moved — and the same for `onGlobalFilterChange` without `globalFilterValue`, `onColumnFiltersChange`, `onPageSizeChange` and `onExpandedRowKeysChange`. The grid read the _handler_ as "the caller owns this state", so a grid wired up only to watch its user was left with a pager, a filter box and a set of expanders that could not change anything. A handler is a listener; ownership is the value prop, which still wins wherever it is passed.
