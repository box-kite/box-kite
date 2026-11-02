# Box Kite next

_Unreleased. A PR that changes what a consumer sees adds its section here — see CONTRIBUTING.md, "Release notes"._

<!-- Intro: one or two sentences on what this release is about. The first one becomes the CHANGELOG line. -->

## Highlights

<!-- One bullet per section below, linking to it: **[Heading](#heading)** — one line on why it matters. -->

<!-- One `##` per change, above Breaking changes: a sentence for the heading, a paragraph on what and why, an example if it helps. -->

## Breaking changes

None.

## Fixes

<!-- One bullet per fix: **What was wrong.** What it does now. -->

- **From 2.2.6 to 2.2.15 `@box-kite/core` shipped without `core/extends/boxComponents.d.ts`, so the built-in components typed as `any`.** Six of its declaration files import that one, and with `skipLibCheck: true` (every Vite and Next template) the missing file was silent: `<Box component="cardd" />`, `<Box component="button" variant="nonsense" />` and a misspelt value inside a `Box.components()` entry all type-checked. The file is back, at a seventh of its old size, so **an app that compiled on 2.2.15 may now report errors** — each one is a component name, a variant or a value that never rendered anything, and the fix is the one the message names. `BoxComponentStyles` is an interface now rather than a type alias, which is what lets a declaration name it instead of writing out every prop at every use.
- **Five `@box-kite/react` declaration files reached into `@box-kite/core` by a relative path the package does not contain.** `react/componentsContext.d.ts`, three DataGrid files and `DashboardUtils.SCHEMA` named `../core/…` or `../../../types`, which resolve to nothing in an installed package, so the DataGrid's `component` prop and the dashboard schema read as `any` under `skipLibCheck: true` and failed to compile without it. They import `@box-kite/core` by name now, and the package no longer carries declarations for the MCP server, `create`, the registry and Supabase, which nothing could import.
- **A `ChartContainer` series painted with a `Box.extend()` token rendered transparent.** `series={{ completed: 'ui-primary', started: 'ui-primary/35' }}` type-checked and then declared `--color-completed: ui-primary`, which is not a colour, so every bar and legend swatch reading `var(--color-completed)` drew nothing and nothing said why. The same gap was in `vars` and `css` themselves, which resolved the palette's tokens but not an app's. Both now resolve an app token, and its opacity form, exactly as `fill` does: `var(--ui-primary)` and `color-mix(in oklab, var(--ui-primary) 35%, transparent)`. A series paint `fill` would refuse is left out rather than written as text, with a development warning naming the nearest token (`Did you mean "teal-500"?`). A colour written as CSS was never a series paint, and still is not; it goes in [`vars`](https://box-kite.dev/charts#recharts-notes): `vars={{ 'color-completed': 'hsl(var(--primary))' }}`.
- **A hand-written `var(--brand)` naming a `Box.extend()` variable named nothing unless something else used the token.** `fill="var(--brand)"`, a `MiniDonut` colour, a `vars` entry and a variable defined in terms of another all wrote the reference without declaring `--brand` in `:root`, so the paint was transparent. Each one declares it now, the way `fill="brand"` always did.
