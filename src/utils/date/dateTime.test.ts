import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { dayOfWeek, epochDay, fromEpochDay, isoWeek } from './calendar';
import {
  add,
  clamp,
  combine,
  compare,
  details,
  difference,
  endOf,
  fromDate,
  isEqual,
  isSame,
  isValid,
  kindOf,
  normalize,
  now,
  offsetOf,
  startOf,
  subtract,
  toDate,
  toInstant,
  toLocal,
  toPlainDate,
  toPlainDateTime,
  toPlainTime,
  today,
  toUtc,
  toZone,
} from './dateTime';
import { format, formatRange, formatRelative, formatToParts, zoneName } from './format';
import { dayPeriodNames, hourCycleOf, weekInfo } from './locale';
import { dateOrder, parse } from './parse';
import { configureDates, DateSettings, readZoneCookie, zoneCookie } from './settings';
import { normalizeZone, wallToEpoch } from './zones';

/** The narrow and thin no-break spaces ICU writes beside AM/PM and a range dash, built from code points so no source line carries one. */
const SPACES = new RegExp(`[${String.fromCharCode(0x202f, 0xa0, 0x2009)}]`, 'g');

/** Intl writes a narrow no-break space before AM/PM in recent ICU, which a test should not care about. */
const spaces = (text: string) => text.replace(SPACES, ' ');

let previous: DateSettings;
beforeEach(() => {
  previous = configureDates({ timeZone: 'Europe/Berlin', locale: 'en-US' });
});
afterEach(() => {
  configureDates({ timeZone: previous.timeZone, locale: previous.locale });
  vi.useRealTimers();
});

describe('the calendar', () => {
  it('counts days from 1970 for any year and back again', () => {
    expect(epochDay({ year: 1970, month: 1, day: 1 })).toBe(0);
    expect(epochDay({ year: 2000, month: 3, day: 1 })).toBe(11017);
    for (const days of [-800_000, -1, 0, 59, 10_957, 20_745, 2_932_896]) {
      expect(epochDay(fromEpochDay(days))).toBe(days);
    }
    expect(fromEpochDay(epochDay({ year: 2024, month: 2, day: 29 }))).toEqual({ year: 2024, month: 2, day: 29 });
  });

  it('knows the weekday and the ISO week', () => {
    expect(dayOfWeek({ year: 2026, month: 10, day: 19 })).toBe(1);
    expect(isoWeek({ year: 2026, month: 1, day: 1 })).toEqual({ year: 2026, week: 1 });
    expect(isoWeek({ year: 2027, month: 1, day: 1 })).toEqual({ year: 2026, week: 53 });
    expect(isoWeek({ year: 2024, month: 12, day: 30 })).toEqual({ year: 2025, week: 1 });
  });
});

describe('zones', () => {
  it('normalises every spelling of UTC and an offset, and refuses nonsense', () => {
    expect(normalizeZone('utc')).toBe('UTC');
    expect(normalizeZone('Etc/UTC')).toBe('UTC');
    expect(normalizeZone('Z')).toBe('UTC');
    expect(normalizeZone('+0300')).toBe('+03:00');
    expect(normalizeZone('-05:30')).toBe('-05:30');
    expect(normalizeZone('+00:00')).toBe('UTC');
    expect(normalizeZone('europe/chisinau')).toBe('Europe/Chisinau');
    expect(normalizeZone('Mars/Olympus')).toBeNull();
    expect(normalizeZone('local')).toBe('Europe/Berlin');
  });

  it('reads the offset a zone is at, summer and winter', () => {
    expect(offsetOf('Europe/Berlin', '2026-07-01T12:00:00Z')).toBe(120);
    expect(offsetOf('Europe/Berlin', '2026-01-01T12:00:00Z')).toBe(60);
    expect(offsetOf('America/New_York', '2026-07-01T12:00:00Z')).toBe(-240);
    expect(offsetOf('Asia/Kolkata', '2026-07-01T12:00:00Z')).toBe(330);
    expect(offsetOf('utc', '2026-07-01T12:00:00Z')).toBe(0);
  });

  it('resolves a skipped time the way Temporal does', () => {
    // Berlin skips 02:00–03:00 on 29 March 2026.
    const wall = { year: 2026, month: 3, day: 29, hour: 2, minute: 30, second: 0, millisecond: 0 };
    expect(new Date(wallToEpoch(wall, 'Europe/Berlin')!).toISOString()).toBe('2026-03-29T01:30:00.000Z');
    expect(new Date(wallToEpoch(wall, 'Europe/Berlin', 'later')!).toISOString()).toBe('2026-03-29T01:30:00.000Z');
    expect(new Date(wallToEpoch(wall, 'Europe/Berlin', 'earlier')!).toISOString()).toBe('2026-03-29T00:30:00.000Z');
    expect(wallToEpoch(wall, 'Europe/Berlin', 'reject')).toBeNull();
    expect(toInstant('2026-03-29T02:30', { zone: 'Europe/Berlin' })).toBe('2026-03-29T03:30:00+02:00');
  });

  it('resolves a repeated time the way Temporal does', () => {
    // Berlin repeats 02:00–03:00 on 25 October 2026.
    expect(toInstant('2026-10-25T02:30', { zone: 'Europe/Berlin' })).toBe('2026-10-25T02:30:00+02:00');
    expect(toInstant('2026-10-25T02:30', { zone: 'Europe/Berlin', disambiguation: 'later' })).toBe('2026-10-25T02:30:00+01:00');
    expect(toInstant('2026-10-25T02:30', { zone: 'Europe/Berlin', disambiguation: 'reject' })).toBeNull();
  });
});

