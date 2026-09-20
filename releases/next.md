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
- **[What a model wrote, rendered safely](#what-a-model-wrote-rendered-safely)** — `<SpecRenderer>` renders a generated spec against the components your app allows: unknown names render nothing, refused props are dropped, and only an event can become a function.
- **[A dashboard people rearrange, and a model can write](#a-dashboard-people-rearrange-and-a-model-can-write)** — a drag-and-resize widget grid whose layout is JSON in cells: every place is a class, the keyboard gets a grab, and a model can write the same file a drag reports.
- **[A generated dashboard with something in it](#a-generated-dashboard-with-something-in-it)** — the catalog describes a grid's columns and a dashboard's layout now, so a spec can say where each widget goes and what is inside it.
- **[A theme inside a theme](#a-theme-inside-a-theme)** — a local `<Box.Theme>` finally wins inside a themed page: a theme reaches the subtree it owns and stops at the next element that declares one.
- **[The DataGrid exports its types](#the-datagrid-exports-its-types)** — `ColumnType`, `GridDefinition`, `CellModel` and the rest come off `components/dataGrid` now instead of a path inside it.
- **[The whole loop, and the route that runs it](#the-whole-loop-and-the-route-that-runs-it)** — `specSchema()` is on the catalog entry too, so a server route can build the constraint a model generates under; and a node missing a prop it cannot do without is held back rather than left to throw.
- **[`npx @box-kite/mcp`: the answer a documentation file cannot give](#npx-box-kitemcp-the-answer-a-documentation-file-cannot-give)** — an MCP server whose `check_styles` tool hands your props to the real engine, because a value this library does not accept writes no CSS at all and says nothing about it.
- **[An agent's turn, in three components](#an-agents-turn-in-three-components)** — a tool call, an approval and a chain of thought, typed and themed and 1.7 KB on top of Box: the inventory an AI feature needs at the layer this library is good at.
- **[What the agent says, as it arrives](#what-the-agent-says-as-it-arrives)** — `<StreamingText>` fades in the part of a message that was not there a render ago, and costs the same at the ten-thousandth token as at the first.
- **[Markdown, and the dependency we did not take](#markdown-and-the-dependency-we-did-not-take)** — `markdownComponents` is the `components` map `react-markdown` and Streamdown both take, so a model's prose is themed with no stylesheet, no Tailwind config and no parser chosen for you.
- **[Where the answer will be](#where-the-answer-will-be)** — `<Skeleton>`, the placeholder: bars with a gloss, `aria-hidden` unless you name what is loading, and it renders on a server.

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

## What a model wrote, rendered safely

A second new entry, `@box-kite/react/spec`, and the other half of the catalog above. The catalog says what
a model may build; `<SpecRenderer>` renders what it built — against a registry the app puts together,
which is the same allow-list one step further on.

```tsx
import { catalog } from '@box-kite/react/catalog';
import Flex from '@box-kite/react/components/flex';
import { H2, P } from '@box-kite/react/components/semantics';
import SpecRenderer, { createSpecRegistry } from '@box-kite/react/spec';

const allowed = catalog({ include: ['Flex', 'H2', 'P'], styleProps: ['d', 'gap', 'p', 'bgColor', 'fontSize'] });
const registry = createSpecRegistry({ catalog: allowed, components: { Flex, H2, P } });

<SpecRenderer spec={spec} registry={registry} data={data} onAction={(action) => run(action)} />;
```

A node is `{ type, props, children, slots, on, repeat }`, all of it JSON, and every field of it is checked
before anything renders. A `type` the registry does not hold renders nothing. A prop the component's own
schema refuses is dropped — the prop, not the node — so a colour has to be one the palette has and a value
still half-written mid-stream simply does not paint until it is whole. The only prop that can ever become a
function is one the catalog lists as an event: `on: { onClick: 'refresh' }` calls `onAction('refresh',
details)`, and what that means is the app's, which is human-in-the-loop by construction. There is no tag
that comes from the spec, no `eval` and no `dangerouslySetInnerHTML` anywhere in it.

**A spec arrives in pieces, and that is the ordinary case.** `streamObject`'s `partialObjectStream` hands
over the same object a few more characters at a time, so a node whose `type` has not been written yet
renders nothing _and reports nothing_ — it is a frame, not a fault. Every node also has an error boundary
of its own, so a component that throws on props a model invented costs that node and nothing around it,
and is tried again on the next frame.

Whatever did not render is reported rather than swallowed: `onIssues` gets a code (`unknown-component`,
`invalid-prop`, `unknown-event`, `unresolved-data`, `too-deep`, `render-error`…) and the path in the spec
it happened at. `fallback` is what stands where a node could not render, and renders nothing unless you
say otherwise — a red box is a poor thing to show somebody who did not write the page.

**Data stays the app's.** A model writes the shape of a view and the host owns the numbers, so a prop can
be `{ $data: 'stats.revenue' }`, a child can be `{ $item: 'label' }` inside a `repeat`, and a reference is
resolved _before_ it is validated: the value the host supplied is the one the schema judges. A path, never
an expression.

And the other direction, so the constraint and the renderer cannot drift apart:

```ts
import { specSchema } from '@box-kite/react/spec';

const { partialObjectStream } = streamObject({ model, schema: z.fromJSONSchema(specSchema(registry)), prompt });
```

`specSchema(registry)` is one JSON Schema for a whole tree, built from the same rules the renderer
enforces: the component names are an enum of what the app allowed, each one's props are its own schema,
and `children` is offered only where there is a slot to put them in.

The entry is 4.4 KB gzipped and carries no engine at all — the components come from the app, so nothing in
it imports Box. `renderSpec(spec, options)` is the same walk with no hook in it, returning
`{ element, issues }`, so a static spec renders on a server.

[Generative UI](https://box-kite.dev/ai-context)

## A dashboard people rearrange, and a model can write

There is a new component entry, `@box-kite/react/components/dashboard`, and it is two things:
`<DashboardGrid>`, a grid of widgets that can be dragged and resized, and `<Widget>`, the chrome around
whatever one of them shows. What passes between them is a **layout** — plain JSON in cells, with a version
in front of it — and that one artifact is what a model emits, what a drag reports back and what your app
stores.

```tsx
import DashboardGrid, { Widget } from '@box-kite/react/components/dashboard';

<DashboardGrid layout={layout} onLayoutChange={setLayout} onLayoutCommit={save} editable>
  <Widget id="revenue" title="Revenue" description="Last 12 weeks">
    <Sparkline data={revenue} variant="area" width="100%" height="100%" />
  </Widget>
  <Widget id="orders" title="Orders" onRefresh={reload} loading={pending}>
    <Sparkline data={orders} width="100%" height="100%" />
  </Widget>
</DashboardGrid>;
```

**Nothing is measured to lay it out.** A widget's cell is `grid-column` and `grid-row`, which are props, so
they are shared classes: a dashboard of any size costs no transform per item, no `ResizeObserver` and no
inline style at rest — and the same layout renders on a server. The one inline style in the component is
the translate that keeps a dragged widget under the pointer, which is a value per frame and would be a rule
per frame that is never freed.

**A drop takes the cell.** A widget put on top of its neighbour keeps the cell it was dropped on, and the
neighbour is handed one of its own — the row above where there is room for it, the row below otherwise.
Everything then floats up, so a widget cannot be parked in mid-air, a drop below its neighbours rises to
meet them, and two dashboards holding the same widgets in the same places compare equal.

**Narrower is a projection, not a second layout.** `columns` takes a count per container size —
`{ xs: 1, md: 6, xxl: 12 }` by default — and each narrower arrangement is the same layout scaled down by
arithmetic at render time, written as a container query. The browser picks between classes; nothing listens
for a resize. Two things fell out of building it, both measured in Chrome 153. A grid **cannot
container-query itself** — the query resolves against an ancestor container, so a track count per size
silently does nothing — which is why every projection is drawn on the widest arrangement's tracks. And an
arrangement can only be edited in the space it is written in: where the grid is showing a projection the
handles are not rendered at all, because an edit made in six columns is not a layout in twelve.

**Dragging is not a keyboard gesture, so the keyboard gets a grab.** Both handles are real buttons: Enter or
Space picks the widget up, the arrows move it a cell at a time — following the reading order, so ArrowLeft
moves it right in a right-to-left page — Enter drops it and Escape puts it back, the layout with it. Every
step is announced in a live region that exists before there is anything to say, and a grab that loses focus
is cancelled rather than dropped somewhere nobody looked at. The grid is a `role="list"` of widgets, each
one titled by a real heading at `level`.

**A widget is chrome and four states.** `loading` draws bars where the content will be and reports
`aria-busy`, `error` replaces the content with the message and — with an `onRefresh` — a retry, `empty`
says so in words rather than leaving a panel that looks broken, and anything else renders the children.
Outside a `DashboardGrid` a `Widget` is simply a card with the same chrome.

**The layout is the artifact, so it is also the prompt.** `DashboardUtils.SCHEMA` is the layout as JSON
Schema — inside the subset `catalog()` emits and `<SpecRenderer>` validates — and `DashboardUtils.parse`
reads one back from wherever it was kept, dropping what it cannot use and reporting it rather than throwing.
The schema says the shape and `parse` says the sense: a generated `w: 0` or a column count of 400 is
clamped, and two items claiming one id become one. Where a dashboard is kept is the app's decision, since
only the app knows whether it belongs to a person, a team or a URL; the docs page keeps its demo in
`localStorage`, which is the whole of it.

The entry is 5.99 KB gzipped on top of Box. The two style-tree nodes it adds are in the engine with every
other component's, so they cost **0.44 KB gzipped** on every entry that carries one, dashboard or no
dashboard.

[The dashboard](https://box-kite.dev/dashboard)

## A generated dashboard with something in it

`catalog()` described the components a model may compose and, for four of them, not the props that carry
what they are for. A `<DataGrid>` arrived with no `def` at all — though `def` is required — and a
`<DashboardGrid>` with no `layout`, so a generated spec could place a dashboard and neither lay it out nor
put a grid in it. Both are in the catalog now, and so are `Widget`'s `empty` and `ChartContainer`'s
`series`.

```json
{
  "type": "Widget",
  "props": { "id": "orders" },
  "slots": { "title": ["Orders"] },
  "children": [
    {
      "type": "DataGrid",
      "props": {
        "data": { "$data": "orders" },
        "def": {
          "rowKey": "id",
          "footer": true,
          "columns": [
            { "key": "customer", "header": "Customer" },
            { "key": "total", "header": "Total", "align": "end", "aggregate": "sum" }
          ]
        }
      }
    }
  ]
}
```

These four are the props that are a _shape_ rather than a value, and the reason they were missing is that
the other half of each shape is React: a column carries a `Cell` renderer and an `onCellEdit`, a widget's
`empty` is a `ReactNode`. The generator maps types, so it had to drop such a prop whole rather than state a
constraint that is not true. What a spec can write is now described by hand beside the interface it
mirrors — every key typed against it, so a prop renamed in the component is a compile error rather than a
constraint that silently stops matching.

The part a spec cannot write is still absent: `dataSource`, `onCellEdit`, `rowDetail` and `treeData` are
functions and components, passed beside the spec rather than in it, and a column's own nested `columns`
would be a recursive schema. `data` is the one prop in the catalog that carries values rather than styling,
so its schema says "objects" and stops — `{ "$data": "orders" }` is the usual answer, and the rows stay
yours. Everything else is judged the way any other prop is: a column with no `key`, an `aggregate` that is
not one of the five, or a `Cell` written as a string fails the schema, so the prop is dropped and the node
renders without it.

`DashboardUtils.SCHEMA` is unchanged and is what `DashboardGrid`'s `layout` now points at, so the artifact
a drag reports back, the one a host stores and the one a model generates under are one description in one
place. It moved into a module of its own to get there, which is the whole cost of this: **1.83 KB gzipped
on the catalog entry** for the four contracts, 26 B on `@box-kite/core` for merging them, and 14 B on the
dashboard for the module boundary. Nothing else moved.

[The shapes a spec can write](https://box-kite.dev/ai-context)

## A theme inside a theme

A theme is an ancestor class, so two of them on one page wrote two rules of exactly the same specificity —
and the one written last won, however far away it was. That made `<Box.Theme use="local">` a coin toss: a
light panel inside a dark page stayed dark, and every built-in component's dark styling stayed with it,
since those are written as a dark override over a light base rather than as a pair of themes.

Every theme rule is scoped to the subtree its theme owns now, and ends at the next element declaring one:

```css
@scope (.light) to ([data-theme]) {
  :scope .theme-light-bgColor-white {
    background-color: var(--white);
  }
}
```

So the nearest theme wins — for a property the inner theme never mentions as much as for one it does, and
even where the outer theme's rule carries one more pseudo-class, which proximity alone would have lost to.
What marks a theme root is `data-theme`, and `<Box.Theme>` renders it beside the class instead of writing
it from an effect, so the boundary is in the HTML the first paint uses. A theme class you set by hand — the
one a prerendered shell puts on `<html>` — wants the attribute beside it.

```tsx
<Box.Theme use="local" theme="light">
  <Box p={4} theme={{ light: { bgColor: 'white' }, dark: { bgColor: 'slate-950' } }}>
    Light in here, whatever the page around it is.
  </Box>
</Box.Theme>
```

[Theme setup](https://box-kite.dev/theme-setup#nesting)

## The whole loop, and the route that runs it

`specSchema()` is exported from `@box-kite/react/catalog` as well as from `/spec`, which is what makes
the server half of a generated UI writable at all: the model call is a route handler, and the entry that
_renders_ a spec is a client entry. The catalog entry renders nothing, so a route can import it — and
`specSchema()` takes a `catalog()` as readily as a registry, so the server side needs no components.

```ts
import { anthropic } from '@ai-sdk/anthropic';
import { catalog, specSchema } from '@box-kite/react/catalog';
import { jsonSchema, streamObject } from 'ai';

const allowed = catalog({ include: ['DashboardGrid', 'Widget', 'Sparkline', 'DataGrid'] });

export async function POST(request: Request) {
  const { prompt } = await request.json();
  const result = streamObject({
    model: anthropic('claude-sonnet-5'),
    schema: jsonSchema(specSchema(allowed, { bindings: true })),
    prompt,
  });

  return result.toTextStreamResponse();
}
```

The client half is `<SpecRenderer>` over whatever has arrived. It holds a node back now when a prop its
component cannot do without has not arrived yet, reporting a new `missing-prop` issue: a `Sparkline` with
no `data` reads `undefined` and throws, which its own error boundary caught — the same blank space, with a
caught crash per frame behind it. Rendering nothing is the same picture without the noise.

One more rule a stream imposes, now in the catalog's own descriptions: a generated node writes the
**controlled** prop and never the `default…` twin. React reads an uncontrolled default once, so the frame
in which `defaultLayout` first arrived whole is the one that sticks — and a second spec rendered in the
same place keeps the first one's state, since it is the same component instance. `layout`, `value`,
`open`: every frame re-applies them, and the last frame is what stays on screen.

[box-kite.dev/generative-ui](https://www.box-kite.dev/generative-ui/) is the loop end to end, and
`examples/next-app/app/generative` is the live route, page and catalog in three files.

## `npx @box-kite/mcp`: the answer a documentation file cannot give

A file is read once, at the start of a session. An MCP server is asked mid-task, which is when the
question actually comes up — and it can answer one thing no file can.

Every prop here accepts a closed set of values, and **a value it does not accept writes no rule and no
class name.** Silently, by design: a typo must never emit a broken declaration into a stylesheet
everything else shares. That is the right behaviour and it is invisible, so no amount of prose settles
whether `bgColor="blue-550"` works. `check_styles` hands your props to the real engine and reports what
each one wrote:

```shell
check_styles { "props": { "p": 4, "bgColor": "blue-550", "fontSize": 14, "href": "/about" } }

✅ p         → .p-4{padding:1rem}
❌ bgColor     does not accept "blue-550" — no rule and no class name were written.
✅ fontSize  → .fontSize-14{font-size:0.875rem}
⚠️ href        an HTML attribute, not a style prop. It goes in props={{ "href": … }}.
```

For the same reason `get_props` **measures** a numeric prop's scale instead of describing its divider —
it runs 1, 2, 4 and 8 through the engine and prints what came out — and an unknown prop is answered with
the props that write the CSS property its name spells, so `padding` comes back as `p` and
`backgroundColor` as `bgColor`.

```shell
claude mcp add box-kite -- npx -y @box-kite/mcp
```

Any client that speaks stdio takes the same command:

```json
{
  "mcpServers": {
    "box-kite": { "command": "npx", "args": ["-y", "@box-kite/mcp"] }
  }
}
```

Six tools, at capability level rather than one per document. `search_docs` ranks the props, the
components, the nesting keys and the rules together, so "fade in when it mounts" answers `startingStyle`
and "style every other row" answers `nth` without either name being known; `get_component` carries a
component's props, its sub-parts, its keyboard map and the ARIA it writes; `get_rules` and `get_blocks`
are the rules themselves and the sections the `shadcn` CLI installs.

No key, no network and no state: the prop reference, the component reference, the rules and the styling
engine are all built into the package at the version you install, so `check_styles` and `get_props`
cannot disagree with each other or with the library you are writing against. `context7.json` ships in
the repository too, for the aggregator half of the same job.

## An agent's turn, in three components

`@box-kite/react/components/agent` is the chrome around what an agent does rather than what it says:
`<ToolCallCard>` for a call it made, `<ApprovalCard>` for one it wants permission to make, and
`<Reasoning>` for the thought behind both. Typed, themed, keyboard-complete, and 1.7 KB gzipped on top
of Box for all three.

```jsx
import { ApprovalCard, Reasoning, ToolCallCard } from '@box-kite/react/components/agent';

<Reasoning duration={1400}>{reasoningText}</Reasoning>

<ToolCallCard name="searchOrders" status="success" input={{ orderId: 4182 }} output={{ total: 6400 }} />

<ApprovalCard
  title="Refund order 4182"
  description="6,400 MDL back to the customer. This cannot be undone."
  input={{ orderId: 4182, amount: 6400 }}
  onDecisionChange={(decision) => respond(decision === 'approved')}
/>;
```

**The status is a word, not a colour.** `pending`, `running`, `success` and `error` each carry their own
label beside the dot, because a forced-colors mode throws a tint away and a screen reader never had one.
The four are what every runtime already reports under its own spelling, so AI SDK's `input-streaming` /
`input-available` / `output-available` / `output-error` is a lookup rather than a state machine.

**A value is whatever the model produced, so it is formatted rather than trusted.** A tool's arguments
can be circular, hold a `BigInt`, or be four megabytes long — `JSON.stringify` answers those three with a
throw, a throw and a frozen frame. `AgentUtils.formatValue` is the judgement, framework-free and exported
from the same entry: the text is capped at `valueLimit` (20,000 characters) with a line saying how much
was left, and a value that cannot be serialised is described instead of taking the transcript with it.

**`onDecisionChange(decision, { reason })` is the approval card's whole API**, which is what maps it onto
AI SDK 6's `needsApproval`, CopilotKit's `renderAndWaitForResponse` and AG-UI's `INTERRUPT`. Two things
it deliberately does not do: it does not take focus unless `autoFocus` says so — a turn arrives while the
reader is somewhere else, and a card that grabs the keyboard is one that gets answered by accident, which
is also why `autoFocus` lands on _Reject_ — and it does not announce its own arrival, because the
transcript it is rendered into is what does that. What it owns is the _answer_, in a `role="status"` that
is in the DOM before there is anything in it, since a live region inserted together with its text is not
reliably read out.

Everything else follows the library's own rules. A `ToolCallCard` with nothing to disclose renders no
control at all, because a header that opens nothing is a tab stop nobody wants to land on. `Reasoning` is
closed by default and opens in the same one-row grid an `Accordion` panel does, so nothing is measured.
All three are in `catalog()`, so a generated UI can build a tool-loop transcript, and the trees are
`toolCall`, `approval` and `reasoning` for `Box.components()`.

## What the agent says, as it arrives

`<StreamingText>` is the other half of an agent's turn: the message itself. Hand it the text so far and it
fades in the part that was not there a render ago.

```jsx
<StreamingText text={message} streaming={status === 'streaming'} />
```

**Only what arrived animates, and the cost does not grow with the message.** What is on the page is one
settled string plus the last few runs to reach it — eight by default — so a message that is already whole
paints at once with nothing moving, which is what a prerendered page and a transcript read back both want,
and a message still arriving costs the same at the ten-thousandth token as at the first. `window` is that
number: `0` turns the entrance off, and a stream fast enough to fill the window inside one transition is
the case for raising it. The judgement is `AgentUtils.advanceStream`, framework-free like the rest of that
namespace.

The entrance is `@starting-style` rather than a keyframe, so it rides `--transitionTime` and disappears
under `prefers-reduced-motion` with nothing declared for it; the caret is the `pulse` preset, which stops
itself for the same reason. It is deliberately **not** a live region — one announcing every token reads the
message out a word at a time and again when it finishes — so what it carries is `aria-busy`, and what
announces an agent's turn is the transcript it lands in.

The style tree is `streamingText`, with `segment` and `caret` under it.

## Markdown, and the dependency we did not take

A model writes markdown, and a parser is a choice most apps have already made — so what ships is the half
that is ours: `markdownComponents`, the `components` map that `react-markdown`, Streamdown and everything
built on that shape already takes, with this engine's classes on it.

```jsx
import Markdown from 'react-markdown';
import { markdownComponents } from '@box-kite/react/components/markdown';

<Box component="markdown">
  <Markdown components={markdownComponents}>{message}</Markdown>
</Box>;
```

Wrapping Streamdown was the other option and it is not worth it: it asks a project for a Tailwind
`@source` line pointing into its `dist/` and for shadcn's design tokens declared in a global stylesheet —
which is the one thing this library exists not to need — and it would choose the parser for you. The map
costs no dependency, works with whichever renderer is already there, and keeps the promise: no stylesheet.

**It is a constant, not a factory, and while streaming that is the whole difference.** A map built inside
render is a new set of component _types_ every token, which React answers by unmounting the message and
mounting it again; override a node by spreading at module scope instead. Whether a URL is safe stays the
renderer's, because by the time a component is called the href has been parsed — `urlTransform` or
`defaultUrlTransform` is where a `javascript:` link is refused. What the map sets is `rel="noreferrer"`.

1.05 KB gzipped on top of Box, and the tree is `markdown` with `heading`, `paragraph`, `link`, `list`,
`item`, `quote`, `code`, `codeBlock`, `rule`, `image`, `table`, `row`, `cell`, `inline` and `checkbox`
under it.

## Where the answer will be

`<Skeleton>` is the placeholder while something is being fetched: bars where the content goes, with a
gloss crossing them.

```jsx
<Skeleton lines={3} label="Loading orders" />
<Skeleton circle width={10} />
```

With no `label` the whole thing is `aria-hidden`, because a reader told "three empty bars" has been told
nothing; a `label` makes it a `role="status"` naming what is on its way, and it belongs on the one
skeleton standing for a region rather than on each bar. The gloss is a named duration, so it sits outside
what `--transitionTime` zeroes and stops itself under `prefers-reduced-motion`. It renders on a server —
no state, no effect, no measurement — and costs 0.35 KB gzipped on top of Box. The tree is `skeleton`,
with `bar` (whose `short` and `circle` variants are the last line and the avatar) and `gloss`.

The whole loop is in `examples/next-app` now: `/agent` is a real AI SDK tool loop where every part of a
turn is one of these components. AI SDK reports six tool states — four are a `<ToolCallCard>` status, and
the other two are an `<ApprovalCard>`, because a decision is not a stage a call passes through but a
question somebody has to answer.

## Breaking changes

- **A theme rule is an `@scope` block now, so theming needs Chrome 118+, Safari 17.4+ or Firefox 128+.**
  Below that the rules are dropped and elements show their unthemed values, which for the pre-built
  components is the light design — every one of their theme blocks is a dark override over a light base.
  Write the design older browsers should get as the plain props and the other one under `theme`, which is
  what the components themselves do.

## Fixes

<!-- One bullet per fix: **What was wrong.** What it does now. -->

- **A component documented none of the props it inherited from another component.** `Gauge` is a `ProgressRing` with a shorter sweep, so its `value` — the whole point of a gauge — was missing from its API page, from the catalog and from the manifest, and a generated `<Gauge>` could not be given one; the four chart primitives were missing the `label` that keeps them out of `aria-hidden`, and `Menu.CheckboxItem`/`Menu.RadioItem` were missing `disabled`. The extraction follows a props interface into whatever this repository declared behind it now, and stops where Box's own props begin. (#185)
- **A grid was unmounted and rebuilt half a dozen times in the closing moments of a stream.** A stream is not monotone: a column's `align` passes through `"e"` on its way to `"end"`, which fails its own schema and takes the whole `def` with it, so the prop the grid cannot render without went missing every few frames. `<SpecRenderer>` keeps the last value each node was given for such a prop — what a node has been shown with, it is not stripped of — and a heavy component can be gated by the app on top of that: point its name at a placeholder in the registry while the spec is arriving. (#188)
- **A generated component was handed `undefined` for a prop it cannot do without.** A `Sparkline` whose `data` had not arrived yet — or was refused — threw, and only the node's own error boundary caught it. The renderer holds such a node back and reports `missing-prop` instead, so a streamed spec paints the same thing with nothing thrown behind it. (#186)
- **The catalog said a layout component could hold nothing.** `Flex`, `Grid`, `Button`, `Icon`, `Overlay` and eleven others reported no `default` slot, because they declare no `children` prop of their own — they take Box’s props whole — while `Img` reported one it cannot have. A generated tree read off that catalog could not nest anything in a `Flex`. Every component that can hold children says so now, and one whose element takes none (`Img`, `Textbox`, `Textarea`) says that instead. (#180)
- **A DataGrid rendered fifty-eight rows around an eighteen-row viewport.** Twenty rows each side became twelve ahead of the scroll and four behind it, so the same cover costs thirty-six rows: a fling over a hundred thousand rows went from 12.3 ms a frame to 8.0, and first render, filter and sort came down with it. (#178)
- **A DataGrid re-rendered every cell on screen on every scroll event.** A scroll that does not change which rows are shown now costs nothing but the transform, and one that brings a row in renders that row rather than the window it landed in — the median frame of a fast fling over a hundred thousand rows halved, 24 ms to 12 ms.
- **A DataGrid cell chosen with the pointer showed nothing, and no cell stayed marked once the grid lost focus.** The mark is the grid's own state now rather than a `:focus-visible` ring, so a clicked cell wears it, it survives a blur and a scroll, and `Ctrl+C` has something to copy. (#64)
