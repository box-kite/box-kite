import { Ref, RefAttributes, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Box, { BoxProps } from '../box';
import { useEventCallback } from '../react/a11y/callbacks';
import { ChangeHandler } from '../react/a11y/useControllableState';
import useRovingFocus from '../react/a11y/useRovingFocus';
import useAnchorPosition from '../react/anchor/useAnchorPosition';
import boxComponent from '../react/boxComponent';
import { DateChangeDetails, DateChangeReason } from '../react/date/dateChange';
import { useDateEnvironment } from '../react/date/dateEnvironment';
import { QuietInteractions, useReportedState } from '../react/interactions/interactions';
import usePopoverLayer, { PopoverReason } from '../react/popover/usePopoverLayer';
import { ComponentsAndVariants } from '../types';
import { AnchorAlign, AnchorSide } from '../utils/anchor/anchorUtils';
import { combine, compare, readingsOf, toPlainDate, toPlainTime, today } from '../utils/date/dateTime';
import { FieldGranularity, slotOf, timeSlots } from '../utils/date/fieldModel';
import { format, formatRange, zoneName } from '../utils/date/format';
import { Disambiguation, ZoneInput } from '../utils/date/zones';
import Calendar, { DateRange } from './calendar';
import DateField from './dateField';
import Overlay from './overlay';
import { Path, Svg } from './svg';

export type { DateRange } from './calendar';
export type { DateChangeDetails, DateChangeHandler, DateChangeReason } from '../react/date/dateChange';

/** Why the panel opened or closed: the layer's four, and `select` — a value was chosen and closed it. */
export type DatePickerOpenReason = PopoverReason | 'select';

/** A shortcut beside the calendar: a label and the value it sets. */
export interface DatePreset<TValue = string> {
  label: string;
  value: TValue;
}

type PickerBoxProps<TKey extends keyof ComponentsAndVariants> = Omit<
  BoxProps<'div', TKey>,
  'onChange' | 'disabled' | 'required' | 'invalid' | 'placeholder' | 'defaultValue' | 'readOnly' | 'open' | 'flip'
>;

interface SharedProps<TKey extends keyof ComponentsAndVariants> extends PickerBoxProps<TKey> {
  /** The language of the field, the calendar and the times. Default the reader's. */
  locale?: string;
  /** The earliest value that is valid, and the first day the calendar offers. */
  min?: string | null;
  /** The latest. */
  max?: string | null;
  /** Days nobody can choose. */
  isDateUnavailable?: (date: string) => boolean;
  /** Not editable, not focusable and not openable. */
  disabled?: boolean;
  /** Focusable and read out, but not editable, and the button does not open. */
  readOnly?: boolean;
  /** The form is not valid until it is filled in — the browser's own check. */
  required?: boolean;
  /** Marks the value invalid whatever the bounds say. Default: invalid when out of bounds or unavailable. */
  invalid?: boolean;
  /** The picker's visible name, above the field. */
  label?: React.ReactNode;
  /** Names the field after an element already on the page, instead of `label`. */
  labelledBy?: string;
  /** An element that describes the field — a hint, an error. */
  describedBy?: string;
  /** Whether the panel is open. Controlled. */
  open?: boolean;
  /** Whether it starts open, when the picker owns that itself. */
  defaultOpen?: boolean;
  /** Fires with the new state and why — the layer's four reasons, and `'select'` when choosing closed it. */
  onOpenChange?: ChangeHandler<boolean, DatePickerOpenReason>;
  /** Whether choosing closes the panel. Default `true`; a date-time closes once its time is chosen. */
  closeOnSelect?: boolean;
  /** The day the week starts on, 0 for Sunday. Default the locale's. */
  firstDayOfWeek?: number;
  /** ISO week numbers down the calendar's side. */
  weekNumbers?: boolean;
  /** Which side of the field the panel opens on. Default `'bottom'`. */
  side?: AnchorSide;
  /** Which of the field's edges it lines up with. Default `'start'`. */
  align?: AnchorAlign;
  /** Whether the panel is at least as wide as the field. Default `true` for a time, `false` otherwise. */
  matchWidth?: boolean;
  /** What the time list says when no time is within `min`/`max`. Default `'No times available'`. */
  emptyTimesLabel?: string;
  /** A button inside the field that empties it. */
  clearable?: boolean;
  /** The field is one button that shows the value and opens the panel, with nothing to type. Default `false`. */
  pickOnly?: boolean;
  /** The calendar button's name. Default `'Choose date'`, or `'Choose time'`. */
  triggerLabel?: string;
  /** The clear button's name. Default `'Clear'`. */
  clearLabel?: string;
  /** Every segment's and button's tab index. Default `0`; `-1` keeps the picker out of the page's tab order, which a grid cell wants. */
  tabIndex?: number;
}

export interface DatePickerProps<TKey extends keyof ComponentsAndVariants = 'dateField'> extends SharedProps<TKey> {
  /** A day (`'date'`, default), a time of day (`'time'`), or both (`'datetime'`). */
  type?: 'date' | 'time' | 'datetime';
  /** Controlled value, an ISO string of the picker's kind — see `DateField`. */
  value?: string | null;
  /** The value it starts with when the picker owns its state. */
  defaultValue?: string | null;
  /** Fires with the value and its readings — `utc`, the reader's `local` wall clock, a `Date`. */
  onValueChange?: ChangeHandler<string | null, DateChangeReason, DateChangeDetails>;
  /** Whose wall clock a date-time is on. Default `'local'`; `'none'` for no zone at all. */
  zone?: ZoneInput | 'none';
  /** A 12- or 24-hour clock, in the field and the list of times. Default the locale's. */
  hourCycle?: 12 | 24;
  /** Whether a time is edited to the minute (default) or the second. */
  granularity?: FieldGranularity;
  /** What a wall-clock time a zone skips or repeats means. Default `'compatible'`. */
  disambiguation?: Disambiguation;
  /** What the value posts under in a form. */
  name?: string;
  /** Minutes between the times the list offers. Default 30. */
  step?: number;
  /** The time a day picked before any time takes. Default `'00:00'`. */
  defaultTime?: string;
  /** Shortcuts beside the calendar — `{ label: 'Today', value: today() }`. */
  presets?: readonly DatePreset[];
  /** Whether a date-time names its zone after the time. Default: when the zone is not the reader's own. */
  showZone?: boolean;
}

export interface DateRangePickerProps<TKey extends keyof ComponentsAndVariants = 'dateField'> extends SharedProps<TKey> {
  /** Controlled value: both ends, `YYYY-MM-DD`, or `null`. */
  value?: DateRange | null;
  /** The span it starts with when the picker owns its value. */
  defaultValue?: DateRange | null;
  /** Fires once both ends are filled in and in order, and with `null` when either is emptied. */
  onValueChange?: ChangeHandler<DateRange | null, DateChangeReason>;
  /** What the start posts under in a form. */
  startName?: string;
  /** What the end posts under. */
  endName?: string;
  /** The names a screen reader gives the two fields. Default `'Start date'` and `'End date'`. */
  startLabel?: string;
  /** The end field's name. Default `'End date'`. */
  endLabel?: string;
  /** Months side by side in the panel. Default 2. */
  months?: 1 | 2 | 3;
  /** Shortcuts beside the calendar — `{ label: 'This week', value: { start, end } }`. */
  presets?: readonly DatePreset<DateRange>[];
}

function CalendarIcon() {
  return (
    <Svg viewBox="0 0 16 16" width="1rem" height="1rem" props={{ fill: 'none' }}>
      <Path
        d="M3 3.5h10a1 1 0 0 1 1 1V13a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1ZM2 7h12M5.5 2v3M10.5 2v3"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function ClockIcon() {
  return (
    <Svg viewBox="0 0 16 16" width="1rem" height="1rem" props={{ fill: 'none' }}>
      <Path
        d="M8 14A6 6 0 1 0 8 2a6 6 0 0 0 0 12ZM8 5v3l2 1.5"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ClearIcon() {
  return (
    <Svg viewBox="0 0 16 16" width="0.875rem" height="0.875rem" props={{ fill: 'none' }}>
      <Path d="m4.5 4.5 7 7m0-7-7 7" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

/** A ref of any kind, given its element. */
function assignRef<T>(ref: Ref<T> | undefined, element: T | null) {
  if (typeof ref === 'function') ref(element);
  else if (ref) (ref as React.RefObject<T | null>).current = element;
}

interface LayerOptions {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: ChangeHandler<boolean, DatePickerOpenReason>;
  side: AnchorSide;
  align: AnchorAlign;
  matchWidth: boolean;
  label: string;
  /** The caller's ref, on the same element the panel hangs off. */
  ref?: Ref<HTMLDivElement>;
}

/** The panel's layer: the platform's popover where there is one, an `Overlay` where there is not, anchored to the field. */
function usePickerLayer(options: LayerOptions) {
  const [field, setField] = useState<HTMLElement | null>(null);
  const callerRef = options.ref;
  const attachField = useCallback(
    (element: HTMLDivElement | null) => {
      setField(element);
      assignRef(callerRef, element);
    },
    [callerRef],
  );
  // The chosen day, or the chosen time — whichever the panel's keyboard starts on. Tried when the layer opens and
  // again once its contents have rendered, since either can come first and focus only lands once both have.
  const focusInto = (panel: HTMLElement | null) => {
    // Focus on the panel itself is the first try having found nothing yet, so it does not count as placed.
    if (!panel || (panel.contains(document.activeElement) && document.activeElement !== panel)) return;
    const target = ['[data-date][tabindex="0"]', '[role="option"][tabindex="0"]', 'button:not([disabled])']
      .map((selector) => panel.querySelector<HTMLElement>(selector))
      .find(Boolean);
    // A list of times opens on the chosen one (or nine), scrolled inside the list alone: `scrollIntoView` would move
    // the page too. Here rather than at mount, where the panel was still `display: none` and had no height.
    const list = panel.querySelector<HTMLElement>('[role="listbox"]');
    const active = list?.querySelector<HTMLElement>('[role="option"][tabindex="0"]');
    if (list && active) list.scrollTop = active.offsetTop - list.clientHeight / 2 + active.offsetHeight / 2;
    (target ?? panel).focus({ preventScroll: true });
  };
  const handleOpened = useEventCallback((panel: HTMLElement) => focusInto(panel));
  const { platform, isOpen, id, setPanel, setOpen, trigger, triggerElement, panelElement } = usePopoverLayer<'dialog', 'select'>({
    haspopup: 'dialog',
    idPrefix: 'date-picker',
    open: options.open,
    defaultOpen: options.defaultOpen,
    onOpenChange: options.onOpenChange,
    interaction: { component: 'datePicker', type: 'openChange' },
    onOpened: handleOpened,
    // Escape and a press outside close it while a day inside has focus, which unmounts as it closes — so the
    // browser, returning focus only from inside the layer, would leave it on the page. Put it on the button now.
    onClosing: (heldFocus, button) => {
      if (heldFocus) button?.focus();
    },
  });
  const position = useAnchorPosition({
    side: options.side,
    align: options.align,
    offset: 1,
    flip: true,
    matchWidth: options.matchWidth,
    anchor: field,
  });

  useEffect(() => {
    if (isOpen) focusInto(panelElement);
  }, [isOpen, panelElement]);

  const panel = (children: React.ReactNode) => {
    const naming = { role: 'dialog', 'aria-label': options.label, tabIndex: -1 };
    if (!platform) {
      return (
        isOpen && (
          <Overlay
            contentRef={setPanel}
            anchor={field}
            side={options.side}
            align={options.align}
            offset={1}
            matchWidth={options.matchWidth}
            component="popover"
            p={3}
            id={id}
            props={naming}
          >
            {children}
          </Overlay>
        )
      );
    }

    return (
      <Box
        ref={setPanel}
        component="popover"
        variant={{ topLayer: true }}
        p={3}
        {...position.layerProps}
        id={id}
        props={{ popover: 'auto', ...naming }}
      >
        {/* Mounted while open only: a closed panel would keep a calendar and a day of times in the DOM for nothing. */}
        {isOpen ? children : null}
      </Box>
    );
  };

  // The trigger's ref callback under a name of its own, the way `setPanel` is one: read off `trigger` in render it
  // reads to the React compiler as a ref being accessed.
  // A choice closes the panel and unmounts what had focus in it, so focus would drop to the page before the browser
  // could hand it back: it goes to the button first, which is where APG returns it.
  const closeOnChoice = (event: React.SyntheticEvent) => {
    triggerElement?.focus();
    setOpen(false, { reason: 'select', event });
  };

  return { attachTrigger: trigger.ref, triggerAttributes: trigger.props, triggerElement, closeOnChoice, id, attachField, panel };
}

/** The list of times: a listbox, one option per step, the chosen one marked and the keyboard roving through them. */
function TimeList(props: {
  value: string | null;
  step: number;
  locale: string;
  hourCycle?: 12 | 24;
  onSelect: (time: string, event: React.SyntheticEvent) => void;
  label: string;
  /** The first and last times offered, `HH:mm:ss`. */
  min: string | null;
  max: string | null;
  emptyLabel: string;
  /** Ruled off from a calendar beside it. */
  separated: boolean;
}) {
  const { value, step, locale, hourCycle, onSelect, label, min, max, emptyLabel, separated } = props;
  const slots = useMemo(() => timeSlots(step, { min, max }), [step, min, max]);
  const selected = slotOf(value, step);
  const selectedIndex = Math.max(0, selected ? slots.indexOf(selected) : slots.indexOf('09:00:00'));
  const roving = useRovingFocus({
    count: slots.length,
    defaultActiveIndex: selectedIndex,
    loop: false,
    onSelect: (index, event) => onSelect(slots[index], event),
  });
  const rule = separated ? { ps: 2, bs: 1 } : {};

  // An empty listbox is an error to a screen reader, so a range with no time in it says so instead.
  if (slots.length === 0) {
    return (
      <Box component="datePicker.empty" flexGrow={1} px={3} py={1.5} fontSize={14} {...rule} props={{ role: 'status' }}>
        {emptyLabel}
      </Box>
    );
  }

  return (
    <Box
      component="datePicker.times"
      position="relative"
      display="flex"
      d="column"
      flexGrow={1}
      gap={0.5}
      maxHeight={72}
      overflowY="auto"
      // The list scrolls, so it clips: room for an option's focus ring, which sits 4px outside it.
      p={1}
      {...rule}
      props={{ role: 'listbox', 'aria-label': label, onKeyDown: roving.onKeyDown }}
    >
      {slots.map((slot, index) => (
        <Box
          key={slot}
          component="datePicker.time"
          variant={{ selected: slot === selected }}
          px={3}
          py={1.5}
          borderRadius={2}
          fontSize={14}
          textAlign="start"
          whiteSpace="nowrap"
          css={{ fontVariantNumeric: 'tabular-nums' }}
          props={{
            role: 'option',
            'aria-selected': slot === selected,
            ...roving.itemProps(index),
            onClick: (event: React.MouseEvent) => onSelect(slot, event),
          }}
        >
          {format(slot, {
            locale,
            hour: 'numeric',
            minute: '2-digit',
            hourCycle: hourCycle === undefined ? undefined : hourCycle === 12 ? 'h12' : 'h23',
          })}
        </Box>
      ))}
    </Box>
  );
}

function Presets<TValue>(props: {
  presets: readonly DatePreset<TValue>[];
  isSelected: (value: TValue) => boolean;
  onSelect: (value: TValue, event: React.SyntheticEvent) => void;
}) {
  return (
    <Box component="datePicker.presets" display="flex" d="column" gap={0.5} pe={2} be={1} props={{ role: 'group' }}>
      {props.presets.map((preset) => (
        <Box
          key={preset.label}
          tag="button"
          component="datePicker.preset"
          variant={{ selected: props.isSelected(preset.value) }}
          px={3}
          py={1.5}
          borderRadius={2}
          fontSize={14}
          textAlign="start"
          whiteSpace="nowrap"
          props={{ type: 'button', onClick: (event: React.MouseEvent) => props.onSelect(preset.value, event) }}
        >
          {preset.label}
        </Box>
      ))}
    </Box>
  );
}

interface PickFieldProps {
  /** The picker's own Box props, `props` included, so `width` and `variant` reach the frame. */
  frame: object;
  attachField: (element: HTMLDivElement | null) => void;
  /** Absent on a read-only field, so a press opens nothing. */
  attachTrigger?: (element: HTMLElement | null) => void;
  triggerAttributes?: object;
  triggerElement: HTMLElement | null;
  id: string;
  label?: React.ReactNode;
  labelledBy?: string;
  describedBy?: string;
  /** The value as the reader reads it, or `''`. */
  text: string;
  placeholder: string;
  icon: React.ReactNode;
  clear: React.ReactNode;
  disabled: boolean;
  invalid: boolean;
  required?: boolean;
  tabIndex?: number;
  /** One per value the form posts. */
  inputs: { name?: string; value: string }[];
  onReset: (event: Event) => void;
}

/** The field as one button: it shows the value, and its `::after` covers the frame, so a press anywhere opens the panel. */
function PickField(props: PickFieldProps) {
  // Destructured whole: a ref callback read off `props` makes every read of `props` a ref read to the React compiler.
  const { frame, attachField, attachTrigger, triggerAttributes, triggerElement, id, label, labelledBy, describedBy } = props;
  const { text, placeholder, icon, clear, disabled, invalid, required = false, tabIndex, inputs, onReset: handleReset } = props;
  const inputRef = useRef<HTMLInputElement>(null);
  const labelId = label !== undefined ? `${id}-label` : undefined;
  const valueId = `${id}-value`;
  const onReset = useEventCallback(handleReset);

  // A form reset puts the default back, as `DateField` does: the hidden inputs alone would keep the old value on screen.
  useEffect(() => {
    const form = inputRef.current?.form;
    if (!form) return;

    form.addEventListener('reset', onReset);

    return () => form.removeEventListener('reset', onReset);
  }, [onReset]);

  return (
    <>
      {label !== undefined && (
        <Box
          component="dateField.label"
          display="block"
          mb={1.5}
          fontSize={14}
          id={labelId}
          props={{ onClick: () => triggerElement?.focus() }}
        >
          {label}
        </Box>
      )}
      <Box
        ref={attachField}
        component="dateField"
        display="inline-flex"
        ai="center"
        position="relative"
        cursor="pointer"
        css={{ fontVariantNumeric: 'tabular-nums' }}
        {...(frame as BoxProps<'div', 'dateField'>)}
        variant={[(frame as { variant?: unknown }).variant, { disabled, invalid }] as never}
      >
        <Box
          tag="button"
          ref={attachTrigger}
          component="datePicker.value"
          variant={{ placeholder: !text }}
          flexGrow={1}
          textAlign="start"
          whiteSpace="nowrap"
          css={{ font: 'inherit' }}
          after={{ position: 'absolute', inset: 0 }}
          disabled={disabled}
          props={{
            type: 'button',
            tabIndex,
            'aria-labelledby': [labelId, labelledBy, valueId].filter(Boolean).join(' '),
            'aria-describedby': describedBy,
            'aria-invalid': invalid || undefined,
            ...triggerAttributes,
          }}
        >
          <span id={valueId}>{text || placeholder}</span>
        </Box>
        <Box display="inline-flex" ai="center" gap={1} ms={2}>
          {clear}
          {/* The typed field's button box, so the two modes are the same height and line up in a form. */}
          <Box
            component="datePicker.icon"
            display="inline-flex"
            ai="center"
            jc="center"
            width={7}
            height={7}
            me={-1.5}
            props={{ 'aria-hidden': true }}
          >
            {icon}
          </Box>
        </Box>
        {inputs.map((input, index) =>
          required ? (
            // The browser validates this one: an empty required field stops the form, and its focus is passed on.
            <Box
              key={index}
              tag="input"
              ref={index === 0 ? inputRef : undefined}
              component="dateField.validation"
              required
              disabled={disabled}
              props={{
                type: 'text',
                name: input.name,
                value: input.value,
                tabIndex: -1,
                'aria-hidden': true,
                onChange: () => {},
                onFocus: () => triggerElement?.focus(),
              }}
            />
          ) : input.name === undefined ? null : (
            <input
              key={index}
              ref={index === 0 ? inputRef : undefined}
              type="hidden"
              name={input.name}
              value={input.value}
              disabled={disabled}
            />
          ),
        )}
      </Box>
    </>
  );
}

/**
 * A field with a calendar, a list of times, or both, behind a button inside it — type the value or pick it.
 *
 * ```tsx
 * <DatePicker label="Check-in" name="checkIn" min={today()} />
 * <DatePicker type="time" label="Pickup" step={15} />
 * <DatePicker type="time" label="Delivery" pickOnly min="18:30" max="19:30" step={15} />
 * <DatePicker type="datetime" zone="utc" label="Publish at" onValueChange={(value, { utc, local }) => schedule(utc)} />
 * ```
 *
 * **The field is a `DateField`**, so everything typed is in the reader's own order and the value is the same ISO
 * string, with the same readings beside it. The panel is the platform's popover: the top layer, light dismiss
 * and focus return are the browser's, and it hangs off the whole field rather than the button. **`pickOnly`**
 * swaps the segments for one button showing the value, for a short list where typing adds nothing.
 *
 * @pattern https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
 * @a11y With `pickOnly` the field is that one button, named by the label and the value: `Delivery 6:30 PM`.
 * @a11y The button says what it does and what is chosen — `Choose date, Oct 19, 2026` — and carries
 * `aria-expanded` and `aria-haspopup="dialog"`; the panel is a `role="dialog"` named by the picker's label.
 * @a11y Opening puts focus on the chosen day (or today) in the calendar, or on the chosen time in the list.
 * @keyboard Enter / Space — On the button, opens the panel.
 * @keyboard Escape — Closes it and returns focus to the button.
 * @keyboard Up / Down — In the list of times, the time before or after.
 */
function DatePickerImpl<TKey extends keyof ComponentsAndVariants = 'dateField'>(props: DatePickerProps<TKey>, ref: Ref<HTMLDivElement>) {
  const {
    type = 'date',
    value,
    defaultValue = null,
    onValueChange,
    zone: zoneProp,
    locale: localeProp,
    hourCycle,
    granularity,
    disambiguation,
    min,
    max,
    isDateUnavailable,
    disabled = false,
    readOnly = false,
    required,
    invalid,
    name,
    label,
    labelledBy,
    describedBy,
    open,
    defaultOpen,
    onOpenChange,
    closeOnSelect = true,
    firstDayOfWeek,
    weekNumbers,
    side = 'bottom',
    align = 'start',
    matchWidth = type === 'time',
    emptyTimesLabel = 'No times available',
    clearable = false,
    pickOnly = false,
    triggerLabel,
    clearLabel = 'Clear',
    tabIndex,
    step = 30,
    defaultTime = '00:00',
    presets,
    showZone,
    ...restProps
  } = props;

  const environment = useDateEnvironment({ locale: localeProp, zone: zoneProp === 'none' ? undefined : zoneProp });
  const { locale } = environment;
  const zone = type === 'datetime' && zoneProp !== 'none' ? environment.zone : null;
  const readZone = zone ?? environment.zone;

  const [current, setCurrent] = useReportedState<string | null, DateChangeReason>({
    value,
    defaultValue,
    onChange: (next, details) => onValueChange?.(next, { ...details, ...readingsOf(next, readZone) }),
    interaction: { component: 'datePicker', type: 'valueChange', content: ['value'] },
  });

  const buttonName = triggerLabel ?? (type === 'time' ? 'Choose time' : 'Choose date');
  const panelName = typeof label === 'string' ? label : buttonName;
  const { attachTrigger, triggerAttributes, triggerElement, closeOnChoice, id, attachField, panel } = usePickerLayer({
    ref,
    open,
    defaultOpen,
    onOpenChange,
    side,
    align,
    matchWidth,
    label: panelName,
  });

  const day = current && type !== 'time' ? toPlainDate(current, { zone: readZone }) : null;
  const time = current && type !== 'date' ? toPlainTime(current, { zone: readZone }) : null;
  // A time bounds every day; a date-time's bound only its own day — the one a time picked first lands on, too.
  const listDay = type === 'datetime' ? (day ?? today(readZone)) : null;
  const timeBound = (bound: string | null | undefined) =>
    bound && (listDay === null || toPlainDate(bound, { zone: readZone }) === listDay) ? toPlainTime(bound, { zone: readZone }) : null;
  const shown = current
    ? format(current, {
        locale,
        zone: readZone,
        hourCycle: hourCycle === undefined ? undefined : hourCycle === 12 ? 'h12' : 'h23',
        ...(type === 'date'
          ? { dateStyle: 'medium' }
          : type === 'time'
            ? { timeStyle: 'short' }
            : { dateStyle: 'medium', timeStyle: 'short' }),
      })
    : '';
  // A pick-only field names its zone the way `DateField` does, after the time.
  const zoneLabel =
    pickOnly && current && zone && (showZone ?? zone !== environment.readerZone)
      ? zoneName(zone, { locale, style: 'short', at: current })
      : null;

  const close = closeOnChoice;
  const compose = (nextDay: string, nextTime: string) => combine(nextDay, nextTime, zone ? { zone, disambiguation } : {});

  const pickDay = (next: string | null, event: React.SyntheticEvent) => {
    if (!next) return;
    if (type === 'date') {
      setCurrent(next, { reason: 'select', event });
      if (closeOnSelect) close(event);
    } else setCurrent(compose(next, time ?? defaultTime), { reason: 'select', event });
  };

  const pickTime = (next: string, event: React.SyntheticEvent) => {
    setCurrent(type === 'time' ? next : compose(day ?? today(readZone), next), { reason: 'select', event });
    if (closeOnSelect) close(event);
  };

  const trigger = (
    <Box
      tag="button"
      ref={attachTrigger}
      component="datePicker.trigger"
      display="inline-flex"
      ai="center"
      jc="center"
      width={7}
      height={7}
      ms={2}
      me={-1.5}
      borderRadius={1.5}
      disabled={disabled || readOnly}
      props={{ type: 'button', 'aria-label': shown ? `${buttonName}, ${shown}` : buttonName, tabIndex, ...triggerAttributes }}
    >
      {type === 'time' ? <ClockIcon /> : <CalendarIcon />}
    </Box>
  );

  const clear = clearable && current && !disabled && !readOnly && (
    <Box
      tag="button"
      component="datePicker.clear"
      display="inline-flex"
      ai="center"
      jc="center"
      width={6}
      height={6}
      ms={1}
      borderRadius={999}
      // Above a pick-only field's button, whose `::after` covers the frame.
      position="relative"
      zIndex={1}
      props={{
        type: 'button',
        'aria-label': clearLabel,
        tabIndex,
        onClick: (event: React.MouseEvent) => setCurrent(null, { reason: 'clear', event }),
      }}
    >
      <ClearIcon />
    </Box>
  );

  const outOfBounds = current !== null && ((min != null && compare(current, min) < 0) || (max != null && compare(current, max) > 0));
  const field = pickOnly ? (
    <PickField
      frame={restProps}
      attachField={attachField}
      attachTrigger={readOnly ? undefined : attachTrigger}
      triggerAttributes={readOnly ? undefined : triggerAttributes}
      triggerElement={triggerElement}
      id={id}
      label={label}
      labelledBy={labelledBy}
      describedBy={describedBy}
      text={zoneLabel ? `${shown} ${zoneLabel}` : shown}
      placeholder={buttonName}
      icon={type === 'time' ? <ClockIcon /> : <CalendarIcon />}
      clear={clear}
      disabled={disabled}
      invalid={invalid ?? (outOfBounds || (day !== null && !!isDateUnavailable?.(day)))}
      required={required}
      tabIndex={tabIndex}
      inputs={[{ name, value: current ?? '' }]}
      onReset={(event) => setCurrent(defaultValue, { reason: 'reset', event })}
    />
  ) : (
    <DateField
      ref={attachField}
      {...(restProps as object)}
      type={type}
      value={current}
      onValueChange={(next, details) => setCurrent(next, { reason: details.reason, event: details.event })}
      zone={zoneProp}
      locale={localeProp}
      hourCycle={hourCycle}
      granularity={granularity}
      disambiguation={disambiguation}
      min={min}
      max={max}
      isDateUnavailable={isDateUnavailable}
      disabled={disabled}
      readOnly={readOnly}
      required={required}
      invalid={invalid}
      name={name}
      label={label}
      labelledBy={labelledBy}
      describedBy={describedBy}
      showZone={showZone}
      tabIndex={tabIndex}
      end={
        <>
          {clear}
          {trigger}
        </>
      }
    />
  );

  return (
    <QuietInteractions>
      {field}
      {panel(
        <Box display="flex" gap={3} ai="stretch">
          {presets && presets.length > 0 && (
            <Presets
              presets={presets}
              isSelected={(preset) => current !== null && compare(preset, current, { zone: readZone }) === 0}
              onSelect={(preset, event) => {
                setCurrent(preset, { reason: 'preset', event });
                if (closeOnSelect) close(event);
              }}
            />
          )}
          {type !== 'time' && (
            <Calendar
              value={day}
              onValueChange={(next, details) => pickDay(next, details.event as React.SyntheticEvent)}
              min={min ? toPlainDate(min, { zone: readZone }) : undefined}
              max={max ? toPlainDate(max, { zone: readZone }) : undefined}
              isDateUnavailable={isDateUnavailable}
              locale={localeProp}
              zone={zoneProp === 'none' ? undefined : zoneProp}
              firstDayOfWeek={firstDayOfWeek}
              weekNumbers={weekNumbers}
            />
          )}
          {type !== 'date' && (
            <TimeList
              value={time}
              step={step}
              locale={locale}
              hourCycle={hourCycle}
              label={type === 'time' ? panelName : 'Time'}
              min={timeBound(min)}
              max={timeBound(max)}
              emptyLabel={emptyTimesLabel}
              separated={type === 'datetime'}
              onSelect={pickTime}
            />
          )}
        </Box>,
      )}
    </QuietInteractions>
  );
}

/**
 * Two dates that make a span — a stay, a reporting period — typed into two fields or picked on a range calendar.
 *
 * ```tsx
 * <DateRangePicker label="Stay" startName="from" endName="to" min={today()} onValueChange={(range) => search(range)} />
 * ```
 *
 * **The value is `{ start, end }`**, two `YYYY-MM-DD` strings in order, reported once both are filled in. In
 * the calendar the first press anchors the range and the second ends it, whichever way round they come.
 *
 * @pattern https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
 * @a11y The two fields are named `startLabel` and `endLabel` and grouped under the picker's label; the
 * calendar marks every day of the span `aria-selected`.
 * @keyboard Enter / Space — On the button, opens the panel; in the calendar, anchors and then ends the range.
 * @keyboard Escape — Drops a half-picked range, then closes the panel.
 */
function DateRangePickerImpl<TKey extends keyof ComponentsAndVariants = 'dateField'>(
  props: DateRangePickerProps<TKey>,
  ref: Ref<HTMLDivElement>,
) {
  const {
    value,
    defaultValue = null,
    onValueChange,
    locale: localeProp,
    min,
    max,
    isDateUnavailable,
    disabled = false,
    readOnly = false,
    required,
    invalid,
    startName,
    endName,
    label,
    labelledBy,
    describedBy,
    startLabel = 'Start date',
    endLabel = 'End date',
    open,
    defaultOpen,
    onOpenChange,
    closeOnSelect = true,
    firstDayOfWeek,
    weekNumbers,
    months = 2,
    side = 'bottom',
    align = 'start',
    matchWidth = false,
    emptyTimesLabel: _emptyTimesLabel,
    clearable = false,
    pickOnly = false,
    triggerLabel = 'Choose dates',
    clearLabel = 'Clear',
    tabIndex,
    presets,
    props: tagProps,
    ...restProps
  } = props;

  const { locale } = useDateEnvironment({ locale: localeProp });
  const [current, setCurrent] = useReportedState<DateRange | null, DateChangeReason>({
    value,
    defaultValue,
    onChange: onValueChange,
    interaction: { component: 'dateRangePicker', type: 'valueChange', content: ['value'] },
  });
  // Each end as typed, which can be more than the value: one end filled in is no range yet.
  const [ends, setEnds] = useState<{ start: string | null; end: string | null; source: DateRange | null }>({
    start: current?.start ?? null,
    end: current?.end ?? null,
    source: current,
  });
  let { start, end } = ends;
  if (ends.source !== current) {
    start = current?.start ?? null;
    end = current?.end ?? null;
    setEnds({ start, end, source: current });
  }

  const panelName = typeof label === 'string' ? label : triggerLabel;
  const {
    attachTrigger,
    triggerAttributes,
    triggerElement,
    closeOnChoice,
    id: layerId,
    attachField,
    panel,
  } = usePickerLayer({ ref, open, defaultOpen, onOpenChange, side, align, matchWidth, label: panelName });
  const shown = current ? formatRange(current.start, current.end, { locale }) : '';
  const backwards = start !== null && end !== null && compare(start, end) > 0;

  const update = (nextStart: string | null, nextEnd: string | null, reason: DateChangeReason, event?: Event | React.SyntheticEvent) => {
    const range = nextStart && nextEnd && compare(nextStart, nextEnd) <= 0 ? { start: nextStart, end: nextEnd } : null;
    setEnds({ start: nextStart, end: nextEnd, source: range });
    setCurrent(range, { reason, event });
  };

  const close = closeOnChoice;
  const fieldProps = {
    locale: localeProp,
    min,
    max,
    isDateUnavailable,
    disabled,
    readOnly,
    required,
    component: 'datePicker.part' as const,
    px: 0,
    py: 0,
    tabIndex,
  };

  const clear = clearable && current && !disabled && !readOnly && (
    <Box
      tag="button"
      component="datePicker.clear"
      display="inline-flex"
      ai="center"
      jc="center"
      width={6}
      height={6}
      borderRadius={999}
      // Above a pick-only field's button, whose `::after` covers the frame.
      position="relative"
      zIndex={1}
      props={{
        type: 'button',
        'aria-label': clearLabel,
        tabIndex,
        onClick: (event: React.MouseEvent) => update(null, null, 'clear', event),
      }}
    >
      <ClearIcon />
    </Box>
  );

  const outOfBounds =
    current !== null && ((min != null && compare(current.start, min) < 0) || (max != null && compare(current.end, max) > 0));
  const field = pickOnly ? (
    <PickField
      frame={{ ...restProps, props: tagProps }}
      attachField={attachField}
      attachTrigger={readOnly ? undefined : attachTrigger}
      triggerAttributes={readOnly ? undefined : triggerAttributes}
      triggerElement={triggerElement}
      id={layerId}
      label={label}
      labelledBy={labelledBy}
      describedBy={describedBy}
      text={shown}
      placeholder={triggerLabel}
      icon={<CalendarIcon />}
      clear={clear}
      disabled={disabled}
      invalid={invalid ?? outOfBounds}
      required={required}
      tabIndex={tabIndex}
      inputs={[
        { name: startName, value: current?.start ?? '' },
        { name: endName, value: current?.end ?? '' },
      ]}
      onReset={(event) => update(defaultValue?.start ?? null, defaultValue?.end ?? null, 'reset', event)}
    />
  ) : (
    <>
      {label !== undefined && (
        <Box component="dateField.label" display="block" mb={1.5} fontSize={14} id={`${layerId}-label`}>
          {label}
        </Box>
      )}
      <Box
        ref={attachField}
        component={'dateField' as TKey}
        display="inline-flex"
        ai="center"
        gap={2}
        px={3}
        py={2}
        {...(restProps as PickerBoxProps<TKey>)}
        variant={[restProps.variant, { disabled, invalid: invalid ?? backwards }] as never}
        props={{
          role: 'group',
          'aria-labelledby': [label !== undefined ? `${layerId}-label` : undefined, labelledBy].filter(Boolean).join(' ') || undefined,
          'aria-invalid': (invalid ?? backwards) || undefined,
          'aria-describedby': describedBy,
          ...tagProps,
        }}
      >
        <DateField
          {...fieldProps}
          value={start}
          onValueChange={(next, details) => update(next, end, details.reason, details.event)}
          name={startName}
          props={{ 'aria-label': startLabel }}
          invalid={invalid ?? backwards}
        />
        <Box component="dateField.literal" props={{ 'aria-hidden': true }}>
          –
        </Box>
        <DateField
          {...fieldProps}
          value={end}
          onValueChange={(next, details) => update(start, next, details.reason, details.event)}
          name={endName}
          props={{ 'aria-label': endLabel }}
          invalid={invalid ?? backwards}
        />
        <Box display="inline-flex" ai="center" gap={2} ms="auto">
          {clear}
          <Box
            tag="button"
            ref={attachTrigger}
            component="datePicker.trigger"
            display="inline-flex"
            ai="center"
            jc="center"
            width={7}
            height={7}
            me={-1.5}
            borderRadius={1.5}
            disabled={disabled || readOnly}
            props={{ type: 'button', 'aria-label': shown ? `${triggerLabel}, ${shown}` : triggerLabel, tabIndex, ...triggerAttributes }}
          >
            <CalendarIcon />
          </Box>
        </Box>
      </Box>
    </>
  );

  return (
    <QuietInteractions>
      {field}
      {panel(
        <Box display="flex" gap={3} ai="stretch">
          {presets && presets.length > 0 && (
            <Presets
              presets={presets}
              isSelected={(preset) => current !== null && preset.start === current.start && preset.end === current.end}
              onSelect={(preset, event) => {
                update(preset.start, preset.end, 'preset', event);
                if (closeOnSelect) close(event);
              }}
            />
          )}
          <Calendar
            mode="range"
            months={months}
            value={current}
            defaultFocusedDate={start ?? undefined}
            onValueChange={(next, details) => {
              update(next?.start ?? null, next?.end ?? null, 'select', details.event);
              if (closeOnSelect && next && details.event) close(details.event as React.SyntheticEvent);
            }}
            min={min}
            max={max}
            isDateUnavailable={isDateUnavailable}
            locale={localeProp}
            firstDayOfWeek={firstDayOfWeek}
            weekNumbers={weekNumbers}
          />
        </Box>,
      )}
    </QuietInteractions>
  );
}

const DatePicker = boxComponent(DatePickerImpl, 'DatePicker');
const DateRangePicker = boxComponent(DateRangePickerImpl, 'DateRangePicker') as <TKey extends keyof ComponentsAndVariants = 'dateField'>(
  props: DateRangePickerProps<TKey> & RefAttributes<HTMLDivElement>,
) => React.ReactNode;

export { DateRangePicker };
export default DatePicker as <TKey extends keyof ComponentsAndVariants = 'dateField'>(
  props: DatePickerProps<TKey> & RefAttributes<HTMLDivElement>,
) => React.ReactNode;
