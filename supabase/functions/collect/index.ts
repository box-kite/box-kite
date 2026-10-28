/** What the collector needs from its environment: Supabase injects the first two into every Edge Function. */
export interface CollectorEnv {
  SUPABASE_URL: string;
  /** The legacy `service_role` JWT or a new `sb_secret_…` key; `ANALYTICS_WRITE_KEY` overrides it. */
  SUPABASE_SERVICE_ROLE_KEY: string;
  /** Comma-separated origins allowed to post. */
  ANALYTICS_ORIGINS?: string;
}

/** One `analytics_events` row. Anyone can post to a collector, so every field is checked and capped first. */
export interface EventRow {
  id: string;
  occurred_at: string;
  name: string;
  page: string;
  session_id: string;
  visitor_id: string | null;
  reason: string | null;
  label: string | null;
  referrer: string | null;
  country: string | null;
  data: Record<string, unknown>;
}

export const DEFAULT_ORIGINS = 'https://www.box-kite.dev,https://box-kite.dev';
/** A batch is 20 records; more than this in one request is not the site's beacon. */
export const MAX_EVENTS = 50;
export const MAX_BODY = 64 * 1024;
/** A client clock further off than this is not believed. */
const MAX_SKEW = 24 * 60 * 60 * 1000;
const MAX_DATA = 4096;

const text = (value: unknown, max: number) => (typeof value === 'string' ? value.slice(0, max) : '');
const optional = (value: unknown, max: number) => text(value, max) || null;

function pathOf(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return '';
  }
}

/** The `{ events }` body `beacon()` posts, as rows; a record with no id, name or session is dropped. */
export function toRows(body: unknown, country: string, now: number): EventRow[] {
  const events = (body as { events?: unknown } | null)?.events;
  if (!Array.isArray(events)) return [];

  return events.slice(0, MAX_EVENTS).flatMap((event): EventRow[] => {
    if (!event || typeof event !== 'object') return [];

    const record = event as Record<string, unknown>;
    const id = text(record.id, 64);
    const name = text(record.name, 96);
    const sessionId = text(record.sessionId, 64);
    if (!id || !name || !sessionId) return [];

    const details = (record.details && typeof record.details === 'object' ? record.details : {}) as Record<string, unknown>;
    const sent = Date.parse(text(record.time, 32));
    const data = {
      kind: record.kind,
      component: record.component,
      type: record.type,
      value: record.value,
      details,
      source: record.source,
      trigger: record.trigger,
    };
    const json = JSON.stringify(data);

    return [
      {
        id,
        occurred_at: new Date(Math.abs(sent - now) <= MAX_SKEW ? sent : now).toISOString(),
        name,
        // A page view's value is the route it arrived at; anything else happened on the page in its URL.
        page: name === 'router.navigate' ? text(record.value, 512) : pathOf(text(record.url, 2048)),
        session_id: sessionId,
        visitor_id: optional(record.visitorId, 64),
        reason: optional(record.reason, 64),
        label: optional(record.label, 64),
        referrer: optional(details.referrer, 256),
        country: country.slice(0, 8) || null,
        data: json.length <= MAX_DATA ? data : { kind: record.kind, truncated: true },
      },
    ];
  });
}

/** The collector `beacon()` posts the site's records to: each one becomes an `analytics_events` row. */
export async function collect(request: Request, env: CollectorEnv, send: typeof fetch = fetch): Promise<Response> {
  const origin = request.headers.get('origin') ?? '';
  const allowed = (env.ANALYTICS_ORIGINS ?? DEFAULT_ORIGINS).split(',').map((entry) => entry.trim());
  const cors = { 'access-control-allow-origin': origin, vary: 'origin' };

  if (request.method !== 'POST') return new Response(null, { status: 405, headers: { allow: 'POST' } });
  // A browser always sends Origin on a POST, a beacon included; this keeps other sites out, not a determined script.
  if (!allowed.includes(origin)) return new Response(null, { status: 403 });

  const body = await request.text();
  if (body.length > MAX_BODY) return new Response(null, { status: 413, headers: cors });

  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return new Response(null, { status: 400, headers: cors });
  }

  const rows = toRows(parsed, request.headers.get('cf-ipcountry') ?? '', Date.now());
  if (rows.length === 0) return new Response(null, { status: 204, headers: cors });

  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  const stored = await send(`${env.SUPABASE_URL}/rest/v1/analytics_events?on_conflict=id`, {
    method: 'POST',
    headers: {
      apikey: key,
      // A legacy key is a JWT and goes in both headers; a new secret key goes in `apikey` alone.
      ...(key.startsWith('eyJ') && { authorization: `Bearer ${key}` }),
      'content-type': 'application/json',
      prefer: 'resolution=ignore-duplicates,return=minimal',
    },
    body: JSON.stringify(rows),
  });
  if (!stored.ok) console.error('analytics_events insert failed', stored.status, await stored.text());

  return new Response(null, { status: stored.ok ? 204 : 502, headers: cors });
}

declare const Deno:
  { serve(handler: (request: Request) => Promise<Response>): void; env: { get(name: string): string | undefined } } | undefined;

if (typeof Deno !== 'undefined') {
  const env = Deno.env;
  Deno.serve((request) =>
    collect(request, {
      SUPABASE_URL: env.get('SUPABASE_URL') ?? '',
      SUPABASE_SERVICE_ROLE_KEY: env.get('ANALYTICS_WRITE_KEY') ?? env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      ANALYTICS_ORIGINS: env.get('ANALYTICS_ORIGINS'),
    }),
  );
}
