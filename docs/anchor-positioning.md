# Anchor positioning (`@box-kite/react/anchor`)

Where a floating layer goes. One hook and two value families, over the six props the engine already
ships (`anchorName`, `positionAnchor`, `positionArea`, `positionTryFallbacks`, `positionTryOrder`,
`positionVisibility`).

```tsx
import { useAnchorPosition } from '@box-kite/react/anchor';
```

About 2 KB gzipped for the entry, and it pulls in no styling engine. It is a client hook — the entry
carries a `'use client'` banner — but the thing it produces is ordinary props, so a layer that needs
no JavaScript at all can be written by hand with the props below and rendered on a server.

What it deliberately does **not** do is supply a role, a dismissal or focus handling. A layer is not
a pattern: a tooltip, a menu and a select popup are placed identically and named completely
differently. Placement is here; the semantics belong to whoever is building the pattern, and the
mechanics are in `@box-kite/react/a11y`.

---

## `useAnchorPosition(options)`

```tsx
const { css, anchorProps, layerProps } = useAnchorPosition({ side: 'bottom', align: 'start', offset: 2, matchWidth: true });

<Button {...anchorProps} onClick={toggle}>
  Options
</Button>;
{
  isOpen && <Box {...layerProps} component="menu">…</Box>;
}
```

Spread `anchorProps` on the trigger and `layerProps` on the layer. On a browser with CSS anchor
positioning that is the whole of it: nothing runs. No measuring, no scroll listener, no state,
nothing to keep in sync when the page moves — `position-area` and `position-try-fallbacks` are the
placement and the flip a positioning library ships JavaScript for.

| Option       | Default   | What it means                                                                                                      |
| ------------ | --------- | ------------------------------------------------------------------------------------------------------------------ |
| `side`       | `'bottom'` | `'top'`/`'bottom'` are the block axis, `'start'`/`'end'` the inline one — so a side mirrors in a right-to-left page |
| `align`      | `'center'` | which of the anchor's edges to line the layer up with on the other axis                                             |
| `offset`     | `0`        | the gap, on the ÷4 spacing scale, emitted as the margin on the side facing the anchor                               |
| `flip`       | `true`     | `positionTryFallbacks`: the side's own axis, then the alignment's, then both                                         |
| `matchWidth` | `false`    | `minWidth="anchor-size(width)"` — the anchor's width, with nothing measured                                         |
| `name`       | generated  | the anchor's name; one per instance unless you pass one                                                             |
| `anchor`     | —          | an anchor handed to the hook rather than one it spreads props onto (a ref or an element)                            |
| `trackSide`  | `false`    | whether `side` in the result says where the layer ended up — one read after layout, so it is opt-in                 |

`css` says which path ran: `true` is the browser placing the layer, `false` is the measured
fallback. `side` is where the layer actually is: the requested side, unless `trackSide` is on and a
flip moved it. There is no `strategy` option — the layer is always `position: fixed`, because that is
what makes both paths agree about what the coordinates mean.

A caller that was handed its trigger rather than rendering it passes `anchor` instead of spreading
`anchorProps`: the name is written onto the element in a layout effect, which is the one thing an
element somebody else rendered can be reached by. That is what `Overlay` does, and a ref is read when
the layer mounts — so an element in state is the robust form when the layer is open from the start.

### The fallback

CSS anchor positioning is Chrome 125+, Firefox 147+ and Safari 26+. Everywhere else the hook
measures: it flips to the opposite side when the requested one has no room and the opposite has,
then shifts along the other axis to keep the layer in the viewport, and hands the layer its
coordinates as an inline style. Both paths come out of one model, so the fallback is the CSS
placement worked out by hand rather than a second set of rules.

The first render always assumes the CSS path, so a server-rendered anchor and the first client
render agree; a browser without anchor positioning says so in a layout effect, before it paints.

---

## `anchor-size()` and `anchor()`

