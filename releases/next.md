# Box Kite next

_Unreleased. A PR that changes what a consumer sees adds its section here — see CONTRIBUTING.md, "Release notes"._

<!-- Intro: one or two sentences on what this release is about. The first one becomes the CHANGELOG line. -->

## Highlights

<!-- One bullet per section below, linking to it: **[Heading](#heading)** — one line on why it matters. -->

<!-- One `##` per change, above Breaking changes: a sentence for the heading, a paragraph on what and why, an example if it helps. -->

## Every interaction a component reports now reaches one handler

`Box.onInteraction(listener)` hears what every component does, in one shape: a dialog opening and why, a tab chosen, a menu command, a slider let go, a DataGrid sorted, filtered, paged, edited, pasted into, grouped or exported, a toast shown and dismissed. Each event is `{ component, type, reason, value, details, event, target, timeStamp }`. `component` is the component's key (`'dialog'`, `'datagrid'`, `'menu.item'`). `type` is the callback it mirrors, without its `on` (`'openChange'`, `'sortingChange'`, `'cellEdit'`). `reason` is the same word that callback is given. The DataGrid also reports the changes it has no callback for: a column pinned, hidden, resized or grouped, and an export. The grid also reports copy, a cell edit started, cancelled or refused, a data-source retry, and on a phone the record view, the sort and filter sheets, select mode and Show more. A form reports the names of the fields it sent, never what was typed into them. Nothing reports per frame, per hover or per keystroke: a drag reports where it ends, so a slider is `valueCommit` and a dashboard `layoutCommit`. It is the hook analytics, an audit log or a session recorder needs, with nothing to wire per component. Delivery is fire and forget: events are queued as they happen and handed to the listener in order, in a background task after the handler, so a slow listener never delays the interaction it reports. `pagehide` delivers what is still queued, and `flushInteractions()` delivers it now. With no listener, a change costs one size check.

```tsx
const stop = Box.onInteraction(({ component, type, reason, value }) => {
  analytics.track(`${component}.${type}`, { reason, value });
});
```

One choice is one event: a component built from others keeps its parts quiet, so a day picked in a `DatePicker` reports `datePicker.valueChange` and `datePicker.openChange`, not the `Calendar` inside it as well. A click on a plain button or link reports no change, so it is not an event here. Instead, `Box.configure({ componentAttribute: true })` writes `data-bk="<component key>"` on every element a component styles, so one delegated `click` listener can name what was pressed with `event.target.closest('[data-bk]')`. Set it in a module that runs on both the server and the browser, or hydration sees two different trees. A value is shared with the app rather than copied, and it can hold what someone typed (a combobox query, an edited cell), so redact it before it leaves the page.

An app reports its own moments on the same channel with `reportInteraction({ component, type, reason, value, details, event })`, a named export of `@box-kite/react`: a hover, a section scrolled into view, a wizard step. Box does not wrap the handlers an app passes in `props`, because that would cost every render and report a hover per frame, so a moment worth counting is named where it happens:

```tsx
<Button props={{ onMouseEnter: (event) => reportInteraction({ component: 'pricing-cta', type: 'mouseEnter', event }) }}>Pricing</Button>
```

## Breaking changes

None.

## Fixes

<!-- One bullet per fix: **What was wrong.** What it does now. -->

- **A day clicked in a `Calendar` reported its focus moving with the reason `'keyboard'`.** `onFocusedDateChange` now says `'select'` for a day chosen by any device, so `'keyboard'` means an arrow key.

- **A `Dialog`, a `Popover` or the DataGrid's bottom sheet could flash scrollbars as it opened.** The entrance scales or slides the layer, and while a transform runs the layer is the containing block of every `position: fixed` element inside it, so a password manager's badge on a text field was placed relative to the dialog rather than the viewport and its `overflow: auto` scrolled to it until the transform settled. The layer now keeps `overflow: hidden` until its entrance has finished and goes back to it as its exit starts, so nothing inside it can scroll while it moves. Content too tall for the layer still scrolls once it is open.
