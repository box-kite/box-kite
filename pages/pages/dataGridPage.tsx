import { Filter, Table, X } from 'lucide-react';
import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import dataGridApi from '../../api/components/datagrid.json';
import Box from '../../src/box';
import Button from '../../src/components/button';
import DataGrid from '../../src/components/dataGrid';
import Flex from '../../src/components/flex';
import { H2 } from '../../src/components/semantics';
import ApiReference from '../components/apiReference';
import Code from '../components/code';
import Mono from '../components/mono';
import PageHeader from '../components/pageHeader';
import Reveal from '../components/reveal';
import Data from '../data/MOCK_DATA.json';
import useTableOfContents from '../hooks/useTableOfContents';
import { apiSections } from '../site/componentApi';

// One file, not eight. Nothing on this page is about the row count — every demo here shows five to
// eight rows of a scrolling, filtering, grouping grid — and the eight files were 3.9 MB of JSON in the
// route's chunk, 947 KB of the 970 KB it downloaded. A thousand real rows demonstrate all of it, and
// the ten-thousand-row proof lives on /charts, which generates its rows.
const allData = Data;

const allCountryOptions = [...new Set(allData.map((r) => r.country))].sort().map((c) => ({ label: c, value: c }));

const ordersData = [
  {
    orderId: 1001,
    customer: 'Alice Johnson',
    date: '2026-03-01',
    status: 'Shipped',
    total: 259.97,
    items: [
      { product: 'Wireless Mouse', sku: 'WM-001', qty: 2, price: 29.99 },
      { product: 'Mechanical Keyboard', sku: 'MK-042', qty: 1, price: 149.99 },
      { product: 'USB-C Hub', sku: 'UC-015', qty: 1, price: 49.99 },
    ],
  },
  {
    orderId: 1002,
    customer: 'Bob Smith',
    date: '2026-03-03',
    status: 'Processing',
    total: 89.98,
    items: [
      { product: 'Webcam HD', sku: 'WC-007', qty: 1, price: 59.99 },
      { product: 'Mouse Pad XL', sku: 'MP-003', qty: 1, price: 29.99 },
    ],
  },
  {
    orderId: 1003,
    customer: 'Charlie Brown',
    date: '2026-03-05',
    status: 'Pending',
    total: 599.99,
    items: [{ product: '27" Monitor', sku: 'MN-027', qty: 1, price: 599.99 }],
  },
  {
    orderId: 1004,
    customer: 'Diana Prince',
    date: '2026-03-06',
    status: 'Shipped',
    total: 174.97,
    items: [
      { product: 'Desk Lamp LED', sku: 'DL-011', qty: 1, price: 44.99 },
      { product: 'Cable Management Kit', sku: 'CM-022', qty: 2, price: 19.99 },
      { product: 'Monitor Stand', sku: 'MS-008', qty: 1, price: 89.99 },
    ],
  },
  {
    orderId: 1005,
    customer: 'Eve Davis',
    date: '2026-03-07',
    status: 'Processing',
    total: 329.98,
    items: [
      { product: 'Noise Cancelling Headphones', sku: 'NC-033', qty: 1, price: 249.99 },
      { product: 'Headphone Stand', sku: 'HS-005', qty: 1, price: 39.99 },
      { product: 'Audio Cable 3.5mm', sku: 'AC-012', qty: 2, price: 19.99 },
    ],
  },
  {
    orderId: 1006,
    customer: 'Frank Miller',
    date: '2026-03-08',
    status: 'Shipped',
    total: 1249.98,
    items: [
      { product: 'Ergonomic Chair', sku: 'EC-001', qty: 1, price: 899.99 },
      { product: 'Standing Desk Mat', sku: 'SD-014', qty: 1, price: 49.99 },
      { product: 'Wrist Rest', sku: 'WR-009', qty: 2, price: 24.99 },
      { product: 'Footrest', sku: 'FR-006', qty: 1, price: 249.99 },
    ],
  },
  {
    orderId: 1007,
    customer: 'Grace Lee',
    date: '2026-03-09',
    status: 'Pending',
    total: 79.98,
    items: [
      { product: 'Webcam Cover', sku: 'WV-002', qty: 3, price: 9.99 },
      { product: 'Screen Cleaner Kit', sku: 'SC-018', qty: 1, price: 19.99 },
      { product: 'Keyboard Cover', sku: 'KC-025', qty: 1, price: 29.99 },
    ],
  },
];

