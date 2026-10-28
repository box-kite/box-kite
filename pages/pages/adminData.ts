import { AdminConfig } from './adminSession';

/** The periods the dashboard offers, in days; the database keeps raw events for 90. */
export const RANGES = [7, 30, 90] as const;
export type Range = (typeof RANGES)[number];

/** The free plan's database size, which every row of analytics counts against. */
export const STORAGE_LIMIT = 500 * 1024 * 1024;

export interface Totals {
  events: number;
  pageViews: number;
  sessions: number;
  visitors: number;
}

/** What `analytics_overview(days)` returns: see the migration under `supabase/migrations/`. */
export interface Overview {
  since: string;
  totals: Totals;
  previous: Totals;
  days: { day: string; pageViews: number; sessions: number; events: number }[];
  pages: { page: string; views: number; sessions: number }[];
  referrers: { referrer: string; sessions: number }[];
  countries: { country: string; sessions: number }[];
  events: { name: string; count: number }[];
  labels: { name: string; label: string; count: number }[];
  storage: { tables: number; database: number };
}

export interface EventRow {
  id: string;
  occurred_at: string;
  name: string;
  page: string;
  session_id: string;
  label: string | null;
  reason: string | null;
  referrer: string | null;
  country: string | null;
}

/** The newest events the table shows; older ones are in the database, a query away. */
export const EVENT_LIMIT = 500;

