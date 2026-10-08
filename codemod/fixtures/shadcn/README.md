# The shadcn/ui corpus

shadcn/ui's own files for the fifteen families the codemod converts, fetched from its registry
(`https://ui.shadcn.com/r/styles/new-york-v4/<name>.json`) on 2026-10-08 and kept as they were written:
`ui/` is the wrappers, `examples/` the official demos that call them. They are MIT-licensed — see
`LICENSE.md` beside this file.

They are the measurement rather than a test written to pass: `codemod/src/corpus.test.ts` and
`scripts/postbuild-codemod.mjs` convert them and hold the result to the figure `codemod/README.md`
quotes. Refetch them to re-measure against a newer shadcn; do not edit them by hand.
