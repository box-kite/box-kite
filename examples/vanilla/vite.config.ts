import path from 'path';
import { defineConfig } from 'vite';

// The example imports `@box-kite/core` by its published specifier — the same line a
// consumer writes — and this alias points that at the sources so the page reloads while the engine
// is edited. There is no framework plugin, because there is no framework.
export default defineConfig({
  resolve: {
    alias: {
      '@box-kite/core': path.resolve(import.meta.dirname, '../../src/core.ts'),
    },
  },
  // Its own port, strictly: the docs site holds 5173, and two dev servers racing for one port is how
  // the first one to lose ends up somewhere nobody is looking. A second instance fails instead.
  server: {
    port: 5174,
    strictPort: true,
  },
  build: {
    emptyOutDir: true,
  },
});
