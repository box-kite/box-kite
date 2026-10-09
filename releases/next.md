# Box Kite next

_Unreleased. A PR that changes what a consumer sees adds its section here — see CONTRIBUTING.md, "Release notes"._

<!-- Intro: one or two sentences on what this release is about. The first one becomes the CHANGELOG line. -->

## Highlights

<!-- One bullet per section below, linking to it: **[Heading](#heading)** — one line on why it matters. -->

<!-- One `##` per change, above Breaking changes: a sentence for the heading, a paragraph on what and why, an example if it helps. -->

## A DataGrid header hovers as a pill, and the pill can flow between cells

A sortable header cell no longer fills edge to edge on hover: it paints an inset pill with a 4px radius, 4px in from every side and 4px clear of the column's resizer line on either side of it, as a tint so it reads on a pinned column's fill too. The resizer's handle now straddles the column boundary, so the line is the boundary. The column menu's ⋮ button hovers as a stronger tint on top of the pill, and it sits 12px from its edge, which centres it in a column at its minimum width. Over the resizer the cell does not hover at all, since a press there resizes rather than sorts. `def.headerHover: 'sliding'` swaps the pill per cell for one pill for the whole header, which flows to the cell under the pointer — the edge it moves towards leads and the other catches up, so it stretches and settles rather than jumping. It rides `--transitionTime`, so reduced motion makes it jump.

```tsx
<DataGrid data={rows} def={{ columns, headerHover: 'sliding' }} />
```

Styling is `datagrid.header.cell`'s `hasHoverPill` variant and `datagrid.header.hover` for the travelling one.

## Every word the DataGrid writes can be translated

`def.localeText` takes any subset of `DataGridLocaleText`: the labels, accessible names, placeholders, menu items, the bottom bar, pagination, the empty and error states, edit messages and the selection announcement. About sixty strings, everything the grid writes itself; what you leave out stays English. A value with a number or a name in it is a function, so a language puts its words in its own order instead of the grid gluing pieces together; `DATA_GRID_LOCALE_TEXT` is the English, exported to spread over.

```tsx
import DataGrid, { DATA_GRID_LOCALE_TEXT, type DataGridLocaleText } from '@box-kite/react/components/dataGrid';

const de: DataGridLocaleText = {
  ...DATA_GRID_LOCALE_TEXT,
  clearFilters: 'Filter zurücksetzen',
  rowCount: (filtered, total) => (filtered === total ? `${total} Zeilen` : `${filtered} von ${total} Zeilen`),
  selectRow: (row) => `Zeile ${row} auswählen`,
};

<DataGrid data={rows} def={{ columns, localeText: de }} />;
```

Write the object once and hand the same one to every grid. A test renders every part of the grid with each string replaced by a marker and fails on any English left over, so a string added later cannot slip past it.

## A DataGrid selection survives a filter, and the bottom bar says how much of it is hidden

A filter never drops a selected row, so a selection can be partly out of sight; the bottom bar now says so — `Selected: 5 (2 hidden)` — and offers two ways out. **Show selected** is a toggle that shows the selected rows whatever the filters say (it sets them aside rather than adding to them, since the rows it is for are the hidden ones), and a row unticked in that view stays where it is rather than vanishing under the pointer; typing a filter, or Clear filters, leaves the view. **Clear selection** clears every selected row, hidden ones included, with a reason of `'clear'`. The header checkbox acts on the rows on screen: it ticks them, its state is theirs, and pressing it again clears them and leaves the hidden selection alone. Show selected is offered where the grid filters its own rows — not with a datasource, server-side pagination or a tree, where it cannot set the filters aside.

The two buttons are `datagrid.bottomBar.action` (its `pressed` variant is Show selected while on) inside `datagrid.bottomBar.selection`, and their words are `localeText.showSelected`/`clearSelection`; `selectedCount` now takes the hidden count as its second argument.

## Breaking changes

None.

## Fixes

<!-- One bullet per fix: **What was wrong.** What it does now. -->

- **The DataGrid's "Clear filters" was a `div` the keyboard could not reach.** It is a real button now, beside the row count it resets, and grey until hovered rather than a blue link — it changes the view, it does not go anywhere. The filtered-count badge in the top bar is neutral rather than violet and appears only on a grid with no bottom bar, which already shows the count.
- **"Clear filters" left the DataGrid's filter inputs showing the old text.** The rows came back but the column filters and the search box kept what had been typed, because each input read the filter once when it mounted. They follow the grid's filters now — cleared from the footer or changed through a controlled `columnFilters`/`globalFilterValue` — and drop a commit still waiting on the debounce.
- **The DataGrid's select-all checkbox selected rows the filters hid.** With a filter on, ticking the header selected every row in `data`, so a bulk action on "all" reached rows nobody could see; and its checked state compared counts, so it could read "all" with rows on screen unticked. It selects and clears the rows on screen now, and its state is theirs.
- **Every press in a DataGrid redrew every row on screen, twice.** Moving the tab stop handed every cell a new context value, and any change to the grid — a row ticked, a cell made current, a keystroke in an editor — redrew the whole window. A focus move now redraws the two cells it moved between, the header and its filters redraw only when something they show changed, and each row compares a version of its own, so ticking a row redraws that row. Measured on the docs demo, ticking a row went from 24–40 ms to one frame (56–72 ms from 104–160 ms at 4× CPU throttling). A `Cell` of your own redraws when its row or the grid changes — not when another row is selected.
- **The DataGrid's sort arrow took 300 ms to turn.** It flips in 180 ms on a curve that covers most of the turn in the first frames, so the new direction reads at once; reduced motion turns it off.
- **A `Checkbox` or `RadioButton` drew its focus ring on a mouse click, fading in from black.** The ring is the keyboard's (`focusVisible`) now and wears its colour before it is drawn, and the fill changes in 100 ms rather than 250 ms. A theme that restyled the ring under `focus` should move it to `focusVisible`.
- **Only a DataGrid header's label sorted the column.** A press anywhere in a sortable header cell sorts it now, its padding included; the column menu's trigger and the resizer keep their own presses, and a resize drag released over the cell does not sort.
