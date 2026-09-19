# Generative UI

Two halves of one loop, in two entries. `catalog()` (`@box-kite/react/catalog`) describes what a
generated UI is allowed to build, and `<SpecRenderer>` (`@box-kite/react/spec`) renders what came
back — against the same description, so the thing a model is constrained to and the thing that renders
cannot disagree.

## The catalog

`catalog()` describes what a generated UI is allowed to build: every component a spec may name, and every
value its props may take, as JSON Schema. It is the piece a generative-UI runtime needs and the one no
styling library could give it before — because in this library the typed props already _are_ a constrained,
serializable design language, so a Box tree and a JSON UI spec are the same thing written twice.

```ts
import { catalog } from '@box-kite/react/catalog';

const allowed = catalog({
  include: ['Flex', 'H2', 'P', 'Sparkline'],
  styleProps: ['d', 'gap', 'p', 'bgColor', 'color', 'fontSize'],
});
```

```jsonc
{
  "version": 1,
  "library": "@box-kite/react",
  "tokens": { "colors": ["slate-50", …], "animations": ["spin", …], "components": ["button", …] },
  "rules": ["Spacing, sizing, gap, borderRadius and the inset props divide by 4: p={4} is 1rem (16px).", …],
  "components": {
    "Flex": {
      "description": "A flex row or column.",
      "import": "import Flex from '@box-kite/react/components/flex';",
      "slots": ["default"],
      "events": [],
      "props": {
        "type": "object",
        "$defs": { "color": { "type": "string", "pattern": "^(?:(?:slate|gray|…|rose)-(?:50|…|950)|currentColor|…)(?:\\/(?:100|\\d{1,2}(?:\\.\\d+)?))?$" } },
        "properties": {
          "d": { "type": "string", "enum": ["row", "column", "row-reverse", "column-reverse"] },
          "p": { "anyOf": [{ "type": "string", "enum": ["1/2", …] }, { "type": "string", "pattern": "^-?\\d+(?:\\.\\d+)?%$" }, { "type": "number" }] },
          "bgColor": { "$ref": "#/$defs/color", "description": "The background-color CSS property…" }
        },
        "additionalProperties": false
      }
    }
  }
}
```

## Two sources, and why neither would do alone

The **engine** says what a prop accepts. That half is read off the live prop registry at the moment you
call `catalog()`, which is why a prop or a colour added by `Box.extend()` is in the catalog with no build
step and no regeneration — call `catalog()` after the `extend()` that should be in it.

The **manifest** says what a prop means. That half is generated (`npm run docs:catalog`) from the same
JSDoc the prop reference and the AI context come from, because no registry entry knows that `fontSize`
divides by 16.

What a JSON Schema cannot express at all is in `rules`: the dividers, the millisecond times, the unitless
SVG lengths, and that HTML attributes go in `props`. Put them in the prompt — they are the errors that
still validate and still render.

## The guardrail

A colour prop is a `pattern` over the palette, not a free string, so a generated tree can only ask for
colours the theme has:

```ts
import * as z from 'zod';

const flex = z.fromJSONSchema(catalog({ include: ['Flex'] }).components.Flex.props);

flex.safeParse({ bgColor: 'sky-500/40' }).success; // true
flex.safeParse({ bgColor: '#ff00ff' }).success; // false
flex.safeParse({ invented: 1 }).success; // false — every component schema is additionalProperties: false
```

The same holds for every closed value list (`d`, `position`, `textAlign`…) and for the grammars behind the
open ones (a percentage, a ratio, an `anchor-size()`). A prop the registry leaves genuinely open is
`{ type: 'string' }` with its listed values as `examples`, which is the honest shape: the catalog never
states a constraint the library does not enforce.

## The allow-list is yours

`catalog()` with no options describes all 78 components and all 221 style props. That is ~4.6 MB
serialized, and a prompt carrying it would spend more tokens on the catalog than on the UI. It is the
library saying what it _can_ render; narrowing it is the app's job, and the app is the only one that knows
which components it wants a generator reaching for.

