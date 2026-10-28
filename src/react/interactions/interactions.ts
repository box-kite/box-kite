import { createContext, createElement, ReactNode, useCallback, useContext } from 'react';
import { emitInteraction, InteractionComponent, InteractionSource, InteractionType } from '../../utils/interactions/interactionChannel';
import { useLatest } from '../a11y/callbacks';
import useControllableState, { ChangeDetails, ControllableStateOptions, SetControllableState } from '../a11y/useControllableState';

/**
 * The one door a component reports through, so whether it is quiet is decided once. Inside a component built
 * from others (the `Calendar` in a `DatePicker`, the `Dropdown` in a DataGrid filter) the parts are quiet,
 * and one choice is one event from the component the app rendered. Outside `/a11y` on purpose: a behaviour primitive reports nothing.
 */
const InteractionsQuiet = createContext(false);

export function QuietInteractions({ children }: { children: ReactNode }) {
  return createElement(InteractionsQuiet.Provider, { value: true }, children);
}

/** Where a quiet part renders the app's own content (a `rowDetail`, a column's `Cell`), which reports as usual. */
export function ReportInteractions({ children }: { children: ReactNode }) {
  return createElement(InteractionsQuiet.Provider, { value: false }, children);
}

/**
 * A callback's details as they stand, or a record of them: `reason`, `event` and `content` are lifted out and the rest is
 * `details`. `content` names what a person typed or picked as data (`['value', 'oldValue']`), which a listener has to ask for.
 */
export type InteractionDetails = (Partial<ChangeDetails> | Record<string, unknown>) & { content?: readonly string[] };

export type ReportInteraction<C extends InteractionComponent> = (
  type: InteractionType<C>,
  value?: unknown,
  details?: InteractionDetails,
) => void;

/** `report(type, value, { reason, event, content, ...details })` for one component, silent inside `QuietInteractions`. */
export function useInteractionReporter<C extends InteractionComponent>(component: C | undefined): ReportInteraction<C> {
  const quiet = useContext(InteractionsQuiet);

  return useCallback(
    (type, value, details = {}) => {
      if (quiet || !component) return;

      const { reason, event, content, ...rest } = details as Record<string, unknown>;

      emitInteraction({ component, type, reason: reason as string | undefined, value, details: rest, event, content: content as string[] });
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

/** Which component a value belongs to and which of its changes it is, plus what of it is content. */
export type ReportedAs = InteractionSource & { content?: readonly string[] };

/** `useControllableState`, with every change it makes also reaching `Box.onInteraction`. */
export function useReportedState<T, TReason extends string = string>(
  options: ControllableStateOptions<T, TReason> & { interaction?: ReportedAs },
): [T, SetControllableState<T, TReason>] {
  const { interaction, onChange, ...state } = options;
  const report = useInteractionReporter(interaction?.component);

  return useControllableState<T, TReason>({
    ...state,
    // The state hook keeps the latest handler, so an inline one costs the setter nothing.
    onChange: (value, details) => {
      onChange?.(value, details);
      if (interaction) report(interaction.type as never, value, { ...details, content: interaction.content });
    },
  });
}
