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

- **A toast fired from inside an open modal was under its backdrop.** Everything outside an open modal `Dialog` is inert, so the toast was dimmed, a press on it landed on the dialog, its close button could not take focus and a screen reader never heard it. While a modal `Dialog` is open, `<Toaster>` now moves its stack inside it, shown after it, and back out when the dialog closes; Escape on a toast there dismisses the toast and leaves the dialog open.
- **The toast's close button is softer.** The cross is two filled bars with rounded ends on a round button. The old one was meant to be two 1px lines, but its unset border sides fell back to `medium`, so each stroke rendered 16px by 4px with square ends.

- **A gradient stop refused a colour added with `Box.extend()`.** `bgGradient={{ linear: 'r', colors: ['brand', 'brand/40'] }}` was judged whole and wrote no gradient at all, while every other place a colour is written took the token. A stop now takes an `extend()` colour and its opacity form on `bgGradient` and `maskImage`, and typechecks wherever `bgColor` has been augmented with it.
- **A shorthand prop lost to a component's longhand.** `<Button p={0}>` kept the button's own `px` and `py`, because the component's longhands were declared after the caller's shorthand. A shorthand you pass now replaces the component's longhands under it, at the level you set it: `p` covers `px`/`py`/`pt`…, and the same goes for `m`, `b`, `borderRadius`, `inset`, `gap`, `overflow`, `gridColumn` and `gridRow`, in every design and theme. A component's `hover={{ px: … }}` still applies on hover, the way `hover:px-6` survives `p-0` in tailwind-merge.
- **`inset` beat a side written next to it.** `<Box inset={0} top={2}>` had `top: 0`, because `top`/`right`/`bottom`/`left` were declared before `inset`. A side now wins over `inset`, `insetX` and `insetY` on the same element.
- **Escape dropped focus to the page when a panel's content was gated on `open`.** With `prefers-reduced-motion` (or a panel styled with no exit transition), `<Popover>`, `<Menu>` and `<DatePicker>` unmounted the focused child before the browser looked for it, so focus landed on `<body>` instead of the trigger. A layer that holds focus as it closes now puts it back on whatever had focus when it opened, while the panel is still shown; a press outside still leaves focus where the press put it.
