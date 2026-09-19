/**
 * `@box-kite/react/catalog` — what a generated UI is allowed to build, as JSON Schema.
 *
 * ```ts
 * import { catalog } from '@box-kite/react/catalog';
 *
 * const allowed = catalog({ include: ['Flex', 'H2', 'Sparkline'], styleProps: ['p', 'gap', 'bgColor'] });
 * ```
 *
 * An entry of its own, not a method on `Box`: the prose half is 15 KB gzipped of descriptions, which an app
 * that renders no generated UI should not carry. Everything else comes off the engine as it stands, so a
 * prop or a colour added by `Box.extend()` is in the catalog with no build step and no regeneration — call
 * it *after* the `extend()` that should be in it.
 *
 * No React below this file, and nothing is registered or rendered: the model is `@box-kite/core`'s.
 */
import { BoxCatalog, BoxCatalogs, CatalogOptions, getDefaultEngine } from './core';
import CatalogContracts from './utils/catalog/catalogContracts';
import catalogManifest from './utils/catalog/catalogManifest';

export type { BoxCatalog, CatalogComponent, CatalogContract, CatalogOptions, CatalogSchema } from './core';

/** The components a generated spec may name, and the values their props may take. */
export function catalog(options?: CatalogOptions): BoxCatalog {
  const engine = getDefaultEngine();

  return BoxCatalogs.build(
    {
      ...engine.getCatalogSource(),
      componentStyles: engine.getComponentsStyles(),
      manifest: catalogManifest,
      contracts: CatalogContracts.CONTRACTS,
    },
    options,
  );
}

export default catalog;
