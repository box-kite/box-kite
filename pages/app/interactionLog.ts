import Box, { InteractionEvent } from '../../src/box';

/** One row of the site's interaction log: what happened, and a short reading of the value it carried. */
export interface InteractionLine {
  name: string;
  detail: string;
}

/** `?interactions` in a URL turns the console log on in a production build, for the rest of the tab. */
export const LOG_FLAG = 'interactions';

const MAX_TEXT = 48;
let started = false;

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

export function interactionLine({ kind, component, type, reason, value, target }: InteractionEvent): InteractionLine {
  const name = kind === 'dom' ? `${type} ${component}` : `${component}.${type}`;
  const detail = kind === 'dom' ? labelOf(target) : [reason, describeValue(value)].filter(Boolean).join(' → ');

  return { name, detail };
}

/** The site's one subscription: a component's change, a press on anything it styled and the site's own page views, to the console. */
export function logInteractions(): void {
  if (started) return;
  started = true;

  Box.onInteraction((event) => {
    const { name, detail } = interactionLine(event);
    console.info(`[interaction] ${name}`, detail);
  });
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
