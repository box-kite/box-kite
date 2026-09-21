# The behaviour primitives (`@box-kite/react/a11y`)

Five hooks and one component: the mechanics every accessible widget needs and none of them can be
seen in the markup. They are what the library's own components are built from, and they are
published so a consumer building a pattern this library does not ship — a tree view, a split
button, a command palette — does not have to write them again.

```tsx
import { useControllableState, useDismiss, useFocusReturn, useIdentifier, useRovingFocus } from '@box-kite/react/a11y';
import VisuallyHidden from '@box-kite/react/components/visuallyHidden';
```

2.2 KB gzipped for the whole entry, and it pulls in no styling engine: the hooks reach React, two
leaf modules of DOM helpers, and each other. They are client hooks — the entry carries a `'use client'` banner, so importing it from a
Server Component opens a client boundary. `VisuallyHidden` is a component and ships separately,
where it can still render on a server.

What they deliberately do **not** do is supply roles or ARIA. A listbox and a menu navigate
identically and are named completely differently; a hook that decided both would be wrong for one
of them. Movement, state and focus are here — the semantics belong to whoever is building the
pattern.

`Tooltip` is the first component assembled from them, and a small enough one to read as a worked
example: `src/components/tooltip.tsx` is `useControllableState` for the open state (so a consumer
can control it and be told _why_ it changed), `useIdentifier` for the id `aria-describedby` points
at, and `useDismiss` with `outsidePointer: false` for Escape. Everything left over — the delays,
the hover grace period, `role="tooltip"` — is the pattern, and that is the split this file is
about. It uses no `useFocusReturn`: focus never enters a tooltip, so there is nothing to return.

---

## `useControllableState`

One value that behaves the same whether the consumer controls it or not, and every change carrying
a **reason**.

```tsx
const [open, setOpen] = useControllableState<boolean, 'trigger' | 'select' | 'escape'>({
  value: props.open, // present = the consumer owns it
  defaultValue: false,
  onChange: props.onOpenChange,
});

setOpen(false, { reason: 'escape', event });
```

`onChange(value, { reason, event })` is the point of the hook. A component that only reports
`onOpenChange(false)` makes its consumer guess whether the popup closed because something was
picked, because Escape was pressed, because the user clicked away, or because the component decided
on its own — and each of those wants different behaviour from the surrounding app. A reason on
every change is what a controlled component owes its consumer.

Details worth knowing:

- The setter's identity is **stable**, so it can sit in a dependency array.
- It takes an updater (`setOpen((value) => !value, details)`), resolved against the current value.
- A change to the value it already holds is dropped: two dismissal layers closing the same popup is
  normal, and the consumer should hear about it once.
- "Controlled" means `value !== undefined`, decided per render.

## `useDismiss`

Light dismiss: Escape, and a pointer press outside — composable across nested layers.

```tsx
useDismiss({
  enabled: open,
  inside: [triggerRef, popupRef],
  onDismiss: (reason, event) => setOpen(false, { reason, event }),
});
```

- `inside` is what counts as inside. Pass the **trigger** as well as the popup, or a press on the
  trigger of an open popup reads as a press outside it — dismissing and reopening in one gesture.
- Escape goes to the innermost layer only, worked out from DOM containment rather than registration
  order (React runs a child's effects before its parent's, so registration order gets nesting
  backwards). An outside press is judged by each layer for itself, so a press in the page closes a
  menu and its submenu together, while a press in the menu closes only the submenu.
- An Escape a consumer already handled (`event.preventDefault()`) is left alone — that is how a
  search box inside the popup clears itself without also closing the popup.
- It listens on `pointerdown`, not `click`: dismissal belongs at the start of the gesture, and a
  press that starts inside the popup and ends outside it (a drag, a text selection) is not a
  dismissal at all.
- `escapeKey: false` / `outsidePointer: false` turn off either half.

## `useFocusReturn`

Put focus back where it came from when a layer closes.

```tsx
useFocusReturn({ enabled: open, returnTo: triggerRef });
```

Losing focus to `<body>` is the most common keyboard bug in a popup: the trigger is gone as far as
the tab order is concerned, so the next Tab starts again at the top of the page.

- The invoker is captured **during the render that opens the layer**, before the layer's own
  `autoFocus` can take focus away — an effect would remember the popup's first control instead.
- The restore is skipped when something else already holds focus (a menu item that opened a dialog,
  a user who tabbed away first), because taking it back would be the same bug pointing the other
  way.
