/**
 * A2UI, both directions.
 *
 * A2UI is the protocol Google published and CopilotKit and Oracle converged on, and its wire shape is
 * the one thing in this family that is genuinely *not* ours: a **flat adjacency list** of components
 * referring to each other by id, arriving one message at a time, with a data model of its own per
 * surface. `<SpecRenderer>` renders a tree. This file is the fold that turns the one into the other, and
 * the catalog document that lets an agent generate for Box Kite's components in the first place.
 *
 * Three things fell out in its favour, and each is a special case that did not have to be written:
 *
 * - **A2UI's data binding is already ours.** `{ "path": "/user/email" }` is a JSON Pointer, and `$data`
 *   has taken a JSON Pointer since it was written, so a binding is a rename rather than a parse.
 * - **A template is a `repeat`.** `children: { componentId, path }` is one node per item of an array,
 *   which is exactly what `repeat` means, so a list that streams costs no special case.
 * - **The state is pure and hands itself back.** `apply` returns the same object when a message changed
 *   nothing, so a consumer holding it in `useState` re-renders when its surface moved and not when a
 *   message arrived for another one.
 */
import type { BoxCatalog, CatalogSchema } from '../../core';
import SpecDefs from '../spec/specDefs';
import { SpecChild, SpecNode } from '../spec/specTypes';

/** One component of a surface, flattened to v0.9's shape whichever version it arrived in. */
export interface A2uiComponent {
  id: string;
  component: string;
  [prop: string]: unknown;
}

/** One surface: its components, its own data model, and what the agent said about rendering it. */
export interface A2uiSurface {
  id: string;
  catalogId?: string;
  /** v0.8 names the root in its `beginRendering`; v0.9 settles it by convention, which is the id `root`. */
  root?: string;
  theme?: Record<string, unknown>;
  components: Record<string, A2uiComponent>;
  data: Record<string, unknown>;
}

/** Every surface an agent has opened, in the order it opened them. */
export interface A2uiState {
  surfaces: Record<string, A2uiSurface>;
  order: string[];
}

export interface A2uiSpecOptions {
  /** Which component to start from. Otherwise the surface's own root, and then the id `root`. */
  root?: string;
  /**
   * `catalog()`, where the agent generated against this library's own components: a prop the catalog
   * lists as an event becomes an `on` binding rather than a value. Without one, only A2UI's `action` is.
   */
  catalog?: { components: Record<string, { events?: string[] }> };
}

export interface A2uiCatalogOptions {
  /** The document's own id, which is what an agent's `createSurface.catalogId` names. */
  catalogId?: string;
  title?: string;
  description?: string;
}

namespace A2uiInterop {
  /** The id v0.9 settles the root by, since its `createSurface` does not carry one. */
  export const ROOT_ID = 'root';

  /** The surface a message means when it names none, which is what the published renderers call it. */
  export const DEFAULT_SURFACE = 'main';

  /** A tree deeper than this is a cycle the id graph allowed; a surface from an agent has neither. */
  const MAX_DEPTH = 32;

  export const EMPTY: A2uiState = { surfaces: {}, order: [] };

  function record(value: unknown): Record<string, unknown> | null {
    return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
  }

  function text(value: unknown): string | undefined {
    return typeof value === 'string' && value !== '' ? value : undefined;
  }

  // -----------------------------------------------------------------------------------------------
  // The message fold
  // -----------------------------------------------------------------------------------------------

  function blank(id: string): A2uiSurface {
    return { id, components: {}, data: {} };
  }

  function withSurface(state: A2uiState, id: string, next: A2uiSurface): A2uiState {
    return {
      surfaces: { ...state.surfaces, [id]: next },
      order: state.order.includes(id) ? state.order : [...state.order, id],
    };
  }

  /** v0.8 wraps the type in a key (`component: { Text: { … } }`); v0.9 is flat. One shape from here on. */
  function flatten(entry: unknown): A2uiComponent | null {
    const source = record(entry);
    const id = text(source?.id);
    if (source === null || id === undefined) return null;

    const kind = source.component;

    if (typeof kind === 'string') {
      const { id: _id, component: _component, ...props } = source;

      return { id, component: kind, ...props };
    }

    const wrapper = record(kind);
    const [name] = wrapper ? Object.keys(wrapper) : [];
    if (wrapper === null || name === undefined) return null;

    return { id, component: name, ...(record(wrapper[name]) ?? {}) };
  }

