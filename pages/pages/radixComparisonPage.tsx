import { GitCompare } from 'lucide-react';
import { Fragment, ReactNode } from 'react';
import Box from '../../src/box';
import Flex from '../../src/components/flex';
import { H2, Link } from '../../src/components/semantics';
import Mono from '../components/mono';
import PageHeader from '../components/pageHeader';
import Reveal from '../components/reveal';
import SiteLink from '../components/siteLink';
import { Cell, HeadCell, Table, TableBody, TableHead, TableRow } from '../components/table';
import useTableOfContents from '../hooks/useTableOfContents';
import { patternRows, totals } from './home';
import {
  Coverage,
  CoverageCell,
  coverageOf,
  coverageRows,
  kb,
  libraries,
  marginalSum,
  sizeOf,
  sizeRows,
  soloSum,
  totalFor,
  VERIFIED_ON,
} from './radixComparison';

/** The docs site's own prose-link colours, the pair every other page uses. */
const linkTheme = {
  dark: { color: 'sky-400', hover: { color: 'sky-300' } },
  light: { color: 'indigo-600', hover: { color: 'indigo-500' } },
} as const;

const muted = { dark: { color: 'slate-400' }, light: { color: 'slate-600' } } as const;
const faint = { dark: { color: 'slate-500' }, light: { color: 'slate-500' } } as const;
const strong = { dark: { color: 'slate-200' }, light: { color: 'slate-800' } } as const;

const [boxKite, radix, baseUi] = libraries;
const missing = coverageRows.filter((row) => row.cells['box-kite'].has === 'none').length;

