import type { ChartContainerProps } from '../../components/chart';
import type { DashboardGridProps, DashboardSize, WidgetProps } from '../../components/dashboard';
import type {
  AggregateName,
  CellEditorType,
  ColumnType,
  DataGridProps,
  GridDefinition,
  PinPositionInput,
} from '../../components/dataGrid/contracts/dataGridContract';
import type { CatalogContract, CatalogSchema } from '../../core';
import { LAYOUT_SCHEMA } from '../dashboard/dashboardSchema';

/**
 * The props that are a *shape* rather than a value — a grid's columns, a dashboard's layout — as the JSON
 * Schema a generated spec is judged against. Written here rather than extracted because the manifest maps
 * types, and half of each of these shapes is React: a `Cell` renderer, an `onCellEdit`, a `ReactNode`. A
 * mapping has to drop such a prop whole, which is what left the catalog able to place a dashboard and not
 * to say what was in it — `<DataGrid>` arrived with no `def` at all, and `def` is required.
 *
 * Every key is typed against the interface it mirrors, so a prop renamed in the component is a compile
 * error here rather than a constraint that silently stops matching anything.
 */
namespace CatalogContracts {
  /** A subset of one interface's props: a key this file names and the component does not is an error. */
  type Properties<T> = Partial<Record<keyof T & string, CatalogSchema>>;

  /** A row is whatever the host's data holds — the one place a generated spec carries values, not styles. */
  type Row = Record<string, unknown>;

  const ALIGNMENTS: NonNullable<ColumnType<Row>['align']>[] = ['start', 'end', 'center', 'left', 'right'];
  const PINS: PinPositionInput[] = ['START', 'END', 'LEFT', 'RIGHT'];
  const AGGREGATES: AggregateName[] = ['sum', 'avg', 'min', 'max', 'count'];
  const EDITORS: CellEditorType[] = ['text', 'number', 'checkbox', 'select'];
  const SIZES: DashboardSize[] = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl'];

  /**
   * One column. Its `columns` — the header groups — is deliberately absent: a nested column is a recursive
   * schema, which the catalog has no `$defs` of its own to carry and a structured-output API is worst at.
   */
  const COLUMN: Properties<ColumnType<Row>> = {
    key: { type: 'string', description: 'The row field this column shows, and the name it is addressed by.' },
    header: { type: 'string', description: 'The heading. Without one the key is shown.' },
    width: { type: 'number', description: 'Its starting width in pixels.' },
    align: { type: 'string', enum: ALIGNMENTS, description: '`start` and `end` follow the reading order; `left` and `right` do not.' },
    pin: { type: 'string', enum: PINS, description: 'Hold it at one end while the rest of the grid scrolls sideways.' },
    aggregate: { type: 'string', enum: AGGREGATES, description: 'Total this column over each group row, and over the footer.' },
    sortable: { type: 'boolean', description: 'Whether this column can be sorted. Without it the grid decides.' },
    resizable: { type: 'boolean', description: 'Whether this column can be resized. Without it the grid decides.' },
    flexible: { type: 'boolean', description: 'Whether it shares the space left over. `false` keeps it at its width.' },
    filterable: { type: 'boolean', description: 'Give this column a filter of its own.' },
    editable: { type: 'boolean', description: 'Whether its cells can be edited.' },
    editor: { type: 'string', enum: EDITORS, description: 'Which editor a cell opens. Without one it is read off the value.' },
    exportFormat: { type: 'string', description: "The number format a spreadsheet writes it with — `'#,##0.00'`." },
  };

