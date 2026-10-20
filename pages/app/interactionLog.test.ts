import { afterEach, describe, expect, it, vi } from 'vitest';
import Box, { InteractionEvent } from '../../src/box';
import { LOG_FLAG, logInteractions, logRequested, toInteractionRecord } from './interactionLog';

const at = { source: 'user', timeStamp: 1234.5, time: Date.UTC(2026, 9, 20, 14, 30), url: 'https://box-kite.dev/tabs/' } as const;

describe('the interaction log', () => {
  afterEach(() => {
    sessionStorage.removeItem(LOG_FLAG);
  });

  it('turns a change into plain JSON, with the DOM event as its type and no tab-relative clock', () => {
    const record = toInteractionRecord({
      ...at,
      kind: 'change',
      component: 'dialog',
      type: 'openChange',
      reason: 'escape',
      value: false,
      event: new KeyboardEvent('keydown'),
    });

    expect(record).toEqual({
      name: 'dialog.openChange',
      kind: 'change',
      component: 'dialog',
      type: 'openChange',
      reason: 'escape',
      value: false,
      source: 'user',
      trigger: 'keydown',
      time: '2026-10-20T14:30:00.000Z',
      url: 'https://box-kite.dev/tabs/',
    });
    expect(JSON.parse(JSON.stringify(record))).toEqual(record);
  });

  it('names what a press landed on by what the page shows, never the element', () => {
    const button = document.createElement('button');
    button.innerHTML = '<span>Save   draft</span>';
    const press: InteractionEvent = {
      ...at,
      kind: 'dom',
      component: 'button',
      type: 'click',
      target: button,
      details: { interactive: true },
    };

    expect(toInteractionRecord(press)).toMatchObject({ name: 'button.click', label: 'Save draft', details: { interactive: true } });
    expect(toInteractionRecord({ ...press, target: undefined }).label).toBeUndefined();
  });

  it('keeps ?interactions for the rest of the tab', () => {
    expect(logRequested('')).toBe(false);
    expect(logRequested('?interactions')).toBe(true);
    expect(logRequested('')).toBe(true);
  });

  it('logs a press as the change it made, and a press that changed nothing as itself', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    Box.configure({ componentAttribute: true });
    logInteractions();
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

    expect(info.mock.calls).toEqual([
      [
        '[interaction]',
        expect.objectContaining({ name: 'tabs.valueChange', trigger: 'click', label: 'Activity', details: { from: 'overview' } }),
      ],
      ['[interaction]', expect.objectContaining({ name: 'button.click', trigger: 'click', label: 'Save', details: { interactive: true } })],
    ]);
    tab.remove();
    save.remove();
    info.mockRestore();
    Box.configure({ componentAttribute: false });
  });
});
