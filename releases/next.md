# Box Kite next

_Unreleased. A PR that changes what a consumer sees adds its section here — see CONTRIBUTING.md, "Release notes"._

<!-- Intro: one or two sentences on what this release is about. The first one becomes the CHANGELOG line. -->

## Highlights

<!-- One bullet per section below, linking to it: **[Heading](#heading)** — one line on why it matters. -->

<!-- One `##` per change, above Breaking changes: a sentence for the heading, a paragraph on what and why, an example if it helps. -->

## Every interaction on the page now reaches one handler

`Box.onInteraction(listener)` hears everything a person does with the library in one stream: a dialog opening and why, a tab chosen, a menu command, a slider let go, a DataGrid sorted, filtered, paged, edited, pasted into, grouped or exported, a toast shown and dismissed, and a press on any element a component styled. Each event is `{ kind, component, type, reason, value, details, source, event, target, timeStamp, time, url }`:

- **`kind`** says what reported it. `'change'` is a component's own change, and `type` is the callback it mirrors without its `on` (`'openChange'`, `'sortingChange'`, `'cellEdit'`). `'dom'` is a `click` or `change` on anything a component styled. `'custom'` is the app's own.
- **`component`** names it: `'dialog'`, `'datagrid'`, `'menu.item'`, or for a press the nearest `data-bk`. `reason` is the word the callback is given.
- **`source`** is `'app'` when code did it — a call through a ref, a timer, a `toast()` — and `'user'` otherwise, so a dashboard counts what people did.
- **`value` and `details` are plain JSON copies**, safe to send as they stand: a `Date` is its ISO string, and a function, a React element or a DOM node is left out. A form reports the names of the fields it sent and a `change` on a checkbox its `checked` state, never what was typed.
- **`event` and `target`** are the DOM event behind it and the control that handled it — also for a change the component was never handed an event for, like a DataGrid header sorted by a press.
- **`url`** is `location.href` when it happened, so an event delivered after a navigation still names the page it happened on. It is the whole address, query string and hash included, so trim what should not leave the page before sending it.
- **The events are typed.** Narrow on `kind` and then `component` and `type`, and `value` is the type that change carries.

```tsx
const stop = Box.onInteraction((event) => {
  if (event.kind === 'change' && event.component === 'datagrid' && event.type === 'sortingChange') {
    console.log(event.value?.columnKey, event.value?.direction);
  }
  analytics.track(`${event.component}.${event.type}`, { kind: event.kind, source: event.source, value: event.value, at: event.time });
});
```

Delivery is fire and forget: events are queued as they happen and handed over in order, in a background task after the handler, so a slow listener never delays the interaction it reports, and a listener that throws is reported rather than breaking the control. `pagehide` delivers what is still queued, and `Box.flushInteractions()` delivers it now. Up to fifty events that happen before anything listens are kept for the first listener, so an analytics bundle that loads late still hears the first page view. Nothing reports per frame, per hover or per keystroke: a drag reports where it ends, so a slider is `valueCommit` and a dashboard `layoutCommit`. One choice is one event: a component built from others keeps its parts quiet, so a day picked in a `DatePicker` reports `datePicker.valueChange` and `datePicker.openChange`, not the `Calendar` inside it as well. A `Menu.Item` takes a `value`, which is what its `select` reports.

Presses need one line of configuration. `Box.configure({ componentAttribute: true })` writes `data-bk="<component key>"` on every element a component styles, which is how a press is named. A press that changed something arrives as that change, which carries it as its `event`, so one click is one event; only a press nothing explained is a `dom` event. Set it in a module that runs on both the server and the browser, or hydration sees two different trees. The half of the channel that watches the page is a chunk of under 0.7 KB, fetched with the first subscription, so an app that never listens never loads it.

An app reports its own moments on the same stream with `Box.reportInteraction({ component, type, reason, value, details, event })`: a page view, a hover, a wizard step. Box does not wrap the handlers an app passes in `props`, because that would cost every render and report a hover per frame, so a moment worth counting is named where it happens:

```tsx
<Button props={{ onMouseEnter: (event) => Box.reportInteraction({ component: 'pricing-cta', type: 'mouseEnter', event }) }}>Pricing</Button>
```

## Breaking changes

None.

## Fixes

<!-- One bullet per fix: **What was wrong.** What it does now. -->

- **A day clicked in a `Calendar` reported its focus moving with the reason `'keyboard'`.** `onFocusedDateChange` now says `'select'` for a day chosen by any device, so `'keyboard'` means an arrow key.

- **A `Dialog`, a `Popover` or the DataGrid's bottom sheet could flash scrollbars as it opened.** The entrance scales or slides the layer, and while a transform runs the layer is the containing block of every `position: fixed` element inside it, so a password manager's badge on a text field was placed relative to the dialog rather than the viewport and its `overflow: auto` scrolled to it until the transform settled. The layer now keeps `overflow: hidden` until its entrance has finished and goes back to it as its exit starts, so nothing inside it can scroll while it moves. Content too tall for the layer still scrolls once it is open.
