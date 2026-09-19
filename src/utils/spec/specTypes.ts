/**
 * The wire shapes a generated UI arrives in. Every one of them is JSON — no function, no element, no
 * class — because the tree comes off a model, over a network, out of a database, and the whole point of
 * the catalog is that what it describes can be serialized. The renderer treats each field as untrusted:
 * these types say what a *valid* spec looks like, never what arrived.
 */
import type { CatalogSchema } from '../../core';

/** A value read out of the data the spec is rendered against: `{ $data: 'user.name' }`. */
export interface SpecDataRef {
  /** A dot path (`stats.revenue.0`) or a JSON Pointer (`/stats/revenue/0`). Empty is the whole of it. */
  $data: string;
}

/** The current item of the enclosing `repeat`. `{ $item: '' }` is the item itself. */
export interface SpecItemRef {
  $item: string;
}

/** The current index of the enclosing `repeat`, from zero. */
export interface SpecIndexRef {
  $index: true;
}

/** Anywhere a value can stand, a reference to one can stand instead. */
export type SpecRef = SpecDataRef | SpecItemRef | SpecIndexRef;

/** What an event does: it tells the host, which is the only thing that may decide what happens next. */
export interface SpecAction {
  action: string;
  /** Sent back with the action, resolved the way a prop is. */
  payload?: unknown;
}

/** One node of a generated tree, or a leaf that is text. */
export type SpecChild = SpecNode | SpecRef | string | number | boolean | null;

export interface SpecNode {
  /** The component to render. A name the registry does not hold renders nothing. */
  type: string;
  /** React's key, where the host wants a node's identity to survive a re-order. */
  key?: string;
  /** Everything the component's own schema allows, and nothing else. */
  props?: Record<string, unknown>;
  /** The default slot. */
  children?: SpecChild | SpecChild[];
  /** The component's named slots — `Tooltip`'s `content`, a form control's `label`. */
  slots?: Record<string, SpecChild | SpecChild[]>;
  /** An event prop bound to an action the host handles: `{ onClick: 'refresh' }`. */
  on?: Record<string, SpecAction | string>;
  /** Render this node once per item of an array. `$item` and `$index` address the item inside it. */
  repeat?: SpecRef;
}

/** Why a node, a prop or a child did not render. Advisory: the tree renders around every one of them. */
export type SpecIssueCode =
  | 'unknown-component'
  | 'unknown-prop'
  | 'invalid-prop'
  | 'missing-prop'
  | 'unknown-slot'
  | 'unknown-event'
  | 'unresolved-data'
  | 'invalid-child'
  | 'invalid-repeat'
  | 'too-deep'
  | 'too-many-nodes'
  | 'render-error';

export interface SpecIssue {
  code: SpecIssueCode;
  /** Where in the spec it happened, as a path that can be printed: `children.1.props.bgColor`. */
  path: string;
  message: string;
  /** The component the node named, where it named one. */
  component?: string;
  prop?: string;
}

/** What the renderer needs to know about one component. The implementation is the registry's half. */
export interface SpecRules {
  /** What its props may be. No schema at all means no props: a component is opened up on purpose. */
  props?: CatalogSchema;
  /** Where children may go. `default` is the ordinary children slot. */
  slots: string[];
  /** The props a spec may bind an action to. Nothing else can ever become a function. */
  events: string[];
  description?: string;
}

/** The data a reference is resolved against, plus whatever `repeat` put in scope. */
export interface SpecScope {
  data?: unknown;
  item?: unknown;
  index?: number;
  /** Whether an `$item`/`$index` reference means anything here at all. */
  repeating?: boolean;
}

/** The ordinary children slot, under the name the catalog gives it. */
export const DEFAULT_SLOT = 'default';