// Filter chip component
function FilterChip({ label, active, onClick, onClear }: { label: string; active: boolean; onClick: () => void; onClear?: () => void }) {
  return (
    <Button
      ai="center"
      gap={1}
      px={3}
      py={1}
      borderRadius={16}
      fontSize={13}
      fontWeight={500}
      cursor="pointer"
      b={1}
      bgColor={active ? 'blue-50' : 'transparent'}
      borderColor={active ? 'blue-300' : 'gray-300'}
      color={active ? 'blue-700' : 'gray-600'}
      hover={{
        bgColor: active ? 'blue-100' : 'gray-50',
        borderColor: active ? 'blue-400' : 'gray-400',
      }}
      theme={{
        dark: {
          bgColor: active ? 'blue-900' : 'transparent',
          borderColor: active ? 'blue-600' : 'gray-600',
          color: active ? 'blue-300' : 'gray-400',
          hover: {
            bgColor: active ? 'blue-800' : 'gray-800',
          },
        },
      }}
      onClick={onClick}
    >
      {label}
      {active && onClear && (
        <Box
          ml={1}
          p={0.5}
          borderRadius={10}
          hover={{ bgColor: 'blue-200' }}
          theme={{ dark: { hover: { bgColor: 'blue-700' } } }}
          props={{
            onClick: (e) => {
              e.stopPropagation();
              onClear();
            },
          }}
        >
          <X size={12} />
        </Box>
      )}
    </Button>
  );
}

// Custom TopBar Filter component
function CustomTopBarFilter({
  genderFilter,
  setGenderFilter,
  ageFilter,
  setAgeFilter,
}: {
  genderFilter: string | null;
  setGenderFilter: (v: string | null) => void;
  ageFilter: string | null;
  setAgeFilter: (v: string | null) => void;
}) {
  const hasFilters = genderFilter || ageFilter;

  return (
    <Flex gap={2} flexWrap="wrap" width="fit">
      <Flex ai="center" gap={1} color="gray-500" theme={{ dark: { color: 'gray-400' } }}>
        <Filter size={14} />
        <Box fontSize={13}>Quick filters:</Box>
      </Flex>

      {/* Gender filters */}
      <FilterChip
        label="Male"
        active={genderFilter === 'Male'}
        onClick={() => setGenderFilter(genderFilter === 'Male' ? null : 'Male')}
        onClear={() => setGenderFilter(null)}
      />
      <FilterChip
        label="Female"
        active={genderFilter === 'Female'}
        onClick={() => setGenderFilter(genderFilter === 'Female' ? null : 'Female')}
        onClear={() => setGenderFilter(null)}
      />

      <Box width={1} height={4} bgColor="gray-300" theme={{ dark: { bgColor: 'gray-600' } }} />

      {/* Age filters */}
      <FilterChip
        label="Under 30"
        active={ageFilter === 'under30'}
        onClick={() => setAgeFilter(ageFilter === 'under30' ? null : 'under30')}
        onClear={() => setAgeFilter(null)}
      />
      <FilterChip
        label="30-50"
        active={ageFilter === '30to50'}
        onClick={() => setAgeFilter(ageFilter === '30to50' ? null : '30to50')}
        onClear={() => setAgeFilter(null)}
      />
      <FilterChip
        label="Over 200"
        active={ageFilter === 'over200'}
        onClick={() => setAgeFilter(ageFilter === 'over200' ? null : 'over200')}
        onClear={() => setAgeFilter(null)}
      />

      {/* Clear all */}
      {hasFilters && (
        <Button
          px={2}
          py={1}
          fontSize={12}
          bgColor="transparent"
          color="red-500"
          hover={{ bgColor: 'red-50' }}
          theme={{ dark: { hover: { bgColor: 'red-900' } } }}
          onClick={() => {
            setGenderFilter(null);
            setAgeFilter(null);
          }}
        >
          Clear all
        </Button>
      )}
    </Flex>
  );
}

