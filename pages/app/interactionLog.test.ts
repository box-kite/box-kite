import { afterEach, describe, expect, it, vi } from 'vitest';
import Box, { InteractionEvent } from '../../src/box';
import { describeValue, interactionLine, LOG_FLAG, logInteractions, logRequested } from './interactionLog';

const at = { source: 'user', timeStamp: 0, time: 0, url: 'http://localhost/' } as const;

describe('the interaction log', () => {
  afterEach(() => {
    sessionStorage.removeItem(LOG_FLAG);
  });

  it('reads a value as one short line, however big it is', () => {
    expect(describeValue(true)).toBe('true');
    expect(describeValue(['a', 'b'])).toBe('["a","b"]');
    expect(describeValue([1, 2, 3, 4])).toBe('[4 items]');
    expect(describeValue({ columnKey: 'total', direction: 'ASC' })).toBe('{"columnKey":"total","direction":"ASC"}');
    expect(describeValue('x'.repeat(80))).toHaveLength(48);
    expect(describeValue(undefined)).toBe('');
  });

  it('names a change by its component and type, and says why and what', () => {
    const line = interactionLine({ ...at, kind: 'change', component: 'dialog', type: 'openChange', reason: 'escape', value: false });

    expect(line).toEqual({ name: 'dialog.openChange', detail: 'escape → false' });
  });

  it('names a press by the part it landed on, and reads its label off the page', () => {
    const button = document.createElement('button');
    button.innerHTML = '<span>Save   draft</span>';
    const press: InteractionEvent = { ...at, kind: 'dom', component: 'button', type: 'click', target: button };

    expect(interactionLine(press)).toEqual({ name: 'click button', detail: 'Save draft' });
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
      ['[interaction] tabs.valueChange', 'click → activity', expect.objectContaining({ kind: 'custom', details: { from: 'overview' } })],
      ['[interaction] click button', 'Save', expect.objectContaining({ kind: 'dom', details: { interactive: true } })],
    ]);
    tab.remove();
    save.remove();
    info.mockRestore();
    Box.configure({ componentAttribute: false });
  });
});
