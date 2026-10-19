/**
 * `@box-kite/react/date` — dates, times and time zones, with no dependency and no React.
 *
 * ```ts
 * import { format, toUtc, toLocal, today, parse } from '@box-kite/react/date';
 *
 * toUtc('2026-10-19T14:30:00', { from: 'Europe/Chisinau' }); // '2026-10-19T11:30:00Z'
 * toLocal('2026-10-19T11:30:00Z');                          // the reader's wall clock, with its offset
 * format('2026-10-19', { locale: 'ro-MD' });                // '19 oct. 2026'
 * parse('19.10.2026 14:30', { locale: 'ro-MD' });           // '2026-10-19T14:30:00'
 * ```
 *
 * **Every value is an ISO string, and its shape is its kind.** `2026-10-19` is a date — no time, no zone, the
 * same day everywhere. `14:30:00` is a time. `2026-10-19T14:30:00` is a wall clock with no zone. Anything with
 * an offset (`…+03:00`, `…Z`) is an instant: one moment, the same everywhere, written as one zone sees it. A
 * string is what a form posts, what JSON carries and what a Server Component can hand a client one, so the
 * value never needs converting at a boundary — only when the app asks a question of it.
 *
 * **`'local'` is the reader.** In a browser it is the browser's zone; on a server it is
 * `configureDates({ timeZone })` — the reader's, read off the cookie `zoneCookie()` writes — or the server's
 * own when nothing set it, which `systemZone()` always answers. `'utc'` is UTC, and any IANA name or `+03:00`
 * is that zone.
 *
 * Zones are read through `Intl`, so there is no zone database to ship, and so is every locale: names, orders,
 * weeks and the 12- or 24-hour clock all come from the runtime.
 */
export type { DateKind } from './utils/date/iso';
export type { Disambiguation, ZoneInput } from './utils/date/zones';
export type { DateInput, ZoneOptions } from './utils/date/value';
export type { DateReadings, DateTimeDetails, DateUnit, Duration, UnitOptions } from './utils/date/dateTime';
export type { FormatOptions, RelativeOptions } from './utils/date/format';
export type { ParseOptions } from './utils/date/parse';
export type { DateSettings } from './utils/date/settings';
export type { WeekInfo } from './utils/date/locale';

export {
  add,
  clamp,
  combine,
  compare,
  currentTime,
  daysInMonthOf,
  details,
  difference,
  endOf,
  fromDate,
  isAfter,
  isBefore,
  isBetween,
  isEqual,
  isSame,
  isValid,
  kindOf,
  normalize,
  offsetOf,
  readingsOf,
  now,
  startOf,
  subtract,
  toDate,
  toEpoch,
  toInstant,
  toLocal,
  toPlainDate,
  toPlainDateTime,
  toPlainTime,
  today,
  toUtc,
  toZone,
} from './utils/date/dateTime';
export { format, formatRange, formatRelative, formatToParts, zoneName } from './utils/date/format';
export { dateOrder, parse } from './utils/date/parse';
export { dayPeriodNames, fieldName, hourCycleOf, monthNames, weekdayNames, weekInfo } from './utils/date/locale';
export { formatOffset, isValidZone, normalizeZone, timeZones } from './utils/date/zones';
export { configureDates, dateSettings, localZone, readZoneCookie, systemZone, zoneCookie } from './utils/date/settings';
