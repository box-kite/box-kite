/**
 * A generated UI, rendered. The spec is JSON that something else wrote — a model, mid-stream, from a
 * prompt nobody reviewed — so every step here is defensive by construction: a name is looked up in the
 * app's registry, a prop is validated against the component's own schema, a function can only come from
 * an event the catalog lists, and text is text. There is no `eval`, no `dangerouslySetInnerHTML` and no
 * tag that comes from the spec.
 *
 * The other half is tolerance. A spec arriving a field at a time is the normal case, not the error case:
 * a node whose `type` has not been written yet renders nothing and reports nothing, a prop whose value
 * is still half a string is dropped until it is whole, and one node that throws loses one node.
 */
import { Fragment, ReactNode, createElement } from 'react';
import SpecData from '../../utils/spec/specData';
import SpecProps from '../../utils/spec/specProps';
import { DEFAULT_SLOT, SpecIssue, SpecScope } from '../../utils/spec/specTypes';
import SpecValidate from '../../utils/spec/specValidate';
import SpecBoundary from './specBoundary';
import { SpecRegistry } from './specRegistry';

/** What a bound event hands the host. Everything about where it came from, and nothing about what to do. */
export interface SpecActionDetails {
  /** What the spec sent with the action, resolved against the data the way a prop is. */
  payload?: unknown;
  /** The arguments the component called its handler with. */
  args: unknown[];
  /** The event prop that fired. */
  prop: string;
  component: string;
  path: string;
}

export type SpecActionHandler = (action: string, details: SpecActionDetails) => void;

export interface SpecRenderOptions {
  /** What the spec may name, and what each name renders. */
  registry: SpecRegistry;
  /** What `{ $data: … }` reads from. */
  data?: unknown;
  /** Every action the spec binds arrives here. The host decides what any of them mean. */
  onAction?: SpecActionHandler;
  /** What stands in for a node that could not render. Nothing, unless the app says otherwise. */
  fallback?: (issue: SpecIssue) => ReactNode;
  /** A tree bigger than this stops rendering — a generated spec has no author to notice a runaway one. */
  maxNodes?: number;
  maxDepth?: number;
  /** A node that threw renders its fallback until this changes: the next spec is a fresh chance. */
  resetKey?: unknown;
  /** A node that threw during a *commit*, which is after this function has returned. */
  onError?: (issue: SpecIssue) => void;
}

export interface SpecRenderResult {
  element: ReactNode;
  /** Everything that did not render, and why. Advisory — the tree renders around every one of them. */
  issues: SpecIssue[];
}

/** Big enough for a dashboard, small enough that a spec looping on itself stops being free. */
const MAX_NODES = 1000;

const MAX_DEPTH = 32;

interface Walk extends Required<Pick<SpecRenderOptions, 'registry' | 'fallback' | 'maxNodes' | 'maxDepth'>> {
  data: unknown;
  onAction?: SpecActionHandler;
  onError?: (issue: SpecIssue) => void;
  resetKey: unknown;
  issues: SpecIssue[];
  nodes: number;
  overflowed: boolean;
}

function report(walk: Walk, issue: SpecIssue) {
  walk.issues.push(issue);
}

/** A node that cannot render at all: reported, and replaced by whatever the app wants standing there. */
function fail(walk: Walk, issue: SpecIssue, key?: string): ReactNode {
  report(walk, issue);

  const element = walk.fallback(issue);

  // No fallback is nothing at all, not an empty fragment standing in a list where the app asked for
  // silence. A fragment is only needed to carry the key a sibling list wants.
  if (key === undefined || element === null || element === undefined) return element ?? null;

  return createElement(Fragment, { key }, element);
}

/** A child: a node, text, a reference to text, or a list of those. */
function renderChild(value: unknown, walk: Walk, scope: SpecScope, path: string, depth: number): ReactNode {
  if (value === null || value === undefined || typeof value === 'boolean') return null;
  if (typeof value === 'string' || typeof value === 'number') return value;
  if (Array.isArray(value)) return value.map((item, index) => renderChild(item, walk, scope, `${path}.${index}`, depth));

  if (SpecData.isRef(value)) {
    const resolved = SpecData.resolve(value, scope);

    if (!resolved.found) {
      report(walk, { code: 'unresolved-data', path, message: `${SpecData.pathOf(value)} resolved to nothing.` });

      return null;
    }
    if (resolved.value === null || resolved.value === undefined || typeof resolved.value === 'boolean') return null;
    if (typeof resolved.value === 'string' || typeof resolved.value === 'number') return resolved.value;

    report(walk, { code: 'invalid-child', path, message: `${SpecData.pathOf(value)} is not text.` });

    return null;
  }

  if (!SpecValidate.isPlainObject(value)) {
    report(walk, { code: 'invalid-child', path, message: 'A child is a node, text, or a reference to text.' });

    return null;
  }

  // A node whose `type` has not arrived yet is a frame of a stream, not a fault: nothing renders and
  // nothing is reported. A `type` that is there and is not a name is a fault.
  if (!('type' in value)) return null;
  if (typeof value.type !== 'string') {
    report(walk, { code: 'invalid-child', path, message: 'A node names its component in `type`.' });

    return null;
  }
  if (value.type === '') return null;

  return renderNode(value, walk, scope, path, depth, value.type);
}

