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

- **`@box-kite/mcp`'s `search_docs` missed a CSS property spelled out in words, and a word no description used.** "border bottom" never reached `bb`, "margin top" ranked `top` above `mt`, and "on/off toggle" did not find `Switch`. Words that spell a property, in either order, now answer with the prop that writes it, and a short list of synonyms covers the rest (`toggle`, `rounded`, Chakra's `w`/`minW`, Tailwind's `leading`/`tracking`) (bug #303).
- **`check_styles` suggested the wrong prop for a CSS property it had no exact match for.** `borderBottom` suggested `borderColor`, `rounded` and `borderTop` suggested nothing, and `bg` suggested `b`. It now suggests the props that write that property or one of its longhands (`borderBottom` → `bb`, `background` → `bgColor`, `bgImage`…) and the same synonyms `search_docs` reads (`rounded` → `borderRadius`) (bug #304).
