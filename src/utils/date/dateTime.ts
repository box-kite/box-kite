import {
  addDays,
  addMonths,
  DateTimeFields,
  daysInMonth,
  dayOfWeek,
  epochDay,
  fieldsToMs,
  MIDNIGHT,
  mod,
  MS_PER_DAY,
  msToFields,
} from './calendar';
import { DateKind, epochOf, ParsedValue, toIso } from './iso';
import { weekInfo } from './locale';
import { defaultLocale, localZone } from './settings';
import { as, convert, DateInput, epochFor, instantIn, read, utcInstant, wallOf, withWall, written, zoneOf, ZoneOptions } from './value';
import { formatOffset, normalizeZone, offsetAt, requireZone, ZoneInput } from './zones';

/** An amount of time to move a value by. Years to days move the calendar; hours and below move the clock. */
export interface Duration {
  years?: number;
  months?: number;
  weeks?: number;
  days?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
  milliseconds?: number;
}

export type DateUnit = 'year' | 'quarter' | 'month' | 'week' | 'day' | 'hour' | 'minute' | 'second' | 'millisecond';

export interface UnitOptions extends ZoneOptions {
  /** Whose week `'week'` means — Monday-first in Moldova, Sunday-first in the US. Default the configured locale. */
  locale?: string;
}

/** Every reading of one value at once — what a date control hands its `onValueChange` beside the string. */
export interface DateTimeDetails {
  /** The value itself, written canonically. */
  value: string;
  kind: DateKind;
  /** The zone the wall-clock fields below are read in. */
  zone: string;
  /** The moment in UTC (`…Z`). A date is its midnight in `zone`; a time has none. */
  utc: string | null;
  /** The moment on `zone`'s wall clock, with its offset. */
  zoned: string | null;
  /** The same moment as the reader's own wall clock, with no zone: what a person in the browser sees. */
  local: string | null;
  /** `zone`'s offset at that moment, `+03:00`. */
  offset: string | null;
  /** A `Date` for the moment, for an API that wants one. */
  date: Date | null;
  /** Epoch milliseconds. */
  epoch: number | null;
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  millisecond: number;
}

const EXACT: Partial<Record<keyof Duration, number>> = { hours: 3_600_000, minutes: 60_000, seconds: 1000, milliseconds: 1 };

function exactMs(duration: Duration): number {
  return Object.entries(EXACT).reduce((sum, [key, size]) => sum + (duration[key as keyof Duration] ?? 0) * size, 0);
}

function moveCalendar(fields: DateTimeFields, duration: Duration): DateTimeFields {
  const months = (duration.years ?? 0) * 12 + (duration.months ?? 0);
  const moved = addDays(addMonths(fields, months), (duration.weeks ?? 0) * 7 + (duration.days ?? 0));

  return { ...fields, ...moved };
}

/** What kind a string is, or `null` when it is not a date value at all. */
export function kindOf(input: DateInput): DateKind | null {
  return read(input)?.kind ?? null;
}

/** Whether the input is a value — of `kind`, when one is named. */
export function isValid(input: DateInput, kind?: DateKind): boolean {
  const value = read(input);

  return value !== null && (kind === undefined || value.kind === kind);
}

/** The input rewritten canonically, its kind kept: `2026-10-19 14:30` → `2026-10-19T14:30:00`. */
export function normalize(input: DateInput): string | null {
  const value = read(input);

  return value && toIso(value);
}

/** The moment in UTC: `2026-10-19T11:30:00Z`. A date-time is read on `zone`'s wall clock, a date as its midnight there. */
export function toUtc(input: DateInput, options: Omit<ZoneOptions, 'zone'> & { from?: ZoneInput } = {}): string | null {
  const value = read(input, options.disambiguation);
  if (!value) return null;
  const epoch = epochFor(value, { zone: options.from, disambiguation: options.disambiguation });

  return epoch === null ? null : toIso(utcInstant(epoch));
}

