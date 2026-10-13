// The `server.json` registry.modelcontextprotocol.io lists `@box-kite/mcp` from. Its `name` must equal the
// npm manifest's `mcpName`, which the registry checks against the published package.
//
// Run: node scripts/mcp-server-json.mjs <version> [out-dir]   (publish.yml, after npm has that version)
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export const MCP_PACKAGE = '@box-kite/mcp';
export const MCP_NAME = 'io.github.box-kite/mcp';

// The registry refuses more than 100 characters.
const DESCRIPTION = "Box Kite's React styling engine as tools: props, components, and whether a value writes CSS.";

export function writeServerJson(version, dir) {
  if (DESCRIPTION.length > 100) throw new Error(`the registry description is ${DESCRIPTION.length} characters, and the limit is 100`);
  const server = {
    $schema: 'https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json',
    name: MCP_NAME,
    title: 'Box Kite',
    description: DESCRIPTION,
    repository: { url: 'https://github.com/box-kite/box-kite', source: 'github', subfolder: 'mcp' },
    websiteUrl: 'https://www.box-kite.dev/start-with-ai/',
    version,
    packages: [{ registryType: 'npm', identifier: MCP_PACKAGE, version, transport: { type: 'stdio' } }],
  };
  writeFileSync(join(dir, 'server.json'), `${JSON.stringify(server, null, 2)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [version, dir = '.'] = process.argv.slice(2);
  if (!/^\d+\.\d+\.\d+/.test(version ?? '')) {
    console.error('usage: node scripts/mcp-server-json.mjs <version> [out-dir]');
    process.exit(1);
  }
  writeServerJson(version, dir);
}
