import { addDays, DateTimeFields, isValidDate, isValidTime, MIDNIGHT } from './calendar';
import { formatter } from './format';
import { DateKind, ParsedValue, toIso } from './iso';
import { dayPeriodNames, monthNames } from './locale';
import { defaultLocale } from './settings';
import { convert, DateInput, read, wallOf, ZoneOptions } from './value';

export interface ParseOptions extends ZoneOptions {
  /** What to hand back. Default: whatever the input turned out to be — a date, a time, a date-time or an instant. */
  kind?: DateKind;
  /** Whose order `03/04/2026` is read in. Default the configured locale, or the runtime's. */
  locale?: string;
  /** What fills in a year the text leaves out, and the century of a two-digit one. Default today. */
  reference?: DateInput;
}

type Order = ('year' | 'month' | 'day')[];
const orders = new Map<string, Order>();

/** The order the locale writes a numeric date in: `day month year` in Moldova, `month day year` in the US. */
export function dateOrder(locale: string): Order {
  let order = orders.get(locale);
  if (!order) {
    order = formatter(locale, { year: 'numeric', month: 'numeric', day: 'numeric', timeZone: 'UTC' })
      .formatToParts(Date.UTC(2026, 10, 23))
      .map((part) => part.type)
      .filter((type): type is 'year' | 'month' | 'day' => type === 'year' || type === 'month' || type === 'day');
    orders.set(locale, order);
  }

  return order;
}

const TIME_IN_TEXT =
  /(\d{1,2})\s*[:h]\s*(\d{2})(?:\s*:\s*(\d{2})(?:[.,](\d{1,3}))?)?|(\d{1,2})(?=\s*(?:a\.?\s*m\.?|p\.?\s*m\.?)(?![\p{L}]))/iu;

function lower(text: string, locale: string): string {
  return text.toLocaleLowerCase(locale).normalize('NFC');
}

/** Words for today, tomorrow and yesterday in the locale and in English, as day offsets. */
function relativeWords(locale: string): Map<string, number> {
  const words = new Map<string, number>([
    ['today', 0],
    ['now', 0],
    ['tomorrow', 1],
    ['yesterday', -1],
  ]);
  try {
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    for (const offset of [-1, 0, 1]) words.set(lower(rtf.format(offset, 'day'), locale), offset);
  } catch {
    // English is enough.
  }

  return words;
}

/** A two-digit year in the century that puts it nearest the reference. */
function fullYear(digits: string, reference: number): number {
  const year = Number(digits);
  if (digits.length > 2) return year;
  const century = Math.floor(reference / 100) * 100;
  const candidate = century + year;

  return candidate > reference + 50 ? candidate - 100 : candidate < reference - 50 ? candidate + 100 : candidate;
}

/** The time a text names, and the text with it taken out. */
function takeTime(text: string, locale: string): { time?: DateTimeFields; rest: string } {
  const match = TIME_IN_TEXT.exec(text);
  if (!match) return { rest: text };

  const after = text.slice(match.index + match[0].length);
  const [am, pm] = dayPeriodNames(locale).map((name) => lower(name, locale).replace(/\./g, ''));
  const period = /^\s*([\p{L}.]+)/u.exec(after)?.[1].replace(/\./g, '') ?? '';
  const isPm = period !== '' && (period === pm || /^pm?$/.test(period));
  const isAm = period !== '' && (period === am || /^am?$/.test(period));
  let hour = Number(match[1] ?? match[5]);
  if (isPm && hour < 12) hour += 12;
  if (isAm && hour === 12) hour = 0;

  const time = {
    ...MIDNIGHT,
    year: 1970,
    month: 1,
    day: 1,
    hour,
    minute: Number(match[2] ?? 0),
    second: Number(match[3] ?? 0),
    millisecond: Number((match[4] ?? '').padEnd(3, '0')) || 0,
  };
  const consumed = match[0].length + (isPm || isAm ? (/^\s*[\p{L}.]+/u.exec(after)?.[0].length ?? 0) : 0);

  return { time: isValidTime(time) ? time : undefined, rest: text.slice(0, match.index) + ' ' + text.slice(match.index + consumed) };
}

