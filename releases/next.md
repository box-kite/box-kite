# Box Kite next

_Unreleased. A PR that changes what a consumer sees adds its section here — see CONTRIBUTING.md, "Release notes"._

<!-- Intro: one or two sentences on what this release is about. The first one becomes the CHANGELOG line. -->

## Highlights

<!-- One bullet per section below, linking to it: **[Heading](#heading)** — one line on why it matters. -->

- **[A design can stop at the edge of a subtree](#a-design-can-stop-at-the-edge-of-a-subtree)** — two designs on one page, one stylesheet.
- **[A list of things to read and pick from](#a-list-of-things-to-read-and-pick-from-list)** — rows of media, text and a value, one action covering each item, rendered on a server.
- **[On a phone, a DataGrid is a list](#on-a-phone-a-datagrid-is-a-list)** — a list item per row, the row in a sheet, sort and filters in sheets.
- **[Every block has a page of its own](#every-block-has-a-page-of-its-own)** — the block running in light and dark, every file it writes, and a link from `get_blocks`.

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

## Breaking changes

None.

## Fixes

<!-- One bullet per fix: **What was wrong.** What it does now. -->

- **A component built on another with `extends` was unstyled until the app called `Box.components()`, and missed a later override of its base.** The built-in `gauge` (`extends: 'progressRing'`) rendered without its ring paint in an app that registered nothing. `extends` is now resolved over everything registered, chains included, every time the registry changes.
- **A prop you wrote lost to a component's dark-theme default.** `<Button bgColor="red-500">` stayed indigo in dark mode: the button's own `theme.dark.bgColor` survived the merge, and a theme rule outranks a plain class. A prop now replaces the component's value for that prop in every theme, at the level you wrote it (`bgColor` clears `theme.*.bgColor`, and `hover.bgColor` clears the themed hover), while everything you did not mention keeps its dark styling. If you relied on the old result, write the dark value yourself: `theme={{ dark: { bgColor: 'indigo-500' } }}`.
- **Two settings forms on one page labelled each other's slider.** The settings form block gave its density caption a fixed `id`, so a second copy pointed its slider at the first one's caption. The id now comes from `useId`. Run `npx shadcn@latest add https://www.box-kite.dev/r/settings-form.json` again to take the fix.
