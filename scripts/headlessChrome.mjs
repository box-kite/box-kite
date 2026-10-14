/**
 * Headless Chrome over CDP, for the scripts that drive the built site: the benchmark and the template
 * snapshots. Chrome is spawned directly — the repository carries no browser dependency.
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

/** Where Chrome is. `CHROME_PATH` first, because a CI runner names its own. */
export function findChrome() {
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

export function wait(ms) {
  return new Promise((done) => setTimeout(done, ms));
}

/** Serves `dist-pages`, and resolves with the address it actually bound — which is not always the one asked for. */
export async function startPreview(port) {
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
      String(port),
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
  const listeners = new Map();

  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.method) return listeners.get(message.method)?.forEach((listener) => listener(message.params));

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

  /** Every `method` event from now on — `Runtime.exceptionThrown`, say. */
  const on = (method, listener) => listeners.set(method, [...(listeners.get(method) ?? []), listener]);

  return { socket, send, on };
}

/** Evaluates an expression in the page and hands back its value, with the page's own errors kept. */
export async function evaluate(send, expression, timeout) {
  const { result, exceptionDetails } = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, timeout);

  if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);

  return result.value;
}

/**
 * A headless Chrome with one page to drive, and a `close` that cleans up after it. Windows holds the
 * profile open for a moment after the process goes; a leftover temp directory is not worth failing over.
 */
export async function launchChrome({ port, windowSize = '1440,900', args = [] }) {
  const profile = mkdtempSync(join(tmpdir(), 'box-kite-chrome-'));
  const browser = spawn(
    findChrome(),
    [
      '--headless=new',
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${profile}`,
      `--window-size=${windowSize}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions',
      '--disable-background-timer-throttling',
      '--hide-scrollbars',
      // A CI container often has no user namespaces to build a sandbox in, and Chrome refuses to start
      // rather than saying so.
      ...(process.env.CI ? ['--no-sandbox'] : []),
      ...args,
      // An explicit first page, so there is a target to attach to rather than a window Chrome has not
      // put a tab in yet.
      'about:blank',
    ],
    { stdio: 'ignore' },
  );

  const close = async (socket) => {
    socket?.close();
    browser.kill();
    await wait(500);
    try {
      rmSync(profile, { recursive: true, force: true });
    } catch {
      /* left for the operating system to clear */
    }
  };

  try {
    const { socket, send, on } = await connect(port);

    return { send, on, close: () => close(socket) };
  } catch (error) {
    await close();
    throw error;
  }
}
