import { BenchImplInfo } from './gridImpl';

/**
 * Every grid the page can measure, in the order the picker offers them — and what each one costs, since
 * three of the five scenarios are free everywhere and two of them are not.
 *
 * Each is fetched when it is picked. Loading four grid libraries to read a table of numbers would be a
 * megabyte nobody asked for, and the two that cannot run a scenario say so here rather than being driven
 * through it and scored on whatever they did instead.
 */
const impls: readonly BenchImplInfo[] = [
  {
    id: 'box-kite',
    label: 'Box Kite',
    tier: 'MIT. One tier, and this is it.',
    href: 'https://www.box-kite.dev/datagrid',
    load: () => import('./boxKiteGrid').then((module) => module.default),
  },
  {
    id: 'ag-grid',
    label: 'AG Grid Community',
    tier: 'MIT. Row grouping and aggregation are AG Grid Enterprise.',
    href: 'https://www.ag-grid.com/license-pricing/',
    unavailable: { group: 'Enterprise' },
    load: () => import('./agGrid').then((module) => module.default),
  },
  {
    id: 'mui-x',
    label: 'MUI X Data Grid',
    tier: 'MIT. The free grid paginates, a hundred rows to a page; grouping and aggregation are Premium.',
    href: 'https://mui.com/pricing/',
    unavailable: { scroll: 'paginated', group: 'Premium' },
    load: () => import('./muiGrid').then((module) => module.default),
  },
  {
    id: 'tanstack',
    label: 'TanStack Table + own UI',
    tier: 'MIT, and every scenario — the model is free and the grid is yours to write.',
    href: 'https://tanstack.com/table',
    load: () => import('./tanstackGrid').then((module) => module.default),
  },
];

export default impls;

/** The one that is always measured: the picker starts here and CI never leaves it. */
export const DEFAULT_IMPL = 'box-kite';
