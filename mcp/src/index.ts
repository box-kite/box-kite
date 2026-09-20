import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './server';

/**
 * `npx @box-kite/mcp` — stdio, which is what Claude Code, Cursor, VS Code and Codex all speak. No
 * network, no key and no state: everything it answers with was built into it from this repository.
 *
 * Nothing may be written to stdout but the protocol, so a stray `console.log` anywhere below this
 * line corrupts the stream — `console.error` is the one that goes to the client's log.
 *
 * The `#!/usr/bin/env node` line is the build's (`vite.mcp.config.ts` writes it as a banner): rollup
 * strips a shebang out of a source file, so one written here would reach the bin without it.
 */
async function main() {
  await createServer().connect(new StdioServerTransport());
}

main().catch((error: unknown) => {
  console.error('@box-kite/mcp failed to start:', error);
  process.exit(1);
});
