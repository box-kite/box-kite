import { describe, expect, it } from 'vitest';
import FilterDraftUtils from './filterDraftUtils';

/** Whether an input's draft already says what the grid holds, read the way the model parses it. */
describe('FilterDraftUtils', () => {
  it('reads a blank text draft as no filter, and anything else as itself', () => {
    expect(FilterDraftUtils.textMatches('', undefined)).toBe(true);
    expect(FilterDraftUtils.textMatches('   ', undefined)).toBe(true);
    expect(FilterDraftUtils.textMatches('Jo', { type: 'text', value: 'Jo' })).toBe(true);
    expect(FilterDraftUtils.textMatches('Jo', undefined)).toBe(false);
    expect(FilterDraftUtils.textMatches('', { type: 'text', value: 'Jo' })).toBe(false);
  });

  it('reads a half-typed number as the number it parses to', () => {
    const filter = { type: 'number', operator: 'gt', value: 1 } as const;

    expect(FilterDraftUtils.numberMatches({ operator: 'gt', value: '1.', valueTo: '' }, filter)).toBe(true);
    expect(FilterDraftUtils.numberMatches({ operator: 'eq', value: '1', valueTo: '' }, filter)).toBe(false);
    expect(FilterDraftUtils.numberMatches({ operator: 'gt', value: '1', valueTo: '' }, undefined)).toBe(false);
    expect(FilterDraftUtils.numberMatches({ operator: 'gt', value: '', valueTo: '' }, undefined)).toBe(true);
  });

  it('compares the upper bound only for a range', () => {
    const range = { type: 'number', operator: 'between', value: 2, valueTo: 8 } as const;

    expect(FilterDraftUtils.numberMatches({ operator: 'between', value: '2', valueTo: '8' }, range)).toBe(true);
    expect(FilterDraftUtils.numberMatches({ operator: 'between', value: '2', valueTo: '9' }, range)).toBe(false);
    expect(FilterDraftUtils.numberMatches({ operator: 'between', value: '2', valueTo: '' }, { ...range, valueTo: undefined })).toBe(true);
  });

  it('turns a held filter back into a draft, and nothing into an empty one', () => {
    expect(FilterDraftUtils.numberDraft({ type: 'number', operator: 'between', value: 2, valueTo: 8 })).toEqual({
      operator: 'between',
      value: '2',
      valueTo: '8',
    });
    expect(FilterDraftUtils.numberDraft(undefined)).toEqual({ operator: 'eq', value: '', valueTo: '' });
  });
});
