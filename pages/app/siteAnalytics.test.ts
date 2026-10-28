import { afterEach, describe, expect, it, vi } from 'vitest';
import Box from '../../src/box';
import { isAdminUrl, LOG_FLAG, logRequested, referrerHost } from './siteAnalytics';

const CHANNEL = Symbol.for('box-kite.interactions@2');
const listeners = () => (globalThis as Record<symbol, { listeners: Map<unknown, unknown> } | undefined>)[CHANNEL]?.listeners.size ?? 0;

/** The module holds whether it started, so each test gets its own copy. */
async function freshSite() {
  vi.resetModules();

  return import('./siteAnalytics');
}

describe('the site analytics', () => {
  afterEach(() => {
    sessionStorage.clear();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    Box.configure({ componentAttribute: false });
    document.body.replaceChildren();
  });

  it('keeps ?interactions for the rest of the tab', () => {
    expect(logRequested('')).toBe(false);
    expect(logRequested(`?${LOG_FLAG}`)).toBe(true);
    expect(logRequested('')).toBe(true);
  });

  it('names where a visit came from by host alone, and not when it came from this site', () => {
    expect(referrerHost('https://news.ycombinator.com/item?id=1#top', 'www.box-kite.dev')).toBe('news.ycombinator.com');
    expect(referrerHost('https://box-kite.dev/start', 'www.box-kite.dev')).toBeUndefined();
    expect(referrerHost('https://www.box-kite.dev/', 'www.box-kite.dev')).toBeUndefined();
    expect(referrerHost('', 'www.box-kite.dev')).toBeUndefined();
  });

  it('counts nothing that happens on the admin dashboard', () => {
    expect(isAdminUrl('https://www.box-kite.dev/admin/')).toBe(true);
    expect(isAdminUrl('https://www.box-kite.dev/admin')).toBe(true);
    expect(isAdminUrl('https://www.box-kite.dev/administration')).toBe(false);
    expect(isAdminUrl('https://www.box-kite.dev/dashboard/')).toBe(false);
  });

  it('listens to nothing with no collector and no log, so the page loads nothing for it', async () => {
    const before = listeners();
    const site = await freshSite();

    site.startSiteAnalytics(undefined, false);

    expect(listeners()).toBe(before);
  });

  it('beacons to the collector the build names, with a session on every record', async () => {
    const sendBeacon = vi.fn().mockReturnValue(true);
    vi.stubGlobal('navigator', { ...navigator, sendBeacon });
    const site = await freshSite();
    site.startSiteAnalytics('https://collect.example/events', false);
    await vi.dynamicImportSettled();

    Box.reportInteraction({ component: 'router', type: 'navigate', reason: 'load', value: '/' });
    dispatchEvent(new Event('pagehide'));

    expect(sendBeacon).toHaveBeenCalledWith('https://collect.example/events', expect.any(Blob));
    const { events } = JSON.parse(await (sendBeacon.mock.calls.at(-1)![1] as Blob).text());
    expect(events).toEqual([expect.objectContaining({ name: 'router.navigate', value: '/', sessionId: expect.any(String) })]);
  });

  it('logs a press as the change it made, and a press that changed nothing as itself', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    Box.configure({ componentAttribute: true });
    const site = await freshSite();
    site.startSiteAnalytics(undefined, true);
    await vi.dynamicImportSettled();

    const tab = document.createElement('button');
    tab.setAttribute('data-bk', 'tabs.tab');
    tab.textContent = 'Activity';
    tab.addEventListener('click', () =>
      Box.reportInteraction({ component: 'tabs', type: 'valueChange', reason: 'click', value: 'activity', details: { from: 'overview' } }),
    );
    const save = document.createElement('button');
    save.setAttribute('data-bk', 'button');
    save.textContent = 'Save';
    document.body.append(tab, save);

    tab.click();
    save.click();
    Box.flushInteractions();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(info.mock.calls).toEqual([
      [
        '[interaction]',
        expect.objectContaining({ name: 'tabs.valueChange', trigger: 'click', label: 'Activity', details: { from: 'overview' } }),
      ],
      ['[interaction]', expect.objectContaining({ name: 'button.click', trigger: 'click', label: 'Save', details: { interactive: true } })],
    ]);
  });
});
