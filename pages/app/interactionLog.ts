import Box, { InteractionEvent, InteractionJson } from '../../src/box';

/** One interaction as a log service takes it: plain JSON, with nothing that only means something inside this tab. */
export interface InteractionRecord {
  /** `component.type`: `tabs.valueChange`, `button.click`. */
  name: string;
  kind: InteractionEvent['kind'];
  component: string;
  type: string;
  reason?: string;
  value?: InteractionJson;
  details?: { [key: string]: InteractionJson };
  source: 'user' | 'app';
  /** The DOM event's type (`click`, `keydown`) rather than the event, which is a live object. */
  trigger?: string;
  /** What it happened on, as the page shows it, rather than the element. */
  label?: string;
  /** ISO 8601. */
  time: string;
  url: string;
}

/** `?interactions` in a URL turns the console log on in a production build, for the rest of the tab. */
export const LOG_FLAG = 'interactions';

const MAX_LABEL = 48;
let started = false;

const clip = (text: string) => (text.length > MAX_LABEL ? `${text.slice(0, MAX_LABEL - 1)}…` : text);

const labelOf = (target: Element | undefined) => {
  const text = target?.getAttribute('aria-label') ?? target?.textContent?.trim().replace(/\s+/g, ' ');

  return text ? clip(text) : undefined;
};

/** `timeStamp` is left out: it counts from this tab's start, so it means nothing on another machine. */
export function toInteractionRecord(event: InteractionEvent): InteractionRecord {
  const { kind, component, type, reason, value, details, source, time, url } = event;

  return {
    name: `${component}.${type}`,
    kind,
    component,
    type,
    reason,
    value,
    details,
    source,
    trigger: event.event?.type,
    label: labelOf(event.target),
    time: new Date(time).toISOString(),
    url,
  };
}

/** The site's one subscription: every interaction, as the record a log service would be sent, to the console. */
export function logInteractions(): void {
  if (started) return;
  started = true;

  Box.onInteraction((event) => console.info('[interaction]', toInteractionRecord(event)));
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
