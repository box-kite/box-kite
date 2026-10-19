import { addDays, addMonths, DateFields, dayOfWeek, epochDay, isoWeek, MIDNIGHT, mod } from './calendar';
import { dateText } from './iso';
import { read } from './value';

/** One day cell of a month grid. */
export interface CalendarDay {
  /** `2026-10-19`. */
  date: string;
  day: number;
  /** Whether it belongs to the month on show rather than the weeks either side of it. */
  outside: boolean;
}

export interface CalendarWeek {
  /** The ISO week number of the week's Thursday-anchored year. */
  week: number;
  days: CalendarDay[];
}

/** A day as fields, or `null` for anything that is not a date. */
export function dayOf(value: string | null | undefined): DateFields | null {
  const parsed = read(value);

  return parsed && parsed.kind === 'date' ? parsed.fields : null;
}

export function dayText(date: DateFields): string {
  return dateText({ ...date, ...MIDNIGHT });
}

/**
 * Six weeks starting on the locale's first day, always six so the grid does not change height from month to
 * month — the month on show plus the days around it that complete its weeks.
 */
export function monthGrid(year: number, month: number, firstDay: number): CalendarWeek[] {
  const first = { year, month, day: 1 };
  const start = addDays(first, -mod(dayOfWeek(first) - firstDay, 7));

  return Array.from({ length: 6 }, (_, row) => {
    const days = Array.from({ length: 7 }, (_, column) => {
      const date = addDays(start, row * 7 + column);

      return { date: dayText(date), day: date.day, outside: date.month !== month };
    });
    const thursday = addDays(start, row * 7 + mod(4 - firstDay, 7));

    return { week: isoWeek(thursday).week, days };
  });
}

export interface NavigationOptions {
  rtl: boolean;
  firstDay: number;
}

/**
 * Where a key moves the focused day, APG's map: the arrows a day or a week (the sideways pair following the
 * reading order), Home and End the week's ends, Page Up and Down a month, with Shift a year. `null` for any
 * other key.
 */
export function moveFocus(focused: DateFields, key: string, shift: boolean, options: NavigationOptions): DateFields | null {
  const forward = options.rtl ? 'ArrowLeft' : 'ArrowRight';
  const back = options.rtl ? 'ArrowRight' : 'ArrowLeft';
  switch (key) {
    case forward:
      return addDays(focused, 1);
    case back:
      return addDays(focused, -1);
    case 'ArrowDown':
      return addDays(focused, 7);
    case 'ArrowUp':
      return addDays(focused, -7);
    case 'Home':
      return addDays(focused, -mod(dayOfWeek(focused) - options.firstDay, 7));
    case 'End':
      return addDays(focused, 6 - mod(dayOfWeek(focused) - options.firstDay, 7));
    case 'PageUp':
      return addMonths(focused, shift ? -12 : -1);
    case 'PageDown':
      return addMonths(focused, shift ? 12 : 1);
    default:
      return null;
  }
}

export interface Bounds {
  min?: DateFields | null;
  max?: DateFields | null;
}

/** Whether a day is before `min` or after `max`. */
export function isOutOfBounds(date: DateFields, bounds: Bounds): boolean {
  return (bounds.min != null && epochDay(date) < epochDay(bounds.min)) || (bounds.max != null && epochDay(date) > epochDay(bounds.max));
}

/** A day pulled inside the bounds. */
export function clampDay(date: DateFields, bounds: Bounds): DateFields {
  if (bounds.min && epochDay(date) < epochDay(bounds.min)) return bounds.min;
  if (bounds.max && epochDay(date) > epochDay(bounds.max)) return bounds.max;

  return date;
}

/** A range in order, whichever end was picked first. */
export function orderedRange(a: DateFields, b: DateFields): [DateFields, DateFields] {
  return epochDay(a) <= epochDay(b) ? [a, b] : [b, a];
}

/** Where a day sits relative to a range: its first day, its last, strictly inside, or not in it. */
export function rangePosition(date: DateFields, start: DateFields | null, end: DateFields | null): 'start' | 'end' | 'middle' | null {
  if (!start || !end) return start && epochDay(date) === epochDay(start) ? 'start' : null;

  const [low, high] = orderedRange(start, end);
  const day = epochDay(date);
  if (day === epochDay(low)) return 'start';
  if (day === epochDay(high)) return 'end';

  return day > epochDay(low) && day < epochDay(high) ? 'middle' : null;
}

/** Whether any day of a range is one nobody can choose — a range is refused across a blocked day. */
export function rangeCrosses(start: DateFields, end: DateFields, isBlocked: (date: string) => boolean): boolean {
  const [low, high] = orderedRange(start, end);
  for (let day = epochDay(low); day <= epochDay(high); day++) {
    if (isBlocked(dayText(addDays({ year: 1970, month: 1, day: 1 }, day)))) return true;
  }

  return false;
}
