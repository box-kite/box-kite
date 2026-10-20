import { afterEach, describe, expect, it, vi } from 'vitest';
import { marksComponents, setComponentAttribute } from './componentAttribute';
import { emitInteraction, flushInteractions, InteractionEvent, reportInteraction, subscribeInteractions } from './interactionChannel';

const CHANNEL = Symbol.for('box-kite.interactions@1');
const original = (globalThis as Record<symbol, unknown>)[CHANNEL];

/** A channel nobody has listened on yet, which is the only state the early buffer is about. */
async function freshChannel() {
  delete (globalThis as Record<symbol, unknown>)[CHANNEL];
  vi.resetModules();

  return import('./interactionChannel');
}

describe('interaction channel', () => {
  const unsubscribers: (() => void)[] = [];
  const listen = (listener: (event: InteractionEvent) => void) => unsubscribers.push(subscribeInteractions(listener));

  afterEach(() => {
    flushInteractions();
    (globalThis as Record<symbol, unknown>)[CHANNEL] = original;
    unsubscribers.splice(0).forEach((unsubscribe) => unsubscribe());
    setComponentAttribute(false);
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    document.body.replaceChildren();
  });

  it('never calls a listener inside the handler that emitted: delivery is a later task', async () => {
    const heard = vi.fn();
    listen(heard);

    emitInteraction({ component: 'dialog', type: 'openChange', reason: 'trigger', value: true });
    expect(heard).not.toHaveBeenCalled();

    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(heard).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'change', component: 'dialog', type: 'openChange', reason: 'trigger', value: true, source: 'user' }),
    );
  });

  it('delivers a batch in order, once, with each time taken when it happened', () => {
    const heard = vi.fn();
    listen(heard);
    const before = Date.now();

    emitInteraction({ component: 'menu.item', type: 'select' });
    emitInteraction({ component: 'menu', type: 'openChange', value: false });
    flushInteractions();
    flushInteractions();

    expect(heard.mock.calls.map(([event]) => event.component)).toEqual(['menu.item', 'menu']);
    expect(heard.mock.calls[0][0].timeStamp).toBeLessThanOrEqual(heard.mock.calls[1][0].timeStamp);
    expect(heard.mock.calls[0][0].time).toBeGreaterThanOrEqual(before);
  });

  it('hands every listener the event until it unsubscribes', () => {
    const first = vi.fn();
    const second = vi.fn();
    listen(first);
    const stop = subscribeInteractions(second);

    emitInteraction({ component: 'dialog', type: 'openChange', reason: 'trigger', value: true });
    flushInteractions();
    stop();
    emitInteraction({ component: 'dialog', type: 'openChange', reason: 'escape', value: false });
    flushInteractions();

    expect(first).toHaveBeenCalledTimes(2);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("tells a component's change from the app's own report", () => {
    const heard = vi.fn();
    listen(heard);

    emitInteraction({ component: 'tabs', type: 'valueChange', value: 'a' });
    reportInteraction({ component: 'router', type: 'navigate', value: '/pricing' });
    flushInteractions();

    expect(heard.mock.calls.map(([event]) => [event.kind, event.component])).toEqual([
      ['change', 'tabs'],
      ['custom', 'router'],
    ]);
  });

  it('says the app did it when the reason is a call or a timer, and lets a caller say so itself', () => {
    const heard = vi.fn();
    listen(heard);

    emitInteraction({ component: 'dialog', type: 'openChange', reason: 'imperative', value: false });
    emitInteraction({ component: 'toaster', type: 'dismiss', reason: 'timeout' });
    emitInteraction({ component: 'toaster', type: 'show', reason: 'success', source: 'app' });
    emitInteraction({ component: 'toaster', type: 'dismiss', reason: 'close' });
    flushInteractions();

    expect(heard.mock.calls.map(([event]) => event.source)).toEqual(['app', 'app', 'app', 'user']);
  });

  it('hands over plain JSON, whatever the component held', () => {
    const heard = vi.fn();
    listen(heard);
    const cycle: Record<string, unknown> = { name: 'loop' };
    cycle.self = cycle;

    emitInteraction({
      component: 'datagrid',
      type: 'copy',
      value: { startRow: 0, columns: ['a'], values: () => [['x']] },
      details: { at: new Date(Date.UTC(2026, 9, 20)), element: { $$typeof: Symbol.for('react.element') }, cycle, node: document.body },
    });
    emitInteraction({ component: 'tabs', type: 'valueChange', value: 'a', details: {} });
    flushInteractions();

    expect(heard.mock.calls[0][0].value).toEqual({ startRow: 0, columns: ['a'] });
    expect(heard.mock.calls[0][0].details).toEqual({ at: '2026-10-20T00:00:00.000Z', cycle: { name: 'loop' } });
    expect(heard.mock.calls[1][0].details).toBeUndefined();
    expect(() => JSON.stringify(heard.mock.calls[0][0].details)).not.toThrow();
  });

  it('keeps what happened before anyone listened, for an analytics bundle that loads late', async () => {
    const copy = await freshChannel();

    for (let index = 0; index < 60; index++) copy.emitInteraction({ component: 'tabs', type: 'valueChange', value: String(index) });
    const heard = vi.fn();
    const stop = copy.subscribeInteractions(heard);
    copy.flushInteractions();
    stop();

    expect(heard).toHaveBeenCalledTimes(50);
    expect(heard.mock.calls[0][0].value).toBe('10');
  });

  it('keeps nothing once someone has listened and stopped', async () => {
    const copy = await freshChannel();
    copy.subscribeInteractions(() => undefined)();

    copy.emitInteraction({ component: 'tabs', type: 'valueChange', value: 'a' });
    const heard = vi.fn();
    const stop = copy.subscribeInteractions(heard);
    copy.flushInteractions();
    stop();

    expect(heard).not.toHaveBeenCalled();
  });

  it('does nothing on a server, where no person is interacting', () => {
    const heard = vi.fn();
    listen(heard);
    vi.stubGlobal('document', undefined);

    emitInteraction({ component: 'toaster', type: 'show', value: 'Saved' });
    vi.unstubAllGlobals();
    flushInteractions();

    expect(heard).not.toHaveBeenCalled();
  });

  it('delivers what is queued when the page is hidden, before a background task would run', async () => {
    const heard = vi.fn();
    listen(heard);
    await vi.dynamicImportSettled();

    emitInteraction({ component: 'link', type: 'select' });
    dispatchEvent(new Event('pagehide'));

    expect(heard).toHaveBeenCalledTimes(1);
  });

  it('keeps one channel on globalThis, so a second copy of the module hears the first', async () => {
    const heard = vi.fn();
    listen(heard);

    vi.resetModules();
    const copy = await import('./interactionChannel');
    copy.emitInteraction({ component: 'tabs', type: 'valueChange', value: 'b' });
    flushInteractions();

    expect(heard).toHaveBeenCalledWith(expect.objectContaining({ component: 'tabs', value: 'b' }));
  });

  it('reports a listener that throws, and still calls the rest', () => {
    const reportError = vi.fn();
    vi.stubGlobal('reportError', reportError);
    const after = vi.fn();
    listen(() => {
      throw new Error('analytics is down');
    });
    listen(after);

    emitInteraction({ component: 'menu.item', type: 'select' });
    flushInteractions();

    expect(after).toHaveBeenCalled();
    expect(reportError).toHaveBeenCalledWith(new Error('analytics is down'));
  });

  it('rethrows on a timer where the platform has no reportError', () => {
    vi.useFakeTimers();
    vi.stubGlobal('reportError', undefined);
    listen(() => {
      throw new Error('analytics is down');
    });

    emitInteraction({ component: 'menu.item', type: 'select' });
    flushInteractions();

    expect(() => vi.runAllTimers()).toThrow('analytics is down');
  });

  it("unwraps React's synthetic event and reads the handler's element while it still exists", () => {
    const heard = vi.fn();
    listen(heard);
    const button = document.createElement('button');
    const icon = document.createElement('span');
    button.append(icon);
    const nativeEvent = new MouseEvent('click');
    Object.defineProperty(nativeEvent, 'target', { value: icon });
    const synthetic = { nativeEvent, currentTarget: button as Element | null };

    emitInteraction({ component: 'tabs', type: 'valueChange', event: synthetic });
    // React clears it once dispatch ends — before the listener runs.
    synthetic.currentTarget = null;
    flushInteractions();

    expect(heard.mock.calls[0][0].event).toBe(nativeEvent);
    expect(heard.mock.calls[0][0].target).toBe(button);
  });

  it('names the event being dispatched when a change made inside a handler was not handed one', async () => {
    const heard = vi.fn();
    listen(heard);
    await vi.dynamicImportSettled();
    const header = document.createElement('div');
    header.setAttribute('role', 'columnheader');
    header.tabIndex = -1;
    header.innerHTML = '<span>Total</span>';
    document.body.append(header);
    header.addEventListener('click', () => emitInteraction({ component: 'datagrid', type: 'sortingChange', target: document.body }));

    header.querySelector('span')!.click();
    emitInteraction({ component: 'datagrid', type: 'retry', target: document.body });
    flushInteractions();

    expect(heard.mock.calls[0][0].event).toBeInstanceOf(MouseEvent);
    expect(heard.mock.calls[0][0].target).toBe(header);
    // Released once dispatch is over: a change after it was caused by something else.
    expect(heard.mock.calls[1][0].event).toBeUndefined();
    expect(heard.mock.calls[1][0].target).toBe(document.body);
  });

  it("falls back to the component's own element when there is no event", () => {
    const heard = vi.fn();
    listen(heard);
    const grid = document.createElement('div');

    emitInteraction({ component: 'datagrid', type: 'sortingChange', target: grid });
    flushInteractions();

    expect(heard.mock.calls[0][0].target).toBe(grid);
  });

  describe('a press on anything a component styled', () => {
    it('is a dom interaction named by the nearest data-bk, on the control it hit', async () => {
      const heard = vi.fn();
      listen(heard);
      await vi.dynamicImportSettled();
      setComponentAttribute(true);
      document.body.innerHTML = '<div data-bk="widget"><p>Text</p><button><svg></svg></button></div>';

      document.querySelector('svg')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      document.querySelector('p')!.click();
      flushInteractions();

      expect(heard.mock.calls.map(([event]) => [event.kind, event.type, event.component, event.details])).toEqual([
        ['dom', 'click', 'widget', { interactive: true }],
        ['dom', 'click', 'widget', { interactive: false }],
      ]);
      expect(heard.mock.calls[0][0].target).toBe(document.querySelector('button'));
      expect(heard.mock.calls[0][0].source).toBe('app');
    });

    it("carries a checkbox's checked state, and never what was typed", async () => {
      const heard = vi.fn();
      listen(heard);
      await vi.dynamicImportSettled();
      setComponentAttribute(true);
      document.body.innerHTML = '<input data-bk="checkbox" type="checkbox" checked><input data-bk="textbox" value="hunter2">';

      document.querySelectorAll('input').forEach((input) => input.dispatchEvent(new Event('change', { bubbles: true })));
      flushInteractions();

      expect(heard.mock.calls.map(([event]) => [event.component, event.value])).toEqual([
        ['checkbox', true],
        ['textbox', undefined],
      ]);
    });

    it('says once, in development, that it cannot name anything without the attribute', async () => {
      const copy = await freshChannel();
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const heard = vi.fn();
      const stop = copy.subscribeInteractions(heard);
      await vi.dynamicImportSettled();
      document.body.innerHTML = '<button data-bk="button">Save</button>';

      document.querySelector('button')!.click();
      document.querySelector('button')!.click();
      copy.flushInteractions();
      stop();

      expect(heard).not.toHaveBeenCalled();
      expect(warn.mock.calls.filter(([message]) => String(message).includes('componentAttribute'))).toHaveLength(1);
    });
  });

  it('keeps that warning to itself under Box.configure({ warnings: false })', async () => {
    const copy = await freshChannel();
    const flags = await import('./componentAttribute');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    flags.setAttributeWarnings(false);
    const stop = copy.subscribeInteractions(() => undefined);
    await vi.dynamicImportSettled();
    document.body.innerHTML = '<button data-bk="button">Save</button>';

    document.querySelector('button')!.click();
    stop();
    flags.setAttributeWarnings(true);

    expect(warn).not.toHaveBeenCalled();
  });

  it('remembers whether components mark themselves', () => {
    expect(marksComponents()).toBe(false);
    setComponentAttribute(true);
    expect(marksComponents()).toBe(true);
  });
});