describe('reading and writing values', () => {
  it('reads every spelling of ISO 8601 and writes one', () => {
    expect(normalize('2026-10-19')).toBe('2026-10-19');
    expect(normalize('20261019')).toBe('2026-10-19');
    expect(normalize('14:30')).toBe('14:30:00');
    expect(normalize('T14:30:05.120')).toBe('14:30:05.120');
    expect(normalize('2026-10-19 14:30')).toBe('2026-10-19T14:30:00');
    expect(normalize('2026-10-19T14:30:00.5Z')).toBe('2026-10-19T14:30:00.500Z');
    expect(normalize('2026-10-19T14:30+0300')).toBe('2026-10-19T14:30:00+03:00');
    expect(normalize('2026-10-19T14:30:00+03:00[Europe/Chisinau]')).toBe('2026-10-19T14:30:00+03:00');
    expect(normalize('2026-10-19T14:30[America/New_York]')).toBe('2026-10-19T14:30:00-04:00');
    expect(normalize('2026-10-19T24:00')).toBe('2026-10-20T00:00:00');
    expect(normalize('Mon, 19 Oct 2026 14:30:00 GMT')).toBe('2026-10-19T14:30:00Z');
    expect(normalize(new Date(Date.UTC(2026, 9, 19, 14, 30)))).toBe('2026-10-19T14:30:00Z');
    expect(normalize(0)).toBe('1970-01-01T00:00:00Z');
  });

  it('refuses what is not a date', () => {
    for (const bad of ['2026-02-30', '2026-13-01', '25:00', '2026-10-19Z', 'hello', '', null, undefined, NaN, new Date('x')]) {
      expect(normalize(bad as never)).toBeNull();
    }
    expect(isValid('2026-02-29')).toBe(false);
    expect(isValid('2024-02-29', 'date')).toBe(true);
    expect(isValid('2024-02-29', 'time')).toBe(false);
  });

  it('names the kind', () => {
    expect(kindOf('2026-10-19')).toBe('date');
    expect(kindOf('14:30')).toBe('time');
    expect(kindOf('2026-10-19T14:30')).toBe('datetime');
    expect(kindOf('2026-10-19T14:30Z')).toBe('instant');
  });
});

