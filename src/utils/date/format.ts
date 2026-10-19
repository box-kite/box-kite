import { DateTimeFields, epochDay, fieldsToMs, MS_PER_MINUTE } from './calendar';
import { epochOf, ParsedValue } from './iso';
import { defaultLocale } from './settings';
import { DateInput, read, zoneOf } from './value';
import { fixedOffset, offsetAt, wallAt, ZoneInput } from './zones';

/** What `Intl.DateTimeFormat` takes, less the zone, which is spelt `zone` here and accepts `'local'`. */
export interface FormatOptions extends Omit<Intl.DateTimeFormatOptions, 'timeZone'> {
  /** A BCP 47 tag. Default: the configured locale, or the runtime's. */
  locale?: string;
  /** The wall clock an instant is shown on. Default `'local'`. A date, a time or a date-time has no zone, so this does nothing to one. */
  zone?: ZoneInput;
}

const COMPONENTS = [
  'weekday',
  'era',
  'year',
  'month',
  'day',
  'dayPeriod',
  'hour',
  'minute',
  'second',
  'fractionalSecondDigits',
  'dateStyle',
  'timeStyle',
] as const;
const formatters = new Map<string, Intl.DateTimeFormat>();

/** One formatter per locale and option set: building one costs ~40µs and formatting with a cached one ~4µs. */
export function formatter(locale: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${locale}|${JSON.stringify(options)}`;
  let cached = formatters.get(key);
  if (!cached) {
    cached = new Intl.DateTimeFormat(locale, options);
    formatters.set(key, cached);
  }

  return cached;
}

/** The options a kind is shown with when the caller named none. */
function defaults(kind: ParsedValue['kind']): Intl.DateTimeFormatOptions {
  if (kind === 'date') return { dateStyle: 'medium' };
  if (kind === 'time') return { timeStyle: 'short' };

  return { dateStyle: 'medium', timeStyle: 'short' };
}

interface Prepared {
  epoch: number;
  options: Intl.DateTimeFormatOptions;
}

/** The options `Intl` takes beside a style; any other one beside it throws. */
const STYLE_COMPANIONS = new Set(['timeZone', 'hourCycle', 'hour12', 'calendar', 'numberingSystem', 'localeMatcher']);

const DATE_STYLES: Record<string, Intl.DateTimeFormatOptions> = {
  short: { year: '2-digit', month: 'numeric', day: 'numeric' },
  medium: { year: 'numeric', month: 'short', day: 'numeric' },
  long: { year: 'numeric', month: 'long', day: 'numeric' },
  full: { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' },
};
const TIME_STYLES: Record<string, Intl.DateTimeFormatOptions> = {
  short: { hour: 'numeric', minute: '2-digit' },
  medium: { hour: 'numeric', minute: '2-digit', second: '2-digit' },
  long: { hour: 'numeric', minute: '2-digit', second: '2-digit', timeZoneName: 'short' },
  full: { hour: 'numeric', minute: '2-digit', second: '2-digit', timeZoneName: 'long' },
};

/**
 * `Intl` refuses `dateStyle`/`timeStyle` beside any other option — `timeStyle` with a `timeZoneName` throws
 * "Invalid option" — so a style asked for alongside them is spelt out into the options it stands for.
 */
function expandStyles(options: Intl.DateTimeFormatOptions): Intl.DateTimeFormatOptions {
  const { dateStyle, timeStyle, ...rest } = options;
  const mixed = Object.entries(rest).some(([key, value]) => value !== undefined && !STYLE_COMPANIONS.has(key));
  if ((!dateStyle && !timeStyle) || !mixed) return options;

  return { ...(dateStyle ? DATE_STYLES[dateStyle] : {}), ...(timeStyle ? TIME_STYLES[timeStyle] : {}), ...rest };
}

/**
 * The epoch and the Intl options that print a value. A value with no zone is printed in UTC from its own wall
 * clock, so a date is never shifted by whatever zone the runtime happens to be in.
 */
function prepare(value: ParsedValue, options: FormatOptions): Prepared {
  const { locale: _locale, zone, ...rest } = options;
  const named = COMPONENTS.some((key) => rest[key] !== undefined);
  const intl = expandStyles(named ? rest : { ...defaults(value.kind), ...rest });

  if (value.kind !== 'instant') {
    const { timeZoneName: _name, ...plain } = intl;

    return { epoch: fieldsToMs(value.fields), options: { ...plain, timeZone: 'UTC' } };
  }

  const resolved = zoneOf(value, zone ?? 'local');
  const offset = fixedOffset(resolved);
  if (offset === undefined || offset === 0) return { epoch: epochOf(value), options: { ...intl, timeZone: resolved } };

  // A fixed offset: shift onto UTC's wall clock, since not every engine takes `+03:00` as a `timeZone`.
  const { timeZoneName: _name, ...plain } = intl;

  return { epoch: epochOf(value) + offset * MS_PER_MINUTE, options: { ...plain, timeZone: 'UTC' } };
}

/**
 * A value in the reader's words: `19 Oct 2026`, `14:30`, `Oct 19, 2026, 2:30 PM`. Pass `dateStyle`/`timeStyle`
 * or the component options (`month: 'long'`) for another shape; with none, the kind decides. Returns `''` for
 * an input that is not a date at all, so a missing value renders as nothing.
 */
export function format(input: DateInput, options: FormatOptions = {}): string {
  const value = read(input);
  if (!value) return '';

  const { epoch, options: intl } = prepare(value, options);

  return tidy(formatter(options.locale ?? defaultLocale(), intl).format(epoch));
}

/**
 * Node's ICU writes a narrow no-break space before AM/PM where Chrome's V8 writes a plain one, deliberately, for
 * compatibility — so a server and a browser disagree on the text and React calls it a hydration error (measured,
 * #418). Every engine writes what V8 does.
 */
/** U+202F, built from its code point so no source line carries one. */
const NARROW_NO_BREAK_SPACE = String.fromCharCode(0x202f);

export function tidy(text: string): string {
  return text.split(NARROW_NO_BREAK_SPACE).join(' ');
}

/** The same, as parts — what a field builds its segments from. */
export function formatToParts(input: DateInput, options: FormatOptions = {}): Intl.DateTimeFormatPart[] {
  const value = read(input);
  if (!value) return [];

  const { epoch, options: intl } = prepare(value, options);

  return formatter(options.locale ?? defaultLocale(), intl)
    .formatToParts(epoch)
    .map((part) => ({ ...part, value: tidy(part.value) }));
}

/** Two values as one range, `Oct 19 – 23, 2026`, with what they share written once. */
export function formatRange(start: DateInput, end: DateInput, options: FormatOptions = {}): string {
  const from = read(start);
  const to = read(end);
  if (!from || !to) return format(from ? start : end, options);

  const a = prepare(from, options);
  const b = prepare(to, options);
  const intl = formatter(options.locale ?? defaultLocale(), a.options) as Intl.DateTimeFormat & {
    formatRange?: (x: number, y: number) => string;
  };

  return tidy(
    intl.formatRange
      ? intl.formatRange(Math.min(a.epoch, b.epoch), Math.max(a.epoch, b.epoch))
      : `${intl.format(a.epoch)} – ${intl.format(b.epoch)}`,
  );
}

export interface RelativeOptions {
  locale?: string;
  /** What "now" is. Default the current moment; pass one a server rendered with, so the browser agrees with it. */
  now?: DateInput;
  zone?: ZoneInput;
  /** `'auto'` (default) says `yesterday` and `in 2 days`; `'always'` says `1 day ago`. */
  numeric?: 'auto' | 'always';
  style?: 'long' | 'short' | 'narrow';
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['second', 60],
  ['minute', 60],
  ['hour', 24],
  ['day', 7],
  ['week', 4.34524],
  ['month', 12],
  ['year', Infinity],
];

/** `3 minutes ago`, `tomorrow`, `in 2 weeks`. A date is counted in calendar days, so yesterday is yesterday at any hour. */
export function formatRelative(input: DateInput, options: RelativeOptions = {}): string {
  const value = read(input);
  if (!value || value.kind === 'time') return '';

  const now = read(options.now ?? Date.now());
  if (!now) return '';

  const rtf = new Intl.RelativeTimeFormat(options.locale ?? defaultLocale(), {
    numeric: options.numeric ?? 'auto',
    style: options.style ?? 'long',
  });
  const zone = zoneOf(now, options.zone ?? 'local');
  const nowWall: DateTimeFields = now.kind === 'instant' ? wallAt(zone, epochOf(now)) : now.fields;

  if (value.kind === 'date') {
    const days = epochDay(value.fields) - epochDay(nowWall);
    if (Math.abs(days) < 7) return rtf.format(days, 'day');
    if (Math.abs(days) < 30) return rtf.format(Math.trunc(days / 7), 'week');
    const months = (value.fields.year - nowWall.year) * 12 + value.fields.month - nowWall.month;

    return Math.abs(months) < 12 ? rtf.format(months, 'month') : rtf.format(Math.trunc(months / 12), 'year');
  }

  const epoch =
    value.kind === 'instant' ? epochOf(value) : fieldsToMs(value.fields) - offsetAt(zone, fieldsToMs(value.fields)) * MS_PER_MINUTE;
  let amount = (epoch - (now.kind === 'instant' ? epochOf(now) : fieldsToMs(now.fields))) / 1000;
  for (const [unit, size] of UNITS) {
    if (Math.abs(amount) < size) return rtf.format(Math.round(amount), unit);
    amount /= size;
  }

  return '';
}

/** What a zone is called at an instant: `Eastern European Summer Time`, `EEST`, `GMT+3`. */
export function zoneName(
  zone: ZoneInput = 'local',
  options: { locale?: string; style?: Intl.DateTimeFormatOptions['timeZoneName']; at?: DateInput } = {},
): string {
  const at = read(options.at ?? Date.now());
  const epoch = at ? epochOf(at.kind === 'instant' ? at : { ...at, offset: 0 }) : Date.now();
  const resolved = zoneOf({ kind: 'instant', fields: wallAt('UTC', epoch), offset: 0 }, zone);
  const style = options.style ?? 'long';
  const parts = formatter(options.locale ?? defaultLocale(), {
    timeZone: fixedOffset(resolved) !== undefined && resolved !== 'UTC' ? undefined : resolved,
    timeZoneName: style,
  }).formatToParts(epoch);

  return fixedOffset(resolved) !== undefined && resolved !== 'UTC'
    ? `GMT${resolved}`
    : tidy(parts.find((part) => part.type === 'timeZoneName')?.value ?? resolved);
}
