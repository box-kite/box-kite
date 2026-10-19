import { DateReadings } from '../../utils/date/dateTime';
import { ChangeDetails } from '../a11y/useControllableState';

/**
 * Why a date value changed: digits or arrows in a field, a paste, a day picked in a calendar or a time in a
 * list, a preset, the clear button, or a form reset.
 */
export type DateChangeReason = 'keyboard' | 'paste' | 'select' | 'preset' | 'clear' | 'reset';

/**
 * What a date control hands its `onValueChange` beside the string: the reason, plus every reading of the
 * value an app is likely to want — `utc`, the reader's `local` wall clock, a `Date`, the epoch.
 *
 * ```tsx
 * <DateField type="datetime" onValueChange={(value, { utc, local }) => save(utc)} />
 * ```
 */
export type DateChangeDetails<TReason extends string = DateChangeReason> = ChangeDetails<TReason> & DateReadings;

/** A date control's change handler: the canonical string (or `null`) and the readings. */
export type DateChangeHandler<TValue = string | null, TReason extends string = DateChangeReason> = (
  value: TValue,
  details: DateChangeDetails<TReason>,
) => void;
