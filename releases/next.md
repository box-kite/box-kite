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

## The docs answer a question now

[**box-kite.dev**](https://www.box-kite.dev) has a search box: **/** or **⌘K** anywhere on the site, arrow keys through the results, Enter to open one. It searches the pages, every heading on them, and all 235 props — and a prop result opens the Box page with the finder filtered to that one prop, so `fontSize` is two keys and a return away from the CSS it writes.

Nothing is sent anywhere: the index is one file the build writes out of the rendered pages themselves (the markdown mirror's own walk, so it cannot fall behind what a page shows), fetched the first time the dialog opens. Two smaller things arrived with it — every page's footer links to the file it is written in on GitHub, and the version under the logo links to that version's release notes, since this site documents the newest release only.

## Breaking changes

None.

## Fixes

- **`anchorName="none"` wrote `anchor-name: --none`, and `positionAnchor="auto"` wrote `--auto`.** The definition that accepts a name is tried before the one that lists the keywords, and it accepted those two as names — so the keyword definitions were unreachable. A name no longer swallows a keyword the prop takes on its own.
