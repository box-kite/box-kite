import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const BEGIN = '<!-- BEGIN:box-kite-agent-rules -->';
const END = '<!-- END:box-kite-agent-rules -->';

const MCP_PACKAGE = '@box-kite/mcp';
const MCP_ARGS = ['-y', MCP_PACKAGE];

/** One MCP config file per tool: the key it nests servers under, and the editor folder that says the tool is in use. */
const MCP_FILES = [
  { path: '.mcp.json', key: 'mcpServers', entry: { type: 'stdio', command: 'npx', args: MCP_ARGS } },
  { path: '.cursor/mcp.json', key: 'mcpServers', entry: { command: 'npx', args: MCP_ARGS }, editor: '.cursor' },
  { path: '.vscode/mcp.json', key: 'servers', entry: { type: 'stdio', command: 'npx', args: MCP_ARGS }, editor: '.vscode' },
] as const;

/**
 * The block a project's `AGENTS.md` carries: the four facts a model gets wrong from memory, then where the
 * whole rules are. It points into `node_modules` rather than copying them, so an upgrade brings the rules with it.
 */
export function agentsBlock(facts: readonly string[]): string {
  return [
    BEGIN,
    '# Box Kite is not the library you remember',
    '',
    'This app is styled with Box Kite (`@box-kite/react`), which is newer than your training data: code written from memory compiles and is then laid out wrong. Four facts before you write a prop:',
    '',
    ...facts.map((fact) => `- ${fact}`),
    '',
    'Read `node_modules/@box-kite/react/AGENTS.md`, the whole rules, before writing any code; `docs/` beside it has every prop and every component. Whether a value works is for the `box-kite` MCP server to answer (`check_styles`), not a guess: a value the library does not accept writes no CSS, and a production build says nothing.',
    END,
  ].join('\n');
}

/** An `AGENTS.md` with the block in it: the one already there replaced, or the block added at the end. */
export function withAgentsBlock(existing: string | undefined, block: string): string {
  if (!existing?.trim()) return `${block}\n`;
  const start = existing.indexOf(BEGIN);
  const end = existing.indexOf(END, start);
  if (start >= 0 && end > start) return existing.slice(0, start) + block + existing.slice(end + END.length);
  return `${existing.trimEnd()}\n\n${block}\n`;
}

/** A `CLAUDE.md` that imports `AGENTS.md`, which is how Claude Code reads it; unchanged when it already does. */
export function withClaudeImport(existing: string | undefined): string {
  if (!existing?.trim()) return '@AGENTS.md\n';
  if (/^@AGENTS\.md\s*$/m.test(existing)) return existing;
  return `@AGENTS.md\n\n${existing}`;
}

/** An MCP config with the server in it, or `null` when the file is not JSON we can safely rewrite (VS Code allows comments). */
export function withMcpServer(existing: string | undefined, key: string, entry: object): string | null {
  let config: Record<string, unknown> = {};
  if (existing?.trim()) {
    try {
      config = JSON.parse(existing);
    } catch {
      return null;
    }
    if (!config || typeof config !== 'object' || Array.isArray(config)) return null;
  }
  const servers = (config[key] ?? {}) as Record<string, { args?: unknown }>;
  if (typeof servers !== 'object' || Array.isArray(servers)) return null;
  // Already connected, under this name or another one: leave the reader's own entry alone.
  const present = Object.entries(servers).some(
    ([name, server]) =>
      name === 'box-kite' || (Array.isArray(server?.args) && server.args.some((arg) => String(arg).startsWith(MCP_PACKAGE))),
  );
  if (present) return existing ?? null;
  return `${JSON.stringify({ ...config, [key]: { ...servers, 'box-kite': entry } }, null, 2)}\n`;
}

export interface AgentFilesResult {
  /** The files written or changed; a file already right is left out. */
  written: string[];
  /** Files that needed the server and could not be rewritten, for the reader to edit by hand. */
  skipped: string[];
}

/**
 * Writes the agent files into a project. `editors: 'all'` writes every tool's MCP config (a new app, where no
 * editor folder exists yet); `'present'` writes only those whose editor folder is there (an existing project).
 */
export function writeAgentFiles(directory: string, facts: readonly string[], editors: 'all' | 'present'): AgentFilesResult {
  const result: AgentFilesResult = { written: [], skipped: [] };
  const read = (path: string) => (existsSync(join(directory, path)) ? readFileSync(join(directory, path), 'utf8') : undefined);
  const write = (path: string, before: string | undefined, after: string) => {
    if (after === before) return;
    mkdirSync(dirname(join(directory, path)), { recursive: true });
    writeFileSync(join(directory, path), after);
    result.written.push(path);
  };

  write('AGENTS.md', read('AGENTS.md'), withAgentsBlock(read('AGENTS.md'), agentsBlock(facts)));
  write('CLAUDE.md', read('CLAUDE.md'), withClaudeImport(read('CLAUDE.md')));
  for (const file of MCP_FILES) {
    if (editors === 'present' && 'editor' in file && !existsSync(join(directory, file.editor))) continue;
    const before = read(file.path);
    const after = withMcpServer(before, file.key, file.entry);
    if (after === null) result.skipped.push(file.path);
    else write(file.path, before, after);
  }
  return result;
}