describe('conversions', () => {
  it('takes a wall clock to UTC in the zone it was read in', () => {
    expect(toUtc('2026-10-19T14:30')).toBe('2026-10-19T12:30:00Z');
    expect(toUtc('2026-10-19T14:30', { from: 'Europe/Chisinau' })).toBe('2026-10-19T11:30:00Z');
    expect(toUtc('2026-10-19T14:30:00+03:00')).toBe('2026-10-19T11:30:00Z');
    expect(toUtc('2026-10-19', { from: 'utc' })).toBe('2026-10-19T00:00:00Z');
    expect(toUtc('14:30')).toBeNull();
  });

  it('shows an instant on another wall clock', () => {
    expect(toZone('2026-10-19T11:30:00Z', 'America/New_York')).toBe('2026-10-19T07:30:00-04:00');
    expect(toZone('2026-10-19T11:30:00Z', '+05:30')).toBe('2026-10-19T17:00:00+05:30');
    expect(toLocal('2026-10-19T11:30:00Z')).toBe('2026-10-19T13:30:00+02:00');
  });

  it('takes the day, the time or the wall clock out of an instant, in a zone', () => {
    expect(toPlainDate('2026-10-19T23:30:00Z')).toBe('2026-10-20');
    expect(toPlainDate('2026-10-19T23:30:00Z', { zone: 'utc' })).toBe('2026-10-19');
    expect(toPlainTime('2026-10-19T23:30:00Z', { zone: 'Asia/Tokyo' })).toBe('08:30:00');
    expect(toPlainDateTime('2026-10-19T23:30:00Z', { zone: 'America/Los_Angeles' })).toBe('2026-10-19T16:30:00');
    expect(toPlainTime('2026-10-19')).toBeNull();
  });

  it('round-trips a Date without moving the day', () => {
    expect(toDate('2026-10-19', { zone: 'utc' })!.toISOString()).toBe('2026-10-19T00:00:00.000Z');
    expect(fromDate(new Date(Date.UTC(2026, 9, 19, 23, 30)))).toBe('2026-10-19T23:30:00Z');
    expect(fromDate(new Date(Date.UTC(2026, 9, 19, 23, 30)), { kind: 'date' })).toBe('2026-10-20');
    expect(fromDate(Date.UTC(2026, 9, 19, 23, 30), { kind: 'date', zone: 'utc' })).toBe('2026-10-19');
  });

  it('combines a date and a time', () => {
    expect(combine('2026-10-19', '14:30')).toBe('2026-10-19T14:30:00');
    expect(combine('2026-10-19', '14:30', { zone: 'utc' })).toBe('2026-10-19T14:30:00Z');
    expect(combine('2026-10-19', '14:30', { zone: 'America/New_York' })).toBe('2026-10-19T14:30:00-04:00');
  });

  it('answers today and now in a zone', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(Date.UTC(2026, 9, 19, 23, 30));
    expect(today('utc')).toBe('2026-10-19');
    expect(today()).toBe('2026-10-20');
    expect(now('utc')).toBe('2026-10-19T23:30:00Z');
    expect(now('Asia/Tokyo')).toBe('2026-10-20T08:30:00+09:00');
  });

  it('hands back every reading at once', () => {
    configureDates({ timeZone: 'America/New_York' });
    expect(details('2026-10-19T14:30', { zone: 'Europe/Chisinau' })).toMatchObject({
      value: '2026-10-19T14:30:00',
      kind: 'datetime',
      zone: 'Europe/Chisinau',
      utc: '2026-10-19T11:30:00Z',
      zoned: '2026-10-19T14:30:00+03:00',
      local: '2026-10-19T07:30:00',
      offset: '+03:00',
      epoch: Date.UTC(2026, 9, 19, 11, 30),
      hour: 14,
    });
    expect(details('2026-10-19')).toMatchObject({ kind: 'date', local: '2026-10-19', utc: '2026-10-19T04:00:00Z' });
    expect(details('14:30')).toMatchObject({ kind: 'time', utc: null, epoch: null, local: '14:30:00', hour: 14 });
    expect(details('nope')).toBeNull();
  });
});

