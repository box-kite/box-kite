import { FunctionComponent, useEffect, useMemo, useRef, useState } from 'react';
import Box, { BoxProps } from '../box';
import { useEventCallback } from '../react/a11y/callbacks';
import useControllableState, { ChangeHandler } from '../react/a11y/useControllableState';
import { DateChangeDetails, DateChangeReason } from '../react/date/dateChange';
import { useDateEnvironment } from '../react/date/dateEnvironment';
import useIdentifier from '../react/identity/useIdentifier';
import { useInteractionReporter, useReportedState } from '../react/interactions/interactions';
import { ComponentsAndVariants } from '../types';
import { addMonths, DateFields, epochDay } from '../utils/date/calendar';
import {
  CalendarDay,
  clampDay,
  dayOf,
  dayText,
  isOutOfBounds,
  monthGrid,
  moveFocus,
  orderedRange,
  rangeCrosses,
  rangePosition,
} from '../utils/date/calendarModel';
import { readingsOf, today } from '../utils/date/dateTime';
import { format } from '../utils/date/format';
import { monthNames, weekdayNames, weekInfo } from '../utils/date/locale';
import { ZoneInput } from '../utils/date/zones';
import { isRtl } from '../utils/dom/domUtils';
import { Path, Svg } from './svg';
import VisuallyHidden from './visuallyHidden';

/** A span of days, both ends included, `start` never after `end`. */
export interface DateRange {
  start: string;
  end: string;
}

/** Which grid is on show: days, the months of a year, or a run of years. */
export type CalendarView = 'day' | 'month' | 'year';
/** Why the focused day moved: an arrow key, a month or year step, or a day being chosen (by any device). */
export type CalendarFocusReason = 'keyboard' | 'navigate' | 'select';

const DATE = 'data-date';
const YEARS_PER_PAGE = 12;

type CalendarBoxProps<TKey extends keyof ComponentsAndVariants> = Omit<
  BoxProps<'div', TKey>,
  'onChange' | 'disabled' | 'defaultValue' | 'readOnly'
>;

interface BaseProps<TKey extends keyof ComponentsAndVariants> extends CalendarBoxProps<TKey> {
  /** The earliest day that can be chosen, `YYYY-MM-DD`. The arrows stop there too. */
  min?: string | null;
  /** The latest day that can be chosen. */
  max?: string | null;
  /** Days that can be reached but not chosen — a weekend, a holiday. A range is refused across one. */
  isDateUnavailable?: (date: string) => boolean;
  /** The language of the month and weekday names, and whose week it is. Default the reader's. */
  locale?: string;
  /** Whose "today" is marked. Default the reader's zone. */
  zone?: ZoneInput;
  /** The day the week starts on, 0 for Sunday. Default the locale's. */
  firstDayOfWeek?: number;
  /** How many months side by side. Default 1. */
  months?: 1 | 2 | 3;
  /** A leading column of ISO week numbers. */
  weekNumbers?: boolean;
  /** Whether the days that complete the first and last weeks are drawn. Default `true`. */
  showOutsideDays?: boolean;
  /** The day the keyboard is on, which decides the month on show. Controlled. */
  focusedDate?: string;
  /** Where the keyboard starts when the calendar owns it. Default the value, or today. */
  defaultFocusedDate?: string;
  /** Fires when the keyboard or the paging buttons move to another day. */
  onFocusedDateChange?: ChangeHandler<string, CalendarFocusReason>;
  /** Nothing can be chosen and nothing is focusable. */
  disabled?: boolean;
  /** Can be read and navigated, but not chosen in. */
  readOnly?: boolean;
  /** Focus the day the keyboard is on, on mount — what a picker's panel wants. */
  autoFocus?: boolean;
  /** The calendar's accessible name, which a screen reader hears before the month. */
  label?: string;
  /** What the paging buttons are called. Default `'Previous'` and `'Next'`. */
  /** The previous-page button's name. Default `'Previous'`. */
  previousLabel?: string;
  /** The next-page button's name. Default `'Next'`. */
  nextLabel?: string;
}

