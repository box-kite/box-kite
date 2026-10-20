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

- **A `Dialog`, a `Popover` or the DataGrid's bottom sheet could flash scrollbars as it opened.** The entrance scales or slides the layer, and while a transform runs the layer is the containing block of every `position: fixed` element inside it, so a password manager's badge on a text field was placed relative to the dialog rather than the viewport and its `overflow: auto` scrolled to it until the transform settled. The layer now keeps `overflow: hidden` until its entrance has finished and goes back to it as its exit starts, so nothing inside it can scroll while it moves. Content too tall for the layer still scrolls once it is open.
