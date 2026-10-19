import { daysInMonth, mod } from './calendar';
import { formatter, tidy } from './format';
import { toIso } from './iso';
import { dayPeriodNames } from './locale';
import { convert, instantIn, read } from './value';
import { Disambiguation, wallToEpoch } from './zones';

/** What a field edits: a day, a time of day, or both. */
export type FieldType = 'date' | 'time' | 'datetime';

/** How fine a time is edited. */
export type FieldGranularity = 'minute' | 'second';

/** A part of a field a person edits, one number at a time. */
export type SegmentType = 'year' | 'month' | 'day' | 'hour' | 'minute' | 'second' | 'dayPeriod';

export interface Segment {
  type: SegmentType | 'literal';
  /** What a literal reads — a `/`, a `.`, a `, `. */
  text: string;
}

export interface FieldConfig {
  type: FieldType;
  locale: string;
  hourCycle: 12 | 24;
  granularity: FieldGranularity;
}

/** A field part-way through being filled in: one number per segment, `dayPeriod` 0 for AM and 1 for PM. */
export type Draft = Partial<Record<SegmentType, number>>;

const KNOWN = new Set<string>(['year', 'month', 'day', 'hour', 'minute', 'second', 'dayPeriod']);

/**
 * The segments in the order the locale writes them, with its own separators — `dd.mm.yyyy` in Moldova,
 * `mm/dd/yyyy` in the US, `yyyy-mm-dd` in Sweden. Read off `formatToParts`, so no locale table ships, and on
 * the Gregorian calendar with Latin digits whatever the locale's default, since the field edits numbers.
 */
export function segmentsFor(config: FieldConfig): Segment[] {
  const date = config.type === 'time' ? {} : { year: 'numeric', month: '2-digit', day: '2-digit' };
  const time =
    config.type === 'date'
      ? {}
      : {
          hour: '2-digit',
          minute: '2-digit',
          ...(config.granularity === 'second' ? { second: '2-digit' } : {}),
          hourCycle: config.hourCycle === 12 ? 'h12' : 'h23',
        };
  const parts = formatter(config.locale, {
    ...date,
    ...time,
    calendar: 'gregory',
    numberingSystem: 'latn',
    timeZone: 'UTC',
  } as Intl.DateTimeFormatOptions).formatToParts(Date.UTC(2026, 10, 23, 15, 45, 30));

  const segments: Segment[] = [];
  for (const part of parts) {
    if (KNOWN.has(part.type)) segments.push({ type: part.type as SegmentType, text: '' });
    else if (part.type === 'literal') {
      const last = segments[segments.length - 1];
      if (last?.type === 'literal') last.text += tidy(part.value);
      else segments.push({ type: 'literal', text: tidy(part.value) });
    }
  }
  while (segments[0]?.type === 'literal') segments.shift();
  while (segments[segments.length - 1]?.type === 'literal') segments.pop();

  return segments;
}

/** The editable segments alone. */
export function editable(segments: readonly Segment[]): SegmentType[] {
  return segments.filter((segment) => segment.type !== 'literal').map((segment) => segment.type as SegmentType);
}

/** The values a segment takes. A day's top follows the month and year typed so far — 29 in a leap February. */
export function rangeOf(type: SegmentType, draft: Draft, config: FieldConfig): { min: number; max: number } {
  switch (type) {
    case 'year':
      return { min: 1, max: 9999 };
    case 'month':
      return { min: 1, max: 12 };
    case 'day':
      return { min: 1, max: draft.month ? daysInMonth(draft.year ?? 2000, draft.month) : 31 };
    case 'hour':
      return config.hourCycle === 12 ? { min: 1, max: 12 } : { min: 0, max: 23 };
    case 'dayPeriod':
      return { min: 0, max: 1 };
    default:
      return { min: 0, max: 59 };
  }
}

/** What an arrow key on an empty segment starts from: the placeholder's own value. */
function seed(type: SegmentType, placeholder: Draft): number {
  return placeholder[type] ?? 0;
}

/** Up or down by `delta`, wrapping inside the segment's range the way a clock does. An empty segment takes its placeholder. */
export function step(draft: Draft, type: SegmentType, delta: number, config: FieldConfig, placeholder: Draft): Draft {
  const current = draft[type];
  if (current === undefined) return { ...draft, [type]: seed(type, placeholder) };

  const { min, max } = rangeOf(type, draft, config);

  return { ...draft, [type]: min + mod(current - min + delta, max - min + 1) };
}

/** How far Page Up and Page Down move a segment. */
export const PAGE_STEP: Record<SegmentType, number> = { year: 5, month: 2, day: 7, hour: 2, minute: 15, second: 15, dayPeriod: 1 };

export interface Typed {
  draft: Draft;
  /** The digits typed into this segment so far, which a next digit appends to. */
  buffer: string;
  /** Whether no further digit could make sense here, so focus moves on. */
  advance: boolean;
}

/**
 * One digit typed into a segment. It appends while the number still fits the range and starts again when it
 * would not, and focus moves on as soon as another digit could not fit — `4` in a month is April at once,
 * `1` waits for a `0`, `1` or `2`.
 */
export function typeDigit(draft: Draft, type: SegmentType, buffer: string, digit: string, config: FieldConfig): Typed {
  const { min, max } = rangeOf(type, draft, config);
  const width = type === 'year' ? 4 : String(max).length;
  let next = buffer + digit;
  if (Number(next) > max || next.length > width) next = digit;

  const number = Number(next);
  const value = number >= min && number <= max ? number : undefined;

  return { draft: { ...draft, [type]: value }, buffer: next, advance: next.length >= width || number * 10 > max };
}

