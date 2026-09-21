/**
 * Lifting a component's local `$defs` into a document that holds many of them.
 *
 * A `$ref` is resolved against the *document* root, never against the subschema it is written in — so a
 * component's self-contained `{ $defs: { color }, properties: { bgColor: { $ref: '#/$defs/color' } } }`
 * points at nothing the moment it is nested under `components.Flex`. Both directions out of `catalog()`
 * nest it (the spec schema a model generates under, and the A2UI catalog document), so the hoist and the
 * rename that goes with a collision live here rather than twice.
 */
import type { CatalogSchema } from '../../core';

namespace SpecDefs {
  /** A `$ref` inside a component's own schema, repointed where hoisting had to rename what it names. */
  function rewrite(schema: CatalogSchema, renames: Record<string, string>): CatalogSchema {
    const next: CatalogSchema = { ...schema };

    if (next.$ref?.startsWith('#/$defs/')) {
      const renamed = renames[next.$ref.slice('#/$defs/'.length)];

      if (renamed) next.$ref = `#/$defs/${renamed}`;
    }

    if (next.anyOf) next.anyOf = next.anyOf.map((option) => rewrite(option, renames));
    if (next.items) next.items = rewrite(next.items, renames);
    if (next.properties) {
      next.properties = Object.fromEntries(Object.entries(next.properties).map(([name, property]) => [name, rewrite(property, renames)]));
    }

    return next;
  }

  /**
   * A component's props, with its local `$defs` lifted into `defs` (which is mutated). The colour grammar
   * is the same object for every component, so the twenty-six colour props across a whole catalog share
   * one definition — and a host's custom schema that happens to name `color` something else is renamed
   * rather than silently taking the palette's meaning.
   */
  export function hoist(props: CatalogSchema, defs: Record<string, CatalogSchema>): CatalogSchema {
    const { $defs, ...rest } = props;

    if (!$defs) return rest;

    const renames: Record<string, string> = {};

    for (const [name, definition] of Object.entries($defs)) {
      const existing = defs[name];

      if (!existing) {
        defs[name] = definition;
        continue;
      }

      if (JSON.stringify(existing) === JSON.stringify(definition)) continue;

      let taken = 2;
      while (defs[`${name}${taken}`] && JSON.stringify(defs[`${name}${taken}`]) !== JSON.stringify(definition)) taken += 1;

      defs[`${name}${taken}`] = definition;
      renames[name] = `${name}${taken}`;
    }

    return Object.keys(renames).length ? rewrite(rest, renames) : rest;
  }
}

export default SpecDefs;
