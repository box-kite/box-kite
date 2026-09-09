import { ListChecks } from 'lucide-react';
import { ReactNode } from 'react';
import Box from '../../src/box';
import Flex from '../../src/components/flex';
import { H2 } from '../../src/components/semantics';
import { cssStyles } from '../../src/core/boxStyles';
import Code from '../components/code';
import Mono from '../components/mono';
import PageHeader from '../components/pageHeader';
import Reveal from '../components/reveal';
import useTableOfContents from '../hooks/useTableOfContents';
import { countBy, ParityGroup, ParityRow, ParityStatus, propertyGroups, variantGroups } from './tailwindParity';

const propCount = Object.keys(cssStyles).length;

const all = [...propertyGroups, ...variantGroups];
const has = countBy(all, 'has');
const partial = countBy(all, 'partial');
const none = countBy(all, 'none');

export default function TailwindParityPage() {
  useTableOfContents(sidebarLinks);

  return (
    <Box>
      <PageHeader
        icon={ListChecks}
        title="Tailwind Parity"
        description="Every Tailwind v4.3 utility family, the Box prop that covers it, and an honest note wherever one does not."
        badge="NEW"
      />

      <Reveal delay={0.1}>
        <Flex d="column" gap={10}>
          <Section id="concept" title="What this table is for">
            "Can I do X?" deserves a yes or a reason, not a search. Every family in Tailwind's own documentation is a row below, against the{' '}
            {propCount} props this library ships: <strong>{has} covered</strong>, {partial} partly, {none} not at all. The list is finite
            and it is kept honest by a test — a prop named here has to exist, and a prop that exists has to be named, so the table cannot
            drift away from the registry between releases.
          </Section>

          <Section id="missing" title="What a missing row actually costs">
            Five lines. <Mono>Box.extend()</Mono> registers a prop that is indistinguishable from a built-in one afterwards: it nests in
            themes, breakpoints, container queries and every state on this site's <Mono>/variants</Mono> page, shares a class with every
            other element that used the same value, and reaches <Mono>getStyles()</Mono> on a server. So the rows below are not a list of
            things you cannot do — they are the list of props not worth typing for <em>everybody</em>, yet. And for the one-off nobody will
            type twice, <Mono>css=&#123;&#123; mixBlendMode: 'multiply' &#125;&#125;</Mono> is the same style object compiled to a class
            rather than an inline style — the <Mono>/escape-hatch</Mono> page is what governs it.
          </Section>

          <Code
            id="extend-code"
            label="Closing a row yourself"
            language="jsx"
            codeOnly
            code={`const { extendedProps } = Box.extend({}, {}, {
  mixBlendMode: [{ styleName: 'mix-blend-mode', values: ['multiply', 'screen', 'overlay'] as const }],
});

// <Box mixBlendMode="multiply" theme={{ dark: { mixBlendMode: 'screen' } }} />`}
          />

          <Section id="structural" title="The three things a utility class cannot do at all">
            Parity is the floor, not the argument. A prop is <strong>typed</strong>, so a misspelling is a compile error where{' '}
            <Mono>bg-blu-500</Mono> is a silent no-op. JSX <strong>forbids a duplicate prop</strong>, so the conflict-resolution ecosystem
            Tailwind needs — <Mono>tailwind-merge</Mono>, <Mono>clsx</Mono>, <Mono>cva</Mono>, 120M downloads a week between them — has
            nothing to resolve here. And <Mono>Box.components()</Mono> is the component-and-variant layer those libraries exist to bolt on.
          </Section>

          <Section id="properties" title="Properties">
            Tailwind's utility categories, in its own order. A note says what a <em>partial</em> row is missing, or why a <em>no</em> row is
            not a prop.
          </Section>

          {propertyGroups.map((group) => (
            <Group key={group.name} group={group} />
          ))}

          <Section id="variants" title="Variants, pseudo-elements and at-rules">
            The other half of Tailwind's surface: the prefixes. Every one of these is a nested prop rather than a class prefix, so it
            composes in both directions and the class name is built from the <em>set</em> rather than the order it was written in.
          </Section>

          {variantGroups.map((group) => (
            <Group key={group.name} group={group} />
          ))}
        </Flex>
      </Reveal>
    </Box>
  );
}

