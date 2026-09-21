# Where this library stands

Three tables that used to be three pages on the docs site, kept here instead.

They were removed from [box-kite.dev](https://www.box-kite.dev/) on purpose. A documentation site that
argues with other libraries is a site about those libraries, and a reader who arrived to find out what
this one does has to read past the argument to get there. The numbers are still worth having — they say
where the gaps are and which of them are closing — so they are a development instrument now, printed in
a terminal for whoever is building the thing.

```sh
npm run compare            # all three
npm run compare:tailwind   # utility-family coverage
npm run compare:radix      # accessible-pattern coverage, and what the patterns weigh
npm run compare:grid       # data grid features, and what they cost elsewhere
```

## What keeps them true

Each table has a test beside it that `npm test` runs, and the tests hold the data to the library rather
than to itself:

| File                     | What its test refuses to let happen                                                                     |
| ------------------------ | ------------------------------------------------------------------------------------------------------- |
| `tailwindParity.ts`      | A prop in the registry that no row names, or a row naming a prop that does not exist.                   |
| `radixComparison.ts`     | A pattern whose demo route the site no longer serves, or a claim about this library's own column that its generated reference does not support. |
| `gridComparison.ts`      | A feature row missing a cell for a tier, or a figure with no date on it.                                |

So a prop added and not mapped fails the suite, and a page deleted from the site fails it too. `npm run
compare` also runs in CI, which only proves the report still prints — the tests are what prove it is
right.

## Keeping the figures honest

The bytes in `radixComparison.ts` come from `node dev/published-size.mjs`, which is in this repository,
so they can be re-derived rather than believed. The prices in `gridComparison.ts` were read off each
vendor's own pricing page on the date the file carries. Both dates are asserted, not decorative: a figure
with no date is a figure that was true once.

Re-measuring means installing the other libraries, which is why their versions are pinned in
`devDependencies` and the date is written down beside the numbers.

## The grid adapters

`grids/` holds the benchmark adapters for the other data grids — one file each, exporting the component
plus the two gestures a scenario needs (which element scrolls, and how that library sorts from its own
header). They are wired into `pages/benchmark/impls.ts` only outside a production build, so
`npm run dev` offers the four-way picker and the published site measures this grid alone.

```sh
npm run dev                # the picker, with all four
npm run build:pages        # the published site: Box Kite only
```
