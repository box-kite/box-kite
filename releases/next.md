# Box Kite next

_Unreleased. A PR that changes what a consumer sees adds its section here — see CONTRIBUTING.md, "Release notes"._

<!-- Intro: one or two sentences on what this release is about. The first one becomes the CHANGELOG line. -->

## Highlights

- **[A block of cells, and Ctrl+C](#a-block-of-cells-and-ctrlc)** — drag or Shift+arrow across a DataGrid and copy it straight into a spreadsheet.
- **[Ctrl+V, one judgement per cell](#ctrlv-one-judgement-per-cell)** — paste a block back in, judged by the same `def.onCellEdit` an editor is.
- **[A hundred thousand rows, and a page that measures them](#a-hundred-thousand-rows-and-a-page-that-measures-them)** — the grid benchmark is public, reruns in your own browser against AG Grid, MUI X and TanStack, and says where this grid wins and where it does not.
- **[Free here, paid elsewhere](#free-here-paid-elsewhere)** — fourteen data grid features against seven tiers of AG Grid, MUI X and TanStack, with what each one costs and where it was checked.
- **[A fling renders where you are going](#a-fling-renders-where-you-are-going)** — the DataGrid keeps its rendered rows ahead of the scroll instead of on both sides of it: 36 rows around an 18-row screen where it used to be 58, and a fling at 125 frames a second where it was 81.
- **[`npx shadcn add @box-kite/data-grid`](#npx-shadcn-add-box-kitedata-grid)** — three finished sections the shadcn CLI installs into your own repository, from a registry on box-kite.dev.
- **[What an AI may build, as JSON Schema](#what-an-ai-may-build-as-json-schema)** — `catalog()` describes every component and every value its props take, so a generated UI can be validated before it renders and cannot invent a colour.
- **[The DataGrid exports its types](#the-datagrid-exports-its-types)** — `ColumnType`, `GridDefinition`, `CellModel` and the rest come off `components/dataGrid` now instead of a path inside it.

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
    onCellEdit: ({ columnKey, value }) => (columnKey === 'salary' && Number(value) < 0 ? 'Salary cannot be negative' : undefined),
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

## A hundred thousand rows, and a page that measures them

There is a benchmark page on the docs site now — [box-kite.dev/benchmark](https://box-kite.dev/benchmark) —
and it is not a table of numbers somebody typed in. It generates a hundred thousand rows of twenty columns
in your own browser, drives the grid through five operations and reports what it measured on your machine:
first render, a two-second fling, a column filter, a sort and a grouping with totals. What it leaves out is
on the page beside the numbers, because a benchmark that only flatters the thing it measures is an
advertisement.

Writing it found two renders the `DataGrid` was doing for nothing, and both are fixed here. A scroll that
did not change which rows were on screen was re-rendering every cell in the window; it now costs the
transform and nothing else. A scroll that brought one new row in was re-rendering every row in the window;
it now renders the row that arrived. On the machine the published figures come from, the median frame of a
fast fling over a hundred thousand rows **halved, from 24 ms to 12 ms** — forty-one frames a second to
eighty-two, with the worst frame down from 38 ms to 24 — and not a prop changed.

**It measures the other grids too.** Tick AG Grid Community, the free MUI X Data Grid or TanStack Table
with a hand-written UI, and the page drives each of them through the same five operations, one after the
other, and prints them side by side — each library downloaded only when it is picked, so reading the page
costs nothing. Two of the cells are not about speed at all: AG Grid puts row grouping behind Enterprise and
MUI X behind Premium, and the free MUI grid forces pagination at a hundred rows a page, so it has no
hundred thousand rows to fling. Those cells carry the reason rather than a number, because a grid measured
doing something else is worse than a blank.

What it says about this grid, on one quiet laptop, five runs of a hundred thousand rows by twenty columns:
first render, filter and sort are in the same class as AG Grid's and MUI X's, the grouping is the fastest of
the four and only two of them can do it at all — and **the fling was the one this grid was behind on**,
about 20 ms of work a frame against AG Grid's 2.6 and a hand-rolled TanStack table's 2.8, eighty-one frames
a second against a hundred and sixty-four. That is what the next section is about: the fling is inside a
frame now, and what is left of the gap is the work inside it.

`npm run bench` is the same measurement headless, and it is the whole harness: the page is the benchmark
and the script only presses its button, so a rerun in CI measures the code a reader measures. It runs on
every pull request that touches the grid or the engine, against budgets sized for a shared runner — and
only for this grid, so asking it for a comparison never fails a build.

[The benchmark](https://box-kite.dev/benchmark)

## A fling renders where you are going

A `DataGrid` kept twenty rows rendered on each side of its viewport, whichever way the rows were actually
moving — fifty-eight of them around an eighteen-row screen, where AG Grid renders about twenty-eight and a
hand-written virtual table twenty-six. A buffer is cover for the frame between a scroll and the render that
answers it, so it is only ever wanted in the direction of travel. It is **twelve rows ahead and four
behind** now, and it turns round when the reader does. Nothing to configure, and no prop changed.

Thirty-six rows instead of fifty-eight, on the same quiet laptop the benchmark's published figures come
from: the median frame of a fling over a hundred thousand rows went from **12.3 ms to 8.0 ms** — 81 frames
a second to 125 — with the work inside the frame down from 19.8 ms to 15.3, and first render 89 ms to 81,
filter 65 to 42 and sort 89 to 76 carried along with it.

The number that keeps that honest is new, because a grid that renders nothing at all is the fastest grid on
the page. The benchmark now flicks each grid past at ten thousand pixels a second — the top of what a hard
flick reaches, five rows between one frame and the next at 60 fps — and hit-tests four points down it at
the start of every frame, against the scroll position that frame is about to paint. Box Kite, AG Grid
Community and the TanStack baseline paint every one of those frames. With the buffer taken away altogether
the same pass reports every frame blank, which is what says it is looking at something; with eight rows of
cover instead of twelve, four frames in a hundred.

[The benchmark](https://box-kite.dev/benchmark)

## Free here, paid elsewhere

There is a second page beside the benchmark now — [box-kite.dev/grid-comparison](https://box-kite.dev/grid-comparison) —
and it answers the question the numbers do not: fourteen data grid features against seven tiers of AG Grid,
MUI X, TanStack Table and this library, with what each tier costs and the day the price was read. Twelve of
the fourteen ship here under the same MIT licence as the rest of the library. Row grouping, aggregation, a
real `.xlsx`, a server-side row model, tree data, master/detail panels, range selection and paste are
AG Grid Enterprise at $999 a developer, or MUI X Premium at $599 a developer a year.

Every tick in this library's column links to a working demo on the data grid page, and a test fails the
build if one of them ever points at a section that is not there. Two of the fourteen rows are crosses in
that column — there is no pivoting here and no dragging a header to reorder its column, and both are ticks
for the paid tiers — because a table with no cross in its own column is an advertisement rather than a
comparison.

The cells were read out of the packages rather than off a marketing page, and the page says so row by row.
AG Grid publishes its split in its own types: `EnterpriseModuleName` in `ag-grid-community` names every
module the free package does not implement, which is where `RowGroupingModule`, `ExcelExportModule`,
`TreeDataModule`, `MasterDetailModule`, `CellSelectionModule` and `ServerSideRowModelModule` come from —
and column pinning is deliberately _not_ in it, so that row is a tick for AG Grid Community. The free MUI X
grid's whole feature set is the list of hooks its own `useDataGridComponent` calls, which is also where two
things that are forced on rather than absent turn up: `disableColumnReorder: true`, and a pagination that
throws above a hundred rows a page. The prices were read off the vendors' own pricing pages on 2026-09-18
and are linked from the page, since neither comparison is helped by a number that was true last year.

[Free here, paid elsewhere](https://box-kite.dev/grid-comparison)

## `npx shadcn add @box-kite/data-grid`

There is a shadcn registry on the docs site now, and three blocks in it — an invoices data grid, a settings
form and a dashboard shell. A block is not a component: it is a finished section that the CLI writes into
your own repository, so the composition is yours to edit from the first commit while the components under
it stay a package you upgrade.

```shell
npx shadcn@latest add https://box-kite.dev/r/data-grid.json
```

Register the namespace once in `components.json` and the address becomes a name — `npx shadcn@latest add
@box-kite/settings-form`, and `npx shadcn@latest search @box-kite` lists what is there:

```json
{
  "registries": {
    "@box-kite": "https://box-kite.dev/r/{name}.json"
  }
}
```

**None of it needs Tailwind.** The CLI wants a `components.json` with a `tailwind` key in it and empty
strings satisfy it, because these blocks import no stylesheet and write no CSS file — every style in them
is a prop. Verified end to end against a fresh `create-next-app`: the files land, `lucide-react` installs
with the dashboard shell, and `next build` prerenders the page with the CSS in the HTML.

The blocks are ordinary sources in the library's own repository, type-checked by the same `tsc` run as the
library and rendered live on [the registry page](https://box-kite.dev/registry) from those same files, which
are inlined into the JSON at build time. So a block that stops compiling cannot be published, and what the
CLI writes is what the page is running.

[The blocks](https://box-kite.dev/registry)

## What an AI may build, as JSON Schema

There is a new entry point, `@box-kite/react/catalog`. It answers the question a generative-UI runtime
asks: which components may a model compose, and what may it put in their props? Everything else the package
ships for AI is read at development time by whatever writes your code. This is the runtime half — what a
model is allowed to build while your app is running.

```ts
import { catalog } from '@box-kite/react/catalog';

// The allow-list is yours: the library ships everything it can render, and the app says what it wants.
const allowed = catalog({ include: ['Flex', 'H2', 'P', 'Sparkline'], styleProps: ['d', 'gap', 'p', 'bgColor', 'fontSize'] });

allowed.components.Flex.props; // a strict JSON Schema, ready for a structured-output API
allowed.rules; // the dividers — what a schema cannot state and a prompt must
```

The reason this library can answer it at all is that the props already _are_ a constrained, serializable
design language: a Box tree and a JSON UI spec are the same thing written twice. So a colour prop comes out
as a pattern over the palette rather than a free string, and a generated tree that asks for `#ff00ff` fails
validation instead of painting an off-brand card. Every closed value list is an `enum`, every component
schema is `additionalProperties: false`, and a prop the registry genuinely leaves open is `{ type: 'string' }`
with its listed values as `examples` — the catalog never states a constraint the library does not enforce.

**Two sources meet in it, and neither would do alone.** What a prop _accepts_ is read off the live prop
registry when you call `catalog()`, so a prop or a colour added by `Box.extend()` is in the catalog with
nothing regenerated and no build step — call `catalog()` after the `extend()` that should be in it. What a
prop _means_ is generated from the same JSDoc as the prop reference, because no registry entry knows that
`fontSize` divides by 16. What neither can say is in `rules`: the dividers, the millisecond times, the
unitless SVG lengths. Put those in the prompt — they are the mistakes that still validate and still render.

Getting it into a runtime is one adapter. [json-render](https://json-render.dev) wants Zod, and
`z.fromJSONSchema` is the whole of it:

```ts
const jsonRender = schema.createCatalog({
  actions: {},
  components: Object.fromEntries(
    Object.entries(allowed.components).map(([name, component]) => [
      name,
      { props: z.fromJSONSchema(component.props), slots: component.slots, description: component.description, example: {} },
    ]),
  ),
});
```

One thing to know if you use that runtime, measured against `@json-render/react` 0.20.0: its `propsOf`
schema type resolves to `z.record(z.string(), z.unknown())` for any catalog holding more than one
component, so `jsonRender.validate(spec)` checks which components a spec names and lets any props through.
Each component's `props` is a self-contained schema for exactly this reason — check a node against its own
before rendering it. The same schema serves a structured-output API, and any other runtime that takes a
component catalog.

Function props are listed as `events` rather than described, since a JSON spec cannot carry a function and
the host is where binding one belongs. A `ReactNode` prop is a slot. A prop whose type a JSON spec cannot
express is left out rather than half-described.

[The catalog](https://box-kite.dev/ai-context)

## The DataGrid exports its types

Every other component exports its own types; `components/dataGrid` exported only the component. Typing a
column list, a `ref` or a cell renderer outside the JSX therefore meant importing from
`@box-kite/react/components/dataGrid/contracts/dataGridContract`, a path that is plainly private. The whole
contract comes off the component's own module now:

```tsx
import DataGrid, { type CellModel, type ColumnType, type DataGridHandle, type GridDefinition } from '@box-kite/react/components/dataGrid';

function StatusCell({ cell }: { cell: CellModel<Invoice> }) {
  return <Badge>{cell.value as string}</Badge>;
}

const definition: GridDefinition<Invoice> = { rowKey: 'id', columns: [{ key: 'status', Cell: StatusCell }] };
```

Types only — nothing is added to the bundle, and the deep import still resolves, so nothing that works today
stops working.

## Breaking changes

None.

## Fixes

<!-- One bullet per fix: **What was wrong.** What it does now. -->

- **A DataGrid rendered fifty-eight rows around an eighteen-row viewport.** Twenty rows each side became twelve ahead of the scroll and four behind it, so the same cover costs thirty-six rows: a fling over a hundred thousand rows went from 12.3 ms a frame to 8.0, and first render, filter and sort came down with it. (#178)
- **A DataGrid re-rendered every cell on screen on every scroll event.** A scroll that does not change which rows are shown now costs nothing but the transform, and one that brings a row in renders that row rather than the window it landed in — the median frame of a fast fling over a hundred thousand rows halved, 24 ms to 12 ms.
- **A DataGrid cell chosen with the pointer showed nothing, and no cell stayed marked once the grid lost focus.** The mark is the grid's own state now rather than a `:focus-visible` ring, so a clicked cell wears it, it survives a blur and a scroll, and `Ctrl+C` has something to copy. (#64)