/** A request the database refused: 401 is a session to renew, 403 an account not on the admin list. */
export class AdminRequestError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(config: AdminConfig, token: string, path: string, init: RequestInit, send: typeof fetch): Promise<T> {
  const response = await send(`${config.url}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: config.key, authorization: `Bearer ${token}`, 'content-type': 'application/json', ...init.headers },
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { message?: string };
    throw new AdminRequestError(response.status, body.message ?? `The request failed with ${response.status}.`);
  }

  return (await response.json()) as T;
}

export function fetchOverview(config: AdminConfig, token: string, days: Range, send: typeof fetch = fetch): Promise<Overview> {
  return request(config, token, 'rpc/analytics_overview', { method: 'POST', body: JSON.stringify({ days }) }, send);
}

export function fetchEvents(config: AdminConfig, token: string, days: Range, now: number, send: typeof fetch = fetch): Promise<EventRow[]> {
  const since = new Date(now - days * 86_400_000).toISOString();
  const query = new URLSearchParams({
    select: 'id,occurred_at,name,page,session_id,label,reason,referrer,country',
    occurred_at: `gte.${since}`,
    order: 'occurred_at.desc',
    limit: String(EVENT_LIMIT),
  });

  return request(config, token, `analytics_events?${query}`, { method: 'GET' }, send);
}

/** The change from the period before as a fraction, or `null` where there was nothing to compare with. */
export function change(current: number, previous: number): number | null {
  return previous > 0 ? (current - previous) / previous : null;
}

/** `+12%`, `−4%`, `0%`: the sign always written, since the number is a comparison. */
export function formatChange(value: number): string {
  const percent = Math.round(value * 100);

  return percent > 0 ? `+${percent}%` : percent < 0 ? `−${Math.abs(percent)}%` : '0%';
}

export function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }

  return `${value >= 10 || unit === 0 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
}

/** Page views per session, to one decimal. */
export function pagesPerSession(totals: Totals): number {
  return totals.sessions > 0 ? Math.round((totals.pageViews / totals.sessions) * 10) / 10 : 0;
}

/** A ranked list's rows with each bar's length as a fraction of the longest, so the top row always fills its track. */
export function ranked<T>(rows: readonly T[], valueOf: (row: T) => number): { row: T; value: number; share: number }[] {
  const top = Math.max(0, ...rows.map(valueOf));

  return rows.map((row) => ({ row, value: valueOf(row), share: top > 0 ? valueOf(row) / top : 0 }));
}

/** One bar per day on a `width` × `height` canvas, with a gap between bars and a floor so a zero still shows a sliver. */
export function dayBars(
  values: readonly number[],
  width: number,
  height: number,
  gap = 2,
): { x: number; y: number; width: number; height: number }[] {
  const top = Math.max(1, ...values);
  const slot = width / Math.max(1, values.length);
  // At most a quarter of the slot, so 90 days of bars stay bars.
  const barWidth = Math.max(1, slot - Math.min(gap, slot / 4));

  return values.map((value, index) => {
    const barHeight = Math.max(value > 0 ? 2 : 1, (value / top) * height);

    return { x: index * slot, y: height - barHeight, width: barWidth, height: barHeight };
  });
}

/** Seeded, so a demo reloads to the same numbers and a test can assert on them. */
function random(seed: number) {
  let state = seed;

  return () => {
    state = (state * 1_103_515_245 + 12_345) % 2 ** 31;

    return state / 2 ** 31;
  };
}

const DEMO_PAGES = [
  '/',
  '/start-with-ai',
  '/datagrid',
  '/dashboard',
  '/box',
  '/installation',
  '/templates',
  '/blog/delete-your-z-index-scale',
  '/dates',
  '/tabs',
];
const DEMO_REFERRERS = ['github.com', 'news.ycombinator.com', 'www.google.com', 'dev.to', 'www.reddit.com', 'x.com'];
const DEMO_COUNTRIES = ['US', 'DE', 'MD', 'GB', 'IN', 'FR', 'SE', 'PL'];
const DEMO_EVENTS = [
  'button.click',
  'link.click',
  'tabs.valueChange',
  'code.copy',
  'menu.select',
  'datagrid.sortChange',
  'dropdown.valueChange',
];
const DEMO_LABELS = ['Copy', 'Get started', 'GitHub', 'Install', 'Preview', 'Code', 'Next'];

/** What `?demo` shows: the shape a real overview has, so the dashboard can be looked at before there is a project. */
export function demoOverview(days: Range, now: number): Overview {
  const next = random(days);
  const series = Array.from({ length: days + 1 }, (_, index) => {
    const day = new Date(now - (days - index) * 86_400_000).toISOString().slice(0, 10);
    const sessions = Math.round(60 + index * 1.5 + next() * 50 + (new Date(day).getUTCDay() % 6 === 0 ? -30 : 0));
    const pageViews = Math.round(sessions * (2.2 + next()));

    return { day, sessions, pageViews, events: Math.round(pageViews * (2.5 + next())) };
  });
  const sum = (key: 'pageViews' | 'sessions' | 'events') => series.reduce((total, day) => total + day[key], 0);
  const totals = { events: sum('events'), pageViews: sum('pageViews'), sessions: sum('sessions'), visitors: 0 };
  const share = (count: number, index: number, total: number) =>
    Math.round((total * 0.45) / (index + 1) ** 0.9) + Math.round(next() * count);

  return {
    since: new Date(now - days * 86_400_000).toISOString(),
    totals,
    previous: {
      events: Math.round(totals.events * 0.86),
      pageViews: Math.round(totals.pageViews * 0.82),
      sessions: Math.round(totals.sessions * 0.9),
      visitors: 0,
    },
    days: series,
    pages: DEMO_PAGES.map((page, index) => ({
      page,
      views: share(5, index, totals.pageViews),
      sessions: share(3, index, totals.sessions),
    })),
    referrers: DEMO_REFERRERS.map((referrer, index) => ({ referrer, sessions: share(4, index, totals.sessions * 0.4) })),
    countries: DEMO_COUNTRIES.map((country, index) => ({ country, sessions: share(4, index, totals.sessions) })),
    events: DEMO_EVENTS.map((name, index) => ({ name, count: share(9, index, totals.events * 0.6) })),
    labels: DEMO_LABELS.map((label, index) => ({
      name: index % 2 ? 'link.click' : 'button.click',
      label,
      count: share(6, index, totals.events * 0.2),
    })),
    storage: { tables: 38 * 1024 * 1024, database: 52 * 1024 * 1024 },
  };
}

export function demoEvents(now: number): EventRow[] {
  const next = random(7);

  return Array.from({ length: 120 }, (_, index) => {
    const navigate = next() < 0.4;
    const page = DEMO_PAGES[Math.floor(next() * DEMO_PAGES.length)];

    return {
      id: `demo-${index}`,
      occurred_at: new Date(now - index * 97_000).toISOString(),
      name: navigate ? 'router.navigate' : DEMO_EVENTS[Math.floor(next() * DEMO_EVENTS.length)],
      page,
      session_id: `s${Math.floor(index / 6)}`,
      label: navigate ? null : DEMO_LABELS[Math.floor(next() * DEMO_LABELS.length)],
      reason: navigate ? (index % 6 === 5 ? 'load' : 'route') : 'click',
      referrer: navigate && index % 6 === 5 ? DEMO_REFERRERS[index % DEMO_REFERRERS.length] : null,
      country: DEMO_COUNTRIES[Math.floor(index / 6) % DEMO_COUNTRIES.length],
    };
  });
}

/** `MD` → `Moldova`, in English; a code `Intl` does not know is shown as it came. */
export function countryName(code: string): string {
  try {
    return new Intl.DisplayNames('en', { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
}
