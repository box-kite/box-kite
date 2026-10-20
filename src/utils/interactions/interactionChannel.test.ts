import { afterEach, describe, expect, it, vi } from 'vitest';
import { emitInteraction, InteractionEvent, marksComponents, setComponentAttribute, subscribeInteractions } from './interactionChannel';

describe('interaction channel', () => {
  const unsubscribers: (() => void)[] = [];
  const listen = (listener: (event: InteractionEvent) => void) => unsubscribers.push(subscribeInteractions(listener));

  afterEach(() => {
    unsubscribers.splice(0).forEach((unsubscribe) => unsubscribe());
    setComponentAttribute(false);
  });

  it('hands every listener the event, with a time stamp, until it unsubscribes', () => {
    const first = vi.fn();
    const second = vi.fn();
    listen(first);
    const stop = subscribeInteractions(second);

    emitInteraction({ component: 'dialog', type: 'openChange', reason: 'trigger', value: true });
    stop();
    emitInteraction({ component: 'dialog', type: 'openChange', reason: 'escape', value: false });

    expect(first).toHaveBeenCalledTimes(2);
    expect(first.mock.calls[0][0]).toMatchObject({ component: 'dialog', type: 'openChange', reason: 'trigger', value: true });
    expect(typeof first.mock.calls[0][0].timeStamp).toBe('number');
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('keeps one channel on globalThis, so a second copy of the module hears the first', async () => {
    const heard = vi.fn();
    listen(heard);

    vi.resetModules();
    const copy = await import('./interactionChannel');
    copy.emitInteraction({ component: 'tabs', type: 'valueChange', value: 'b' });

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

    expect(after).toHaveBeenCalled();
    expect(() => vi.runAllTimers()).toThrow('analytics is down');
    vi.useRealTimers();
  });

  it("unwraps React's synthetic event and takes the handler's element over the deepest one", () => {
    const heard = vi.fn();
    listen(heard);
    const button = document.createElement('button');
    const icon = document.createElement('span');
    button.append(icon);
    const nativeEvent = new MouseEvent('click');
    Object.defineProperty(nativeEvent, 'target', { value: icon });

    emitInteraction({ component: 'tabs', type: 'valueChange', event: { nativeEvent, currentTarget: button } });

    expect(heard.mock.calls[0][0].event).toBe(nativeEvent);
    expect(heard.mock.calls[0][0].target).toBe(button);
  });

  it("falls back to the component's own element when there is no event", () => {
    const heard = vi.fn();
    listen(heard);
    const grid = document.createElement('div');

    emitInteraction({ component: 'datagrid', type: 'sortingChange', target: grid });

    expect(heard.mock.calls[0][0].target).toBe(grid);
  });

  it('remembers whether components mark themselves', () => {
    expect(marksComponents()).toBe(false);
    setComponentAttribute(true);
    expect(marksComponents()).toBe(true);
  });
});
