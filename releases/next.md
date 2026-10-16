# Box Kite next

_Unreleased. A PR that changes what a consumer sees adds its section here — see CONTRIBUTING.md, "Release notes"._

<!-- Intro: one or two sentences on what this release is about. The first one becomes the CHANGELOG line. -->

## Highlights

<!-- One bullet per section below, linking to it: **[Heading](#heading)** — one line on why it matters. -->

- **[A design can stop at the edge of a subtree](#a-design-can-stop-at-the-edge-of-a-subtree)** — two designs on one page, one stylesheet.
- **[A list of things to read and pick from](#a-list-of-things-to-read-and-pick-from-list)** — rows of media, text and a value, one action covering each item, rendered on a server.
- **[Every block has a page of its own](#every-block-has-a-page-of-its-own)** — the block running in light and dark, every file it writes, and a link from `get_blocks`.

<!-- One `##` per change, above Breaking changes: a sentence for the heading, a paragraph on what and why, an example if it helps. -->

## A design can stop at the edge of a subtree

`Box.components()` styles the whole app: every call merges into one registry, so two designs could never share a page. `Box.createComponents()` takes the same shape and registers nothing. It returns a design, and `<Box.Components value>`, or the new `components` prop on `Box.Theme`, applies it to every Box inside, the pre-built components included. Props still beat the design. A white-label app with a design per tenant, a redesign landing one screen at a time, a page of templates that each look different: one stylesheet, and each design ends where its subtree does.

```tsx
const pill = Box.createComponents({ button: { styles: { borderRadius: 999 } } });

<Box.Theme use="local" components={pill}>
  <Button>Pill, in light and dark</Button>
</Box.Theme>
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

## Breaking changes

None.

## Fixes

<!-- One bullet per fix: **What was wrong.** What it does now. -->

- **A component built on another with `extends` was unstyled until the app called `Box.components()`, and missed a later override of its base.** The built-in `gauge` (`extends: 'progressRing'`) rendered without its ring paint in an app that registered nothing. `extends` is now resolved over everything registered, chains included, every time the registry changes.
- **A prop you wrote lost to a component's dark-theme default.** `<Button bgColor="red-500">` stayed indigo in dark mode: the button's own `theme.dark.bgColor` survived the merge, and a theme rule outranks a plain class. A prop now replaces the component's value for that prop in every theme, at the level you wrote it (`bgColor` clears `theme.*.bgColor`, and `hover.bgColor` clears the themed hover), while everything you did not mention keeps its dark styling. If you relied on the old result, write the dark value yourself: `theme={{ dark: { bgColor: 'indigo-500' } }}`.
- **Two settings forms on one page labelled each other's slider.** The settings form block gave its density caption a fixed `id`, so a second copy pointed its slider at the first one's caption. The id now comes from `useId`. Run `npx shadcn@latest add https://www.box-kite.dev/r/settings-form.json` again to take the fix.
