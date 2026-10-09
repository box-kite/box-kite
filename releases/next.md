# Box Kite next

_Unreleased. A PR that changes what a consumer sees adds its section here — see CONTRIBUTING.md, "Release notes"._

<!-- Intro: one or two sentences on what this release is about. The first one becomes the CHANGELOG line. -->

## Highlights

<!-- One bullet per section below, linking to it: **[Heading](#heading)** — one line on why it matters. -->

- **[A theme switch is smooth on a page of any size](#a-theme-switch-is-smooth-on-a-page-of-any-size)** — on the DataGrid docs page it took 7.8 seconds to settle, and now it settles in under half a second, with a new `viewTransition="reveal"` that grows the new theme out of the button.

<!-- One `##` per change, above Breaking changes: a sentence for the heading, a paragraph on what and why, an example if it helps. -->

## A theme switch is smooth on a page of any size

Every Box transitions `all` of its properties, and `color` is inherited — so flipping the theme started a transition on every element on the page at once, and each frame of it restyled them all. On the [DataGrid page](https://box-kite.dev/datagrid) that was 15,815 transitions per toggle and 7.8 seconds before the page was still again, in Chrome, Firefox and Safari alike. `<Box.Theme>` now pauses transitions for the one commit that changes the theme, and resumes them before the next frame — the same switch takes under half a second, and nothing else on the page notices. The vanilla `createThemeController()` does the same, and the pause is exported from `@box-kite/core` as `pauseTransitions()` for a theme switch of your own.

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
