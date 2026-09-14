import { Filter, Table, X } from 'lucide-react';
import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import dataGridApi from '../../api/components/datagrid.json';
import Box from '../../src/box';
import Button from '../../src/components/button';
import DataGrid from '../../src/components/dataGrid';
import { DataSourceRequest, DataSourceResult } from '../../src/components/dataGrid/contracts/dataGridContract';
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

          <Box id="aggregation">
            <H2 fontSize={20} fontWeight={600} mb={2}>
              Aggregation and totals
            </H2>
            <Box mb={4} fontSize={14}>
              A column with an <Mono>aggregate</Mono> totals itself — over the rows under each group row, and over the whole grid when{' '}
              <Mono>def.footer</Mono> is on. Five built-ins (<Mono>sum</Mono>, <Mono>avg</Mono>, <Mono>min</Mono>, <Mono>max</Mono>,{' '}
              <Mono>count</Mono>) or a function of your own, which is handed the column's values and the rows they came from. It covers the
              rows the filters left, so filtering the grid changes the totals; formatting is an <Mono>AggregateCell</Mono>, the aggregate's
              twin of <Mono>Cell</Mono>. Open the Country column's menu and choose <b>Group By</b> to put the same numbers on group rows.
            </Box>
          </Box>

          <Code
            defer
            label="Per-group totals and a pinned grand total"
            language="jsx"
            code={`<DataGrid
  data={data}
  def={{
    // Grand totals pinned under the rows. The label goes in the first
    // column that is not aggregating; \`footer: { label }\` replaces it.
    footer: true,
    columns: [
      { key: 'country' },
      { key: 'company_name', header: 'Company' },
      // 'count' counts rows, so a blank cell is still a row.
      { key: 'username', header: 'People', aggregate: 'count' },
      { key: 'age', header: 'Avg age', aggregate: 'avg' },
      {
        key: 'salary',
        header: 'Payroll',
        aggregate: 'sum',
        // The aggregate's own renderer — 'sum' answers a number, this formats it.
        AggregateCell: ({ cell }) => (
          <Box px={3} textWrap="nowrap">
            {cell.value === null ? '—' : \`$\${Math.round(cell.value as number).toLocaleString('en-US')}\`}
          </Box>
        ),
      },
    ],
  }}
/>`}
          >
            <DataGrid
              data={allData}
              def={{
                topBar: true,
                title: 'Payroll by country',
                globalFilter: true,
                visibleRowsCount: 8,
                footer: true,
                rowSelection: { pinned: true },
                columns: [
                  { key: 'country', header: 'Country', width: 150 },
                  { key: 'company_name', header: 'Company', width: 170 },
                  { key: 'username', header: 'People', aggregate: 'count', align: 'end', width: 110 },
                  { key: 'age', header: 'Avg age', aggregate: 'avg', align: 'end', width: 110 },
                  {
                    key: 'salary',
                    header: 'Payroll',
                    width: 140,
                    align: 'end',
                    aggregate: 'sum',
                    AggregateCell: ({ cell }) => (
                      <Box px={3} textWrap="nowrap">
                        {cell.value === null ? '—' : `$${Math.round(cell.value as number).toLocaleString('en-US')}`}
                      </Box>
                    ),
                  },
                ],
              }}
            />
          </Code>

          <Box id="export">
            <H2 fontSize={20} fontWeight={600} mb={2}>
              Export to Excel and CSV
            </H2>
            <Box mb={4} fontSize={14}>
              <Mono>def.export</Mono> puts the two buttons in the top bar; a <Mono>ref</Mono> on the grid gives you <Mono>exportXlsx</Mono>{' '}
              and <Mono>exportCsv</Mono> to call from a toolbar of your own. The file is what the grid is showing — the visible columns in
              their pinned order, the rows the filters and the sort left, the group rows and their totals — and the workbook is a real{' '}
              <Mono>.xlsx</Mono>: a bold header on a frozen row, column widths, values that keep their type, and the grouping as Excel's own
              outline levels, so a collapsed group opens collapsed. Both writers are behind a dynamic import, so a grid nobody exports from
              carries none of that code. There is no ExcelJS to install and nothing to configure.
            </Box>
          </Box>

          <Code
            defer
            label="Two buttons, and a workbook with its groups intact"
            language="jsx"
            context={`interface Person { country: string; company_name: string; username: string; salary: number }
declare const data: Person[];`}
            code={`<DataGrid<Person>
  data={data}
  def={{
    topBar: true,
    title: 'Payroll',
    // \`true\` is both formats. \`{ csv: false }\` or \`{ xlsx: false }\` drops one,
    // and \`fileName\` names the file — the title, otherwise.
    export: { fileName: 'payroll' },
    footer: true,
    columns: [
      { key: 'country' },
      // An export runs no React, so a column drawn by a \`Cell\` says what it writes.
      { key: 'company_name', header: 'Company', exportValue: (row) => row.company_name.toUpperCase() },
      { key: 'username', header: 'People', aggregate: 'count' },
      // The number format the cell wears in the workbook.
      { key: 'salary', header: 'Payroll', aggregate: 'sum', exportFormat: '$#,##0' },
    ],
  }}
/>`}
          >
            <DataGrid
              data={allData}
              def={{
                topBar: true,
                title: 'Payroll',
                export: { fileName: 'payroll' },
                globalFilter: true,
                visibleRowsCount: 8,
                footer: true,
                columns: [
                  { key: 'country', header: 'Country', width: 150 },
                  {
                    key: 'company_name',
                    header: 'Company',
                    width: 200,
                    exportValue: (row) => row.company_name.toUpperCase(),
                  },
                  { key: 'username', header: 'People', aggregate: 'count', align: 'end', width: 110 },
                  { key: 'salary', header: 'Payroll', aggregate: 'sum', align: 'end', width: 140, exportFormat: '$#,##0' },
                ],
              }}
            />
          </Code>

          <Code
            id="row-detail"
            defer
            label="Row Detail — Orders with Items"
            language="jsx"
            check={false}
            code={`// A detail row already arrives joined to the row that opened it: they share a surface and a
// 2px accent runs down the inline start of both (isExpandedFirstLeaf on the row, detailRow.content
// under it). A custom tree only has to re-colour that block. 'orders-datagrid' does the surfaces;
// 'subgrid' strips the chrome off the grid inside the panel. Both names need the same .d.ts
// augmentation every Box.components() entry does; the Theme Setup page shows it.
Box.components({
  'orders-datagrid': {
    extends: 'datagrid',
    children: {
      body: {
        children: {
          // isExpanded is on every cell of the open row; isExpandedFirstLeaf / isExpandedLastLeaf
          // name its two ends, which is where the default accent lives. A neutral, not a hue: this
          // surface can cover half the grid, and the 2px accent is where colour belongs.
          cell: {
            variants: {
              isExpanded: {
                bgColor: 'slate-100',
                group: { 'grid-row/hover': { bgColor: 'slate-200' } },
              },
            },
          },
          detailRow: { styles: { bgColor: 'slate-100', borderColor: 'slate-300' } },
        },
      },
    },
  },
  // A grid inside a row is a list, not a second card: no border, no radius, no shadow and no
  // surface of its own, so the drawer it sits in stays the only panel on screen.
  subgrid: {
    extends: 'datagrid',
    styles: { b: 0, borderRadius: 0, shadow: 'none', bgColor: 'transparent' },
    children: {
      header: {
        styles: { bgColor: 'transparent' },
        children: {
          cell: {
            styles: {
              bgColor: 'transparent',
              minHeight: 0,
              py: 2,
              fontSize: 11,
              letterSpacing: 0.4,
              textTransform: 'uppercase',
              // gray-500 is what the outer header uses, but that is measured on gray-50: on the
              // drawer's tint the same pair is 4.33:1, so the nested header goes one step darker.
              color: 'gray-600',
              borderColor: 'gray-300',
            },
          },
        },
      },
      body: {
        children: {
          cell: { styles: { bgColor: 'transparent', fontSize: 13, borderColor: 'gray-200' } },
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
        <Box px={5} py={4}>
          {/* ps={3} lines the caption up with the first column's text, which a cell pads by 3. */}
          <Flex ai="center" gap={2} mb={3} ps={3}>
            <Box fontSize={11} fontWeight={600} letterSpacing={0.4} textTransform="uppercase" color="gray-600">
              Items
            </Box>
            <Box fontSize={11} fontWeight={600} px={1.5} borderRadius={4} bgColor="indigo-100" color="indigo-700">
              {order.items.length}
            </Box>
          </Flex>
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
              // Three rows need no column menu and no resizing.
              contextMenu: false,
              resizable: false,
            }}
          />
        </Box>
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
                visibleRowsCount: 7,
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
                    <Box px={5} py={4}>
                      <Flex ai="center" gap={2} mb={3} ps={3}>
                        <Box
                          fontSize={11}
                          fontWeight={600}
                          letterSpacing={0.4}
                          textTransform="uppercase"
                          color="gray-600"
                          theme={{ dark: { color: 'gray-400' } }}
                        >
                          Items
                        </Box>
                        <Box
                          fontSize={11}
                          fontWeight={600}
                          px={1.5}
                          borderRadius={4}
                          bgColor="indigo-100"
                          color="indigo-700"
                          theme={{ dark: { bgColor: 'indigo-900', color: 'indigo-200' } }}
                        >
                          {order.items.length}
                        </Box>
                      </Flex>
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
                          // Three rows need no column menu and no resizing — the chrome would outweigh the data.
                          contextMenu: false,
                          resizable: false,
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

          <Section id="data-source" title="A million rows, fetched a block at a time">
            <Box>
              <Mono>def.dataSource</Mono> is the other way round from everything above: instead of handing the grid rows, you hand it a
              function and it asks. Sorting, filtering and paging stop being work the browser does over an array and become part of a
              request — so the grid can stand in front of a table nobody could send to a browser at all. Rows the server has not answered
              for yet are drawn as skeletons and are still counted, so the scrollbar and <Mono>aria-rowcount</Mono> describe the whole
              result set from the first block.
            </Box>
            <Flex d="column" gap={3} mt={4}>
              <Note icon={Table} title="A block is the unit of everything">
                One request, one wait, one failure. <Mono>blockSize</Mono> is how many rows each asks for (the page size when{' '}
                <Mono>def.pagination</Mono> is beside it, 100 otherwise), and <Mono>maxBlocks</Mono> is how many are kept before the ones
                furthest from the viewport are dropped and fetched again on the way back.
              </Note>
              <Note icon={Filter} title="A late answer to an old question is thrown away">
                Every request carries an <Mono>AbortSignal</Mono> that fires when the sort or the filters change underneath it — hand it to{' '}
                <Mono>fetch</Mono> and a superseded request costs the network nothing. A reply that arrives anyway is dropped rather than
                written over the newer one.
              </Note>
              <Note icon={Table} title="What the grid cannot see is refresh()">
                The grid invalidates its own cache whenever it changes the query. For the half it cannot see — a filter of the page’s own, a
                row somebody saved — call <Mono>refresh()</Mono> on the grid’s ref.
              </Note>
            </Flex>
          </Section>

          <Code
            id="data-source-demo"
            defer
            label="Server row model"
            language="jsx"
            check={false}
            code={`// One object, stable across renders: the grid reads it when it asks for a block.
const dataSource = useMemo(() => ({
  blockSize: 100,
  async getRows({ startRow, endRow, page, pageSize, sort, globalFilter, columnFilters, signal }) {
    const res = await fetch('/api/people?' + new URLSearchParams({
      offset: String(startRow),
      limit: String(endRow - startRow),
      sort: sort ? \`\${sort.columnKey}:\${sort.direction}\` : '',
      q: globalFilter,
    }), { signal });

    const body = await res.json();

    // \`totalCount\` sizes the scrollbar. Omit it and the grid follows the rows instead,
    // treating a block shorter than it asked for as the end of the data.
    return { rows: body.items, totalCount: body.total };
  },
}), []);

<DataGrid
  def={{
    dataSource,
    title: 'One million people',
    topBar: true,
    globalFilter: true,
    visibleRowsCount: 12,
    columns: [
      { key: 'id', header: '#', sortable: false, width: 110, align: 'end' },
      { key: 'name', header: 'Name', width: 240 },
      { key: 'country', header: 'Country', width: 160 },
      { key: 'joined', header: 'Joined', width: 140 },
      { key: 'score', header: 'Score', width: 120, align: 'end' },
    ],
  }}
/>`}
          >
            <MillionRowDemo />
          </Code>

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

/**
 * A million rows that exist nowhere. Every value is a function of the row's index, so the "server" holds
 * no table at all — and because the generator repeats every `PERIOD` rows, a sort or a filter over the
 * whole million is answered by arithmetic rather than by a scan. That is the mock's trick, not the grid's:
 * what the grid does is ask for one block at a time.
 */
const FIRST_NAMES = [
  'Ada',
  'Grace',
  'Alan',
  'Edsger',
  'Barbara',
  'Donald',
  'Katherine',
  'Linus',
  'Margaret',
  'Dennis',
  'Radia',
  'Ken',
  'Frances',
  'Tony',
  'Sophie',
  'Niklaus',
  'Jean',
  'Adele',
  'Leslie',
  'Guido',
  'Anita',
  'Bjarne',
  'Carol',
  'Ivan',
  'Shafi',
];
const LAST_NAMES = [
  'Lovelace',
  'Hopper',
  'Turing',
  'Dijkstra',
  'Liskov',
  'Knuth',
  'Johnson',
  'Torvalds',
  'Hamilton',
  'Ritchie',
  'Perlman',
  'Thompson',
  'Allen',
  'Hoare',
  'Wilkes',
  'Wirth',
  'Bartik',
  'Goldberg',
  'Lamport',
  'Sutherland',
];
const COUNTRIES = ['Moldova', 'Portugal', 'Japan', 'Kenya', 'Chile', 'Norway', 'Vietnam', 'Canada'];

/** One full turn of the generator: every distinct row shape appears exactly once in each. */
const PERIOD = FIRST_NAMES.length * LAST_NAMES.length;
const TOTAL_ROWS = 1_000_000;
/** How many rows share each slot of the period — exact, since the total is a multiple of it. */
const PER_SLOT = TOTAL_ROWS / PERIOD;

interface Person {
  id: number;
  name: string;
  country: string;
  joined: string;
  score: number;
}

/** The slot a row's values come from, and the row itself. Both pure, both O(1). */
const slotOf = (index: number) => index % PERIOD;

function personAt(index: number): Person {
  const slot = slotOf(index);

  return {
    id: index + 1,
    // Seven is coprime with the twenty surnames, so consecutive rows differ: a column reading
    // Lovelace twenty-five times running looks like a bug rather than a generator.
    name: `${FIRST_NAMES[slot % FIRST_NAMES.length]} ${LAST_NAMES[(slot * 7) % LAST_NAMES.length]}`,
    country: COUNTRIES[slot % COUNTRIES.length],
    // Off the index rather than the slot, so consecutive rows differ — a sort on a column with five
    // hundred distinct values puts two thousand identical rows together, which reads as a broken grid.
    // It is not sortable for the same reason `id` is not: the arithmetic below only reaches the slot.
    joined: new Date(Date.UTC(2019, 0, 1 + (index % 2500))).toISOString().slice(0, 10),
    score: ((slot * 37) % 500) + 100,
  };
}

/** Every slot, in the order a sort on that column puts them — the whole sort, for 500 comparisons. */
function sortedSlots(columnKey: string | number | undefined, direction: string | undefined): number[] {
  const slots = Array.from({ length: PERIOD }, (_, slot) => slot);
  if (!columnKey || !direction) return slots;

  const value = (slot: number) => personAt(slot)[columnKey as keyof Person];

  slots.sort((a, b) => {
    const left = value(a);
    const right = value(b);
    const cmp = left < right ? -1 : left > right ? 1 : a - b;

    return direction === 'DESC' ? -cmp : cmp;
  });

  return slots;
}

function MillionRowDemo() {
  const [failNext, setFailNext] = useState(false);
  const [lastRequest, setLastRequest] = useState<string>('—');

  // One object for the life of the demo: a new `getRows` every render would be read by the next block
  // rather than by a refetch, but the identity is what a reader will copy, so keep it honest.
  const dataSource = useMemo(
    () => ({
      blockSize: 100,
      getRows: ({ startRow, endRow, sort, globalFilter }: DataSourceRequest<Person>) =>
        new Promise<DataSourceResult<Person>>((resolve, reject) => {
          setLastRequest(`rows ${startRow}–${endRow}${sort ? `, sorted by ${sort.columnKey} ${sort.direction}` : ''}`);

          setTimeout(() => {
            if (failNext) {
              setFailNext(false);
              reject(new Error('The server said 503. Nothing was lost — press Retry.'));
              return;
            }

            // Which slots the filter leaves, in the order the sort puts them. The filtered set is the
            // same in every turn of the period, so counting it is 500 tests rather than a million.
            const query = globalFilter.trim().toLowerCase();
            const slots = sortedSlots(sort?.columnKey, sort?.direction).filter(
              (slot) => !query || `${personAt(slot).name} ${personAt(slot).country}`.toLowerCase().includes(query),
            );
            const totalCount = slots.length * PER_SLOT;
            const natural = !sort && !query;
            const rows: Person[] = [];

            for (let position = startRow; position < Math.min(endRow, totalCount); position++) {
              // Unasked, the rows come back in the table's own order. Sorted or filtered, the nth row is
              // found by which slot it falls in and which turn of the period — no scan, and no table.
              rows.push(personAt(natural ? position : slots[Math.floor(position / PER_SLOT)] + (position % PER_SLOT) * PERIOD));
            }

            resolve({ rows, totalCount });
          }, 220);
        }),
    }),
    [failNext],
  );

  const def = useMemo(
    () => ({
      rowKey: 'id' as const,
      title: 'One million people',
      topBar: true,
      globalFilter: true,
      visibleRowsCount: 12,
      rowHeight: 40,
      dataSource,
      columns: [
        // The one column the mock cannot sort: `id` is the row's index, and the slot arithmetic below
        // only reaches values that repeat with the period.
        { key: 'id' as const, header: '#', sortable: false, width: 110, align: 'end' as const },
        { key: 'name' as const, header: 'Name', width: 240 },
        { key: 'country' as const, header: 'Country', width: 160 },
        { key: 'joined' as const, header: 'Joined', sortable: false, width: 140 },
        { key: 'score' as const, header: 'Score', width: 120, align: 'end' as const },
      ],
    }),
    [dataSource],
  );

  return (
    <Flex d="column" gap={3}>
      <Flex gap={2} ai="center" flexWrap="wrap">
        <FilterChip label="Fail the next request" active={failNext} onClick={() => setFailNext(!failNext)} />
        <Box fontSize={12} color="gray-500" theme={{ dark: { color: 'gray-400' } }}>
          Last asked for: {lastRequest}
        </Box>
      </Flex>

      <DataGrid<Person> def={def} />
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

// onServerStateChange fires on every page/sort/filter change, with what moved beside the snapshot:
// (state, { reason }), where reason is 'page' | 'page-size' | 'sort' | 'filter' | 'clear'.
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
  { id: 'aggregation', label: 'Aggregation and totals' },
  { id: 'export', label: 'Export to Excel and CSV' },
  { id: 'row-detail', label: 'Row Detail' },
  { id: 'pagination', label: 'Server Pagination & Filters' },
  { id: 'data-source', label: 'Server row model' },
  { id: 'disable-sort', label: 'Disable Sort' },
  { id: 'context-menu', label: 'Context Menu' },
  { id: 'resizer-style', label: 'Resizer Style' },
  { id: 'resize-mode', label: 'Resize Mode' },
  ...apiSections(dataGridApi),
];
