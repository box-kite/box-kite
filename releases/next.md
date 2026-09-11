# Box Kite next

_Unreleased. A PR that changes what a consumer sees adds its section here — see CONTRIBUTING.md, "Release notes"._

The package now carries instructions for the agent writing the code, the documentation site answers in markdown, the same rules install as a skill in about forty-five coding agents, and every component page states its own props, keys and accessibility — all of it generated from the sources the library is built from. A floating layer is also placed by the browser now rather than measured in JavaScript, all the way through: six props, one hook, and every popup the library ships standing on them. Three of those popups are now browser features rather than components: a popover on the Popover API, a modal dialog on `<dialog>`, and a menu button whose submenus are popovers nested inside it. Tabs arrive beside them, on nothing but the keyboard the pattern asks for — with an indicator that travels between them and a panel box that resizes to fit. An accordion arrives with them, opening its panels on a grid track nobody had to measure, and a slider and a progress bar close the set — the two places the platform’s own control cannot be styled or given a second thumb.

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

### A press travels and a drag does not

Sending the thumb somewhere animates it there — a press on the track, or one arrow key. The moment the value is _being_ moved, a drag or a held arrow, the transition comes off both the thumb and the fill, so they stay under the pointer and stay together.

Both parts have to agree about this, which is the whole point: every Box carries a 250ms `all` transition, so a fill left with the default eases towards a thumb that has already arrived — measured at up to 59px behind it mid-drag, and still moving for ~190ms after the pointer stopped. It is one variant, `tracking`, on `slider.fill` and `slider.thumb`, so a style tree of your own can make the travel longer or take it off.

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

## Breaking changes

- **`Overlay` places a layer instead of translating one, so its four positioning props are gone.** `anchorSide` is `side` (`anchorSide="bottom"` is the default `side="bottom"`; the old `'top'` overlapped the anchor, which `side="bottom" offset={0}` does not — use a negative margin if you need the overlap). `adjustTranslateX`/`adjustTranslateY` are `offset` on the ÷4 scale for the gap and `align` for the sideways nudge (`adjustTranslateY="4px"` is `offset={1}`). `onPositionChange` is `onSideChange`, which reports the side rather than page coordinates — nothing measures a position any more, so there are none to report.
- **`Tooltip`'s `adjustTranslateX`/`adjustTranslateY` are `side`, `align` and `offset`.** The default gap is unchanged (`offset={1}`, 4px), so a tooltip that took no nudge needs no change.
- **`flip` on `Overlay` and `Tooltip` is the placement prop, not the CSS one.** It shadows the Box prop that writes `scale`, the way `Tooltip` already shadows `content` and `open` — a mirrored layer is a rarity, and one placement vocabulary is worth more. A child of the layer still takes the CSS `flip`.
- **The `dropdown.items` `up` variant is gone; `closedUp` stays.** It only ever carried the entrance's starting style, and the entrance cannot know which way the popup went (see above). A `Box.components()` override that styled `up` should move to `closedUp` or to the base `startingStyle`.
- **A layer must not be declared inside its trigger.** `Overlay` stays in the DOM where it is written now, so `<Button>{overlay}</Button>` puts a `role="listbox"` or a `role="menu"` full of buttons inside a `<button>` — content no keyboard can reach. It used to work by accident, because the portal moved the layer before a browser saw it. Render the layer beside the trigger and pass the trigger as `anchor`. The library's own `Dropdown` popup and DataGrid column menu were both doing this and have moved.
- **Nothing is portalled into `#box-kite-portal` any more**, except on a browser with no Popover API. CSS or a test that reaches a popup through that container — `#box-kite-portal .item`, or a query scoped to it — should target the popup itself instead; it is now a sibling of its trigger. The container is no longer created at all on the top-layer path, and `Box.Theme` needs nothing copied into it, since the layer inherits the theme it was declared in.

## Fixes

<!-- One bullet per fix: **What was wrong.** What it does now. -->

- **The docs site's own keyboard access, in the two places it was a clickable `<div>`.** The nine category switchers on [/box](https://www.box-kite.dev/box) — the largest prop reference on the site — could only be reached with a mouse, so eight of its nine panels were unreachable and a screen reader was told nothing about them. They are a `role="tablist"` of real buttons over the library's own `useRovingFocus` now, with arrow keys, Home/End and a `role="tabpanel"` that says which tab named it; the forty "Show code" toggles below them are buttons with `aria-expanded`. One caption on the same page also failed contrast at 3.74:1 and does not now.
- **Every table on the docs site rendered as a stack of full-width blocks.** `display: block` on a `<Box tag="table">` costs the table its layout _and_ its semantics, and five pages had written their own copy of the same broken table. There is one shared table now, carrying the display values each element needs — and the props above are what let it stop reaching for the escape hatch to collapse its borders.
- **Inline code in the prose of ten documentation pages was rendered as a block.** Each `<code>` took a line of its own, breaking the paragraph around it into stripes — the local helper was missing `display="inline"`, which is the trap the library's own rules warn about: a `Box` is `display: block` whatever element it renders. Nothing in the library changed; the pages read as paragraphs again. The same pages' tables also lost their last nine inline `style` attributes to `css={{ borderCollapse: 'collapse' }}`, which is what the escape hatch is for.