  /** JSON Pointer's two escapes, undone in the order the spec gives — `~01` is `~1`, not `/`. */
  function unescape(segment: string): string {
    return segment.replace(/~1/g, '/').replace(/~0/g, '~');
  }

  function segments(path: string | undefined): string[] {
    if (path === undefined || path === '' || path === '/') return [];

    return (path.startsWith('/') ? path.slice(1) : path).split('/').map(unescape);
  }

  function read(root: unknown, path: string[]): unknown {
    return path.reduce<unknown>((current, key) => record(current)?.[key], root);
  }

  /**
   * A value written at a pointer, copying the path it walks and nothing else. A container is created
   * where the pointer names one that is not there, which is what an agent sending `/user/email` into an
   * empty model means. `undefined` deletes the key, which is how v0.9 says so.
   */
  function write(root: unknown, path: string[], value: unknown): unknown {
    if (path.length === 0) return value;

    const [key, ...rest] = path;
    const source = record(root) ?? {};

    if (rest.length > 0) return { ...source, [key]: write(source[key], rest, value) };

    if (value !== undefined) return { ...source, [key]: value };

    const { [key]: _dropped, ...kept } = source;

    return kept;
  }

  /** v0.8's typed adjacency list (`[{ key, valueString }]`) as the plain object v0.9 would have sent. */
  function contents(entries: unknown): Record<string, unknown> {
    if (!Array.isArray(entries)) return {};

    const all: Record<string, unknown> = {};

    for (const entry of entries) {
      const item = record(entry);
      const key = text(item?.key);
      if (item === null || key === undefined) continue;

      if ('valueString' in item) all[key] = item.valueString;
      else if ('valueNumber' in item) all[key] = item.valueNumber;
      else if ('valueBoolean' in item) all[key] = item.valueBoolean;
      else if ('valueMap' in item) all[key] = contents(item.valueMap);
    }

    return all;
  }

  /**
   * One message, whichever of v0.8 and v0.9 it is written in. The same state comes back where the
   * message changed nothing or is not an A2UI message at all — a transport carries plenty that is not.
   */
  export function apply(state: A2uiState, message: unknown): A2uiState {
    const envelope = record(message);
    if (envelope === null) return state;

    // v0.8's `beginRendering` and v0.9's `createSurface`. The first names the root; the second does not.
    const created = record(envelope.createSurface) ?? record(envelope.beginRendering);
    if (created !== null) {
      const id = text(created.surfaceId) ?? DEFAULT_SURFACE;
      const current = state.surfaces[id] ?? blank(id);

      return withSurface(state, id, {
        ...current,
        catalogId: text(created.catalogId) ?? current.catalogId,
        root: text(created.root) ?? current.root,
        theme: record(created.theme) ?? record(created.styles) ?? current.theme,
      });
    }

    const updated = record(envelope.updateComponents) ?? record(envelope.surfaceUpdate);
    if (updated !== null) {
      const id = text(updated.surfaceId) ?? DEFAULT_SURFACE;
      const current = state.surfaces[id] ?? blank(id);
      const components = { ...current.components };

      let changed = false;

      for (const entry of Array.isArray(updated.components) ? updated.components : []) {
        const component = flatten(entry);
        if (component === null) continue;

        // An id already there is an update rather than a second component, which is the spec's rule.
        components[component.id] = component;
        changed = true;
      }

      return changed || !state.surfaces[id] ? withSurface(state, id, { ...current, components }) : state;
    }

    const model = record(envelope.updateDataModel) ?? record(envelope.dataModelUpdate);
    if (model !== null) {
      const id = text(model.surfaceId) ?? DEFAULT_SURFACE;
      const current = state.surfaces[id] ?? blank(id);
      const path = segments(text(model.path));
      // v0.8 *merges* its typed list into whatever is at the path (`/user/email` leaves `/user/name`);
      // v0.9 *sets* the value there, and omitting it deletes the key.
      const merged = 'contents' in model ? { ...(record(read(current.data, path)) ?? {}), ...contents(model.contents) } : undefined;
      const next = write(current.data, path, merged ?? model.value);

      return withSurface(state, id, { ...current, data: (record(next) ?? {}) as Record<string, unknown> });
    }

    const deleted = record(envelope.deleteSurface);
    if (deleted !== null) {
      const id = text(deleted.surfaceId) ?? DEFAULT_SURFACE;
      if (!state.surfaces[id]) return state;

      const { [id]: _dropped, ...kept } = state.surfaces;

      return { surfaces: kept, order: state.order.filter((name) => name !== id) };
    }

    return state;
  }