/** A letter typed into the AM/PM segment: the first letter of either period in the locale, or `a`/`p`. */
export function typePeriod(draft: Draft, letter: string, locale: string): Draft | null {
  const key = letter.toLocaleLowerCase(locale);
  const [am, pm] = dayPeriodNames(locale).map((name) => name.toLocaleLowerCase(locale));
  if (key === 'a' || am.startsWith(key)) return { ...draft, dayPeriod: 0 };
  if (key === 'p' || pm.startsWith(key)) return { ...draft, dayPeriod: 1 };

  return null;
}

/**
 * What an empty segment shows: the part's letters, so `mm/dd/yyyy` says which part is which where a run of dashes
 * reads as one rule. A period shows the locale's own AM.
 */
const PLACEHOLDERS: Record<Exclude<SegmentType, 'dayPeriod'>, string> = {
  year: 'yyyy',
  month: 'mm',
  day: 'dd',
  hour: 'hh',
  minute: 'mm',
  second: 'ss',
};

/** What a segment shows: its number padded, the digits being typed, AM/PM, or its placeholder when empty. */
export function segmentText(type: SegmentType, draft: Draft, buffer: string, locale: string): string {
  const value = draft[type];
  if (type === 'dayPeriod') return dayPeriodNames(locale)[value ?? 0];
  if (buffer && (value === undefined || type === 'year')) return buffer;
  if (value === undefined) return PLACEHOLDERS[type];

  return String(value).padStart(type === 'year' ? 4 : 2, '0');
}

export interface FieldValueOptions {
  /** The zone a date-time is an instant in; `null` keeps it a wall clock with no zone. */
  zone: string | null;
  disambiguation?: Disambiguation;
}

/** Whether every segment the field shows has a number. */
export function isComplete(draft: Draft, segments: readonly Segment[]): boolean {
  return editable(segments).every((type) => draft[type] !== undefined);
}

/** The 0–23 hour a draft names, from a 24-hour segment or a 12-hour one and its period. */
function hour24(draft: Draft, config: FieldConfig): number {
  const hour = draft.hour ?? 0;

  return config.hourCycle === 12 ? (hour % 12) + (draft.dayPeriod ?? 0) * 12 : hour;
}

/**
 * The value a draft spells, or `null` while a segment is empty. A day past the month's end (31 typed before a
 * February) is pulled back onto its last day, the way a calendar would read it.
 */
export function valueOf(draft: Draft, segments: readonly Segment[], config: FieldConfig, options: FieldValueOptions): string | null {
  if (!isComplete(draft, segments)) return null;

  const year = draft.year ?? 1970;
  const month = draft.month ?? 1;
  const fields = {
    year,
    month,
    day: Math.min(draft.day ?? 1, daysInMonth(year, month)),
    hour: config.type === 'date' ? 0 : hour24(draft, config),
    minute: draft.minute ?? 0,
    second: draft.second ?? 0,
    millisecond: 0,
  };

  if (config.type === 'date') return toIso({ kind: 'date', fields, offset: 0 });
  if (config.type === 'time') return toIso({ kind: 'time', fields: { ...fields, year: 1970, month: 1, day: 1 }, offset: 0 });
  if (options.zone === null) return toIso({ kind: 'datetime', fields, offset: 0 });

  const epoch = wallToEpoch(fields, options.zone, options.disambiguation ?? 'compatible');

  return epoch === null ? null : toIso(instantIn(epoch, options.zone));
}

/** A value taken apart into a draft, on `zone`'s wall clock. Anything unreadable is an empty draft. */
export function draftOf(value: string | null | undefined, config: FieldConfig, zone: string | null): Draft {
  const parsed = read(value);
  if (!parsed) return {};

  const kind = config.type === 'datetime' ? 'datetime' : config.type;
  const converted = convert(parsed, kind, { zone: zone ?? undefined });
  if (!converted) return {};

  const { year, month, day, hour, minute, second } = converted.fields;
  const draft: Draft = {};
  if (config.type !== 'time') Object.assign(draft, { year, month, day });
  if (config.type !== 'date') {
    Object.assign(draft, { minute, second });
    if (config.hourCycle === 12) Object.assign(draft, { hour: hour % 12 || 12, dayPeriod: hour >= 12 ? 1 : 0 });
    else draft.hour = hour;
  }

  return draft;
}

/** The segments a draft keeps when the config changes shape — a 12-hour clock turned to 24 keeps the time. */
export function reshape(draft: Draft, from: FieldConfig, to: FieldConfig): Draft {
  if (from.hourCycle === to.hourCycle || draft.hour === undefined) return draft;
  if (to.hourCycle === 24) {
    const { dayPeriod: _period, ...rest } = draft;

    return { ...rest, hour: hour24(draft, from) };
  }

  return { ...draft, hour: draft.hour % 12 || 12, dayPeriod: draft.hour >= 12 ? 1 : 0 };
}

/** The times of a day every `step` minutes from midnight — what a time list offers. */
export function timeSlots(step: number): string[] {
  const minutes = Math.max(1, Math.round(step));
  const slots: string[] = [];
  for (let at = 0; at < 24 * 60; at += minutes) {
    slots.push(`${String(Math.floor(at / 60)).padStart(2, '0')}:${String(at % 60).padStart(2, '0')}:00`);
  }

  return slots;
}

/** The slot a time falls in, so a list highlights 14:30 for 14:37 on a half-hour step. */
export function slotOf(time: string | null, step: number): string | null {
  const match = time && /^(\d{2}):(\d{2})/.exec(time);
  if (!match) return null;
  const minutes = Math.max(1, Math.round(step));
  const at = Math.floor((Number(match[1]) * 60 + Number(match[2])) / minutes) * minutes;

  return `${String(Math.floor(at / 60)).padStart(2, '0')}:${String(at % 60).padStart(2, '0')}:00`;
}
