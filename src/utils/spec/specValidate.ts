/**
 * The JSON Schema subset `catalog()` emits, checked against a value. Deliberately small — the keywords
 * the catalog uses and nothing else — so a node is validated with no dependency, no compile step and no
 * second copy of the grammar.
 *
 * It has to happen here rather than in the runtime downstream: measured against `@json-render/react`
 * 0.20.0, a catalog holding more than one component resolves its props to `unknown`, so the names are
 * checked and the props are not. A prop that validates is the only thing that reaches a component.
 */
import type { CatalogSchema } from '../../core';

namespace SpecValidate {
  /** Keys that are never a prop, whatever a schema says: they arrive from `JSON.parse` as own properties. */
  const FORBIDDEN = ['__proto__', 'constructor', 'prototype'];

  const patterns = new Map<string, RegExp | null>();

  /**
   * Compiled once per pattern — a colour prop's grammar is tested on every value a stream delivers. A
   * pattern the engine cannot compile validates nothing rather than throwing inside a render.
   */
  function regexp(pattern: string): RegExp | null {
    if (!patterns.has(pattern)) {
      try {
        patterns.set(pattern, new RegExp(pattern));
      } catch {
        patterns.set(pattern, null);
      }
    }

    return patterns.get(pattern) ?? null;
  }

  /** A name a spec may set at all. */
  export function isSafeKey(key: string): boolean {
    return !FORBIDDEN.includes(key);
  }

  /** An object a spec could have written: `JSON.parse` produces these and nothing else. */
  export function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  /** A local `#/$defs/name` pointer, followed against the document it came from. */
  function deref(schema: CatalogSchema, root: CatalogSchema): CatalogSchema | null {
    if (!schema.$ref) return schema;

    const name = schema.$ref.startsWith('#/$defs/') ? schema.$ref.slice('#/$defs/'.length) : null;
    const target = name ? root.$defs?.[name] : undefined;

    // A pointer that resolves to nothing refuses the value. The alternative — treating it as "no
    // constraint" — turns a typo in a host's schema into an open prop, which is the one failure mode
    // this whole file exists to prevent.
    return target ? deref(target, root) : null;
  }

  function isObject(schema: CatalogSchema, value: unknown, root: CatalogSchema): boolean {
    if (!isPlainObject(value)) return false;
    if (schema.required?.some((name) => !(name in value))) return false;

    return Object.keys(value).every((key) => {
      const property = schema.properties?.[key];

      if (property) return isSafeKey(key) && matches(property, value[key], root);

      return schema.additionalProperties !== false && isSafeKey(key);
    });
  }

  /** Whether a value is one this schema allows. The whole of it: an invalid part makes the value invalid. */
  export function matches(schema: CatalogSchema, value: unknown, root: CatalogSchema = schema): boolean {
    const resolved = deref(schema, root);

    if (!resolved) return false;
    if (resolved.anyOf) return resolved.anyOf.some((option) => matches(option, value, root));
    if (resolved.enum && !resolved.enum.includes(value as string)) return false;

    switch (resolved.type) {
      case 'string': {
        if (typeof value !== 'string') return false;

        return !resolved.pattern || (regexp(resolved.pattern)?.test(value) ?? false);
      }
      // A JSON number, so neither `NaN` nor an infinity: both serialize to `null` and neither is a length.
      case 'number':
        return typeof value === 'number' && Number.isFinite(value);
      case 'integer':
        return typeof value === 'number' && Number.isInteger(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value) && (!resolved.items || value.every((item) => matches(resolved.items!, item, root)));
      case 'object':
        return isObject(resolved, value, root);
      // No `type`: an `enum`, an `anyOf` or a schema that constrains nothing, all of them already answered.
      default:
        return value !== undefined;
    }
  }
}

export default SpecValidate;