  const DEFINITION: Properties<GridDefinition<Row>> = {
    columns: {
      type: 'array',
      description: 'The columns, left to right.',
      items: { type: 'object', properties: COLUMN, required: ['key'], additionalProperties: false },
    },
    rowKey: { type: 'string', description: 'The field that identifies a row.' },
    title: { type: 'string', description: "The top bar's title." },
    showRowNumber: { type: 'boolean', description: 'A row number down the left.' },
    rowSelection: { type: 'boolean', description: 'A checkbox per row, and one in the header.' },
    rowHeight: { type: 'number', description: 'The height of one row, in pixels.' },
    visibleRowsCount: {
      anyOf: [{ type: 'number' }, { type: 'string', enum: ['all'] }],
      description: 'How many rows are on screen at once. `all` renders every one and virtualizes nothing.',
    },
    topBar: { type: 'boolean', description: 'The bar above the rows, which holds the title and the search.' },
    bottomBar: { type: 'boolean', description: 'The bar below the rows, which holds the pager.' },
    globalFilter: { type: 'boolean', description: 'A search box over every column.' },
    globalFilterKeys: { type: 'array', items: { type: 'string' }, description: 'Search only these columns.' },
    sortable: { type: 'boolean', description: 'Whether every column can be sorted. A column may say otherwise.' },
    resizable: { type: 'boolean', description: 'Whether every column can be resized. A column may say otherwise.' },
    editable: { type: 'boolean', description: 'Whether every column can be edited. A column may say otherwise.' },
    rangeSelection: { type: 'boolean', description: 'Drag or Shift+arrow across cells to mark a block, and Ctrl+C to copy it.' },
    footer: { type: 'boolean', description: 'A row of grand totals under the rows, over every column carrying an `aggregate`.' },
    export: { type: 'boolean', description: 'CSV and Excel buttons in the top bar.' },
    groupBy: { type: 'array', items: { type: 'string' }, description: 'The columns to group by, outermost first.' },
    groupDefaultExpanded: {
      anyOf: [{ type: 'boolean' }, { type: 'integer' }],
      description: 'Which group rows start open: `true` is all of them, a number is how many levels down.',
    },
  };

  const COLUMN_COUNT: CatalogSchema = { type: 'integer', description: 'How many columns that width is written in.' };

  /**
   * Component name → the props of it a manifest entry cannot describe. Merged over the generated entry, so
   * a prop that appears in both is this one: the curated shape is the narrower of the two by construction.
   */
  export const CONTRACTS: Record<string, CatalogContract> = {
    DataGrid: {
      props: {
        // Rows are the host's data, so the schema says "objects" and stops. It is the one prop in the
        // catalog carrying values rather than styling, and `{ $data: 'orders' }` is the usual answer.
        data: { type: 'array', items: { type: 'object' }, description: 'The rows.' },
        def: {
          type: 'object',
          description: 'Everything about the grid that is not the rows: the columns, the bars, the title.',
          properties: DEFINITION,
          required: ['columns'],
          additionalProperties: false,
        },
      } satisfies Properties<DataGridProps<Row>>,
      // A dropped prop takes its entry in `required` with it, so a catalog without this one said a
      // `<DataGrid>` with no columns at all was a valid grid.
      required: ['def'],
    },
    DashboardGrid: {
      props: {
        // A spec re-renders with every piece of itself, so a generated dashboard has to write the
        // controlled prop: an uncontrolled default is read once, and the frame it first arrived whole
        // in is the one that sticks (bug #187).
        layout: {
          ...LAYOUT_SCHEMA,
          description: 'Where each widget goes. A generated dashboard sets this one — it is read on every render.',
        },
        defaultLayout: {
          ...LAYOUT_SCHEMA,
          description:
            'The layout it starts with, for a dashboard the user then rearranges. Read once, at the first render, so a spec that arrives in pieces should set `layout` instead.',
        },
        columns: {
          anyOf: [
            { type: 'integer' },
            { type: 'object', properties: Object.fromEntries(SIZES.map((size) => [size, COLUMN_COUNT])), additionalProperties: false },
          ],
          description: 'How many columns, at one width or at several: `12`, or `{ xs: 1, md: 6, xxl: 12 }`.',
        },
      } satisfies Properties<DashboardGridProps>,
    },
    Widget: {
      props: {
        empty: {
          anyOf: [{ type: 'boolean' }, { type: 'string' }],
          description: 'There is nothing to show: `true` for the default line, or the words to use instead.',
        },
      } satisfies Properties<WidgetProps>,
    },
    ChartContainer: {
      props: {
        series: {
          anyOf: [{ type: 'array', items: { type: 'string' } }, { type: 'object' }],
          description: 'The series drawn inside, and what colour each of them is.',
        },
      } satisfies Properties<ChartContainerProps>,
    },
  };
}

export default CatalogContracts;
