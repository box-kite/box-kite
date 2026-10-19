import { addDays, DateTimeFields, fieldsToMs, isValidDate, isValidTime, MIDNIGHT, MS_PER_MINUTE } from './calendar';
import { Disambiguation, fixedOffset, formatOffset, normalizeZone, wallToEpoch } from './zones';

/**
 * The four things a date value can be, and the string each one is written as:
 *
 * - `date` — a day with no time and no zone: `2026-10-19`. A birthday, a due date.
 * - `time` — a wall-clock time with no date: `14:30:00`. Opening hours.
 * - `datetime` — a date and a time with no zone: `2026-10-19T14:30:00`. "Local" in the sense of *wherever you
 *   are* — an alarm, a train timetable. Temporal's `PlainDateTime`.
 * - `instant` — one moment in time, written with the offset it was read in: `2026-10-19T14:30:00+03:00`, or
 *   `…Z` in UTC. Anything stored, compared across zones or sent to a server.
 */
export type DateKind = 'date' | 'time' | 'datetime' | 'instant';

/** A value taken apart: the wall clock as written, plus — for an instant — the offset and zone it was written in. */
export interface ParsedValue {
  kind: DateKind;
  fields: DateTimeFields;
  /** Minutes east of UTC. Instants only. */
  offset: number;
  /** The IANA zone named in brackets (`…+03:00[Europe/Chisinau]`), when there was one. */
  zone?: string;
}

const DATE_TIME =
  /^([+-]\d{6}|\d{4})-?(\d{2})-?(\d{2})(?:(?:T|t|\s+)(\d{2})(?::?(\d{2})(?::?(\d{2})(?:[.,](\d{1,9}))?)?)?)?\s*(Z|z|[+-]\d{2}(?::?\d{2}(?::?\d{2})?)?)?(?:\[!?([^\]=]+)\])*$/;
const TIME = /^T?(\d{1,2}):(\d{2})(?::(\d{2})(?:[.,](\d{1,9}))?)?$/;

function fraction(text: string | undefined): number {
  return text ? Math.floor(Number(`0.${text}`) * 1000) : 0;
}

/** The epoch an instant names. */
export function epochOf(value: ParsedValue): number {
  return fieldsToMs(value.fields) - value.offset * MS_PER_MINUTE;
}

/**
 * Reads an ISO 8601 / RFC 3339 / RFC 9557 string: a date, a time, a date-time, or one with an offset (`Z`,
 * `+03:00`) and optionally a bracketed zone. `T` or a space between the halves, seconds and fractions
 * optional, the basic form (`20261019T1430`) too. A bracketed zone with no offset is resolved in that zone.
 */
export function parseIso(input: string, disambiguation: Disambiguation = 'compatible'): ParsedValue | null {
  const text = input.trim();
  const time = TIME.exec(text);
  if (time) {
    const fields = {
      year: 1970,
      month: 1,
      day: 1,
      hour: Number(time[1]),
      minute: Number(time[2]),
      second: Number(time[3] ?? 0),
      millisecond: fraction(time[4]),
    };

    return isValidTime(fields) ? { kind: 'time', fields, offset: 0 } : null;
  }

  const match = DATE_TIME.exec(text);
  if (!match) return null;

  const [, year, month, day, hour, minute, second, frac, offset, zoneName] = match;
  let fields: DateTimeFields = {
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour: Number(hour ?? 0),
    minute: Number(minute ?? 0),
    second: Math.min(Number(second ?? 0), 59),
    millisecond: fraction(frac),
  };
  if (!isValidDate(fields)) return null;
  // `24:00` is the end of the day, which ISO writes as the start of the next.
  if (fields.hour === 24 && fields.minute === 0 && fields.second === 0 && fields.millisecond === 0) {
    fields = { ...fields, ...addDays(fields, 1), hour: 0 };
  }
  if (!isValidTime(fields)) return null;
  if (hour === undefined) return offset || zoneName ? null : { kind: 'date', fields, offset: 0 };

  const zone = zoneName ? (normalizeZone(zoneName) ?? undefined) : undefined;
  if (zoneName && !zone) return null;
  if (offset) {
    const minutes = /^z$/i.test(offset) ? 0 : fixedOffset(offset.length === 3 ? `${offset}:00` : offset);
    if (minutes === undefined) return null;

    return { kind: 'instant', fields, offset: minutes, zone };
  }
  if (zone) {
    const epoch = wallToEpoch(fields, zone, disambiguation);
    if (epoch === null) return null;

    return { kind: 'instant', fields, offset: (fieldsToMs(fields) - epoch) / MS_PER_MINUTE, zone };
  }

  return { kind: 'datetime', fields, offset: 0 };
}

function pad(value: number, length = 2): string {
  return String(value).padStart(length, '0');
}

function yearText(year: number): string {
  return year >= 0 && year <= 9999 ? pad(year, 4) : `${year < 0 ? '-' : '+'}${pad(Math.abs(year), 6)}`;
}

export function dateText(fields: DateTimeFields): string {
  return `${yearText(fields.year)}-${pad(fields.month)}-${pad(fields.day)}`;
}

/** Seconds always, milliseconds when there are any — Temporal's rule, so a value never changes length with its content. */
export function timeText(fields: DateTimeFields): string {
  const base = `${pad(fields.hour)}:${pad(fields.minute)}:${pad(fields.second)}`;

  return fields.millisecond ? `${base}.${pad(fields.millisecond, 3)}` : base;
}

/** The canonical string for a value. An instant in UTC is written `Z`; in any other zone with its offset. */
export function toIso(value: ParsedValue, zoneSuffix = false): string {
  switch (value.kind) {
    case 'date':
      return dateText(value.fields);
    case 'time':
      return timeText(value.fields);
    case 'datetime':
      return `${dateText(value.fields)}T${timeText(value.fields)}`;
    default: {
      const offset = value.offset === 0 && (value.zone === undefined || value.zone === 'UTC') ? 'Z' : formatOffset(value.offset);
      const suffix = zoneSuffix && value.zone && value.zone !== 'UTC' && fixedOffset(value.zone) === undefined ? `[${value.zone}]` : '';

      return `${dateText(value.fields)}T${timeText(value.fields)}${offset}${suffix}`;
    }
  }
}

export function dateValue(fields: { year: number; month: number; day: number }): ParsedValue {
  return { kind: 'date', fields: { ...fields, ...MIDNIGHT }, offset: 0 };
}
