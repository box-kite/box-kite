/**
 * Prism, with its global set before any grammar is loaded. A `prismjs/components/*` file is not a module
 * that imports anything — it is a script that assigns to a bare `Prism`, which resolves only if the global
 * is already there. Core sets it when it evaluates, but which chunk core lands in is the bundler's
 * decision: the playground's own chunk got the grammar without it and threw `Prism is not defined` on
 * first paint (measured against the built site, not the dev server, which loads modules one by one).
 *
 * The assignment cannot sit beside the grammar imports, because imports are hoisted above it. A module of
 * its own is what orders the two — `highlight.ts` imports this first.
 */
import Prism from 'prismjs';

(globalThis as typeof globalThis & { Prism?: typeof Prism }).Prism ??= Prism;

export default Prism;
