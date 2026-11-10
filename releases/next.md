# Box Kite next

_Unreleased. A PR that changes what a consumer sees adds its section here — see CONTRIBUTING.md, "Release notes"._

<!-- Intro: one or two sentences on what this release is about. The first one becomes the CHANGELOG line. -->

## Highlights

<!-- One bullet per section below, linking to it: **[Heading](#heading)** — one line on why it matters. -->

<!-- One `##` per change, above Breaking changes: a sentence for the heading, a paragraph on what and why, an example if it helps. -->

## A menu inside a React Flow node no longer deletes the node

A layer in the top layer still sits inside its node in the DOM, so its presses, wheels and keys bubble to the canvas: Backspace on a menu item deleted the selected node, an arrow key moved it, and Safari took the Backspace as Back. `<LayerScope>` (from `@box-kite/react/a11y`) wraps a surface that owns the gestures once, and every layer inside it — `Overlay`, `Popover`, `Menu`, `Dialog`, `Tooltip`, `Dropdown`, `Combobox`, the date pickers and the DataGrid menus — carries the surface's opt-out classes. `isolate` keeps chosen events inside each layer after the layer has handled them: a React handler on any ancestor and a listener on `document` never see them, and a Backspace nothing editable consumed is cancelled.

```tsx
import { LayerScope } from '@box-kite/react/a11y';

<LayerScope className="nodrag nowheel nokey" isolate={['key']}>
  <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} />
</LayerScope>;
```

See [Menus and popovers inside a node](https://www.box-kite.dev/diagrams/#layers).

## Breaking changes

None.

## Fixes

<!-- One bullet per fix: **What was wrong.** What it does now. -->
