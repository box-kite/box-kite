# Box Kite next

_Unreleased. A PR that changes what a consumer sees adds its section here — see CONTRIBUTING.md, "Release notes"._

<!-- Intro: one or two sentences on what this release is about. The first one becomes the CHANGELOG line. -->

## Highlights

<!-- One bullet per section below, linking to it: **[Heading](#heading)** — one line on why it matters. -->

- **[The DataGrid's column chooser is a panel you can read](#the-datagrids-column-chooser-is-a-panel-you-can-read)** — a labelled Columns button, a search field you can see, and a switch per column grouped the way the header is.
- **[A theme switch is smooth on a page of any size](#a-theme-switch-is-smooth-on-a-page-of-any-size)** — on the DataGrid docs page it took 7.8 seconds to settle, and now it settles in under half a second, with a new `viewTransition="reveal"` that grows the new theme out of the button.

<!-- One `##` per change, above Breaking changes: a sentence for the heading, a paragraph on what and why, an example if it helps. -->

## A theme switch is smooth on a page of any size

Every Box transitions `all` of its properties, and `color` is inherited — so flipping the theme started a transition on every element on the page at once, and each frame of it restyled them all. On the [DataGrid page](https://box-kite.dev/datagrid) that was 15,815 transitions per toggle and 7.8 seconds before the page was still again, in Chrome, Firefox and Safari alike. `<Box.Theme>` now pauses transitions while the theme changes and lifts the pause once the new theme has painted — after the view transition, where one runs, so lifting it costs the animation no frame. The same switch settles in under half a second, and nothing else on the page notices. The vanilla `createThemeController()` does the same, and the pause is exported from `@box-kite/core` as `pauseTransitions()` for a theme switch of your own.

The animation is now the view transition's alone, which is a screenshot moved on the compositor and costs the same on ten elements as on ten thousand. `viewTransition` takes `'reveal'` beside `true`/`'fade'`: the new theme grows out of the control that was pressed — or the one that has focus, for a keyboard — as a circle.

```tsx
<Box.Theme use="global" storageKey="theme" viewTransition="reveal">
  <App />
</Box.Theme>
```

Without `viewTransition`, a theme change is now instant rather than a 250 ms colour fade. That fade is what cost the seconds, so the way to keep a theme change animated is `viewTransition`, which skips itself under reduced motion as before.

## The DataGrid's column chooser is a panel you can read

The column chooser was a searchable dropdown squeezed into an icon: closed, it was a bare glyph beside the title; open, its search field was a 0px input whose placeholder spilled across the grid's title, and every visible column was a solid indigo row. It is now a **Columns** button beside the search and export controls — with a `6/8` badge while some columns are hidden, and an accessible name that says so — opening a [`<Popover>`](https://box-kite.dev/popover) panel: a bordered search field (past six columns, focused on open), "6 of 8 shown" with **Show all** and **Hide all**, and one switch per column under its header group's name. A search narrows the list by column or group name, and the two bulk buttons act on what it matched. Up and Down walk the switches from the search field, Escape closes the panel and puts focus back on the button.

The panel is styled through the same `datagrid.topBar.columnVisibility` tree, which gains `panel`, `search`, `searchInput`, `toolbar`, `count`, `action`, `list`, `section`, `group`, `item` and `empty`. `localeText` gains `columnsMenuLabel`, `columnsMenuShown` and `columnsMenuNoMatch`, and the defaults for Show all and Hide all are sentence case now.

```tsx
<DataGrid data={rows} def={{ topBar: true, columns }} />
```

## Breaking changes

None.

## Fixes

<!-- One bullet per fix: **What was wrong.** What it does now. -->

- **Hiding a column broke a DataGrid with a `dataSource`.** The grid keeps a server row's model across renders, and the model kept the cells it was first built with — so every row still drew the hidden column, and its cells wrapped into the tracks of the columns after it. A row's cells now follow the visible columns, on a plain server grid, a grouped one and a tree.
- **A controlled `<Popover>` could never be opened from its trigger.** With `open={false}` the panel refused the browser's open — and never called `onOpenChange`, so the consumer was not told anyone had asked. It still refuses, and now reports `onOpenChange(true, { reason: 'trigger' })` a task later, which is what lets a controlled popover open at all.
- **A DataGrid whose columns fit its width showed a horizontal scrollbar anyway.** The last column's resize handle hung 3px past the grid's edge, enough for a scrollbar on Windows under every grid with flexible columns — and under a grid with a row detail open. That handle now sits inside the edge, same size, its line still on the grid's last pixel.
- **A DataGrid with too few rows to scroll kept an empty strip down its edge.** The grid reserved its vertical scrollbar's space whether or not there was a scrollbar, so a filter that emptied it — or any grid shorter than its height — showed the header and the footer stopping 15px short. The space is no longer reserved: the columns fill the grid, and when a scrollbar arrives they are resized before the browser paints, so no horizontal scrollbar flashes in between.
- **`contentVisibility` had no `auto`**, the one value that skips an off-screen subtree's rendering until it scrolls near. It takes `'auto'` beside `'visible'` and `'hidden'`; pair it with `css={{ containIntrinsicSize: 'auto 480px' }}`, the size it holds before it has ever rendered.
