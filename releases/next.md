# Box Kite next

_Unreleased. A PR that changes what a consumer sees adds its section here — see CONTRIBUTING.md, "Release notes"._

<!-- Intro: one or two sentences on what this release is about. The first one becomes the CHANGELOG line. -->

## Highlights

<!-- One bullet per section below, linking to it: **[Heading](#heading)** — one line on why it matters. -->

<!-- One `##` per change, above Breaking changes: a sentence for the heading, a paragraph on what and why, an example if it helps. -->

## Every interaction a component reports now reaches one handler

`Box.onInteraction(listener)` hears what every component does, in one shape: a dialog opening and why, a tab chosen, a menu command, a slider let go, a DataGrid sorted, filtered, paged, edited, pasted into, grouped or exported, a toast shown and dismissed. Each event is `{ component, type, reason, value, details, event, target, timeStamp }`. `component` is the component's key (`'dialog'`, `'datagrid'`, `'menu.item'`). `type` is the callback it mirrors, without its `on` (`'openChange'`, `'sortingChange'`, `'cellEdit'`). `reason` is the same word that callback is given. The DataGrid also reports the changes it has no callback for: a column pinned, hidden, resized or grouped, and an export. It is the hook analytics, an audit log or a session recorder needs, with nothing to wire per component. With no listener, a change costs one size check.

```tsx
const stop = Box.onInteraction(({ component, type, reason, value }) => {
  analytics.track(`${component}.${type}`, { reason, value });
});
```

A click on a plain button or link reports no change, so it is not an event here. Instead, `Box.configure({ componentAttribute: true })` writes `data-bk="<component key>"` on every element a component styles, so one delegated `click` listener can name what was pressed with `event.target.closest('[data-bk]')`. Set it in a module that runs on both the server and the browser, or hydration sees two different trees. A value is shared with the app rather than copied, and it can hold what someone typed (a combobox query, an edited cell), so redact it before it leaves the page.

## Breaking changes

None.

## Fixes

<!-- One bullet per fix: **What was wrong.** What it does now. -->

- **A `Dialog`, a `Popover` or the DataGrid's bottom sheet could flash scrollbars as it opened.** The entrance scales or slides the layer, and while a transform runs the layer is the containing block of every `position: fixed` element inside it, so a password manager's badge on a text field was placed relative to the dialog rather than the viewport and its `overflow: auto` scrolled to it until the transform settled. The layer now keeps `overflow: hidden` until its entrance has finished and goes back to it as its exit starts, so nothing inside it can scroll while it moves. Content too tall for the layer still scrolls once it is open.