export default function RadixComparisonPage() {
  useTableOfContents(sidebarLinks);

  return (
    <Box>
      <PageHeader
        icon={GitCompare}
        title="Against Radix UI and Base UI"
        description="Thirteen patterns all three libraries ship, measured twice, plus the eighteen rows where one of them has nothing."
        badge="NEW"
      />

      <Reveal delay={0.1}>
        <Flex d="column" gap={10}>
          <Box fontSize={15} lineHeight={26} theme={muted}>
            Radix and Base UI are behaviour libraries: they ship the roles, the keyboard and the focus moves, and no appearance at all. This
            one ships those <em>and</em> the appearance, out of an engine that costs {kb(boxKite.engine)} KB before the first component
            renders. So the interesting question is not which component is smaller — it is whether that engine pays for itself, and the
            answer is a table rather than a sentence. All figures gzipped, minified, React external, measured on {VERIFIED_ON}.
          </Box>

          <Section id="totals" title="An app with thirteen of them in it">
            <Box mb={5}>
              One bundle per library, so everything each of them shares internally is shared once. This is the number that decides anything:
              a column of per-package figures adds up to {kb(soloSum('radix'))} KB for Radix and bundles to {kb(radix.thirteen)}, because
              thirteen packages that all depend on the same six do not cost thirteen times anything.
            </Box>
            <Box overflow="auto">
              <Table>
                <TableHead>
                  <TableRow>
                    <HeadCell>Library</HeadCell>
                    <HeadCell textAlign="end">Before the first component</HeadCell>
                    <HeadCell textAlign="end">The thirteen</HeadCell>
                    <HeadCell textAlign="end">Total</HeadCell>
                    <HeadCell>Styled</HeadCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {libraries.map((library) => (
                    <TableRow key={library.id}>
                      <Cell props={{ 'data-md': 'inline' }} theme={strong}>
                        <Link props={{ href: library.href, target: '_blank', rel: 'noreferrer' }}>{library.name}</Link>
                        <Box fontSize={13} theme={faint}>
                          {library.pkg} {library.version}
                        </Box>
                      </Cell>
                      <Cell textAlign="end" textWrap="nowrap">
                        {library.engine ? `${kb(library.engine)} KB` : '—'}
                      </Cell>
                      <Cell textAlign="end" textWrap="nowrap">
                        {kb(library.thirteen)} KB
                      </Cell>
                      <Cell textAlign="end" textWrap="nowrap" fontWeight={600} theme={strong}>
                        {kb(totalFor(library.id))} KB
                      </Cell>
                      <Cell>{library.styled ? 'yes' : 'no — the CSS is yours'}</Cell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
            <Box mt={5}>
              {kb(totalFor('box-kite'))} KB against {kb(totalFor('radix'))} is a dead heat, and saying anything else about it would be
              dishonest. What is not a dead heat is what the two columns contain: the {kb(boxKite.engine)} KB here is a styling engine and
              thirteen styled components, and the {kb(radix.thirteen)} KB there is thirteen unstyled ones. Neither of the other two ships a
              single <Mono>.css</Mono> file — that was checked by looking — so the stylesheet an app writes for them is real weight that
              appears in no figure on this page. Base UI is the outlier at {kb(totalFor('base-ui'))} KB, close to twice either of the
              others.
            </Box>
          </Section>

          <Section id="patterns" title="One more of something">
            <Box mb={5}>
              Two figures per cell. <strong>One more</strong> is what that pattern costs an app that already has the other twelve — measured
              by leaving it out of the bundle and taking the difference, which is the only figure that compares across libraries with
              different amounts of shared machinery. <strong>Alone</strong> is what it costs as the only thing you import, which is the
              figure a package page prints and the one that flatters whoever shares the least. For this library, <em>alone</em> is on top of
              Box; the {kb(boxKite.engine)} KB is in the row above, not in these cells.
            </Box>
            {/* `width="auto"` rather than the shared table's 100%: seven columns sized to their content
                and scrolled, instead of a pattern column squeezed to one word a line. */}
            <Box overflow="auto">
              <Table width="auto">
                {/* Six head cells rather than a `colSpan` over two rows: the markdown mirror keeps only
                    the first header row, so the second became a body row of the wrong width. */}
                <TableHead>
                  <TableRow>
                    <HeadCell minWidth={40}>Pattern</HeadCell>
                    {libraries.map((library) => (
                      <Fragment key={library.id}>
                        <HeadCell textAlign="end" textWrap="nowrap" props={{ 'data-md': 'inline' }}>
                          {/* An element rather than a bare text node: the markdown mirror joins stacked
                              blocks with ` · ` and drops loose text beside one, which lost the name. */}
                          <Box display="inline">{library.column}</Box>
                          <Box fontSize={12} fontWeight={400} theme={faint}>
                            one more
                          </Box>
                        </HeadCell>
                        <HeadCell textAlign="end" textWrap="nowrap" pr={4} props={{ 'data-md': 'inline' }}>
                          <Box display="inline">{library.column}</Box>
                          <Box fontSize={12} fontWeight={400} theme={faint}>
                            alone
                          </Box>
                        </HeadCell>
                      </Fragment>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sizeRows.map((row) => {
                    const best = Math.min(...libraries.map((library) => row.cells[library.id].marginal));

                    return (
                      <TableRow key={row.pattern}>
                        <Cell props={{ 'data-md': 'inline' }} minWidth={40} theme={strong}>
                          <Box textWrap="nowrap">
                            <SiteLink to={row.demo} display="inline" theme={linkTheme}>
                              {row.pattern}
                            </SiteLink>
                          </Box>
                          <Box fontSize={13} lineHeight={19} maxWidth={72} theme={faint}>
                            {row.what}
                          </Box>
                        </Cell>
                        {libraries.map((library) => {
                          const cell = row.cells[library.id];

                          return (
                            <Fragment key={library.id}>
                              <Cell
                                textAlign="end"
                                textWrap="nowrap"
                                fontWeight={cell.marginal === best ? 600 : 400}
                                theme={cell.marginal === best ? strong : undefined}
                              >
                                {kb(cell.marginal)}
                              </Cell>
                              <Cell textAlign="end" textWrap="nowrap" pr={4} theme={faint}>
                                {kb(cell.solo)}
                              </Cell>
                            </Fragment>
                          );
                        })}
                      </TableRow>
                    );
                  })}
                  <TableRow>
                    <Cell fontWeight={600} theme={strong}>
                      All thirteen, one bundle
                    </Cell>
                    {libraries.map((library) => (
                      <Fragment key={library.id}>
                        <Cell textAlign="end" textWrap="nowrap" fontWeight={600} theme={strong}>
                          {kb(library.thirteen)}
                        </Cell>
                        <Cell textAlign="end" textWrap="nowrap" pr={4} theme={faint}>
                          {kb(marginalSum(library.id))} summed
                        </Cell>
                      </Fragment>
                    ))}
                  </TableRow>
                </TableBody>
              </Table>
            </Box>
            <Box mt={5}>
              The last row is the one to read twice. Adding up thirteen leave-one-out figures gets nowhere near what the thirteen cost
              together, in any of the three columns — each one is measured against twelve others already paying for the shared parts, so
              none of them carries its share of those. Neither figure is wrong and neither is the whole answer, which is why both are here.
            </Box>
            <Box mt={4}>
              <strong>Radix wins a row.</strong> Its tabs are {kb(sizeOf('Tabs', 'radix').marginal)} KB against this library's{' '}
              {kb(sizeOf('Tabs', 'box-kite').marginal)} — about a kilobyte of that difference is the travelling indicator and the resizing
              panel box, which are measured at runtime and therefore ship whether or not a given tablist switches them on. It is a real
              loss, and the test behind this page fails if the row ever quietly disappears.
            </Box>
          </Section>

          <Section id="coverage" title="What each of the three has not got">
            <Box mb={5}>
              The size table is thirteen patterns all three ship, which is the fair comparison and also the flattering one. This is the rest
              of it: {coverageRows.length} patterns where at least one of the three has nothing, {missing} of them a blank in this library's
              own column. Read this table before the other one.
            </Box>
            <Box overflow="auto">
              <Table width="auto">
                <TableHead>
                  <TableRow>
                    <HeadCell minWidth={36}>Pattern</HeadCell>
                    {libraries.map((library) => (
                      <HeadCell key={library.id} minWidth={32} pr={4}>
                        {library.column}
                      </HeadCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {coverageRows.map((row) => (
                    <TableRow key={row.pattern}>
                      <Cell minWidth={36} theme={strong}>
                        <Box textWrap="nowrap">
                          {row.demo ? (
                            <SiteLink to={row.demo} display="inline" theme={linkTheme}>
                              {row.pattern}
                            </SiteLink>
                          ) : (
                            row.pattern
                          )}
                        </Box>
                      </Cell>
                      {libraries.map((library) => (
                        <Cell key={library.id} pr={4}>
                          <CoverageMark cell={row.cells[library.id]} />
                        </Cell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
            <Box mt={5}>
              Both of the others have a navigation menu, a menubar, a context menu, a scroll area, a hover card, a toolbar, a toggle group
              and an avatar, and this library has none of the eight. What it has instead is further up the stack: a data grid, a dashboard
              grid, four chart primitives, the components an agent's turn is made of, and a combobox —{' '}
              <SiteLink to="/combobox" display="inline" theme={linkTheme}>
                the one Radix has never shipped
              </SiteLink>
              , asked for in <Mono>radix-ui/primitives#1342</Mono> in 2022 and still open. Base UI does have one, and at{' '}
              {kb(coverageOf('Combobox', 'base-ui').solo!)} KB alone — against {kb(coverageOf('Combobox', 'box-kite').solo!)} here — it is
              the largest single component in this comparison.
            </Box>
          </Section>

          <Section id="styling" title="The part that is in no figure here">
            <Box mb={4}>
              An unstyled library is not a smaller library — it is a library plus the CSS you write. A Radix dialog is a correct dialog with
              no padding, no colour, no radius and no dark mode, and getting those is a stylesheet, a utility framework or a copy-paste
              layer like shadcn/ui, none of which is counted anywhere above.
            </Box>
            <Box mb={4}>
              That is the trade, stated plainly: <strong>you give up choosing your styling layer</strong> and get the appearance, the dark
              mode and the component defaults in the {kb(boxKite.engine)} KB. If your team already has a styling system it is happy with,
              two of the three libraries on this page will suit you better, and the honest recommendation is Radix — it is the smaller of
              them by a wide margin, and it has eight patterns this one does not.
            </Box>
            <Box>
              Where it does pay is that the appearance is typed the same way the behaviour is.{' '}
              <SiteLink to="/theme-setup" display="inline" theme={linkTheme}>
                A theme
              </SiteLink>{' '}
              is a class on an ancestor rather than a second stylesheet, a variant is <Mono>Box.components()</Mono> rather than a
              string-merging runtime, and the CSS is in the HTML a server rendered, so there is no stylesheet request in front of the first
              paint.
            </Box>
          </Section>

          <Section id="keyboard" title="The behaviour, tested rather than described">
            <Box mb={5}>
              All three libraries implement the published W3C patterns and all three test them; this is not a column anyone wins. What is
              worth showing is the shape of the evidence here, because it is generated from the components rather than written about them:{' '}
              {patternRows.length} components implement a pattern, their references document {totals.keyboardRows} keyboard rows between
              them, the axe sweep renders {totals.fixtures} fixtures, and the ledger of known violations has {totals.knownViolations}{' '}
              entries in it — a ledger that fails both on a new violation and on a listed one that stopped firing.
            </Box>
            <Box overflow="auto">
              <Table>
                <TableHead>
                  <TableRow>
                    <HeadCell>Component</HeadCell>
                    <HeadCell>Pattern</HeadCell>
                    <HeadCell textAlign="end">Keyboard rows</HeadCell>
                    <HeadCell textAlign="end">Axe fixtures</HeadCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {patternRows.map((row) => (
                    <TableRow key={row.name}>
                      <Cell theme={strong}>
                        <SiteLink to={row.route} display="inline" theme={linkTheme}>
                          {row.name}
                        </SiteLink>
                      </Cell>
                      <Cell textWrap="nowrap">{row.pattern}</Cell>
                      <Cell textAlign="end">{row.keyboard}</Cell>
                      <Cell textAlign="end">{row.fixtures}</Cell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Section>

          <Section id="method" title="How the figures were made">
            <Box mb={4}>Every byte on this page came out of a harness that ships in this repository, so none of it has to be believed:</Box>
            <Box tag="ul" pl={6} display="block">
              <Bullet>
                <strong>The tool</strong> is <Mono>node dev/published-size.mjs</Mono>. It bundles the given entries with esbuild, minified,
                with React external, and gzips the result at level 9. <Mono>--marginal</Mono> is the leave-one-out mode:{' '}
                <Mono>total(all) − total(all but this one)</Mono>, run once per row.
              </Bullet>
              <Bullet>
                <strong>This library's figures</strong> are measured after <Mono>npm run build</Mono>, against the built <Mono>dist/</Mono>{' '}
                — the same files npm publishes, not the sources.
              </Bullet>
              <Bullet>
                <strong>The other two</strong> were installed into an empty directory on {VERIFIED_ON} and measured with{' '}
                <Mono>--bare --dir</Mono>, which drops the Box baseline and resolves from there. Versions are in the first table; the
                individual Radix packages were {radix.pkg} {radix.version}'s own, since an app installs those.
              </Bullet>
              <Bullet>
                <strong>The coverage table</strong> was read out of the packages rather than off their documentation:{' '}
                <Mono>{radix.pkg}</Mono> exports thirty-four component namespaces and <Mono>{baseUi.pkg}</Mono> declares forty-four public
                subpaths, and a pattern is in a library's column when it is in one of those lists. The <em>styled</em> column was checked
                the same way — <Mono>find node_modules/@radix-ui -name '*.css'</Mono> and the same for Base UI both answer nothing.
              </Bullet>
              <Bullet>
                <strong>The keyboard table</strong> is not transcribed at all. It comes from <Mono>api/components/*.json</Mono>, which is
                generated from the components, and the test beside this page fails if a number here stops matching one there.
              </Bullet>
            </Box>
          </Section>

          <Section id="elsewhere" title="The other two comparisons">
            <Box>
              This is one of three.{' '}
              <SiteLink to="/tailwind-parity" display="inline" textDecoration="underline" theme={linkTheme}>
                Against Tailwind
              </SiteLink>{' '}
              is every v4.3 utility family against the props here, gaps marked, and{' '}
              <SiteLink to="/grid-comparison" display="inline" textDecoration="underline" theme={linkTheme}>
                against the data grids
              </SiteLink>{' '}
              is fourteen features against seven tiers of AG Grid, MUI X and TanStack, with what each one charges.
            </Box>
          </Section>
        </Flex>
      </Reveal>
    </Box>
  );
}

const marks: Record<Coverage, string> = { component: '', prop: 'a prop', none: '—' };

function CoverageMark({ cell }: { cell: CoverageCell }) {
  const label = cell.has === 'component' ? (cell.as ?? 'yes') : marks[cell.has];

  return (
    <Box props={{ 'data-md': 'inline' }}>
      <Box
        fontSize={13}
        lineHeight={19}
        maxWidth={44}
        fontWeight={cell.has === 'component' ? 500 : 400}
        theme={{
          dark: { color: cell.has === 'none' ? 'slate-500' : 'emerald-400' },
          light: { color: cell.has === 'none' ? 'slate-500' : 'emerald-600' },
        }}
      >
        {label}
      </Box>
      {cell.has !== 'component' && cell.as && (
        <Box fontSize={12} lineHeight={18} maxWidth={44} theme={faint}>
          {cell.as}
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
      <Box fontSize={15} lineHeight={26} theme={muted}>
        {children}
      </Box>
    </Box>
  );
}

const sidebarLinks = [
  { id: 'totals', label: 'An app with thirteen' },
  { id: 'patterns', label: 'One more of something' },
  { id: 'coverage', label: 'What each has not got' },
  { id: 'styling', label: 'The part in no figure' },
  { id: 'keyboard', label: 'The behaviour, tested' },
  { id: 'method', label: 'How it was measured' },
  { id: 'elsewhere', label: 'The other two' },
];
