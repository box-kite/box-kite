import { catalog } from '@box-kite/react/catalog';

/**
 * What a generated dashboard may be made of here — the same description on both sides of the model call.
 * The route turns it into the schema the model generates under; the page turns it into the registry the
 * renderer enforces. One source, so the constraint and the renderer cannot drift apart.
 *
 * `@box-kite/react/catalog` renders nothing and carries no `use client` banner, which is what lets a route
 * handler import it: the entry that *renders* a spec is a client entry, and a route is a server call.
 */
export const ALLOWED = catalog({
  include: ['DashboardGrid', 'Widget', 'Sparkline', 'ProgressRing', 'Gauge', 'MiniDonut', 'DataGrid', 'Flex'],
  styleProps: ['d', 'gap', 'p', 'ai', 'jc', 'color', 'fontSize', 'fontWeight', 'width', 'height', 'textAlign'],
});

/**
 * The app's data. The model never sees it: a spec can name a path into this (`{ "$data": "orders" }`) and
 * nothing else, so what is rendered is the app's numbers whatever the model was asked for.
 */
export const DATA = {
  revenue: [128, 141, 132, 158, 171, 164, 189, 204, 196, 221, 238, 262],
  conversion: 0.62,
  fulfilment: 0.78,
  categories: [38, 24, 19, 11, 8],
  orders: [
    { id: 1, customer: 'Ana Muresan', channel: 'Web', placed: '18 Sep', total: 412.5 },
    { id: 2, customer: 'Bo Lindqvist', channel: 'Partner', placed: '18 Sep', total: 1290 },
    { id: 3, customer: 'Chidi Okafor', channel: 'Web', placed: '17 Sep', total: 87.25 },
    { id: 4, customer: 'Dilnoza Karimova', channel: 'Retail', placed: '17 Sep', total: 640 },
    { id: 5, customer: 'Elena Rusu', channel: 'Web', placed: '16 Sep', total: 215.8 },
  ],
};

/** What the data holds, in the words a prompt can use. The model needs the paths, not the values. */
export const DATA_SHAPE = [
  'revenue: number[] — twelve weekly totals, in thousands',
  'conversion: number — a fraction from 0 to 1',
  'fulfilment: number — a fraction from 0 to 1',
  'categories: number[] — five support categories, by count',
  'orders: { id, customer, channel, placed, total }[] — the five most recent orders',
].join('\n');
