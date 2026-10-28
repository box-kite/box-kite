/**
 * One channel every component reports its interactions on, so an app hears all of them in one handler. Framework-free, and kept
 * on `globalThis` under a registered symbol, so two copies of the package share one channel. With nobody listening it does nothing.
 */
import { hasDocument } from '../environment/environmentUtils';
import type { InteractionEvent, InteractionListener, InteractionOptions, InteractionReport } from './interactionTypes';

export type {
  ComponentInteraction,
  ComponentInteractions,
  CustomInteraction,
  DomInteraction,
  InteractionComponent,
  InteractionEvent,
  InteractionJson,
  InteractionListener,
  InteractionOptions,
  InteractionReport,
  InteractionSource,
  InteractionType,
} from './interactionTypes';

/** What happened, as it stood when it happened; everything else is worked out on delivery. */
export interface Entry {
  kind: InteractionEvent['kind'];
  input: InteractionReport;
  event?: Event;
  /** The element a React handler ran on, read now: `currentTarget` is gone once dispatch ends. */
  handler?: unknown;
  timeStamp: number;
  time: number;
  url: string;
}

export interface Channel {
  listeners: Map<InteractionListener, InteractionOptions>;
  queue: Entry[];
  /** The event the browser is dispatching, so a change made inside a handler names it without being told. */
  dispatching?: Event;
  /** Both set by the delivery half when it loads; until then, what happens waits in the queue. */
  schedule?: () => void;
  flush?: () => void;
  loading?: boolean;
  warned?: boolean;
}

// The number is the shape of an `Entry`: copies of the package agreeing on it share one channel.
const channel: Channel = ((globalThis as Record<symbol, unknown>)[Symbol.for('box-kite.interactions@2')] ??= {
  listeners: new Map(),
  queue: [],
}) as never;

function enqueue(kind: Entry['kind'], input: InteractionReport): void {
  // Nobody listening is the usual case, and it costs this comparison and nothing else.
  if (channel.listeners.size === 0) return;

  const synthetic = input.event as { nativeEvent?: Event; currentTarget?: unknown } | undefined;

  channel.queue.push({
    kind,
    input,
    event: (synthetic?.nativeEvent ?? synthetic ?? channel.dispatching) as Event | undefined,
    handler: synthetic?.nativeEvent && synthetic.currentTarget,
    timeStamp: performance.now(),
    time: Date.now(),
    url: location.href,
  });
  channel.schedule?.();
}

/**
 * Hear every interaction from here on, until the returned function is called. Delivery is fire and forget: events arrive in order,
 * batched, in a background task after the handler that caused them, and a listener that throws is reported rather than rethrown.
 */
export function subscribeInteractions(listener: InteractionListener, options: InteractionOptions = {}): () => void {
  // A server has nobody interacting with it.
  if (!hasDocument()) return () => {};

  channel.listeners.set(listener, options);
  if (!channel.loading) {
    channel.loading = true;
    // Fetched with the first subscription, so an app that never listens never loads it.
    void import('./interactionListening').then(({ default: deliver }) => deliver(channel));
  }

  return () => void channel.listeners.delete(listener);
}

/** Deliver whatever is queued, now: what an analytics sender calls on `pagehide` before it sends its batch. */
export const flushInteractions = (): void => channel.flush?.();

/** What a component reports, beside the callback it fires for the same change. */
export const emitInteraction = (input: InteractionReport): void => enqueue('change', input);

/** A moment of the app's own (a page view, a hover, a wizard step) to the same listeners, fire and forget. */
export const reportInteraction = (input: InteractionReport): void => enqueue('custom', input);