/** One day at a time, which is the default: the value is a `YYYY-MM-DD` string or `null`. */
interface SingleProps {
  /** One day (default), or `'range'` for a start and an end. */
  mode?: 'single';
  /** The chosen day, `YYYY-MM-DD`, or `null`. Controlled. */
  value?: string | null;
  /** The day it starts with when the calendar owns its value. */
  defaultValue?: string | null;
  /** Fires with the day and its readings. */
  onValueChange?: ChangeHandler<string | null, DateChangeReason, DateChangeDetails>;
}

/** A start and an end: the first press anchors the range and the second ends it, whichever way round. */
interface RangeProps {
  /** `'range'` is what turns the value into `{ start, end }`. */
  mode: 'range';
  /** The chosen span, or `null`. Controlled. */
  value?: DateRange | null;
  /** The span it starts with when the calendar owns its value. */
  defaultValue?: DateRange | null;
  /** Fires once both ends are chosen, start first whichever was picked first. */
  onValueChange?: ChangeHandler<DateRange | null, DateChangeReason>;
}

export type CalendarProps<TKey extends keyof ComponentsAndVariants = 'calendar'> = BaseProps<TKey> & (SingleProps | RangeProps);

/** Both halves flattened, for the body — `SingleProps & RangeProps` would be `never`. */
interface ResolvedProps extends BaseProps<'calendar'> {
  mode?: 'single' | 'range';
  value?: string | DateRange | null;
  defaultValue?: string | DateRange | null;
  onValueChange?: (value: never, details: never) => void;
}

function sameDay(a: DateFields | null, b: DateFields | null): boolean {
  return a !== null && b !== null && epochDay(a) === epochDay(b);
}

/**
 * A month of days to pick from, on APG's grid keys — one day or, with `mode="range"`, a start and an end.
 *
 * ```tsx
 * <Calendar label="Delivery" onValueChange={(day) => setDay(day)} />
 * <Calendar mode="range" months={2} min={today()} onValueChange={(range) => setStay(range)} />
 * ```
 *
 * **A day is a `YYYY-MM-DD` string**, never a `Date` at midnight somewhere: a day has no zone, so nothing about
 * where the page renders can move it. The week starts on the locale's first day and the names are the
 * locale's own, read from `Intl` — nothing ships per language.
 *
 * **Press the title to zoom out**: days, then the year's months, then a run of years — the fast way back to a
 * date of birth.
 *
 * @pattern https://www.w3.org/WAI/ARIA/apg/patterns/grid/
 * @a11y The month is a `role="grid"` named by its title, which is a polite live region, so paging says where
 * it landed. Each day is a `gridcell` named by its full date (`Monday, October 19, 2026`), with
 * `aria-selected` on the chosen day or span and `aria-current="date"` on today.
 * @a11y An out-of-bounds day is `aria-disabled` and not focusable; an unavailable one can be reached, so it can
 * be read, but not chosen.
 * @keyboard Tab — One tab stop for the grid, on the focused day; the paging buttons and the title are their own.
 * @keyboard Left / Right — The day before or after, in the reading order.
 * @keyboard Up / Down — The same day a week before or after.
 * @keyboard Home / End — The first or last day of the week.
 * @keyboard PageUp / PageDown — The same day a month before or after; with Shift, a year.
 * @keyboard Enter / Space — Chooses the focused day; in a range, the first press anchors and the second ends it.
 */
