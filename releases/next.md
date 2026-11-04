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

- **A DataGrid grouped two levels deep numbered its rows wrongly once an inner group was open** — the row-number column repeated and skipped numbers, and every "Select row N" label followed it. The rows are now numbered in the order they appear, group rows included, with inner groups open or shut in any combination; copying a group row's row-number cell copies the number it shows instead of a blank.
- **A DataGrid fed by a `dataSource` restarted its row numbers inside every open group, and inside every open row of a lazy tree** — a row's number was its place in the block the server sent. It is now its place on screen, the same count a grid grouped in the browser gives, and it follows when a group above it opens or shuts.
