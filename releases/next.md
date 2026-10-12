# Box Kite next

_Unreleased. A PR that changes what a consumer sees adds its section here — see CONTRIBUTING.md, "Release notes"._

<!-- Intro: one or two sentences on what this release is about. The first one becomes the CHANGELOG line. -->

## Highlights

<!-- One bullet per section below, linking to it: **[Heading](#heading)** — one line on why it matters. -->

- **[A theme switch is smooth on a page of any size](#a-theme-switch-is-smooth-on-a-page-of-any-size)** — on the DataGrid docs page it took 7.8 seconds to settle, and now it settles in under half a second, with a new `viewTransition="reveal"` that grows the new theme out of the button.

<!-- One `##` per change, above Breaking changes: a sentence for the heading, a paragraph on what and why, an example if it helps. -->

## A theme switch is smooth on a page of any size

Every Box transitions `all` of its properties, and `color` is inherited — so flipping the theme started a transition on every element on the page at once, and each frame of it restyled them all. On the [DataGrid page](https://box-kite.dev/datagrid) that was 15,815 transitions per toggle and 7.8 seconds before the page was still again, in Chrome, Firefox and Safari alike. `<Box.Theme>` now pauses transitions while the theme changes and lifts the pause once the new theme has painted — after the view transition, where one runs, so lifting it costs the animation no frame. The same switch settles in under half a second, and nothing else on the page notices. The vanilla `createThemeController()` does the same, and the pause is exported from `@box-kite/core` as `pauseTransitions()` for a theme switch of your own.

The animation is now the view transition's alone, which is a screenshot moved on the compositor and costs the same on ten elements as on ten thousand. `viewTransition` takes `'reveal'` beside `true`/`'fade'`: the new theme grows out of the control that was pressed — or the one that has focus, for a keyboard — as a circle.

```tsx
<Box.Theme use="global" storageKey="theme" viewTransition="reveal">
  <App />
</Box.Theme>
```

Without `viewTransition`, a theme change is now instant rather than a 250 ms colour fade. That fade is what cost the seconds, so the way to keep a theme change animated is `viewTransition`, which skips itself under reduced motion as before.

## Breaking changes

None.

## Fixes

<!-- One bullet per fix: **What was wrong.** What it does now. -->

- **A DataGrid whose columns fit its width showed a horizontal scrollbar anyway.** The last column's resize handle hung 3px past the grid's edge, enough for a scrollbar on Windows under every grid with flexible columns — and under a grid with a row detail open. That handle now sits inside the edge, same size, its line still on the grid's last pixel.
- **A DataGrid with too few rows to scroll kept an empty strip down its edge.** The grid reserved its vertical scrollbar's space whether or not there was a scrollbar, so a filter that emptied it — or any grid shorter than its height — showed the header and the footer stopping 15px short. The space is no longer reserved: the columns fill the grid, and when a scrollbar arrives they are resized before the browser paints, so no horizontal scrollbar flashes in between.
- **`contentVisibility` had no `auto`**, the one value that skips an off-screen subtree's rendering until it scrolls near. It takes `'auto'` beside `'visible'` and `'hidden'`; pair it with `css={{ containIntrinsicSize: 'auto 480px' }}`, the size it holds before it has ever rendered.
