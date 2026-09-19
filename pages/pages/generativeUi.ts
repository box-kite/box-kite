import { catalog } from '../../src/catalog';
import { Gauge, MiniDonut, ProgressRing, Sparkline } from '../../src/components/chart';
import DashboardGrid, { Widget } from '../../src/components/dashboard';
import DataGrid from '../../src/components/dataGrid';
import Flex from '../../src/components/flex';
import { createSpecRegistry } from '../../src/spec';

/**
 * The demo's half of the loop: what a model is allowed to build here, what it built, and the data the
 * app handed the renderer. The specs are *recorded* — the docs site is prerendered and static, so there
 * is no server to hold an API key; `examples/next-app` holds the same loop with a live `streamObject`
 * behind it. Everything else on the page is the real thing: this catalog, this registry, this renderer.
 */

/** What a spec may name. Nine components and a dozen style props is a whole dashboard language. */
export const DEMO_CATALOG = catalog({
  include: ['DashboardGrid', 'Widget', 'DataGrid', 'Sparkline', 'ProgressRing', 'Gauge', 'MiniDonut', 'Flex'],
  styleProps: ['d', 'gap', 'p', 'ai', 'jc', 'color', 'bgColor', 'fontSize', 'fontWeight', 'width', 'height', 'textAlign'],
});

/** The allow-list itself: a name it does not hold renders nothing at all, whatever the spec says. */
export const DEMO_REGISTRY = createSpecRegistry({
  catalog: DEMO_CATALOG,
  components: { DashboardGrid, Widget, DataGrid, Sparkline, ProgressRing, Gauge, MiniDonut, Flex },
});

export interface GeneratedDemo {
  id: string;
  /** What was asked for. */
  prompt: string;
  /** What came back, as the text a stream delivers it in — so the page can replay it a chunk at a time. */
  spec: string;
  /** What the app passed beside it. The spec can name a path into this and nothing else. */
  data: Record<string, unknown>;
}

const SALES_DATA = {
  revenue: [128, 141, 132, 158, 171, 164, 189, 204, 196, 221, 238, 262],
  conversion: 0.62,
  conversionText: '62% of visits',
  fulfilment: 0.78,
  fulfilmentText: '78% shipped on time',
  orders: [
    { id: 1, customer: 'Ana Muresan', channel: 'Web', placed: '18 Sep', total: 412.5 },
    { id: 2, customer: 'Bo Lindqvist', channel: 'Partner', placed: '18 Sep', total: 1290 },
    { id: 3, customer: 'Chidi Okafor', channel: 'Web', placed: '17 Sep', total: 87.25 },
    { id: 4, customer: 'Dilnoza Karimova', channel: 'Retail', placed: '17 Sep', total: 640 },
    { id: 5, customer: 'Elena Rusu', channel: 'Web', placed: '16 Sep', total: 215.8 },
    { id: 6, customer: 'Farid Haidari', channel: 'Partner', placed: '16 Sep', total: 998.4 },
  ],
};

const SUPPORT_DATA = {
  opened: [42, 38, 51, 47, 60, 55, 49],
  resolution: 0.86,
  resolutionText: '86% within a day',
  categories: [38, 24, 19, 11, 8],
  tickets: [
    { id: 'S-4821', subject: 'Cannot export invoices', queue: 'Billing', age: '2h', priority: 'High' },
    { id: 'S-4822', subject: 'SSO loop on sign-in', queue: 'Access', age: '3h', priority: 'Urgent' },
    { id: 'S-4823', subject: 'Column widths not saved', queue: 'Product', age: '6h', priority: 'Normal' },
    { id: 'S-4824', subject: 'Refund not showing', queue: 'Billing', age: '1d', priority: 'Normal' },
  ],
};

const TREND_DATA = { revenue: SALES_DATA.revenue };

