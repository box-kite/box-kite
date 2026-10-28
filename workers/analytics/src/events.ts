/** One row of the `box_kite_events` dataset. Anyone can post to a collector, so every field is checked and capped first. */
export interface DataPoint {
  blobs: string[];
  doubles: number[];
  indexes: string[];
}

/** What the report reads each blob as. Append only: a stored point keeps its positions, so a new column goes at the end. */
export const BLOBS = ['name', 'page', 'sessionId', 'reason', 'label', 'from', 'referrer', 'country', 'visitorId', 'id'] as const;

/** A batch is 20 records; more than this in one request is not the site's beacon. */
export const MAX_EVENTS = 50;
export const MAX_BODY = 64 * 1024;

const text = (value: unknown, max: number) => (typeof value === 'string' ? value.slice(0, max) : '');

function pathOf(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return '';
  }
}

/** The `{ events }` body `beacon()` posts, as data points; a record with no name or no session is dropped. */
export function toDataPoints(body: unknown, country: string): DataPoint[] {
  const events = (body as { events?: unknown } | null)?.events;
  if (!Array.isArray(events)) return [];

  return events.slice(0, MAX_EVENTS).flatMap((event): DataPoint[] => {
    if (!event || typeof event !== 'object') return [];

    const record = event as Record<string, unknown>;
    const name = text(record.name, 96);
    const sessionId = text(record.sessionId, 64);
    if (!name || !sessionId) return [];

    const details = (record.details && typeof record.details === 'object' ? record.details : {}) as Record<string, unknown>;
    // A page view's value is the route it arrived at; anything else happened on the page in its URL.
    const page = name === 'router.navigate' ? text(record.value, 512) : pathOf(text(record.url, 2048));
    const fields: Record<(typeof BLOBS)[number], string> = {
      name,
      page,
      sessionId,
      reason: text(record.reason, 64),
      label: text(record.label, 64),
      from: text(details.from, 512),
      referrer: text(details.referrer, 256),
      country: country.slice(0, 8),
      visitorId: text(record.visitorId, 64),
      id: text(record.id, 64),
    };

    // The client's time, since every point in one request gets the same server timestamp and a session's order would be lost.
    return [{ indexes: [sessionId], blobs: BLOBS.map((key) => fields[key]), doubles: [Date.parse(text(record.time, 32)) || 0] }];
  });
}
