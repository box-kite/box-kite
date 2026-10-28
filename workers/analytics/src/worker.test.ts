// @vitest-environment node
// A Worker has no DOM, and happy-dom's Request drops Origin the way a page would.
import { describe, expect, it, vi } from 'vitest';
import { BLOBS, DataPoint, MAX_EVENTS, toDataPoints } from './events';
import worker from './worker';

const SITE = 'https://www.box-kite.dev';

const view = (overrides: Record<string, unknown> = {}) => ({
  id: 'e1',
  name: 'router.navigate',
  kind: 'custom',
  reason: 'load',
  value: '/components/tabs',
  details: { referrer: 'news.ycombinator.com' },
  url: `${SITE}/components/tabs`,
  time: '2026-10-28T10:00:00.000Z',
  sessionId: 's1',
  ...overrides,
});

const column = (point: DataPoint, name: (typeof BLOBS)[number]) => point.blobs[BLOBS.indexOf(name)];

function post(body: string, origin: string | null = SITE) {
  const writeDataPoint = vi.fn();
  const request = new Request(`${SITE}/api/events`, { method: 'POST', body, headers: origin ? { origin } : {} });
  Object.assign(request, { cf: { country: 'MD' } });

  return { response: worker.fetch(request, { EVENTS: { writeDataPoint }, ORIGINS: SITE }), writeDataPoint };
}

describe('the analytics collector', () => {
  it('stores a page view as its route, its session and where the visit came from', () => {
    const [point] = toDataPoints({ events: [view()] }, 'MD');

    expect(point.indexes).toEqual(['s1']);
    expect(column(point, 'name')).toBe('router.navigate');
    expect(column(point, 'page')).toBe('/components/tabs');
    expect(column(point, 'referrer')).toBe('news.ycombinator.com');
    expect(column(point, 'country')).toBe('MD');
    expect(point.doubles).toEqual([Date.parse('2026-10-28T10:00:00.000Z')]);
  });

  it('files any other record under the page in its URL', () => {
    const [point] = toDataPoints({ events: [view({ name: 'button.click', value: undefined, label: 'Copy', url: `${SITE}/start` })] }, '');

    expect(column(point, 'page')).toBe('/start');
    expect(column(point, 'label')).toBe('Copy');
  });

  it('drops what is not a record and caps what is', () => {
    const many = Array.from({ length: MAX_EVENTS + 10 }, () => view());

    expect(toDataPoints({ events: [null, 'x', view({ sessionId: undefined }), view({ name: 7 })] }, '')).toEqual([]);
    expect(toDataPoints({ events: many }, '')).toHaveLength(MAX_EVENTS);
    expect(column(toDataPoints({ events: [view({ label: 'x'.repeat(500) })] }, '')[0], 'label')).toHaveLength(64);
    expect(toDataPoints('nope', '')).toEqual([]);
  });

  it('writes one point per record from the site, with the country Cloudflare saw', async () => {
    const { response, writeDataPoint } = post(JSON.stringify({ events: [view(), view({ id: 'e2' })] }));

    expect((await response).status).toBe(204);
    expect(writeDataPoint).toHaveBeenCalledTimes(2);
    expect(column(writeDataPoint.mock.calls[0][0], 'country')).toBe('MD');
  });

  it('refuses another origin, a body that is not JSON and anything but a POST', async () => {
    expect((await post(JSON.stringify({ events: [view()] }), 'https://elsewhere.example').response).status).toBe(403);
    expect((await post(JSON.stringify({ events: [view()] }), null).response).status).toBe(403);
    expect((await post('{').response).status).toBe(400);
    expect((await worker.fetch(new Request(`${SITE}/api/events`), { EVENTS: { writeDataPoint: vi.fn() }, ORIGINS: SITE })).status).toBe(
      405,
    );
  });
});
