import { useState } from 'react';
// Shim delegates to React's native useSyncExternalStore on 18+, and provides a correct
// userland implementation on React 16.14–17, so the DataGrid works across React 17–19.
import { useSyncExternalStore } from 'use-sync-external-store/shim';
import useIdentifier from '../../react/identity/useIdentifier';
import { DataGridProps } from './contracts/dataGridContract';
import GridModel from './models/gridModel';

/**
 * React binding for the headless GridModel store: the model owns all state and behaviour, React only
 * subscribes. `setProps` syncs incoming props during render, and `useSyncExternalStore` re-renders
 * whenever the model notifies.
 */
export default function useGrid<TRow>(props: DataGridProps<TRow>): GridModel<TRow> {
  // Lazy initializer creates the model once; the store instance stays stable across renders.
  const [grid] = useState(() => new GridModel(props));

  // The ids the grid's ARIA points at have to come from React: only it can mint one that matches
  // between a server render and the client one.
  const identifier = useIdentifier('datagrid');

  // Sync props during render — memos recompute lazily, so no extra render is triggered.
  grid.setProps(props);
  grid.setIdentifier(identifier);

  useSyncExternalStore(grid.subscribe, grid.getSnapshot, grid.getSnapshot);

  return grid;
}
