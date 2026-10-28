import { Fragment, Ref, RefAttributes, useEffect, useMemo, useRef, useState } from 'react';
import Box, { BoxProps } from '../box';
import { useEventCallback, useLatest } from '../react/a11y/callbacks';
import { ChangeHandler } from '../react/a11y/useControllableState';
import boxComponent from '../react/boxComponent';
import { DateChangeDetails, DateChangeReason } from '../react/date/dateChange';
import { useDateEnvironment } from '../react/date/dateEnvironment';
import useIdentifier from '../react/identity/useIdentifier';
import { useReportedState } from '../react/interactions/interactions';
import { ComponentsAndVariants } from '../types';
import { compare, readingsOf, toPlainDate, today } from '../utils/date/dateTime';
import {
  Draft,
  draftOf,
  editable,
  FieldConfig,
  FieldGranularity,
  FieldType,
  PAGE_STEP,
  rangeOf,
  SegmentType,
  segmentsFor,
  segmentText,
  step,
  typeDigit,
  typePeriod,
  valueOf,
} from '../utils/date/fieldModel';
import { zoneName } from '../utils/date/format';
import { fieldName, hourCycleOf, monthNames } from '../utils/date/locale';
import { parse } from '../utils/date/parse';
import { Disambiguation, ZoneInput } from '../utils/date/zones';
import { isRtl } from '../utils/dom/domUtils';

export type { DateChangeDetails, DateChangeHandler, DateChangeReason } from '../react/date/dateChange';
export type DateFieldType = FieldType;
export type DateFieldGranularity = FieldGranularity;

/** Which segment an event belongs to, read off the element so one handler serves them all. */
const SEGMENT = 'data-segment';

type DateFieldBoxProps<TKey extends keyof ComponentsAndVariants> = Omit<
  BoxProps<'div', TKey>,
  'onChange' | 'disabled' | 'required' | 'invalid' | 'placeholder' | 'defaultValue' | 'readOnly'
>;

export interface DateFieldProps<TKey extends keyof ComponentsAndVariants = 'dateField'> extends DateFieldBoxProps<TKey> {
  /** What it edits: a day (`'date'`, default), a time of day (`'time'`), or both (`'datetime'`). */
  type?: DateFieldType;
  /**
   * Controlled value, an ISO string of the field's kind: `2026-10-19`, `14:30:00`, or for a date-time an
   * instant with its offset (`2026-10-19T14:30:00+03:00`), `…Z` in UTC, or a wall clock with `zone="none"`.
   * `null` is empty. Any spelling `parse` reads is accepted; what comes back is canonical.
   */
  value?: string | null;
  /** The value it starts with when the field owns its state. */
  defaultValue?: string | null;
  /**
   * Fires with the new value — `null` while a segment is empty — and its readings: `utc`, the reader's
   * `local` wall clock, a `Date`, the epoch, and why it changed.
   */
  onValueChange?: ChangeHandler<string | null, DateChangeReason, DateChangeDetails>;
  /**
   * Whose wall clock a date-time is typed on. Default `'local'`, the reader's; `'utc'`, any IANA zone or
   * `+03:00` for another; `'none'` for a wall clock with no zone at all (an alarm, a timetable). A date and a
   * time have no zone, so this only says what "today" is for them.
   */
  zone?: ZoneInput | 'none';
  /** The language the segments are ordered and named in. Default the reader's. */
  locale?: string;
  /** A 12- or 24-hour clock. Default the locale's. */
  hourCycle?: 12 | 24;
  /** Whether a time is edited to the minute (default) or the second. */
  granularity?: DateFieldGranularity;
  /** The earliest value that is valid. A value before it is kept and marked `aria-invalid`. */
  min?: string | null;
  /** The latest value that is valid. */
  max?: string | null;
  /** Days nobody can choose — a weekend, a holiday. Handed the `YYYY-MM-DD` day. */
  isDateUnavailable?: (date: string) => boolean;
  /** Not editable and not focusable, and read out as such. */
  disabled?: boolean;
  /** Focusable and read out, but not editable. */
  readOnly?: boolean;
  /** The form is not valid until it is filled in — the browser's own check, announced and translated for free. */
  required?: boolean;
  /** Marks the value invalid whatever the bounds say. Default: invalid when out of bounds or unavailable. */
  invalid?: boolean;
  /** What the value posts under in a form: the canonical string, or nothing while empty. */
  name?: string;
  /** The field's visible name, rendered above it. A group of segments is not named by its contents. */
  label?: React.ReactNode;
  /** Names the field after an element already on the page, instead of `label`. */
  labelledBy?: string;
  /** An element that describes the field — a hint, an error. */
  describedBy?: string;
  /** What an empty segment starts from on an arrow key. Default today, at midnight. */
  placeholderValue?: string;
  /** What a wall-clock time a zone skips or repeats means. Default `'compatible'`. */
  disambiguation?: Disambiguation;
  /** Whether a date-time names its zone after the time. Default: when the zone is not the reader's own. */
  showZone?: boolean;
  /** Something inside the field, after the segments — a picker's button. */
  end?: React.ReactNode;
  /** Focus the first segment on mount. */
  autoFocus?: boolean;
  /** What an empty segment is read out as. Default `'Empty'`. */
  emptyText?: string;
  /** Every segment's tab index. Default `0`; `-1` keeps the field out of the page's tab order, which a grid cell wants. */
  tabIndex?: number;
}