- `returnTo` overrides the invoker; `preventScroll` is passed to `focus()`.
- It also returns `{ returnFocus }` for the cases where the component wants to say when.

## `useRovingFocus`

Arrow-key navigation over a list — the movement half of every APG list pattern (listbox, menu,
tabs, radio group) — with both of the focus strategies those patterns use.

```tsx
const roving = useRovingFocus({
  count: items.length,
  orientation: 'vertical', // 'horizontal' | 'both'
  loop: true,
  isDisabled: (index) => items[index].disabled,
  textOf: (index) => items[index].label, // supplying this turns on typeahead
  onSelect: (index, event) => choose(index),
});

<ul onKeyDown={roving.onKeyDown}>
  {items.map((item, index) => (
    <li key={item.id} role="option" aria-selected={index === roving.activeIndex} {...roving.itemProps(index)}>
      {item.label}
    </li>
  ))}
</ul>;
```

**A sideways arrow follows the reading order.** APG asks for it and a right-to-left list reverses it, so
`ArrowLeft` is the _next_ item there and `ArrowRight` the previous one. Nothing configures it: the hook
asks the element for its _resolved_ direction (`getComputedStyle`, so a `dir="auto"` or a `<bdi>` above it
counts) the moment one of those two keys arrives, which is why a vertical list pays nothing for it. The
vertical axis, Tab, Home and End never flip — Home is the first item in the reading order either way.

Keys: arrows per `orientation`, Home/End (skipping disabled items), Enter and Space to select,
printable characters for typeahead. A single character — or the same character repeated — moves to
the next item starting with it; a longer buffer narrows instead of hopping. Space belongs to an
open typeahead buffer rather than to selection, because "New York" contains one.

**Two focus modes.** The default (`focusItems: true`) is roving tabindex: real DOM focus follows
the active item and `itemProps` puts exactly one item in the tab order, so Tab enters and leaves the
list in one press. `focusItems: false` is the other half — focus stays where it is (a combobox
trigger) and the caller names the active item with `aria-activedescendant`, for which
`roving.activeItem()` hands back the element.

`activeIndex` is clamped to `count`, so a list filtered down by a search box cannot leave it
pointing past the end. It is controllable through `activeIndex`/`onActiveIndexChange`, and
`setActiveIndex(index, details)` sets it outright — opening a list on the selected item.

## `useIdentifier`

A stable, unique id for wiring one element to another.

```tsx
const id = useIdentifier('select');
// `${id}-trigger`, `${id}-listbox`, `${id}-option-3`
```

React's `useId` with the punctuation removed: `:r1:` (React 18) and `«r1»` (React 19) are both
rejected by `querySelector('#…')`, and the part that varies is the word characters. Derive related
ids from one call rather than calling the hook once per element. On React 16/17, which have no
`useId`, the fallback is a module counter — pass ids in explicitly there if the tree is hydrated.

## `VisuallyHidden`

Content for screen readers that is not drawn on screen — the name of an icon-only button, the
heading a region is labelled by, a live region's announcement.

```tsx
import VisuallyHidden from '@box-kite/react/components/visuallyHidden';

<Button>
  <VisuallyHidden tag="span">Delete the invoice</VisuallyHidden>
  <TrashIcon aria-hidden />
</Button>;
```

`display: none` and `hidden` take content out of the accessibility tree along with the layout,
which is the opposite of what is wanted. This clips the element instead: absolutely positioned, one
pixel (not zero — some screen readers skip a zero-sized element), `overflow: hidden`,
`clip-path: inset(50%)` and `white-space: nowrap`, so a long string is not wrapped into a
one-pixel-wide column and read out one word per line. It is a Box, so props override the defaults
and `tag` picks the element.

---

## Testing them

Each hook has its own unit tests next to it in `src/react/a11y/`. What those cannot prove is that
they compose, so `src/react/a11y/primitives.a11y.test.tsx` assembles all five into a select-only
combobox, drives it entirely from the keyboard, and runs axe over it — the pattern A5 has to reach,
built the way a consumer would build it. The bugs it is there to catch are the ones that only
appear in combination: a dismissal firing while the list is still taking focus, focus returning to
a trigger a roving index has moved away from, an id regenerated per render so
`aria-activedescendant` points at nothing.

See [a11y-testing.md](a11y-testing.md) for the test infrastructure itself and what automated checks
can and cannot see.
