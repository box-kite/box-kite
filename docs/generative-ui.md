# The component catalog

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

## Rendering a spec: json-render

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

**A `ReactNode` prop is a slot.** `children` is the `default` slot; a named one (`Tooltip`'s `content`) is
a slot of its own name.

**Anything else a JSON spec cannot express is left out.** A prop whose type is a grid definition or a row
renderer is absent rather than half-described: a partial schema would state a constraint that is not true.
