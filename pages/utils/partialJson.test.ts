import { describe, expect, it } from 'vitest';
import { parsePartialJson } from './partialJson';

const SPEC = {
  type: 'DashboardGrid',
  props: { label: 'Sales', columns: 12, items: [{ id: 'revenue', x: 0, w: 6, fixed: false }] },
  children: ['Revenue, "quoted"'],
};

const TEXT = JSON.stringify(SPEC, null, 2);

describe('parsePartialJson', () => {
  it('reads a whole document', () => {
    expect(parsePartialJson(TEXT)).toEqual(SPEC);
  });

  it('reads every prefix of one without throwing, and ends at the document itself', () => {
    const values = Array.from({ length: TEXT.length + 1 }, (_, end) => parsePartialJson(TEXT.slice(0, end)));

    expect(values.filter((value) => value !== null).length).toBeGreaterThan(TEXT.length / 2);
    expect(values.at(-1)).toEqual(SPEC);
  });

  it('gives a value its keys in the order they arrived, and nothing for a key with no value yet', () => {
    expect(parsePartialJson('{ "type": "Widget", "props": { "id": "rev')).toEqual({ type: 'Widget', props: { id: 'rev' } });
    expect(parsePartialJson('{ "type": "Widget", "props":')).toEqual({ type: 'Widget', props: null });
    expect(parsePartialJson('{ "type": "Widget", "prop')).toEqual({ type: 'Widget' });
  });

  it('cuts back a token that cannot be finished', () => {
    expect(parsePartialJson('{ "columns": 12, "rowHeight": 1')).toEqual({ columns: 12, rowHeight: 1 });
    expect(parsePartialJson('{ "columns": 12, "fixed": tru')).toEqual({ columns: 12, fixed: null });
    expect(parsePartialJson('{ "columns": 12, "rowHeight": ')).toEqual({ columns: 12, rowHeight: null });
  });

  it('answers nothing while there is nothing', () => {
    expect(parsePartialJson('')).toBeNull();
    expect(parsePartialJson('   ')).toBeNull();
  });
});
