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

- **A closing `Dialog`, `Popover`, `Menu` or `DatePicker` emptied before its exit ran**, so a sheet slid out as a blank panel and a date picker shrank to its padding before fading. Content gated with `{open && <Form />}` — the pattern each component's docs recommend — and the date picker's own calendar now stay on screen until the layer's exit transition has finished, then unmount. Under `prefers-reduced-motion` the exit takes no time, so they unmount in the same commit as before.
- **A closing `Combobox` left a scrollbar behind while its list faded out.** The layer an `Overlay` positions its content in took the browser's `overflow: auto` for popovers, so the few pixels the content slides on its exit made it scrollable. It is `overflow: visible` now, which also covers the `Dropdown`, `Tooltip` and DataGrid popups built on it.
- **An Azure dialog or popup with a text field could scroll on both axes for as long as it was open.** The design frosted its layers with `backdropBlur`, which makes an element the containing block of every `position: fixed` element inside it — so a password manager's badge on the field landed inside the dialog and made it scrollable. The Azure template from `npm create @box-kite` draws its dialog and floating layers near-opaque instead, and keeps the blur on the page behind a modal.
