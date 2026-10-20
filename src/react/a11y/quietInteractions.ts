import { createContext, createElement, ReactNode } from 'react';

/**
 * Inside a component built from others — the `Calendar` in a `DatePicker`, the `Dropdown` in a DataGrid filter —
 * the parts report nothing to `Box.onInteraction`, so one choice is one event from the component the app rendered.
 */
export const InteractionsQuiet = createContext(false);

export function QuietInteractions({ children }: { children: ReactNode }) {
  return createElement(InteractionsQuiet.Provider, { value: true }, children);
}
