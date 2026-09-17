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
 *   node bench/run.mjs --url http://localhost:4173/benchmark/
 *   node bench/run.mjs --check                # compare against budgets.json and fail on a breach
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import prettier from 'prettier';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const resultsPath = join(here, 'results.json');
const budgetsPath = join(here, 'budgets.json');

const options = parseArgs(process.argv.slice(2));

/** Where Chrome is. `CHROME_PATH` first, because a CI runner names its own. */
function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ];

  const found = candidates.find((path) => path && existsSync(path));
  if (!found) throw new Error('No Chrome found. Set CHROME_PATH to the executable.');

  return found;
}

function parseArgs(argv) {
  const parsed = { runs: 5, rows: 100000, url: undefined, check: false, machine: process.env.BENCH_MACHINE };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--check') parsed.check = true;
    else if (arg === '--runs') parsed.runs = Number(argv[++i]);
    else if (arg === '--rows') parsed.rows = Number(argv[++i]);
    else if (arg === '--url') parsed.url = argv[++i];
    else if (arg === '--machine') parsed.machine = argv[++i];
    else throw new Error(`Unknown argument: ${arg}`);
  }

  return parsed;
}

function wait(ms) {
  return new Promise((done) => setTimeout(done, ms));
}

/** Serves `dist-pages`, and resolves with the address it actually bound — which is not always the one asked for. */
async function startPreview() {
  if (!existsSync(join(root, 'dist-pages', 'index.html'))) {
    throw new Error('dist-pages is empty. Run `npm run build:pages` first, or pass --url.');
  }

  // Vite's own entry rather than `npx`, which on Windows is a `.cmd` that `spawn` refuses without a shell.
  const server = spawn(
    process.execPath,
    [
      join(root, 'node_modules', 'vite', 'bin', 'vite.js'),
      'preview',
      './pages',
      '--config',
      './pages.vite.config.ts',
      '--outDir',
      '../dist-pages',
      '--port',
      '4273',
      '--strictPort',
    ],
    { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] },
  );

  const address = await new Promise((done, fail) => {
    let output = '';
    const timer = setTimeout(() => fail(new Error(`Preview server did not start:\n${output}`)), 60000);

    server.stdout.on('data', (chunk) => {
      output += chunk;
      // The banner carries ANSI escapes between `localhost:` and the port, so they come off first.
      const match = output.replace(/\u001b\[[0-9;]*m/g, '').match(/http:\/\/localhost:(\d+)\//);

      if (match) {
        clearTimeout(timer);
        done(`http://localhost:${match[1]}`);
      }
    });
    server.stderr.on('data', (chunk) => (output += chunk));
    server.on('exit', (code) => fail(new Error(`Preview server exited with ${code}:\n${output}`)));
  });

  return { server, address };
}

/** A CDP session over Node's own WebSocket: `send` resolves with the result of one command. */
async function connect(port) {
  let target;

  // The wait is outside the `catch`: a Chrome that is listening but has not opened its tab yet answers
  // with an empty list, and a loop that only slept on a refused connection burned every attempt in a
  // few milliseconds and gave up on a browser that was still starting.
  for (let attempt = 0; attempt < 150 && !target; attempt++) {
    try {
      const list = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => response.json());
      target = list.find((entry) => entry.type === 'page');
    } catch {
      /* not listening yet */
    }

    if (!target) await wait(200);
  }

  if (!target) throw new Error('Chrome never reported a page target.');

  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((done, fail) => {
    socket.addEventListener('open', done, { once: true });
    socket.addEventListener('error', () => fail(new Error('Could not open the debugger socket.')), { once: true });
  });

  let nextId = 1;
  const pending = new Map();

  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    const entry = pending.get(message.id);
    if (!entry) return;

    pending.delete(message.id);
    message.error ? entry.fail(new Error(message.error.message)) : entry.done(message.result);
  });

  const send = (method, params = {}, timeout = 30000) =>
    new Promise((done, fail) => {
      const id = nextId++;
      const timer = setTimeout(() => fail(new Error(`${method} timed out`)), timeout);
      pending.set(id, { done: (value) => (clearTimeout(timer), done(value)), fail });
      socket.send(JSON.stringify({ id, method, params }));
    });

  return { socket, send };
}

/** Evaluates an expression in the page and hands back its value, with the page's own errors kept. */
async function evaluate(send, expression, timeout) {
  const { result, exceptionDetails } = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, timeout);

  if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);

  return result.value;
}

async function measure(url) {
  const chrome = findChrome();
  const profile = mkdtempSync(join(tmpdir(), 'box-kite-bench-'));
  const port = 9333;

  const browser = spawn(
    chrome,
    [
      '--headless=new',
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${profile}`,
      '--window-size=1440,900',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions',
      '--disable-background-timer-throttling',
      '--hide-scrollbars',
      // A CI container often has no user namespaces to build a sandbox in, and Chrome refuses to start
      // rather than saying so.
      ...(process.env.CI ? ['--no-sandbox'] : []),
      // An explicit first page, so there is a target to attach to rather than a window Chrome has not
      // put a tab in yet.
      'about:blank',
    ],
    { stdio: 'ignore' },
  );

  try {
    const { socket, send } = await connect(port);

    await send('Page.enable');
    await send('Runtime.enable');
    await send('Page.navigate', { url });

    // The page mounts the hook in an effect, so the load event is not far enough on its own.
    for (let attempt = 0; attempt < 100; attempt++) {
      if (await evaluate(send, 'typeof window.boxKiteBench?.run === "function"')) break;
      await wait(200);
    }

    const run = await evaluate(send, `window.boxKiteBench.run({ rows: ${options.rows}, runs: ${options.runs} })`, 20 * 60 * 1000);

    const browserVersion = await send('Browser.getVersion');
    socket.close();

    return { run, browser: browserVersion.product };
  } finally {
    browser.kill();
    // Windows holds the profile open for a moment after the process goes; a leftover temp directory is
    // not worth failing a measurement over.
    await wait(500);
    try {
      rmSync(profile, { recursive: true, force: true });
    } catch {
      /* left for the operating system to clear */
    }
  }
}

/** One line per operation, so a CI log says what happened without anybody downloading an artefact. */
function printRun(run, budgets) {
  const rows = run.scenarios.map((scenario) => {
    const budget = budgets?.[scenario.scenario];
    const over = budget !== undefined && scenario.ms > budget;

    return [
      scenario.scenario.padEnd(8),
      `${String(scenario.ms).padStart(7)} ms`,
      budget === undefined ? '' : `budget ${String(budget).padStart(6)} ms`,
      over ? 'OVER' : '',
      scenario.fps === undefined ? '' : `${scenario.fps} fps, worst frame ${scenario.worstFrame} ms`,
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
    preview = await startPreview();
    url = `${preview.address}/benchmark/`;
  }

  try {
    const { run, browser } = await measure(url);
    const budgets = options.check && existsSync(budgetsPath) ? JSON.parse(readFileSync(budgetsPath, 'utf8')) : undefined;

    printRun(run, budgets?.[run.impl]);

    if (options.check) {
      const breaches = run.scenarios.filter((scenario) => {
        const budget = budgets?.[run.impl]?.[scenario.scenario];
        return budget !== undefined && scenario.ms > budget;
      });

      if (breaches.length > 0) {
        console.error(`Over budget: ${breaches.map((breach) => breach.scenario).join(', ')}`);
        process.exitCode = 1;
      }

      return;
    }

    const results = {
      measuredAt: new Date().toISOString().slice(0, 10),
      machine: options.machine ?? 'unnamed machine (pass --machine)',
      browser,
      runs: [run],
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
