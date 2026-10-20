# Delete your z-index scale

_20 October 2026 · Use case_

A menu cut off by its card or buried under a sticky header is a stacking bug the browser can now fix for you, with no portal and no z-index scale. Here is the fix, what we measured in Chrome, and where it still falls short.

## The problem

Your card has `overflow: hidden`, so its menu is clipped at the edge. You make the menu `position: fixed`, and then the card gets a hover `transform`, which makes the card the menu's containing block again. The page's sticky header covers it, and `z-index: 9999` does nothing, because the transform created a stacking context the 9999 can't leave.

The [CSS issue asking for a way out of `overflow: hidden`](https://github.com/w3c/csswg-drafts/issues/4092) has been open since 2019. Most React apps settled on a portal to `<body>` plus a scale:

```css
:root {
  --z-dropdown: 1000;
  --z-modal: 1050;
  --z-popover: 1070;
  --z-tooltip: 1080;
  --z-toast: 1090;
}
```

The portal works, but the layer leaves the subtree it was declared in:

- A dark section's theme, a custom property or a `dir` stops reaching it.
- Tab from the trigger skips the layer, which now sits at the end of `<body>`.
- A dropdown inside a popover is portalled out of it, so picking an option counts as a press outside and closes the popover.
- React events still bubble through the React tree, which [React's own issue](https://github.com/react/react/issues/11387) has tracked since 2017.

## The fix: the top layer and anchor positioning

An element with the `popover` attribute is shown in the browser's **top layer**. It paints above every stacking context, ignores every ancestor's `overflow`, and isn't positioned by a transformed ancestor. `z-index` doesn't apply there: the last layer opened is on top. **Anchor positioning** then places it beside its trigger in CSS and flips it when there's no room.

The important part is that the layer **stays where you declared it in the DOM**, so every portal cost above disappears. Support: the Popover API is in Chrome 114, Firefox 125 and Safari 17. Anchor positioning is in Chrome 125, Firefox 147 and Safari 26.

In Box Kite that is `<Popover>`. The card below clips its content, and a sibling sits on top of it with `z-index: 9999`:

![The Filters panel opens past the card's clipped edge and paints over a sibling with z-index 9999.](https://www.box-kite.dev/img/blog/delete-your-z-index-scale/filter-card.png)

```tsx
import Box from '@box-kite/react';
import Button from '@box-kite/react/components/button';
import Checkbox from '@box-kite/react/components/checkbox';
import Flex from '@box-kite/react/components/flex';
import Popover from '@box-kite/react/components/popover';

export function FilterCard() {
  return (
    <Box>
      <Box overflow="hidden" translateY={-1} p={4} b={1} borderColor="base-300" borderRadius={3}>
        <Popover label="Filters" align="start" trigger={(trigger) => <Button {...trigger}>Filters</Button>}>
          <Flex d="column" gap={2}>
            <Checkbox label="Only mine" />
            <Checkbox label="Has attachments" />
          </Flex>
        </Popover>
      </Box>
      <Box position="relative" css={{ zIndex: 9999 }} mt={2} p={3} borderRadius={2} bgColor="red-500" color="white" textAlign="end">
        A sibling with z-index: 9999
      </Box>
    </Box>
  );
}
```

No portal, no `z-index`. The panel is a named `role="dialog"`, and the trigger carries `aria-expanded` and `aria-controls`. Focus moves into the panel, Escape closes it and returns focus to the trigger, and a press outside closes it too.

## Every layer works this way

`Tooltip`, `Menu`, the `Dropdown` popup, `Dialog`, the toasts, the date pickers and the DataGrid's column menu are all in the top layer, and none of them is portalled. Here they are in a dark, clipped, transformed toolbar on a light page, with the dropdown open inside the Filters popover:

![A dark toolbar with a Filters popover open and an Owner dropdown open inside it, both escaping the clipped toolbar.](https://www.box-kite.dev/img/blog/delete-your-z-index-scale/toolbar.png)

```tsx
import Box from '@box-kite/react';
import Button from '@box-kite/react/components/button';
import Dropdown from '@box-kite/react/components/dropdown';
import Flex from '@box-kite/react/components/flex';
import Menu from '@box-kite/react/components/menu';
import Popover from '@box-kite/react/components/popover';
import Tooltip from '@box-kite/react/components/tooltip';

export function Toolbar() {
  return (
    <Box.Theme use="local" theme="dark">
      <Flex gap={2} p={4} borderRadius={3} overflow="hidden" translateY={-1} bgColor="slate-900">
        <Popover label="Filters" align="start" trigger={(trigger) => <Button {...trigger}>Filters</Button>}>
          <Dropdown label="Owner" defaultValue="ada">
            <Dropdown.Item value="ada">Ada</Dropdown.Item>
            <Dropdown.Item value="grace">Grace</Dropdown.Item>
          </Dropdown>
        </Popover>
        <Tooltip content="Deletes the row for good">{(trigger) => <Button {...trigger}>Delete</Button>}</Tooltip>
        <Menu trigger={(trigger) => <Button {...trigger}>Actions</Button>}>
          <Menu.Item>Duplicate</Menu.Item>
          <Menu.Item>Archive</Menu.Item>
        </Menu>
      </Flex>
    </Box.Theme>
  );
}
```

The panels are dark because they inherit the section's theme; nothing was copied across. Picking an owner leaves the Filters panel open, because the dropdown's list is still a DOM child of the panel.

## Writing your own layer

The same thing by hand is a handful of props. One line is a trap: the browser hides a closed popover with a rule any author `display` outranks, and every Box sets `display`. Without `not={{ open: { display: 'none' } }}`, the closed panel stays on the page.

```tsx
import Box from '@box-kite/react';
import Button from '@box-kite/react/components/button';

export function RowActions() {
  return (
    <>
      <Button anchorName="row-actions" props={{ popoverTarget: 'row-actions-panel' }}>
        Actions
      </Button>
      <Box
        id="row-actions-panel"
        position="fixed"
        positionAnchor="row-actions"
        positionArea="block-end span-inline-end"
        positionTryFallbacks="flip-block"
        mt={2}
        p={4}
        not={{ open: { display: 'none' } }}
        props={{ popover: 'auto' }}
      >
        Anything at all
      </Box>
    </>
  );
}
```

That gives you the paint, the placement and light dismiss, but no role, name or focus handling. [`Overlay`](https://www.box-kite.dev/overlay) and [`useAnchorPosition`](https://www.box-kite.dev/anchor) cover the placement for a layer that isn't one of the patterns above.

## The honest limits

All measured in Chrome 155:

- **On top means on top of everything.** Once its trigger scrolls under a sticky header, an open panel still paints above the header.
- **An open layer doesn't re-flip on scroll.** Chrome never re-runs `position-try-fallbacks` for a top-layer element. A panel opened below its trigger stayed below as we scrolled, and ran off the bottom of the window. Reopening it picks the right side.
- **A toast fired from inside a modal lands under it.** It's dimmed, can't be pressed or focused, and is missing from the accessibility tree. Part of that is the platform: everything outside an open modal is inert, [even a popover above it](https://github.com/whatwg/html/issues/9936). We found this writing the article, and the fix is on the roadmap. Until then, show the result inside the dialog, or toast after it closes.
- **Older browsers get the old trade-offs.** Without anchor positioning the layer is placed by measuring in JavaScript. Without the Popover API it falls back to a portal.
- **Never declare a layer inside its trigger.** A menu inside a `<button>` can't be reached with the keyboard. Put it beside the trigger.

## Try it

- [Popover](https://www.box-kite.dev/popover), [Menu](https://www.box-kite.dev/menu) and [Dialog](https://www.box-kite.dev/dialog): the patterns and their keyboard maps.
- [Anchor positioning](https://www.box-kite.dev/anchor): the props and the hook.
- `npm install @box-kite/react`, then delete one portal and one `z-index` and see what still needs them.
