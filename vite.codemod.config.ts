import path from 'path';
import { defineConfig } from 'vite';

/**
 * The `@box-kite/codemod` build: one Node ESM file that `npx` runs. TypeScript stays external — it is the
 * parser, it is large, and the project being migrated almost always has it already.
 */
export default defineConfig(({ mode }) => ({
  build: {
    outDir: 'dist-codemod',
    emptyOutDir: true,
    minify: mode !== 'dev',
    target: 'node22',
    lib: {
      entry: { codemod: path.resolve(import.meta.dirname, './codemod/src/index.ts') },
      fileName: () => 'codemod.mjs',
      formats: ['es'],
    },
    rollupOptions: {
      external: ['typescript', /^node:/],
      // Rollup strips a shebang out of a source file, so the bin gets one here or not at all.
      output: { banner: '#!/usr/bin/env node' },
    },
  },
}));
