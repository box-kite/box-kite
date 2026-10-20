import Box, { InteractionEvent } from '../../src/box';

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
let sequence = 0;

const clip = (text: string) => (text.length > MAX_TEXT ? `${text.slice(0, MAX_TEXT - 1)}…` : text);

/** A value as one short line: a model's value can be a whole layout or a row of data. */
export function describeValue(value: unknown): string {
  if (value === undefined) return '';
  if (value === null || typeof value !== 'object') return clip(String(value));
  if (Array.isArray(value)) return value.length <= 3 ? clip(JSON.stringify(value)) : `[${value.length} items]`;

  return clip(JSON.stringify(value));
}

/** What a press landed on, as the page shows it — read here, on the page, and never sent anywhere. */
const labelOf = (target: Element | undefined) =>
  clip(target?.getAttribute('aria-label') ?? target?.textContent?.trim().replace(/\s+/g, ' ') ?? '');

export function interactionLine({ kind, component, type, reason, value, target, time }: InteractionEvent): InteractionLine {
  const name = kind === 'dom' ? `${type} ${component}` : `${component}.${type}`;
  const detail = kind === 'dom' ? labelOf(target) : [reason, describeValue(value)].filter(Boolean).join(' → ');

  return { id: ++sequence, time: new Date(time).toLocaleTimeString(undefined, { hour12: false }), name, detail };
}

let lines: InteractionLine[] = [];
const listeners = new Set<() => void>();
let toConsole = false;
let started = false;
// Outside the log: a press on the panel itself is not something the page did.
let ignored: (target: Element | undefined) => boolean = () => false;

/** The site's one subscription: a component's change, a press on anything it styled and the site's own page views. */
export const interactionFeed = {
  start(options: { console: boolean }): void {
    toConsole ||= options.console;
    if (started) return;
    started = true;

    Box.onInteraction((event) => {
      if (ignored(event.target)) return;

      const next = interactionLine(event);
      lines = [next, ...lines].slice(0, KEEP);
      listeners.forEach((listener) => listener());
      if (toConsole) console.info(`[interaction] ${next.name}`, next.detail);
    });
  },
  ignore(test: (target: Element | undefined) => boolean): void {
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
