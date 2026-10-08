import path from 'path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

/**
 * The `@box-kite/core` build: the engine and the types, with no React anywhere in the graph.
 * `npm run check:boundaries` proves the *sources* are framework-free; this is what makes that a
 * package a plain-DOM app, a Web Component or another framework's adapter can install on its own.
 *
 * One entry, so rolldown inlines the whole graph into `core.mjs` — all but the development warnings'
 * messages, which the engine imports on demand so that a production bundle never loads them. The
 * declarations do ship as a tree, because `core.d.ts` and `types.d.ts` both reference the modules under them.
 */
// The format being written, so a chunk is named the way its entry is.
let currentFormat = 'es';

export default defineConfig(({ mode }) => ({
  plugins: [
    dts({
      entryRoot: './src',
      include: ['./src/core.ts', './src/types.ts', './src/core/**', './src/utils/**'],
      // Without this the package ships a `.test.d.ts` beside a third of its modules.
      exclude: ['./src/**/*.test.*'],
    }),
  ],
  build: {
    outDir: 'dist-core',
    emptyOutDir: true,
    minify: mode !== 'dev',
    lib: {
      // Named `core`, not `index`: the file the package points at spells what it is, the way the
      // React package's `box.*` does, and it saves fighting the dts plugin over an entry filename.
      entry: { core: path.resolve(import.meta.dirname, './src/core.ts') },
      fileName: (format, entryName) => {
        currentFormat = format;
        return `${entryName}.${format === 'es' ? 'mjs' : 'cjs'}`;
      },
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      // csstype is types-only, so nothing of it reaches the bundle; naming it here keeps a stray
      // value import from being inlined silently.
      external: ['csstype'],
      output: { exports: 'named', chunkFileNames: () => `[name]-[hash].${currentFormat === 'es' ? 'mjs' : 'cjs'}` },
    },
  },
}));
