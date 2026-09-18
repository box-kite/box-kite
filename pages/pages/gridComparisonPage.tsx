import { Scale } from 'lucide-react';
import { ReactNode } from 'react';
import Box from '../../src/box';
import Flex from '../../src/components/flex';
import { H2, Link } from '../../src/components/semantics';
import Mono from '../components/mono';
import PageHeader from '../components/pageHeader';
import Reveal from '../components/reveal';
import SiteLink from '../components/siteLink';
import { Cell, HeadCell, Table, TableBody, TableHead, TableRow } from '../components/table';
import useTableOfContents from '../hooks/useTableOfContents';
import { Availability, ComparisonCell, ComparisonRow, comparisonRows, countShipped, products, VERIFIED_ON } from './gridComparison';

/** The docs site's own prose-link colours, the pair every other page uses. */
const linkTheme = {
  dark: { color: 'sky-400', hover: { color: 'sky-300' } },
  light: { color: 'indigo-600', hover: { color: 'indigo-500' } },
} as const;

const shipped = countShipped('box-kite');
const total = comparisonRows.length;

export default function GridComparisonPage() {
  useTableOfContents(sidebarLinks);

  return (
    <Box>
      <PageHeader
        icon={Scale}
        title="Free here, paid elsewhere"
        description="Fourteen data grid features against seven tiers, with the price of each one and the day it was checked."
        badge="NEW"
      />

      <Reveal delay={0.1}>
        <Flex d="column" gap={10}>
          <Box fontSize={15} lineHeight={26} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-600' } }}>
            Row grouping, aggregation, a real <Mono>.xlsx</Mono>, a server-side row model, tree data, master/detail panels and a block of
            cells you can copy out and paste back into: in the two grids most React teams reach for, every one of those is behind a licence.
            Here they are the same MIT package as the rest of the library. This page is that claim with the receipts attached — {shipped} of
            the {total} rows below ship here, two of them do not, and each price links to the page it was read off.
          </Box>

          <Section id="tiers" title="What each one costs">
            <Box mb={5}>
              Prices as the vendors' own pages printed them on {VERIFIED_ON}. A tier rather than a library, because a feature table of a
              paid tier is a table about different software — and because the interesting question is never "can this grid group rows" but
              "which cheque groups them".
            </Box>
            <Box overflow="auto">
              <Table>
                <TableHead>
                  <TableRow>
                    <HeadCell>Tier</HeadCell>
                    <HeadCell>Licence</HeadCell>
                    <HeadCell>Price</HeadCell>
                    <HeadCell>Of the {total} below</HeadCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id}>
                      <Cell theme={{ dark: { color: 'slate-200' }, light: { color: 'slate-800' } }}>
                        <Link props={{ href: product.href, target: '_blank', rel: 'noreferrer' }}>{product.name}</Link>
                        {product.version && <Box display="inline"> {product.version}</Box>}
                      </Cell>
                      <Cell textWrap="nowrap">{product.licence}</Cell>
                      {/* The terms are a line of their own on the page; `inline` is what separates them
                          from the price in the markdown copy, where the two would otherwise run together. */}
                      <Cell props={{ 'data-md': 'inline' }}>
                        <Box display="inline" fontWeight={product.price ? 600 : 400}>
                          {product.price ?? 'Free'}
                        </Box>
                        {product.terms && (
                          <Box fontSize={13} theme={{ dark: { color: 'slate-500' }, light: { color: 'slate-500' } }}>
                            {product.terms}
                          </Box>
                        )}
                      </Cell>
                      <Cell textAlign="end" textWrap="nowrap">
                        {countShipped(product.id)}
                      </Cell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Section>

          <Section id="matrix" title="The matrix">
            <Box mb={5}>
              A tick is the tier shipping the feature. A dash is it not shipping it, with the module or the plan that does beside it.{' '}
              <em>Yours</em> is TanStack Table, which is headless: it holds the state for most of these and renders none of them, so the
              grouped row, the pinned column and the selection rectangle are components you write. Every tick in the first column links to a
              demo on this site.
            </Box>
            {/* `width="auto"` rather than the shared table's 100%: eight columns sized to their content
                and scrolled, instead of a feature column squeezed to one word a line. */}
            <Box overflow="auto">
              <Table width="auto">
                <TableHead>
                  <TableRow>
                    <HeadCell minWidth={40}>Feature</HeadCell>
                    {products.map((product) => (
                      <HeadCell key={product.id} textAlign="center" minWidth={28} pr={4}>
                        <Box textWrap="nowrap">{product.column}</Box>
                        <Box fontSize={12} fontWeight={400} theme={{ dark: { color: 'slate-500' }, light: { color: 'slate-500' } }}>
                          {product.price ?? 'free'}
                        </Box>
                      </HeadCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {comparisonRows.map((row) => (
                    <FeatureRow key={row.feature} row={row} />
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Section>

          <Section id="losses" title="The two rows this grid loses">
            There is no pivoting here and no dragging a header to move its column, and both are ticks for AG Grid Enterprise. Pivoting is
            the larger of the two: turning the values of a column into columns of their own is a genuine analysis feature and nothing in
            this library approximates it. Column reordering is smaller — the column order is a prop, so an application can offer its own
            control — but a reader who expects to drag a header will find nothing happens. A table with no cross in its own column is an
            advertisement, so these two are rows rather than omissions, and the test behind this page fails if that ever stops being true.
          </Section>

          <Section id="speed" title="And the other half of the question">
            Features are what a grid can do; the{' '}
            <SiteLink to="/benchmark" display="inline" textDecoration="underline" theme={linkTheme}>
              benchmark
            </SiteLink>{' '}
            is what it costs to do it, measured in your own browser against the same three libraries. The short version is that this grid
            mounts, filters, sorts and groups a hundred thousand rows in the same class as AG Grid Community — and groups them at all, which
            AG Grid Community cannot.
          </Section>

          <Section id="method" title="How the rows were checked">
            <Box mb={4}>
              Every cell here was read out of something checkable rather than off a marketing page, because a comparison table is worth
              exactly the checking behind it:
            </Box>
            <Box tag="ul" pl={6} display="block">
              <Bullet>
                <strong>AG Grid</strong> publishes the split in its own types. <Mono>EnterpriseModuleName</Mono> in{' '}
                <Mono>ag-grid-community</Mono> is a union naming every module the free package does not implement — that is where{' '}
                <Mono>RowGroupingModule</Mono>, <Mono>ExcelExportModule</Mono>, <Mono>TreeDataModule</Mono>, <Mono>MasterDetailModule</Mono>
                , <Mono>CellSelectionModule</Mono>, <Mono>ClipboardModule</Mono> and <Mono>ServerSideRowModelModule</Mono> come from. Column
                pinning is <em>not</em> in it: the package maps <Mono>PinnedColumn</Mono> to <Mono>AllCommunity</Mono>, so it is free.
              </Bullet>
              <Bullet>
                <strong>MUI X</strong> ships the free grid's whole feature set as the list of hooks <Mono>useDataGridComponent</Mono> calls.
                There is no row grouping, aggregation, cell selection, tree data, detail panel, column pinning or Excel export in it; there{' '}
                <em>is</em> editing, CSV export, clipboard copy and a data source. Two more things are forced on rather than absent —{' '}
                <Mono>disableColumnReorder: true</Mono>, and a <Mono>pagination</Mono> that throws above <Mono>MAX_PAGE_SIZE = 100</Mono>,
                which is why the free grid has no hundred thousand rows to scroll. Each plan assignment was then confirmed against the badge
                on that feature's own documentation page.
              </Bullet>
              <Bullet>
                <strong>TanStack Table</strong> exports its features by name, so <Mono>cellSelectionFeature</Mono>,{' '}
                <Mono>columnPinningFeature</Mono>, <Mono>rowAggregationFeature</Mono> and <Mono>rowExpandingFeature</Mono> are the evidence
                for four <em>yours</em> cells — and the absence of any editing or export feature is the evidence for two crosses.
              </Bullet>
              <Bullet>
                <strong>The prices</strong> were read off the vendors' own pricing pages on {VERIFIED_ON} and are linked above. They are a
                snapshot: AG Grid Enterprise is perpetual with a year of updates, MUI X is annual with a perpetual option, and neither
                comparison is helped by a number that was true last year.
              </Bullet>
            </Box>
          </Section>
        </Flex>
      </Reveal>
    </Box>
  );
}

function FeatureRow({ row }: { row: ComparisonRow }) {
  return (
    <TableRow>
      <Cell props={{ 'data-md': 'inline' }} minWidth={40} theme={{ dark: { color: 'slate-200' }, light: { color: 'slate-800' } }}>
        <Box textWrap="nowrap">
          {row.demo ? (
            <SiteLink to={row.demo} display="inline" theme={linkTheme}>
              {row.feature}
            </SiteLink>
          ) : (
            row.feature
          )}
        </Box>
        <Box fontSize={13} lineHeight={19} theme={{ dark: { color: 'slate-500' }, light: { color: 'slate-500' } }}>
          {row.what}
        </Box>
      </Cell>
      {products.map((product) => (
        <Cell key={product.id} textAlign="center" pr={4}>
          <FeatureCell cell={row.cells[product.id]} />
        </Cell>
      ))}
    </TableRow>
  );
}

const labels: Record<Availability, string> = { yes: 'yes', no: '—', diy: 'yours' };

function FeatureCell({ cell }: { cell: ComparisonCell }) {
  return (
    <Box props={{ 'data-md': 'inline' }}>
      <Box
        display="inline"
        px={2}
        borderRadius={1}
        fontSize={12}
        fontWeight={600}
        whiteSpace="nowrap"
        bgColor={cell.has === 'yes' ? 'emerald-500/15' : cell.has === 'diy' ? 'sky-500/15' : 'slate-500/12'}
        color={cell.has === 'yes' ? 'emerald-600' : cell.has === 'diy' ? 'sky-600' : 'slate-500'}
        theme={{ dark: { color: cell.has === 'yes' ? 'emerald-400' : cell.has === 'diy' ? 'sky-400' : 'slate-400' } }}
      >
        {labels[cell.has]}
      </Box>
      {/* Capped, or the one long note in a column is what sets that column's width for all fourteen rows. */}
      {cell.note && (
        <Box
          fontSize={12}
          lineHeight={18}
          mt={1}
          maxWidth={26}
          mx="auto"
          theme={{ dark: { color: 'slate-500' }, light: { color: 'slate-500' } }}
        >
          {cell.note}
        </Box>
      )}
    </Box>
  );
}

function Bullet({ children }: { children: ReactNode }) {
  return (
    <Box tag="li" display="list-item" mb={3}>
      {children}
    </Box>
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

const sidebarLinks = [
  { id: 'tiers', label: 'What each one costs' },
  { id: 'matrix', label: 'The matrix' },
  { id: 'losses', label: 'What this grid loses' },
  { id: 'speed', label: 'The other half' },
  { id: 'method', label: 'How it was checked' },
];
