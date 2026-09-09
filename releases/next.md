# Box Kite next

_Unreleased. A PR that changes what a consumer sees adds its section here — see CONTRIBUTING.md, "Release notes"._

The package now carries instructions for the agent writing the code, the documentation site answers in markdown, the same rules install as a skill in about forty-five coding agents, and every component page states its own props, keys and accessibility — all of it generated from the sources the library is built from.

## Highlights

- **[The package tells an agent how to use it](#the-package-tells-an-agent-how-to-use-it)** — `AGENTS.md` and a `docs/` folder ship in the tarball, generated from the prop registry and the built chunks themselves.
- **[Every docs page is also markdown](#every-docs-page-is-also-markdown)** — append `.md` to any address, or start at `llms.txt`, which indexes all of them and states the four facts a model's priors get wrong.
- **[The rules install as a skill](#the-rules-install-as-a-skill)** — `npx skills add box-kite/box-kite` for about forty-five coding agents, a plugin marketplace for Claude Code, and a `.mdc` for Cursor.
- **[Every component page states its own API](#every-component-page-states-its-own-api)** — props, keys, accessibility and the style tree, generated from each component's types and doc tags, so a table cannot go stale.
- **[Three props for a table, and a list that shows its markers](#three-props-for-a-table-and-a-list-that-shows-its-markers)** — `borderCollapse`, `borderSpacing`, `tableLayout`, plus `display="list-item"` and the markers `listStyle` was missing.
- **[A floating layer is six props, and no JavaScript](#a-floating-layer-is-six-props-and-no-javascript)** — CSS anchor positioning: name an anchor, say which cell of the grid around it to sit in, and let the browser flip the layer when it does not fit.
- **[One hook places a floating layer](#one-hook-places-a-floating-layer-and-a-length-can-come-off-the-anchor)** — `useAnchorPosition` from `@box-kite/react/anchor`, plus `anchor-size()` on every sizing prop and `anchor()` on every inset, so a popup matches its trigger with nothing measured.

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

The skill is **shorter than the file it replaces and says more**. Its body is the four facts a model's priors get wrong, the twenty-seven rules, a divider table measured from the engine — `p={4}` is `padding: 1rem` and `b={4}` is `border-width: 4px`, the same number twice — the deprecations, and a table of contents. The depth moved into four references it loads only when a question needs one: `styling.md` (every prop by category, the six kinds of nesting, the theme), `components.md` (which component replaces which `<Box tag>`, and the Dropdown, Select and DataGrid), `extending.md` (`Box.extend()` and `Box.components()`) and `patterns.md` (server rendering, the behaviour hooks, portals, form controls, the tooltip). A skill's body loads in full every time it is used, so what an agent pays for on a `p={4}` question dropped from 49 KB to 21 KB.

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

## Breaking changes

None.

## Fixes

<!-- One bullet per fix: **What was wrong.** What it does now. -->

- **The docs site's own keyboard access, in the two places it was a clickable `<div>`.** The nine category switchers on [/box](https://www.box-kite.dev/box) — the largest prop reference on the site — could only be reached with a mouse, so eight of its nine panels were unreachable and a screen reader was told nothing about them. They are a `role="tablist"` of real buttons over the library's own `useRovingFocus` now, with arrow keys, Home/End and a `role="tabpanel"` that says which tab named it; the forty "Show code" toggles below them are buttons with `aria-expanded`. One caption on the same page also failed contrast at 3.74:1 and does not now.
- **Every table on the docs site rendered as a stack of full-width blocks.** `display: block` on a `<Box tag="table">` costs the table its layout _and_ its semantics, and five pages had written their own copy of the same broken table. There is one shared table now, carrying the display values each element needs — and the props above are what let it stop reaching for the escape hatch to collapse its borders.
- **Inline code in the prose of ten documentation pages was rendered as a block.** Each `<code>` took a line of its own, breaking the paragraph around it into stripes — the local helper was missing `display="inline"`, which is the trap the library's own rules warn about: a `Box` is `display: block` whatever element it renders. Nothing in the library changed; the pages read as paragraphs again. The same pages' tables also lost their last nine inline `style` attributes to `css={{ borderCollapse: 'collapse' }}`, which is what the escape hatch is for.
