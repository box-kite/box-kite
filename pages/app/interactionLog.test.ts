import { afterEach, describe, expect, it } from 'vitest';
import { clickLine, describeValue, forgetLog, interactionLine, logRequested } from './interactionLog';

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

  it('names an event by its component and type, and says why and what', () => {
    const line = interactionLine({ component: 'dialog', type: 'openChange', reason: 'escape', value: false, timeStamp: 0 });

    expect(line).toMatchObject({ name: 'dialog.openChange', detail: 'escape → false' });
  });

  it('names a press by the nearest part a component styled', () => {
    const button = document.createElement('button');
    button.setAttribute('data-bk', 'button');
    button.innerHTML = '<span>Save   draft</span>';

    expect(clickLine(button.firstChild as Element)).toMatchObject({ name: 'click button', detail: 'Save draft' });
    expect(clickLine(document.createElement('div'))).toBeNull();
  });

  it('keeps ?interactions for the rest of the tab', () => {
    expect(logRequested('')).toBe(false);
    expect(logRequested('?interactions')).toBe(true);
    expect(logRequested('')).toBe(true);
  });
});
