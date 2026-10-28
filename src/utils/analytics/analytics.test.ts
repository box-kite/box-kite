import { afterEach, describe, expect, it, vi } from 'vitest';
import { emitInteraction, flushInteractions, reportInteraction } from '../interactions/interactionChannel';
import { Analytics, AnalyticsEvent, AnalyticsOptions, beacon, consoleLog, createAnalytics } from './analytics';

describe('createAnalytics', () => {
  let running: Analytics[] = [];

  /** Analytics sending into an array, with the channel's delivery half loaded. */
  async function collect(options: Partial<AnalyticsOptions> = {}) {
    const sent: AnalyticsEvent[][] = [];
    const analytics = createAnalytics({ send: (events) => sent.push(events), ...options });
    running.push(analytics);
    await vi.dynamicImportSettled();

    return { analytics, sent, all: () => sent.flat() };
  }

  afterEach(() => {
    running.forEach((analytics) => analytics.stop());
    running = [];
    sessionStorage.clear();
    localStorage.clear();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    document.body.replaceChildren();
  });

  it('turns an interaction into a flat JSON record with an id, a session and an ISO time', async () => {
    const { analytics, all } = await collect();

    emitInteraction({ component: 'dialog', type: 'openChange', reason: 'escape', value: false, event: new KeyboardEvent('keydown') });
    analytics.flush();

    const [record] = all();
    expect(record).toEqual({
      id: expect.stringMatching(/^[0-9a-f-]{36}$/),
      name: 'dialog.openChange',
      kind: 'change',
      component: 'dialog',
      type: 'openChange',
      reason: 'escape',
      value: false,
      source: 'user',
      trigger: 'keydown',
      time: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      url: location.href.split(/[?#]/)[0],
      sessionId: expect.stringMatching(/^[0-9a-f-]{36}$/),
    });
    expect(JSON.parse(JSON.stringify(record))).toEqual(record);
  });

  it('labels a press by the words on the control, and never by what a cell or a field holds', async () => {
    const { analytics, all } = await collect();
    document.body.innerHTML = '<button><span>Save   draft</span></button><div role="gridcell" tabindex="-1">ada@example.com</div>';
    const [button, cell] = document.body.children;

    reportInteraction({ component: 'cta', type: 'press', target: button });
    reportInteraction({ component: 'datagrid', type: 'press', target: cell });
    analytics.flush();

    expect(all().map(({ label }) => label)).toEqual(['Save draft', undefined]);
  });

  it('keeps one session across events and a reload, and starts another after the timeout', async () => {
    const { analytics, all } = await collect({ sessionTimeout: 60_000 });
    vi.useFakeTimers({ toFake: ['Date'] });

    reportInteraction({ component: 'router', type: 'navigate', value: '/' });
    reportInteraction({ component: 'router', type: 'navigate', value: '/a' });
    analytics.flush();
    analytics.stop();

    // A reload is a new instance reading the same tab's storage.
    const reloaded = await collect({ sessionTimeout: 60_000 });
    reportInteraction({ component: 'router', type: 'navigate', value: '/b' });
    reloaded.analytics.flush();
    vi.setSystemTime(Date.now() + 61_000);
    reportInteraction({ component: 'router', type: 'navigate', value: '/c' });
    reloaded.analytics.flush();

    const [first, second] = all();
    const [third, fourth] = reloaded.all();
    expect(second.sessionId).toBe(first.sessionId);
    expect(third.sessionId).toBe(first.sessionId);
    expect(fourth.sessionId).not.toBe(first.sessionId);
  });

  it('keeps a visitor id only when asked, in localStorage, the same across sessions', async () => {
    const plain = await collect();
    reportInteraction({ component: 'router', type: 'navigate' });
    plain.analytics.flush();
    expect(plain.all()[0]).not.toHaveProperty('visitorId');
    expect(localStorage.length).toBe(0);
    plain.analytics.stop();

    const first = await collect({ visitor: true });
    reportInteraction({ component: 'router', type: 'navigate' });
    first.analytics.flush();
    first.analytics.stop();
    sessionStorage.clear();
    const second = await collect({ visitor: true });
    reportInteraction({ component: 'router', type: 'navigate' });
    second.analytics.flush();

    expect(first.all()[0].visitorId).toEqual(expect.any(String));
    expect(second.all()[0].visitorId).toBe(first.all()[0].visitorId);
    expect(second.all()[0].sessionId).not.toBe(first.all()[0].sessionId);
  });

  it('holds everything, and stores nothing, until consent is granted', async () => {
    const { analytics, all } = await collect({ consent: 'pending', visitor: true });

    reportInteraction({ component: 'router', type: 'navigate', value: '/' });
    analytics.flush();
    expect(all()).toEqual([]);
    expect(sessionStorage.length + localStorage.length).toBe(0);

    analytics.consent('granted');
    expect(all().map(({ value }) => value)).toEqual(['/']);
    expect(all()[0].visitorId).toEqual(expect.any(String));
  });

  it('drops what it held and forgets both ids when consent is denied', async () => {
    const { analytics, all } = await collect({ visitor: true });
    reportInteraction({ component: 'router', type: 'navigate', value: '/' });
    analytics.flush();
    expect(localStorage.length).toBe(1);

    analytics.consent('denied');
    reportInteraction({ component: 'router', type: 'navigate', value: '/a' });
    analytics.flush();

    expect(all()).toHaveLength(1);
    expect(sessionStorage.length + localStorage.length).toBe(0);
  });

  it('leaves content out unless asked for it', async () => {
    const plain = await collect();
    const full = await collect({ content: true });

    emitInteraction({ component: 'datagrid', type: 'globalFilterChange', reason: 'filter', value: 'ada@', content: ['value'] });
    plain.analytics.flush();
    full.analytics.flush();

    expect(plain.all()[0].value).toBeUndefined();
    expect(full.all()[0].value).toBe('ada@');
  });

  it('sends a batch when it is full, and the rest once the wait is over', async () => {
    const { sent } = await collect({ batch: { size: 2, wait: 1000 } });
    vi.useFakeTimers();

    for (const value of ['a', 'b', 'c']) reportInteraction({ component: 'step', type: 'view', value });
    flushInteractions();
    expect(sent.map((batch) => batch.map(({ value }) => value))).toEqual([['a', 'b']]);

    vi.advanceTimersByTime(1000);
    expect(sent.map((batch) => batch.map(({ value }) => value))).toEqual([['a', 'b'], ['c']]);
  });

  it('sends what is waiting as the page is hidden, before a background task would run', async () => {
    const { all } = await collect();

    reportInteraction({ component: 'cta', type: 'press' });
    dispatchEvent(new Event('pagehide'));

    expect(all().map(({ name }) => name)).toEqual(['cta.press']);
  });

  it('leaves out what the filter refuses', async () => {
    const { analytics, all } = await collect({ filter: (event) => event.component !== 'toaster' });

    emitInteraction({ component: 'toaster', type: 'show' });
    emitInteraction({ component: 'tabs', type: 'valueChange', value: 'a' });
    analytics.flush();

    expect(all().map(({ name }) => name)).toEqual(['tabs.valueChange']);
  });

  it('is inert on a server', () => {
    vi.stubGlobal('document', undefined);
    const send = vi.fn();

    const analytics = createAnalytics({ send });
    analytics.flush();
    analytics.consent('granted');
    analytics.stop();

    expect(send).not.toHaveBeenCalled();
  });
});

describe('transports', () => {
  const event = { id: '1', name: 'tabs.valueChange' } as AnalyticsEvent;

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('beacons a batch as JSON in a simple request, falling back to a keepalive fetch', async () => {
    const sendBeacon = vi.fn().mockReturnValueOnce(true).mockReturnValueOnce(false);
    const fetch = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { sendBeacon });
    vi.stubGlobal('fetch', fetch);

    beacon('/collect')([event]);
    beacon('/collect')([event]);

    const blob = sendBeacon.mock.calls[0][1] as Blob;
    expect(sendBeacon.mock.calls[0][0]).toBe('/collect');
    expect(blob.type).toBe('text/plain;charset=utf-8');
    expect(JSON.parse(await blob.text())).toEqual({ events: [event] });
    expect(fetch).toHaveBeenCalledWith('/collect', expect.objectContaining({ method: 'POST', keepalive: true }));
  });

  it('logs a record a line', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);

    consoleLog()([event, event]);

    expect(info).toHaveBeenCalledTimes(2);
    expect(info).toHaveBeenCalledWith('[interaction]', event);
  });
});
