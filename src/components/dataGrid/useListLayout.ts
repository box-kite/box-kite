import { useEffect, useState } from 'react';
import { matchMedia } from '../../utils/environment/environmentUtils';
import type DataGridList from './components/dataGridList';

type ListLayout = typeof DataGridList;

let loaded: ListLayout | undefined;
let pending: Promise<ListLayout> | undefined;

/**
 * Fetch the list layout. It is a chunk of its own — the sheets, the record view and the `<dialog>` under them
 * are 10 KB gzipped a wide screen never draws — so it is asked for the first time a grid is narrow.
 */
export function loadListLayout(): Promise<ListLayout> {
  pending ??= import('./components/dataGridList').then((module) => (loaded = module.default));

  return pending;
}

// A phone will want it, so it starts on the way while the page is still being put together: by the time a
// grid has measured itself the list is usually here, and the table it would otherwise show first never is.
if (matchMedia('(max-width: 36rem)')?.matches) void loadListLayout();

/**
 * The list layout's component once it has arrived, or `undefined` while the grid should go on drawing its
 * table. No `React.lazy`: a Suspense boundary is the one thing a React 16 or 17 server cannot render.
 */
export default function useListLayout(active: boolean): ListLayout | undefined {
  const [layout, setLayout] = useState(() => loaded);

  useEffect(() => {
    if (!active || layout) return;

    let live = true;
    void loadListLayout().then((component) => live && setLayout(() => component));

    return () => {
      live = false;
    };
  }, [active, layout]);

  return layout;
}
