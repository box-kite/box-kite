// A component whose props this file knows nothing about is the whole idea: `any` is the only type that
// takes every component an app might register, and what its props may be is the schema beside it.
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * What a spec is allowed to name, and what each name renders. The allow-list is the app's: the library
 * ships a catalog of everything it *can* render, and the registry is the app saying which of it a
 * generated tree may reach for — so a component nobody registered is not a security question, it is
 * simply not there.
 *
 * Two halves per component: the implementation (the app's import) and the rules (the catalog's schema,
 * or the app's own for a component of its own). A component registered with neither takes no props at
 * all, which is the safe direction to be wrong in.
 */
import type { ComponentType } from 'react';
import type { CatalogSchema } from '../../core';
import { DEFAULT_SLOT, SpecRules } from '../../utils/spec/specTypes';

/** A component the catalog does not describe, or one whose rules the app wants to narrow. */
export interface SpecComponent {
  component: ComponentType<any>;
  /** What its props may be, as JSON Schema. Without one, a spec may set none of them. */
  props?: CatalogSchema;
  /** Where children may go. `['default']` unless the catalog says otherwise. */
  slots?: string[];
  /** The props a spec may bind an action to — the only props that can ever become a function. */
  events?: string[];
  description?: string;
}

export interface SpecRegistryEntry extends SpecRules {
  component: ComponentType<any>;
}

export interface SpecRegistry {
  /** Every component a spec may name, in the order they were registered. */
  readonly names: string[];
  /** The rules alone, which is what `specSchema()` takes: registry in, the model's constraint out. */
  readonly components: Record<string, SpecRules>;
  get(type: string): SpecRegistryEntry | undefined;
}

/** What a `catalog()` result carries per component. Structural, so the catalog entry is not imported. */
interface CatalogSource {
  components: Record<string, { description?: string; props?: CatalogSchema; slots?: string[]; events?: string[] }>;
}

export interface SpecRegistryOptions {
  /** The implementations, by the name a spec writes. A bare component takes its rules from the catalog. */
  components: Record<string, ComponentType<any> | SpecComponent>;
  /** `catalog()`, narrowed however the app narrowed it. Anything it describes needs no rules of its own. */
  catalog?: CatalogSource;
}

/**
 * A component or the rules around one. Told apart by the `component` key rather than by being a
 * function: every component in this library is `memo(forwardRef(…))`, which is an *object*, and reading
 * `Flex` as a rules object left every registry entry rendering undefined.
 */
function isDeclaration(registered: ComponentType<any> | SpecComponent): registered is SpecComponent {
  return typeof registered === 'object' && registered !== null && 'component' in registered;
}

function entryOf(name: string, registered: ComponentType<any> | SpecComponent, catalog?: CatalogSource): SpecRegistryEntry {
  const declared: SpecComponent = isDeclaration(registered) ? registered : { component: registered };
  const described = catalog?.components[name];

  return {
    component: declared.component,
    props: declared.props ?? described?.props,
    slots: declared.slots ?? described?.slots ?? [DEFAULT_SLOT],
    events: declared.events ?? described?.events ?? [],
    description: declared.description ?? described?.description,
  };
}

/** The registry a `<SpecRenderer>` renders against. */
export function createSpecRegistry(options: SpecRegistryOptions): SpecRegistry {
  const names = Object.keys(options.components);
  // A `Map`, not a record: a lookup by a name a spec chose has to answer for `constructor` and
  // `toString` the way it answers for anything else nobody registered, which is "no".
  const entries = new Map(names.map((name) => [name, entryOf(name, options.components[name], options.catalog)]));
  const components = Object.fromEntries([...entries].map(([name, { component: _component, ...rules }]) => [name, rules as SpecRules]));

  return {
    names,
    components,
    get: (type: string) => entries.get(type),
  };
}

export default createSpecRegistry;
