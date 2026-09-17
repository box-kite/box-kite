# The grid benchmark

A hundred thousand rows by twenty columns, through five operations: first render, a two-second fling, a
column filter, a sort and a grouping with totals. What it measures and what it deliberately leaves out is
written on the page itself — [box-kite.dev/benchmark](https://www.box-kite.dev/benchmark/).

**The page is the benchmark.** Everything that decides what is timed lives in `pages/benchmark/`, and the
page exposes it as `window.boxKiteBench.run({ rows, runs, impls })`. `run.mjs` only presses that button in
headless Chrome and writes the answer down, so a rerun in CI measures exactly the code a reader measures
when they press Run themselves.

**Four grids, one set of scenarios.** `impls.ts` is the registry: Box Kite, AG Grid Community, the free MUI
X Data Grid and TanStack Table with the UI written by hand (`pages/benchmark/*Grid.tsx`, one file each, each
exporting the component plus the two gestures a scenario needs — which element scrolls, and how that library
sorts from its own header). A library is fetched only when it is picked, so the page costs a reader nothing
until they tick a box. Where a free tier cannot run a scenario at all the registry says so and the grid is
never driven through it: AG Grid and MUI X put row grouping behind Enterprise and Premium, and the free MUI
grid forces pagination at a hundred rows a page, so it has no hundred thousand rows to fling.

## Running it

```sh
npm run build:pages          # the benchmark measures the production build, never the dev server
npm run bench -- --runs 5
```

That serves `dist-pages`, drives `/benchmark/` in headless Chrome and writes `results.json` — the file the
page prints under **What it measured here**. Name the machine while you are at it, or the numbers mean
nothing to whoever reads them:

```sh
BENCH_MACHINE="Windows 11 laptop, 12-core AMD Ryzen" npm run bench -- --runs 5
```

| Flag               | Default  | What it does                                                            |
| ------------------ | -------- | ----------------------------------------------------------------------- |
| `--runs <n>`       | `5`      | How many times each operation is measured. The table prints the median. |
| `--rows <n>`       | `100000` | How many rows to generate.                                              |
| `--impls <ids>`    | `box-kite` | Comma-separated, from `pages/benchmark/impls.ts`: `box-kite`, `ag-grid`, `mui-x`, `tanstack`. |
| `--url <address>`  | —        | Measure a server you are already running instead of starting one.       |
| `--machine <name>` | —        | What to record as the machine. `BENCH_MACHINE` does the same.           |
| `--check`          | off      | Compare against `budgets.json` and exit non-zero on a breach.           |

Chrome is found at the usual places for the platform; `CHROME_PATH` overrides it. No browser is installed
as a dependency, for the reason a benchmark should not ship one.

## The budgets

`budgets.json` is what `--check` measures against, and `.github/workflows/bench.yml` runs it on every pull
request that touches the grid, the engine or this directory. They are **sized for a shared CI runner**,
which is several times slower than any laptop and noisy with it: they catch a change that makes the grid an
order of magnitude slower, and nothing finer. Anything tighter would fail on the runner having a bad
afternoon.

To refresh them, read the numbers off a few CI runs of this workflow and take **two and a half times the
slowest**. One run is not enough: two runs of the same commit measured 78 ms and 196 ms to mount, and a
16.7 ms and a 33.2 ms median frame — a runner varies by a factor of two and a half on its own, which is
the whole reason these budgets are not the tight ones a laptop would suggest. A runner is vsync-capped at
60 fps, so a grid keeping up reports a 16.7 ms frame exactly.

`results.json` is a different thing and is never written by `--check`: it is one named machine's
measurement, for scale. Only a grid that has a budget is checked, so adding `--impls` to a command never
fails it — what another library does on a shared runner is not this repository's regression to catch.

## Two things that decide whether a number means anything

**A quiet machine.** The same commit, same build, measured twice: 309 ms to mount with a few Chromes and a
dev server left running, 87 ms with nothing else on the machine. Close everything, and check for orphaned
headless Chromes before believing a comparison.

**A frame interval is quantized and the work is not.** The scroll reports both. Frames arrive on the
display's clock, so a grid needing 9 ms on a 130 Hz screen misses the 7.7 ms interval, waits for the next
one and reports 15 ms — twice the number of a grid that needed 7 ms, for a two-millisecond difference. The
`workMs` beside it is that frame's own cost, measured from the frame callback to the task after its paint,
and it is the figure to compare between libraries.
