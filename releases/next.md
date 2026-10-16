# Box Kite next

_Unreleased. A PR that changes what a consumer sees adds its section here — see CONTRIBUTING.md, "Release notes"._

<!-- Intro: one or two sentences on what this release is about. The first one becomes the CHANGELOG line. -->

## Highlights

<!-- One bullet per section below, linking to it: **[Heading](#heading)** — one line on why it matters. -->

- **[A design can stop at the edge of a subtree](#a-design-can-stop-at-the-edge-of-a-subtree)** — two designs on one page, one stylesheet.
- **[A list of things to read and pick from](#a-list-of-things-to-read-and-pick-from-list)** — rows of media, text and a value, one action covering each item, rendered on a server.
- **[A list item can be swiped, a list put in order, and a long list windowed](#a-list-item-can-be-swiped-a-list-put-in-order-and-a-long-list-windowed)** — swipe actions, drag to reorder with a keyboard grab, and a measured window for ten thousand items.
- **[On a phone, a DataGrid is a list](#on-a-phone-a-datagrid-is-a-list)** — a list item per row, the row in a sheet, sort and filters in sheets.
- **[Every block has a page of its own](#every-block-has-a-page-of-its-own)** — the block running in light and dark, every file it writes, and a link from `get_blocks`.
- **[A store to start from](#a-store-to-start-from)** — four linked pages and eight blocks of one design, each installed with one command.

<!-- One `##` per change, above Breaking changes: a sentence for the heading, a paragraph on what and why, an example if it helps. -->

## A design can stop at the edge of a subtree

`Box.components()` styles the whole app: every call merges into one registry, so two designs could never share a page. `Box.createComponents()` takes the same shape and registers nothing. It returns a design, and `<Box.Components value>`, or the new `components` prop on `Box.Theme`, applies it to every Box inside, the pre-built components included. Props still beat the design. A white-label app with a design per tenant, a redesign landing one screen at a time, a page of templates that each look different: one stylesheet, and each design ends where its subtree does.

```tsx
const pill = Box.createComponents({ button: { styles: { borderRadius: 999 } } });

<Box.Theme use="local" components={pill}>
  <Button>Pill, in light and dark</Button>
</Box.Theme>;
```

A design merges over the app's own `Box.components()` unless `base: 'builtin'` says otherwise, and `MergeComponentsAndVariants` types two designs that both name a component. See [Box.createComponents()](https://www.box-kite.dev/box-functions/#createcomponents).

## Every block has a page of its own

The three registry blocks each have a page at [box-kite.dev/blocks](https://www.box-kite.dev/blocks/): the block running in light and dark side by side, the install command, every file it writes, and a full-screen demo. `get_blocks` in `@box-kite/mcp` now links a block's page beside its install command. The dashboard shell block takes a `theme` prop, the theme to open in, for a page that shows it in a fixed one.

```tsx
<DashboardShell title="Overview" theme="dark">
  <DashboardStats />
</DashboardShell>
```

## A store to start from

Four complete pages of one design are at [box-kite.dev/templates](https://www.box-kite.dev/templates/): a storefront, a product page, a cart and a checkout, linked to each other, in light and dark, with every product picture a lucide icon on a tile in the product's colour, so swapping in your photographs means replacing one component. Their eight sections are blocks of their own, among them a [credit card form](https://www.box-kite.dev/blocks/react-credit-card-form/), a [product grid with filters](https://www.box-kite.dev/blocks/react-product-grid/) and an [order summary](https://www.box-kite.dev/blocks/react-order-summary/). The design is one `Box.createComponents()` registry, so it stops at the edge of the store. A template installs with its design and its blocks in one command:

```bash
npx shadcn@latest add https://www.box-kite.dev/r/checkout-page.json
```

## A list of things to read and pick from: `<List>`

Messages, orders, people, settings: most screens are a list of things of one kind, and until now each one was a `<Ul>` and some flexbox written again. `<List>` is that list. An item is a row of three slots: an icon, an avatar or a thumbnail at the start, the text taking the room, and a value at the end. The text is a column of rows, so the title and its time share a line and a quieter `secondary` row sits under them. A row can `wrap` instead of squeezing, a title or a description stops after `lines={1|2|3}`, and `List.Fields` lays out labelled values two to a line on a phone.

```tsx
<List>
  <List.Item chevron>
    <List.Media variant="avatar">AL</List.Media>
    <List.Content>
      <List.Row>
        <List.Title lines={1}>
          <List.Action props={{ href: '/inbox/42' }}>Ada Lovelace</List.Action>
        </List.Title>
        <List.Meta>9:41</List.Meta>
      </List.Row>
      <List.Description lines={2}>The engine might compose elaborate pieces of music.</List.Description>
    </List.Content>
  </List.Item>
</List>
```

`List.Action` covers the whole item, so a press anywhere on it follows the link, while a screen reader hears only the title. Given an `htmlFor`, the action is a checkbox's label, and the list becomes a pick-list. A switch or a menu goes in `List.Actions`, above it. There are four looks (divided, `plain`, `card` and `separated`), three item sizes, and groups whose labels can stick to the top as their items scroll. The list renders on a server with no JavaScript, and in any theme, since its lines and tints are mixed from the text colour. It adds 2.2 KB gzipped on top of Box. See [List](https://www.box-kite.dev/list/).

## On a phone, a DataGrid is a list

A table does not fit a phone, and shrinking one only makes it unreadable. Below 576px of **its own width** the DataGrid now draws each row as a list item: a title with one value opposite it, a line above or under it, and a few labelled values. Pressing an item opens the whole row in a bottom sheet, one row at a time, with a pager you can also swipe. Sort and filters move into sheets behind two buttons, and the filters in force sit under the search as removable chips. Selecting is a mode, with a bar pinned to the bottom of the screen. The list grows twenty items per **Show more**, or pages when you paginate. It is the same grid with the same rows, filters, sort, grouping, tree, selection and edits, and an editable column is edited from the row's sheet through the same `onCellEdit`.

```tsx
columns: [
  { key: 'customer', header: 'Customer', list: 'title' },
  { key: 'id', header: 'Order', list: 'kicker' },
  { key: 'total', header: 'Total', align: 'end', list: 'end' },
  { key: 'status', header: 'Status' }, // a labelled field
  { key: 'notes', header: 'Notes', list: 'detail' }, // only in the row's sheet
],
```

A column with no `list` role still lands somewhere sensible: the first column is the title, the first end-aligned one sits opposite it, the next four are fields and the rest wait for the row's sheet. The markup is a `<ul>` with a `<dl>` per item, so every value keeps its label for a screen reader. The sheets and the row view are a separate chunk, 7.8 KB gzipped, fetched only when a grid is narrow.

**A grid that is narrower than 576px today will draw a list after this update.** That includes a grid in a sidebar or a dashboard widget on a wide screen, because the switch follows the grid's own width, not the screen's. To keep the table there, set `def.layout: 'table'`. `def.list.breakpoint` moves the switch. Each row is a [`List.Item`](https://www.box-kite.dev/list/), so a `Box.components({ list: … })` of yours styles the grid's rows too. See [On a phone, a list](https://www.box-kite.dev/datagrid/#mobile).

## A list item can be swiped, a list put in order, and a long list windowed

Three components finish what `<List>` started, each its own client-only entry so `List` itself still renders on a server.

**`<SwipeItem>`** is a `List.Item` whose row slides aside to show the commands under it, the way Mail's archive and delete work. `startActions` and `endActions` hold `SwipeItem.Action` buttons; past half open a tray opens, short of it it closes, and a flick goes the way it was going. With `fullSwipe`, carrying it most of the way across performs the outermost action. A press on an open item closes it rather than following its link, and the whole thing mirrors in a right-to-left page.

```tsx
<SwipeItem
  fullSwipe
  endActions={
    <SwipeItem.Action variant="danger" onClick={() => remove(id)}>
      Delete
    </SwipeItem.Action>
  }
>
  <List.Content>
    <List.Title>
      <List.Action props={{ href: `/inbox/${id}` }}>Ada Lovelace</List.Action>
    </List.Title>
  </List.Content>
</SwipeItem>
```

The actions are real buttons in the tab order, and focus reaching one opens its tray, so a keyboard and a screen reader find them without swiping. A swipe is still a shortcut: put the same commands somewhere a press reaches too.

**`<SortableList>`** is a `List` whose items are dragged by a `SortableList.Handle`. The app owns the order: `onOrderChange` reports it as the items' `value`s and the list draws whatever order it is given, so a refused move is simply not applied. During a drag the item follows the pointer and its neighbours step aside; the order changes once, on the drop, which glides into place, and the list scrolls when the drag nears its edge. The keyboard gets DashboardGrid's grab: Enter or Space picks an item up, the arrows move it, Enter drops it and Escape puts it back, each step announced. A press on a handle that does not drag picks the item up too, and a press on another item then drops it there, which is a way to reorder for a pointer that cannot drag.

```tsx
<SortableList onOrderChange={(order) => setIds(order)} onOrderCommit={save}>
  {ids.map((id) => (
    <SortableList.Item key={id} value={id} label={names[id]}>
      <List.Content>
        <List.Title>{names[id]}</List.Title>
      </List.Content>
      <SortableList.Handle />
    </SortableList.Item>
  ))}
</SortableList>
```

**`<VirtualList>`** draws a window of a list too long to render whole. Each item drawn is measured and kept by its `itemKey`, so one-line and three-line items mix, and an item not drawn yet counts as the mean of those that have been (`estimateSize` before any has). While the list scrolls its height holds still, so a dragged scrollbar thumb stays under the pointer, and what it measured meanwhile lands once the scroll stops. The scroller is found rather than declared: the nearest ancestor that scrolls, or the page. Each item carries `aria-setsize` and `aria-posinset`, the item focus is in stays rendered, and `onRangeChange` is where an endless list fetches its next page.

```tsx
<VirtualList items={messages} itemKey={(message) => message.id}>
  {(message) => (
    <List.Item>
      <List.Content>
        <List.Title lines={1}>{message.subject}</List.Title>
      </List.Content>
    </List.Item>
  )}
</VirtualList>
```

`List.Chevron` is new too: the chevron `chevron` ends an item with, for an item something else draws. On top of Box, and counting the `List` each one draws, `SwipeItem` is 5.4 KB gzipped, `SortableList` 5.7 KB and `VirtualList` 4.5 KB. See [Swipe actions, reorder and long lists](https://www.box-kite.dev/list/#swipe).

## Breaking changes

None.

## Fixes

<!-- One bullet per fix: **What was wrong.** What it does now. -->

- **A component built on another with `extends` was unstyled until the app called `Box.components()`, and missed a later override of its base.** The built-in `gauge` (`extends: 'progressRing'`) rendered without its ring paint in an app that registered nothing. `extends` is now resolved over everything registered, chains included, every time the registry changes.
- **A prop you wrote lost to a component's dark-theme default.** `<Button bgColor="red-500">` stayed indigo in dark mode: the button's own `theme.dark.bgColor` survived the merge, and a theme rule outranks a plain class. A prop now replaces the component's value for that prop in every theme, at the level you wrote it (`bgColor` clears `theme.*.bgColor`, and `hover.bgColor` clears the themed hover), while everything you did not mention keeps its dark styling. If you relied on the old result, write the dark value yourself: `theme={{ dark: { bgColor: 'indigo-500' } }}`.
- **Two settings forms on one page labelled each other's slider.** The settings form block gave its density caption a fixed `id`, so a second copy pointed its slider at the first one's caption. The id now comes from `useId`. Run `npx shadcn@latest add https://www.box-kite.dev/r/settings-form.json` again to take the fix.
- **A prop or variant that set a gradient's colours added them to the component's instead of replacing them.** A component whose styles carried `bgGradient={{ linear: 'r', colors: ['orange-700', 'rose-700'] }}` and a variant naming two colours of its own rendered all four stops, so a secondary button wore the primary's gradient; `scrollbarColor` pairs and `maskImage` stops did the same. An array is now one value, and the later one replaces it.
- **Opening a DataGrid row's detail panel made the horizontal scrollbar blink.** The panel takes the width of the grid's visible area, and when opening it gave the grid a vertical scrollbar, that width shrank — and the panel slid to it over a quarter of a second, the transition every Box carries. Each frame of the slide the panel was a pixel wider than the area, so the grid showed a horizontal scrollbar, and a grid inside the panel resized frame by frame and flashed its own. The panel and its row now take their size at once.
