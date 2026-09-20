import path from 'path';
import { defineConfig } from 'vite';

/**
 * The `@box-kite/mcp` build: the MCP server an agent runs with `npx`, as one Node ESM file.
 *
 * Everything it answers with is **inlined** — `api/props.json`, `api/components/*.json`, the rules
 * file, the catalog manifest and the engine itself. That is the point rather than an oversight: the
 * server's answers and the engine that judges a value come out of one commit, so `check_styles`
 * cannot disagree with `get_props`, and `npx` needs nothing installed beside it.
 *
 * Only the protocol is external. `@modelcontextprotocol/sdk` carries express, hono and jose, none of
 * which a stdio server loads — bundling it would put all of them in the file for nothing.
 */
export default defineConfig(({ mode }) => ({
  build: {
    outDir: 'dist-mcp',
    emptyOutDir: true,
    minify: mode !== 'dev',
    target: 'node22',
    lib: {
      entry: { mcp: path.resolve(import.meta.dirname, './mcp/src/index.ts') },
      fileName: () => 'mcp.mjs',
      formats: ['es'],
    },
    rollupOptions: {
      external: [/^@modelcontextprotocol\/sdk/, 'zod', /^node:/],
      // Rollup strips a shebang out of a source file, so the bin gets one here or not at all.
      output: { banner: '#!/usr/bin/env node' },
    },
  },
}));
