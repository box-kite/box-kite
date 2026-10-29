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

- **In Safari, a date picker, a popover or a menu opened near the bottom of the screen first appeared below its trigger, partly off screen, and then jumped above it.** Safari computes the entrance before the flip, so the panel's position transitioned from the unflipped side. The flip now lands at once, and the panel opens where it fits (bug #300).