describe('arithmetic', () => {
  it('moves a day on the wall clock and an hour on the instant, across a DST change', () => {
    expect(add('2026-03-28T12:00:00+01:00', { days: 1 }, { zone: 'Europe/Berlin' })).toBe('2026-03-29T12:00:00+02:00');
    expect(add('2026-03-28T12:00:00+01:00', { hours: 24 }, { zone: 'Europe/Berlin' })).toBe('2026-03-29T13:00:00+02:00');
    expect(add('2026-10-19T11:30:00Z', { days: 1 })).toBe('2026-10-20T11:30:00Z');
  });

  it('clamps the month end and wraps a time round midnight', () => {
    expect(add('2026-01-31', { months: 1 })).toBe('2026-02-28');
    expect(add('2024-02-29', { years: 1 })).toBe('2025-02-28');
    expect(subtract('2026-03-01', { days: 1 })).toBe('2026-02-28');
    expect(add('23:30', { minutes: 45 })).toBe('00:15:00');
    expect(subtract('00:15', { hours: 1 })).toBe('23:15:00');
    expect(add('2026-10-19T23:30', { hours: 1 })).toBe('2026-10-20T00:30:00');
  });

  it('starts and ends a unit, with the locale deciding the week', () => {
    expect(startOf('2026-10-21', 'week', { locale: 'en-US' })).toBe('2026-10-18');
    expect(startOf('2026-10-21', 'week', { locale: 'ro-MD' })).toBe('2026-10-19');
    expect(endOf('2026-10-21', 'week', { locale: 'ro-MD' })).toBe('2026-10-25');
    expect(startOf('2026-11-17', 'quarter')).toBe('2026-10-01');
    expect(endOf('2026-02-10', 'month')).toBe('2026-02-28');
    expect(startOf('2026-10-19T14:30:00Z', 'day')).toBe('2026-10-18T22:00:00Z');
    expect(startOf('2026-10-19T14:30:00+05:30', 'day')).toBe('2026-10-19T00:00:00+02:00');
    expect(startOf('2026-10-19T14:30:00Z', 'day', { zone: 'utc' })).toBe('2026-10-19T00:00:00Z');
    expect(endOf('2026-10-19T14:30', 'hour')).toBe('2026-10-19T14:59:59.999');
  });

  it('compares across kinds and zones', () => {
    expect(compare('2026-10-19', '2026-10-20')).toBe(-1);
    expect(compare('14:30', '09:00')).toBe(1);
    expect(isEqual('2026-10-19T14:30:00+03:00', '2026-10-19T11:30:00Z')).toBe(true);
    expect(compare('2026-10-19T13:30', '2026-10-19T11:30:00Z')).toBe(0);
    expect(isSame('2026-10-19T22:30:00Z', '2026-10-20', 'day')).toBe(true);
    expect(isSame('2026-10-19T22:30:00Z', '2026-10-20', 'day', { zone: 'utc' })).toBe(false);
    expect(clamp('2026-12-01', '2026-01-01', '2026-06-30')).toBe('2026-06-30');
  });

  it('counts whole units between two values', () => {
    expect(difference('2026-02-28', '2026-01-31', 'month')).toBe(0);
    expect(difference('2026-03-01', '2026-01-31', 'month')).toBe(1);
    expect(difference('2026-10-19', '2025-10-20', 'year')).toBe(0);
    expect(difference('2026-10-26', '2026-10-19', 'week')).toBe(1);
    expect(difference('2026-03-30', '2026-03-29', 'day')).toBe(1);
    expect(difference('2026-10-19T14:30:00Z', '2026-10-19T11:30:00Z', 'hour')).toBe(3);
    expect(difference('2026-10-19T11:30:00Z', '2026-10-19T14:30:00Z', 'minute')).toBe(-180);
  });
});

describe('formatting', () => {
  it('prints a date as the day it is, whatever the runtime zone', () => {
    expect(format('2026-10-19')).toBe('Oct 19, 2026');
    expect(format('2026-10-19', { locale: 'de-DE', dateStyle: 'long' })).toBe('19. Oktober 2026');
    expect(spaces(format('14:30'))).toBe('2:30 PM');
    expect(format('14:30', { locale: 'ro-MD' })).toBe('14:30');
  });

  it('prints an instant on a wall clock of choice', () => {
    expect(spaces(format('2026-10-19T11:30:00Z', { zone: 'utc' }))).toBe('Oct 19, 2026, 11:30 AM');
    expect(spaces(format('2026-10-19T11:30:00Z'))).toBe('Oct 19, 2026, 1:30 PM');
    expect(spaces(format('2026-10-19T11:30:00Z', { zone: '+05:30', timeStyle: 'short' }))).toBe('5:00 PM');
    expect(spaces(format('2026-10-19T11:30:00Z', { zone: 'America/New_York', hour: 'numeric', timeZoneName: 'short' }))).toBe('7 AM EDT');
    expect(format('not a date')).toBe('');
    // `Intl` throws for a style beside any other option, so the style is spelt out instead.
    expect(spaces(format('2026-10-19T11:30:00Z', { zone: 'utc', timeStyle: 'short', timeZoneName: 'short' }))).toBe('11:30 AM UTC');
    expect(format('2026-10-19', { dateStyle: 'long', weekday: 'short' })).toBe('Mon, October 19, 2026');
  });

  // Node writes U+202F before AM/PM where Chrome writes a space, which made every prerendered field a hydration error.
  it('writes the space V8 writes, so a server and a browser agree', () => {
    const narrow = String.fromCharCode(0x202f);
    expect(format('14:30', { locale: 'en-US' })).toBe('2:30 PM');
    expect(formatToParts('14:30', { locale: 'en-US' }).some((part) => part.value.includes(narrow))).toBe(false);
    expect(dayPeriodNames('es-ES').join('')).not.toContain(narrow);
  });

  it('prints a range and a relative time', () => {
    expect(spaces(formatRange('2026-10-19', '2026-10-23'))).toBe('Oct 19 – 23, 2026');
    const reference = '2026-10-19T12:00:00Z';
    expect(formatRelative('2026-10-20', { now: reference })).toBe('tomorrow');
    expect(formatRelative('2026-10-17', { now: reference })).toBe('2 days ago');
    expect(formatRelative('2026-10-19T11:57:00Z', { now: reference })).toBe('3 minutes ago');
    expect(formatRelative('2026-10-19T15:00:00Z', { now: reference, locale: 'de' })).toBe('in 3 Stunden');
  });

  it('names a zone', () => {
    expect(zoneName('America/New_York', { style: 'short', at: '2026-07-01T00:00:00Z' })).toBe('EDT');
    expect(zoneName('+03:00')).toBe('GMT+03:00');
  });
});