export default function DataGridPage() {
  useTableOfContents(sidebarLinks);

  // Custom filter state for the first DataGrid
  const [genderFilter, setGenderFilter] = useState<string | null>(null);
  const [ageFilter, setAgeFilter] = useState<string | null>(null);

  // External predicate filters — DataGrid applies these internally and shows correct "filtered / total" in bottom bar
  const filters = useMemo(() => {
    const result: ((row: (typeof allData)[0]) => boolean)[] = [];
    if (genderFilter) result.push((row) => row.gender === genderFilter);
    if (ageFilter === 'under30') result.push((row) => row.age < 30);
    if (ageFilter === '30to50') result.push((row) => row.age >= 30 && row.age <= 50);
    if (ageFilter === 'over200') result.push((row) => row.age > 200);
    return result;
  }, [genderFilter, ageFilter]);

  return (
    <Box>
      <PageHeader
        icon={Table}
        title="DataGrid"
        description="A powerful data grid component with sorting, filtering, and custom cells. (Work in Progress)"
      />

      <Reveal delay={0.1}>
        <Flex d="column" gap={8}>
          <Code label="Import" language="jsx" code="import DataGrid from '@box-kite/react/components/dataGrid';" />

          <Section id="a11y" title="Keyboard and roles">
            <Box>
              This is the APG grid pattern, over a virtualized body — the case most grids skip. The scrolling element is a{' '}
              <Mono>role="grid"</Mono> of <Mono>rowgroup</Mono>s, rows and <Mono>gridcell</Mono>s, and it tells assistive technology the
              size of the whole grid rather than the size of the window it renders: <Mono>aria-rowcount</Mono> counts every row,{' '}
              <Mono>aria-rowindex</Mono> numbers each one where it really is, and a jump to a row nobody has scrolled to brings it into view
              first. You write none of that.
            </Box>
            <Flex d="column" gap={3} mt={4}>
              <Note icon={Table} title="Focus lives on the cells">
                One cell is in the tab order at a time, so Tab enters the grid in a single press instead of walking through thousands of
                them. The arrow keys move that cell; a sortable header sorts on Enter; a cell that holds a control hands the keyboard over
                on Enter or F2 and takes it back on Escape.
              </Note>
              <Note icon={Table} title="Give it a title">
                A grid is not named by the rows in it. Pass <Mono>def.title</Mono> and the grid points <Mono>aria-labelledby</Mono> at it.
              </Note>
              <Note icon={Filter} title="Everything the grid draws for itself has a name">
                The column chooser, the select-all box, each row’s checkbox and expander, each column’s menu and each filter input are named
                after what they act on — “Select row 4”, “Filter Country”, “Column options for Age” — rather than after the icon drawn on
                them.
              </Note>
              <Note icon={Table} title="A column can be resized without a mouse">
                Each resizer is a <Mono>role="separator"</Mono> — APG’s window splitter — with the column’s width in pixels on{' '}
                <Mono>aria-valuenow</Mono>, so a screen reader reads the new width out as it changes.
              </Note>
            </Flex>
          </Section>

          <Code
            id="full-featured"
            label="Full Featured DataGrid"
            language="jsx"
            check={false}
            code={`const filters = useMemo(() => {
  const result = [];
  if (genderFilter) result.push((row) => row.gender === genderFilter);
  if (ageFilter === 'under30') result.push((row) => row.age < 30);
  return result;
}, [genderFilter, ageFilter]);

<DataGrid
  data={allData}
  filters={filters}
  def={{
    title: 'All Features Demo',
    topBar: true,
    bottomBar: true,
    globalFilter: true,
    topBarContent: <CustomTopBarFilter ... />,
    rowSelection: { pinned: true },
    showRowNumber: { pinned: true },
    rowHeight: 40,
    visibleRowsCount: 8,
    columns: [...],
  }}
/>`}
          >
            <DataGrid
              data={allData}
              filters={filters}
              def={{
                title: 'All Features Demo',
                topBar: true,
                bottomBar: true,
                globalFilter: true,
                topBarContent: (
                  <CustomTopBarFilter
                    genderFilter={genderFilter}
                    setGenderFilter={setGenderFilter}
                    ageFilter={ageFilter}
                    setAgeFilter={setAgeFilter}
                  />
                ),
                rowSelection: { pinned: true },
                showRowNumber: { pinned: true },
                rowHeight: 40,
                visibleRowsCount: 8,
                sortable: true,
                resizable: true,
                noDataComponent: (
                  <Flex d="column" ai="center" gap={3} p={8} color="gray-500" theme={{ dark: { color: 'gray-400' } }}>
                    <Filter size={32} />
                    <Box>No records match your filters</Box>
                    <Button
                      px={3}
                      py={1}
                      fontSize={13}
                      bgColor="blue-500"
                      color="white"
                      borderRadius={6}
                      hover={{ bgColor: 'blue-600' }}
                      onClick={() => {
                        setGenderFilter(null);
                        setAgeFilter(null);
                      }}
                    >
                      Clear filters
                    </Button>
                  </Flex>
                ),
                columns: [
                  {
                    key: 'personal',
                    header: 'Personal Info',
                    columns: [
                      { key: 'first_name', header: 'First Name', filterable: true },
                      { key: 'last_name', header: 'Last Name', filterable: true },
                      { key: 'age', header: 'Age', width: 120, align: 'right', filterable: { type: 'number' } },
                    ],
                  },
                  {
                    key: 'contact',
                    header: 'Contact',
                    columns: [
                      { key: 'email', header: 'Email', width: 280, filterable: true },
                      { key: 'phone_number', header: 'Phone', width: 160 },
                    ],
                  },
                  { key: 'country', header: 'Country', filterable: { type: 'multiselect' } },
                  { key: 'gender', header: 'Gender', width: 120, filterable: { type: 'multiselect' } },
                  { key: 'city', header: 'City', pin: 'END' },
                ],
              }}
            />
          </Code>

          <Code
            id="basic"
            defer
            label="Basic DataGrid"
            language="jsx"
            context="declare const data: { first_name: string; last_name: string; age: number; email: string }[];"
            code={`<DataGrid
  data={data}
  def={{
    columns: [
      { key: 'first_name', header: 'First name' },
      { key: 'last_name', header: 'Last name' },
      {
        key: 'age',
        header: 'Age',
        width: 90,
        align: 'right',
        Cell: ({ cell }) => {
          // better to define this function outside to avoid re-creation on each render
          return (
            <Flex
              bgColor="violet-50"
              height="fit"
              width="fit"
              ai="center"
              jc="center"
              overflow="hidden"
              className="parent"
              theme={{ dark: { bgColor: 'violet-600' } }}
            >
              <Box
                px={4}
                textOverflow="ellipsis"
                overflow="hidden"
                textWrap="nowrap"
                color="violet-700"
                fontWeight={600}
                hoverGroup={{ parent: { rotate: 180 } }}
                theme={{ dark: { color: 'violet-300' } }}
              >
                {cell.row.data.age}
              </Box>
            </Flex>
          );
        },
      },
      { key: 'email', header: 'Email', width: 300 },
      { key: 'street_address' },
      { key: 'city' },
      { key: 'country' },
      { key: 'favorite_color' },
      { key: 'gender' },
      { key: 'ssn' },
      { key: 'birthdate' },
      { key: 'phone_number' },
      { key: 'username' },
      { key: 'credit_card_number' },
      { key: 'salary' },
      { key: 'company_name' },
      { key: 'language' },
      { key: 'currency_code' },
    ],
    rowHeight: 40,
    visibleRowsCount: 5,
  }}
/>`}
          >
            <DataGrid
              data={allData}
              def={{
                columns: [
                  { key: 'first_name', header: 'First name' },
                  { key: 'last_name', header: 'Last name' },
                  {
                    key: 'age',
                    header: 'Age',
                    width: 90,
                    align: 'right',
                    Cell: ({ cell }) => {
                      // You can define this function outside the component to avoid re-creation on each render
                      return (
                        <Flex
                          bgColor="violet-50"
                          height="fit"
                          width="fit"
                          ai="center"
                          jc="center"
                          overflow="hidden"
                          className="parent"
                          theme={{ dark: { bgColor: 'violet-600' } }}
                        >
                          <Box
                            px={4}
                            textOverflow="ellipsis"
                            overflow="hidden"
                            textWrap="nowrap"
                            color="violet-700"
                            fontWeight={600}
                            hoverGroup={{ parent: { rotate: 180 } }}
                            theme={{ dark: { color: 'violet-300' } }}
                          >
                            {cell.row.data.age}
                          </Box>
                        </Flex>
                      );
                    },
                  },
                  { key: 'email', header: 'Email', width: 300 },
                  { key: 'street_address' },
                  { key: 'city' },
                  { key: 'country' },
                  { key: 'favorite_color' },
                  { key: 'gender' },
                  { key: 'ssn' },
                  { key: 'birthdate' },
                  { key: 'phone_number' },
                  { key: 'username' },
                  { key: 'credit_card_number' },
                  { key: 'salary' },
                  { key: 'company_name' },
                  { key: 'language' },
                  { key: 'currency_code' },
                ],
                rowHeight: 40,
                visibleRowsCount: 5,
              }}
            />
          </Code>

          <Code
            id="filters"
            defer
            label="DataGrid with Global Filter and Column Filters"
            language="jsx"
            code={`<DataGrid
  data={data}
  def={{
    columns: [
      { key: 'first_name', header: 'First name', filterable: true },
      { key: 'last_name', header: 'Last name', filterable: true },
      { key: 'age', header: 'Age', width: 120, align: 'right', filterable: { type: 'number' } },
      { key: 'email', header: 'Email', width: 300, filterable: true },
      { key: 'country', filterable: { type: 'multiselect' } },
      { key: 'gender', filterable: { type: 'multiselect' } },
    ],
    rowHeight: 40,
    visibleRowsCount: 8,
    topBar: true,
    bottomBar: true,
    globalFilter: true,
  }}
/>`}
          >
            <DataGrid
              data={allData}
              def={{
                columns: [
                  { key: 'first_name', header: 'First name', filterable: true },
                  { key: 'last_name', header: 'Last name', filterable: true },
                  { key: 'age', header: 'Age', width: 140, align: 'right', filterable: { type: 'number' } },
                  { key: 'email', header: 'Email', width: 300, filterable: true },
                  { key: 'country', filterable: { type: 'multiselect' } },
                  { key: 'gender', filterable: { type: 'multiselect' } },
                ],
                rowHeight: 40,
                visibleRowsCount: 8,
                topBar: true,
                bottomBar: true,
                globalFilter: true,
              }}
            />
          </Code>

          <Code
            id="grouped"
            defer
            label="Grouped Columns with Row Selection"
            language="jsx"
            code={`<DataGrid
  data={data}
  def={{
    columns: [
      {
        key: 'person',
        header: 'Person',
        columns: [
          { key: 'first_name', header: 'First name' },
          { key: 'last_name', header: 'Last name' },
        ],
      },
      {
        key: 'contact',
        header: 'Contact',
        columns: [
          { key: 'email', header: 'Email', width: 300 },
          { key: 'phone_number', header: 'Phone' },
        ],
      },
      { key: 'country' },
      { key: 'city' },
    ],
    rowSelection: { pinned: true },
    showRowNumber: { pinned: true },
  }}
/>`}
          >
            <DataGrid
              data={allData}
              def={{
                topBar: true,
                title: 'Users Table',
                columns: [
                  {
                    key: 'person',
                    header: 'Person',
                    columns: [
                      { key: 'first_name', header: 'First name' },
                      { key: 'last_name', header: 'Last name' },
                    ],
                  },
                  {
                    key: 'person2',
                    header: 'Person 2',
                    columns: [
                      { key: 'age', header: 'Age', width: 120 },
                      { key: 'email', header: 'Email', width: 300 },
                    ],
                  },
                  {
                    key: 'test',
                    header: 'Test',
                    columns: [
                      { key: 'test_single', columns: [{ key: 'job_title' }] },
                      { key: 'test_double', header: 'Test double', columns: [{ key: 'street_address' }, { key: 'city' }] },
                    ],
                  },
                  { key: 'country' },
                  { key: 'favorite_color' },
                  { key: 'gender' },
                  { key: 'ssn' },
                  { key: 'birthdate' },
                  { key: 'phone_number' },
                  { key: 'username' },
                  { key: 'credit_card_number' },
                  { key: 'salary' },
                  { key: 'company_name' },
                  { key: 'language' },
                  { key: 'currency_code' },
                ],
                rowSelection: { pinned: true },
                showRowNumber: { pinned: true },
              }}
            />
          </Code>

          <Code
            id="row-detail"
            defer
            label="Row Detail — Orders with Items"
            language="jsx"
            check={false}
            code={`// Define custom component style trees that extend 'datagrid' — 'orders-datagrid' for the outer
// grid and 'subgrid' for the one inside the detail row. Both names need the same .d.ts
// augmentation every Box.components() entry does; the Theme Setup page shows it.
// isExpanded/isExpandedFirstLeaf/isExpandedLastLeaf variants let you style
// the expanded row's cells individually (e.g. top + side borders).
// detailRow.content gets left/right borders without causing scroll overflow.
Box.components({
  subgrid: { extends: 'datagrid', styles: { b: 0, borderRadius: 0, shadow: 'none' } },
  'orders-datagrid': {
    extends: 'datagrid',
    children: {
      body: {
        children: {
          cell: {
            variants: {
              isExpanded: { bt: 3, bb: 0, bgColor: 'indigo-50', borderColor: 'indigo-300' },
              isExpandedFirstLeaf: { bl: 3 },
              isExpandedLastLeaf:  { br: 3 },
            },
          },
          detailRow: {
            styles: { bb: 3, bt: 0, bgColor: 'indigo-50', borderColor: 'indigo-300' },
            children: {
              content: { styles: { bl: 3, br: 3, borderColor: 'indigo-300' } },
            },
          },
        },
      },
    },
  },
});

<DataGrid
  component="orders-datagrid"
  data={orders}
  def={{
    rowKey: 'orderId',
    topBar: true,
    bottomBar: true,
    title: 'Orders',
    columns: [
      { key: 'orderId', header: 'Order #', width: 100, flexible: false },
      { key: 'customer', header: 'Customer' },
      { key: 'date', header: 'Date', width: 120 },
      { key: 'status', header: 'Status', width: 120 },
      { key: 'total', header: 'Total', width: 100, align: 'right' },
    ],
    rowDetail: {
      content: (order) => (
        <DataGrid
          component="subgrid"
          data={order.items}
          def={{
            columns: [
              { key: 'product', header: 'Product' },
              { key: 'qty', header: 'Qty', width: 80, align: 'right' },
              { key: 'price', header: 'Price', width: 100, align: 'right' },
            ],
            visibleRowsCount: 'all',
            rowHeight: 36,
          }}
        />
      ),
      pinned: true,
      expandOnRowClick: true,
    },
  }}
/>`}
          >
            <DataGrid
              component="orders-datagrid"
              data={ordersData}
              def={{
                rowKey: 'orderId',
                topBar: true,
                bottomBar: true,
                title: 'Orders',
                rowHeight: 40,
                visibleRowsCount: 8,
                columns: [
                  { key: 'orderId', header: 'Order #', width: 100, flexible: false },
                  { key: 'customer', header: 'Customer' },
                  { key: 'date', header: 'Date', width: 120 },
                  {
                    key: 'status',
                    header: 'Status',
                    width: 120,
                    Cell: ({ cell }) => {
                      const status = cell.row.data.status;
                      return (
                        <Box
                          px={2}
                          py={0.5}
                          borderRadius={4}
                          fontSize={12}
                          fontWeight={600}
                          bgColor={status === 'Shipped' ? 'green-100' : status === 'Processing' ? 'blue-100' : 'yellow-100'}
                          color={status === 'Shipped' ? 'green-700' : status === 'Processing' ? 'blue-700' : 'yellow-700'}
                          theme={{
                            dark: {
                              bgColor: status === 'Shipped' ? 'green-900' : status === 'Processing' ? 'blue-900' : 'yellow-900',
                              color: status === 'Shipped' ? 'green-300' : status === 'Processing' ? 'blue-300' : 'yellow-300',
                            },
                          }}
                        >
                          {status}
                        </Box>
                      );
                    },
                  },
                  {
                    key: 'total',
                    header: 'Total',
                    width: 100,
                    align: 'right',
                    Cell: ({ cell }) => (
                      <Box fontWeight={600} px={2}>
                        ${cell.row.data.total}
                      </Box>
                    ),
                  },
                ],
                contextMenu: { pin: false },
                rowDetail: {
                  // expandColumnHeader: 'Details',
                  content: (order: (typeof ordersData)[0]) => (
                    <Box p={4}>
                      <Box fontSize={13} fontWeight={600} mb={2} color="gray-600" theme={{ dark: { color: 'gray-400' } }}>
                        Items for Order #{order.orderId}
                      </Box>
                      <DataGrid
                        component="subgrid"
                        data={order.items}
                        def={{
                          columns: [
                            { key: 'product', header: 'Product' },
                            { key: 'sku', header: 'SKU', width: 120 },
                            { key: 'qty', header: 'Qty', width: 80, align: 'right' },
                            {
                              key: 'price',
                              header: 'Price',
                              width: 100,
                              align: 'right',
                              Cell: ({ cell }) => <Box px={2}>${cell.row.data.price}</Box>,
                            },
                          ],
                          visibleRowsCount: 'all',
                          rowHeight: 36,
                        }}
                      />
                    </Box>
                  ),
                  pinned: true,
                  expandOnRowClick: true,
                  expandColumnWidth: 50,
                },
              }}
            />
          </Code>

          <PaginatedDataGridDemo />

          <Code
            id="disable-sort"
            defer
            label="Disable Sorting and Resizing"
            language="jsx"
            code={`<DataGrid
  data={data}
  def={{
    columns: [
      { key: 'first_name', header: 'First name' },
      { key: 'last_name', header: 'Last name' },
      { key: 'age', header: 'Age', width: 100, sortable: true }, // Override: sortable
      { key: 'email', header: 'Email', width: 300, resizable: true }, // Override: resizable
      { key: 'country' },
      { key: 'city' },
    ],
    rowHeight: 40,
    visibleRowsCount: 5,
    sortable: false,   // Disable sorting globally
    resizable: false,  // Disable resizing globally
  }}
/>`}
          >
            <DataGrid
              data={allData}
              def={{
                columns: [
                  { key: 'first_name', header: 'First name' },
                  { key: 'last_name', header: 'Last name' },
                  { key: 'age', header: 'Age', width: 100, sortable: true },
                  { key: 'email', header: 'Email', width: 300, resizable: true },
                  { key: 'country' },
                  { key: 'city' },
                ],
                rowHeight: 40,
                visibleRowsCount: 5,
                sortable: false,
                resizable: false,
              }}
            />
          </Code>

          <Code
            id="context-menu"
            defer
            label="Context Menu Control"
            language="jsx"
            code={`<DataGrid
  data={data}
  def={{
    columns: [
      { key: 'first_name', header: 'First name' },
      { key: 'last_name', header: 'Last name' },
      { key: 'age', header: 'Age', width: 100, contextMenu: false }, // No context menu
      { key: 'email', header: 'Email', width: 300, contextMenu: { sort: true, pin: false, group: false } },
      { key: 'country' },
      { key: 'city' },
    ],
    rowHeight: 40,
    visibleRowsCount: 5,
    contextMenu: { sort: true, pin: true, group: false }, // Disable grouping globally
  }}
/>`}
          >
            <DataGrid
              data={allData}
              def={{
                columns: [
                  { key: 'first_name', header: 'First name' },
                  { key: 'last_name', header: 'Last name' },
                  { key: 'age', header: 'Age', width: 100, contextMenu: false },
                  { key: 'email', header: 'Email', width: 300, contextMenu: { sort: true, pin: false, group: false } },
                  { key: 'country' },
                  { key: 'city' },
                ],
                rowHeight: 40,
                visibleRowsCount: 5,
                contextMenu: { sort: true, pin: true, group: false },
              }}
            />
          </Code>

          <Code
            id="resizer-style"
            defer
            label="Resizer Style"
            language="jsx"
            code={`// 'hover' — resizer appears only when hovering the header cell
<DataGrid
  data={data}
  def={{
    columns: [
      { key: 'first_name', header: 'First name' },
      { key: 'last_name', header: 'Last name' },
      { key: 'age', header: 'Age', width: 100 },
      { key: 'email', header: 'Email', width: 300 },
      { key: 'country' },
      { key: 'city' },
    ],
    rowHeight: 40,
    visibleRowsCount: 5,
    resizerStyle: 'hover', // 'visible' | 'hover' | 'hidden'
  }}
/>`}
          >
            <DataGrid
              data={allData}
              def={{
                columns: [
                  { key: 'first_name', header: 'First name' },
                  { key: 'last_name', header: 'Last name' },
                  { key: 'age', header: 'Age', width: 100 },
                  { key: 'email', header: 'Email', width: 300 },
                  { key: 'country' },
                  { key: 'city' },
                ],
                rowHeight: 40,
                visibleRowsCount: 5,
                resizerStyle: 'hover',
              }}
            />
          </Code>

          <Code
            id="resize-mode"
            defer
            label="Resize Mode"
            language="jsx"
            code={`// 'smooth' (default): width updates batched to one per animation frame (~60fps, ~1 frame
// behind the cursor). 'instant': width updates synchronously on every pointer move, so the
// column tracks the cursor with no added latency. Drag a column edge and toggle to compare.
<DataGrid
  data={data}
  def={{
    columns: [
      { key: 'first_name', header: 'First name' },
      { key: 'last_name', header: 'Last name' },
      { key: 'age', header: 'Age', width: 100 },
      { key: 'email', header: 'Email', width: 300 },
      { key: 'country' },
      { key: 'city' },
    ],
    rowHeight: 40,
    visibleRowsCount: 5,
    resizeMode: 'smooth', // or 'instant'
  }}
/>`}
          >
            <ResizeModeDemo />
          </Code>
          <ApiReference api={dataGridApi} />
        </Flex>
      </Reveal>
    </Box>
  );
}

