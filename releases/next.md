# Box Kite next

_Unreleased. A PR that changes what a consumer sees adds its section here — see CONTRIBUTING.md, "Release notes"._

<!-- Intro: one or two sentences on what this release is about. The first one becomes the CHANGELOG line. -->

## Highlights

<!-- One bullet per section below, linking to it: **[Heading](#heading)** — one line on why it matters. -->

- **[A design can stop at the edge of a subtree](#a-design-can-stop-at-the-edge-of-a-subtree)** — two designs on one page, one stylesheet.

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

## Breaking changes

None.

## Fixes

<!-- One bullet per fix: **What was wrong.** What it does now. -->

- **A component built on another with `extends` was unstyled until the app called `Box.components()`, and missed a later override of its base.** The built-in `gauge` (`extends: 'progressRing'`) rendered without its ring paint in an app that registered nothing. `extends` is now resolved over everything registered, chains included, every time the registry changes.
- **A prop you wrote lost to a component's dark-theme default.** `<Button bgColor="red-500">` stayed indigo in dark mode: the button's own `theme.dark.bgColor` survived the merge, and a theme rule outranks a plain class. A prop now replaces the component's value for that prop in every theme, at the level you wrote it (`bgColor` clears `theme.*.bgColor`, and `hover.bgColor` clears the themed hover), while everything you did not mention keeps its dark styling. If you relied on the old result, write the dark value yourself: `theme={{ dark: { bgColor: 'indigo-500' } }}`.
