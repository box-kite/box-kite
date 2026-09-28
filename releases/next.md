# Box Kite next

_Unreleased. A PR that changes what a consumer sees adds its section here — see CONTRIBUTING.md, "Release notes"._

Scroll position and view transitions become props: fourteen of them, so an animation can take its progress from a scrollbar instead of a clock, and a change the browser used to jump through can be animated between. Both are the platform's, so neither costs a listener, a `requestAnimationFrame` or a line of state.

## Highlights

- **[An animation can run off a scroll position](#an-animation-can-run-off-a-scroll-position)** — `animationTimeline="scroll()"` and `"view()"`, plus the named timelines and the range props, for reading-progress bars and reveal-on-scroll with no JavaScript at all.
- **[A change the browser animates between](#a-change-the-browser-animates-between)** — `viewTransitionName`, `viewTransitionClass` and `Box.viewTransition()`, with the React `flushSync` trap handled for you.
- **[A theme switch can cross-fade](#a-theme-switch-can-cross-fade)** — one prop on `<Box.Theme>`.

## An animation can run off a scroll position

`animationTimeline` takes the animation's progress off a scroll position rather than a clock. `scroll()` is the nearest scrolling ancestor's progress and `view()` is this element's own pass across it, and neither needs anything declared anywhere else:

```jsx
Box.keyframes({ progress: { from: { scale: 0 }, to: { scale: 1 } } });

<Box height={40} overflow="auto">
  <Box
    position="sticky"
    top={0}
    height={1}
    bgColor="sky-500"
    css={{ transformOrigin: 'left' }}
    animationName="progress"
    animationTimeline="scroll()"
    animationFillMode="both"
    motionReduce={{ animation: 'none' }}
  />
  …
</Box>;
```

Where the animated element is not inside the scroller, name a timeline instead: `scrollTimeline="page block"` on the scroller (or `viewTimeline="card block"` on the subject), `animationTimeline="page"` on whatever animates, and `timelineScope="page"` on a common ancestor, since a timeline is otherwise visible only to the declaring element's descendants. The `--` on a name is optional and added for you, and the axis is logical, so `block` mirrors with the writing mode.

`animationRange` picks which part of the pass the animation occupies — `cover`, `contain`, `entry`, `exit`, `entry-crossing`, `exit-crossing`, each taking an offset — with `animationRangeStart`/`animationRangeEnd` setting one end at a time, and `viewTimelineInset` shrinking the scrollport the pass is measured against so a reveal can fire before the element reaches the edge.

Fourteen props in all: `animationTimeline`, `animationRange`, `animationRangeStart`, `animationRangeEnd`, `scrollTimeline`, `scrollTimelineName`, `scrollTimelineAxis`, `viewTimeline`, `viewTimelineName`, `viewTimelineAxis`, `viewTimelineInset`, `timelineScope`, `viewTransitionName` and `viewTransitionClass`. The registry holds **235**.

**Three things to know, all measured in Chrome 153.** The CSS `animation` shorthand **resets `animation-timeline`** — a timeline declared before it is silently undone — so the registry declares `animationTimeline` after `animation` and writing both props is safe in either order; an `animation` written inside `css` sorts last and is not. A scroll-driven animation has **no duration**, so `--transitionTime` cannot zero it: it is the one kind of motion here that does not stop itself when the reader asked for less, and `motionReduce={{ animation: 'none' }}` is not optional. And where the browser has none — Safari below 26, Firefox behind a flag — the _declaration_ is dropped rather than the animation, so it plays once on the document timeline; end the sequence where the element belongs and add `animationFillMode="both"`, and the degradation is "already arrived" rather than a loop.

## A change the browser animates between

A view transition screenshots the page, runs the update, screenshots again and animates between the two. `viewTransitionName` is what makes an element move _from where it was to where it is_ instead of being cross-faded along with everything else, `viewTransitionClass` groups several of them so `::view-transition-group(.card)` styles the set, and `Box.viewTransition()` is the call around the change:

```jsx
Box.viewTransition(() => flushSync(() => setTab(next)), { types: ['forward'] });
```

It feature-detects and hands back the same `ready`/`finished`/`updateCallbackDone` promises and a `skip()` whether or not a transition ran, so a caller has one code path rather than two. Reduced motion **skips** the transition and still applies the update — a whole-page cross-fade is exactly the motion the preference is about — and `{ reducedMotion: 'play' }` is the opt-out. `startViewTransition` is exported from `@box-kite/core` too, so a framework-free app gets it.

**In React the update has to be flushed.** The browser takes its second screenshot the moment the callback returns, and a `setState` has not rendered by then — so a hand-rolled version captures the old state twice and nothing appears to move. And a `viewTransitionName` has to be unique in the document while the transition runs, so the prop is for the handful of names a layout has; a name _per list item_ is a rule per item that would never be freed, and that one belongs in `props={{ style: { viewTransitionName: id } }}` — the exception an anchor's name and a slider's thumb already take.

## A theme switch can cross-fade

```jsx
<Box.Theme use="global" viewTransition>
```

One prop, because the recipe has the `flushSync` trap in it and this is the one change every app has. Off by default; reduced motion skips it and the theme still changes. The docs site runs it.

## All of it on one page

[**/motion**](https://www.box-kite.dev/motion) is the new showcase: the four presets, a spring playground whose three dials write the `linear()` curve the CSS actually receives, a panel that animates both ways without unmounting, a chart that draws itself on a `view()` timeline, a layout change the browser animates between, and an SVG path drawing itself from `strokeDashoffset`. Each one carries the code to copy and a line saying what it is _not_ running — the `IntersectionObserver`, the physics loop, the FLIP measurement. [/animation](https://www.box-kite.dev/animation) stays the reference that explains every prop.

## Every example on the site is editable

[**box-kite.dev/playground**](https://www.box-kite.dev/playground) runs a snippet against the real library and shows, beside it, **every CSS rule the engine wrote for it** — one atomic class per declaration, in the engine's own cascade order, at-rules and all. That pane is the thing no other styling playground can show: here the class is the name of a rule the engine generated from a prop, so "why is this style applied" is a list you can read rather than a stylesheet you have to go and find.

Every code block on the site now carries a **Playground** button beside its Copy button, so a snippet is one click from being editable. The URL carries the snippet, which makes it the whole share, and **Open in StackBlitz** forks it into a Vite project with the published package in its `dependencies`.

Three things worth knowing. The button is offered **only where the snippet would actually run** — the decision is made without the compiler, since `<Code>` is on every page and cannot load one, and a test runs the cheap rule and the compiler over all 314 snippets the site shows and fails on any disagreement. The names a snippet may use without importing them come from **one record** that the playground reads as values and `npm run check:docs` reads as import statements, so a name only one of them knows about is a build failure rather than an `X is not defined` a reader finds. And the compiler is a lazy chunk on that route alone: no other page downloads it.

## The playground's editor knows every prop

The [playground](https://www.box-kite.dev/playground) editor now completes as you type. In a tag it lists every prop that component takes — its own first, then the 235 style props, the nesting keys and `props` — filtered as you type (`bgC` is **b**ack**g**round-**C**olor's humps), and typing the CSS name finds the prop: `padding` offers `p`. Taking a prop writes the value form it needs, with the caret inside: `=""` for a string, `={}` for a number, `={{  }}` for a nested object. The value list then opens on its own.

What the value list shows depends on what the prop takes:

- **A list of names** shows every one, each with the CSS the engine writes for it.
- **A colour** shows the palette with a swatch per token, and carries an opacity modifier (`sky-500/40`) along as you type.
- **A number** gets a type card instead of a list. It shows the value you are typing, measured live (`lineHeight={24}` → `line-height: 24px`), plus a short scale that makes the divider readable without anybody writing it down.

Inside a nested object (`hover={{ … }}`, `theme={{ dark: { … } }}`, `cq={{ md: { … } }}`) the same thing happens one level down. The popup never takes focus, and the textarea stays a textarea. <kbd>Ctrl</kbd>+<kbd>Space</kbd> asks for suggestions anywhere. Tab still indents, and <kbd>Esc</kbd> then <kbd>Tab</kbd> leaves the editor.

The editor has line numbers, a highlighted current line and bracket pairs coloured by depth, and it colours each name the way the library reads it: a style prop, a nesting key and a component's own prop are three different colours. **A prop the component does not take gets a red squiggle**. That matters because Box drops such a prop without a word (`<Link href>` typechecks, and the `href` then goes nowhere). A test runs the highlighter over every snippet the docs compile and fails on any squiggle there. The vocabulary loads after the page has painted, so the editor's first paint is unchanged.

## Every code block on the site is themed, and styled by Box

Code blocks, the playground's editor and its generated-CSS pane now share **one highlighter**, and every colour in them is a part of one `Box.components()` tree ([`pages/extends.ts`](https://github.com/box-kite/box-kite/blob/main/pages/extends.ts)), set per theme with the `theme` key like any other style. The tree covers:

- the background, the header and its buttons;
- the gutter, the current line, the caret and the selection;
- one part per kind of token: tags and components, `<` and `>`, attributes and their values, text, comments, strings, numbers, keywords, brackets, and the rest.

So code follows the site's theme: VS Code's Light+ palette in light mode, Dark+ in dark mode. Restyling one colour is one line, for example `code.token.attributeValue` or `code.token.comment`.

Prism is gone. The highlighter is a small lexer written for this site (JSX/TS, JSON, CSS and shell), because it runs on every page, and Lezer, the obvious alternative, is 46 KB gzipped for the JSX grammar alone. Lezer still checks it: a test holds the lexer to Lezer's tree on every string, number, comment, tag and attribute in every snippet the docs compile. Swapping Prism's script and stylesheet for the lexer and the theme tree leaves a page's download the same (+70 bytes gzipped on `/button`). The tokens are rendered as React elements rather than injected HTML, so a prerendered page and the page that hydrates it are the same tree.

## Every component on one page, in both themes

[**box-kite.dev/showcase**](https://www.box-kite.dev/showcase) is all 38 components the library ships, on one page, each drawn **twice** — a light theme and a dark one side by side, whatever theme you are reading the page in. It is the page to open when you want to see what this looks like before installing anything, and the one to screenshot when you want to know whether a change moved something it should not have.

The two halves of every card are nothing but a `<Box.Theme use="local">` each:

```jsx
<Box.Theme use="local" theme="light">
  <Button>Save</Button>
</Box.Theme>
<Box.Theme use="local" theme="dark">
  <Button>Save</Button>
</Box.Theme>
```

That is the whole mechanism, and it is worth seeing at this scale: a theme is a class on an ancestor and every rule the engine writes is scoped to the subtree that theme owns, so a light half inside a dark page is light throughout — including for the props the inner theme never mentions. No re-render, no context read inside a component, no second stylesheet.

The list of components is not typed out: a test holds it to `api/components/*.json`, the reference generated from the components themselves, so one added to the library and not to the page fails CI. Where a component paints in the browser's top layer — a dialog, a menu, a tooltip — the card shows its trigger, which is what the page itself draws.

Every card links to the page that documents the rest of that component, and every snippet on those pages opens in the [playground](https://www.box-kite.dev/playground) — which a test now checks for each of them, rather than trusting that it is still true.

## The docs answer a question now

[**box-kite.dev**](https://www.box-kite.dev) has a search box: **/** or **⌘K** anywhere on the site, arrow keys through the results, Enter to open one. It searches the pages, every heading on them, and all 235 props — and a prop result opens the Box page with the finder filtered to that one prop, so `fontSize` is two keys and a return away from the CSS it writes.

Nothing is sent anywhere: the index is one file the build writes out of the rendered pages themselves (the markdown mirror's own walk, so it cannot fall behind what a page shows), fetched the first time the dialog opens. Two smaller things arrived with it — every page's footer links to the file it is written in on GitHub, and the version under the logo links to that version's release notes, since this site documents the newest release only.

## The MCP server is on npm

[`@box-kite/mcp`](https://www.npmjs.com/package/@box-kite/mcp) was documented and never published — `npx @box-kite/mcp` answered with a 404. It is published with every release now, at the same version as the library, so the references and the engine inlined in it are the ones the version you install was built from:

```bash
claude mcp add box-kite -- npx -y @box-kite/mcp
```

Six tools, no key and no network. The one worth installing it for is `check_styles`, which hands a prop bag to the real engine and reports the CSS each prop wrote — or that it wrote none, which is the answer to a value this library does not accept, since that value fails silently by design. It needs Node 22 or newer.

## Breaking changes

None.

## Fixes

- **Copy on a docs demo whose snippet had an event handler copied minified code.** A demo's snippet is printed from the demo itself, and a handler was printed with its own source, which the browser's bundle had minified: `/button`'s counter copied `onClick={()=>t(e=>e+1)}`. The prerendered page showed the readable version, so nothing looked wrong. A handler is now printed as `() => {}`, and the one demo whose handler is the point writes its snippet out.
- **`anchorName="none"` wrote `anchor-name: --none`, and `positionAnchor="auto"` wrote `--auto`.** The definition that accepts a name is tried before the one that lists the keywords, and it accepted those two as names — so the keyword definitions were unreachable. A name no longer swallows a keyword the prop takes on its own.
- **A layer that is open in server-rendered HTML rendered nothing on the server and the layer in the browser** — one React #418 per load, with nothing anywhere saying so. `Overlay` (and so `Tooltip`, the `Dropdown` popup and the DataGrid column menu) picks between two _shapes_, in place in the top layer or inside a portal, by asking the browser whether it has the Popover API — and a server has no browser to ask, so it took the portal branch, which renders nothing without a document. What a server emits is the top-layer shape now: the layer is in the HTML, it hydrates as it stands, and only a browser with no Popover API moves it into a portal, on the render after. A layer a browser mounts itself — every one this library ships opens that way — reads the real answer on its first render and never moves, which is what kept focus inside an open menu. `Toaster` and `Popover`, which had their own copies of this decision, share it.

  One trap worth knowing if you prerender: an `Overlay` anchored with `anchor` writes the anchor's name from an effect and the layer's `position-anchor` from the render, so the two agree only while your server tree and your client tree produce the same `useId` values. A tree with one more child in the browser than on the server (a hydration marker rendered beside the app, say) changes every id below it, React does not patch a mismatched attribute during hydration, and the layer then points at an anchor that does not exist. It was true of this library's own docs site until this release.
