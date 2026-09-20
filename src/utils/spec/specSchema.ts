/**
 * The catalog describes one component at a time; this describes a *tree* of them — the JSON Schema a
 * model is constrained to when it generates a view. Hand it to `streamObject`, to a structured-output
 * API, or to `z.fromJSONSchema`, and what comes back is a spec `<SpecRenderer>` already accepts: the
 * component names are an enum of what the app allowed, and each one's props are its own schema.
 *
 * Built from the same shapes the renderer validates against, so the thing a model is told it may write
 * and the thing the renderer lets through cannot drift apart.
 */
import type { CatalogSchema } from '../../core';
import SpecDefs from './specDefs';
import { DEFAULT_SLOT } from './specTypes';

/** A component, as much of it as a tree schema needs. A `catalog()` entry is one of these already. */
export interface SpecSchemaComponent {
  description?: string;
  props?: CatalogSchema;
  slots?: string[];
  events?: string[];
}

export interface SpecSchemaSource {
  components: Record<string, SpecSchemaComponent>;
}

export interface SpecSchemaOptions {
  /** Which components may be the root of the tree. Every one of them by default. */
  root?: string[];
  /**
   * Whether a prop may be a `{ $data: … }` reference and a node may `repeat`. Off by default: it widens
   * every prop in the document with an `anyOf`, which is a cost a static view should not pay.
   */
  bindings?: boolean;
}

const NODE = '#/$defs/node';
const CHILDREN = '#/$defs/children';
const REFERENCE = '#/$defs/reference';
const ACTION = '#/$defs/action';

/** Every prop widened to "this, or a reference to it", which is what a data-bound spec needs. */
function bindable(props: CatalogSchema): CatalogSchema {
  if (!props.properties) return props;

  return {
    ...props,
    properties: Object.fromEntries(
      Object.entries(props.properties).map(([name, property]) => [name, { anyOf: [property, { $ref: REFERENCE }] }]),
    ),
  };
}

/** One component's node: the name that picks it, and everything that may hang off it. */
function node(name: string, component: SpecSchemaComponent, defs: Record<string, CatalogSchema>, bindings: boolean): CatalogSchema {
  const slots = component.slots ?? [DEFAULT_SLOT];
  const named = slots.filter((slot) => slot !== DEFAULT_SLOT);
  const events = component.events ?? [];
  const props = component.props && Object.keys(component.props.properties ?? {}).length ? SpecDefs.hoist(component.props, defs) : null;
  const properties: Record<string, CatalogSchema> = { type: { type: 'string', enum: [name] } };

  if (props) properties.props = bindings ? bindable(props) : props;
  if (slots.includes(DEFAULT_SLOT)) properties.children = { $ref: CHILDREN };
  if (named.length) {
    properties.slots = {
      type: 'object',
      properties: Object.fromEntries(named.map((slot) => [slot, { $ref: CHILDREN } as CatalogSchema])),
      additionalProperties: false,
    };
  }
  if (events.length) {
    properties.on = {
      type: 'object',
      properties: Object.fromEntries(events.map((event) => [event, { $ref: ACTION } as CatalogSchema])),
      additionalProperties: false,
    };
  }
  if (bindings) properties.repeat = { $ref: REFERENCE };
  properties.key = { type: 'string' };

  return {
    ...(component.description ? { description: component.description } : {}),
    type: 'object',
    properties,
    // The props object is required only where the component's own schema requires something in it.
    required: props?.required?.length ? ['type', 'props'] : ['type'],
    additionalProperties: false,
  };
}

const REFERENCE_SCHEMA: CatalogSchema = {
  description: 'A value read from the data the view is rendered against, rather than written into the spec.',
  anyOf: [
    { type: 'object', properties: { $data: { type: 'string' } }, required: ['$data'], additionalProperties: false },
    { type: 'object', properties: { $item: { type: 'string' } }, required: ['$item'], additionalProperties: false },
    { type: 'object', properties: { $index: { type: 'boolean', enum: [true] } }, required: ['$index'], additionalProperties: false },
  ],
};

const ACTION_SCHEMA: CatalogSchema = {
  description: 'What to tell the host when this happens. The host decides what it does; the spec never can.',
  anyOf: [
    { type: 'string' },
    {
      type: 'object',
      properties: { action: { type: 'string' }, payload: { type: 'object' } },
      required: ['action'],
      additionalProperties: false,
    },
  ],
};

/** The JSON Schema a generated view has to conform to: a tree of the components this source allows. */
export function specSchema(source: SpecSchemaSource, options: SpecSchemaOptions = {}): CatalogSchema {
  const bindings = options.bindings === true;
  const names = Object.keys(source.components);
  const defs: Record<string, CatalogSchema> = {};

  // Every name the document owns is claimed before a component's own `$defs` are lifted into it, so a
  // custom schema carrying a `node` or a `Flex` definition is renamed rather than overwriting the tree's.
  // The order is also the reading order: the shape of a tree, then the eighty components that fill it.
  defs.node = { anyOf: names.map((name) => ({ $ref: `#/$defs/${name}` })) };
  defs.children = {
    type: 'array',
    items: { anyOf: [{ type: 'string' }, { type: 'number' }, { $ref: NODE }, ...(bindings ? [{ $ref: REFERENCE }] : [])] },
  };
  if (bindings) defs.reference = REFERENCE_SCHEMA;
  if (names.some((name) => source.components[name].events?.length)) defs.action = ACTION_SCHEMA;
  for (const name of names) defs[name] = {};
  for (const name of names) defs[name] = node(name, source.components[name], defs, bindings);

  const roots = options.root ? names.filter((name) => options.root!.includes(name)) : names;

  return {
    description: 'A user interface, as a tree of components the application allows.',
    $defs: defs,
    anyOf: roots.map((name) => ({ $ref: `#/$defs/${name}` })),
  };
}

export default specSchema;