const SALES_SPEC = `{
  "type": "DashboardGrid",
  "props": {
    "label": "Sales",
    "columns": { "xs": 1, "md": 6, "xxl": 12 },
    "rowHeight": 22,
    "defaultLayout": {
      "version": 1,
      "columns": 12,
      "items": [
        { "id": "revenue", "x": 0, "y": 0, "w": 6, "h": 2 },
        { "id": "conversion", "x": 6, "y": 0, "w": 3, "h": 2, "minW": 2 },
        { "id": "fulfilment", "x": 9, "y": 0, "w": 3, "h": 2, "minW": 2 },
        { "id": "orders", "x": 0, "y": 2, "w": 12, "h": 3 }
      ]
    }
  },
  "children": [
    {
      "type": "Widget",
      "props": { "id": "revenue", "name": "Revenue" },
      "slots": { "title": ["Revenue"], "description": ["Twelve weeks, in thousands"] },
      "children": [
        {
          "type": "Sparkline",
          "props": {
            "data": { "$data": "revenue" },
            "variant": "area",
            "color": "indigo-500",
            "label": "Revenue over the last twelve weeks",
            "width": "100%",
            "height": "100%"
          }
        }
      ]
    },
    {
      "type": "Widget",
      "props": { "id": "conversion", "name": "Conversion" },
      "slots": { "title": ["Conversion"], "description": [{ "$data": "conversionText" }] },
      "children": [
        {
          "type": "Flex",
          "props": { "ai": "center", "jc": "center", "height": "fit" },
          "children": [
            {
              "type": "ProgressRing",
              "props": { "value": { "$data": "conversion" }, "color": "emerald-500", "label": "62 per cent of visits convert", "width": 80, "height": 80 }
            }
          ]
        }
      ]
    },
    {
      "type": "Widget",
      "props": { "id": "fulfilment", "name": "Fulfilment" },
      "slots": { "title": ["Fulfilment"], "description": [{ "$data": "fulfilmentText" }] },
      "children": [
        {
          "type": "Flex",
          "props": { "ai": "center", "jc": "center", "height": "fit" },
          "children": [
            {
              "type": "Gauge",
              "props": { "value": { "$data": "fulfilment" }, "color": "amber-500", "label": "78 per cent shipped on time", "width": 80, "height": 80 }
            }
          ]
        }
      ]
    },
    {
      "type": "Widget",
      "props": { "id": "orders", "name": "Orders" },
      "slots": { "title": ["Recent orders"], "description": ["The six most recent, newest first"] },
      "children": [
        {
          "type": "DataGrid",
          "props": {
            "data": { "$data": "orders" },
            "height": "fit",
            "def": {
              "rowKey": "id",
              "columns": [
                { "key": "customer", "header": "Customer", "flexible": true },
                { "key": "channel", "header": "Channel", "width": 120 },
                { "key": "placed", "header": "Placed", "width": 110 },
                { "key": "total", "header": "Total", "width": 120, "align": "end", "aggregate": "sum" }
              ]
            }
          }
        }
      ]
    }
  ]
}`;

const SUPPORT_SPEC = `{
  "type": "DashboardGrid",
  "props": {
    "label": "Support",
    "columns": { "xs": 1, "md": 6, "xxl": 12 },
    "rowHeight": 22,
    "defaultLayout": {
      "version": 1,
      "columns": 12,
      "items": [
        { "id": "opened", "x": 0, "y": 0, "w": 5, "h": 2 },
        { "id": "resolution", "x": 5, "y": 0, "w": 3, "h": 2, "minW": 2 },
        { "id": "categories", "x": 8, "y": 0, "w": 4, "h": 2, "minW": 2 },
        { "id": "queue", "x": 0, "y": 2, "w": 12, "h": 3 }
      ]
    }
  },
  "children": [
    {
      "type": "Widget",
      "props": { "id": "opened", "name": "Tickets opened" },
      "slots": { "title": ["Tickets opened"], "description": ["One bar a day, this week"] },
      "children": [
        {
          "type": "Sparkline",
          "props": {
            "data": { "$data": "opened" },
            "variant": "bar",
            "color": "sky-500",
            "label": "Tickets opened each day this week",
            "width": "100%",
            "height": "100%"
          }
        }
      ]
    },
    {
      "type": "Widget",
      "props": { "id": "resolution", "name": "Resolved in a day" },
      "slots": { "title": ["Resolved in a day"], "description": [{ "$data": "resolutionText" }] },
      "children": [
        {
          "type": "Flex",
          "props": { "ai": "center", "jc": "center", "height": "fit" },
          "children": [
            {
              "type": "ProgressRing",
              "props": { "value": { "$data": "resolution" }, "color": "violet-500", "label": "86 per cent resolved within a day", "width": 80, "height": 80 }
            }
          ]
        }
      ]
    },
    {
      "type": "Widget",
      "props": { "id": "categories", "name": "By category" },
      "slots": { "title": ["By category"], "description": ["Billing, access, product, billing-ops, other"] },
      "children": [
        {
          "type": "Flex",
          "props": { "ai": "center", "jc": "center", "height": "fit" },
          "children": [
            { "type": "MiniDonut", "props": { "data": { "$data": "categories" }, "label": "Tickets by category", "width": 80, "height": 80 } }
          ]
        }
      ]
    },
    {
      "type": "Widget",
      "props": { "id": "queue", "name": "Open queue" },
      "slots": { "title": ["Open queue"] },
      "children": [
        {
          "type": "DataGrid",
          "props": {
            "data": { "$data": "tickets" },
            "height": "fit",
            "def": {
              "rowKey": "id",
              "columns": [
                { "key": "id", "header": "Ticket", "width": 110 },
                { "key": "subject", "header": "Subject", "flexible": true },
                { "key": "queue", "header": "Queue", "width": 120 },
                { "key": "age", "header": "Age", "width": 90, "align": "end" },
                { "key": "priority", "header": "Priority", "width": 110 }
              ]
            }
          }
        }
      ]
    }
  ]
}`;

