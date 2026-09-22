import { Box as BoxIcon, Check, Search, X } from 'lucide-react';
import { ReactNode, useMemo, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import Box from '../../src/box';
import Button from '../../src/components/button';
import Flex from '../../src/components/flex';
import Icon from '../../src/components/icon';
import { H2, H3, Span } from '../../src/components/semantics';
import Textbox from '../../src/components/textbox';
import { useHydrated } from '../app/hydration';
import Code from '../components/code';
import Mono from '../components/mono';
import PageHeader from '../components/pageHeader';
import Reveal from '../components/reveal';
import SiteLink from '../components/siteLink';
import { Cell, HeadCell, Table, TableBody, TableHead, TableRow } from '../components/table';
import useTableOfContents from '../hooks/useTableOfContents';
import { PROP_QUERY } from '../site/searchQuery';
import {
  categoryCounts,
  categoryOf,
  declarationsFor,
  matchesSearch,
  namedValues,
  nestingKeys,
  plainProps,
  propCategories,
  propCount,
  props,
  scaleRows,
  traps,
  writtenExample,
} from './box';

export default function BoxPage() {
  useTableOfContents(sidebarLinks);

  return (
    <Box>
      <PageHeader
        icon={BoxIcon}
        title="Box"
        description={`One component, ${propCount} CSS properties as typed props, and no stylesheet anywhere. This page is the whole of it: what a Box is, the five things that are not what you would guess, and every prop with the CSS it writes.`}
      />

      <Reveal delay={0.1}>
        <Flex d="column" gap={12}>
          <WhatSection />
          <TrapsSection />
          <NumbersSection />
          <BuildSection />
          <NestingSection />
          <PlainPropsSection />
          <FinderSection />
        </Flex>
      </Reveal>
    </Box>
  );
}

function WhatSection() {
  return (
    <Section id="what" title="A Box is one element, and every style is a prop">
      <Flex d="column" gap={5}>
        <Box>
          <Mono>Box</Mono> renders a <Mono>&lt;div&gt;</Mono> and takes {propCount} CSS properties as props. There is no stylesheet to
          import, no class string to compose and no build step: the value you write is checked by the compiler, turned into one CSS rule,
          and given a class name that every element writing the same value shares.
        </Box>

        <Code
          label="Import it, and write CSS as props"
          language="jsx"
          code={`import Box from '@box-kite/react';

<Box p={4} borderRadius={2} bgColor="indigo-600" color="white" fontSize={14} fontWeight={600}>
  Ship it
</Box>`}
        >
          <Box p={4} borderRadius={2} bgColor="indigo-600" color="white" fontSize={14} fontWeight={600} display="inline-block">
            Ship it
          </Box>
        </Code>

        <Box>
          That is the entire idea, and most of what follows is consequences of it. The one thing worth knowing before you write anything is
          where a memory of another library will mislead you — which is the next five cards, and then you are done.
        </Box>
      </Flex>
    </Section>
  );
}

function TrapsSection() {
  return (
    <Section
      id="traps"
      title="Five things to know first"
      lead="Each of these typechecks either way, so the compiler will not catch it. They are the whole list."
    >
      <Flex d="column" gap={4}>
        {traps.map((trap, index) => (
          <Flex
            key={trap.id}
            d="column"
            gap={3}
            p={5}
            b={1}
            borderRadius={3}
            theme={{
              dark: { bgColor: 'slate-900', borderColor: 'slate-800' },
              light: { bgColor: 'white', borderColor: 'slate-200' },
            }}
          >
            <Flex gap={3} ai="baseline">
              <Flex
                flexShrink={0}
                width={6}
                height={6}
                borderRadius={10}
                ai="center"
                jc="center"
                fontSize={12}
                fontWeight={700}
                bgImage="gradient-primary"
                color="white"
              >
                {index + 1}
              </Flex>
              <Box>
                {/* The guess first and small, the truth in the heading: the other way round, a reader
                    skimming the headings comes away with the five things that are not true. */}
                <Box
                  fontSize={12}
                  fontWeight={500}
                  textTransform="uppercase"
                  letterSpacing={0.6}
                  mb={1}
                  theme={{ dark: { color: 'slate-500' }, light: { color: 'slate-500' } }}
                >
                  You might expect · {trap.guess}
                </Box>
                <Box fontSize={16} fontWeight={600} theme={{ dark: { color: 'white' }, light: { color: 'slate-900' } }}>
                  {trap.title}
                </Box>
              </Box>
            </Flex>

            <Box fontSize={15} lineHeight={26} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-600' } }}>
              {trap.answer}
            </Box>

            <Flex d="column" gap={2}>
              {trap.wrong && <Verdict kind="wrong">{trap.wrong}</Verdict>}
              <Verdict kind="right">{trap.right}</Verdict>
            </Flex>

            {trap.more && (
              <Box fontSize={13}>
                The whole story:{' '}
                <SiteLink
                  to={trap.more.to}
                  display="inline"
                  textDecoration="underline"
                  theme={{ dark: { color: 'violet-400' }, light: { color: 'violet-600' } }}
                >
                  {trap.more.label}
                </SiteLink>
              </Box>
            )}
          </Flex>
        ))}
      </Flex>
    </Section>
  );
}

/** One line of the wrong/right pair — a tick or a cross rather than colour alone, since a forced-colors mode keeps neither. */
function Verdict({ kind, children }: { kind: 'wrong' | 'right'; children: string }) {
  const isRight = kind === 'right';

  return (
    <Flex gap={3} ai="center" px={3} py={2} borderRadius={2} theme={{ dark: { bgColor: 'slate-950' }, light: { bgColor: 'slate-50' } }}>
      <Icon
        size={4}
        flexShrink={0}
        label={isRight ? 'Write this' : 'Not this'}
        theme={{
          dark: { color: isRight ? 'emerald-400' : 'rose-400' },
          light: { color: isRight ? 'emerald-600' : 'rose-600' },
        }}
      >
        {isRight ? <Check /> : <X />}
      </Icon>
      <Box
        tag="code"
        fontSize={13}
        lineHeight={20}
        whiteSpace="pre-wrap"
        theme={{ dark: { color: 'slate-300' }, light: { color: 'slate-700' } }}
      >
        {children}
      </Box>
    </Flex>
  );
}

/** The presets beside the number input: a small one, the unit step, and two that make the families diverge. */
const scalePresets = [1, 2, 4, 8, 16];

function NumbersSection() {
  const [value, setValue] = useState(4);

  return (
    <Section
      id="numbers"
      title="The numbers, measured"
      lead="The divider belongs to the prop, not to the library. Put one number in and see what each family does with it — every line below is the CSS this page asked the real engine for, not a formula written out beside it."
    >
      <Flex d="column" gap={5}>
        <Flex gap={3} ai="center" flexWrap="wrap" props={{ 'data-md': 'skip' }}>
          <Box fontSize={14} fontWeight={500} theme={{ dark: { color: 'slate-300' }, light: { color: 'slate-700' } }}>
            The number you write:
          </Box>
          <Textbox
            width={20}
            value={String(value)}
            onChange={(event) => setValue(Number(event.target.value) || 0)}
            type="number"
            step={1}
            props={{ 'aria-label': 'The number to write on every prop below' }}
          />
          {scalePresets.map((preset) => (
            <Button
              key={preset}
              clean
              px={3}
              py={1}
              fontSize={13}
              borderRadius={2}
              b={1}
              onClick={() => setValue(preset)}
              theme={{
                dark: {
                  bgColor: value === preset ? 'violet-950' : 'slate-800',
                  borderColor: value === preset ? 'violet-500' : 'slate-700',
                  color: 'slate-200',
                },
                light: {
                  bgColor: value === preset ? 'violet-50' : 'white',
                  borderColor: value === preset ? 'violet-400' : 'slate-200',
                  color: 'slate-800',
                },
              }}
            >
              {preset}
            </Button>
          ))}
        </Flex>

        <Box overflowX="auto">
          <Table>
            <TableHead>
              <TableRow>
                <HeadCell>You write</HeadCell>
                <HeadCell>The CSS it writes</HeadCell>
                <HeadCell whiteSpace="nowrap">Measured in</HeadCell>
                <HeadCell>Why</HeadCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {scaleRows.map((row) => (
                <TableRow key={row.prop}>
                  <Cell whiteSpace="nowrap">
                    <Mono>{`${row.prop}={${value}}`}</Mono>
                  </Cell>
                  <Cell whiteSpace="nowrap">
                    <Mono theme={{ dark: { color: 'emerald-300' }, light: { color: 'emerald-700' } }}>
                      {declarationsFor(row.prop, value) || 'nothing at all'}
                    </Mono>
                  </Cell>
                  <Cell whiteSpace="nowrap">{row.unit}</Cell>
                  <Cell>{row.note}</Cell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>

        <Flex gap={6} flexWrap="wrap" ai="flex-end" props={{ 'data-md': 'skip' }}>
          <ScaleSample label={`p={${value}}`}>
            <Box p={value} bgColor="violet-500" borderRadius={1}>
              <Box width={8} height={8} borderRadius={1} theme={{ dark: { bgColor: 'slate-900' }, light: { bgColor: 'white' } }} />
            </Box>
          </ScaleSample>
          <ScaleSample label={`b={${value}}`}>
            <Box width={16} height={16} b={value} borderColor="violet-500" borderRadius={1} />
          </ScaleSample>
          <ScaleSample label={`borderRadius={${value}}`}>
            <Box width={16} height={16} bgColor="violet-500" borderRadius={value} />
          </ScaleSample>
          <ScaleSample label={`fontSize={${value}}`}>
            <Box fontSize={value} lineHeight={value + 4} theme={{ dark: { color: 'slate-200' }, light: { color: 'slate-800' } }}>
              Aa
            </Box>
          </ScaleSample>
        </Flex>

        <Box fontSize={14} lineHeight={24} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-600' } }}>
          A value a prop does not accept writes <strong>nothing</strong> — no rule and no class name — rather than a broken declaration.
          That is why the reference below prints the CSS each prop really emits: a typed prop is a promise that what typechecks works.
        </Box>
      </Flex>
    </Section>
  );
}

function ScaleSample({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Flex d="column" gap={2} ai="flex-start">
      <Flex minHeight={20} ai="flex-end">
        {children}
      </Flex>
      <Mono fontSize={11}>{label}</Mono>
    </Flex>
  );
}

/** The card the page builds, one prop at a time — the snippet is a literal so `check:docs` compiles it. */
function BuildSection() {
  return (
    <Section
      id="build"
      title="Build a card, one prop at a time"
      lead="Six steps, each adding one idea. Copy any of them; they all run as they stand."
    >
      <Flex d="column" gap={8}>
        <Step
          title="1 · A Box is a div"
          note="No props at all. Box resets the browser's margins and padding to nothing and decides nothing else."
        >
          <Code language="jsx" code={`<Box>Monthly revenue</Box>`}>
            <Box>Monthly revenue</Box>
          </Code>
        </Step>

        <Step
          title="2 · Space and a surface — p, bgColor, borderRadius"
          note="p={4} is 1rem on all four sides. A colour is a palette token rather than a hex value, which is what lets a theme move it later."
        >
          <Code
            language="jsx"
            code={`<Box p={4} bgColor="white" borderRadius={2}>
  Monthly revenue
</Box>`}
          >
            <Box p={4} bgColor="white" borderRadius={2} color="slate-900" display="inline-block">
              Monthly revenue
            </Box>
          </Code>
        </Step>

        <Step
          title="3 · Edges — b, borderColor, shadow"
          note="b={1} is one pixel, not a quarter of a rem: border width is the family written out in pixels. shadow takes a named step rather than four numbers."
        >
          <Code
            language="jsx"
            code={`<Box p={4} bgColor="white" borderRadius={2} b={1} borderColor="slate-200" shadow="small">
  Monthly revenue
</Box>`}
          >
            <Box
              p={4}
              bgColor="white"
              borderRadius={2}
              b={1}
              borderColor="slate-200"
              shadow="small"
              color="slate-900"
              display="inline-block"
            >
              Monthly revenue
            </Box>
          </Code>
        </Step>

        <Step
          title="4 · Lay the content out — Flex, never display='flex'"
          note="Flex is a Box that has already decided its display, so the intent is in the element. Everything else is still a Box prop."
        >
          <Code
            language="jsx"
            code={`<Flex d="column" gap={1} p={4} bgColor="white" borderRadius={2} b={1} borderColor="slate-200" shadow="small">
  <Box fontSize={13} fontWeight={500} color="slate-500">Monthly revenue</Box>
  <Box fontSize={28} fontWeight={700} color="slate-900">$48,200</Box>
</Flex>`}
          >
            <Flex
              d="column"
              gap={1}
              p={4}
              bgColor="white"
              borderRadius={2}
              b={1}
              borderColor="slate-200"
              shadow="small"
              width="fit-content"
            >
              <Box fontSize={13} fontWeight={500} color="slate-500">
                Monthly revenue
              </Box>
              <Box fontSize={28} fontWeight={700} color="slate-900">
                $48,200
              </Box>
            </Flex>
          </Code>
        </Step>

        <Step
          title="5 · Answer the pointer — hover, transitionDuration"
          note="hover takes the same props again. Nothing re-renders when the pointer arrives: both states were in the stylesheet before the page loaded."
        >
          <Code
            language="jsx"
            code={`<Flex
  d="column"
  gap={1}
  p={4}
  bgColor="white"
  borderRadius={2}
  b={1}
  borderColor="slate-200"
  shadow="small"
  transitionDuration={150}
  hover={{ shadow: 'medium', translateY: -0.5, borderColor: 'indigo-300' }}
>
  <Box fontSize={13} fontWeight={500} color="slate-500">Monthly revenue</Box>
  <Box fontSize={28} fontWeight={700} color="slate-900">$48,200</Box>
</Flex>`}
          >
            <Flex
              d="column"
              gap={1}
              p={4}
              bgColor="white"
              borderRadius={2}
              b={1}
              borderColor="slate-200"
              shadow="small"
              width="fit-content"
              transitionDuration={150}
              hover={{ shadow: 'medium', translateY: -0.5, borderColor: 'indigo-300' }}
            >
              <Box fontSize={13} fontWeight={500} color="slate-500">
                Monthly revenue
              </Box>
              <Box fontSize={28} fontWeight={700} color="slate-900">
                $48,200
              </Box>
            </Flex>
          </Code>
        </Step>

        <Step
          title="6 · Answer the theme and the width — theme, md"
          note="A theme and a breakpoint nest the way hover does. Six props deep, one element, and still no stylesheet — switch this page's theme and watch the card follow."
        >
          <Code
            language="jsx"
            code={`<Flex
  d="column"
  gap={1}
  p={4}
  md={{ p: 6 }}
  bgColor="white"
  borderRadius={2}
  b={1}
  borderColor="slate-200"
  shadow="small"
  transitionDuration={150}
  hover={{ shadow: 'medium', translateY: -0.5, borderColor: 'indigo-300' }}
  theme={{ dark: { bgColor: 'slate-800', borderColor: 'slate-700', hover: { borderColor: 'indigo-500' } } }}
>
  <Box fontSize={13} fontWeight={500} color="slate-500">Monthly revenue</Box>
  <Box fontSize={28} fontWeight={700} color="slate-900" theme={{ dark: { color: 'white' } }}>$48,200</Box>
</Flex>`}
          >
            <Flex
              d="column"
              gap={1}
              p={4}
              md={{ p: 6 }}
              bgColor="white"
              borderRadius={2}
              b={1}
              borderColor="slate-200"
              shadow="small"
              width="fit-content"
              transitionDuration={150}
              hover={{ shadow: 'medium', translateY: -0.5, borderColor: 'indigo-300' }}
              theme={{ dark: { bgColor: 'slate-800', borderColor: 'slate-700', hover: { borderColor: 'indigo-500' } } }}
            >
              <Box fontSize={13} fontWeight={500} color="slate-500">
                Monthly revenue
              </Box>
              <Box fontSize={28} fontWeight={700} color="slate-900" theme={{ dark: { color: 'white' } }}>
                $48,200
              </Box>
            </Flex>
          </Code>
        </Step>
      </Flex>
    </Section>
  );
}

function Step({ title, note, children }: { title: string; note: string; children: ReactNode }) {
  return (
    <Flex d="column" gap={3}>
      <H3 fontSize={16} fontWeight={600} theme={{ dark: { color: 'white' }, light: { color: 'slate-900' } }}>
        {title}
      </H3>
      <Box fontSize={14} lineHeight={24} maxWidth={200} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-600' } }}>
        {note}
      </Box>
      {children}
    </Flex>
  );
}

function NestingSection() {
  return (
    <Section
      id="nesting"
      title="One prop, many states"
      lead="A nesting key takes the same props again, and they compose in either direction — a breakpoint inside a theme, a hover inside a container query. Every combination is one more rule in the stylesheet and no more work at runtime."
    >
      <Flex d="column" gap={5}>
        <Code
          label="A button that answers four different things"
          language="jsx"
          code={`<Box
  tag="button"
  px={4}
  py={2}
  borderRadius={2}
  bgColor="indigo-600"
  color="white"
  transitionDuration={150}
  hover={{ bgColor: 'indigo-500' }}
  focus={{ outline: 2, outlineColor: 'indigo-400', outlineOffset: 2 }}
  md={{ px: 6 }}
  theme={{ dark: { bgColor: 'indigo-500', hover: { bgColor: 'indigo-400' } } }}
>
  Hover me, focus me, resize me
</Box>`}
        >
          <Box
            tag="button"
            px={4}
            py={2}
            borderRadius={2}
            bgColor="indigo-600"
            color="white"
            fontSize={14}
            b={0}
            cursor="pointer"
            transitionDuration={150}
            hover={{ bgColor: 'indigo-500' }}
            focus={{ outline: 2, outlineColor: 'indigo-400', outlineOffset: 2 }}
            md={{ px: 6 }}
            theme={{ dark: { bgColor: 'indigo-500', hover: { bgColor: 'indigo-400' } } }}
          >
            Hover me, focus me, resize me
          </Box>
        </Code>

        <Box overflowX="auto">
          <Table>
            <TableHead>
              <TableRow>
                <HeadCell>Key</HeadCell>
                <HeadCell>What it selects</HeadCell>
                <HeadCell>Written</HeadCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {nestingKeys.map((key) => (
                <TableRow key={key.keys}>
                  <Cell>
                    <Mono whiteSpace="normal">{key.keys}</Mono>
                  </Cell>
                  <Cell>
                    {key.what}
                    {key.more && (
                      <>
                        {' '}
                        <SiteLink
                          to={key.more.to}
                          display="inline"
                          whiteSpace="nowrap"
                          textDecoration="underline"
                          theme={{ dark: { color: 'violet-400' }, light: { color: 'violet-600' } }}
                        >
                          {key.more.label}
                        </SiteLink>
                      </>
                    )}
                  </Cell>
                  <Cell>
                    <Mono whiteSpace="normal">{key.example}</Mono>
                  </Cell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      </Flex>
    </Section>
  );
}

function PlainPropsSection() {
  return (
    <Section
      id="plain"
      title="The props that are not styles"
      lead="Nine names on Box mean something other than CSS. If you are looking for one of these in the reference below, this is why it is not there."
    >
      <Box overflowX="auto">
        <Table>
          <TableHead>
            <TableRow>
              <HeadCell>Prop</HeadCell>
              <HeadCell>Type</HeadCell>
              <HeadCell>What it does</HeadCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {plainProps.map((prop) => (
              <TableRow key={prop.name}>
                <Cell whiteSpace="nowrap">
                  <Mono>{prop.name}</Mono>
                </Cell>
                <Cell>
                  <Mono whiteSpace="normal">{prop.type}</Mono>
                </Cell>
                <Cell>{prop.what}</Cell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </Section>
  );
}

function FinderSection() {
  // Docs search sends a prop result here as `?prop=fontSize`, so the table opens on the one row that
  // answers the question — the finder is the prop reference, and a reader should not search it twice.
  const [params] = useSearchParams();
  const { key } = useLocation();
  // Not while the prerendered HTML is being adopted: that copy was rendered with no query on it, so a
  // filtered table on the first render is a hydration mismatch — React #418, measured on a direct load
  // of /box?prop=fontSize before this line existed.
  const asked = useHydrated() ? (params.get(PROP_QUERY) ?? '') : '';
  const [typed, setTyped] = useState<string | null>(null);
  const search = typed ?? asked;

  // A search that lands here again is a navigation whether or not the address changed, so the field
  // goes back to answering the query.
  const [previous, setPrevious] = useState(key);
  if (key !== previous) {
    setPrevious(key);
    setTyped(null);
  }

  const [category, setCategory] = useState<string | null>(null);
  const counts = useMemo(() => categoryCounts(), []);

  const found = useMemo(
    () => props.filter((prop) => matchesSearch(prop, search) && (!category || categoryOf(prop).id === category)),
    [search, category],
  );

  const active = category ? propCategories.find((entry) => entry.id === category) : undefined;

  return (
    <Section
      id="finder"
      title={`Every prop, searchable`}
      lead={`All ${propCount} of them, with the CSS each one writes — measured from the engine when the reference was generated, so an example here is never a guess. Search by prop name, by CSS property or by a value you are looking for.`}
    >
      <Flex d="column" gap={5}>
        <Flex d="column" gap={3} props={{ 'data-md': 'skip' }}>
          <Flex ai="center" gap={3} position="relative">
            <Box position="absolute" left={3} display="flex" theme={{ dark: { color: 'slate-500' }, light: { color: 'slate-400' } }}>
              <Icon size={4}>
                <Search />
              </Icon>
            </Box>
            <Textbox
              flex1
              pl={10}
              value={search}
              onChange={(event) => setTyped(event.target.value)}
              type="search"
              placeholder="padding, background-color, sticky…"
              props={{ 'aria-label': 'Search the props' }}
            />
          </Flex>

          <Flex gap={2} flexWrap="wrap">
            <FilterChip active={!category} onClick={() => setCategory(null)} count={propCount}>
              All
            </FilterChip>
            {propCategories.map((entry) => (
              <FilterChip
                key={entry.id}
                active={category === entry.id}
                onClick={() => setCategory(category === entry.id ? null : entry.id)}
                count={counts[entry.id] ?? 0}
              >
                {entry.label}
              </FilterChip>
            ))}
          </Flex>

          {active && (
            <Box fontSize={14} lineHeight={24} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-600' } }}>
              {active.blurb}
            </Box>
          )}

          <Box fontSize={13} theme={{ dark: { color: 'slate-500' }, light: { color: 'slate-500' } }} props={{ role: 'status' }}>
            {found.length === propCount ? `${propCount} props` : `${found.length} of ${propCount} props`}
          </Box>
        </Flex>

        {found.length === 0 ? (
          <Box fontSize={15} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-600' } }}>
            Nothing matches that. If the property genuinely has no prop, <Mono>css</Mono> is the one-off and <Mono>Box.extend()</Mono> is
            the answer for anything you will write twice —{' '}
            <SiteLink
              to="/escape-hatch"
              display="inline"
              textDecoration="underline"
              theme={{ dark: { color: 'violet-400' }, light: { color: 'violet-600' } }}
            >
              both are here
            </SiteLink>
            .
          </Box>
        ) : (
          // Out of the markdown mirror: the same table, generated from the same file, is already served
          // at /props.md, and mirroring it here would put 85 KB of it in llms-full.txt a second time.
          <Box overflowX="auto" props={{ 'data-md': 'skip' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <HeadCell>Prop</HeadCell>
                  <HeadCell>Example</HeadCell>
                  <HeadCell>The CSS it writes</HeadCell>
                  <HeadCell>What it does</HeadCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {found.map((prop) => (
                  <TableRow key={prop.name}>
                    <Cell whiteSpace="nowrap" css={{ verticalAlign: 'top' }}>
                      <Mono>{prop.name}</Mono>
                      <Box fontSize={11} mt={1} theme={{ dark: { color: 'slate-600' }, light: { color: 'slate-400' } }}>
                        {categoryOf(prop).label}
                      </Box>
                    </Cell>
                    <Cell css={{ verticalAlign: 'top' }}>
                      <Mono whiteSpace="normal">{writtenExample(prop)}</Mono>
                    </Cell>
                    <Cell css={{ verticalAlign: 'top' }}>
                      <Mono whiteSpace="normal" theme={{ dark: { color: 'emerald-300' }, light: { color: 'emerald-700' } }}>
                        {prop.example.css}
                      </Mono>
                    </Cell>
                    <Cell css={{ verticalAlign: 'top' }}>
                      <Prose text={prop.description} />
                      {namedValues(prop) && (
                        <Box fontSize={12} mt={2} theme={{ dark: { color: 'slate-500' }, light: { color: 'slate-500' } }}>
                          {namedValues(prop)}
                        </Box>
                      )}
                    </Cell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}

        <Box fontSize={14} lineHeight={24} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-600' } }}>
          The same table as one file, for an editor or an agent, is{' '}
          <Box
            tag="a"
            display="inline"
            props={{ href: '/props.md' }}
            textDecoration="underline"
            theme={{ dark: { color: 'violet-400' }, light: { color: 'violet-600' } }}
          >
            /props.md
          </Box>
          . Everything Box carries that is <em>not</em> a prop — <Mono>Box.extend()</Mono>, <Mono>Box.components()</Mono>,{' '}
          <Mono>Box.Theme</Mono> and the rest — is on{' '}
          <SiteLink
            to="/box-functions"
            display="inline"
            textDecoration="underline"
            theme={{ dark: { color: 'violet-400' }, light: { color: 'violet-600' } }}
          >
            Box functions
          </SiteLink>
          .
        </Box>
      </Flex>
    </Section>
  );
}

function FilterChip({ active, count, onClick, children }: { active: boolean; count: number; onClick: () => void; children: ReactNode }) {
  return (
    <Button
      clean
      px={3}
      py={1.5}
      fontSize={13}
      borderRadius={10}
      b={1}
      cursor="pointer"
      onClick={onClick}
      props={{ 'aria-pressed': active }}
      theme={{
        dark: {
          bgColor: active ? 'violet-950' : 'slate-800',
          borderColor: active ? 'violet-500' : 'slate-700',
          color: active ? 'violet-200' : 'slate-300',
        },
        light: {
          bgColor: active ? 'violet-50' : 'white',
          borderColor: active ? 'violet-400' : 'slate-200',
          color: active ? 'violet-700' : 'slate-700',
        },
      }}
    >
      <Flex ai="center" gap={2}>
        {children}
        <Span display="inline" fontSize={11} theme={{ dark: { color: 'slate-500' }, light: { color: 'slate-400' } }}>
          {count}
        </Span>
      </Flex>
    </Button>
  );
}

/** The generated descriptions are JSDoc, so a prop name in one is written in backticks — the /button page's rule. */
function Prose({ text }: { text: string }) {
  return (
    <>
      {text.split('`').map((part, index) =>
        index % 2 === 1 ? (
          <Mono key={index} whiteSpace="normal">
            {part}
          </Mono>
        ) : (
          part
        ),
      )}
    </>
  );
}

function Section({ id, title, lead, children }: { id: string; title: string; lead?: string; children: ReactNode }) {
  return (
    <Box id={id}>
      <H2 fontSize={22} fontWeight={600} mb={lead ? 3 : 5} theme={{ dark: { color: 'white' }, light: { color: 'slate-900' } }}>
        {title}
      </H2>
      {lead && (
        <Box fontSize={15} lineHeight={26} mb={5} maxWidth={220} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-600' } }}>
          {lead}
        </Box>
      )}
      <Box fontSize={15} lineHeight={26} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-600' } }}>
        {children}
      </Box>
    </Box>
  );
}

const sidebarLinks = [
  { id: 'what', label: 'What a Box is' },
  { id: 'traps', label: 'Five things first' },
  { id: 'numbers', label: 'The numbers' },
  { id: 'build', label: 'Build a card' },
  { id: 'nesting', label: 'One prop, many states' },
  { id: 'plain', label: 'Not styles' },
  { id: 'finder', label: 'Every prop' },
];
