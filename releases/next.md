# Box Kite next

_Unreleased. A PR that changes what a consumer sees adds its section here — see CONTRIBUTING.md, "Release notes"._

<!-- Intro: one or two sentences on what this release is about. The first one becomes the CHANGELOG line. -->

## Highlights

<!-- One bullet per section below, linking to it: **[Heading](#heading)** — one line on why it matters. -->

<!-- One `##` per change, above Breaking changes: a sentence for the heading, a paragraph on what and why, an example if it helps. -->

## Box Kite installs no third-party packages

`@box-kite/react` now depends on `@box-kite/core` and nothing else. The `css` prop's types used to come from the `csstype` package; they are now a generated copy inside `@box-kite/core`, so `css={{ … }}` is typed exactly as before and nothing extra is installed. The `use-sync-external-store` shim is gone too: the components use React's own `useSyncExternalStore`.

```shell
npm view @box-kite/react dependencies
# { '@box-kite/core': '<this version>' }
```

## Breaking changes

- **React 18 or newer is required.** The peer range was React 16.14 and newer, but the DataGrid, the date controls, `Popover`, `Dialog`, `Menu` and `Toaster` already needed React 18, and CI only ever tested 18 and 19. The peer range is now `>=18.0.0`, which is what was really supported. On React 16 or 17, stay on 2.3.x or upgrade React.

## Fixes

<!-- One bullet per fix: **What was wrong.** What it does now. -->

- **`@box-kite/core`'s types pointed at a package it did not install.** Its `css` prop types imported `csstype`, which the package never listed, so a TypeScript app using the engine without React got a missing-module error (or, with `skipLibCheck`, a `css` prop that accepted anything). The types are inside the package now.
