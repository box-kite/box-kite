import { defaultLocale } from './settings';

/** Which day a week starts on and which days are the weekend. Days count from 0, Sunday, the way `Date#getDay` does. */
export interface WeekInfo {
  firstDay: number;
  weekend: readonly number[];
}

type LocaleWithWeek = Intl.Locale & {
  getWeekInfo?: () => { firstDay: number; weekend: number[] };
  weekInfo?: { firstDay: number; weekend: number[] };
};

// CLDR's regions that do not start on Monday, for the engines without `getWeekInfo` (Firefox before 153).
const SUNDAY_FIRST = new Set(
  'AG AS BD BR BS BT BW BZ CA CN CO DM DO ET GT GU HK HN ID IL IN JM JP KE KH KR LA MH MM MO MT MX MZ NI NP PA PE PH PK PR PT PY SA SG SV TH TT TW UM US VE VI WS YE ZA ZW'.split(
    ' ',
  ),
);
const SATURDAY_FIRST = new Set('AE AF BH DJ DZ EG IQ IR JO KW LY OM QA SD SY'.split(' '));
const FRI_SAT_WEEKEND = new Set('AE BH DZ EG IQ JO KW LY OM QA SA SD SY YE'.split(' '));

const weekCache = new Map<string, WeekInfo>();

function region(locale: string): string | undefined {
  try {
    const parsed = new Intl.Locale(locale);

    return parsed.region ?? parsed.maximize().region;
  } catch {
    return undefined;
  }
}

/** The locale's week, from `Intl.Locale#getWeekInfo` where the engine has it and from CLDR's table where it does not. */
export function weekInfo(locale: string = defaultLocale()): WeekInfo {
  let info = weekCache.get(locale);
  if (info) return info;

  try {
    const parsed = new Intl.Locale(locale) as LocaleWithWeek;
    const native = parsed.getWeekInfo?.() ?? parsed.weekInfo;
    if (native) info = { firstDay: native.firstDay % 7, weekend: native.weekend.map((day) => day % 7) };
  } catch {
    // An unknown tag falls through to the table.
  }

  if (!info) {
    const code = region(locale) ?? '';
    const firstDay = SATURDAY_FIRST.has(code) ? 6 : SUNDAY_FIRST.has(code) ? 0 : 1;
    info = { firstDay, weekend: FRI_SAT_WEEKEND.has(code) ? [5, 6] : [6, 0] };
  }
  weekCache.set(locale, info);

  return info;
}

const cycleCache = new Map<string, 12 | 24>();

/** Whether the locale reads the clock in 12 hours or 24. */
export function hourCycleOf(locale: string = defaultLocale()): 12 | 24 {
  let cycle = cycleCache.get(locale);
  if (!cycle) {
    const resolved = new Intl.DateTimeFormat(locale, { hour: 'numeric' }).resolvedOptions().hourCycle;
    cycle = resolved === 'h11' || resolved === 'h12' ? 12 : 24;
    cycleCache.set(locale, cycle);
  }

  return cycle;
}

/** January first, in the locale's words. */
export function monthNames(locale: string = defaultLocale(), style: 'long' | 'short' | 'narrow' = 'long'): string[] {
  const formatter = new Intl.DateTimeFormat(locale, { month: style, timeZone: 'UTC' });

  return Array.from({ length: 12 }, (_, index) => formatter.format(Date.UTC(2021, index, 15)));
}

/** Sunday first — rotate by `weekInfo().firstDay` for the order the locale reads a week in. */
export function weekdayNames(locale: string = defaultLocale(), style: 'long' | 'short' | 'narrow' = 'short'): string[] {
  const formatter = new Intl.DateTimeFormat(locale, { weekday: style, timeZone: 'UTC' });

  // 2021-01-03 was a Sunday.
  return Array.from({ length: 7 }, (_, index) => formatter.format(Date.UTC(2021, 0, 3 + index)));
}

/** The locale's words for AM and PM. */
export function dayPeriodNames(locale: string = defaultLocale()): [string, string] {
  const formatter = new Intl.DateTimeFormat(locale, { hour: 'numeric', hourCycle: 'h12', timeZone: 'UTC' });
  const period = (hour: number) => formatter.formatToParts(Date.UTC(2021, 0, 1, hour)).find((part) => part.type === 'dayPeriod')?.value;

  // A period can hold a space (`a. m.`), which Node's ICU and Chrome's V8 write differently, as they do around it.
  const tidy = (text: string) => text.split(String.fromCharCode(0x202f)).join(' ');

  return [tidy(period(9) ?? 'AM'), tidy(period(21) ?? 'PM')];
}

const fieldNames = new Map<string, string>();

/** What the locale calls a date field — `Jahr`, `месяц`, `hour` — for naming a segment to a screen reader. */
export function fieldName(
  field: 'year' | 'month' | 'day' | 'hour' | 'minute' | 'second' | 'dayPeriod' | 'timeZoneName',
  locale: string = defaultLocale(),
): string {
  const key = `${locale}|${field}`;
  let name = fieldNames.get(key);
  if (name === undefined) {
    try {
      const Names = (
        Intl as { DisplayNames?: new (locales: string, options: { type: string }) => { of(code: string): string | undefined } }
      ).DisplayNames;
      name = (Names && new Names(locale, { type: 'dateTimeField' }).of(field)) || field;
    } catch {
      name = field;
    }
    fieldNames.set(key, name);
  }

  return name;
}