  /** A whole stream, oldest first. A JSONL transport is `applyAll(state, lines.map(JSON.parse))`. */
  export function applyAll(state: A2uiState, messages: readonly unknown[]): A2uiState {
    return messages.reduce<A2uiState>(apply, state);
  }

  /** A surface by id, or the first one opened — which is the whole of it for an agent that opens one. */
  export function surface(state: A2uiState, id?: string): A2uiSurface | null {
    if (id !== undefined) return state.surfaces[id] ?? null;

    return state.surfaces[state.order[0]] ?? null;
  }

  // -----------------------------------------------------------------------------------------------
  // The adjacency list, as a tree
  // -----------------------------------------------------------------------------------------------

  /** The three wrappers a v0.8 value arrives in, and the binding both versions share. */
  function value(raw: unknown): unknown {
    const wrapper = record(raw);
    if (wrapper === null) return raw;

    if ('literalString' in wrapper) return wrapper.literalString;
    if ('literalNumber' in wrapper) return wrapper.literalNumber;
    if ('literalBoolean' in wrapper) return wrapper.literalBoolean;
    // `{ path }` is a JSON Pointer, which is what `$data` has always taken.
    if (typeof wrapper.path === 'string') return { $data: wrapper.path };

    return raw;
  }

  /** The action a component carries, under either version's spelling. */
  function action(raw: unknown): string | undefined {
    const wrapper = record(raw);
    if (wrapper === null) return text(raw);

    return text(record(wrapper.event)?.name) ?? text(wrapper.name);
  }

  /** Child ids under any of the four spellings, plus the template that is a `repeat` rather than a list. */
  function childrenOf(component: A2uiComponent): { ids: string[]; template?: { componentId: string; path: string } } {
    const single = text(component.child);
    if (single !== undefined) return { ids: [single] };

    const raw = component.children;

    if (Array.isArray(raw)) return { ids: raw.filter((id): id is string => typeof id === 'string') };

    const wrapper = record(raw);
    if (wrapper === null) return { ids: [] };

    if (Array.isArray(wrapper.explicitList)) {
      return { ids: wrapper.explicitList.filter((id): id is string => typeof id === 'string') };
    }

    const template = record(wrapper.template) ?? wrapper;
    const componentId = text(template.componentId);
    const path = text(template.path) ?? text(template.dataBinding);

    return componentId !== undefined && path !== undefined ? { ids: [], template: { componentId, path } } : { ids: [] };
  }

  /** Props A2UI owns rather than the component, which never reach the registry as props. */
  const STRUCTURAL = new Set(['id', 'component', 'child', 'children', 'action']);

  function node(surface: A2uiSurface, id: string, options: A2uiSpecOptions, seen: ReadonlySet<string>, depth: number): SpecNode | null {
    const component = surface.components[id];
    if (component === undefined || depth > MAX_DEPTH || seen.has(id)) return null;

    const events = new Set(options.catalog?.components[component.component]?.events ?? []);
    const props: Record<string, unknown> = {};
    const on: Record<string, string> = {};

    for (const [name, raw] of Object.entries(component)) {
      if (STRUCTURAL.has(name)) continue;

      if (!events.has(name)) {
        props[name] = value(raw);
        continue;
      }

      const bound = action(raw);

      if (bound !== undefined) on[name] = bound;
    }

    // A2UI's own `action` prop, whose meaning belongs to the component it lands on — so it is bound
    // under that name, and an app registering under A2UI's component names declares `events: ['action']`.
    const own = action(component.action);
    if (own !== undefined) on.action = own;

    const { ids, template } = childrenOf(component);
    const deeper = new Set([...seen, id]);
    const children: SpecChild[] = [];

    for (const child of ids) {
      const built = node(surface, child, options, deeper, depth + 1);

      if (built !== null) children.push(built);
    }

    if (template !== undefined) {
      const built = node(surface, template.componentId, options, deeper, depth + 1);

      // One node per item of the bound array: `$item` and `$index` address the item inside it.
      if (built !== null) children.push({ ...built, repeat: { $data: template.path } });
    }

    return {
      type: component.component,
      key: id,
      ...(Object.keys(props).length ? { props } : {}),
      ...(children.length ? { children } : {}),
      ...(Object.keys(on).length ? { on } : {}),
    };
  }

