import { hasDocument } from '../environment/environmentUtils';
import { flushInteractions, InteractionEvent, InteractionJson, subscribeInteractions } from '../interactions/interactionChannel';
import { createIdentity, DEFAULT_SESSION_TIMEOUT, randomId } from './analyticsIdentity';

/** One interaction as a collector stores it: flat, plain JSON, and nothing that only means something inside this tab. */
export interface AnalyticsEvent {
  /** Unique per event, so a collector that is sent a batch twice keeps it once. */
  id: string;
  /** `component.type`: `tabs.valueChange`, `button.click`, `router.navigate`. */
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
  /** The control's own words, as the page shows them: a button's, a link's, a tab's. */
  label?: string;
  /** ISO 8601. */
  time: string;
  url: string;
  /** One visit: a new one after `sessionTimeout` with nothing happening, and with every new tab. */
  sessionId: string;
  /** One browser across visits, with `visitor: true` and consent. */
  visitorId?: string;
}

/** Where a batch goes: `beacon(url)`, `consoleLog()`, or a function that hands it to a vendor's SDK. */
export type AnalyticsTransport = (events: AnalyticsEvent[]) => void;

/** `'pending'` holds what happens in memory and stores nothing; `'denied'` drops it and forgets both ids. */
export type AnalyticsConsent = 'granted' | 'pending' | 'denied';

export interface AnalyticsOptions {
  send: AnalyticsTransport | AnalyticsTransport[];
  /** Default `'granted'`. Start at `'pending'` where a reader in the EU has not answered a consent banner yet. */
  consent?: AnalyticsConsent;
  /** A `visitorId` kept in `localStorage`, written only once consent is granted. Default `false`. */
  visitor?: boolean;
  /** What people typed, pasted or picked as data, toast text and the URL's query and hash. Default `false`. */
  content?: boolean;
  /** Milliseconds with nothing happening before the next event starts a new session. Default 30 minutes. */
  sessionTimeout?: number;
  /** Sent once this many are waiting, or `wait` milliseconds after the first of them. Default 20 and 5000. */
  batch?: { size?: number; wait?: number };
  /** Return `false` to leave an interaction out; it is handed over as `Box.onInteraction` hears it, element and all. */
  filter?: (event: InteractionEvent) => boolean;
  /** What the ids are stored under. Default `'box-kite'`. */
  storageKey?: string;
}

export interface Analytics {
  /** What the reader answered: granting sends what was held, denying drops it and forgets both ids. */
  consent(next: AnalyticsConsent): void;
  /** Send whatever is waiting, now. */
  flush(): void;
  /** Stop listening, after sending whatever is waiting. */
  stop(): void;
}

/** Held in memory while consent is pending; past it, the oldest go first. */
const PENDING_LIMIT = 200;
const MAX_LABEL = 64;
// Text the app wrote rather than text the reader entered or the data shows: everything else needs `content`.
const LABELLED = 'button,a[href],[role=tab],[role=menuitem],[role=menuitemcheckbox],[role=menuitemradio],summary';

function labelOf(target: Element | undefined, content: boolean): string | undefined {
  if (!target || (!content && !target.matches(LABELLED))) return undefined;

  const text = target.getAttribute('aria-label') ?? target.textContent?.trim().replace(/\s+/g, ' ');

  return text ? (text.length > MAX_LABEL ? `${text.slice(0, MAX_LABEL - 1)}…` : text) : undefined;
}

/**
 * `Box.onInteraction`, collected: every interaction as a flat JSON record with a session id, batched, held until consent is
 * granted, and sent as the page is hidden. Framework-free, and inert on a server.
 */
export function createAnalytics(options: AnalyticsOptions): Analytics {
  const { send, visitor = false, content = false, sessionTimeout = DEFAULT_SESSION_TIMEOUT, filter, storageKey = 'box-kite' } = options;
  const size = options.batch?.size ?? 20;
  const wait = options.batch?.wait ?? 5000;
  const transports = Array.isArray(send) ? send : [send];
  if (!hasDocument()) return { consent: () => {}, flush: () => {}, stop: () => {} };

  const identity = createIdentity(storageKey, sessionTimeout);
  let consent = options.consent ?? 'granted';
  // Records with no ids yet: an id is stored, so it is stamped only once storing is allowed.
  let waiting: (Omit<AnalyticsEvent, 'sessionId' | 'time'> & { at: number })[] = [];
  let timer: ReturnType<typeof setTimeout> | undefined;

  const deliver = () => {
    clearTimeout(timer);
    timer = undefined;
    if (consent !== 'granted' || waiting.length === 0) return;

    const visitorId = visitor ? identity.visitor() : undefined;
    const events = waiting.map(({ at, ...record }) => ({
      ...record,
      time: new Date(at).toISOString(),
      sessionId: identity.sessionAt(at),
      ...(visitorId && { visitorId }),
    }));
    waiting = [];

    for (let start = 0; start < events.length; start += size) {
      const chunk = events.slice(start, start + size);
      transports.forEach((transport) => transport(chunk));
    }
  };

  const unsubscribe = subscribeInteractions(
    (event) => {
      if (consent === 'denied' || (filter && !filter(event))) return;

      const record = {
        id: randomId(),
        name: `${event.component}.${event.type}`,
        kind: event.kind,
        component: event.component,
        type: event.type,
        reason: event.reason,
        value: event.value,
        details: event.details,
        source: event.source,
        trigger: event.event?.type,
        label: labelOf(event.target, content),
        url: event.url,
        at: event.time,
      };
      waiting.push(record);
      if (consent === 'pending') {
        if (waiting.length > PENDING_LIMIT) waiting.shift();
      } else if (waiting.length >= size) deliver();
      else timer ??= setTimeout(deliver, wait);
    },
    { content },
  );

  // Hidden is the last moment a page is sure to get, on a phone especially: hand over what the channel holds, then send.
  const hidden = () => {
    if (document.visibilityState !== 'hidden') return;

    flushInteractions();
    deliver();
  };
  const leaving = () => {
    flushInteractions();
    deliver();
  };
  document.addEventListener('visibilitychange', hidden);
  addEventListener('pagehide', leaving);

  return {
    consent(next) {
      consent = next;
      if (next === 'denied') {
        waiting = [];
        identity.forget();
      } else deliver();
    },
    flush: leaving,
    stop() {
      leaving();
      unsubscribe();
      document.removeEventListener('visibilitychange', hidden);
      removeEventListener('pagehide', leaving);
    },
  };
}

/**
 * A batch posted to `url` as `{ "events": [...] }`, with `sendBeacon` so it survives the page closing. The body is JSON
 * sent as `text/plain`, which keeps it a simple request with no preflight, so the collector reads the body as JSON whatever the type.
 */
export function beacon(url: string): AnalyticsTransport {
  return (events) => {
    const body = JSON.stringify({ events });

    if (navigator.sendBeacon?.(url, new Blob([body], { type: 'text/plain;charset=UTF-8' }))) return;
    // Refused when the browser's beacon queue is full; `keepalive` is the same promise, made another way.
    void fetch(url, { method: 'POST', body, keepalive: true, headers: { 'content-type': 'text/plain;charset=UTF-8' } }).catch(() => {});
  };
}

/** Every record to the console, one line each: what a developer reads while building. */
export function consoleLog(prefix = '[interaction]'): AnalyticsTransport {
  return (events) => events.forEach((event) => console.info(prefix, event));
}
