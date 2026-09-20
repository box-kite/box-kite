import { describe, expect, it } from 'vitest';
import AgentUtils, { ToolCallStatus } from './agentUtils';

describe('AgentUtils.formatValue', () => {
  it('shows a string as it stands, rather than as a quoted JSON string', () => {
    expect(AgentUtils.formatValue('no rows matched')).toEqual({ text: 'no rows matched', truncated: 0 });
  });

  it('formats an object as JSON a person can read', () => {
    expect(AgentUtils.formatValue({ query: 'refunds', limit: 20 }).text).toBe('{\n  "query": "refunds",\n  "limit": 20\n}');
  });

  it('survives a circular structure, which JSON.stringify throws on', () => {
    const value: Record<string, unknown> = { name: 'root' };
    value.self = value;

    expect(AgentUtils.formatValue(value).text).toBe('[object Object]');
  });

  it('survives a BigInt, which JSON.stringify also throws on', () => {
    expect(AgentUtils.formatValue({ total: 9007199254740993n }).text).toBe('{\n  "total": "9007199254740993"\n}');
  });

  it('says a function was there rather than dropping it, which reads as the model omitting it', () => {
    expect(AgentUtils.formatValue({ onDone: () => undefined }).text).toBe('{\n  "onDone": "[Function]"\n}');
  });

  it('formats undefined and null as words rather than as nothing', () => {
    expect(AgentUtils.formatValue(undefined).text).toBe('undefined');
    expect(AgentUtils.formatValue(null).text).toBe('null');
  });

  it('cuts a value past the limit and says how much was left', () => {
    expect(AgentUtils.formatValue('x'.repeat(30), 10)).toEqual({ text: 'x'.repeat(10), truncated: 20 });
  });

  it('leaves a value exactly at the limit alone', () => {
    expect(AgentUtils.formatValue('x'.repeat(10), 10).truncated).toBe(0);
  });
});

describe('AgentUtils.hasValue', () => {
  it('counts a falsy value that is still a value', () => {
    expect(AgentUtils.hasValue(0)).toBe(true);
    expect(AgentUtils.hasValue('')).toBe(true);
    expect(AgentUtils.hasValue(false)).toBe(true);
  });

  it('counts absence as absence', () => {
    expect(AgentUtils.hasValue(undefined)).toBe(false);
    expect(AgentUtils.hasValue(null)).toBe(false);
  });
});

describe('AgentUtils.formatCount', () => {
  it('groups thousands the same way on a server and in a browser, whatever the locale', () => {
    expect(AgentUtils.formatCount(30)).toBe('30');
    expect(AgentUtils.formatCount(3980)).toBe('3,980');
    expect(AgentUtils.formatCount(3_980_000)).toBe('3,980,000');
  });
});

describe('AgentUtils.formatDuration', () => {
  it('reads in the units a reader thinks in', () => {
    expect(AgentUtils.formatDuration(420)).toBe('420ms');
    expect(AgentUtils.formatDuration(4200)).toBe('4.2s');
    expect(AgentUtils.formatDuration(42_000)).toBe('42s');
    expect(AgentUtils.formatDuration(96_000)).toBe('1m 36s');
  });

  it('drops the decimal past ten seconds, where a tenth says nothing', () => {
    expect(AgentUtils.formatDuration(11_400)).toBe('11s');
  });

  it('is empty for a number that is not a duration', () => {
    expect(AgentUtils.formatDuration(-1)).toBe('');
    expect(AgentUtils.formatDuration(Number.NaN)).toBe('');
    expect(AgentUtils.formatDuration(Number.POSITIVE_INFINITY)).toBe('');
  });
});

describe('AgentUtils labels', () => {
  it('spells every status out, because a colour is not a state', () => {
    expect(AgentUtils.statusLabel('pending')).toBe('Pending');
    expect(AgentUtils.statusLabel('running')).toBe('Running');
    expect(AgentUtils.statusLabel('success')).toBe('Done');
    expect(AgentUtils.statusLabel('error')).toBe('Failed');
  });

  it('falls back to pending for a status nobody declared', () => {
    expect(AgentUtils.statusLabel('queued' as ToolCallStatus)).toBe('Pending');
  });

  it('spells the two decisions out', () => {
    expect(AgentUtils.decisionLabel('approved')).toBe('Approved');
    expect(AgentUtils.decisionLabel('rejected')).toBe('Rejected');
  });
});
