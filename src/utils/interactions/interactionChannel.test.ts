import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  emitInteraction,
  flushInteractions,
  InteractionEvent,
  marksComponents,
  setComponentAttribute,
  subscribeInteractions,
} from './interactionChannel';

describe('interaction channel', () => {
  const unsubscribers: (() => void)[] = [];
  const listen = (listener: (event: InteractionEvent) => void) => unsubscribers.push(subscribeInteractions(listener));

  afterEach(() => {
    flushInteractions();
    unsubscribers.splice(0).forEach((unsubscribe) => unsubscribe());
    setComponentAttribute(false);
    vi.useRealTimers();
  });

  it('never calls a listener inside the handler that emitted: delivery is a later task', async () => {
    const heard = vi.fn();
    listen(heard);

    emitInteraction({ component: 'dialog', type: 'openChange', reason: 'trigger', value: true });
    expect(heard).not.toHaveBeenCalled();

    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(heard).toHaveBeenCalledWith(
      expect.objectContaining({ component: 'dialog', type: 'openChange', reason: 'trigger', value: true }),
    );
  });

  it('delivers a batch in order, once, with each time stamp taken when it happened', () => {
    const heard = vi.fn();
    listen(heard);

    emitInteraction({ component: 'menu.item', type: 'select' });
    emitInteraction({ component: 'menu', type: 'openChange', value: false });
    flushInteractions();
    flushInteractions();

    expect(heard.mock.calls.map(([event]) => event.component)).toEqual(['menu.item', 'menu']);
    expect(heard.mock.calls[0][0].timeStamp).toBeLessThanOrEqual(heard.mock.calls[1][0].timeStamp);
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

  it('queues nothing while nobody listens', () => {
    emitInteraction({ component: 'tabs', type: 'valueChange', value: 'a' });
    const heard = vi.fn();
    listen(heard);
    flushInteractions();

    expect(heard).not.toHaveBeenCalled();
  });

  it('delivers what is queued when the page is hidden, before a background task would run', () => {
    const heard = vi.fn();
    listen(heard);

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

  it('rethrows a listener that throws on a timer, and still calls the rest', () => {
    vi.useFakeTimers();
    const after = vi.fn();
    listen(() => {
      throw new Error('analytics is down');
    });
    listen(after);

    emitInteraction({ component: 'menu.item', type: 'select' });
    flushInteractions();

    expect(after).toHaveBeenCalled();
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

  it("falls back to the component's own element when there is no event", () => {
    const heard = vi.fn();
    listen(heard);
    const grid = document.createElement('div');

    emitInteraction({ component: 'datagrid', type: 'sortingChange', target: grid });
    flushInteractions();

    expect(heard.mock.calls[0][0].target).toBe(grid);
  });

  it('remembers whether components mark themselves', () => {
    expect(marksComponents()).toBe(false);
    setComponentAttribute(true);
    expect(marksComponents()).toBe(true);
  });
});