/** A date written the way people write one: numbers in the locale's order, a month by name, or a relative word. */
function takeDate(text: string, locale: string, reference: DateTimeFields): DateTimeFields | null | undefined {
  const tokens = text.match(/\d+|[\p{L}]+/gu) ?? [];
  if (tokens.length === 0) return undefined;

  const words = relativeWords(locale);
  for (const token of tokens) {
    const offset = words.get(token);
    if (offset !== undefined) return { ...addDays(reference, offset), ...MIDNIGHT };
  }

  const names = [...monthNames(locale, 'long'), ...monthNames(locale, 'short'), ...monthNames('en', 'long')].map((name) =>
    lower(name, locale).replace(/\.$/, ''),
  );
  let month: number | undefined;
  const numbers: string[] = [];
  for (const token of tokens) {
    if (/^\d+$/.test(token)) numbers.push(token);
    else if (month === undefined && token.length >= 3) {
      const index = names.findIndex((name) => name.startsWith(token) || token.startsWith(name));
      if (index >= 0) month = (index % 12) + 1;
    }
  }
  if (numbers.length === 0 && month === undefined) return undefined;

  let order = dateOrder(locale);
  if (numbers[0]?.length >= 3) order = ['year', 'month', 'day'];
  if (month !== undefined) order = order.filter((part) => part !== 'month');
  else if (numbers.length === 2) order = order.filter((part) => part !== 'year');

  const found: Partial<Record<'year' | 'month' | 'day', number>> = { month };
  order.forEach((part, index) => {
    const digits = numbers[index];
    if (digits !== undefined) found[part] = part === 'year' ? fullYear(digits, reference.year) : Number(digits);
  });

  const date = {
    ...MIDNIGHT,
    year: found.year ?? reference.year,
    month: found.month ?? NaN,
    day: found.day ?? (month !== undefined ? 1 : NaN),
  };

  return isValidDate(date) ? date : null;
}

/**
 * Reads whatever a person or a system wrote down: ISO 8601 in any of its spellings, a `Date`, epoch
 * milliseconds, an HTTP date, or text in the locale's own order (`19.10.2026 14:30`, `10/19/2026 2:30 PM`,
 * `19 oct 2026`, `tomorrow`). Hands back the canonical string for `kind`, or `null`.
 */
export function parse(input: DateInput, options: ParseOptions = {}): string | null {
  const known = read(input, options.disambiguation);
  const done = (value: ParsedValue | null) => {
    const converted = value && options.kind ? convert(value, options.kind, options) : value;

    return converted ? toIso(converted) : null;
  };
  if (known) return done(known);
  if (typeof input !== 'string') return null;

  const locale = options.locale ?? defaultLocale();
  const referenceValue = read(options.reference ?? Date.now());
  const reference = referenceValue ? wallOf(referenceValue, options.zone ?? 'local') : { year: 1970, month: 1, day: 1, ...MIDNIGHT };
  const { time, rest } = options.kind === 'date' ? { time: undefined, rest: input } : takeTime(lower(input, locale), locale);
  const date = options.kind === 'time' ? undefined : takeDate(options.kind === 'date' ? lower(rest, locale) : rest, locale, reference);
  if (date === null || (!date && !time)) return null;

  const dateFields = date ?? undefined;

  if (dateFields && time)
    return done({
      kind: 'datetime',
      fields: { ...dateFields, hour: time.hour, minute: time.minute, second: time.second, millisecond: time.millisecond },
      offset: 0,
    });
  if (dateFields) return done({ kind: 'date', fields: dateFields, offset: 0 });

  return time ? done({ kind: 'time', fields: time, offset: 0 }) : null;
}