/** Once per item of the array a `repeat` names, with `$item` and `$index` in scope inside it. */
function renderRepeat(node: Record<string, unknown>, walk: Walk, scope: SpecScope, path: string, depth: number, type: string): ReactNode {
  const repeat = node.repeat;

  if (!SpecData.isRef(repeat)) {
    return fail(walk, { code: 'invalid-repeat', path: `${path}.repeat`, component: type, message: 'A repeat is a reference to an array.' });
  }

  const resolved = SpecData.resolve(repeat, scope);

  if (!resolved.found) {
    report(walk, {
      code: 'unresolved-data',
      path: `${path}.repeat`,
      component: type,
      message: `${SpecData.pathOf(repeat)} resolved to nothing.`,
    });

    return null;
  }

  if (!Array.isArray(resolved.value)) {
    return fail(walk, {
      code: 'invalid-repeat',
      path: `${path}.repeat`,
      component: type,
      message: `${SpecData.pathOf(repeat)} is not an array.`,
    });
  }

  const key = typeof node.key === 'string' ? node.key : path;

  return resolved.value.map((item, index) =>
    renderOne(node, walk, { data: scope.data, item, index, repeating: true }, path, depth, type, `${key}#${index}`),
  );
}

function renderNode(node: Record<string, unknown>, walk: Walk, scope: SpecScope, path: string, depth: number, type: string): ReactNode {
  if (depth > walk.maxDepth) {
    return fail(walk, { code: 'too-deep', path, component: type, message: `Nested deeper than the ${walk.maxDepth} levels allowed.` });
  }

  if (node.repeat !== undefined) return renderRepeat(node, walk, scope, path, depth, type);

  return renderOne(node, walk, scope, path, depth, type, typeof node.key === 'string' ? node.key : path);
}

/** One component: its props judged, its slots filled, and a boundary of its own around it. */
function renderOne(
  node: Record<string, unknown>,
  walk: Walk,
  scope: SpecScope,
  path: string,
  depth: number,
  type: string,
  key: string,
): ReactNode {
  walk.nodes += 1;

  if (walk.nodes > walk.maxNodes) {
    // Once. A cap reached by a runaway spec is reached by every node after it, and a thousand copies of
    // one message is not a better report than one.
    if (!walk.overflowed) {
      walk.overflowed = true;
      report(walk, { code: 'too-many-nodes', path, component: type, message: `More than the ${walk.maxNodes} nodes allowed.` });
    }

    return null;
  }

  const entry = walk.registry.get(type);

  if (!entry) {
    return fail(walk, { code: 'unknown-component', path, component: type, message: `${type} is not a component this app allows.` }, key);
  }

  const resolved = SpecProps.resolve(node, entry, scope, path);
  const props: Record<string, unknown> = { ...resolved.props };

  walk.issues.push(...resolved.issues);

  // Rendering it anyway means the component reads `undefined` and throws, and only its own boundary
  // catches that: the same blank space, with a caught crash per frame behind it (bug #186).
  if (resolved.missing.length) {
    const needs = resolved.missing.join(', ');

    return fail(
      walk,
      { code: 'missing-prop', path, component: type, prop: resolved.missing[0], message: `${type} cannot render without ${needs}.` },
      key,
    );
  }

  for (const [event, action] of Object.entries(resolved.actions)) {
    props[event] = (...args: unknown[]) =>
      walk.onAction?.(action.action, { payload: action.payload, args, prop: event, component: type, path });
  }

  if (node.children !== undefined) {
    if (entry.slots.includes(DEFAULT_SLOT)) props.children = renderChild(node.children, walk, scope, `${path}.children`, depth + 1);
    else report(walk, { code: 'unknown-slot', path: `${path}.children`, component: type, message: `${type} takes no children.` });
  }

  if (SpecValidate.isPlainObject(node.slots)) {
    for (const [name, content] of Object.entries(node.slots)) {
      const at = `${path}.slots.${name}`;

      if (!SpecValidate.isSafeKey(name) || !entry.slots.includes(name)) {
        report(walk, { code: 'unknown-slot', path: at, component: type, message: `${type} has no ${name} slot.` });
        continue;
      }

      props[name === DEFAULT_SLOT ? 'children' : name] = renderChild(content, walk, scope, at, depth + 1);
    }
  }

  return (
    <SpecBoundary key={key} path={path} component={type} resetKey={walk.resetKey} fallback={walk.fallback} onError={walk.onError}>
      {createElement(entry.component, props)}
    </SpecBoundary>
  );
}

/**
 * The spec as React elements, and everything that did not render. No hook in it, so a static spec
 * renders on a server and a test can assert the issues without mounting anything.
 */
export function renderSpec(spec: unknown, options: SpecRenderOptions): SpecRenderResult {
  const walk: Walk = {
    registry: options.registry,
    data: options.data,
    onAction: options.onAction,
    onError: options.onError,
    fallback: options.fallback ?? (() => null),
    maxNodes: options.maxNodes ?? MAX_NODES,
    maxDepth: options.maxDepth ?? MAX_DEPTH,
    resetKey: options.resetKey,
    issues: [],
    nodes: 0,
    overflowed: false,
  };

  return { element: renderChild(spec, walk, { data: options.data }, 'spec', 0), issues: walk.issues };
}
