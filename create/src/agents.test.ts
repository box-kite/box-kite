import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { agentsBlock, withAgentsBlock, withClaudeImport, withMcpServer, writeAgentFiles } from './agents';

const facts = ['**Dividers are per prop.**', '**No `style`.**'];
const entry = { command: 'npx', args: ['-y', '@box-kite/mcp'] };

let app: string;
const read = (path: string) => readFileSync(join(app, path), 'utf8');

beforeEach(() => {
  app = mkdtempSync(join(tmpdir(), 'box-kite-agents-test-'));
});
afterEach(() => rmSync(app, { recursive: true, force: true }));

describe('the AGENTS.md block', () => {
  it('states the facts and points at the rules in node_modules', () => {
    const block = agentsBlock(facts);
    expect(block).toContain('- **Dividers are per prop.**');
    expect(block).toContain('`node_modules/@box-kite/react/AGENTS.md`');
    expect(block).toMatch(/^<!-- BEGIN:box-kite-agent-rules -->[\s\S]*<!-- END:box-kite-agent-rules -->$/);
  });

  it('is the whole of a new file, and goes after what an existing one says', () => {
    const block = agentsBlock(facts);
    expect(withAgentsBlock(undefined, block)).toBe(`${block}\n`);
    expect(withAgentsBlock('# Our rules\n\nUse tabs.\n', block)).toBe(`# Our rules\n\nUse tabs.\n\n${block}\n`);
  });

  it('replaces its own earlier copy in place, so a re-run updates rather than repeats it', () => {
    const old = agentsBlock(['old fact']);
    const file = withAgentsBlock(`# Ours\n\n${old}\n\nMore of ours.\n`, agentsBlock(facts));
    expect(file).toBe(`# Ours\n\n${agentsBlock(facts)}\n\nMore of ours.\n`);
    expect(file).not.toContain('old fact');
  });
});

describe('CLAUDE.md', () => {
  it('imports AGENTS.md once, above what is already there', () => {
    expect(withClaudeImport(undefined)).toBe('@AGENTS.md\n');
    expect(withClaudeImport('Be brief.\n')).toBe('@AGENTS.md\n\nBe brief.\n');
    expect(withClaudeImport('Be brief.\n@AGENTS.md\n')).toBe('Be brief.\n@AGENTS.md\n');
  });
});

describe('an MCP config', () => {
  it('gains the server beside the ones it has', () => {
    const merged = JSON.parse(withMcpServer('{ "mcpServers": { "github": { "command": "gh" } } }', 'mcpServers', entry)!);
    expect(Object.keys(merged.mcpServers)).toEqual(['github', 'box-kite']);
  });

  it('is left alone when the server is already there, under any name', () => {
    const named = '{ "servers": { "box-kite": { "command": "node" } } }';
    expect(withMcpServer(named, 'servers', entry)).toBe(named);
    const renamed = '{ "servers": { "kite": { "command": "npx", "args": ["@box-kite/mcp@2"] } } }';
    expect(withMcpServer(renamed, 'servers', entry)).toBe(renamed);
  });

  it('refuses a file it cannot rewrite without losing something', () => {
    expect(withMcpServer('{ // ours\n "servers": {} }', 'servers', entry)).toBeNull();
    expect(withMcpServer('[]', 'servers', entry)).toBeNull();
  });
});

describe('writeAgentFiles', () => {
  it('writes every file into a new app', () => {
    const { written } = writeAgentFiles(app, facts, 'all');
    expect(written).toEqual(['AGENTS.md', 'CLAUDE.md', '.mcp.json', '.cursor/mcp.json', '.vscode/mcp.json']);
    expect(JSON.parse(read('.mcp.json')).mcpServers['box-kite'].args).toEqual(['-y', '@box-kite/mcp']);
    expect(JSON.parse(read('.vscode/mcp.json')).servers['box-kite'].type).toBe('stdio');
  });

  it('writes an editor’s config into an existing project only when that editor is in use', () => {
    mkdirSync(join(app, '.vscode'));
    expect(writeAgentFiles(app, facts, 'present').written).toEqual(['AGENTS.md', 'CLAUDE.md', '.mcp.json', '.vscode/mcp.json']);
    expect(existsSync(join(app, '.cursor'))).toBe(false);
  });

  it('changes nothing the second time', () => {
    writeAgentFiles(app, facts, 'all');
    expect(writeAgentFiles(app, facts, 'all')).toEqual({ written: [], skipped: [] });
  });

  it('reports a config it had to leave for the reader', () => {
    mkdirSync(join(app, '.vscode'));
    writeFileSync(join(app, '.vscode', 'mcp.json'), '{ // comments are allowed here\n}');
    expect(writeAgentFiles(app, facts, 'present').skipped).toEqual(['.vscode/mcp.json']);
  });
});
