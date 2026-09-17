# Box Kite next

_Unreleased. A PR that changes what a consumer sees adds its section here — see CONTRIBUTING.md, "Release notes"._

<!-- Intro: one or two sentences on what this release is about. The first one becomes the CHANGELOG line. -->

## Highlights

- **[A block of cells, and Ctrl+C](#a-block-of-cells-and-ctrlc)** — drag or Shift+arrow across a DataGrid and copy it straight into a spreadsheet.
- **[Ctrl+V, one judgement per cell](#ctrlv-one-judgement-per-cell)** — paste a block back in, judged by the same `def.onCellEdit` an editor is.

<!-- One bullet per section below, linking to it: **[Heading](#heading)** — one line on why it matters. -->

<!-- One `##` per change, above Breaking changes: a sentence for the heading, a paragraph on what and why, an example if it helps. -->

## A block of cells, and Ctrl+C

Every `DataGrid` now marks the cell its arrows carry on from — whether the pointer or the keyboard put it
there, and it stays marked once the grid loses focus. `Ctrl+C` on it copies that cell. `def.rangeSelection`
is the rest: drag across cells, or hold Shift with the arrow keys, and the block that is marked is what
`Ctrl+C` writes, tab-separated — the text Excel, Sheets and Numbers all paste as columns.

```jsx
<DataGrid
  data={people}
  def={{
    rowKey: 'id',
    rangeSelection: true,
    columns: [
      { key: 'first_name', header: 'First name' },
      { key: 'country', header: 'Country' },
      { key: 'age', header: 'Age', align: 'end' },
    ],
  }}
  onRangeChange={(range) => setSummary(range?.values())}
/>
```

The mark is state on the grid rather than a `:focus-visible` ring, which is what fixes it: that
pseudo-class never matches a pointer, so a _clicked_ cell drew nothing, and a ring made of focus goes out
the moment the grid loses it — leaving a copy with nothing to act on. The cells of a block report
`aria-selected` and the grid is `aria-multiselectable`; a lone current cell reports neither, because it has
chosen nothing. `onRangeChange` hands over the rectangle and `values()`, which reads what is in it through
the same pipeline an export uses — a column's `exportValue` where it has one, and an accepted edit over the
row — so the figure a status bar sums is the figure a `.csv` would carry.

A drag can mark cells or select text and never both, so a grid with `rangeSelection` on gives text selection
up; an open editor hands it back for the value being typed. A touch is left alone entirely, since that press
is how the grid scrolls.

[Range selection and copy](https://box-kite.dev/datagrid#range-selection)

## Ctrl+V, one judgement per cell

A block of cells goes back the other way now. `Ctrl+V` fills from the current cell — or from the block that
is marked, where one is — and every cell it covers goes through the same `def.onCellEdit` an editor would,
so a paste needs no second validator, no second event and no second way of writing a value. `onPaste`
reports the whole block once: what was written, what was refused and with which message, and how many cells
nothing could be written to.

```jsx
<DataGrid
  data={people}
  def={{
    rowKey: 'id',
    rangeSelection: true,
    columns: [
      { key: 'first_name', header: 'First name', editable: true },
      { key: 'salary', header: 'Salary', align: 'end', editable: true },
    ],
    onCellEdit: ({ columnKey, value }) =>
      columnKey === 'salary' && Number(value) < 0 ? 'Salary cannot be negative' : undefined,
  }}
  onPaste={({ applied, rejected }) => setReport({ written: applied.length, refused: rejected.length })}
/>
```

Each axis takes whichever is longer, the block or the clipboard: a block bigger than the clipboard is tiled
with it, a clipboard bigger than the block spills past it, and both stop at the edge of the grid. One rule,
with the degenerate case falling out of it — a paste onto the current cell alone starts from a block of one.

A refusal skips its own cell and nothing else, because a paste is many independent judgements and stopping
at the first bad value would leave the block half written with no way back. The refused cells wear the red
ring and report `aria-invalid`: there is no editor open on any of them to show a message in, so the cells
say which ones and `onPaste` says why. Since the clipboard carries no types, the cell is what says how to
read the text — a number column refuses what is not a number, a checkbox takes `true`/`false`, and a
`select` keeps to its own options and holds the option's value rather than its spelling.

A paste that reaches an open editor belongs to the editor: that is a value being typed, not a block being
filled. Everything a paste accepts lands in the same stream a typed value does, with a `reason` of `paste`.

[Ctrl+V, one judgement per cell](https://box-kite.dev/datagrid#paste)

## Breaking changes

None.

## Fixes

<!-- One bullet per fix: **What was wrong.** What it does now. -->

- **A DataGrid cell chosen with the pointer showed nothing, and no cell stayed marked once the grid lost focus.** The mark is the grid's own state now rather than a `:focus-visible` ring, so a clicked cell wears it, it survives a blur and a scroll, and `Ctrl+C` has something to copy. (#64)
