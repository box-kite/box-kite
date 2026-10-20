import { createContext, createElement, ReactNode, useCallback, useContext } from 'react';
import { emitInteraction, InteractionComponent, InteractionType } from '../../utils/interactions/interactionChannel';
import { useLatest } from './callbacks';
import type { ChangeDetails } from './useControllableState';

/**
 * The one door a component reports through, so whether it is quiet is decided once. Inside a component built
 * from others — the `Calendar` in a `DatePicker`, the `Dropdown` in a DataGrid filter — the parts are quiet,
 * and one choice is one event from the component the app rendered.
 */
const InteractionsQuiet = createContext(false);

export function QuietInteractions({ children }: { children: ReactNode }) {
  return createElement(InteractionsQuiet.Provider, { value: true }, children);
}

/** Where a quiet part renders the app's own content — a `rowDetail`, a column's `Cell` — which reports as usual. */
export function ReportInteractions({ children }: { children: ReactNode }) {
  return createElement(InteractionsQuiet.Provider, { value: false }, children);
}

/** A callback's details as they stand, or a record of them: `reason` and `event` are lifted out, the rest is `details`. */
export type InteractionDetails = Partial<ChangeDetails> | Record<string, unknown>;

export type ReportInteraction<C extends InteractionComponent> = (
  type: InteractionType<C>,
  value?: unknown,
  details?: InteractionDetails,
) => void;

/** `report(type, value, { reason, event, ...details })` for one component, silent inside `QuietInteractions`. */
export function useInteractionReporter<C extends InteractionComponent>(component: C | undefined): ReportInteraction<C> {
  const quiet = useContext(InteractionsQuiet);

  return useCallback(
    (type, value, details = {}) => {
      if (quiet || !component) return;

      const { reason, event, ...rest } = details as Record<string, unknown>;

      emitInteraction({ component, type, reason: reason as string | undefined, value, details: rest, event });
    },
    [quiet, component],
  );
}

/** A stable change handler that `Box.onInteraction` hears as well, under `component` and `type`. */
export function useInteractionCallback<C extends InteractionComponent, T, TDetails extends ChangeDetails>(
  fn: ((value: T, details: TDetails) => void) | undefined,
  component: C,
  type: InteractionType<C>,
): (value: T, details: TDetails) => void {
  const ref = useLatest(fn);
  const report = useInteractionReporter(component);

  return useCallback(
    (value: T, details: TDetails) => {
      ref.current?.(value, details);
      report(type, value, details);
    },
    [ref, report, type],
  );
}