| Option       | What it does                                                                                       |
| ------------ | -------------------------------------------------------------------------------------------------- |
| `include`    | Only these components, by name.                                                                    |
| `exclude`    | Everything but these. Applied after `include`.                                                     |
| `styleProps` | `true` (every registered prop, the default), `false` (the component's own props alone), or a list. |

## What is not in it

**Function props are `events`, named rather than described.** A JSON spec cannot carry a function, so
`onValueChange` is listed on the component as an event and the host binds it — which is where a
human-in-the-loop decision belongs anyway.

**A `ReactNode` prop is a slot.** `children` is the `default` slot and a named one (`Tooltip`'s
`content`) is a slot of its own name. Every component that can hold children has `default`; one whose
element takes none — `Img`, `Textbox`, `Textarea` — has no default slot at all, and that is what tells
a generator (and `<SpecRenderer>`) that children have nowhere to go there.

**Anything else a JSON spec cannot express is left out.** A prop whose type is a row renderer or a
datasource is absent rather than half-described: a partial schema would state a constraint that is not
true. The exception is the next section — a handful of props that are a _shape_, where the part a spec can
write is worth describing on its own.

## The shapes: a grid's columns, a dashboard's layout

Extraction maps _types_, and a few props are a shape whose other half is React: a `ColumnType` carries a
`Cell` renderer and an `onCellEdit`, a `WidgetProps.empty` is a `ReactNode`. A mapping has to drop such a
prop whole — which left the catalog able to place a `<DashboardGrid>` and neither lay it out nor put
anything in it, and a `<DataGrid>` with no `def` at all, though `def` is required. Those are the two things
a dashboard _is_.

So four components carry a hand-written contract for the part a spec can write, and it is in the catalog
like any other prop:

| Component        | Props                                | What a spec may write                                                                   |
| ---------------- | ------------------------------------ | --------------------------------------------------------------------------------------- |
| `DataGrid`       | `def` (**required**), `data`         | The columns and the grid-wide flags; the rows, as the host's own objects.               |
| `DashboardGrid`  | `layout`, `defaultLayout`, `columns` | `DashboardUtils.SCHEMA` — the same artifact a drag reports back — and the column space. |
| `Widget`         | `empty`                              | `true` for the default line, or the words to use instead.                               |
| `ChartContainer` | `series`                             | The series names, or a name-to-colour record.                                           |

```json
{
  "type": "DataGrid",
  "props": {
    "data": { "$data": "orders" },
    "def": {
      "rowKey": "id",
      "title": "Orders",
      "footer": true,
      "columns": [
        { "key": "customer", "header": "Customer" },
        { "key": "total", "header": "Total", "align": "end", "aggregate": "sum" }
      ]
    }
  }
}
```

`data` is the one prop in the catalog that carries values rather than styling, so its schema says "objects"
and stops — `{ $data: 'orders' }` is the usual answer, and the rows stay the host's. Everything else is
judged: a column with no `key`, an `aggregate` that is not one of the five, a `Cell` renderer written as a
string — each of them fails the schema, so the prop is dropped and the node renders without it.

Two things are deliberately absent. A column's own `columns` (the header groups) would be a recursive
schema, which is what a structured-output API is worst at and what the catalog has no `$defs` of its own to
carry. And `dataSource`, `onCellEdit`, `rowDetail` and `treeData` are functions or components: they are the
app's to pass, beside the spec rather than in it.

## Rendering what came back: `<SpecRenderer>`

The catalog says what a model may write. `@box-kite/react/spec` renders what it wrote — against a
registry the app builds, which is the same allow-list one step further on: the catalog is what the
library _can_ render, the registry is what this app _will_.

```tsx
import { catalog } from '@box-kite/react/catalog';
import Button from '@box-kite/react/components/button';
import { Sparkline } from '@box-kite/react/components/chart';
import Flex from '@box-kite/react/components/flex';
import { H2, P } from '@box-kite/react/components/semantics';
import SpecRenderer, { createSpecRegistry } from '@box-kite/react/spec';

const allowed = catalog({ include: ['Flex', 'H2', 'P', 'Button', 'Sparkline'], styleProps: ['d', 'gap', 'p', 'bgColor', 'fontSize'] });

const registry = createSpecRegistry({ catalog: allowed, components: { Flex, H2, P, Button, Sparkline } });

export default function Generated({ spec, data }: { spec: unknown; data: unknown }) {
  return <SpecRenderer spec={spec} registry={registry} data={data} onAction={(action) => run(action)} />;
}
```

A spec is a tree of nodes, and a node is JSON:

```jsonc
{
  "type": "Flex",
  "props": { "d": "column", "gap": 4, "p": 4, "bgColor": "sky-500/10" },
  "children": [
    { "type": "H2", "props": { "fontSize": 24 }, "children": ["Revenue"] },
    { "type": "Sparkline", "props": { "data": { "$data": "weekly" } } },
    { "type": "Button", "props": { "label": "Refresh" }, "on": { "onClick": "refresh" } },
  ],
}
```

`type` names a component, `props` is everything its own schema allows, `children` is the default slot,
`slots` fills a named one, `on` binds an event to an action, and `repeat` renders the node once per item
of an array. Nothing else is a field, and every one of them is checked.

## What a spec cannot do

The list is short because the design is: a node is data, and the only things it can reach are the ones
the app registered.

- **It cannot name a component the app did not register.** The node renders nothing and the app is told
  which name was asked for. There is no tag from the spec, no `eval`, no `dangerouslySetInnerHTML`.
- **It cannot set a prop the component's schema refuses.** Every prop is validated against the
  catalog's own schema for that component — so a colour is a palette token, a `d` is one of four
  values, and a prop nobody has is dropped. The prop is dropped, not the node.
- **It cannot make a function.** `on` binds only the props the catalog lists as `events`, and what it
  binds is a _name_: `onAction(action, details)` is called, and what that means is the app's. That is
  human-in-the-loop by construction — an action can open a confirmation as easily as it can run.
- **It cannot reach outside the data it was given.** A `{ $data: … }` reference is a path, read with
  own properties only, against the object passed as `data`. There is no expression to evaluate.
- **It cannot run away.** `maxNodes` (1,000) and `maxDepth` (32) end a tree that recurses or repeats
  over something enormous, and both are props.
- **It cannot take the page down.** Every node renders inside an error boundary of its own, so a
  component that throws on the props it was handed costs that node and nothing around it — and a node
  missing a prop its component cannot do without is held back before it is ever rendered.

Everything refused is reported rather than swallowed: `onIssues` is called with the whole list after
each render whose issues changed, and `renderSpec()` returns it. Each issue carries a `code`
(`unknown-component`, `invalid-prop`, `unknown-event`, `unresolved-data`, `too-deep`, `render-error`…),
the `path` it happened at (`spec.children.1.props.bgColor`) and a sentence.

```tsx
<SpecRenderer
  spec={spec}
  registry={registry}
  onIssues={(issues) => issues.forEach((issue) => track('generated-ui-issue', issue))}
  fallback={(issue) => <P color="rose-500">{issue.message}</P>}
/>
```

`fallback` renders nothing by default: a generated dashboard is shown to somebody who did not write it,
and a red box is a worse answer than a missing card. In development it is the fastest way to see what a
model got wrong.

## Still arriving

A spec streams. `streamObject`'s `partialObjectStream` hands over the same object a few more characters
at a time, so the renderer treats a half-written tree as the normal case rather than the error case:

- a node whose `type` has not arrived renders nothing **and reports nothing** — it is a frame, not a
  fault;
- a prop whose value is still half a string fails its schema and is dropped, so `sky-5` never paints
  and `sky-500` appears when it is whole;
- a node whose **required** prop has not arrived is held back — the component would read `undefined`
  and throw, and only its own boundary would catch that, so a stream would paint the same blank space
  with a caught crash per frame behind it. It reports `missing-prop`, which at rest is a real fault
  and mid-stream is most nodes for a moment;
- a node that threw on one frame is tried again on the next, because the spec object itself is what
  resets the boundaries.

```tsx
const { partialObjectStream } = streamObject({ model, schema: z.fromJSONSchema(specSchema(registry)), prompt });

for await (const partial of partialObjectStream) setSpec(partial);
```

## `specSchema()`: what the model is allowed to write

The other direction. `specSchema(registry)` turns the registry into one JSON Schema for a whole tree —
the component names are an enum of what the app allowed, each one's props are its own schema, and
`children` is offered only where there is a slot to put them in. It is what goes to `streamObject`, to a
structured-output API, or through `z.fromJSONSchema` to validate a finished spec before rendering it.

```ts
import { specSchema } from '@box-kite/react/spec';

const schema = specSchema(registry, { bindings: true });
```

**On a server, import it from `@box-kite/react/catalog` instead**, where it is exported as well — the
call that needs it is a route handler, and the entry that renders a spec is a client entry:

```ts
import { catalog, specSchema } from '@box-kite/react/catalog';

const allowed = catalog({ include: ['DashboardGrid', 'Widget', 'Sparkline', 'DataGrid'] });

export async function POST(request: Request) {
  const result = streamObject({ model, schema: jsonSchema(specSchema(allowed, { bindings: true })), prompt });

  return result.toTextStreamResponse();
}
```

It takes a catalog as readily as a registry — a `catalog()` entry already has the `props`, `slots` and
`events` a tree schema needs — so the server side of the loop needs no components and no React at all.
`examples/next-app/app/generative` is the whole thing, route and page, in three files.

`bindings` widens every prop to "this, or a reference to it" and adds `repeat`; it is off by default,
because it nearly doubles the document and a static view needs none of it. `root` narrows what may
stand at the top of the tree without narrowing what may stand inside it.

The constraint and the renderer are built from the same rules, so what a model is told it may write and
what the renderer lets through cannot drift apart.

## Data, and the one thing the host still owns

A model writes the shape of a view; the numbers are the app's. A reference stands anywhere a value can:

| Written                        | Resolves to                                                   |
| ------------------------------ | ------------------------------------------------------------- |
| `{ "$data": "stats.revenue" }` | a path into `data` — a dot path, or a JSON Pointer (`/a/b/0`) |
| `{ "$item": "label" }`         | a field of the current `repeat` item (`""` is the item)       |
| `{ "$index": true }`           | the current `repeat` index                                    |

```jsonc
{ "type": "Ul", "children": [{ "type": "Li", "repeat": { "$data": "rows" }, "children": [{ "$item": "label" }] }] }
```

**A reference is resolved before it is validated**, so the value the host supplied is the one the
schema judges: a `$data` that resolves to a string cannot land in a numeric prop. A reference that
resolves to nothing drops its prop and reports `unresolved-data`, which mid-stream is ordinary.

## Registering a component of your own

A registry entry is a component, or a component with the rules around it:

```tsx
const registry = createSpecRegistry({
  catalog: allowed,
  components: {
    Flex,
    H2,
    StatCard: {
      component: StatCard,
      props: {
        type: 'object',
        properties: { label: { type: 'string' }, value: { type: 'number' }, tone: { type: 'string', enum: ['up', 'down'] } },
        required: ['label', 'value'],
        additionalProperties: false,
      },
      slots: [],
      events: ['onSelect'],
    },
  },
});
```

**A component registered with no schema takes no props at all.** That is the safe direction to be wrong
in, and writing the schema is the point: it is what the model is constrained to and what the renderer
enforces.

The same mechanism is how an HTML attribute gets through. The catalog leaves them out — `href` is not a
prop, it goes in `props={{ href }}` — so a generated `<Link>` can point nowhere until the app says where
it may point:

```tsx
Link: {
  component: Link,
  props: {
    ...allowed.components.Link.props,
    properties: {
      ...allowed.components.Link.props.properties,
      props: { type: 'object', properties: { href: { type: 'string', pattern: '^(?:/|https://)' } }, additionalProperties: false },
    },
  },
},
```

A `javascript:` URL then fails the pattern and is dropped, with an `invalid-prop` to say so. Note that
JSON Schema's `pattern` is unanchored: anchor yours.

## On a server, and without React at all

`renderSpec(spec, options)` is `<SpecRenderer>` with no hook in it — it returns `{ element, issues }`,
which is what a test asserts on and what a server render uses when there is nothing to report to:

```tsx
const { element, issues } = renderSpec(spec, { registry, data });
```

A static spec renders through the ordinary SSR path with its CSS, like any other Box tree. The entry
carries a `'use client'` banner, since `<SpecRenderer>` itself holds an effect.

## Rendering it somewhere else: json-render

[`@json-render/react`](https://json-render.dev) wants a Zod schema per component, and `z.fromJSONSchema` is
the whole adapter:

```ts
import { schema } from '@json-render/react';
import * as z from 'zod';
import { catalog } from '@box-kite/react/catalog';

const box = catalog({ include: ['Flex', 'H2', 'P'], styleProps: ['d', 'gap', 'p', 'bgColor', 'fontSize'] });

const jsonRender = schema.createCatalog({
  actions: {},
  components: Object.fromEntries(
    Object.entries(box.components).map(([name, component]) => [
      name,
      { props: z.fromJSONSchema(component.props), slots: component.slots, description: component.description, example: {} },
    ]),
  ),
});
```

**Apply the props guardrail yourself.** Measured against `@json-render/react` 0.20.0: its `propsOf` schema
type resolves to `z.record(z.string(), z.unknown())` for every catalog holding more than one component, so
`jsonRender.validate(spec)` checks which components a spec names and lets any props through. Each
component's `props` is a self-contained schema for exactly this reason — check a node against its own
before you render it.

The same shape serves a structured-output API (`components[name].props` is a strict JSON Schema) and any
runtime that takes a component catalog: assistant-ui, CopilotKit, A2UI.

## Seeing it run

[box-kite.dev/generative-ui](https://www.box-kite.dev/generative-ui/) is the loop end to end: three
prompts, a dashboard of grids and charts arriving a character at a time, the theme flipped under it, and
a second demo showing what the renderer refuses and what it reports about each refusal. The site is
static, so those generations are recordings — the catalog, the registry and the renderer on that page are
the real ones, and the live `streamObject` route is `examples/next-app/app/generative` in the repository.
