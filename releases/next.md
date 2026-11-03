# Box Kite next

_Unreleased. A PR that changes what a consumer sees adds its section here — see CONTRIBUTING.md, "Release notes"._

<!-- Intro: one or two sentences on what this release is about. The first one becomes the CHANGELOG line. -->

## Highlights

<!-- One bullet per section below, linking to it: **[Heading](#heading)** — one line on why it matters. -->

<!-- One `##` per change, above Breaking changes: a sentence for the heading, a paragraph on what and why, an example if it helps. -->

## A checkbox's tick is a colour you choose, and it stays visible in high contrast

The tick, the indeterminate dash and the radio dot used to be images with white written into them, so nothing on the page could recolour them: not a dark theme, not a design, and not Windows High Contrast, which kept the white tick and replaced the fill under it with white. They are shapes now, drawn on the control's `::before` and painted by its `bgColor`, so a design recolours a mark the way it recolours anything else:

```tsx
Box.components({
  checkbox: { styles: { theme: { dark: { checked: { bgColor: 'base-50', before: { bgColor: 'base-950' } } } } } },
});
```

`maskImage` takes the three shapes as values (`'check'`, `'dash'`, `'dot'`) for a control of your own. Thanks to the reader who pointed out, under our [dark mode article](https://www.box-kite.dev/blog/dark-mode-without-the-flash/), that a colour written into an SVG does not follow the theme.

## Breaking changes

None.

## Fixes

<!-- One bullet per fix: **What was wrong.** What it does now. -->

- **A checked `Checkbox` or `RadioButton` looked unchecked under forced colours on a light scheme** (bug #317). The fill is `Highlight` and the mark `HighlightText` there now, in every theme.
- **A `RadioButton` with no label stretched across its container in Firefox** (bug #318). It is `inline-block`, like `Checkbox`.
