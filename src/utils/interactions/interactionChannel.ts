/**
 * One channel every component reports its interactions on, so an app hears all of them in one handler:
 * a dialog closing, a tab chosen, a DataGrid sorted, a press on anything a component styled. Framework-free,
 * and kept on `globalThis` under a registered symbol, so two copies of the package share one channel.
 */
import { hasDocument } from '../environment/environmentUtils';
import { toInteractionJson } from './interactionJson';
import type { InteractionEvent, InteractionListener, InteractionReport } from './interactionTypes';

export type {
  ComponentInteraction,
  ComponentInteractions,
  CustomInteraction,
  DomInteraction,
  InteractionComponent,
  InteractionEvent,
  InteractionJson,
  InteractionListener,
  InteractionReport,
  InteractionSource,
  InteractionType,
} from './interactionTypes';

interface Entry extends Omit<InteractionReport, 'event'> {
  kind: InteractionEvent['kind'];
  event?: Event;
  timeStamp: number;
  time: number;
}

interface Channel {
  listeners: Set<InteractionListener>;
  queue: Entry[];
  scheduled?: boolean;
  /** Someone has listened on this page, so what happens with nobody listening is not kept for later. */
  heard?: boolean;
  /** The event the browser is dispatching, so a change made inside a handler names it without being told. */
  dispatching?: Event;
  releasing?: boolean;
  hooked?: boolean;
  warned?: boolean;
}

/** What the listening half is handed when it loads. */
export interface Listening {
  channel: Channel;
  enqueue: typeof enqueue;
  element: typeof element;
  controlOf: typeof controlOf;
  flush: () => void;
}

// The number is the shape of an `Entry`: copies of the package agreeing on it share one channel.
const channel: Channel = ((globalThis as Record<symbol, unknown>)[Symbol.for('box-kite.interactions@1')] ??= {
  listeners: new Set(),
  queue: [],
}) as never;

/** What happens before anyone listens is kept, up to this many, for an analytics bundle that loads late. */
const EARLY_LIMIT = 50;
const APP_REASONS = ['imperative', 'programmatic', 'timeout'];
// What a press was aimed at: every roving item here carries a `tabindex`, and an option a `role`.
const CONTROL = 'a[href],button,input,select,textarea,summary,label,[tabindex],[role=option],[role=button]';

type PostTask = (task: () => void, options: { priority: 'background' }) => Promise<unknown>;

/** After the handler and the render it caused, at the lowest priority the platform has: a listener is never on the input's path. */
function later(task: () => void): void {
  const scheduler = (globalThis as { scheduler?: { postTask?: PostTask } }).scheduler;

  if (scheduler?.postTask) void scheduler.postTask(task, { priority: 'background' });
  else setTimeout(task, 0);
}

const element = (value: unknown) => (typeof Element !== 'undefined' && value instanceof Element ? value : undefined);
const controlOf = (node: Element | undefined) => node?.closest(CONTROL) ?? undefined;

function schedule(): void {
  if (channel.scheduled) return;

  channel.scheduled = true;
  later(flushInteractions);
}

function enqueue(kind: Entry['kind'], input: InteractionReport): void {
  if (!hasDocument()) return;

  const live = channel.listeners.size > 0;
  if (!live && channel.heard) return;

  // React's synthetic event carries the real one; its `currentTarget` is the handler's element — the tab,
  // not the icon inside it — and is gone once dispatch ends, so it is read now.
  const synthetic = input.event as { nativeEvent?: Event; currentTarget?: unknown } | undefined;
  const event = (synthetic?.nativeEvent ?? synthetic ?? channel.dispatching) as Event | undefined;
  const handler = synthetic?.nativeEvent ? element(synthetic.currentTarget) : undefined;
  const target = handler ?? controlOf(element(event?.target)) ?? input.target ?? element(event?.target);
  const source = input.source ?? (input.reason && APP_REASONS.includes(input.reason) ? 'app' : 'user');

  channel.queue.push({ ...input, kind, source, event, target, timeStamp: performance.now(), time: Date.now() });
  if (live) schedule();
  else if (channel.queue.length > EARLY_LIMIT) channel.queue.shift();
}

/**
 * Hear every interaction, until the returned function is called. Delivery is fire and forget: events arrive in order,
 * batched, in a background task after the handler that caused them, and a listener that throws is reported rather
 * than rethrown — so a listener can never slow down or break the control.
 */
export function subscribeInteractions(listener: InteractionListener): () => void {
  channel.listeners.add(listener);
  channel.heard = true;
  if (channel.queue.length > 0) schedule();
  if (!channel.hooked && hasDocument()) {
    channel.hooked = true;
    // Fetched with the first subscription, so an app that never listens never loads it.
    void import('./interactionListening').then(({ default: listen }) =>
      listen({ channel, enqueue, element, controlOf, flush: flushInteractions }),
    );
  }

  return () => void channel.listeners.delete(listener);
}

/** Keep nothing for a later listener from here on: what a test runner calls, so one test's events are not the next one's. */
export function forgetEarlyInteractions(): void {
  channel.heard = true;
  channel.queue.length = 0;
}

/** What a component reports, beside the callback it fires for the same change. */
export const emitInteraction = (input: InteractionReport): void => enqueue('change', input);

/** A moment of the app's own — a page view, a hover, a wizard step — to the same listeners, fire and forget. */
export const reportInteraction = (input: InteractionReport): void => enqueue('custom', input);

function failed(error: unknown): void {
  if (typeof reportError === 'function') reportError(error);
  else
    setTimeout(() => {
      throw error;
    });
}

/** Deliver whatever is queued, now — what an analytics sender calls on `pagehide` before it sends its batch. */
export function flushInteractions(): void {
  channel.scheduled = false;
  if (channel.listeners.size === 0) return;

  for (const { value, details, ...entry } of channel.queue.splice(0)) {
    const json = toInteractionJson(details) as Record<string, never> | undefined;
    const interaction = { ...entry, value: toInteractionJson(value), details: json && Object.keys(json).length > 0 ? json : undefined };

    channel.listeners.forEach((listener) => {
      try {
        listener(interaction as InteractionEvent);
      } catch (error) {
        failed(error);
      }
    });
  }
}