Every sizing prop (`width`, `height`, `minWidth`, `maxWidth`, `minHeight`, `maxHeight`) takes an
`anchor-size()` value, and every single-side inset prop (`top`, `right`, `bottom`, `left`,
`insetStart`, `insetEnd`) takes an `anchor()` one:

```tsx
<Box position="fixed" positionAnchor="menu-trigger" minWidth="anchor-size(width)" maxHeight="anchor-size(height, 20rem)" />
<Box position="fixed" top="anchor(bottom)" insetStart="anchor(left)" />
```

- `anchor-size()` takes an axis: `width`, `height`, `block`, `inline`, `self-block`, `self-inline`.
- `anchor()` takes an edge: `top`, `right`, `bottom`, `left`, `start`, `end`, `self-start`,
  `self-end`, `center`, `inside`, `outside` — or a percentage along one (`anchor(50%)`).
- Both take an optional anchor name first, with the same optional `--` the props take
  (`anchor-size(trigger width)`), and an optional fallback after a comma for when there is no anchor
  to measure (`anchor-size(width, 10rem)`).
- A bare `anchor()` is rejected — CSS needs the edge. A bare `anchor-size()` is not: it means the
  layer's own axis.
- A value the grammar rejects emits no rule and no class name, the way every validated value does.

Together they are what places and sizes a layer against its anchor with no hook at all, which is
what makes a floating layer possible in a Server Component.

---

## Five things worth knowing

All five were measured in Chrome 152 rather than read off the spec.

**The layer is `position: fixed`, so it escapes `overflow: hidden` without a portal.** Every clipped
ancestor, no portal, no `z-index` juggling to get out of one — but *not* a transformed ancestor,
which is a fixed element's containing block in either path, and not the page's stacking order, which
is still the page's. `Overlay` (`@box-kite/react/components/overlay`) is this hook plus a portal, and
is still the answer when the layer has to come out on top of everything.

**A flip needs three candidates, not one.** A candidate position has to fit on *both* axes to be
taken, so a lone `flip-block` does nothing at all for a layer that overflows the *cross* axis — the
browser leaves it pressed against the edge of the viewport. `flip` therefore offers the side's own
axis, the alignment's, and both, in that order, and the both-axes rule is what makes the order work:
a menu with no room on the side its alignment reaches mirrors to the other end instead of running off
the page.

**Knowing which side the browser chose costs the entrance.** `trackSide` reads the *used*
`position-area`, and that read is the style resolution `@starting-style` computes its before-change
style from — so a class that depends on the answer arrives after the entrance has been decided, every
time. An exit runs long afterwards and can use it, which is why `dropdown.items` has a `closedUp`
variant and no `up` one. A used value is also not the value that went in: a `span-all` half is
dropped, and a value naming both axes comes back in the `start`/`end` shorthand, where position names
the axis (`block-end span-inline-end` reads back `end span-end`, and `start span-end` once flipped).

**A flip is sticky.** Once the browser takes a `position-try` fallback it keeps it until the layer is
laid out afresh, which is what stops the layer oscillating as the page scrolls. Hiding the layer and
showing it again re-evaluates, so a popup that mounts when it opens always picks the side that fits,
while one that stays mounted keeps the side it first chose.

**The anchor's name is an inline style rather than a prop.** An identity is per instance, so a class
for it would be a rule per instance that is never freed — the same rule that makes a sparkline's `d`
an attribute and its stroke a class. Everything shared — the area, the flip, the margin, the width —
is an ordinary prop, and an ordinary class.

One more, from the props themselves: **a candidate position has to fit on both axes to be taken**, so
an overflow the flips cannot fix disqualifies every one of them and the layer silently stays put.
The hook cannot hit this — `align: 'center'` emits `span-all` rather than the centre cell for exactly
that reason — but hand-written props can: `positionArea="block-end center"` with a layer wider than
its anchor never flips.