function Group({ group }: { group: ParityGroup }) {
  return (
    <Box>
      <H2 fontSize={17} fontWeight={600} mb={3} theme={{ dark: { color: 'white' }, light: { color: 'slate-900' } }}>
        {group.name}
      </H2>
      <Box overflow="auto">
        <Box tag="table" display="table" width="fit">
          <Box tag="thead" display="table-header-group">
            <Box tag="tr" display="table-row">
              <HeadCell>Tailwind</HeadCell>
              <HeadCell>Box props</HeadCell>
              <HeadCell>Status</HeadCell>
            </Box>
          </Box>
          <Box tag="tbody" display="table-row-group">
            {group.rows.map((row) => (
              <Row key={row.tailwind} row={row} />
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

function Row({ row }: { row: ParityRow }) {
  return (
    // Striped rather than ruled: without a `border-collapse` prop every cell would draw its own line —
    // which is one of the rows in the table below.
    <Box tag="tr" display="table-row" nth={{ odd: { bgColor: 'slate-500/8' } }}>
      <Cell>{row.tailwind}</Cell>
      {/* The gap between the chips is the separator on the page; `data-md` is what puts one back in
          the markdown copy, where the two elements would otherwise run together. */}
      <Cell>
        {row.props.length === 0 ? (
          <Box display="inline" theme={{ dark: { color: 'slate-600' }, light: { color: 'slate-400' } }}>
            —
          </Box>
        ) : (
          <Flex gap={1} flexWrap="wrap" props={{ 'data-md': 'inline' }}>
            {row.props.map((prop) => (
              <Mono key={prop}>{prop}</Mono>
            ))}
          </Flex>
        )}
      </Cell>
      <Cell>
        <Flex ai="center" gap={2} flexWrap="wrap" props={{ 'data-md': 'inline' }}>
          <Status status={row.status} />
          {row.note && (
            <Box display="inline" fontSize={13} theme={{ dark: { color: 'slate-500' }, light: { color: 'slate-500' } }}>
              {row.note}
            </Box>
          )}
        </Flex>
      </Cell>
    </Box>
  );
}

const statusLabels: Record<ParityStatus, string> = { has: 'yes', partial: 'partly', none: 'no' };

function Status({ status }: { status: ParityStatus }) {
  return (
    <Box
      display="inline"
      px={2}
      borderRadius={1}
      fontSize={12}
      fontWeight={600}
      whiteSpace="nowrap"
      bgColor={status === 'has' ? 'emerald-500/15' : status === 'partial' ? 'amber-500/15' : 'slate-500/15'}
      color={status === 'has' ? 'emerald-600' : status === 'partial' ? 'amber-600' : 'slate-500'}
      theme={{ dark: { color: status === 'has' ? 'emerald-400' : status === 'partial' ? 'amber-400' : 'slate-400' } }}
    >
      {statusLabels[status]}
    </Box>
  );
}

function HeadCell({ children }: { children: ReactNode }) {
  return (
    <Box
      tag="th"
      display="table-cell"
      textAlign="left"
      fontSize={13}
      fontWeight={600}
      py={2}
      px={3}
      bb={1}
      theme={{ dark: { color: 'slate-300', borderColor: 'slate-700' }, light: { color: 'slate-700', borderColor: 'slate-200' } }}
    >
      {children}
    </Box>
  );
}

function Cell({ children }: { children: ReactNode }) {
  return (
    <Box tag="td" display="table-cell" fontSize={14} py={2} px={3} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-600' } }}>
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
  { id: 'concept', label: 'What this is' },
  { id: 'missing', label: 'What a gap costs' },
  { id: 'structural', label: 'Beyond parity' },
  { id: 'properties', label: 'Properties' },
  { id: 'variants', label: 'Variants' },
];
