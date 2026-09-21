import { BenchImplInfo } from './gridImpl';

/**
 * Every grid the page can measure. The published site measures this one and says nothing about anybody
 * else's: a benchmark page that ranks other libraries is a page about them, and the number worth
 * printing here is what this grid does on the reader's own machine.
 *
 * The comparison is still run, in a terminal rather than in public — `dev/compare/grids/` holds the
 * adapters and `dev/compare/README.md` says how. They are appended below outside a production build, so
 * `npm run dev` offers the four-way picker and `npm run build:pages` emits neither the picker nor their
 * chunks.
 */
const boxKite: BenchImplInfo = {
  id: 'box-kite',
  label: 'Box Kite',
  tier: 'MIT. One tier, and this is it.',
  href: 'https://www.box-kite.dev/datagrid',
  load: () => import('./boxKiteGrid').then((module) => module.default),
};

/**
 * The other three, in a development build only. `import.meta.env.PROD` is a literal by the time Rollup
 * sees it, so the array below folds to `[boxKite]` and the three dynamic imports become unreachable —
 * no chunk, no `ag-grid-community` in the site's dependency graph.
 */
const comparison: readonly BenchImplInfo[] = import.meta.env.PROD
  ? []
  : [
      {
        id: 'ag-grid',
        label: 'AG Grid Community',
        tier: 'MIT. Row grouping and aggregation are AG Grid Enterprise.',
        href: 'https://www.ag-grid.com/license-pricing/',
        unavailable: { group: 'Enterprise' },
        load: () => import('../../dev/compare/grids/agGrid').then((module) => module.default),
      },
      {
        id: 'mui-x',
        label: 'MUI X Data Grid',
        tier: 'MIT. The free grid paginates, a hundred rows to a page; grouping and aggregation are Premium.',
        href: 'https://mui.com/pricing/',
        unavailable: { scroll: 'paginated', group: 'Premium' },
        load: () => import('../../dev/compare/grids/muiGrid').then((module) => module.default),
      },
      {
        id: 'tanstack',
        label: 'TanStack Table + own UI',
        tier: 'MIT, and every scenario — the model is free and the grid is yours to write.',
        href: 'https://tanstack.com/table',
        load: () => import('../../dev/compare/grids/tanstackGrid').then((module) => module.default),
      },
    ];

const impls: readonly BenchImplInfo[] = [boxKite, ...comparison];

export default impls;

/** The one that is always measured: the picker starts here and CI never leaves it. */
export const DEFAULT_IMPL = 'box-kite';

/** Whether there is anything to compare against — false on the published site, where the picker is gone. */
export const HAS_COMPARISON = comparison.length > 0;
