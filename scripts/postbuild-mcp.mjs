// Finishes the `@box-kite/mcp` build: writes the package manifest beside the bundle, copies the
// README and the licence, and proves the server starts and answers.
//
// That last part is not ceremony. The bundle inlines four generated references and the engine, and a
// glob that matched nothing or a `?raw` import that came back empty both build cleanly and produce a
// server with nothing in it — so the check is a real `tools/list` and one `check_styles` call over
// the protocol, against the built file rather than the sources.
//
// Run: npm run build:mcp
import { spawn } from 'node:child_process';
import { cpSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const out = join(root, 'dist-mcp');
const bundle = join(out, 'mcp.mjs');

if (!existsSync(bundle)) {
  console.error('\n✖ dist-mcp/ is not built — this runs after `vite build --config vite.mcp.config.ts`.\n');
  process.exit(1);
}

const parent = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

const manifest = {
  name: '@box-kite/mcp',
  version: parent.version,
  type: 'module',
  description: 'The Box Kite MCP server: what an agent may write, what a component takes, and whether a value actually works.',
  bin: { 'box-kite-mcp': './mcp.mjs' },
  exports: { '.': './mcp.mjs' },
  files: ['mcp.mjs', 'README.md', 'LICENSE'],
  // Pinned to the version whose references are inlined: an agent told `fontSize` is divided by 16
  // must be reading the same release it is writing against.
  dependencies: {
    '@modelcontextprotocol/sdk': parent.devDependencies['@modelcontextprotocol/sdk'],
    zod: parent.devDependencies.zod,
  },
  engines: { node: '>=20' },
  keywords: ['box-kite', 'mcp', 'model-context-protocol', 'ai', 'agents', 'css-in-js', 'design-system', 'typescript'],
  repository: parent.repository,
  bugs: parent.bugs,
  homepage: parent.homepage,
  author: parent.author,
  license: parent.license,
};

writeFileSync(join(out, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`);
cpSync(join(root, 'mcp', 'README.md'), join(out, 'README.md'));
cpSync(join(root, 'LICENSE'), join(out, 'LICENSE'));

/** One JSON-RPC line over stdio. The protocol is newline-delimited, so a request is a line. */
const request = (id, method, params) => `${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`;

const INITIALIZE = { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'postbuild', version: '0' } };

async function speak() {
  const child = spawn(process.execPath, [bundle], { stdio: ['pipe', 'pipe', 'pipe'] });
  const lines = [];
  let buffer = '';
  let stderr = '';

  child.stdout.on('data', (chunk) => {
    buffer += chunk;
    const parts = buffer.split('\n');
    buffer = parts.pop() ?? '';
    for (const part of parts) if (part.trim()) lines.push(JSON.parse(part));
  });
  child.stderr.on('data', (chunk) => (stderr += chunk));

  child.stdin.write(request(1, 'initialize', INITIALIZE));
  child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })}\n`);
  child.stdin.write(request(2, 'tools/list', {}));
  child.stdin.write(request(3, 'tools/call', { name: 'check_styles', arguments: { props: { fontSize: 14, bgColor: 'blue-550' } } }));

  const answers = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`the server did not answer in 20s.\n${stderr}`)), 20_000);
    const check = setInterval(() => {
      if (lines.length < 3) return;
      clearInterval(check);
      clearTimeout(timer);
      resolve(lines);
    }, 50);
  }).finally(() => child.kill());

  return { answers, stderr };
}

const { answers, stderr } = await speak();
const fail = (message) => {
  console.error(`\n✖ @box-kite/mcp: ${message}\n${stderr}`);
  process.exit(1);
};

const initialize = answers.find((answer) => answer.id === 1)?.result;
const tools = answers.find((answer) => answer.id === 2)?.result?.tools ?? [];
const checked = answers.find((answer) => answer.id === 3)?.result?.content?.[0]?.text ?? '';

if (!initialize?.instructions?.includes('dividers are per prop')) fail('the instructions lost the facts they lead with.');
if (tools.length !== 6) fail(`${tools.length} tools, and there are six.`);
if (!checked.includes('font-size:0.875rem'))
  fail('`check_styles` did not measure the divider — the engine or the references did not make it into the bundle.');
if (!checked.includes('no rule and no class name')) fail('`check_styles` accepted a value the engine rejects.');

console.log(`✓ @box-kite/mcp ${manifest.version}: ${tools.length} tools, answering over stdio.`);
