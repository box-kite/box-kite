# Ecosystem interop

`@box-kite/react/interop` is this library's shapes and four other runtimes' shapes, mapped onto each
other. It is framework-free, carries no engine, and depends on none of them — an adapter that imported a
runtime would be choosing it for the app, and the app has already chosen.

There are two things every agentic runtime describes, in words of its own:

- **A tool call.** Where it is, what it was given, what it answered, and whether it is waiting on a
  person. `<ToolCallCard>` and `<ApprovalCard>` (`components/agent`) draw the two halves of it.
- **A tree of components.** A name resolved against an allow-list the app owns, JSON props, children.
  `catalog()` says what may be in it and `<SpecRenderer>` renders it.

```ts
import { toolPart, a2uiApplyAll, a2uiSurface, a2uiToSpec, a2uiCatalog } from '@box-kite/react/interop';
```

## The tool state, in one vocabulary

`toolPart(part)` reads a part from AI SDK, assistant-ui or CopilotKit and answers in this library's
words: `{ kind, status, decision, input, output, error }`, where `kind` is `'call'` or `'approval'` and
`status` is the `pending`/`running`/`success`/`error` a `<ToolCallCard>` takes.

```tsx
import { toolPart } from '@box-kite/react/interop';
import { ToolCallCard, ApprovalCard } from '@box-kite/react/components/agent';

function Part({ part }: { part: unknown }) {
  const mapped = toolPart(part);

  if (!mapped) return null;
  if (mapped.kind === 'approval') return <ApprovalCard title="Approve this call?" onDecisionChange={respond} />;

  return <ToolCallCard name="searchOrders" status={mapped.status} input={mapped.input} output={mapped.output} />;
}
```

**A decision is not a stage a call passes through, it is a question somebody answers** — which is why
two components cover what AI SDK reports as six states, and why the runtimes that report four are the
ones whose human-in-the-loop lives on a second channel:

| Runtime      | What it reports                                                                                                      | Where the question is                                 |
| ------------ | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| AI SDK 6/7   | `input-streaming`, `input-available`, `output-available`, `output-error`, `approval-requested`, `approval-responded` | Two of the six states, with `approval.approved`       |
| assistant-ui | `status: { type: 'running' \| 'complete' \| 'incomplete' \| 'requires-action' }`                                     | `requires-action`, under either of its two reasons    |
| CopilotKit   | `status: 'inProgress' \| 'executing' \| 'complete'`                                                                  | `renderAndWaitForResponse`, which hands you `respond` |
| AG-UI        | `TOOL_CALL_START` / `_ARGS` / `_END` / `_RESULT` events                                                              | `INTERRUPT`                                           |

**AG-UI is the odd one out, and it is worth knowing why**: it reports _events_, not parts, so its cards
need a fold rather than a mapping. `applyToolEvent(parts, event)` is that fold — one call per event,
oldest first, keyed by `toolCallId`.

```ts
import { applyToolEvent } from '@box-kite/react/interop';

const parts = events.reduce(applyToolEvent, {});
```

## A2UI