  /**
   * A surface as one `<SpecRenderer>` tree. A component nothing reaches from the root is not rendered —
   * an agent streams a leaf before the branch that holds it, so a half-arrived surface is the ordinary
   * case rather than an error, and the node appears when the message naming it does.
   */
  export function toSpec(surface: A2uiSurface | null, options: A2uiSpecOptions = {}): SpecNode | null {
    if (surface === null) return null;

    return node(surface, options.root ?? surface.root ?? ROOT_ID, options, new Set(), 0);
  }

  // -----------------------------------------------------------------------------------------------
  // The catalog an agent generates against
  // -----------------------------------------------------------------------------------------------

  const CHILDREN: CatalogSchema = {
    type: 'array',
    items: { type: 'string' },
    description: 'The ids of this component’s children, each a component of its own in the same surface.',
  };

  const EVENT: CatalogSchema = { type: 'string', description: 'The name of an action the host handles.' };

  /**
   * `catalog()` as an A2UI catalog document. The components and the values their props take are the
   * same ones; what changes is the shape around them — a component carries its own `id`, its type is a
   * property rather than the key above it, and its children are **ids** rather than nested nodes, which
   * is the whole of what an adjacency list is.
   *
   * Every event the catalog names becomes a string, because a JSON message cannot carry a function: what
   * an agent writes is the name of an action, and `onAction` is where the host decides what it does.
   */

  /**
   * One component of a catalog document, self-contained. A `$ref` resolves against the *document*, so a
   * component lifted out of one on its own points at nothing — which is what every consumer that
   * converts a component at a time does (`z.fromJSONSchema` for CopilotKit's renderer and json-render
   * alike). Measured against zod 4.6: it throws `Reference not found: #/$defs/color`.
   */
  export function componentSchema(document: Record<string, unknown>, name: string): CatalogSchema | null {
    const components = record(document.components);
    const component = record(components?.[name]) as CatalogSchema | null;
    if (component === null) return null;

    const defs = record(document.$defs) as Record<string, CatalogSchema> | null;

    return defs === null ? component : { ...component, $defs: defs };
  }

  export function catalogDocument(catalog: BoxCatalog, options: A2uiCatalogOptions = {}): Record<string, unknown> {
    const catalogId = options.catalogId ?? `urn:box-kite:catalog:${catalog.version}`;
    // One `$defs` for the document: a `$ref` resolves against the document root, never against the
    // subschema it is written in, so a component's own definitions have to be lifted out of it.
    const defs: Record<string, CatalogSchema> = {};
    const components: Record<string, CatalogSchema> = {};

    for (const [name, component] of Object.entries(catalog.components)) {
      const props = SpecDefs.hoist(component.props, defs);

      components[name] = {
        type: 'object',
        description: component.description,
        properties: {
          id: { type: 'string', description: 'This component’s id, unique within the surface.' },
          component: { type: 'string', enum: [name] },
          ...(props.properties ?? {}),
          ...Object.fromEntries(component.events.map((event) => [event, EVENT])),
          ...(component.slots.length ? { children: CHILDREN } : {}),
        },
        required: ['id', 'component', ...(props.required ?? [])],
        additionalProperties: false,
      };
    }

    return {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $id: catalogId,
      catalogId,
      title: options.title ?? `${catalog.library} catalog`,
      description: options.description ?? catalog.rules.join(' '),
      ...(Object.keys(defs).length ? { $defs: defs } : {}),
      components,
    };
  }
}

export default A2uiInterop;