/** The moment on another zone's wall clock, with that zone's offset: `2026-10-19T07:30:00-04:00`. */
export function toZone(input: DateInput, zone: ZoneInput, options: Omit<ZoneOptions, 'zone'> & { from?: ZoneInput } = {}): string | null {
  const value = read(input, options.disambiguation);
  if (!value) return null;
  const epoch = epochFor(value, { zone: options.from, disambiguation: options.disambiguation });

  return epoch === null ? null : toIso(instantIn(epoch, requireZone(zone)));
}

/** The moment on the reader's wall clock, with its offset. On a server, "the reader" is `configureDates({ timeZone })` or the server. */
export function toLocal(input: DateInput, options: Omit<ZoneOptions, 'zone'> & { from?: ZoneInput } = {}): string | null {
  return toZone(input, 'local', options);
}

/** The day an input falls on in `zone`: `2026-10-19`. */
export function toPlainDate(input: DateInput, options: ZoneOptions = {}): string | null {
  return as(input, 'date', options);
}

/** The wall-clock time an input shows in `zone`: `14:30:00`. */
export function toPlainTime(input: DateInput, options: ZoneOptions = {}): string | null {
  return as(input, 'time', options);
}

/** The wall clock an input shows in `zone`, with no zone attached: `2026-10-19T14:30:00`. */
export function toPlainDateTime(input: DateInput, options: ZoneOptions = {}): string | null {
  return as(input, 'datetime', options);
}

/** The instant an input names, on `zone`'s wall clock. A date-time is read there; a date is its midnight. */
export function toInstant(input: DateInput, options: ZoneOptions = {}): string | null {
  return as(input, 'instant', options);
}

/** Epoch milliseconds. */
export function toEpoch(input: DateInput, options: ZoneOptions = {}): number | null {
  const value = read(input, options.disambiguation);

  return value && epochFor(value, options);
}

/** A `Date`, for an API that insists. A date is its midnight in `zone`, which is the one way a `Date` can hold a day. */
export function toDate(input: DateInput, options: ZoneOptions = {}): Date | null {
  const epoch = toEpoch(input, options);

  return epoch === null ? null : new Date(epoch);
}

/** A `Date` or epoch milliseconds as a value of `kind` — by default the instant, in UTC. */
export function fromDate(date: Date | number, options: ZoneOptions & { kind?: DateKind } = {}): string | null {
  const value = read(date);
  if (!value) return null;
  const kind = options.kind ?? 'instant';

  return toIso(convert(value, kind, { ...options, zone: options.zone ?? (kind === 'instant' ? 'utc' : 'local') })!);
}

/** A date and a time put together: a date-time, or with `zone` the instant it names there. */
export function combine(date: DateInput, time: DateInput, options: ZoneOptions = {}): string | null {
  const day = read(date);
  const clock = read(time);
  if (!day || !clock || day.kind === 'time') return null;

  const dayFields = wallOf(day, options.zone);
  const clockFields = wallOf(clock, options.zone);
  const value: ParsedValue = {
    kind: 'datetime',
    fields: {
      ...dayFields,
      hour: clockFields.hour,
      minute: clockFields.minute,
      second: clockFields.second,
      millisecond: clockFields.millisecond,
    },
    offset: 0,
  };

  return options.zone === undefined ? toIso(value) : toIso(convert(value, 'instant', options)!);
}

/** Today's date in `zone`. Default the reader's. */
export function today(zone: ZoneInput = 'local'): string {
  return toIso(convert(utcInstant(Date.now()), 'date', { zone })!);
}

/** This moment on `zone`'s wall clock, with its offset — `now('utc')` is `…Z`. */
export function now(zone: ZoneInput = 'local'): string {
  return toIso(instantIn(Date.now(), requireZone(zone)));
}

/** The time on `zone`'s wall clock. */
export function currentTime(zone: ZoneInput = 'local'): string {
  return toIso(convert(utcInstant(Date.now()), 'time', { zone })!);
}