function CalendarImpl<TKey extends keyof ComponentsAndVariants = 'calendar'>(props: CalendarProps<TKey>) {
  const {
    mode = 'single',
    value,
    defaultValue = null,
    onValueChange,
    min,
    max,
    isDateUnavailable,
    locale: localeProp,
    zone,
    firstDayOfWeek,
    months = 1,
    weekNumbers = false,
    showOutsideDays = true,
    focusedDate: focusedProp,
    defaultFocusedDate,
    onFocusedDateChange,
    disabled = false,
    readOnly = false,
    autoFocus = false,
    label,
    previousLabel = 'Previous',
    nextLabel = 'Next',
    props: tagProps,
    ...restProps
  } = props as ResolvedProps;

  const environment = useDateEnvironment({ locale: localeProp, zone });
  const { locale } = environment;
  const todayText = today(environment.zone);
  const todayDay = dayOf(todayText)!;
  const firstDay = firstDayOfWeek ?? weekInfo(locale).firstDay;
  // Numbers in the locale's own digits, so a day reads the way the month name above it does.
  const digits = (value: number) => numberFormat(locale).format(value);
  const range = mode === 'range';
  const bounds = useMemo(() => ({ min: dayOf(min), max: dayOf(max) }), [min, max]);

  const [current, setCurrent] = useReportedState<string | DateRange | null, DateChangeReason>({
    value,
    defaultValue,
    onChange: (next, details) => {
      const handler = onValueChange as ((value: unknown, details: unknown) => void) | undefined;
      handler?.(next, range ? details : { ...details, ...readingsOf(next as string | null, environment.zone) });
    },
    interaction: { component: 'calendar', type: 'valueChange', content: ['value'] },
  });
  const selectedDay = range ? null : dayOf(current as string | null);
  const selectedRange = range && current ? (current as DateRange) : null;

  // The first end of a range being picked, and the day it would run to — neither is the value until both are chosen.
  const [anchor, setAnchor] = useState<DateFields | null>(null);
  const [hovered, setHovered] = useState<DateFields | null>(null);

  const initialFocus = dayText(clampDay(dayOf(defaultFocusedDate) ?? selectedDay ?? dayOf(selectedRange?.start) ?? todayDay, bounds));
  const [focusedText, setFocusedText] = useControllableState<string, CalendarFocusReason>({
    value: focusedProp,
    defaultValue: initialFocus,
    onChange: onFocusedDateChange,
  });
  const focused = dayOf(focusedText) ?? todayDay;
  const [view, setView] = useState<CalendarView>('day');
  // Paging and zooming have no callback of their own; inside a picker the picker reports for the calendar.
  const report = useInteractionReporter('calendar');

  // The first month on show. Several months side by side scroll only when the focus leaves them, so picking a day in
  // the second month does not slide the first one away mid-range.
  const [shown, setShown] = useState(() => monthIndex(focused));
  let first = shown;
  if (monthIndex(focused) < shown || monthIndex(focused) > shown + months - 1) {
    first = monthIndex(focused) < shown ? monthIndex(focused) : monthIndex(focused) - months + 1;
    setShown(first);
  }

  const rootRef = useRef<HTMLDivElement>(null);
  const moveFocusRef = useRef(autoFocus);
  const id = useIdentifier('calendar');

  // The day under the keyboard is the one the browser focuses, once the grid it is in has rendered.
  useEffect(() => {
    if (!moveFocusRef.current) return;
    moveFocusRef.current = false;
    rootRef.current?.querySelector<HTMLElement>(`[${DATE}="${focusedText}"]`)?.focus();
  });

  const isBlocked = (date: DateFields) => isOutOfBounds(date, bounds);
  const isUnavailable = (date: DateFields) => isDateUnavailable?.(dayText(date)) ?? false;

  const focusDay = (date: DateFields, reason: CalendarFocusReason, keyboard: boolean) => {
    moveFocusRef.current = keyboard;
    setFocusedText(dayText(clampDay(date, bounds)), { reason });
  };

  const choose = (date: DateFields, event: React.SyntheticEvent) => {
    if (disabled || readOnly || isBlocked(date) || isUnavailable(date)) return;
    focusDay(date, 'select', false);

    if (!range) {
      setCurrent(dayText(date), { reason: 'select', event });

      return;
    }
    if (!anchor) {
      setAnchor(date);
      setHovered(date);

      return;
    }

    const [start, end] = orderedRange(anchor, date);
    setAnchor(null);
    setHovered(null);
    if (isDateUnavailable && rangeCrosses(start, end, isDateUnavailable)) return;
    setCurrent({ start: dayText(start), end: dayText(end) }, { reason: 'select', event });
  };

  const handleGridKeyDown = useEventCallback((event: React.KeyboardEvent<HTMLElement>) => {
    if (disabled) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      choose(focused, event);

      return;
    }
    if (event.key === 'Escape' && anchor) {
      event.preventDefault();
      event.stopPropagation();
      setAnchor(null);
      setHovered(null);

      return;
    }

    const next = moveFocus(focused, event.key, event.shiftKey, { rtl: isRtl(event.currentTarget), firstDay });
    if (!next) return;

    event.preventDefault();
    focusDay(next, 'keyboard', true);
    if (anchor) setHovered(clampDay(next, bounds));
  });

  const page = (direction: 1 | -1) => {
    const to = addMonths(focused, direction * (view === 'day' ? months : view === 'month' ? 12 : 12 * YEARS_PER_PAGE));

    if (view === 'day') setShown(first + direction * months);
    focusDay(to, 'navigate', false);
    report('pageChange', dayText(to), { reason: direction === 1 ? 'next' : 'previous', content: ['value'] });
  };

  const monthsShown = Array.from({ length: months }, (_, index) => ({
    year: Math.floor((first + index) / 12),
    month: ((first + index) % 12) + 1,
    day: 1,
  }));
  const titleId = `${id}-title`;
  // Several months zoom no further than days, so each takes a caption of its own instead of one shared title.
  const captions = view === 'day' && months > 1;
  const title =
    view === 'day'
      ? monthsShown.map((month) => format(dayText(month), { locale, month: 'long', year: 'numeric' })).join(' – ')
      : view === 'month'
        ? digits(focused.year)
        : `${digits(yearPageStart(focused.year))} – ${digits(yearPageStart(focused.year) + YEARS_PER_PAGE - 1)}`;
  // A locale whose short names are words (Arabic's are) gets the narrow ones, or the columns overflow.
  const shortNames = weekdayNames(locale, 'short');
  const weekdays = shortNames.some((name) => name.length > 4) ? weekdayNames(locale, 'narrow') : shortNames;
  const weekdaysLong = weekdayNames(locale, 'long');
  const order = Array.from({ length: 7 }, (_, index) => (firstDay + index) % 7);

  const previewEnd = anchor ? (hovered ?? anchor) : null;
  const rangeStart = anchor ?? dayOf(selectedRange?.start);
  const rangeEnd = anchor ? previewEnd : dayOf(selectedRange?.end);

  const renderDay = (cell: CalendarDay) => {
    const date = dayOf(cell.date)!;
    const blocked = isBlocked(date);
    const unavailable = isUnavailable(date);
    const position = range ? rangePosition(date, rangeStart, rangeEnd) : null;
    const selected = range ? position !== null : sameDay(date, selectedDay);
    const isToday = sameDay(date, todayDay);
    const isFocused = sameDay(date, focused);
    // With several months side by side an outside day is the next grid's own day, and two cells must not share a date.
    const hidden = cell.outside && (!showOutsideDays || months > 1);

    if (hidden) return <Box key={cell.date} tag="td" component="calendar.cell" display="table-cell" props={{ role: 'gridcell' }} />;

    return (
      <Box
        key={cell.date}
        tag="td"
        component="calendar.cell"
        display="table-cell"
        p={0}
        py={0.5}
        variant={{
          rangeStart: position === 'start' && rangeEnd !== null && !sameDay(rangeStart, rangeEnd),
          rangeEnd: position === 'end',
          rangeMiddle: position === 'middle',
        }}
        props={{
          role: 'gridcell',
          'aria-selected': selected || undefined,
          'aria-disabled': blocked || disabled || undefined,
          'aria-current': isToday ? 'date' : undefined,
        }}
      >
        <Box
          component="calendar.day"
          display="flex"
          ai="center"
          jc="center"
          width={9}
          height={9}
          mx="auto"
          borderRadius={999}
          fontSize={14}
          css={{ fontVariantNumeric: 'tabular-nums' }}
          variant={{
            today: isToday,
            selected: selected && position !== 'middle',
            outside: cell.outside,
            blocked: blocked || disabled,
            unavailable,
          }}
          props={{
            [DATE]: cell.date,
            tabIndex: isFocused && !blocked && !disabled ? 0 : -1,
            'aria-label': format(cell.date, { locale, dateStyle: 'full' }),
            onClick: (event: React.MouseEvent) => choose(date, event),
            onPointerEnter: () => anchor && setHovered(date),
          }}
        >
          {digits(cell.day)}
        </Box>
      </Box>
    );
  };

  const handleCellKeyDown = (
    event: React.KeyboardEvent<HTMLElement>,
    count: number,
    columns: number,
    chooseAt: (index: number) => void,
    focusAt: (index: number, container: Element | null) => void,
    index: number,
  ) => {
    const rtl = isRtl(event.currentTarget);
    const moves: Record<string, number> = {
      ArrowUp: -columns,
      ArrowDown: columns,
      [rtl ? 'ArrowRight' : 'ArrowLeft']: -1,
      [rtl ? 'ArrowLeft' : 'ArrowRight']: 1,
    };
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      chooseAt(index);
    } else if (event.key in moves) {
      event.preventDefault();
      focusAt(Math.max(0, Math.min(count - 1, index + moves[event.key])), event.currentTarget.parentElement);
    }
  };

  const zoomGrid = () => {
    const names = monthNames(locale, 'short');
    const start = yearPageStart(focused.year);
    const items =
      view === 'month'
        ? names.map((name, index) => ({
            label: name,
            active: index + 1 === focused.month,
            current: todayDay.year === focused.year && todayDay.month === index + 1,
          }))
        : Array.from({ length: YEARS_PER_PAGE }, (_, index) => ({
            label: digits(start + index),
            active: start + index === focused.year,
            current: todayDay.year === start + index,
          }));
    const target = (index: number): DateFields =>
      view === 'month' ? { ...focused, month: index + 1, day: 1 } : { ...focused, year: start + index, day: 1 };
    const pick = (index: number) => {
      const date = target(index);
      moveFocusRef.current = true;
      setFocusedText(dayText(clampDay({ ...date, day: Math.min(focused.day, 28) }, bounds)), { reason: 'navigate' });
      setView(view === 'year' ? 'month' : 'day');
      report('viewChange', view === 'year' ? 'month' : 'day', { reason: 'zoom-in' });
    };
    const focusAt = (index: number, container: Element | null) => {
      const date = target(index);
      setFocusedText(dayText({ ...date, day: Math.min(focused.day, 28) }), { reason: 'keyboard' });
      container?.querySelector<HTMLElement>(`[data-zoom="${index}"]`)?.focus();
    };

    return (
      <Box display="grid" gridTemplateColumns={3} gap={1} props={{ role: 'group', 'aria-labelledby': titleId }}>
        {items.map((item, index) => (
          <Box
            key={item.label}
            tag="button"
            component="calendar.zoomItem"
            variant={{ selected: item.active, today: item.current }}
            py={2}
            borderRadius={2}
            disabled={disabled}
            props={{
              type: 'button',
              'data-zoom': index,
              tabIndex: item.active ? 0 : -1,
              'aria-pressed': item.active,
              onClick: () => pick(index),
              onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => handleCellKeyDown(event, items.length, 3, pick, focusAt, index),
            }}
          >
            {item.label}
          </Box>
        ))}
      </Box>
    );
  };

  const grid = (month: DateFields, index: number) => {
    const weeks = monthGrid(month.year, month.month, firstDay);
    const monthTitle = format(dayText(month), { locale, month: 'long', year: 'numeric' });

    return (
      <Box
        key={index}
        tag="table"
        css={{ borderCollapse: 'collapse', tableLayout: 'fixed' }}
        props={{
          role: 'grid',
          'aria-label': months > 1 ? monthTitle : undefined,
          'aria-labelledby': months > 1 ? undefined : titleId,
          'aria-readonly': readOnly || undefined,
          onKeyDown: handleGridKeyDown,
        }}
      >
        <Box tag="thead" display="table-header-group">
          <Box tag="tr" display="table-row">
            {weekNumbers && <Box tag="th" display="table-cell" component="calendar.weekday" props={{ 'aria-hidden': true }} />}
            {order.map((day) => (
              <Box
                key={day}
                tag="th"
                display="table-cell"
                component="calendar.weekday"
                pb={1}
                fontSize={12}
                props={{ scope: 'col', abbr: weekdaysLong[day] }}
              >
                {weekdays[day]}
              </Box>
            ))}
          </Box>
        </Box>
        <Box tag="tbody" display="table-row-group">
          {weeks.map((week) => (
            <Box key={week.days[0].date} tag="tr" display="table-row">
              {weekNumbers && (
                <Box
                  tag="td"
                  display="table-cell"
                  component="calendar.weekNumber"
                  fontSize={11}
                  textAlign="center"
                  props={{ role: 'rowheader' }}
                >
                  {digits(week.week)}
                </Box>
              )}
              {week.days.map(renderDay)}
            </Box>
          ))}
        </Box>
      </Box>
    );
  };

  return (
    <Box
      ref={rootRef}
      component={'calendar' as TKey}
      display="inline-block"
      {...(restProps as CalendarBoxProps<TKey>)}
      variant={[restProps.variant, { disabled }] as never}
      props={{ role: label ? 'group' : undefined, 'aria-label': label, ...tagProps, onPointerLeave: () => anchor && setHovered(anchor) }}
    >
      {/* The arrows sit on the edges, so several months each get a caption centred over their own grid. */}
      <Box position="relative" minHeight={8} mb={2}>
        {/* First in the DOM as it is first on screen, so Tab reaches it before the title. */}
        <Box
          tag="button"
          component="calendar.nav"
          position="absolute"
          top={0}
          insetStart={0}
          display="inline-flex"
          ai="center"
          jc="center"
          width={8}
          height={8}
          borderRadius={2}
          disabled={disabled}
          props={{ type: 'button', 'aria-label': previousLabel, onClick: () => page(-1) }}
        >
          <Chevron direction={-1} />
        </Box>
        {captions ? (
          <>
            <Box display="flex" gap={4}>
              {monthsShown.map((month) => (
                <Box key={dayText(month)} flex1 textAlign="center" py={1.5} fontSize={14} fontWeight={600} props={{ 'aria-hidden': true }}>
                  {format(dayText(month), { locale, month: 'long', year: 'numeric' })}
                </Box>
              ))}
            </Box>
            {/* What paging announces, since the captions are one per grid. */}
            <VisuallyHidden id={titleId} props={{ 'aria-live': 'polite' }}>
              {title}
            </VisuallyHidden>
          </>
        ) : (
          <Box display="flex" jc="center" px={9}>
            <Box
              tag="button"
              component="calendar.title"
              py={1.5}
              px={3}
              borderRadius={2}
              fontSize={14}
              id={titleId}
              disabled={disabled || view === 'year'}
              props={{
                type: 'button',
                'aria-live': 'polite',
                onClick: () => {
                  setView(view === 'day' ? 'month' : 'year');
                  report('viewChange', view === 'day' ? 'month' : 'year', { reason: 'zoom-out' });
                },
              }}
            >
              {title}
            </Box>
          </Box>
        )}
        <Box
          tag="button"
          component="calendar.nav"
          position="absolute"
          top={0}
          insetEnd={0}
          display="inline-flex"
          ai="center"
          jc="center"
          width={8}
          height={8}
          borderRadius={2}
          disabled={disabled}
          props={{ type: 'button', 'aria-label': nextLabel, onClick: () => page(1) }}
        >
          <Chevron direction={1} />
        </Box>
      </Box>
      {view === 'day' ? (
        <Box display="flex" gap={4} ai="start">
          {monthsShown.map(grid)}
        </Box>
      ) : (
        zoomGrid()
      )}
    </Box>
  );
}

