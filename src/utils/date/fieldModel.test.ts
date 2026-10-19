import { describe, expect, it } from 'vitest';
import { monthGrid, moveFocus, rangeCrosses, rangePosition } from './calendarModel';
import {
  draftOf,
  editable,
  FieldConfig,
  isComplete,
  reshape,
  segmentsFor,
  segmentText,
  step,
  typeDigit,
  typePeriod,
  valueOf,
} from './fieldModel';

/** The narrow and thin no-break spaces ICU writes beside AM/PM and a range dash, built from code points so no source line carries one. */
const SPACES = new RegExp(`[${String.fromCharCode(0x202f, 0xa0, 0x2009)}]`, 'g');

const config = (overrides: Partial<FieldConfig> = {}): FieldConfig => ({
  type: 'date',
  locale: 'en-US',
  hourCycle: 24,
  granularity: 'minute',
  ...overrides,
});
const shape = (c: FieldConfig) =>
  segmentsFor(c)
    .map((segment) => (segment.type === 'literal' ? segment.text : segment.type))
    .join('|');

describe('the segments', () => {
  it('follow the locale order and separators', () => {
    expect(shape(config())).toBe('month|/|day|/|year');
    expect(shape(config({ locale: 'ro-MD' }))).toBe('day|.|month|.|year');
    expect(shape(config({ locale: 'sv-SE' }))).toBe('year|-|month|-|day');
    expect(shape(config({ locale: 'ja-JP' }))).toBe('year|/|month|/|day');
  });

  it('take a 12- or 24-hour clock, and seconds when asked', () => {
    expect(shape(config({ type: 'time', hourCycle: 12 })).replace(SPACES, ' ')).toBe('hour|:|minute| |dayPeriod');
    expect(shape(config({ type: 'time', granularity: 'second' }))).toBe('hour|:|minute|:|second');
    expect(shape(config({ type: 'datetime', locale: 'ro-MD' }))).toBe('day|.|month|.|year|, |hour|:|minute');
  });

  it('are on the Gregorian calendar whatever the locale defaults to', () => {
    expect(editable(segmentsFor(config({ locale: 'th-TH' })))).toEqual(['day', 'month', 'year']);
    expect(editable(segmentsFor(config({ locale: 'fa-IR' })))).toContain('year');
  });
});

describe('typing', () => {
  const c = config();

  it('moves on as soon as another digit could not fit', () => {
    expect(typeDigit({}, 'month', '', '4', c)).toEqual({ draft: { month: 4 }, buffer: '4', advance: true });
    expect(typeDigit({}, 'month', '', '1', c)).toEqual({ draft: { month: 1 }, buffer: '1', advance: false });
    expect(typeDigit({ month: 1 }, 'month', '1', '2', c)).toEqual({ draft: { month: 12 }, buffer: '12', advance: true });
    expect(typeDigit({ month: 1 }, 'month', '1', '5', c)).toEqual({ draft: { month: 5 }, buffer: '5', advance: true });
  });

  it('waits on a leading zero and reads a year whole', () => {
    expect(typeDigit({}, 'day', '', '0', c)).toEqual({ draft: { day: undefined }, buffer: '0', advance: false });
    expect(typeDigit({}, 'day', '0', '7', c).draft.day).toBe(7);
    let typed = { draft: {}, buffer: '', advance: false };
    for (const digit of '2026') typed = typeDigit(typed.draft, 'year', typed.buffer, digit, c);
    expect(typed).toEqual({ draft: { year: 2026 }, buffer: '2026', advance: true });
  });

  it('knows February', () => {
    expect(typeDigit({ year: 2026, month: 2 }, 'day', '', '3', c)).toEqual({
      draft: { year: 2026, month: 2, day: 3 },
      buffer: '3',
      advance: true,
    });
    expect(typeDigit({ year: 2024, month: 2 }, 'day', '2', '9', c).draft.day).toBe(29);
  });

  it('reads AM and PM in the locale', () => {
    expect(typePeriod({}, 'p', 'en-US')).toEqual({ dayPeriod: 1 });
    expect(typePeriod({}, 'A', 'en-US')).toEqual({ dayPeriod: 0 });
    expect(typePeriod({}, 'x', 'en-US')).toBeNull();
  });
});

describe('stepping', () => {
  const c = config({ type: 'time', hourCycle: 12 });

  it('starts an empty segment at the placeholder and then wraps like a clock', () => {
    expect(step({}, 'hour', 1, c, { hour: 12 })).toEqual({ hour: 12 });
    expect(step({ hour: 12 }, 'hour', 1, c, {})).toEqual({ hour: 1 });
    expect(step({ minute: 0 }, 'minute', -1, c, {})).toEqual({ minute: 59 });
    expect(step({ dayPeriod: 1 }, 'dayPeriod', 1, c, {})).toEqual({ dayPeriod: 0 });
    expect(step({ year: 2024, month: 2, day: 29 }, 'day', 1, config(), {})).toMatchObject({ day: 1 });
  });
});