interface Editing {
  type: SegmentType;
  buffer: string;
}

/**
 * A date, a time or both, typed one segment at a time — in the order and with the separators the reader's
 * locale writes them, so `19.10.2026` in Moldova and `10/19/2026` in the US with nothing to configure and
 * nothing to parse.
 *
 * ```tsx
 * <DateField label="Date of birth" name="dob" />
 * <DateField type="time" label="Opens at" />
 * <DateField type="datetime" zone="utc" label="Runs at" onValueChange={(value, { local }) => preview(local)} />
 * ```
 *
 * **The value is an ISO string, and the field never makes you parse it.** A date is `2026-10-19`, a time
 * `14:30:00`, a date-time the instant it names on the field's zone (`2026-10-19T14:30:00+03:00`, or `…Z` with
 * `zone="utc"`), and `onValueChange` hands over its UTC reading, the reader's wall clock and a `Date` beside it.
 *
 * **Segments, not a text box.** Free text is ambiguous — `03/04/2026` is two different days depending on who
 * typed it — so each part is its own spin button: digits move on by themselves once another could not fit
 * (`4` in a month is April), the arrows step and wrap like a clock, and a paste of any date the reader would
 * write is read in their order.
 *
 * @pattern https://www.w3.org/WAI/ARIA/apg/patterns/spinbutton/
 * @a11y The field is a `role="group"` named by `label`; each segment is a `role="spinbutton"` named by its unit
 * in the reader's language (`Monat`, `месяц`), with `aria-valuetext` saying the month by name.
 * @a11y An empty segment still carries `aria-valuenow` (its placeholder, which is what an arrow starts from)
 * and reads as `emptyText`.
 * @a11y `required` and `name` are a real input the browser validates, so an empty required field stops the
 * form and the message is the browser's own.
 * @keyboard Tab — Every segment is its own tab stop.
 * @keyboard Left / Right — The previous or next segment, in the reading order.
 * @keyboard Up / Down — One more or one less, wrapping round the segment's range.
 * @keyboard PageUp / PageDown — A bigger step: five years, two months, a week, two hours, fifteen minutes.
 * @keyboard Home / End — The segment's lowest and highest value.
 * @keyboard 0-9 — Types into the segment, and moves on once no further digit could fit.
 * @keyboard A / P — AM or PM, in the AM/PM segment.
 * @keyboard Backspace — Takes back the last digit, then empties the segment, then moves to the one before.
 */