/** A month as one number, so the months on show are a range of integers. */
function monthIndex(date: DateFields): number {
  return date.year * 12 + date.month - 1;
}

const numberFormats = new Map<string, Intl.NumberFormat>();

/** One plain integer format per locale: no grouping, so a year is `2026` rather than `2,026`. */
function numberFormat(locale: string): Intl.NumberFormat {
  let cached = numberFormats.get(locale);
  if (!cached) {
    cached = new Intl.NumberFormat(locale, { useGrouping: false });
    numberFormats.set(locale, cached);
  }

  return cached;
}

function yearPageStart(year: number): number {
  return year - (((year % YEARS_PER_PAGE) + YEARS_PER_PAGE) % YEARS_PER_PAGE);
}

/** The paging arrow: drawn, so it needs no icon set, and mirrored with the reading order. */
function Chevron({ direction }: { direction: 1 | -1 }) {
  return (
    <Svg viewBox="0 0 16 16" width="1rem" height="1rem" rtl={{ flip: 'xAxis' }} props={{ fill: 'none' }}>
      <Path
        d={direction === 1 ? 'M6 3l5 5-5 5' : 'M10 3L5 8l5 5'}
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

const Calendar = CalendarImpl;
(Calendar as FunctionComponent).displayName = 'Calendar';

export default Calendar as <TKey extends keyof ComponentsAndVariants = 'calendar'>(props: CalendarProps<TKey>) => React.ReactNode;
