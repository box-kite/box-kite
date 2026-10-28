// @vitest-environment node
// A browser Request drops `Origin`, which is a forbidden header there; the collector runs on a server.
import { describe, expect, it, vi } from 'vitest';
import { collect, CollectorEnv, MAX_BODY, MAX_EVENTS, toRows } from './index';

const NOW = Date.parse('2026-10-28T12:00:00.000Z');
const ORIGIN = 'https://www.box-kite.dev';
const ENV: CollectorEnv = { SUPABASE_URL: 'https://ref.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'eyJservice' };

const record = (overrides: Record<string, unknown> = {}) => ({
  id: 'e1',
  name: 'router.navigate',
  kind: 'custom',
  component: 'router',
  type: 'navigate',
  reason: 'load',
  value: '/dashboard',
  details: { from: undefined, referrer: 'news.ycombinator.com' },
  source: 'app',
  time: '2026-10-28T11:59:58.000Z',
  url: 'https://www.box-kite.dev/dashboard/',
  sessionId: 's1',
  ...overrides,
});

const post = (body: string, origin = ORIGIN, method = 'POST') =>
  new Request('https://ref.supabase.co/functions/v1/collect', { method, body: method === 'POST' ? body : undefined, headers: { origin } });

describe('toRows', () => {
  it('maps a page view to its route, its referrer and the client time', () => {
    const [row] = toRows({ events: [record()] }, 'MD', NOW);

    expect(row).toMatchObject({
      id: 'e1',
      name: 'router.navigate',
      page: '/dashboard',
      session_id: 's1',
      reason: 'load',
      referrer: 'news.ycombinator.com',
      country: 'MD',
      occurred_at: '2026-10-28T11:59:58.000Z',
    });
    expect(row.data).toMatchObject({ component: 'router', type: 'navigate', value: '/dashboard' });
  });

  it('puts anything else on the page in its URL, without the query', () => {
    const [row] = toRows(
      { events: [record({ name: 'button.click', value: undefined, url: 'https://www.box-kite.dev/tabs/?a=1#b' })] },
      '',
      NOW,
    );

    expect(row.page).toBe('/tabs/');
    expect(row.country).toBeNull();
  });

  it('drops a record with no id, name or session, and anything past the batch limit', () => {
    expect(toRows({ events: [record({ id: '' }), record({ name: 3 }), record({ sessionId: undefined }), null, 'x'] }, '', NOW)).toEqual([]);
    expect(toRows({ events: Array.from({ length: MAX_EVENTS + 10 }, (_, i) => record({ id: `e${i}` })) }, '', NOW)).toHaveLength(
      MAX_EVENTS,
    );
    expect(toRows({ nope: [] }, '', NOW)).toEqual([]);
  });

  it('caps every field, and does not believe a clock a day off', () => {
    const [row] = toRows(
      { events: [record({ label: 'x'.repeat(500), time: '2020-01-01T00:00:00Z', value: { huge: 'y'.repeat(9000) } })] },
      '',
      NOW,
    );

    expect(row.label).toHaveLength(64);
    expect(row.occurred_at).toBe(new Date(NOW).toISOString());
    expect(row.data).toEqual({ kind: 'custom', truncated: true });
  });
});

describe('collect', () => {
  it('writes the rows as the service role, ignoring a batch it has seen before', async () => {
    const send = vi.fn().mockResolvedValue(new Response(null, { status: 201 }));
    const response = await collect(post(JSON.stringify({ events: [record()] })), ENV, send);

    expect(response.status).toBe(204);
    const [url, init] = send.mock.calls[0];
    expect(url).toBe('https://ref.supabase.co/rest/v1/analytics_events?on_conflict=id');
    expect(init.headers).toMatchObject({
      apikey: 'eyJservice',
      authorization: 'Bearer eyJservice',
      prefer: 'resolution=ignore-duplicates,return=minimal',
    });
    expect(JSON.parse(init.body)).toHaveLength(1);
  });

  it('sends a new secret key in apikey alone', async () => {
    const send = vi.fn().mockResolvedValue(new Response(null, { status: 201 }));
    await collect(post(JSON.stringify({ events: [record()] })), { ...ENV, SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_x' }, send);

    expect(send.mock.calls[0][1].headers).not.toHaveProperty('authorization');
  });

  it('refuses another origin, a GET, a body too big and one that is not JSON', async () => {
    const send = vi.fn();

    expect((await collect(post('{}', 'https://evil.example'), ENV, send)).status).toBe(403);
    expect((await collect(post('', ORIGIN, 'GET'), ENV, send)).status).toBe(405);
    expect((await collect(post('x'.repeat(MAX_BODY + 1)), ENV, send)).status).toBe(413);
    expect((await collect(post('not json'), ENV, send)).status).toBe(400);
    expect(send).not.toHaveBeenCalled();
  });

  it('takes its origins from the environment', async () => {
    const send = vi.fn().mockResolvedValue(new Response(null, { status: 201 }));
    const env = { ...ENV, ANALYTICS_ORIGINS: 'http://localhost:5173' };

    expect((await collect(post(JSON.stringify({ events: [record()] }), 'http://localhost:5173'), env, send)).status).toBe(204);
    expect((await collect(post('{}'), env, send)).status).toBe(403);
  });

  it('answers 502 when the database refuses the rows', async () => {
    const send = vi.fn().mockResolvedValue(new Response('nope', { status: 500 }));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    expect((await collect(post(JSON.stringify({ events: [record()] })), ENV, send)).status).toBe(502);
  });
});
