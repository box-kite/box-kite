# The component contract

Five conventions every component in this library keeps, and one script that will not let it stop:
`npm run check:conventions`. They are written down because they are the part of a component library
that cannot be inferred from any one component — you meet the third `onOpenChange` before you
realise the shape was a decision — and because the answer to "why does this library not have
`asChild`?" should exist somewhere other than in a maintainer's head.

Each rule below is the rule, the reason, and the exceptions. The exceptions are the interesting
part: all of them are in `scripts/check-component-conventions.mjs`, in one of two ledgers.
`SANCTIONED` is where a rule genuinely does not apply, with the prose a reviewer reads when a new
one is proposed. `OWED` is where it applies and has not been paid yet. **Both fail two ways** — on
a new break and on a listed one that stopped breaking — which is the rule the axe sweep's
`knownViolations` already follows: an exception nobody can delete is a lie waiting to be believed.

---

## 1. State is `useControllableState`

A `value`/`defaultValue` pair (or `open`/`defaultOpen`, or `query`/`defaultQuery`) means the
consumer may own the value, and [`useControllableState`](a11y-primitives.md) is the one thing that
makes owning it behave exactly like not owning it.

```tsx
const [open, setOpen] = useControllableState<boolean, PopoverReason>({ value: props.open, defaultValue: false, onChange });
```

It is not a convenience. Rolling the pair by hand is how a component ends up with two sources of
truth for one value, and the failure is quiet: the uncontrolled branch drifts from the controlled
one in exactly the states a test does not cover. The hook also writes the uncontrolled value
whether or not a `value` prop is present, so a consumer that *stops* controlling a value carries on
from the last one it asked for rather than snapping back to the default.

**Sanctioned:** `Textbox` and `Textarea`. `defaultValue` there is React's own uncontrolled-input
attribute and the DOM holds it; a hook holding it beside the DOM would be the second source of
truth this rule exists to prevent.

**Owed:** `Dropdown`, which predates the hook and hand-rolls the pair with `useState` + `useMemo`.

## 2. Every change is `onXChange(value, { reason })`

```tsx
onOpenChange?: ChangeHandler<boolean, PopoverReason>;   // (value, { reason, event }) => void
```

A component that only says `onOpenChange(false)` makes its consumer guess whether the popup closed
because the user picked something, pressed Escape, clicked away or tabbed out — and each of those
wants different behaviour from the app. The reason is the prop's whole point, so
`ChangeHandler<boolean>` with the reason left off breaks this rule as much as a bare function type
does; the check requires the second type argument.

The reason is a **named union** exported beside the component (`PopoverReason`, `ComboboxValueReason`),
because it is documentation and an exhaustive `switch` at the same time. Reasons are shared where
the mechanic is shared: every dismissible layer reports `'escape'` and `'outside-pointer'`, and
`'imperative'` is always "something other than the user did this".

A component may report more than one event — `Slider` has `onValueChange` on every step and
`onValueCommit` at the end of the interaction — but every one of them is a `ChangeHandler`.

**Sanctioned, and this is the important one: a component that renders a real form control forwards
the DOM event.** `Checkbox`, `Switch`, `RadioButton`, `Textbox`, `Textarea` and `Button` take
React's `onChange`/`onInput`/`onClick` unchanged. The event *is* the API there — it carries the
target, it is what a form library already wired up, and React's own types describe it better than
ours would. Inventing a second channel beside it would mean two ways to hear about one keystroke.

Also sanctioned: `Menu.Item`'s `onSelect`, which is a **command** — there is no new value and no
reason to give — and `Overlay`'s `onSideChange`, which **reports** where the browser put the layer
rather than announcing a state the caller owns.

**Owed:** `Dropdown.onChange`, which is `(value, values)`, and `DataGrid`'s eight callbacks, which
are positional and reasonless. `DataGrid.onSelectionChange` is the near miss worth naming — its
event object carries `action: 'select' | 'deselect'`, which is a reason under a different name.

## 3. No effect-driven state sync

Derive it; do not copy it. An effect that watches a prop and sets state from it renders twice, is
one render behind anything that changed the prop, and is the shape that produces "Maximum update
depth exceeded" the first time the write is not perfectly conditional.

`Combobox`'s field is the worked example. Its text is two things at once — what the user typed, and
the label of whatever is selected — and the temptation is an effect copying the selection into the
query. It is one expression instead:

```tsx
const text = typed ? query : selectionText;
```

This rule is the one the script cannot check, because "an effect that syncs state" and "an effect
that subscribes to the DOM" are the same syntax. It is on the review checklist in CONTRIBUTING.md
instead.

## 4. Composition is a render prop, never a cloned child

A component that needs to put attributes on something the caller rendered hands the caller a bag to
spread, and never reaches into the element it was given:

```tsx
<Popover trigger={(trigger) => <Button {...trigger}>Options</Button>}>…</Popover>
<Presence present={open}>{({ present, ref, props }) => <Box ref={ref} props={props} opacity={present ? 1 : 0} />}</Presence>
```

This is the answer to `asChild`. Cloning has to **guess where an attribute belongs** — a Box takes
DOM attributes in a `props` bag and a plain element takes them on top — and a wrong guess is
silent: the attribute is dropped and the popover simply never opens. A render prop makes the
destination the caller's decision, and the types can then say that `ref` is not optional
decoration. It also means the bag can be handed to something that is not one element, which is what
a trigger made of a button and a label needs.

**Sanctioned: `Icon`.** It styles an icon somebody else drew, so there is no render prop to offer —
the element already exists, from a library that knows nothing about this one. It reads the child's
type to decide which of the two destinations to use, which is exactly the guess this rule forbids,
made explicitly and only where it must be. Bug #78 is what that reading is for.

## 5. Every part takes Box style props, and every component names a style tree

Two halves of the same promise, and the differentiator: styling a library component should be the
same act as styling anything else.

- **Box props on every part.** `<Menu.Item px={3} bgColor="slate-100">` works, and so does the same
  on `Tabs.Panel`, `Accordion.Trigger` and `Dialog.Title`. A subpart is not a lesser element.
- **A node in `boxComponents.ts`**, so the defaults can be replaced wholesale with
  `Box.components()` rather than overridden per call site — `menu.item`, `tabs.indicator`,
  `accordion.track`.

**Sanctioned:** `Flex`, `Grid` and `Presence` name no style tree — the first two are Box with one
prop set and the third renders no element at all. `AlertDialog` shares `dialog`, whose `alert`
variant is its own. `Overlay` places a layer and draws no surface; the surface is its child.
`Icon`'s class goes on the element it did not author. And `Overlay`, `Combobox` and `Presence`
appear in the Box-props ledger for a modelling reason rather than a real one: their Box half is
intersected in at the call signature, so the interface the reference names has none.

**Owed:** `DataGrid`, which takes no Box props at all, and `RadioGroup` and the four chart
primitives, which render markup with no node to reach.

---

## Adding a component

`CONTRIBUTING.md` has the checklist under "API review". The short version: hold state in
`useControllableState`, report through `ChangeHandler` with a named reason union, hand out a bag
rather than cloning, extend `BoxProps` on every part, add a node to `boxComponents.ts`, and add the
component to `scripts/componentsApi.mjs` — which is what puts it in front of this check at all.