/**
 * Moves a value by a duration, keeping its kind. The calendar half (years to days) moves the wall clock, so a
 * day later is the same time tomorrow across a DST change; the clock half (hours down) moves the instant. A
 * date ignores the clock half, and a time wraps round midnight.
 */
export function add(input: DateInput, duration: Duration, options: ZoneOptions = {}): string | null {
  const value = read(input, options.disambiguation);
  if (!value) return null;

  if (value.kind === 'time') {
    const ms = mod(fieldsToMs(value.fields) + exactMs(duration), MS_PER_DAY);

    return toIso({ ...value, fields: { ...msToFields(ms), year: 1970, month: 1, day: 1 } });
  }
  if (value.kind === 'date') return toIso({ ...value, fields: moveCalendar(value.fields, duration) });
  if (value.kind === 'datetime')
    return toIso({ ...value, fields: msToFields(fieldsToMs(moveCalendar(value.fields, duration)) + exactMs(duration)) });

  const zone = zoneOf(value, options.zone);
  const moved = withWall(value, moveCalendar(wallOf(value, zone), duration), { ...options, zone });

  return toIso(written(value, epochOf(moved) + exactMs(duration), zone));
}

export function subtract(input: DateInput, duration: Duration, options: ZoneOptions = {}): string | null {
  const negated = Object.fromEntries(Object.entries(duration).map(([key, amount]) => [key, -(amount as number)])) as Duration;

  return add(input, negated, options);
}

function truncate(fields: DateTimeFields, unit: DateUnit, locale: string): DateTimeFields {
  switch (unit) {
    case 'year':
      return { ...fields, ...MIDNIGHT, month: 1, day: 1 };
    case 'quarter':
      return { ...fields, ...MIDNIGHT, month: Math.floor((fields.month - 1) / 3) * 3 + 1, day: 1 };
    case 'month':
      return { ...fields, ...MIDNIGHT, day: 1 };
    case 'week':
      return { ...fields, ...addDays(fields, -mod(dayOfWeek(fields) - weekInfo(locale).firstDay, 7)), ...MIDNIGHT };
    case 'day':
      return { ...fields, ...MIDNIGHT };
    case 'hour':
      return { ...fields, minute: 0, second: 0, millisecond: 0 };
    case 'minute':
      return { ...fields, second: 0, millisecond: 0 };
    case 'second':
      return { ...fields, millisecond: 0 };
    default:
      return fields;
  }
}

const NEXT: Record<DateUnit, Duration> = {
  year: { years: 1 },
  quarter: { months: 3 },
  month: { months: 1 },
  week: { weeks: 1 },
  day: { days: 1 },
  hour: { hours: 1 },
  minute: { minutes: 1 },
  second: { seconds: 1 },
  millisecond: { milliseconds: 1 },
};

/** The first moment of the unit a value is in — the 1st of its month, its week's first day in the locale, its hour. */
export function startOf(input: DateInput, unit: DateUnit, options: UnitOptions = {}): string | null {
  const value = read(input, options.disambiguation);
  if (!value) return null;

  const fields = truncate(wallOf(value, options.zone), unit, options.locale ?? defaultLocale());
  if (value.kind === 'time') return toIso({ ...value, fields: { ...fields, year: 1970, month: 1, day: 1 } });

  return toIso(withWall(value, fields, options));
}

/** The last moment of the unit — for a date, the last day; for anything with a clock, one millisecond before the next unit. */
export function endOf(input: DateInput, unit: DateUnit, options: UnitOptions = {}): string | null {
  const start = startOf(input, unit, options);
  const next = start && add(start, NEXT[unit], options);
  if (!next) return null;

  return kindOf(next) === 'date' ? add(next, { days: -1 }, options) : add(next, { milliseconds: -1 }, options);
}

