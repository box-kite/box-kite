import { useState } from 'react';
import { useIsomorphicLayoutEffect } from '../../react/effects';
import type DataGridDateParts from './components/dataGridDateParts';

type DateParts = typeof DataGridDateParts;

let loaded: DateParts | undefined;
let pending: Promise<DateParts> | undefined;

/**
 * Fetch the grid's date parts — the formatter, the `DateField` editor and the date filters. A chunk of its own,
 * since a grid with no dates in it should not carry a date library, so it is asked for the first time a cell,
 * an editor or a filter needs one.
 */
export function loadDateParts(): Promise<DateParts> {
  pending ??= import('./components/dataGridDateParts').then((module) => (loaded = module.default));

  return pending;
}

/** The parts if they have arrived — what a model asks, since it cannot wait for them. */
export function dateParts(): DateParts | undefined {
  return loaded;
}

/**
 * The parts once they are here, or `undefined` while the cell goes on showing the raw value. Always `undefined`
 * on the first render, which is what a server rendered too; a layout effect swaps them in before the paint when
 * they are already loaded. No `React.lazy`, for the reason `useListLayout` gives.
 */
export default function useDateParts(active: boolean): DateParts | undefined {
  const [parts, setParts] = useState<DateParts | undefined>(undefined);

  useIsomorphicLayoutEffect(() => {
    if (!active || parts) return;
    if (loaded) {
      setParts(() => loaded);
      return;
    }

    let live = true;
    void loadDateParts().then((module) => live && setParts(() => module));

    return () => {
      live = false;
    };
  }, [active, parts]);

  return parts;
}