const TREND_SPEC = `{
  "type": "DashboardGrid",
  "props": {
    "label": "Revenue",
    "columns": 12,
    "rowHeight": 30,
    "defaultLayout": {
      "version": 1,
      "columns": 12,
      "items": [{ "id": "revenue", "x": 0, "y": 0, "w": 12, "h": 3 }]
    }
  },
  "children": [
    {
      "type": "Widget",
      "props": { "id": "revenue", "name": "Revenue" },
      "slots": { "title": ["Revenue"], "description": ["Twelve weeks, in thousands"] },
      "children": [
        {
          "type": "Sparkline",
          "props": {
            "data": { "$data": "revenue" },
            "variant": "area",
            "color": "indigo-500",
            "label": "Revenue over the last twelve weeks",
            "width": "100%",
            "height": "100%"
          }
        }
      ]
    }
  ]
}`;

/** The three recordings the page replays, in the order the prompt picker offers them. */
export const DEMOS: readonly GeneratedDemo[] = [
  {
    id: 'sales',
    prompt: 'Show me how sales are going: the revenue trend, conversion, fulfilment, and the orders behind them.',
    spec: SALES_SPEC,
    data: SALES_DATA,
  },
  {
    id: 'support',
    prompt: 'Build me a support dashboard for this week — tickets opened, how many we resolve in a day, and the open queue.',
    spec: SUPPORT_SPEC,
    data: SUPPORT_DATA,
  },
  { id: 'trend', prompt: 'Just the revenue trend, as big as you can make it.', spec: TREND_SPEC, data: TREND_DATA },
];

/**
 * The same dashboard, asking for four things it may not have: a colour outside the palette, a component
 * nobody registered, an action on a component that declares no events, and a path into data that is not
 * there. Every one of them is refused and reported, and the rest of the tree still renders — which is
 * the only demonstration of a guardrail worth showing.
 */
export const REFUSED_SPEC = {
  type: 'DashboardGrid',
  props: {
    label: 'Sales',
    columns: 12,
    rowHeight: 22,
    defaultLayout: {
      version: 1,
      columns: 12,
      items: [
        { id: 'revenue', x: 0, y: 0, w: 8, h: 2 },
        { id: 'margin', x: 8, y: 0, w: 4, h: 2 },
      ],
    },
  },
  children: [
    {
      type: 'Widget',
      props: { id: 'revenue', name: 'Revenue', bgColor: '#ff00ff' },
      slots: { title: ['Revenue'] },
      children: [
        {
          type: 'Sparkline',
          props: { data: { $data: 'revenue' }, variant: 'area', color: 'indigo-500', width: '100%', height: '100%' },
          on: { onClick: 'export-everything' },
        },
        { type: 'Iframe', props: { props: { src: 'https://example.com/admin' } } },
      ],
    },
    {
      type: 'Widget',
      props: { id: 'margin', name: 'Margin' },
      slots: { title: ['Margin'] },
      children: [{ type: 'ProgressRing', props: { value: { $data: 'finance.margin' }, width: 80, height: 80 } }],
    },
  ],
};
