/**
 * assistant-ui's generative UI, in this library's shape.
 *
 * Its `GenerativeUISpec` and our `SpecNode` are the same idea arrived at twice: a component name
 * resolved against an allow-list the app owns, JSON props, nested children. Three differences, and they
 * are the whole adapter — the name is `component` rather than `type`, a child may be a bare string that
 * renders as text, and there is no data binding, no `repeat` and no action channel, because in their
 * design those are the tool's job rather than the spec's.
 *
 * Which is why this file has two functions and not one. `toSpec` renders *their* spec with our
 * registry; `fromSpec` hands *our* tree to their `<MessagePrimitive.GenerativeUI>`. The second loses
 * what the first never had — a `$data` reference, a `repeat`, an `on` binding — so it resolves nothing
 * and reports what it dropped, rather than emitting a tree that renders half a view in silence.
 */
import SpecData from '../spec/specData';
import { SpecChild, SpecNode } from '../spec/specTypes';

/** assistant-ui's node: a string renders as text, an object is a component. */
export type GenerativeUiNode =
  string | { component: string; props?: Record<string, unknown>; children?: readonly GenerativeUiNode[]; key?: string };

/** assistant-ui's root, which is one node or several. */
export interface GenerativeUiSpec {
  root: GenerativeUiNode | readonly GenerativeUiNode[];
}

/** What `fromSpec` could not carry across, since their spec has nowhere to put it. */
export interface GenerativeUiLoss {
  /** `data-binding`, `repeat` or `event` — the three things their shape has no room for. */
  code: 'data-binding' | 'repeat' | 'event';
  path: string;
}

namespace AssistantUiInterop {
  /** Their tree is shallower than ours by construction; this is the runaway guard, not a real limit. */
  const MAX_DEPTH = 32;

  function node(source: GenerativeUiNode, depth: number): SpecChild | null {
    if (typeof source === 'string') return source;
    if (depth > MAX_DEPTH || typeof source !== 'object' || source === null) return null;
    if (typeof source.component !== 'string') return null;

    const children = (source.children ?? []).map((child) => node(child, depth + 1)).filter((child): child is SpecChild => child !== null);

    return {
      type: source.component,
      ...(source.key !== undefined ? { key: source.key } : {}),
      ...(source.props ? { props: source.props } : {}),
      ...(children.length ? { children } : {}),
    };
  }

  /**
   * Their spec as ours. Several roots become the children of nothing, so a multi-root spec is rendered
   * by mapping this over `spec.root` rather than being wrapped in a container nobody asked for.
   */
  export function toSpec(spec: GenerativeUiSpec | null | undefined): SpecNode[] {
    if (spec === null || spec === undefined) return [];

    const roots = Array.isArray(spec.root) ? spec.root : [spec.root];

    return roots
      .map((root) => node(root as GenerativeUiNode, 0))
      .filter((built): built is SpecNode => typeof built === 'object' && built !== null);
  }

  function emit(child: SpecChild, path: string, losses: GenerativeUiLoss[], depth: number): GenerativeUiNode | null {
    if (child === null || child === undefined) return null;
    if (typeof child === 'string') return child;
    if (typeof child === 'number' || typeof child === 'boolean') return String(child);

    if (SpecData.isRef(child)) {
      losses.push({ code: 'data-binding', path });

      return null;
    }

    if (depth > MAX_DEPTH || typeof (child as SpecNode).type !== 'string') return null;

    const source = child as SpecNode;

    if (source.repeat) losses.push({ code: 'repeat', path });
    if (source.on) for (const event of Object.keys(source.on)) losses.push({ code: 'event', path: `${path}.on.${event}` });

    const all = source.children === undefined ? [] : Array.isArray(source.children) ? source.children : [source.children];
    const children = all
      .map((entry, index) => emit(entry, `${path}.children.${index}`, losses, depth + 1))
      .filter((entry): entry is GenerativeUiNode => entry !== null);

    return {
      component: source.type,
      ...(source.key !== undefined ? { key: source.key } : {}),
      ...(source.props ? { props: source.props } : {}),
      ...(children.length ? { children } : {}),
    };
  }

  /**
   * Ours as theirs, with what could not come along reported rather than dropped in silence. A named
   * slot has no counterpart either and is left out with the rest — their nodes have one children list.
   */
  export function fromSpec(spec: SpecNode | readonly SpecNode[]): { spec: GenerativeUiSpec; losses: GenerativeUiLoss[] } {
    const losses: GenerativeUiLoss[] = [];
    const roots = (Array.isArray(spec) ? spec : [spec as SpecNode])
      .map((node, index) => emit(node, `root.${index}`, losses, 0))
      .filter((node): node is GenerativeUiNode => node !== null);

    return { spec: { root: roots }, losses };
  }
}

export default AssistantUiInterop;