describe('the value', () => {
  it('is null until every segment is filled, then canonical', () => {
    const c = config({ type: 'datetime', hourCycle: 12 });
    const segments = segmentsFor(c);
    const draft = { year: 2026, month: 10, day: 19, hour: 2, minute: 30 };
    expect(isComplete(draft, segments)).toBe(false);
    expect(valueOf(draft, segments, c, { zone: null })).toBeNull();
    expect(valueOf({ ...draft, dayPeriod: 1 }, segments, c, { zone: null })).toBe('2026-10-19T14:30:00');
    expect(valueOf({ ...draft, hour: 12, dayPeriod: 0 }, segments, c, { zone: null })).toBe('2026-10-19T00:30:00');
    expect(valueOf({ ...draft, dayPeriod: 1 }, segments, c, { zone: 'Europe/Chisinau' })).toBe('2026-10-19T14:30:00+03:00');
    expect(valueOf({ ...draft, dayPeriod: 1 }, segments, c, { zone: 'UTC' })).toBe('2026-10-19T14:30:00Z');
  });

  it('pulls a day past the month end back onto it', () => {
    const c = config();
    expect(valueOf({ year: 2026, month: 2, day: 31 }, segmentsFor(c), c, { zone: null })).toBe('2026-02-28');
  });

  it('takes a value apart on the field zone and clock', () => {
    const c = config({ type: 'datetime', hourCycle: 12 });
    expect(draftOf('2026-10-19T11:30:00Z', c, 'Europe/Chisinau')).toEqual({
      year: 2026,
      month: 10,
      day: 19,
      hour: 2,
      dayPeriod: 1,
      minute: 30,
      second: 0,
    });
    expect(draftOf('2026-10-19T11:30:00Z', config({ type: 'time' }), 'UTC')).toEqual({ hour: 11, minute: 30, second: 0 });
    expect(draftOf('garbage', c, 'UTC')).toEqual({});
  });

  it('keeps the time when the clock changes shape', () => {
    const twelve = config({ type: 'time', hourCycle: 12 });
    const twentyFour = config({ type: 'time', hourCycle: 24 });
    expect(reshape({ hour: 2, dayPeriod: 1, minute: 5 }, twelve, twentyFour)).toEqual({ hour: 14, minute: 5 });
    expect(reshape({ hour: 0, minute: 5 }, twentyFour, twelve)).toEqual({ hour: 12, dayPeriod: 0, minute: 5 });
  });

  it('shows the part letters for an empty segment and pads a full one', () => {
    expect(segmentText('month', {}, '', 'en-US')).toBe('mm');
    expect(segmentText('dayPeriod', {}, '', 'en-US')).toBe('AM');
    expect(segmentText('month', { month: 4 }, '', 'en-US')).toBe('04');
    expect(segmentText('year', { year: 20 }, '20', 'en-US')).toBe('20');
    expect(segmentText('dayPeriod', { dayPeriod: 1 }, '', 'en-US')).toBe('PM');
  });
});

describe('the month grid', () => {
  it('is six weeks from the locale first day', () => {
    const sunday = monthGrid(2026, 10, 0);
    expect(sunday).toHaveLength(6);
    expect(sunday[0].days[0]).toEqual({ date: '2026-09-27', day: 27, outside: true });
    expect(sunday[0].days[4]).toEqual({ date: '2026-10-01', day: 1, outside: false });
    const monday = monthGrid(2026, 10, 1);
    expect(monday[0].days[0].date).toBe('2026-09-28');
    expect(monday[0].week).toBe(40);
  });

  it('moves the focus the APG way, mirrored in a right-to-left page', () => {
    const day = { year: 2026, month: 1, day: 31 };
    const ltr = { rtl: false, firstDay: 1 };
    expect(moveFocus(day, 'ArrowRight', false, ltr)).toEqual({ year: 2026, month: 2, day: 1 });
    expect(moveFocus(day, 'ArrowRight', false, { ...ltr, rtl: true })).toEqual({ year: 2026, month: 1, day: 30 });
    expect(moveFocus(day, 'PageDown', false, ltr)).toEqual({ year: 2026, month: 2, day: 28 });
    expect(moveFocus(day, 'PageUp', true, ltr)).toEqual({ year: 2025, month: 1, day: 31 });
    expect(moveFocus({ year: 2026, month: 10, day: 21 }, 'Home', false, ltr)).toEqual({ year: 2026, month: 10, day: 19 });
    expect(moveFocus({ year: 2026, month: 10, day: 21 }, 'End', false, { rtl: false, firstDay: 0 })).toEqual({
      year: 2026,
      month: 10,
      day: 24,
    });
    expect(moveFocus(day, 'x', false, ltr)).toBeNull();
  });

  it('places a day in a range and refuses one across a blocked day', () => {
    const start = { year: 2026, month: 10, day: 23 };
    const end = { year: 2026, month: 10, day: 19 };
    expect(rangePosition({ year: 2026, month: 10, day: 19 }, start, end)).toBe('start');
    expect(rangePosition({ year: 2026, month: 10, day: 21 }, start, end)).toBe('middle');
    expect(rangePosition({ year: 2026, month: 10, day: 23 }, start, end)).toBe('end');
    expect(rangePosition({ year: 2026, month: 10, day: 24 }, start, end)).toBeNull();
    expect(rangeCrosses(start, end, (date) => date === '2026-10-21')).toBe(true);
    expect(rangeCrosses(start, end, (date) => date === '2026-10-25')).toBe(false);
  });
});
