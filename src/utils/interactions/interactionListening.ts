import { isDevelopment } from '../environment/environmentUtils';
import { marksComponents, warnsWithoutAttribute } from './componentAttribute';
import type { Channel, Entry } from './interactionChannel';
import { toInteractionJson } from './interactionJson';
import type { InteractionEvent } from './interactionTypes';

// The events a change can be caused by, followed in capture so a handler that stops propagation is still seen.
const CAUSES = ['click', 'dblclick', 'keydown', 'pointerdown', 'pointerup', 'change', 'submit', 'copy', 'paste', 'focusout'];
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

function failed(error: unknown): void {
  if (typeof reportError === 'function') reportError(error);
  else
    setTimeout(() => {
      throw error;
    });
}

const element = (value: unknown) => (typeof Element !== 'undefined' && value instanceof Element ? value : undefined);
const controlOf = (node: Element | undefined) => node?.closest(CONTROL) ?? undefined;

/** The event a listener is handed: without `content`, what a person typed and the URL's query and hash are left out. */
function eventOf({ kind, input, event, handler, timeStamp, time, url }: Entry, content: boolean) {
  const hidden = content ? [] : (input.content ?? []);
  const kept = input.details && Object.fromEntries(Object.entries(input.details).filter(([key]) => !hidden.includes(key)));
  const details = toInteractionJson(kept) as Record<string, never> | undefined;
  const source = input.source ?? (input.reason && APP_REASONS.includes(input.reason) ? 'app' : 'user');

  return {
    kind,
    component: input.component,
    type: input.type,
    reason: input.reason,
    value: hidden.includes('value') ? undefined : toInteractionJson(input.value),
    details: details && Object.keys(details).length > 0 ? details : undefined,
    source,
    event,
    target: element(handler) ?? controlOf(element(event?.target)) ?? input.target ?? element(event?.target),
    timeStamp,
    time,
    url: content ? url : url.split(/[?#]/)[0],
  } as InteractionEvent;
}

/**
 * The half of the channel fetched with the first subscription: delivery, which event is being dispatched (so a change made
 * inside a handler names it unasked), and a press on anything a component styled.
 */
export default function deliver(channel: Channel): void {
  let scheduled = false;

  const flush = () => {
    scheduled = false;
    const batch = channel.queue.splice(0);
    if (channel.listeners.size === 0) return;

    for (const entry of batch) {
      // A press a component or the app explained arrives as that event, which carries it: one click is one event.
      if (entry.kind === 'dom' && batch.some((other) => other.kind !== 'dom' && other.event === entry.event)) continue;

      let full: InteractionEvent | undefined;
      let redacted: InteractionEvent | undefined;
      channel.listeners.forEach((options, listener) => {
        const event = options.content ? (full ??= eventOf(entry, true)) : (redacted ??= eventOf(entry, false));
        try {
          listener(event);
        } catch (error) {
          failed(error);
        }
      });
    }
  };

  const schedule = () => {
    if (scheduled) return;

    scheduled = true;
    later(flush);
  };

  channel.flush = flush;
  channel.schedule = schedule;
  // What happened while this chunk was on its way.
  if (channel.queue.length > 0) schedule();

  if (typeof addEventListener !== 'function') return;

  const press = (event: Event) => {
    const node = element(event.target);
    if (!node || channel.listeners.size === 0) return;

    if (!marksComponents()) {
      if (isDevelopment() && warnsWithoutAttribute() && !channel.warned) {
        channel.warned = true;
        console.warn('[box-kite] Box.onInteraction hears no clicks without data-bk: write Box.configure({ componentAttribute: true }).');
      }

      return;
    }

    const control = controlOf(node);
    const part = (control ?? node).closest('[data-bk]');
    if (!part) return;

    const checkable = node instanceof HTMLInputElement && (node.type === 'checkbox' || node.type === 'radio');
    channel.queue.push({
      kind: 'dom',
      input: {
        component: part.getAttribute('data-bk') ?? '',
        type: event.type,
        value: event.type === 'change' && checkable ? node.checked : undefined,
        details: { interactive: control !== undefined },
        target: control ?? part,
        source: event.isTrusted ? 'user' : 'app',
      },
      event,
      timeStamp: performance.now(),
      time: Date.now(),
      url: location.href,
    });
    schedule();
  };

  let releasing = false;
  const follow = (event: Event) => {
    channel.dispatching = event;
    // Released as it reaches `window`; one a handler stopped short of it is released when the task ends.
    if (!releasing) {
      releasing = true;
      setTimeout(() => {
        releasing = false;
        channel.dispatching = undefined;
      }, 0);
    }
    if (event.type === 'click' || event.type === 'change') press(event);
  };

  CAUSES.forEach((type) => {
    document.addEventListener(type, follow, true);
    addEventListener(type, (event) => {
      if (channel.dispatching === event) channel.dispatching = undefined;
    });
  });
  // A press that navigates away unloads the page before a background task runs; the queue goes out first.
  addEventListener('pagehide', flush);
}
