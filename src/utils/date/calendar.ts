/** A day on the proleptic Gregorian calendar, with no time and no zone. `month` is 1–12. */
export interface DateFields {
  year: number;
  month: number;
  day: number;
}

/** A wall-clock time, with no date and no zone. */
export interface TimeFields {
  hour: number;
  minute: number;
  second: number;
  millisecond: number;
}

export type DateTimeFields = DateFields & TimeFields;

export const MS_PER_MINUTE = 60_000;
export const MS_PER_HOUR = 3_600_000;
export const MS_PER_DAY = 86_400_000;

export const MIDNIGHT: TimeFields = { hour: 0, minute: 0, second: 0, millisecond: 0 };

/** Floor division, so a negative epoch lands on the day before rather than the day after. */
export function floorDiv(value: number, by: number): number {
  return Math.floor(value / by);
}

/** A remainder that is never negative. */
export function mod(value: number, by: number): number {
  return ((value % by) + by) % by;
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInMonth(year: number, month: number): number {
  return month === 2 ? (isLeapYear(year) ? 29 : 28) : [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
}

/** Days since 1970-01-01, for any year — Howard Hinnant's `days_from_civil`, pure integer arithmetic and no `Date`. */
export function epochDay({ year, month, day }: DateFields): number {
  const y = year - (month <= 2 ? 1 : 0);
  const era = floorDiv(y, 400);
  const yearOfEra = y - era * 400;
  const dayOfYear = floorDiv(153 * (month + (month > 2 ? -3 : 9)) + 2, 5) + day - 1;
  const dayOfEra = yearOfEra * 365 + floorDiv(yearOfEra, 4) - floorDiv(yearOfEra, 100) + dayOfYear;

  return era * 146097 + dayOfEra - 719468;
}

/** The inverse of `epochDay`. */
export function fromEpochDay(days: number): DateFields {
  const z = days + 719468;
  const era = floorDiv(z, 146097);
  const dayOfEra = z - era * 146097;
  const yearOfEra = floorDiv(dayOfEra - floorDiv(dayOfEra, 1460) + floorDiv(dayOfEra, 36524) - floorDiv(dayOfEra, 146096), 365);
  const dayOfYear = dayOfEra - (365 * yearOfEra + floorDiv(yearOfEra, 4) - floorDiv(yearOfEra, 100));
  const shifted = floorDiv(5 * dayOfYear + 2, 153);
  const month = shifted + (shifted < 10 ? 3 : -9);

  return { year: yearOfEra + era * 400 + (month <= 2 ? 1 : 0), month, day: dayOfYear - floorDiv(153 * shifted + 2, 5) + 1 };
}

/** 0 is Sunday, which is what `Intl.Locale#getWeekInfo` counts from too once its 7 is taken as 0. */
export function dayOfWeek(date: DateFields): number {
  return mod(epochDay(date) + 4, 7);
}

/** A wall clock read as though it were UTC — the number every zone conversion starts from. */
export function fieldsToMs(fields: DateTimeFields): number {
  return (
    epochDay(fields) * MS_PER_DAY + fields.hour * MS_PER_HOUR + fields.minute * MS_PER_MINUTE + fields.second * 1000 + fields.millisecond
  );
}

export function msToFields(ms: number): DateTimeFields {
  const days = floorDiv(ms, MS_PER_DAY);
  let rest = ms - days * MS_PER_DAY;
  const hour = floorDiv(rest, MS_PER_HOUR);
  rest -= hour * MS_PER_HOUR;
  const minute = floorDiv(rest, MS_PER_MINUTE);
  rest -= minute * MS_PER_MINUTE;
  const second = floorDiv(rest, 1000);

  return { ...fromEpochDay(days), hour, minute, second, millisecond: rest - second * 1000 };
}

export function addDays(date: DateFields, days: number): DateFields {
  return fromEpochDay(epochDay(date) + days);
}

/** Months forward or back, the day clamped to the month it lands in — 31 January plus a month is 28 or 29 February. */
export function addMonths(date: DateFields, months: number): DateFields {
  const index = date.year * 12 + (date.month - 1) + months;
  const year = floorDiv(index, 12);
  const month = mod(index, 12) + 1;

  return { year, month, day: Math.min(date.day, daysInMonth(year, month)) };
}

export function compareDates(a: DateFields, b: DateFields): number {
  return epochDay(a) - epochDay(b);
}

export function isValidDate({ year, month, day }: DateFields): boolean {
  return Number.isInteger(year) && month >= 1 && month <= 12 && Number.isInteger(month) && day >= 1 && day <= daysInMonth(year, month);
}

export function isValidTime({ hour, minute, second, millisecond }: TimeFields): boolean {
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59 && second >= 0 && second <= 59 && millisecond >= 0 && millisecond <= 999;
}

/** The ISO 8601 week: weeks start on Monday and week 1 holds the year's first Thursday. */
export function isoWeek(date: DateFields): { year: number; week: number } {
  const days = epochDay(date);
  const thursday = days - mod(dayOfWeek(date) + 6, 7) + 3;
  const year = fromEpochDay(thursday).year;

  return { year, week: floorDiv(thursday - epochDay({ year, month: 1, day: 1 }), 7) + 1 };
}
