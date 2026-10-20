import { flushInteractions, InteractionEvent, subscribeInteractions } from '../../src/utils/interactions/interactionChannel';

/** One row of the site's interaction log: what happened, and a short reading of the value it carried. */
export interface InteractionLine {
  id: number;
  time: string;
  name: string;
  detail: string;
}

/** `?interactions` in a URL turns the log on for the rest of the tab, so it survives navigating between pages. */
export const LOG_FLAG = 'interactions';

const MAX_TEXT = 48;
const KEEP = 50;
// How long a press waits to hear whether it changed anything: a popover's toggle arrives a task after the click.
const CLICK_WINDOW_MS = 50;
let sequence = 0;

const clip = (text: string) => (text.length > MAX_TEXT ? `${text.slice(0, MAX_TEXT - 1)}…` : text);

/** A value as one short line: a model's value can be a whole layout or a row of data. */
export function describeValue(value: unknown): string {
  if (value === undefined) return '';
  if (value === null || typeof value !== 'object') return clip(String(value));
  if (Array.isArray(value)) return value.length <= 3 ? clip(JSON.stringify(value)) : `[${value.length} items]`;

  try {
    return clip(JSON.stringify(value));
  } catch {
    return `{${Object.keys(value).join(', ')}}`;
  }
}

const clock = () => new Date().toLocaleTimeString(undefined, { hour12: false });
const line = (name: string, detail: string): InteractionLine => ({ id: ++sequence, time: clock(), name, detail });

export function interactionLine({ component, type, reason, value }: InteractionEvent): InteractionLine {
  return line(`${component}.${type}`, [reason, describeValue(value)].filter(Boolean).join(' → '));
}

/** A press on anything a component styled, named by its `data-bk` — the half `Box.onInteraction` does not report. */
export function clickLine(target: EventTarget | null): InteractionLine | null {
  const part = target instanceof Element ? target.closest('[data-bk]') : null;
  if (!part) return null;

  const label = part.getAttribute('aria-label') ?? part.textContent?.trim().replace(/\s+/g, ' ') ?? '';

  return line(`click ${part.getAttribute('data-bk')}`, clip(label));
}

export const navigationLine = (path: string): InteractionLine => line('navigate', path);

let lines: InteractionLine[] = [];
const listeners = new Set<() => void>();
let toConsole = false;
let started = false;
let lastPath: string | undefined;
// Outside the log: a press on the panel itself is not something the page did.
let ignored: (target: EventTarget | null) => boolean = () => false;

function publish(next: InteractionLine | null) {
  if (!next) return;

  lines = [next, ...lines].slice(0, KEEP);
  listeners.forEach((listener) => listener());
  if (toConsole) console.info(`[interaction] ${next.name}`, next.detail);
}

/**
 * The site's one subscription. A press is logged only when it changed nothing a component reports — a press that
 * picked a date is the date it picked, not a click as well.
 */
export const interactionFeed = {
  start(options: { console: boolean }): void {
    toConsole ||= options.console;
    if (started) return;
    started = true;

    let pending: { line: InteractionLine | null } | null = null;

    subscribeInteractions((event) => {
      if (pending) pending.line = null;
      publish(interactionLine(event));
    });
    document.addEventListener(
      'click',
      (event) => {
        if (ignored(event.target)) return;

        const press = { line: clickLine(event.target) };
        pending = press;
        setTimeout(() => {
          // Delivery is a background task, so whatever this press queued is delivered before it is judged.
          flushInteractions();
          if (pending === press) pending = null;
          publish(press.line);
        }, CLICK_WINDOW_MS);
      },
      // Capture, so a press a component stops from bubbling is still heard.
      true,
    );
  },
  navigate(path: string): void {
    // A repeat is StrictMode running the effect twice, not a second visit.
    if (!started || path === lastPath) return;

    lastPath = path;
    publish(navigationLine(path));
  },
  ignore(test: (target: EventTarget | null) => boolean): void {
    ignored = test;
  },
  clear(): void {
    lines = [];
    listeners.forEach((listener) => listener());
  },
  subscribe(listener: () => void): () => void {
    listeners.add(listener);

    return () => void listeners.delete(listener);
  },
  snapshot: (): InteractionLine[] => lines,
};

/** Whether this tab asked for the log, remembering a `?interactions` it arrived with. */
export function logRequested(search: string): boolean {
  try {
    if (new URLSearchParams(search).has(LOG_FLAG)) sessionStorage.setItem(LOG_FLAG, '1');

    return sessionStorage.getItem(LOG_FLAG) === '1';
  } catch {
    return new URLSearchParams(search).has(LOG_FLAG);
  }
}

export function forgetLog(): void {
  try {
    sessionStorage.removeItem(LOG_FLAG);
  } catch {
    // Storage blocked: the flag was never kept, so there is nothing to forget.
  }
}
