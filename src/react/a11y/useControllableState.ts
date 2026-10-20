import { useCallback, useContext, useState } from 'react';
import { emitInteraction, InteractionSource } from '../../utils/interactions/interactionChannel';
import { useEventCallback, useLatest } from './callbacks';
import { InteractionsQuiet } from './quietInteractions';

/**
 * Why a change happened, and the event that caused it — the reason being the point. A component that only
 * says `onOpenChange(false)` makes its consumer guess whether the popup closed because the user picked
 * something, pressed Escape or clicked away, and each of those wants different behaviour from the app.
 */
export interface ChangeDetails<TReason extends string = string> {
  reason: TReason;
  /** The DOM or React event behind the change, when there was one. */
  event?: Event | React.SyntheticEvent;
}

/** `TDetails` is for a change that says more than its reason — which item moved, and from where. */
export type ChangeHandler<T, TReason extends string = string, TDetails extends ChangeDetails<TReason> = ChangeDetails<TReason>> = (
  value: T,
  details: TDetails,
) => void;

export interface ControllableStateOptions<T, TReason extends string = string> {
  /** Present (not `undefined`) means the consumer owns the value: state here is ignored. */
  value?: T;
  /** The starting value when the consumer does not own it. A function is called once, lazily. */
  defaultValue: T | (() => T);
  onChange?: ChangeHandler<T, TReason>;
  /** Which component this value belongs to, so every change also reaches `Box.onInteraction`. */
  interaction?: InteractionSource;
}

export type SetControllableState<T, TReason extends string = string> = (
  next: T | ((current: T) => T),
  details: ChangeDetails<TReason>,
) => void;

/**
 * One state value that works the same whether the consumer controls it or not. The setter is stable, and
 * every call names a reason, which is what reaches `onChange`. A call resolving to the value already held
 * is dropped: two dismissal layers closing the same popup is the normal case, not an error.
 */
export default function useControllableState<T, TReason extends string = string>(
  options: ControllableStateOptions<T, TReason>,
): [T, SetControllableState<T, TReason>] {
  const { value, defaultValue, onChange, interaction } = options;
  // Two literals at every call site, so the strings rather than the object keep the setter stable.
  const quiet = useContext(InteractionsQuiet);
  const component = quiet ? undefined : interaction?.component;
  const type = interaction?.type;

  const isControlled = value !== undefined;
  const [uncontrolled, setUncontrolled] = useState(defaultValue);
  const current = isControlled ? value : uncontrolled;

  // What the stable setter reads instead of closing over the value: an updater has to resolve
  // against what is on screen now, and the setter must keep its identity so an effect can depend
  // on it.
  const currentRef = useLatest(current);
  const changeHandler = useEventCallback(onChange);

  const setValue = useCallback<SetControllableState<T, TReason>>(
    (next, details) => {
      const resolved = typeof next === 'function' ? (next as (current: T) => T)(currentRef.current) : next;

      if (Object.is(resolved, currentRef.current)) return;

      // Written whether or not a value prop is present: one code path, and a consumer that stops
      // controlling the value carries on from the last one it was asked for rather than snapping
      // back to the default.
      setUncontrolled(resolved);
      changeHandler(resolved, details);

      if (component && type) {
        const { reason, event, ...rest } = details;

        emitInteraction({ component, type, reason, value: resolved, details: rest, event });
      }
    },
    [changeHandler, currentRef, component, type],
  );

  return [current, setValue];
}
