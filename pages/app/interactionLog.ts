import type { InteractionEvent } from '../../src/box';

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

export function interactionLine({ component, type, reason, value }: InteractionEvent): InteractionLine {
  const reading = describeValue(value);

  return { id: ++sequence, time: clock(), name: `${component}.${type}`, detail: [reason, reading].filter(Boolean).join(' → ') };
}

/** A press on anything a component styled, named by its `data-bk` — the half `Box.onInteraction` does not report. */
export function clickLine(target: EventTarget | null): InteractionLine | null {
  const part = target instanceof Element ? target.closest('[data-bk]') : null;
  if (!part) return null;

  const label = part.getAttribute('aria-label') ?? part.textContent?.trim().replace(/\s+/g, ' ') ?? '';

  return { id: ++sequence, time: clock(), name: `click ${part.getAttribute('data-bk')}`, detail: clip(label) };
}

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
