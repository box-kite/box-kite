import path from 'path';
import { defineConfig, type Plugin } from 'vite';
import pkg from './package.json';
import { templateFiles } from './scripts/createTemplates.mjs';

/** Every file the command writes, in both languages, as one inlined module. */
function templates(): Plugin {
  const id = 'virtual:box-kite-templates';
  return {
    name: 'box-kite-templates',
    resolveId: (source) => (source === id ? `\0${id}` : undefined),
    load: (resolved) => (resolved === `\0${id}` ? `export default ${JSON.stringify(templateFiles())};` : undefined),
  };
}

/**
 * The `@box-kite/create` build: what `npm create @box-kite` runs, as one Node ESM file.
 *
 * The templates are inlined, so the design an app starts from is the one in this commit. create-vite and the
 * prompts are dependencies instead: create-vite is run as its own process, and the prompts are its own too.
 */
export default defineConfig(({ mode }) => ({
  plugins: [templates()],
  define: { __BOX_KITE_VERSION__: JSON.stringify(pkg.version) },
  build: {
    outDir: 'dist-create',
    emptyOutDir: true,
    minify: mode !== 'dev',
    target: 'node22',
    lib: {
      entry: { create: path.resolve(import.meta.dirname, './create/src/index.ts') },
      fileName: () => 'create.mjs',
      formats: ['es'],
    },
    rollupOptions: {
      external: ['@clack/prompts', 'create-vite', /^node:/],
      // Rollup strips a shebang out of a source file, so the bin gets one here or not at all.
      output: { banner: '#!/usr/bin/env node' },
    },
  },
}));
