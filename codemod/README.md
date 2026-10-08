# @box-kite/codemod

Moves an app built on Radix primitives — directly, through the `radix-ui` package, or through a shadcn/ui
`components/ui` folder — onto [Box Kite](https://www.box-kite.dev). One command rewrites the call sites,
leaves a `TODO(radix-to-box)` comment wherever the two libraries mean different things, and writes a report
of both.

```bash
npx @box-kite/codemod radix-to-box src
```

Commit first: it writes to the files it is given. Node 22 or newer.

## What it reads

- `@radix-ui/react-*` — `import * as Dialog from '@radix-ui/react-dialog'`, or the named parts
- `radix-ui` — `import { Dialog } from 'radix-ui'`
- a shadcn wrapper module — anything imported from a path ending `ui/<name>`, such as
  `@/components/ui/dialog`: its exports are the parts under the family's prefix, so `DialogContent` is
  `Content`
- `sonner` and shadcn's `ui/sonner` — `toast()` and `<Toaster>`

The shadcn wrapper files themselves are left alone. Their call sites are what get converted, and the report
says which wrappers nothing imports any more, so you can delete them.

## What it writes

- **The converted files.** Imports from `@box-kite/react/components/*` are added and the Radix ones nothing
  uses any more are removed, in the quote and semicolon style the file already has. If your project has
  prettier, the changed files go through it.
- **A `TODO(radix-to-box)` comment** inside the tag of every element it could not convert or could only
  convert in part, saying why. An element left on Radix keeps its import, so the file still runs.
- **`.migration/`** — `README.md` with the totals, a row per family and every TODO with its line, and one file
  per family listing each element and what became of it.

A file whose rewrite would not parse is not written; the report says which. Running it twice changes nothing
the second time.

| Option           | What it does                                             |
| ---------------- | -------------------------------------------------------- |
| `--dry`          | Report what would change, write nothing                  |
| `--report <dir>` | Where the report goes (default `.migration`)             |
| `--no-report`    | Write no report                                          |
| `--no-format`    | Do not run the project's prettier over the changed files |

## How well it does

Measured on shadcn/ui's own examples for the fifteen families below — 23 files written by somebody else,
kept in this repository as the test corpus: **168 of 178 Radix elements convert with no TODO (94%)**, and 19
of the 23 files need nothing more. Every converted file without a TODO type-checks against Box Kite's real
component types; that check runs in the library's test suite.

What is left in that corpus is what should be left: a group label in a select (Box Kite's `Dropdown` has no
option groups), a collapsible whose trigger sits inside a header beside other markup, and a spread of props
whose contents a codemod cannot see.

## The mapping

The shape that changes most is the trigger. Radix composes it with `asChild`; Box Kite hands it a render prop,
so the trigger's ref and attributes are spread onto your own element:

```tsx
// before
<Dialog.Root>
  <Dialog.Trigger asChild>
    <Button>Rename</Button>
  </Dialog.Trigger>
  <Dialog.Portal>
    <Dialog.Overlay />
    <Dialog.Content>
      <Dialog.Title>Rename the view</Dialog.Title>
      <Dialog.Close asChild><Button>Cancel</Button></Dialog.Close>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>

// after
<Dialog trigger={(t) => <Button ref={t.ref} {...t.props}>Rename</Button>}>
  <Dialog.Title>Rename the view</Dialog.Title>
  <form method="dialog"><Button type="submit">Cancel</Button></form>
</Dialog>
```

A handler your element already has (`onClick`, `onFocus`) is composed with the trigger's rather than lost,
and a Box Kite component as the trigger receives the attributes through its `props`. There is no portal and
no overlay: every layer is in the browser's top layer where it is declared, and a dialog's backdrop is its
own `::backdrop`.

| Radix                    | Box Kite                                     | Notes                                                                                                                                                        |
| ------------------------ | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Tooltip.*`              | `Tooltip` (`components/tooltip`)             | The content becomes `content`, the trigger the children. `delayDuration` is `openDelay`; the provider goes. Radix's default `side="top"` is written out.     |
| `Popover.*`              | `Popover` (`components/popover`)             | `onOpenAutoFocus={(e) => e.preventDefault()}` is `autoFocus={false}`. `Popover.Close` and `Popover.Anchor` are TODOs.                                        |
| `Dialog.*`               | `Dialog` (`components/dialog`)               | A close is a submit in `<form method="dialog">`, or `formMethod="dialog"` inside a form of yours. A press-outside `preventDefault` is `dismissible={false}`. |
| `AlertDialog.*`          | `AlertDialog` (`components/dialog`)          | Action and Cancel close the same way. shadcn's styled buttons stay your `ui/button`, Cancel as `variant="outline"`.                                          |
| `DropdownMenu.*`         | `Menu` (`components/menu`)                   | A label names the group after it — or the items after it, up to the next separator. A submenu's trigger is `Menu.Sub`'s `label`.                             |
| `Select.*`               | `Dropdown` (`components/dropdown`)           | The trigger's attributes are the Dropdown's; the placeholder is `Dropdown.Unselect`. Groups are flattened; their labels are TODOs.                           |
| `Tabs.*`                 | `Tabs` (`components/tabs`)                   | `Trigger` is `Tabs.Tab`, `Content` is `Tabs.Panel`, the list's `aria-label` is its `label`, `activationMode` is `activation`.                                |
| `Accordion.*`            | `Accordion` (`components/accordion`)         | A single accordion's string value is a one-item list: `value={v ? [v] : []}`, `onValueChange={([v = '']) => …}`. The header goes.                            |
| `Collapsible.*`          | `Collapsible` (`components/accordion`)       | Only when the trigger and the content are the root's own children — Box Kite renders the two itself.                                                         |
| `Checkbox.*`, `Switch.*` | `Checkbox`, `Switch`                         | Real inputs: `onCheckedChange={(checked) => …}` is `onChange={({ target: { checked } }) => …}`; `checked="indeterminate"` is `indeterminate`.                |
| `RadioGroup.*`           | `RadioGroup` (`components/radioGroup`)       | `Item` is `RadioGroup.Item`; its `id` lands on the input, so a `<label htmlFor>` keeps working.                                                              |
| `Slider.*`               | `Slider` (`components/slider`)               | One thumb is a number, not `[n]`, handlers included; two are a range, with `thumbLabels` from the thumbs' `aria-label`s.                                     |
| `Progress.*`             | `Progress` (`components/progress`)           | The indicator goes — the bar draws itself.                                                                                                                   |
| `Toast.*`                | `Toaster` + `toast()` (`components/toaster`) | The viewport is `<Toaster />`. A declarative toast is a TODO: here a toast is a call, made where the thing happens.                                          |
| `sonner`                 | `Toaster` + `toast()` (`components/toaster`) | The same surface. `toast.promise(fn, …)` calls `fn`, its options move to the third argument; a position like `top-right` is `top-end`.                       |

Placement maps across every floating part: `side` `left`/`right` are `start`/`end` (so the layer mirrors in a
right-to-left page), `sideOffset` in pixels is `offset` on the ÷4 spacing scale, `align` is unchanged, and
`avoidCollisions={false}` is `flip={false}`. Anything without a counterpart — `alignOffset`, the
`on…Outside` handlers, `onCloseAutoFocus` — is a TODO saying what to use instead.

HTML attributes Radix took at the top level (`aria-*`, `data-*`, a handler Box Kite does not declare) move
into the element's `props`, which is where Box Kite takes them. `className` and `style` stay where they are;
the report notes a `className` keyed on Radix's `data-state` attribute, which Box Kite does not set.

## What it does not do

It converts behaviour, not styling: Tailwind classes are carried across as they are, and how the components
look is Box Kite's default until you style them. It does not follow a component across files — a
`DialogContent` rendered by one file inside a `Dialog` from another is reported, not guessed at. And it
converts the fifteen families above; `ContextMenu`, `Menubar`, `NavigationMenu`, `HoverCard`, `Toolbar` and
the rest keep their Radix imports.