function DateFieldImpl<TKey extends keyof ComponentsAndVariants = 'dateField'>(props: DateFieldProps<TKey>, ref: Ref<HTMLDivElement>) {
  const {
    type = 'date',
    value,
    defaultValue = null,
    onValueChange,
    zone: zoneProp,
    locale: localeProp,
    hourCycle: hourCycleProp,
    granularity = 'minute',
    min,
    max,
    isDateUnavailable,
    disabled = false,
    readOnly = false,
    required = false,
    invalid: invalidProp,
    name,
    label,
    labelledBy,
    describedBy,
    placeholderValue,
    disambiguation,
    showZone,
    end,
    autoFocus,
    emptyText = 'Empty',
    tabIndex = 0,
    props: tagProps,
    ...restProps
  } = props;

  const environment = useDateEnvironment({ locale: localeProp, zone: zoneProp === 'none' ? undefined : zoneProp });
  const { locale } = environment;
  // The zone a date-time is an instant in; `null` is a wall clock with none. A date and a time have none.
  const zone = type === 'datetime' && zoneProp !== 'none' ? environment.zone : null;
  const hourCycle = hourCycleProp ?? hourCycleOf(locale);
  const config = useMemo<FieldConfig>(() => ({ type, locale, hourCycle, granularity }), [type, locale, hourCycle, granularity]);
  const segments = useMemo(() => segmentsFor(config), [config]);
  const configKey = `${type}|${locale}|${hourCycle}|${granularity}|${zone}`;

  const [current, setCurrent] = useReportedState<string | null, DateChangeReason>({
    value,
    defaultValue,
    onChange: (next, details) => onValueChange?.(next, { ...details, ...readingsOf(next, zone ?? environment.zone) }),
    interaction: { component: 'dateField', type: 'valueChange', content: ['value'] },
  });

  // The draft is what the segments show, which can be more than the value: a half-typed date has no value.
  const [state, setState] = useState(() => ({ draft: draftOf(current, config, zone), source: current, key: configKey }));
  let draft = state.draft;
  if (state.source !== current || state.key !== configKey) {
    const composed = valueOf(state.draft, segments, config, { zone, disambiguation });
    const next = {
      draft: state.key === configKey && composed === current ? state.draft : draftOf(current, config, zone),
      source: current,
      key: configKey,
    };
    setState(next);
    draft = next.draft;
  }

  const [editing, setEditing] = useState<Editing | null>(null);
  const groupRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useIdentifier('date-field');
  const labelId = label === undefined ? undefined : `${id}-label`;
  const placeholder = useMemo(
    () =>
      draftOf(
        placeholderValue ?? `${today(environment.zone)}T00:00:00`,
        { ...config, type: config.type === 'date' ? 'date' : 'datetime' },
        null,
      ),
    [placeholderValue, environment.zone, config],
  );

  const commit = (next: Draft, reason: DateChangeReason, event?: Event | React.SyntheticEvent) => {
    const composed = valueOf(next, segments, config, { zone, disambiguation });
    setState({ draft: next, source: composed, key: configKey });
    setCurrent(composed, { reason, event });
  };

  const latest = useLatest({ draft, editing, commit });

  const segmentElements = (): HTMLElement[] => Array.from(groupRef.current?.querySelectorAll<HTMLElement>(`[${SEGMENT}]`) ?? []);
  const focusSegment = (index: number) => {
    const elements = segmentElements();
    elements[Math.max(0, Math.min(index, elements.length - 1))]?.focus();
  };
  const indexOf = (element: Element | null) => segmentElements().indexOf(element as HTMLElement);

  const typeInto = (target: HTMLElement, type: SegmentType, character: string, event: Event | React.SyntheticEvent) => {
    const { draft: held, editing: was } = latest.current;
    const buffer = was?.type === type ? was.buffer : '';
    if (type === 'dayPeriod') {
      const next = typePeriod(held, character, locale);
      if (next) {
        latest.current.commit(next, 'keyboard', event);
        focusSegment(indexOf(target) + 1);
      }

      return;
    }
    if (!/^\d$/.test(character)) {
      // A separator moves on, the way it would in a text box.
      if (/^[^\p{L}\p{N}]$/u.test(character) && held[type] !== undefined) focusSegment(indexOf(target) + 1);

      return;
    }

    const typed = typeDigit(held, type, buffer, character, config);
    setEditing({ type, buffer: typed.advance ? '' : typed.buffer });
    latest.current.commit(typed.draft, 'keyboard', event);
    if (typed.advance) focusSegment(indexOf(target) + 1);
  };

  const handleKeyDown = useEventCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    const target = (event.target as HTMLElement).closest<HTMLElement>(`[${SEGMENT}]`);
    if (!target || disabled || event.defaultPrevented) return;

    const type = target.getAttribute(SEGMENT) as SegmentType;
    const index = indexOf(target);
    const rtl = isRtl(target);
    const { key } = event;
    const held = latest.current.draft;

    const move = (next: Draft) => {
      event.preventDefault();
      if (readOnly) return;
      setEditing({ type, buffer: '' });
      commit(next, 'keyboard', event);
    };

    if (key === 'ArrowUp' || key === 'ArrowDown') return move(step(held, type, key === 'ArrowUp' ? 1 : -1, config, placeholder));
    if (key === 'PageUp' || key === 'PageDown')
      return move(step(held, type, (key === 'PageUp' ? 1 : -1) * PAGE_STEP[type], config, placeholder));
    if (key === 'Home' || key === 'End') {
      const range = rangeOf(type, held, config);

      return move({ ...held, [type]: key === 'Home' ? range.min : range.max });
    }
    if (key === 'ArrowLeft' || key === 'ArrowRight') {
      event.preventDefault();
      focusSegment(index + ((key === 'ArrowRight') !== rtl ? 1 : -1));

      return;
    }
    if (key === 'Backspace' || key === 'Delete') {
      event.preventDefault();
      if (readOnly) return;
      const buffer = latest.current.editing?.type === type ? latest.current.editing.buffer : '';
      if (buffer.length > 1) {
        const shorter = buffer.slice(0, -1);
        setEditing({ type, buffer: shorter });
        commit({ ...held, [type]: Number(shorter) }, 'keyboard', event);
      } else if (held[type] !== undefined) {
        setEditing({ type, buffer: '' });
        commit({ ...held, [type]: undefined }, 'keyboard', event);
      } else if (key === 'Backspace') focusSegment(index - 1);

      return;
    }
    if (key === 'Enter') {
      event.preventDefault();
      inputRef.current?.form?.requestSubmit();

      return;
    }
    // A key a phone keyboard has not named yet is left to `beforeinput`, which carries what was typed.
    if (key === 'Unidentified' || key === 'Process' || event.ctrlKey || event.metaKey || event.altKey || key.length !== 1) return;

    event.preventDefault();
    if (!readOnly) typeInto(target, type, key, event);
  });

  // Typing on a phone arrives as `beforeinput` with no usable `keydown` — and a segment is `contenteditable`,
  // so anything not cancelled here would be written into the DOM behind React's back.
  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    const handleBeforeInput = (event: InputEvent) => {
      const target = (event.target as HTMLElement | null)?.closest<HTMLElement>(`[${SEGMENT}]`);
      if (!target) return;
      event.preventDefault();
      if (disabled || readOnly) return;

      const type = target.getAttribute(SEGMENT) as SegmentType;
      if (event.inputType.startsWith('delete')) {
        target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true, cancelable: true }));

        return;
      }
      for (const character of event.data ?? '') typeInto(target, type, character, event);
    };
    group.addEventListener('beforeinput', handleBeforeInput);

    return () => group.removeEventListener('beforeinput', handleBeforeInput);
  });

  const handlePaste = useEventCallback((event: React.ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (disabled || readOnly) return;

    const kind = type === 'datetime' ? (zone ? 'instant' : 'datetime') : type;
    const parsed = parse(event.clipboardData.getData('text'), { locale, kind, zone: zone ?? environment.zone });
    if (parsed) commit(draftOf(parsed, config, zone), 'paste', event);
  });

  // A form reset puts the default back, which the browser cannot do to segments it does not know are a field.
  useEffect(() => {
    const form = inputRef.current?.form;
    if (!form) return;

    const handleReset = (event: Event) => latest.current.commit(draftOf(defaultValue, config, zone), 'reset', event);
    form.addEventListener('reset', handleReset);

    return () => form.removeEventListener('reset', handleReset);
  });

  useEffect(() => {
    if (autoFocus) focusSegment(0);
    // Mount only, the way the attribute behaves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const outOfBounds = current !== null && ((min != null && compare(current, min) < 0) || (max != null && compare(current, max) > 0));
  const day = current !== null && type !== 'time' && isDateUnavailable ? toPlainDate(current, { zone: zone ?? environment.zone }) : null;
  const invalid = invalidProp ?? (outOfBounds || (day !== null && isDateUnavailable!(day)));
  const months = type === 'time' ? [] : monthNames(locale);
  const labelText = typeof label === 'string' ? label : undefined;
  const firstSegment = editable(segments)[0];
  const zoneLabel =
    type === 'datetime' && zone && (showZone ?? zone !== environment.readerZone)
      ? zoneName(zone, { locale, style: 'short', at: current ?? undefined })
      : null;

  const setRefs = (element: HTMLDivElement | null) => {
    groupRef.current = element;
    if (typeof ref === 'function') ref(element);
    else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = element;
  };

  return (
    <>
      {label !== undefined && (
        <Box component="dateField.label" display="block" mb={1.5} fontSize={14} id={labelId} props={{ onClick: () => focusSegment(0) }}>
          {label}
        </Box>
      )}
      <Box
        ref={setRefs}
        component={'dateField' as TKey}
        display="inline-flex"
        ai="center"
        position="relative"
        cursor="text"
        css={{ fontVariantNumeric: 'tabular-nums', unicodeBidi: 'isolate' }}
        {...(restProps as DateFieldBoxProps<TKey>)}
        variant={[restProps.variant, { disabled, invalid }] as never}
        id={id}
        props={{
          role: 'group',
          'aria-labelledby': [labelId, labelledBy].filter(Boolean).join(' ') || undefined,
          'aria-describedby': describedBy,
          'aria-disabled': disabled || undefined,
          'aria-invalid': invalid || undefined,
          ...tagProps,
          onKeyDown: handleKeyDown,
          onPaste: handlePaste,
          onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => {
            // A press on the field's own padding goes to the first empty segment, as a text box puts the caret.
            if (event.target !== event.currentTarget || disabled) return;
            event.preventDefault();
            const empty = editable(segments).findIndex((segmentType) => latest.current.draft[segmentType] === undefined);
            focusSegment(empty === -1 ? 0 : empty);
          },
        }}
      >
        {segments.map((segment, index) => {
          if (segment.type === 'literal') {
            return (
              <Box key={index} component="dateField.literal" whiteSpace="pre" props={{ 'aria-hidden': true }}>
                {segment.text}
              </Box>
            );
          }

          const type = segment.type;
          const range = rangeOf(type, draft, config);
          const segmentValue = draft[type];
          const empty = segmentValue === undefined;
          const buffer = editing?.type === type ? editing.buffer : '';
          const text = segmentText(type, draft, buffer, locale);
          const valueText = empty
            ? emptyText
            : type === 'month'
              ? `${segmentValue} – ${months[segmentValue - 1]}`
              : type === 'dayPeriod'
                ? text
                : String(segmentValue);

          return (
            <Box
              key={index}
              component="dateField.segment"
              display="inline-block"
              px={0.5}
              borderRadius={1}
              textAlign="end"
              whiteSpace="nowrap"
              variant={{ placeholder: empty, disabled }}
              id={`${id}-${type}`}
              props={{
                [SEGMENT]: type,
                role: 'spinbutton',
                tabIndex: disabled ? -1 : tabIndex,
                contentEditable: !disabled && !readOnly,
                suppressContentEditableWarning: true,
                spellCheck: false,
                autoCorrect: 'off',
                autoCapitalize: 'off',
                inputMode: type === 'dayPeriod' ? 'text' : 'numeric',
                enterKeyHint: 'next',
                'aria-label': labelText ? `${fieldName(type, locale)}, ${labelText}` : fieldName(type, locale),
                'aria-valuemin': range.min,
                'aria-valuemax': range.max,
                'aria-valuenow': segmentValue ?? placeholder[type] ?? range.min,
                'aria-valuetext': valueText,
                'aria-readonly': readOnly || undefined,
                'aria-disabled': disabled || undefined,
                'aria-invalid': invalid || undefined,
                'aria-describedby': type === firstSegment ? describedBy : undefined,
                onFocus: () => setEditing({ type, buffer: '' }),
                onBlur: () => setEditing(null),
              }}
            >
              {text}
            </Box>
          );
        })}
        {zoneLabel && (
          <Box component="dateField.zone" ms={2} fontSize={13} whiteSpace="nowrap">
            {zoneLabel}
          </Box>
        )}
        {end !== undefined && (
          // Pushed to the far edge, so a field stretched wider than its segments keeps its button at the end.
          <Box display="inline-flex" ai="center" ms="auto">
            {end}
          </Box>
        )}
        {name !== undefined || required ? (
          <Fragment>
            {required ? (
              // A real input the browser validates: an empty required field stops the form, and its focus is passed on.
              <Box
                tag="input"
                ref={inputRef}
                component="dateField.validation"
                required
                disabled={disabled}
                props={{
                  type: 'text',
                  name,
                  value: current ?? '',
                  tabIndex: -1,
                  'aria-hidden': true,
                  onChange: () => {},
                  onFocus: () => focusSegment(0),
                }}
              />
            ) : (
              <input ref={inputRef} type="hidden" name={name} value={current ?? ''} disabled={disabled} />
            )}
          </Fragment>
        ) : null}
      </Box>
    </>
  );
}

const DateField = boxComponent(DateFieldImpl, 'DateField');

export default DateField as <TKey extends keyof ComponentsAndVariants = 'dateField'>(
  props: DateFieldProps<TKey> & RefAttributes<HTMLDivElement>,
) => React.ReactNode;