function ResizeModeDemo() {
  const [resizeMode, setResizeMode] = useState<'smooth' | 'instant'>('smooth');

  return (
    <Flex d="column" gap={4}>
      <Flex gap={2} ai="center">
        <Box fontSize={13} fontWeight={500} color="gray-600" theme={{ dark: { color: 'gray-400' } }}>
          Resize mode:
        </Box>
        <FilterChip label="Smooth (rAF)" active={resizeMode === 'smooth'} onClick={() => setResizeMode('smooth')} />
        <FilterChip label="Instant" active={resizeMode === 'instant'} onClick={() => setResizeMode('instant')} />
      </Flex>

      <DataGrid
        data={allData}
        def={{
          columns: [
            { key: 'first_name', header: 'First name' },
            { key: 'last_name', header: 'Last name' },
            { key: 'age', header: 'Age', width: 100 },
            { key: 'email', header: 'Email', width: 300 },
            { key: 'country' },
            { key: 'city' },
          ],
          rowHeight: 40,
          visibleRowsCount: 5,
          resizeMode,
        }}
      />
    </Flex>
  );
}

type ServerStateArg = {
  page: number;
  pageSize: number;
  sortColumn?: string | number;
  sortDirection?: string;
  globalFilterValue?: string;
  columnFilters?: Partial<
    Record<string, { type: string; value?: string | number; values?: (string | number | boolean | null)[]; operator?: string }>
  >;
};

