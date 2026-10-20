/**
 * One channel every component reports its interactions on, so an app hears all of them in one handler:
 * a dialog closing, a tab chosen, a DataGrid sorted. Framework-free, and kept on `globalThis` under a
 * registered symbol, so two copies of the package — or a server and a client build — share one channel.
 */

/** What a component reports: the same shape whichever component it is. */
export interface InteractionEvent {
  /** The component's key, as `Box.components()` names it: `'dialog'`, `'datagrid'`, `'menu.item'`. */
  component: string;
  /** The callback this mirrors, without its `on`: `'openChange'`, `'sortingChange'`, `'cellEdit'`. */
  type: string;
  /** Why, in the component's own words: the `reason` its callback is given. */
  reason?: string;
  /** What the callback is given first — the new value. Shared with the app, so never mutate it. */
  value?: unknown;
  /** Whatever else the callback is told (`rowKey`, `columnKey`, `oldValue`…). */
  details?: Record<string, unknown>;
  /** The DOM event behind it, when there was one. */
  event?: Event;
  /** The element it happened on, when known: the event's, else the component's own. */
  target?: Element;
  /** `performance.now()`, so it lines up with `event.timeStamp`. */
  timeStamp: number;
}

export type InteractionListener = (event: InteractionEvent) => void;

/** What a component names about itself; the rest of the event comes from the change. */
export interface InteractionSource {
  component: string;
  type: string;
}

/** An event as a component hands it over: `event` may be React's synthetic one, and the time is filled in. */
export type InteractionInput = Omit<InteractionEvent, 'event' | 'timeStamp'> & { event?: unknown };

interface Channel {
  listeners: Set<InteractionListener>;
  marks?: boolean;
  queue?: InteractionEvent[];
  scheduled?: boolean;
  unloadHooked?: boolean;
}

const channel: Channel = ((globalThis as Record<symbol, unknown>)[Symbol.for('box-kite.interactions')] ??= {
  listeners: new Set(),
}) as never;

type PostTask = (task: () => void, options: { priority: 'background' }) => Promise<unknown>;

/** After the handler and the render it caused, at the lowest priority the platform has: a listener is never on the input's path. */
function later(task: () => void): void {
  const scheduler = (globalThis as { scheduler?: { postTask?: PostTask } }).scheduler;

  if (scheduler?.postTask) void scheduler.postTask(task, { priority: 'background' });
  else setTimeout(task, 0);
}

const element = (value: unknown) => (typeof Element !== 'undefined' && value instanceof Element ? value : undefined);

/**
 * Hear every interaction any component reports, until the returned function is called. Delivery is fire and
 * forget: events arrive in order, batched, in a background task after the handler that caused them, and a
 * listener that throws is rethrown on a timer — so a listener can never slow down or break the control.
 */
export function subscribeInteractions(listener: InteractionListener): () => void {
  channel.listeners.add(listener);

  return () => void channel.listeners.delete(listener);
}

export function emitInteraction(input: InteractionInput): void {
  if (!channel.listeners.size) return;

  // React's synthetic event carries the real one; its `currentTarget` is the handler's element — the tab,
  // not the icon inside it — and is gone once dispatch ends, so it is read now.
  const synthetic = input.event as { nativeEvent?: Event; currentTarget?: unknown } | undefined;
  const event = (synthetic?.nativeEvent ?? synthetic) as Event | undefined;
  const target = element(synthetic?.nativeEvent && synthetic.currentTarget) ?? element(event?.target) ?? input.target;
  const queue = (channel.queue ??= []);

  queue.push({ ...input, event, target, timeStamp: performance.now() });
  if (channel.scheduled) return;

  channel.scheduled = true;
  later(flushInteractions);
  // A press that navigates away unloads the page before a background task runs; the queue goes out first.
  if (!channel.unloadHooked && typeof addEventListener === 'function') {
    channel.unloadHooked = true;
    addEventListener('pagehide', flushInteractions);
  }
}

/** Deliver whatever is queued, now — what an analytics sender calls on `pagehide` before it sends its batch. */
export function flushInteractions(): void {
  channel.scheduled = false;
  const batch = channel.queue?.splice(0) ?? [];

  for (const interaction of batch) {
    channel.listeners.forEach((listener) => {
      try {
        listener(interaction);
      } catch (error) {
        setTimeout(() => {
          throw error;
        });
      }
    });
  }
}

/** Whether a Box with a `component` writes `data-bk="<key>"` — what lets a delegated listener name a click. */
export const marksComponents = (): boolean => !!channel.marks;

export function setComponentAttribute(enabled: boolean): void {
  channel.marks = enabled;
}
