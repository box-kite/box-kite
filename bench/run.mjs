/**
 * Drives the benchmark page in headless Chrome and writes what it measured to `results.json`.
 *
 * The page is the benchmark: this only presses its button (`window.boxKiteBench.run`) and writes the
 * answer down, so a rerun in CI measures exactly the code a reader measures. Chrome is spawned directly
 * and driven over CDP — the repository carries no browser dependency, and a benchmark is the last place
 * to add one.
 *
 *   node bench/run.mjs                        # builds nothing; serves dist-pages and measures it
 *   node bench/run.mjs --runs 5 --rows 100000
 *   node bench/run.mjs --impls box-kite,ag-grid,mui-x,tanstack   # the comparison, in one go
 *   node bench/run.mjs --url http://localhost:4173/benchmark/
 *   node bench/run.mjs --check                # compare against budgets.json and fail on a breach
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import prettier from 'prettier';
import { evaluate, launchChrome, startPreview, wait } from '../scripts/headlessChrome.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const resultsPath = join(here, 'results.json');
const budgetsPath = join(here, 'budgets.json');

const options = parseArgs(process.argv.slice(2));

function parseArgs(argv) {
  // Box Kite alone by default, here and in CI: the other three are a comparison somebody asks for, and
  // four grids is four times the runner's time for three numbers no budget is set against.
  const parsed = { runs: 5, rows: 100000, url: undefined, check: false, impls: ['box-kite'], machine: process.env.BENCH_MACHINE };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--check') parsed.check = true;
    else if (arg === '--runs') parsed.runs = Number(argv[++i]);
    else if (arg === '--rows') parsed.rows = Number(argv[++i]);
    else if (arg === '--url') parsed.url = argv[++i];
    else if (arg === '--impls') parsed.impls = argv[++i].split(',').map((id) => id.trim());
    else if (arg === '--machine') parsed.machine = argv[++i];
    else throw new Error(`Unknown argument: ${arg}`);
  }

  return parsed;
}

async function measure(url) {
  const { send, close } = await launchChrome({ port: 9333 });

  try {
    await send('Page.enable');
    await send('Runtime.enable');
    await send('Page.navigate', { url });

    // The page mounts the hook in an effect, so the load event is not far enough on its own.
    for (let attempt = 0; attempt < 100; attempt++) {
      if (await evaluate(send, 'typeof window.boxKiteBench?.run === "function"')) break;
      await wait(200);
    }

    const impls = JSON.stringify(options.impls);
    const call = `window.boxKiteBench.run({ rows: ${options.rows}, runs: ${options.runs}, impls: ${impls} })`;
    const runs = await evaluate(send, call, 60 * 60 * 1000);

    const browserVersion = await send('Browser.getVersion');

    return { runs, browser: browserVersion.product };
  } finally {
    await close();
  }
}

/** One line per operation, so a CI log says what happened without anybody downloading an artefact. */
function printRun(run, budgets) {
  const rows = run.scenarios.map((scenario) => {
    const budget = budgets?.[scenario.scenario];
    const over = budget !== undefined && scenario.ms > budget;

    if (scenario.unavailable) return `${scenario.scenario.padEnd(8)}  ${'—'.padStart(7)}     not in this tier (${scenario.unavailable})`;

    return [
      scenario.scenario.padEnd(8),
      `${String(scenario.ms).padStart(7)} ms`,
      budget === undefined ? '' : `budget ${String(budget).padStart(6)} ms`,
      over ? 'OVER' : '',
      scenario.fps === undefined ? '' : `${scenario.workMs} ms of work, ${scenario.fps} fps, worst frame ${scenario.worstFrame} ms`,
      scenario.blankFrames === undefined ? '' : `${scenario.blankFrames}% of a hard flick blank`,
    ]
      .filter(Boolean)
      .join('  ');
  });

  console.log(`\n${run.label} ${run.version} — ${run.rows.toLocaleString('en-US')} rows x ${run.columns} columns, median of ${run.runs}`);
  console.log(`rows built in ${run.dataMs} ms, display frame ${run.frameBaseline} ms\n`);
  rows.forEach((row) => console.log('  ' + row));
  console.log('');
}

async function main() {
  let preview;
  let url = options.url;

  if (!url) {
    preview = await startPreview(4273);
    url = `${preview.address}/benchmark/`;
  }

  try {
    const { runs, browser } = await measure(url);
    const budgets = options.check && existsSync(budgetsPath) ? JSON.parse(readFileSync(budgetsPath, 'utf8')) : undefined;

    runs.forEach((run) => printRun(run, budgets?.[run.impl]));

    if (options.check) {
      // Only a grid with a budget is checked, so adding a comparison run to a command never fails it:
      // what the other libraries do on a shared runner is not this repository's regression to catch.
      const breaches = runs.flatMap((run) =>
        run.scenarios
          .filter((scenario) => {
            const budget = budgets?.[run.impl]?.[scenario.scenario];
            return budget !== undefined && scenario.ms > budget;
          })
          .map((scenario) => `${run.impl}/${scenario.scenario}`),
      );

      // The one budget a faster number cannot satisfy: a window with no cover ahead of it renders fewer
      // rows and so reads quicker on every scenario there is, and only the blank-space pass notices. Loose
      // on purpose — a runner half the speed of a laptop blanks some frames of a hard flick honestly,
      // where the regression this catches measures a hundred percent.
      breaches.push(
        ...runs.flatMap((run) => {
          const budget = budgets?.[run.impl]?.blankFrames;
          const measured = run.scenarios.find((scenario) => scenario.scenario === 'scroll')?.blankFrames;

          return budget !== undefined && measured !== undefined && measured > budget ? [`${run.impl}/blank (${measured}%)`] : [];
        }),
      );

      if (breaches.length > 0) {
        console.error(`Over budget: ${breaches.join(', ')}`);
        process.exitCode = 1;
      }

      return;
    }

    const results = {
      measuredAt: new Date().toISOString().slice(0, 10),
      machine: options.machine ?? 'unnamed machine (pass --machine)',
      browser,
      runs,
    };

    // Through prettier, so `npx prettier --check` stays green over a generated file.
    const config = await prettier.resolveConfig(resultsPath);
    writeFileSync(resultsPath, await prettier.format(JSON.stringify(results), { ...config, filepath: resultsPath }));
    console.log(`Wrote ${resultsPath}`);
  } finally {
    preview?.server.kill();
  }
}

await main();