describe('the locale', () => {
  it('knows the week, the clock and the order of a date', () => {
    expect(weekInfo('en-US').firstDay).toBe(0);
    expect(weekInfo('ro-MD').firstDay).toBe(1);
    expect(hourCycleOf('en-US')).toBe(12);
    expect(hourCycleOf('ro-MD')).toBe(24);
    expect(dateOrder('en-US')).toEqual(['month', 'day', 'year']);
    expect(dateOrder('ro-MD')).toEqual(['day', 'month', 'year']);
    expect(dateOrder('sv-SE')).toEqual(['year', 'month', 'day']);
  });
});

describe('parsing text', () => {
  const reference = '2026-10-19T12:00:00Z';

  it('reads a date in the locale order', () => {
    expect(parse('19.10.2026', { locale: 'ro-MD' })).toBe('2026-10-19');
    expect(parse('10/19/2026', { locale: 'en-US' })).toBe('2026-10-19');
    expect(parse('03/04/2026', { locale: 'en-US' })).toBe('2026-03-04');
    expect(parse('03/04/2026', { locale: 'en-GB' })).toBe('2026-04-03');
    expect(parse('2026/10/19', { locale: 'en-US' })).toBe('2026-10-19');
    expect(parse('19.10.26', { locale: 'de-DE', reference })).toBe('2026-10-19');
    expect(parse('19.10', { locale: 'de-DE', reference })).toBe('2026-10-19');
  });

  it('reads a month by name, in the locale or in English', () => {
    expect(parse('19 oct 2026', { locale: 'en-GB' })).toBe('2026-10-19');
    expect(parse('October 19, 2026', { locale: 'en-US' })).toBe('2026-10-19');
    expect(parse('19 octombrie 2026', { locale: 'ro-MD' })).toBe('2026-10-19');
    expect(parse('19. Oktober 2026', { locale: 'de-DE' })).toBe('2026-10-19');
  });

  it('reads a time, a date-time and a relative day', () => {
    expect(parse('2:30 pm', { locale: 'en-US' })).toBe('14:30:00');
    expect(parse('12:05 AM', { locale: 'en-US' })).toBe('00:05:00');
    expect(parse('14h30', { locale: 'fr-FR' })).toBe('14:30:00');
    expect(parse('10/19/2026 2:30 PM', { locale: 'en-US' })).toBe('2026-10-19T14:30:00');
    expect(parse('19.10.2026 14:30', { locale: 'ro-MD', kind: 'instant', zone: 'Europe/Chisinau' })).toBe('2026-10-19T14:30:00+03:00');
    expect(parse('tomorrow', { reference })).toBe('2026-10-20');
    expect(parse('morgen', { locale: 'de', reference })).toBe('2026-10-20');
  });

  it('converts what it read to the kind asked for', () => {
    expect(parse('2026-10-19T23:30:00Z', { kind: 'date', zone: 'utc' })).toBe('2026-10-19');
    expect(parse(new Date(Date.UTC(2026, 9, 19)), { kind: 'date', zone: 'utc' })).toBe('2026-10-19');
    expect(parse('31.02.2026', { locale: 'ro-MD' })).toBeNull();
    expect(parse('banana', { locale: 'en-US' })).toBeNull();
  });
});

describe('the reader on a server', () => {
  it('reads the zone back out of the cookie the browser wrote', () => {
    const cookie = zoneCookie('America/Argentina/Buenos_Aires');
    expect(cookie).toMatch(/^tz=America%2FArgentina%2FBuenos_Aires; path=\/;/);
    expect(readZoneCookie(`a=1; ${cookie.split(';')[0]}; b=2`)).toBe('America/Argentina/Buenos_Aires');
    expect(readZoneCookie('a=1')).toBeUndefined();
    expect(readZoneCookie(undefined)).toBeUndefined();
  });
});