/**
 * Below zero when `a` is earlier, above when later, `0` when equal. Two values of one zone-free kind compare
 * on their wall clocks; anything else compares as instants, a zone-free side read in `zone`.
 */
export function compare(a: DateInput, b: DateInput, options: ZoneOptions = {}): number {
  const left = read(a, options.disambiguation);
  const right = read(b, options.disambiguation);
  if (!left || !right) return left ? 1 : right ? -1 : 0;
  if (left.kind === right.kind && left.kind !== 'instant') return Math.sign(fieldsToMs(left.fields) - fieldsToMs(right.fields));
  if (left.kind === 'time' || right.kind === 'time')
    return Math.sign((fieldsToMs(wallOf(left, options.zone)) % MS_PER_DAY) - (fieldsToMs(wallOf(right, options.zone)) % MS_PER_DAY));

  return Math.sign((epochFor(left, options) ?? 0) - (epochFor(right, options) ?? 0));
}

export function isBefore(a: DateInput, b: DateInput, options: ZoneOptions = {}): boolean {
  return compare(a, b, options) < 0;
}

export function isAfter(a: DateInput, b: DateInput, options: ZoneOptions = {}): boolean {
  return compare(a, b, options) > 0;
}

/** Whether two inputs are the same moment — `…14:30+03:00` and `…11:30Z` are. */
export function isEqual(a: DateInput, b: DateInput, options: ZoneOptions = {}): boolean {
  return read(a) !== null && read(b) !== null && compare(a, b, options) === 0;
}

/** Whether two inputs fall in the same unit — the same day, the same week in the locale — on `zone`'s wall clock. */
export function isSame(a: DateInput, b: DateInput, unit: DateUnit, options: UnitOptions = {}): boolean {
  const left = read(a);
  const right = read(b);
  if (!left || !right) return false;
  const locale = options.locale ?? defaultLocale();

  return fieldsToMs(truncate(wallOf(left, options.zone), unit, locale)) === fieldsToMs(truncate(wallOf(right, options.zone), unit, locale));
}

/** Whether `input` is from `start` to `end`, both included. A missing end is open. */
export function isBetween(input: DateInput, start: DateInput, end: DateInput, options: ZoneOptions = {}): boolean {
  return (start == null || compare(input, start, options) >= 0) && (end == null || compare(input, end, options) <= 0);
}

/** The input, moved inside `[min, max]`. */
export function clamp(input: DateInput, min: DateInput, max: DateInput, options: ZoneOptions = {}): string | null {
  if (min != null && compare(input, min, options) < 0) return normalize(min);
  if (max != null && compare(input, max, options) > 0) return normalize(max);

  return normalize(input);
}

const UNIT_MS: Partial<Record<DateUnit, number>> = {
  week: 7 * MS_PER_DAY,
  day: MS_PER_DAY,
  hour: 3_600_000,
  minute: 60_000,
  second: 1000,
  millisecond: 1,
};

/**
 * How many whole units `a` is after `b` (negative when before). Months and years count on the calendar — 31
 * January to 28 February is not yet a month — and days count calendar days between two dates.
 */
export function difference(a: DateInput, b: DateInput, unit: DateUnit, options: ZoneOptions = {}): number | null {
  const left = read(a, options.disambiguation);
  const right = read(b, options.disambiguation);
  if (!left || !right) return null;

  const plain = left.kind !== 'instant' && right.kind !== 'instant';
  const leftWall = wallOf(left, options.zone);
  const rightWall = wallOf(right, options.zone);

  if (unit === 'year' || unit === 'quarter' || unit === 'month') {
    let months = (leftWall.year - rightWall.year) * 12 + leftWall.month - rightWall.month;
    const leftRest = fieldsToMs({ ...leftWall, year: 1970, month: 1 });
    const rightRest = fieldsToMs({ ...rightWall, year: 1970, month: 1 });
    if (months > 0 && leftRest < rightRest) months -= 1;
    if (months < 0 && leftRest > rightRest) months += 1;

    return Math.trunc(months / (unit === 'year' ? 12 : unit === 'quarter' ? 3 : 1)) || 0;
  }

  const delta = plain ? fieldsToMs(leftWall) - fieldsToMs(rightWall) : (epochFor(left, options) ?? 0) - (epochFor(right, options) ?? 0);
  if ((unit === 'day' || unit === 'week') && left.kind === 'date' && right.kind === 'date') {
    return Math.trunc((epochDay(leftWall) - epochDay(rightWall)) / (unit === 'week' ? 7 : 1)) || 0;
  }

  return Math.trunc(delta / (UNIT_MS[unit] ?? 1)) || 0;
}

