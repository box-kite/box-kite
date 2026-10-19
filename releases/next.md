# Box Kite next

_Unreleased. A PR that changes what a consumer sees adds its section here — see CONTRIBUTING.md, "Release notes"._

A second design for the same app, chosen in CSS: `Box.components(styles, { design })`, two colour families every component is drawn in, and `Box.useDesign()` to switch between them.

## Highlights

- **[A design can be chosen in CSS](#a-design-can-be-chosen-in-css-so-a-stored-choice-paints-before-react-runs)** — a whole second look for every component, switched by one attribute, with no flash on a prerendered page.
- **[Every component is drawn in accent and base](#every-component-is-drawn-in-accent-and-base-and-boxpalette-points-them-elsewhere)** — a brand colour is one `vars` record rather than a restyle of every component.
- **[Box.Theme keeps a design beside the theme](#boxtheme-keeps-a-design-beside-the-theme)** — `design`, `designStorageKey` and `Box.useDesign()`.
- **[A part can extend](#a-part-can-extend-a-component-or-another-part)** — `trigger: { extends: 'button' }` now does what it says.

## A design can be chosen in CSS, so a stored choice paints before React runs

`Box.components()` takes a second argument: with `{ design: 'ember' }` the styles are a design of their own, merged over the app's components and applied wherever an ancestor carries `data-design="ember"`. A design is selected by an attribute rather than by React context, so a reader's stored choice can be written onto `<html>` before the first paint and a prerendered page never hydrates against a different design than the one it painted. Every rule of a design is one class more specific than the same rule without it, so each state the app's design styles — a theme, a hover, a variant — is outranked by the same state of the design, and a design nested inside another one stops the outer one there. A component a design leaves alone costs nothing.

```tsx
Box.components({ button: { styles: { borderRadius: 2.5 } }, dialog: { styles: { borderRadius: 5 } } }, { design: 'ember' });
```

`<Box.Components value>` and `Box.createComponents()` are unchanged: a registry is still the answer for a subtree whose design React decides.

## Every component is drawn in accent and base, and Box.palette() points them elsewhere

The palette has two more families, `accent` and `base`, which start as copies of `indigo` and `gray` — the colours the built-in components always used — and every built-in component is now drawn in them. `Box.palette({ accent: 'orange', base: 'stone' })` is the `vars` record that repoints them for an element and everything inside it, by family name or with eleven colours of your own, so it nests in `theme`, a breakpoint or `dataAttr` like any other `vars`.

```tsx
<Box vars={Box.palette({ accent: 'orange', base: 'stone' })} theme={{ dark: { vars: Box.palette({ accent: 'amber' }) } }}>
  <Button>Save</Button>
</Box>
```

Nothing looks different until a family is pointed somewhere: `accent-500` resolves to `indigo-500`'s value. A class name a test asserted on changes with it — `bgColor-indigo-500` on a built-in component is `bgColor-accent-500` now.

## Box.Theme keeps a design beside the theme

`<Box.Theme design="classic" designStorageKey="design">` writes `data-design` on `<html>` (or on its wrapper with `use="local"`), restores a stored choice after hydration without writing the default over one a pre-paint script already set, and `const [design, setDesign] = Box.useDesign()` reads and switches it; `null` goes back to the `design` prop. A design change pauses transitions the way a theme change does, and takes `viewTransition` too.

## A part can extend a component, or another part

`extends` on a component's part was silently ignored: only a top-level component could extend. A part now extends a component by name or another part by its dotted path — `trigger: { extends: 'button' }`, `title: { extends: 'dialog.title' }` — with the same merge a component gets.

## Two values a design kept reaching for

`bgGradient="none"` takes a gradient back off, which nothing could do before: `bgGradient` is declared after `bgImage` and wins `background-image`, so a variant's `bgImage: 'none'` never reached it. `letterSpacing` takes Tailwind's tracking names — `tighter`, `tight`, `normal`, `wide`, `wider`, `widest` — in `em`, so a display heading keeps its tightness at every size; a number is still pixels.

## A DataGrid column group can be styled as its own tier

A header cell over a group of columns now carries the `isGroup` variant, so `datagrid.header.cell` can set the group row apart from the column titles under it — `variants: { isGroup: { color: 'base-700' } }` — where before the two rows could only look the same.

## Breaking changes

None.

## Fixes

- **A button and a switch drew their focus ring on every click, in a colour too faint to see.** Both now draw it on `:focus-visible` only, solid `accent-500` (`accent-400` in the dark theme) — 3:1 against the page, which `accent-200` was not.
- **A DataGrid's own controls ignored the palette a design set.** The handful of colours the grid's parts wrote inline (the empty state, the filter icons, the pagination hover) are drawn in `base` and `accent` like the rest of its tree.
- **An indeterminate checkbox drew a fixed violet dash that no design could reach.** It is now filled like a checked box, in `accent-500`, with a white dash — the same shape as the tick, and the platform's convention for the mixed state.