[A2UI](https://a2ui.org/) is the declarative UI protocol Google published, and the one CopilotKit and
Oracle converged on. Its wire shape is the only one in this family that is genuinely different: a **flat
adjacency list** of components referring to each other by id, arriving one message at a time, with a data
model of its own per surface. `<SpecRenderer>` renders a tree, so this is a real adapter rather than a
rename.

### Their messages, rendered here

`a2uiApplyAll` folds a message stream into the surfaces it names, and `a2uiToSpec` turns one surface's
adjacency list into the tree the renderer takes. Both v0.8 and v0.9 are read; the fold is **pure and
hands the same state back when a message changed nothing**, so holding it in `useState` re-renders when
the surface moved and not when a message arrived for a different one.

```tsx
import { useState } from 'react';
import { a2uiApply, a2uiEmpty, a2uiSurface, a2uiToSpec } from '@box-kite/react/interop';
import SpecRenderer from '@box-kite/react/spec';

function Surface({ registry, catalog }) {
  const [state, setState] = useState(a2uiEmpty);

  useA2uiStream((message) => setState((current) => a2uiApply(current, message)));

  const surface = a2uiSurface(state);

  return <SpecRenderer spec={a2uiToSpec(surface, { catalog })} registry={registry} data={surface?.data} onAction={run} />;
}
```

Three things the two models already agreed on, each a special case that did not have to be written:

- **A2UI's data binding is already ours.** `{ "path": "/user/email" }` is a JSON Pointer, and `$data` has
  taken a JSON Pointer since it was written, so a binding is a rename rather than a parse. The surface's
  own data model is what goes in `<SpecRenderer data>`.
- **A template is a `repeat`.** `children: { componentId, path }` is one node per item of an array, which
  is exactly what `repeat` means, so a list that streams costs nothing extra.
- **A half-arrived surface is the ordinary case.** An agent streams a leaf before the branch that holds
  it; a component nothing reaches from the root is simply not rendered yet, and appears when the message
  naming it does. A cycle in the id graph is cut rather than walked.

What A2UI owns rather than the component — `id`, `component`, `child`, `children`, `action` — never
reaches the registry as a prop. **`action` becomes an `on` binding under that name**, because what it
means belongs to the component it lands on: an app registering Box components under A2UI's own names
(`Text`, `Button`, `Row`) declares `events: ['action']` on them.

```ts
createSpecRegistry({
  components: {
    Button: { component: Button, events: ['action'], props: BUTTON_PROPS },
    Column: { component: Flex, props: COLUMN_PROPS },
  },
});
```

Where the agent generated against _this library's_ catalog instead, pass it — then a prop the catalog
calls an event is bound as one and the rest are values:

```ts
a2uiToSpec(surface, { catalog: catalog({ include: ['Flex', 'H2', 'Button'] }) });
```

### Our components, generated for

`a2uiCatalog(catalog())` is `catalog()` as an A2UI catalog document — the same components and the same
values their props take, in the shape around them that an adjacency list needs: a component carries its
own `id`, its type is a property rather than the key above it, and its children are **ids** rather than
nested nodes. Every event becomes a string, because a JSON message cannot carry a function: what an agent
writes is the name of an action, and `onAction` is where the host decides what it does.

```ts
import { catalog } from '@box-kite/react/catalog';
import { a2uiCatalog } from '@box-kite/react/interop';

export const document = a2uiCatalog(catalog({ include: ['Flex', 'H2', 'Sparkline'], styleProps: ['p', 'gap', 'bgColor'] }), {
  catalogId: 'https://example.com/a2ui/box-kite.json',
});
```

**Serve it at the `catalogId` you gave it**, which is what an agent's `createSurface` names.

## CopilotKit

Two surfaces, and they want opposite directions.

**Its A2UI renderer** (`@copilotkit/a2ui-renderer`) takes a catalog built from Zod schemas and React
renderers. `z.fromJSONSchema` is the whole of the bridge — which is why `catalog()` emits JSON Schema at
all. One trap, measured against zod 4.6: **a `$ref` resolves against the document, not against the piece
you lifted out of it**, so converting a component on its own throws `Reference not found: #/$defs/color`.
`a2uiComponentSchema(document, name)` is that component with the document's definitions attached.

```tsx
import { createCatalog } from '@copilotkit/a2ui-renderer';
import * as z from 'zod';
import { a2uiCatalog, a2uiComponentSchema } from '@box-kite/react/interop';

const document = a2uiCatalog(catalog({ include: ['Flex', 'H2', 'P'] }));
const names = Object.keys(document.components);

const definitions = Object.fromEntries(
  names.map((name) => [name, { props: z.fromJSONSchema(a2uiComponentSchema(document, name)), description: '' }]),
);

// Their renderer hands a component its resolved props and a `children(id)` — the adjacency list again.
const renderers = { Flex: ({ props, children }) => <Flex {...props}>{props.children?.map(children)}</Flex> };

export const boxKiteCatalog = createCatalog(definitions, renderers, { catalogId: document.catalogId });
```

**Its actions** (`useCopilotAction`) take a render function, so the cards go in as they are. `render` is a
call being shown; `renderAndWaitForResponse` is a question, and the `respond` it hands you is what
`onDecisionChange` calls.

```tsx
useCopilotAction({
  name: 'refundOrder',
  parameters: [{ name: 'orderId', type: 'number' }],
  renderAndWaitForResponse: ({ args, respond }) => (
    <ApprovalCard title={`Refund order ${args.orderId}`} onDecisionChange={(decision) => respond?.(decision === 'approved')} />
  ),
});
```

## assistant-ui

Its `GenerativeUISpec` and this library's `SpecNode` are the same idea arrived at twice. Three
differences, and they are the whole adapter: the name is `component` rather than `type`, a child may be a
bare string that renders as text, and their nodes carry no data binding, no repeat and no action channel
— in their design those are the tool's job rather than the spec's.

`fromGenerativeUi(spec)` reads theirs and gives back an array of `SpecNode` (several roots stay several
roots; wrapping them in a container nobody asked for would change the layout). `toGenerativeUi(spec)`
goes the other way, and **reports what it could not carry** rather than emitting a tree that renders half
a view in silence:

```ts
const { spec, losses } = toGenerativeUi(node);
// losses: [{ code: 'data-binding' | 'repeat' | 'event', path }]
```

**Its Tool UI** is a component per tool name, and the cards go in as they are:

```tsx
import { makeAssistantToolUI } from '@assistant-ui/react';
import { ToolCallCard } from '@box-kite/react/components/agent';
import { toolPart } from '@box-kite/react/interop';

export const SearchOrdersUI = makeAssistantToolUI({
  toolName: 'searchOrders',
  render: (part) => <ToolCallCard name="searchOrders" {...toolPart(part)} />,
});
```

## json-render

[`@json-render/react`](https://json-render.dev) wants a Zod schema per component, and `z.fromJSONSchema`
is again the whole adapter — the recipe is in
[generative-ui.md](generative-ui.md#rendering-it-somewhere-else-json-render), with the measured caveat
that its own `validate` lets any props through once a catalog holds more than one component, so each
node still wants checking against its own schema.

## What is verified, and how

Every runtime named here is a devDependency of this repository, and `src/interop.test.tsx` runs the
adapters against the published packages rather than against a memory of them:

| Claim                                                        | Checked against                                  |
| ------------------------------------------------------------ | ------------------------------------------------ |
| `toGenerativeUi` emits their `GenerativeUISpec`              | `@assistant-ui/core`'s own type                  |
| `fromGenerativeUi` reads their `GenerativeUINode`            | the same                                         |
| every member of their `ToolCallMessagePartStatus` union maps | the same                                         |
| `a2uiCatalog` is a document their `createCatalog` accepts    | `@copilotkit/a2ui-renderer`'s published function |
| a surface generated against it renders here                  | the fold and `a2uiToSpec`, end to end            |
| the catalog is one json-render accepts, and validates a spec | `@json-render/react`, in `src/catalog.test.tsx`  |

The two cases A2UI's own conformance suite keeps for a message processor — that an update lands on the
surface it names and nowhere else, and that each surface owns its data model — are in
`src/utils/interop/a2uiInterop.test.ts` in the vocabulary that suite uses.
