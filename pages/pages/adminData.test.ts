import { describe, expect, it, vi } from 'vitest';
import {
  AdminRequestError,
  change,
  dayBars,
  demoEvents,
  demoOverview,
  fetchEvents,
  fetchOverview,
  formatBytes,
  formatChange,
  pagesPerSession,
  ranked,
} from './adminData';

const CONFIG = { url: 'https://ref.supabase.co', key: 'sb_publishable_x' };
const NOW = Date.parse('2026-10-28T12:00:00Z');

describe('the admin data', () => {
  it('asks for the overview as the signed-in account', async () => {
    const send = vi.fn().mockResolvedValue(Response.json({ totals: {} }));
    await fetchOverview(CONFIG, 'token', 30, send);

    const [url, init] = send.mock.calls[0];
    expect(url).toBe('https://ref.supabase.co/rest/v1/rpc/analytics_overview');
    expect(init.headers).toMatchObject({ apikey: 'sb_publishable_x', authorization: 'Bearer token' });
    expect(JSON.parse(init.body)).toEqual({ days: 30 });
  });

  it('asks for the newest events of the period, newest first', async () => {
    const send = vi.fn().mockResolvedValue(Response.json([]));
    await fetchEvents(CONFIG, 'token', 7, NOW, send);

    const url = new URL(send.mock.calls[0][0]);
    expect(url.pathname).toBe('/rest/v1/analytics_events');
    expect(url.searchParams.get('occurred_at')).toBe('gte.2026-10-21T12:00:00.000Z');
    expect(url.searchParams.get('order')).toBe('occurred_at.desc');
  });

  it('turns a refusal into an error that carries its status and the database’s message', async () => {
    const send = vi.fn().mockResolvedValue(Response.json({ message: 'Not on the analytics admin list' }, { status: 403 }));

    await expect(fetchOverview(CONFIG, 'token', 7, send)).rejects.toEqual(new AdminRequestError(403, 'Not on the analytics admin list'));
    await expect(fetchOverview(CONFIG, 'token', 7, send)).rejects.toMatchObject({ status: 403 });
  });

  it('compares with the period before, and says nothing when there was none', () => {
    expect(change(120, 100)).toBeCloseTo(0.2);
    expect(change(5, 0)).toBeNull();
    expect(formatChange(0.2)).toBe('+20%');
    expect(formatChange(-0.04)).toBe('−4%');
    expect(formatChange(0.001)).toBe('0%');
  });

  it('writes sizes and ratios the way a person reads them', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(38 * 1024 * 1024)).toBe('38 MB');
    expect(pagesPerSession({ events: 0, pageViews: 25, sessions: 10, visitors: 0 })).toBe(2.5);
    expect(pagesPerSession({ events: 0, pageViews: 0, sessions: 0, visitors: 0 })).toBe(0);
  });

  it('scales a ranked list to its longest row', () => {
    expect(ranked([{ n: 10 }, { n: 5 }, { n: 0 }], (row) => row.n).map((entry) => entry.share)).toEqual([1, 0.5, 0]);
    expect(ranked([], () => 0)).toEqual([]);
  });

  it('draws a day as a bar from the floor, and a quiet day as a sliver', () => {
    const [full, half, none] = dayBars([10, 5, 0], 30, 100);

    expect(full).toEqual({ x: 0, y: 0, width: 8, height: 100 });
    expect(half).toEqual({ x: 10, y: 50, width: 8, height: 50 });
    expect(none.height).toBe(1);
  });

  it('makes demo data shaped like the real thing, the same on every load', () => {
    const overview = demoOverview(30, NOW);

    expect(overview.days).toHaveLength(31);
    expect(overview.totals.pageViews).toBe(overview.days.reduce((total, day) => total + day.pageViews, 0));
    expect(demoOverview(30, NOW)).toEqual(overview);
    expect(demoEvents(NOW)[0]).toMatchObject({ id: 'demo-0', occurred_at: '2026-10-28T12:00:00.000Z' });
  });
});
