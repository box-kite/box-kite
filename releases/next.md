# Box Kite next

_Unreleased. A PR that changes what a consumer sees adds its section here — see CONTRIBUTING.md, "Release notes"._

<!-- Intro: one or two sentences on what this release is about. The first one becomes the CHANGELOG line. -->

## Highlights

<!-- One bullet per section below, linking to it: **[Heading](#heading)** — one line on why it matters. -->

<!-- One `##` per change, above Breaking changes: a sentence for the heading, a paragraph on what and why, an example if it helps. -->

## A link styled by Box can stay in its sentence

Every Box was `display: block`, so margin and padding always apply, and a `<Link>`, a `<Time>` or a router link styled through `useClassNames` broke onto a line of its own mid-sentence. The inline phrasing elements (`a`, `span`, `label`, `time`, `mark`, `code`, `strong` and the rest) are `inline-block` now: margin and padding still apply, a `display` prop or component still wins, and images and other media stay block. An `inline-block` never breaks across lines, so a prose link that has to wrap with the text sets `display="inline"`.

```tsx
<P>
  Read the <Link props={{ href: '/guide' }}>guide</Link> first.
</P>
```

## Every field shows when it is invalid

`aria-invalid` now draws the field's border in red on `Textbox`, `Textarea`, `Select` and `Combobox`, through hover and focus and in both themes. None of them styled it before, and a `Combobox` could not be styled with `ariaAttr` at all, because the attribute is on its input and the border is the shell's: the shell reads it with `:has([aria-invalid="true"])`.

```tsx
<Combobox label="Owner" data={users} def={{ key: 'id', label: 'name' }} props={{ 'aria-invalid': true }} />
```

## Breaking changes

- **A link, label or other phrasing element styled by Box is `inline-block`, not `block`.** In a flex or grid parent nothing changes. In ordinary flow it no longer fills the row: two sibling links that stacked now share a line, and a link no longer takes the width of its parent. A link that wraps onto two lines inside a heading in an `ai="baseline"` row now aligns its neighbours with its last line, not its first, because an `inline-block`'s baseline is its last line. Where block was the layout you meant, set `display="block"` on the element (or on its component in `Box.components()`), and on a link that wraps inside a heading, `display="inline"`.

## Fixes

<!-- One bullet per fix: **What was wrong.** What it does now. -->

- **A `Combobox` gave its `id` to two elements.** The wrapper and the input both carried it, so a `<label htmlFor>` of your own found the wrapper, named nothing, and the browser named the field after its placeholder. The `id` is on the input only now. `TimeZoneSelect` had the same fault.
- **`DateField` and `DatePicker` dropped their `id`.** A generated one replaced it. It lands on the field's group now; name it from an external label with `labelledBy`.
- **`<Skeleton circle width={6} />` drew a 40px circle in a 24px box.** The circle had a fixed size of its own. It follows the skeleton's `width` now, and is still 40px when there is none.
- **`<P component="muted">` was a type error for a component of your own.** Every semantic component (`P`, `Span`, `H1`–`H6`, `Label`, `Link`…) was published with a fixed list of the built-in component names, so an app's `Box.components()` names and their variants were refused where `<Box tag="p">` took them. They take any registered component now, and `variant` follows the component you chose.