function PaginatedDataGridDemo() {
  const pageSize = 8;
  const [data, setData] = useState<(typeof allData)[0][]>([]);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback((state: ServerStateArg) => {
    setLoading(true);
    // Simulate server-side filtering, sorting and pagination
    setTimeout(() => {
      let result = [...allData];

      // Global search
      if (state.globalFilterValue?.trim()) {
        const q = state.globalFilterValue.toLowerCase();
        result = result.filter(
          (r) => r.first_name.toLowerCase().includes(q) || r.last_name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q),
        );
      }

      // Column filters
      const cf = state.columnFilters ?? {};
      if (cf.first_name?.type === 'text' && cf.first_name.value) {
        const q = String(cf.first_name.value).toLowerCase();
        result = result.filter((r) => r.first_name.toLowerCase().includes(q));
      }
      if (cf.age?.type === 'number' && cf.age.value !== undefined) {
        result = result.filter((r) => r.age >= (cf.age!.value as number));
      }
      if (cf.country?.type === 'multiselect' && (cf.country.values?.length ?? 0) > 0) {
        result = result.filter((r) => cf.country!.values!.includes(r.country));
      }

      // Sort
      if (state.sortColumn && state.sortDirection) {
        const key = state.sortColumn as keyof (typeof allData)[0];
        result.sort((a, b) => {
          const aVal = a[key],
            bVal = b[key];
          const cmp = aVal! < bVal! ? -1 : aVal! > bVal! ? 1 : 0;
          return state.sortDirection === 'DESC' ? -cmp : cmp;
        });
      }

      const start = (state.page - 1) * state.pageSize;
      setData(result.slice(start, start + state.pageSize));
      setTotalCount(result.length);
      setPage(state.page);
      setLoading(false);
    }, 300);
  }, []);

  // Initial data fetch — fetching is a legitimate effect; the loading setState is part of it.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData({ page: 1, pageSize });
  }, [fetchData]);

  const def = useMemo(
    () => ({
      columns: [
        { key: 'first_name' as const, header: 'First Name', filterable: true },
        { key: 'last_name' as const, header: 'Last Name' },
        {
          key: 'age' as const,
          header: 'Age',
          width: 100,
          align: 'right' as const,
          filterable: { type: 'number' as const, placeholder: 'Min age' },
        },
        { key: 'email' as const, header: 'Email', width: 280 },
        { key: 'country' as const, header: 'Country', filterable: { type: 'multiselect' as const, options: allCountryOptions } },
        { key: 'city' as const, header: 'City' },
      ],
      rowHeight: 40,
      visibleRowsCount: pageSize,
      topBar: true,
      bottomBar: true,
      globalFilter: true,
      title: 'Server-Side Pagination & Filters',
      pagination: { totalCount },
    }),
    [totalCount, pageSize],
  );

  return (
    <Code
      id="pagination"
      defer
      label="Server-Side Pagination & Filters"
      language="jsx"
      check={false}
      code={`const [data, setData] = useState([]);
const [page, setPage] = useState(1);
const [totalCount, setTotalCount] = useState(0);
const pageSize = 8;

// onServerStateChange fires on every page/sort/filter change.
// state = { page, pageSize, sortColumn, sortDirection, globalFilterValue, columnFilters }
// columnFilters example: { first_name: { type: 'text', value: 'Jo' }, age: { type: 'number', operator: 'gte', value: 30 }, country: { type: 'multiselect', values: ['Brazil'] } }
const fetchData = useCallback((state) => {
  setLoading(true);
  api.getUsers({
    Page: state.page, PageSize: state.pageSize,
    SortBy: state.sortColumn, SortDir: state.sortDirection,
    Search: state.globalFilterValue,
    Filters: state.columnFilters,
  }).then((res) => {
    setData(res.Items);
    setTotalCount(res.TotalCount);
    setPage(res.Page);
    setLoading(false);
  });
}, []);

useEffect(() => { fetchData({ page: 1, pageSize }); }, []);

<DataGrid
  data={data}
  loading={loading}
  page={page}
  onServerStateChange={fetchData}
  def={{
    columns: [
      { key: 'first_name', header: 'First Name', filterable: true },
      { key: 'age', header: 'Age', filterable: { type: 'number', placeholder: 'Min age' } },
      // In server-side mode the grid only has the current page, so provide
      // all possible options explicitly (fetch them from your API once).
      { key: 'country', filterable: { type: 'multiselect', options: countryOptions } },
      ...
    ],
    globalFilter: true,
    visibleRowsCount: pageSize,
    topBar: true, bottomBar: true,
    title: 'Server-Side Pagination & Filters',
    pagination: { totalCount },
  }}
/>`}
    >
      <DataGrid data={data} loading={loading} page={page} onServerStateChange={fetchData} def={def} />
    </Code>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <Box id={id}>
      <H2 fontSize={20} fontWeight={600} mb={4} theme={{ dark: { color: 'white' }, light: { color: 'slate-900' } }}>
        {title}
      </H2>
      <Box fontSize={15} lineHeight={26} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-600' } }}>
        {children}
      </Box>
    </Box>
  );
}