/** How many days the month a value falls in has. */
export function daysInMonthOf(input: DateInput, options: ZoneOptions = {}): number | null {
  const value = read(input);
  if (!value || value.kind === 'time') return null;
  const fields = wallOf(value, options.zone);

  return daysInMonth(fields.year, fields.month);
}

/**
 * Every reading of a value at once: the canonical string, the UTC moment, the moment on `zone`'s wall clock
 * and on the reader's, the offset, a `Date`, the epoch, and the wall-clock fields. `null` for a non-value.
 */
export function details(input: DateInput, options: ZoneOptions = {}): DateTimeDetails | null {
  const value = read(input, options.disambiguation);
  if (!value) return null;

  const zone = value.kind === 'instant' ? zoneOf(value, options.zone) : requireZone(options.zone);
  const epoch = value.kind === 'time' ? null : epochFor(value, { ...options, zone });
  const fields = wallOf(value, zone);
  const reader = localZone();

  return {
    value: toIso(value),
    kind: value.kind,
    zone,
    utc: epoch === null ? null : toIso(utcInstant(epoch)),
    zoned: epoch === null ? null : toIso(instantIn(epoch, zone)),
    local:
      epoch === null
        ? toIso(value)
        : value.kind === 'date'
          ? toIso(value)
          : toIso({ kind: 'datetime', fields: wallOf(instantIn(epoch, reader), reader), offset: 0 }),
    offset: epoch === null ? null : formatOffset(offsetAt(zone, epoch)),
    date: epoch === null ? null : new Date(epoch),
    epoch,
    year: fields.year,
    month: fields.month,
    day: fields.day,
    hour: fields.hour,
    minute: fields.minute,
    second: fields.second,
    millisecond: fields.millisecond,
  };
}

/** Minutes east of UTC that `zone` is at a moment (default now): `180` for Chisinau in summer, `-240` for New York. */
export function offsetOf(zone: ZoneInput = 'local', at: DateInput = Date.now()): number | null {
  const value = read(at);
  const epoch = value && epochFor(value, { zone });

  return epoch === null || epoch === undefined ? null : offsetAt(requireZone(zone), epoch);
}

/** What a date control reports beside its value: the readings an app most often wants, all `null` for no value. */
export interface DateReadings {
  /** The moment in UTC, `…Z`. A date is its midnight in the control's zone; a time has none. */
  utc: string | null;
  /** The moment on the reader's own wall clock, with no zone. */
  local: string | null;
  /** The moment on the control's zone's wall clock, with its offset. */
  zoned: string | null;
  date: Date | null;
  epoch: number | null;
  /** The zone the control reads and writes in. */
  zone: string;
  offset: string | null;
}

/** The readings for a value in a control's zone — what `onValueChange` hands over beside the string. */
export function readingsOf(value: string | null | undefined, zone: ZoneInput = 'local'): DateReadings {
  const reading = value ? details(value, { zone }) : null;

  return {
    utc: reading?.utc ?? null,
    local: reading?.local ?? null,
    zoned: reading?.zoned ?? null,
    date: reading?.date ?? null,
    epoch: reading?.epoch ?? null,
    zone: reading?.zone ?? normalizeZone(zone) ?? 'UTC',
    offset: reading?.offset ?? null,
  };
}
