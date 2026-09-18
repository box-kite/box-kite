/**
 * `@box-kite/react` — the bare specifier — for the registry blocks, which are written against the
 * package name because that is what a consumer installs. The `components/*` subpaths are a `paths`
 * entry in `tsconfig.json`; this one cannot be, and that is the whole reason the file exists.
 *
 * Several built chunks import the package **by its own name** (`dist/components/flex.mjs` is
 * `import n from "@box-kite/react"`), and esbuild reads `tsconfig.json`. A `paths` mapping for the bare
 * specifier therefore resolves those self-imports back to `src/box.ts` inside `npm run size`, which
 * then measures a second copy of the engine: +29.5 KB on Combobox, DataGrid and the full library,
 * measured. An ambient declaration says the same thing to the type-checker and nothing to any bundler.
 *
 * `export *` does not work inside an ambient module, so this re-exports the default alone — which is
 * all a block needs, since `Box.Theme`, `Box.useTheme` and the rest hang off it.
 */
declare module '@box-kite/react' {
  export { default } from '../src/box';
}
