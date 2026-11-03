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

- **A gradient stop refused a colour added with `Box.extend()`.** `bgGradient={{ linear: 'r', colors: ['brand', 'brand/40'] }}` was judged whole and wrote no gradient at all, while every other place a colour is written took the token. A stop now takes an `extend()` colour and its opacity form on `bgGradient` and `maskImage`, and typechecks wherever `bgColor` has been augmented with it.
- **A shorthand prop lost to a component's longhand.** `<Button p={0}>` kept the button's own `px` and `py`, because the component's longhands were declared after the caller's shorthand. A shorthand you pass now replaces the component's longhands under it, at the level you set it: `p` covers `px`/`py`/`pt`…, and the same goes for `m`, `b`, `borderRadius`, `inset`, `gap`, `overflow`, `gridColumn` and `gridRow`, in every design and theme. A component's `hover={{ px: … }}` still applies on hover, the way `hover:px-6` survives `p-0` in tailwind-merge.
- **`inset` beat a side written next to it.** `<Box inset={0} top={2}>` had `top: 0`, because `top`/`right`/`bottom`/`left` were declared before `inset`. A side now wins over `inset`, `insetX` and `insetY` on the same element.
