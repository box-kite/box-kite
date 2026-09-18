/**
 * What one node is allowed to pass to its component: the props pass, on its own, with no React in it.
 * Three things happen here and the order matters — a reference is resolved *first*, so the value that
 * arrived from the host is the one the schema judges, and a prop that fails is dropped rather than
 * taking its node down with it. Mid-stream a half-written value is an ordinary occurrence.
 */
import SpecData from './specData';
import { SpecAction, SpecIssue, SpecRules, SpecScope } from './specTypes';
import SpecValidate from './specValidate';

namespace SpecProps {
  export interface Resolved {
    /** Everything the schema allowed, resolved. */
    props: Record<string, unknown>;
    /** The events the node bound, for the renderer to turn into functions. */
    actions: Record<string, SpecAction>;
    issues: SpecIssue[];
  }

  /** A value in a message, short enough to read: the whole of a rejected data array helps nobody. */
  function preview(value: unknown): string {
    const text = JSON.stringify(value) ?? 'undefined';

    return text.length > 40 ? `${text.slice(0, 39)}…` : text;
  }

  /** `{ onClick: 'refresh' }` and `{ onClick: { action: 'refresh', payload } }` are the same binding. */
  function action(value: unknown, scope: SpecScope): SpecAction | null {
    if (typeof value === 'string') return { action: value };
    if (!SpecValidate.isPlainObject(value) || typeof value.action !== 'string') return null;

    return { action: value.action, payload: SpecData.deep(value.payload, scope) };
  }

  /** The props pass for one node: resolved, validated, and an issue for everything left out. */
  export function resolve(node: Record<string, unknown>, rules: SpecRules, scope: SpecScope, path: string): Resolved {
    const component = typeof node.type === 'string' ? node.type : undefined;
    const issues: SpecIssue[] = [];
    const props: Record<string, unknown> = {};
    const actions: Record<string, SpecAction> = {};
    const schema = rules.props;
    const declared = schema?.properties;

    if (SpecValidate.isPlainObject(node.props)) {
      for (const [prop, written] of Object.entries(node.props)) {
        const at = `${path}.props.${prop}`;

        if (!SpecValidate.isSafeKey(prop)) {
          issues.push({ code: 'unknown-prop', path: at, component, prop, message: `${prop} is not a prop a spec can set.` });
          continue;
        }

        const property = declared?.[prop];

        if (!property && (!schema || schema.additionalProperties === false)) {
          issues.push({ code: 'unknown-prop', path: at, component, prop, message: `${component ?? 'The component'} has no ${prop} prop.` });
          continue;
        }

        let missing: string | null = null;
        const value = SpecData.deep(written, scope, (reference) => {
          missing ??= reference;
        });

        if (missing) {
          issues.push({ code: 'unresolved-data', path: at, component, prop, message: `${missing} resolved to nothing.` });
          continue;
        }

        if (property && !SpecValidate.matches(property, value, schema)) {
          issues.push({ code: 'invalid-prop', path: at, component, prop, message: `${preview(value)} is not a value ${prop} takes.` });
          continue;
        }

        props[prop] = value;
      }
    }

    if (SpecValidate.isPlainObject(node.on)) {
      for (const [event, written] of Object.entries(node.on)) {
        const at = `${path}.on.${event}`;
        const bound = rules.events.includes(event) ? action(written, scope) : null;

        // An event this component does not have is the one prop injection worth naming: it is the only
        // way a spec could ask for a function, and the catalog says which props are ever allowed to be one.
        if (!bound) {
          issues.push({
            code: 'unknown-event',
            path: at,
            component,
            prop: event,
            message: `${component ?? 'The component'} has no ${event} event.`,
          });
          continue;
        }

        actions[event] = bound;
      }
    }

    return { props, actions, issues };
  }
}

export default SpecProps;
