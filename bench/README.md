# The grid benchmark

A hundred thousand rows by twenty columns, through five operations: first render, a two-second fling, a
column filter, a sort and a grouping with totals. What it measures and what it deliberately leaves out is
written on the page itself — [box-kite.dev/benchmark](https://www.box-kite.dev/benchmark/).

**The page is the benchmark.** Everything that decides what is timed lives in `pages/benchmark/`, and the
page exposes it as `window.boxKiteBench.run({ rows, runs })`. `run.mjs` only presses that button in
headless Chrome and writes the answer down, so a rerun in CI measures exactly the code a reader measures
when they press Run themselves.

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

To refresh them, read the numbers off a CI run of this workflow and leave roughly 3× the headroom.
`results.json` is a different thing and is never written by `--check`: it is one named machine's
measurement, for scale.