function Note({ icon: Icon, title, children }: { icon: typeof Table; title: string; children: ReactNode }) {
  return (
    <Flex
      gap={3}
      p={4}
      borderRadius={2}
      b={1}
      theme={{ dark: { bgColor: 'slate-900', borderColor: 'slate-800' }, light: { bgColor: 'slate-50', borderColor: 'slate-200' } }}
    >
      <Box theme={{ dark: { color: 'indigo-400' }, light: { color: 'indigo-500' } }} pt={0.5}>
        <Icon size={16} />
      </Box>
      <Box>
        <Box fontSize={14} fontWeight={600} mb={1} theme={{ dark: { color: 'slate-200' }, light: { color: 'slate-800' } }}>
          {title}
        </Box>
        <Box fontSize={14}>{children}</Box>
      </Box>
    </Flex>
  );
}

const sidebarLinks = [
  { id: 'a11y', label: 'Keyboard and roles' },
  { id: 'full-featured', label: 'Full Featured' },
  { id: 'basic', label: 'Basic' },
  { id: 'filters', label: 'Filters' },
  { id: 'grouped', label: 'Grouped Columns' },
  { id: 'row-detail', label: 'Row Detail' },
  { id: 'pagination', label: 'Server Pagination & Filters' },
  { id: 'disable-sort', label: 'Disable Sort' },
  { id: 'context-menu', label: 'Context Menu' },
  { id: 'resizer-style', label: 'Resizer Style' },
  { id: 'resize-mode', label: 'Resize Mode' },
  ...apiSections(dataGridApi),
];
