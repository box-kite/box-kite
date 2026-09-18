'use client';
import Box from '@box-kite/react';
import DataGrid, { type CellModel, type GridDefinition } from '@box-kite/react/components/dataGrid';
import Flex from '@box-kite/react/components/flex';
import { H2, P } from '@box-kite/react/components/semantics';
import { type Invoice, invoices } from './invoice-rows';

/**
 * An invoices table with what a real one needs: search, per-column filters, grouping from the column
 * menu, totals, an editable amount that is validated, a block of cells to copy, and CSV/XLSX export.
 *
 * None of it is configuration to keep in sync — the grid is one `def` object. Swap `invoices` for your
 * own rows and edit the columns.
 */
const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const STATUS_STYLES = {
  paid: { bgColor: 'emerald-100', color: 'emerald-700', theme: { dark: { bgColor: 'emerald-950', color: 'emerald-300' } } },
  pending: { bgColor: 'amber-100', color: 'amber-700', theme: { dark: { bgColor: 'amber-950', color: 'amber-300' } } },
  overdue: { bgColor: 'rose-100', color: 'rose-700', theme: { dark: { bgColor: 'rose-950', color: 'rose-300' } } },
} as const;

// A cell renderer is a component defined outside the render: a new identity on every render remounts
// the whole column on every scroll.
function StatusCell({ cell }: { cell: CellModel<Invoice> }) {
  const status = cell.value as Invoice['status'];

  return (
    <Flex ai="center" px={3} height="fit">
      <Box px={2} py={0.5} borderRadius={4} fontSize={12} fontWeight={500} textTransform="capitalize" {...STATUS_STYLES[status]}>
        {status}
      </Box>
    </Flex>
  );
}

// `fontVariantNumeric` has no prop of its own, so it goes through `css` — still one shared class, not
// a style attribute.
function AmountCell({ cell }: { cell: CellModel<Invoice> }) {
  return (
    <Flex ai="center" jc="end" px={3} height="fit" css={{ fontVariantNumeric: 'tabular-nums' }}>
      {money.format(cell.value as number)}
    </Flex>
  );
}

const definition: GridDefinition<Invoice> = {
  rowKey: 'id',
  title: 'Invoices',
  topBar: true,
  bottomBar: true,
  globalFilter: true,
  rowSelection: { pinned: true },
  rangeSelection: true,
  footer: { label: 'All invoices' },
  export: { fileName: 'invoices' },
  visibleRowsCount: 12,
  rowHeight: 44,
  columns: [
    { key: 'reference', header: 'Reference', width: 120, filterable: true },
    { key: 'customer', header: 'Customer', width: 170, filterable: true },
    { key: 'team', header: 'Team', width: 130, filterable: { type: 'multiselect' } },
    { key: 'status', header: 'Status', width: 120, filterable: { type: 'multiselect' }, Cell: StatusCell, aggregate: 'count' },
    {
      key: 'amount',
      header: 'Amount',
      width: 130,
      align: 'end',
      editable: true,
      filterable: { type: 'number' },
      aggregate: 'sum',
      Cell: AmountCell,
      AggregateCell: ({ cell }) => (
        <Flex ai="center" jc="end" px={3} height="fit" fontWeight={600} css={{ fontVariantNumeric: 'tabular-nums' }}>
          {cell.value === null ? '' : money.format(Number(cell.value))}
        </Flex>
      ),
      // An export runs no React, so the column says what it writes rather than exporting the renderer.
      exportValue: (row) => row.amount,
      exportFormat: '#,##0',
    },
    { key: 'issued', header: 'Issued', width: 120 },
  ],
  // One function both judges an edit and is told about it: a string is a refusal, and the message is
  // what the cell shows.
  onCellEdit: ({ value }) => {
    const amount = Number(value);

    if (!Number.isFinite(amount) || amount <= 0) return 'An invoice is worth more than nothing.';
    if (amount > 100_000) return 'Anything over $100,000 needs an approval.';
  },
};

export default function InvoicesGrid() {
  return (
    <Flex d="column" gap={4}>
      <Box>
        <H2 fontSize={20} fontWeight={600}>
          Invoices
        </H2>
        <P mt={1} fontSize={14} color="slate-600" theme={{ dark: { color: 'slate-400' } }}>
          Search the table, filter a column, group by Team from a column menu, edit an amount, select a block of cells and copy it, or
          export what is on screen.
        </P>
      </Box>
      <DataGrid data={invoices} def={definition} />
    </Flex>
  );
}
