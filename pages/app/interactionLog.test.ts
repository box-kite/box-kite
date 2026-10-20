import { afterEach, describe, expect, it, vi } from 'vitest';
import Box, { InteractionEvent } from '../../src/box';
import { describeValue, forgetLog, interactionFeed, interactionLine, logRequested } from './interactionLog';

const at = { source: 'user', timeStamp: 0, time: 0 } as const;

describe('the interaction log', () => {
  afterEach(() => {
    forgetLog();
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

    expect(line).toMatchObject({ name: 'dialog.openChange', detail: 'escape → false' });
  });

  it('names a press by the part it landed on, and reads its label off the page', () => {
    const button = document.createElement('button');
    button.innerHTML = '<span>Save   draft</span>';
    const press: InteractionEvent = { ...at, kind: 'dom', component: 'button', type: 'click', target: button };

    expect(interactionLine(press)).toMatchObject({ name: 'click button', detail: 'Save draft' });
  });

  it('keeps ?interactions for the rest of the tab', () => {
    expect(logRequested('')).toBe(false);
    expect(logRequested('?interactions')).toBe(true);
    expect(logRequested('')).toBe(true);
  });
});

describe('the interaction feed', () => {
  it('logs a press and the change it made from one stream, in order', async () => {
    Box.configure({ componentAttribute: true });
    interactionFeed.start({ console: false });
    await vi.dynamicImportSettled();
    interactionFeed.clear();

    const tab = document.createElement('button');
    tab.setAttribute('data-bk', 'tabs.tab');
    tab.textContent = 'Activity';
    tab.addEventListener('click', () =>
      Box.reportInteraction({ component: 'tabs', type: 'valueChange', reason: 'click', value: 'activity' }),
    );
    document.body.append(tab);

    tab.click();
    Box.flushInteractions();

    expect(interactionFeed.snapshot().map((line) => line.name)).toEqual(['tabs.valueChange', 'click tabs.tab']);
    tab.remove();
    Box.configure({ componentAttribute: false });
  });
});
