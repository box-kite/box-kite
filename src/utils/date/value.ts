import { DateTimeFields, fieldsToMs, MIDNIGHT, MS_PER_MINUTE, msToFields } from './calendar';
import { DateKind, epochOf, parseIso, ParsedValue, toIso } from './iso';
import { Disambiguation, fixedOffset, offsetAt, requireZone, wallAt, wallToEpoch, ZoneInput } from './zones';

/** Anything the date layer reads: an ISO string, a `Date`, or epoch milliseconds. `null` and `undefined` read as nothing. */
export type DateInput = string | number | Date | null | undefined;

export interface ZoneOptions {
  /**
   * The zone a wall clock is read or written in. Default `'local'` — the reader's zone in a browser, and on
   * a server the configured one (`configureDates({ timeZone })`) or the server's own.
   */
  zone?: ZoneInput;
  /** What a wall-clock time a zone skips or repeats means. Default `'compatible'`. */
  disambiguation?: Disambiguation;
}

/** An instant re-expressed in `zone`: same moment, that zone's wall clock and offset. */
export function instantIn(epoch: number, zone: string): ParsedValue {
  const offset = offsetAt(zone, epoch);

  return { kind: 'instant', fields: msToFields(epoch + offset * MS_PER_MINUTE), offset, zone };
}

/**
 * Takes any input apart. A string is ISO 8601 / RFC 3339 / RFC 9557, or — for what a server or a mail header
 * writes (`Mon, 19 Oct 2026 14:30:00 GMT`) — whatever `Date.parse` reads, as long as it names its offset.
 */
export function read(input: DateInput, disambiguation?: Disambiguation): ParsedValue | null {
  if (input === null || input === undefined || input === '') return null;
  if (input instanceof Date || typeof input === 'number') {
    const epoch = typeof input === 'number' ? input : input.getTime();

    return Number.isFinite(epoch) ? utcInstant(epoch) : null;
  }
  if (typeof input !== 'string') return null;

  const iso = parseIso(input, disambiguation);
  if (iso) return iso;
  // A text with no offset in it would be read in the runtime's zone, which differs between server and browser.
  if (/[a-z]{3}/i.test(input) && /(gmt|utc|\dz\b|[+-]\d{2}:?\d{2})/i.test(input)) {
    const epoch = Date.parse(input);
    if (Number.isFinite(epoch)) return utcInstant(epoch);
  }

  return null;
}

/** An instant written in UTC (`…Z`) with no zone named: the shape a `Date`, a server and JSON all write. */
export function utcInstant(epoch: number): ParsedValue {
  return { kind: 'instant', fields: msToFields(epoch), offset: 0 };
}

/**
 * The zone an instant is read in: the one asked for, the one it names in brackets, or the reader's. Its offset alone
 * does not name a zone — `…Z` from a server is a moment, not a statement about where anybody is.
 */
export function zoneOf(value: ParsedValue, zone?: ZoneInput): string {
  if (zone !== undefined) return requireZone(zone);

  return value.zone ?? requireZone('local');
}

/** A result written the way its input was: `…Z` stays `…Z`, anything else takes the zone it was worked out in. */
export function written(source: ParsedValue, epoch: number, zone: string): ParsedValue {
  return source.offset === 0 && source.zone === undefined ? utcInstant(epoch) : instantIn(epoch, zone);
}

/**
 * A value as another kind, in `zone` — the one conversion everything else is written on. Returns `null` for a
 * conversion with nothing to go on: a time has no date, so it has no instant either.
 */
export function convert(value: ParsedValue, kind: DateKind, options: ZoneOptions = {}): ParsedValue | null {
  const { disambiguation = 'compatible' } = options;
  if (value.kind === kind && kind !== 'instant') return value;
  if (value.kind === 'time' || (value.kind === 'date' && kind === 'time')) return null;

  if (kind === 'instant') {
    const zone = requireZone(options.zone);
    const epoch =
      value.kind === 'instant'
        ? epochOf(value)
        : wallToEpoch(value.kind === 'date' ? { ...value.fields, ...MIDNIGHT } : value.fields, zone, disambiguation);

    return epoch === null ? null : instantIn(epoch, zone);
  }

  const fields: DateTimeFields = value.kind === 'instant' ? wallAt(requireZone(options.zone), epochOf(value)) : value.fields;
  if (kind === 'date') return { kind, fields: { ...fields, ...MIDNIGHT }, offset: 0 };
  if (kind === 'time') return { kind, fields: { ...fields, year: 1970, month: 1, day: 1 }, offset: 0 };

  return { kind, fields, offset: 0 };
}

/** The canonical string for any input as `kind`, or `null`. */
export function as(input: DateInput, kind: DateKind, options: ZoneOptions = {}): string | null {
  const value = read(input, options.disambiguation);
  const converted = value && convert(value, kind, options);

  return converted ? toIso(converted) : null;
}

/** The epoch an input names — a date is its midnight and a date-time its wall clock, both in `zone`. */
export function epochFor(value: ParsedValue, options: ZoneOptions = {}): number | null {
  if (value.kind === 'instant') return epochOf(value);
  const instant = convert(value, 'instant', options);

  return instant ? epochOf(instant) : null;
}

/** The wall clock a value shows: its own fields, or for an instant the fields in `zone`. */
export function wallOf(value: ParsedValue, zone?: ZoneInput): DateTimeFields {
  return value.kind === 'instant' ? wallAt(zoneOf(value, zone), epochOf(value)) : value.fields;
}

/** A value of the same kind built from a new wall clock, re-resolved in its zone when it is an instant. */
export function withWall(value: ParsedValue, fields: DateTimeFields, options: ZoneOptions = {}): ParsedValue {
  if (value.kind !== 'instant') return { ...value, fields };

  const zone = zoneOf(value, options.zone);
  const epoch =
    wallToEpoch(fields, zone, options.disambiguation ?? 'compatible') ?? fieldsToMs(fields) - (fixedOffset(zone) ?? 0) * MS_PER_MINUTE;

  return written(value, epoch, zone);
}
