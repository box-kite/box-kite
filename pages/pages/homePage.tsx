import { ArrowRight, Check, Keyboard, Server, Table2, Type } from 'lucide-react';
import { ReactNode } from 'react';
import { version } from '../../package.json';
import Box from '../../src/box';
import Button from '../../src/components/button';
import Flex from '../../src/components/flex';
import Grid from '../../src/components/grid';
import Icon from '../../src/components/icon';
import { H1, H2, H3, Li, Link, P, Ul } from '../../src/components/semantics';
import Code from '../components/code';
import Mono from '../components/mono';
import Reveal from '../components/reveal';
import SiteLink from '../components/siteLink';
import { Cell, HeadCell, Table, TableBody, TableHead, TableRow } from '../components/table';
import { products, VERIFIED_ON } from './gridComparison';
import { APG_PATTERNS, completions, patternRows, Pillar, pillars, quotedTiers, totals, typeProof } from './home';
import SiGithub from '~icons/simple-icons/github';

/** One icon per pillar, keyed by the anchor its card jumps to. */
const PILLAR_ICONS = { typed: Type, accessible: Keyboard, server: Server, grid: Table2 };

/** The four colours the hand-written code lines use — a syntax theme small enough to be a record. */
const TOKEN_COLORS = {
  punct: { dark: 'slate-500', light: 'slate-400' },
  tag: { dark: 'emerald-400', light: 'emerald-600' },
  attr: { dark: 'sky-300', light: 'sky-700' },
  value: { dark: 'amber-300', light: 'amber-700' },
} as const;

/**
 * One coloured run of a code line. A `span` rather than a Box's default `div`: the markdown mirror puts
 * a space around every block child, so a line built out of divs reads `p ={4}` in `index.md`.
 */
function Tok({ kind, children }: { kind: keyof typeof TOKEN_COLORS; children: ReactNode }) {
  const { dark, light } = TOKEN_COLORS[kind];

  return (
    <Box tag="span" display="inline" theme={{ dark: { color: dark }, light: { color: light } }}>
      {children}
    </Box>
  );
}

export default function HomePage() {
  return (
    <Box>
      <Hero />
      {/* Outside the hero's column flex on purpose: a flex item shrink-to-fits, and this card's nowrap
          rows give it a min-content wider than a phone (15px of page scroll, measured). */}
      <Reveal delay={0.4} y={8}>
        <Box pb={10}>
          <CompletionDemo />
        </Box>
      </Reveal>
      <Pillars />
      <TypedSection />
      <AccessibleSection />
      <ServerSection />
      <GridSection />
      <QuickStart />
      <HealthSignals />
    </Box>
  );
}

function Hero() {
  return (
    <Flex d="column" ai="center" textAlign="center" pt={6} lg={{ pt: 10 }}>
      <Reveal>
        <SiteLink
          to="/releases"
          display="flex"
          ai="center"
          gap={2}
          px={4}
          py={2}
          borderRadius={10}
          theme={{ dark: { bgColor: 'slate-800', color: 'indigo-300' }, light: { bgColor: 'indigo-50', color: 'indigo-700' } }}
          fontSize={13}
          fontWeight={500}
          mb={6}
        >
          Version {version}
          <Icon size={3.5}>
            <ArrowRight />
          </Icon>
        </SiteLink>
      </Reveal>

      <Reveal delay={0.1}>
        <H1
          fontSize={32}
          sm={{ fontSize: 44, lineHeight: 52 }}
          lg={{ fontSize: 54, lineHeight: 62 }}
          fontWeight={800}
          lineHeight={40}
          letterSpacing={-1}
          textWrap="balance"
          mb={6}
          maxWidth={190}
        >
          <Box theme={{ dark: { color: 'white' }, light: { color: 'slate-900' } }}>Every CSS property is a typed prop.</Box>
          {/* The library's own gradient-on-text, which is inert without the transparent colour beside it. */}
          <Box
            width="fit-content"
            mx="auto"
            bgGradient={{ linear: 'r', colors: ['indigo-500', 'violet-500', 'pink-500'] }}
            bgClip="text"
            color="transparent"
          >
            Nothing to import. Nothing to merge.
          </Box>
        </H1>
      </Reveal>

      <Reveal delay={0.2}>
        <P
          fontSize={16}
          sm={{ fontSize: 18 }}
          theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-600' } }}
          maxWidth={160}
          lineHeight={28}
          mb={10}
        >
          {totals.props} props your editor completes and the compiler checks, {totals.components} components with the keyboard and the ARIA
          already in them, and a data grid that costs nothing. No stylesheet, no build step, no <Mono>&apos;use client&apos;</Mono>.
        </P>
      </Reveal>

      <Reveal delay={0.3}>
        <Flex gap={4} d="column" sm={{ d: 'row' }} mb={12}>
          <SiteLink to="/installation">
            <Button px={6} py={3} fontSize={15}>
              <Flex ai="center" gap={2}>
                Get started
                <ArrowRight size={18} />
              </Flex>
            </Button>
          </SiteLink>
          <Link props={{ href: 'https://github.com/box-kite/box-kite', target: '_blank', rel: 'noopener noreferrer' }}>
            <Button variant="secondary" px={6} py={3} fontSize={15} theme={{ dark: { color: 'slate-300' }, light: { color: 'slate-700' } }}>
              <Flex ai="center" gap={2}>
                <Icon size={4.5}>
                  <SiGithub />
                </Icon>
                View on GitHub
              </Flex>
            </Button>
          </Link>
        </Flex>
      </Reveal>
    </Flex>
  );
}

/**
 * The editor, as far as a static page can show one: a line being typed and the completion list under it.
 * Every row is a prop's measured example out of the generated reference, so the CSS column is what the
 * engine writes rather than an illustration of it — which is the point the panel exists to make.
 */
function CompletionDemo() {
  return (
    <Box
      textAlign="start"
      maxWidth={180}
      mx="auto"
      borderRadius={3}
      b={1}
      overflow="hidden"
      shadow="lg"
      theme={{
        dark: { bgColor: 'slate-900', borderColor: 'slate-700' },
        light: { bgColor: 'white', borderColor: 'slate-200' },
      }}
    >
      <Box
        props={{ 'data-md': 'skip' }}
        px={4}
        py={2.5}
        bb={1}
        fontSize={12}
        theme={{
          dark: { bgColor: 'slate-800', borderColor: 'slate-700', color: 'slate-400' },
          light: { bgColor: 'slate-50', borderColor: 'slate-200', color: 'slate-500' },
        }}
      >
        Card.tsx
      </Box>

      {/* `tag="code"` is the monospace: the UA stylesheet gives it, and nothing here overrides a font. */}
      <Box tag="code" display="block" px={4} py={4} fontSize={13} lineHeight={22}>
        <Flex props={{ 'data-md': 'skip' }} ai="center" whiteSpace="nowrap" overflow="auto">
          <Tok kind="punct">&lt;</Tok>
          <Tok kind="tag">Flex</Tok>
          <Tok kind="attr">&nbsp;d=&quot;column&quot;&nbsp;gap</Tok>
          {/* The caret rides the `pulse` preset, so reduced motion stops it with nothing declared. */}
          <Box
            display="inline-block"
            width={0.5}
            height={4}
            ml={0.5}
            flexShrink={0}
            animation="pulse"
            theme={{ dark: { bgColor: 'slate-200' }, light: { bgColor: 'slate-700' } }}
            props={{ 'data-md': 'skip' }}
          />
        </Flex>

        <Box
          mt={3}
          b={1}
          borderRadius={2}
          overflow="hidden"
          theme={{ dark: { borderColor: 'slate-700', bgColor: 'slate-800' }, light: { borderColor: 'slate-200', bgColor: 'slate-50' } }}
        >
          {completions.map((completion, index) => (
            <Flex
              key={completion.prop}
              props={{ 'data-md': 'inline' }}
              gap={3}
              ai="center"
              px={3}
              py={2}
              bt={index === 0 ? 0 : 1}
              theme={{
                dark: { borderColor: 'slate-700', bgColor: index === 0 ? 'indigo-500/20' : 'transparent' },
                light: { borderColor: 'slate-200', bgColor: index === 0 ? 'indigo-500/10' : 'transparent' },
              }}
            >
              <Box width={36} flexShrink={0} whiteSpace="nowrap" overflow="hidden">
                <Tok kind="attr">{completion.prop}</Tok>
                <Tok kind="value">={completion.written}</Tok>
              </Box>
              <Box flex1 whiteSpace="nowrap" overflow="hidden" theme={{ dark: { color: 'slate-300' }, light: { color: 'slate-700' } }}>
                {completion.css}
              </Box>
              <Box
                display="none"
                lg={{ display: 'block' }}
                flexShrink={0}
                fontSize={12}
                textAlign="end"
                theme={{ dark: { color: 'slate-500' }, light: { color: 'slate-500' } }}
              >
                {completion.note}
              </Box>
            </Flex>
          ))}
        </Box>
      </Box>

      <Box
        px={4}
        py={3}
        bt={1}
        fontSize={13}
        lineHeight={20}
        theme={{
          dark: { borderColor: 'slate-700', color: 'slate-400' },
          light: { borderColor: 'slate-200', color: 'slate-600' },
        }}
      >
        The same <Mono>4</Mono> is a rem here and a pixel there, because a padding and a border are not measured the same way. The editor
        knows which is which; a class name cannot.
      </Box>
    </Box>
  );
}

function Pillars() {
  return (
    <Reveal y={8} delay={0.5}>
      <Grid gridTemplateColumns={1} md={{ gridTemplateColumns: 2 }} gap={5} pb={10}>
        {pillars.map((pillar) => (
          <PillarCard key={pillar.id} pillar={pillar} />
        ))}
      </Grid>
    </Reveal>
  );
}

function PillarCard({ pillar }: { pillar: Pillar }) {
  const PillarIcon = PILLAR_ICONS[pillar.id as keyof typeof PILLAR_ICONS];

  return (
    <Link
      props={{ href: `#${pillar.id}` }}
      display="block"
      p={5}
      b={1}
      borderRadius={3}
      height="fit"
      transition="transform"
      transitionDuration={200}
      hover={{ translateY: -1 }}
      theme={{
        dark: { bgColor: 'slate-800', borderColor: 'slate-700', color: 'slate-400' },
        light: { bgColor: 'white', borderColor: 'slate-200', color: 'slate-600' },
      }}
    >
      <Flex width={11} height={11} ai="center" jc="center" bgImage="gradient-primary" borderRadius={2} color="white" mb={4}>
        <Icon size={5.5}>
          <PillarIcon />
        </Icon>
      </Flex>
      <H3 fontSize={17} fontWeight={600} mb={2} theme={{ dark: { color: 'white' }, light: { color: 'slate-900' } }}>
        {pillar.title}
      </H3>
      <Box fontSize={14} lineHeight={22} mb={3}>
        {pillar.claim}
      </Box>
      <Flex ai="center" gap={2} fontSize={13} fontWeight={500} theme={{ dark: { color: 'indigo-300' }, light: { color: 'indigo-600' } }}>
        {pillar.proof}
        <Icon size={3.5}>
          <ArrowRight />
        </Icon>
      </Flex>
    </Link>
  );
}

function TypedSection() {
  return (
    <Section id="typed" eyebrow="01" title="A value the palette does not have is an error">
      <P mb={6}>
        Both columns below make the same mistake: no palette family has a <Mono>550</Mono> step. Only one of them says so.
      </P>

      <Grid gridTemplateColumns={1} md={{ gridTemplateColumns: 2 }} gap={5} mb={6}>
        <ProofPanel
          tone="muted"
          title="A class name"
          caption="No error anywhere — not in the editor, not in the build, not at runtime. The element renders with no background."
        >
          <Box tag="code" display="block" fontSize={13} lineHeight={22}>
            <Tok kind="punct">&lt;div className=</Tok>
            <Tok kind="value">&quot;rounded-lg bg-{typeProof.wrong} p-4&quot;</Tok>
            <Tok kind="punct">&gt;</Tok>
          </Box>
        </ProofPanel>

        <ProofPanel
          tone="error"
          title="A typed prop"
          caption="The compiler's own message. This site's test suite re-runs it rather than trusting what is printed here."
        >
          <Box tag="code" display="block" fontSize={13} lineHeight={22}>
            <Tok kind="punct">&lt;</Tok>
            <Tok kind="tag">Box</Tok>
            <Tok kind="attr">&nbsp;bgColor=</Tok>
            {/* The squiggle is the one thing in this panel drawn rather than measured. */}
            <Box
              tag="span"
              display="inline"
              textDecoration="underline"
              css={{ textDecorationStyle: 'wavy', textUnderlineOffset: '3px' }}
              theme={{
                dark: { color: 'amber-300', css: { textDecorationColor: 'red-400' } },
                light: { color: 'amber-700', css: { textDecorationColor: 'red-500' } },
              }}
            >
              &quot;{typeProof.wrong}&quot;
            </Box>
            <Tok kind="attr">
              &nbsp;borderRadius={'{2}'}&nbsp;p={'{4}'}
            </Tok>
            <Tok kind="punct">&nbsp;/&gt;</Tok>
          </Box>

          {/* The wrapper is what the markdown mirror breaks on: two `code` siblings are one line to it. */}
          <Box mt={4}>
            <Box
              tag="code"
              display="block"
              p={3}
              borderRadius={2}
              fontSize={12}
              lineHeight={20}
              theme={{ dark: { bgColor: 'red-500/15', color: 'red-300' }, light: { bgColor: 'red-500/10', color: 'red-700' } }}
            >
              <Box tag="span" display="inline" fontWeight={600}>
                error TS{typeProof.code}:{' '}
              </Box>
              {typeProof.head}{' '}
              <Box tag="span" display="inline" fontStyle="italic" opacity={0.7}>
                ({typeProof.elision})
              </Box>
              {typeProof.tail}
            </Box>
          </Box>
        </ProofPanel>
      </Grid>

      <Ul display="flex" d="column" gap={3} listStyle="none" p={0} m={0}>
        <Point>
          <strong>Nothing merges.</strong> Two components setting the same prop resolve by prop, last one wins — so there is no{' '}
          <Mono>tailwind-merge</Mono>, no <Mono>clsx</Mono> and no specificity to hold in your head.
        </Point>
        <Point>
          <strong>The class is shared.</strong> <Mono>p={'{4}'}</Mono> is one rule however many components write it, generated the first
          time it is used and reused after that.
        </Point>
        <Point>
          <strong>The 5% has a door.</strong> A property with no prop goes in <Mono>css=&#123;&#123; … &#125;&#125;</Mono>, which still
          compiles to a shared class — never a <Mono>style</Mono> attribute.
        </Point>
      </Ul>

      <Flex props={{ 'data-md': 'inline' }} gap={5} mt={6} flexWrap="wrap">
        <SectionLink to="/box">Every prop, with the CSS it writes</SectionLink>
        <SectionLink to="/tailwind-parity">The Tailwind map, gaps marked</SectionLink>
      </Flex>
    </Section>
  );
}

function AccessibleSection() {
  return (
    <Section id="accessible" eyebrow="02" title="Ten patterns, and the tests that say so">
      <P mb={6}>
        Every pre-built component ships with its roles, its ARIA and its keyboard map. The two numbers beside each one come out of the
        generated reference: how many keyboard rows that component documents, and how many fixtures the axe sweep renders it in.
      </P>

      <Box overflow="auto" mb={6}>
        <Table width="auto">
          <TableHead>
            <TableRow>
              <HeadCell>Component</HeadCell>
              <HeadCell>W3C pattern</HeadCell>
              <HeadCell>Keyboard rows</HeadCell>
              <HeadCell>Axe fixtures</HeadCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {patternRows.map((row) => (
              <TableRow key={row.name}>
                <Cell>
                  <SiteLink
                    to={row.route}
                    fontWeight={500}
                    theme={{ dark: { color: 'violet-400' }, light: { color: 'violet-600' } }}
                    hover={{ textDecoration: 'underline' }}
                  >
                    {row.name}
                  </SiteLink>
                </Cell>
                <Cell>
                  <Link
                    props={{ href: `${APG_PATTERNS}${row.pattern}/`, target: '_blank', rel: 'noopener noreferrer' }}
                    display="inline"
                    theme={{ dark: { color: 'slate-300' }, light: { color: 'slate-700' } }}
                    hover={{ textDecoration: 'underline' }}
                  >
                    {row.pattern}
                  </Link>
                </Cell>
                <Cell>{row.keyboard}</Cell>
                <Cell>{row.fixtures}</Cell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>

      <Grid gridTemplateColumns={1} sm={{ gridTemplateColumns: 3 }} gap={4} mb={6}>
        <Stat value={String(totals.keyboardRows)} label="keyboard rows documented and driven, across every component" />
        <Stat value={String(totals.fixtures)} label={`axe fixtures rendered on every commit, over ${totals.components} components`} />
        <Stat value={String(totals.knownViolations)} label="violations in the ledger, which fails on a listed one that stops firing too" />
      </Grid>

      <Flex props={{ 'data-md': 'inline' }} gap={5} flexWrap="wrap">
        <SectionLink to="/menu">A menu button, submenus and all</SectionLink>
        <SectionLink to="/combobox">A combobox over 10,000 rows</SectionLink>
      </Flex>
    </Section>
  );
}

function ServerSection() {
  return (
    <Section id="server" eyebrow="03" title="A Server Component, with nothing added to it">
      <P mb={6}>
        A Server Component cannot inject styles: there is no effect to run and no document to write to. The <Mono>react-server</Mono>{' '}
        condition resolves to a build of Box that calls no hook and touches no DOM, and the rules it needs come back as{' '}
        <Mono>&lt;style href precedence&gt;</Mono> elements React 19 hoists and dedupes. Importing the package is the whole setup.
      </P>

      <Code
        label="app/page.tsx — no 'use client', no provider, no stylesheet"
        language="jsx"
        codeOnly
        code={`import Flex from '@box-kite/react/components/flex';
import { H1, P } from '@box-kite/react/components/semantics';

export default function Page() {
  return (
    <Flex d="column" gap={2} p={6} borderRadius={2} bgColor="slate-50" theme={{ dark: { bgColor: 'slate-900' } }}>
      <H1 fontSize={24} fontWeight={600}>Rendered on the server</H1>
      <P color="slate-600" hover={{ color: 'sky-500' }}>Pseudo-classes, breakpoints and themes are just more rules.</P>
    </Flex>
  );
}`}
      />

      <Ul display="flex" d="column" gap={3} listStyle="none" p={0} mt={6} mb={6}>
        <Point>
          <strong>The boundary is a check, not a promise.</strong> CI fails if the <Mono>react-server</Mono> entry reaches a client hook, or
          if the engine itself imports React.
        </Point>
        <Point>
          <strong>The class names match.</strong> They are content hashes, so the class the server resolved is the class the browser bundle
          resolves — there is no hydration mismatch to configure away.
        </Point>
        <Point>
          <strong>This site is the proof.</strong> Every page here is prerendered in Node through the library&rsquo;s own{' '}
          <Mono>getStyles()</Mono>, and a Next.js App Router example is built and smoke-tested on every commit.
        </Point>
      </Ul>

      <Flex props={{ 'data-md': 'inline' }} gap={5} flexWrap="wrap">
        <SectionLink to="/server-components">How the server path works</SectionLink>
        <SectionLink to="/installation">Install it</SectionLink>
      </Flex>
    </Section>
  );
}

function GridSection() {
  const quoted = products.filter((product) => (quotedTiers as readonly string[]).includes(product.id));

  return (
    <Section id="grid" eyebrow="04" title="The data grid is in the box">
      <P mb={6}>
        Sorting, multi-column grouping with aggregation, row virtualization over 100,000 rows, tree data, a server-side row model, range
        selection with clipboard paste, cell editing and a styled XLSX export. The same MIT package as everything else, taking Box props
        like everything else.
      </P>

      <Grid gridTemplateColumns={1} sm={{ gridTemplateColumns: 2 }} lg={{ gridTemplateColumns: 4 }} gap={4} mb={5}>
        <Stat value="Free" label="MIT, one tier, and this is it" accent />
        {quoted.map((product) => (
          <Stat key={product.id} value={product.price ?? ''} label={`${product.name} — ${product.terms ?? ''}`} />
        ))}
      </Grid>

      <P fontSize={13} mb={6} theme={{ dark: { color: 'slate-500' }, light: { color: 'slate-500' } }}>
        Prices as each vendor&rsquo;s own pricing page printed them on {VERIFIED_ON}. The feature-by-feature table, including the two rows
        this library loses, is on the{' '}
        <SiteLink
          to="/grid-comparison"
          display="inline"
          theme={{ dark: { color: 'violet-400' }, light: { color: 'violet-600' } }}
          hover={{ textDecoration: 'underline' }}
        >
          comparison page
        </SiteLink>
        .
      </P>

      <Flex props={{ 'data-md': 'inline' }} gap={5} flexWrap="wrap">
        <SectionLink to="/datagrid">The grid, with every feature demoed</SectionLink>
        <SectionLink to="/benchmark">The 100,000-row benchmark</SectionLink>
        <SectionLink to="/grid-comparison">What the market charges</SectionLink>
      </Flex>
    </Section>
  );
}

function QuickStart() {
  return (
    <Reveal y={8}>
      <Box py={12}>
        <H2
          fontSize={24}
          sm={{ fontSize: 30 }}
          fontWeight={700}
          textAlign="center"
          mb={3}
          theme={{ dark: { color: 'white' }, light: { color: 'slate-900' } }}
        >
          Two dependencies and no configuration
        </H2>
        <P
          fontSize={16}
          textAlign="center"
          maxWidth={140}
          mx="auto"
          mb={10}
          theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-600' } }}
        >
          There is no plugin to register, no content globs to keep in step and nothing to import into your entry file.
        </P>

        <Flex d="column" gap={6} maxWidth={170} mx="auto">
          <Code label="1. Install" language="shell" code="npm install @box-kite/react" />
          <Code
            label="2. There is no step two"
            language="jsx"
            code={`import Box from '@box-kite/react';

export default function App() {
  return (
    <Box p={4} bgColor="indigo-500" color="white" borderRadius={2}>
      Hello, Box Kite!
    </Box>
  );
}`}
          />
        </Flex>
      </Box>
    </Reveal>
  );
}

/** The signals a visitor checks before installing anything: what it costs, what it drags in, where it lives. */
function HealthSignals() {
  const links = [
    { label: 'Releases, every version', to: '/releases' },
    { label: 'Migrating from 0.x', to: '/migrating' },
    { label: 'What an agent should read', to: '/ai-context' },
  ];

  return (
    <Reveal y={8}>
      <Box py={10} px={6} borderRadius={4} mb={8} theme={{ dark: { bgImage: 'gradient-hero-dark' }, light: { bgImage: 'gradient-hero' } }}>
        <Grid gridTemplateColumns={1} sm={{ gridTemplateColumns: 2 }} lg={{ gridTemplateColumns: 4 }} gap={6}>
          <Signal label="Licence" value="MIT" note="Every component, every version. There is no tier above this one." />
          <Signal label="Latest" value={version} note="Semver, with a written note for every change a consumer sees." />
          <Signal label="Runtime dependencies" value="0" note="React and React DOM are peers; nothing else ships." />
          <Signal label="Peer range" value="React 18 & 19" note="Both run the whole suite on every commit." />
        </Grid>

        <Flex gap={5} flexWrap="wrap" mt={8} fontSize={14}>
          {links.map((link) => (
            <SiteLink
              key={link.to}
              to={link.to}
              theme={{ dark: { color: 'violet-400' }, light: { color: 'violet-600' } }}
              hover={{ textDecoration: 'underline' }}
            >
              {link.label}
            </SiteLink>
          ))}
          <Link
            props={{ href: 'https://github.com/box-kite/box-kite', target: '_blank', rel: 'noopener noreferrer' }}
            display="inline"
            theme={{ dark: { color: 'violet-400' }, light: { color: 'violet-600' } }}
            hover={{ textDecoration: 'underline' }}
          >
            The repository
          </Link>
          <Link
            props={{ href: 'https://www.npmjs.com/package/@box-kite/react', target: '_blank', rel: 'noopener noreferrer' }}
            display="inline"
            theme={{ dark: { color: 'violet-400' }, light: { color: 'violet-600' } }}
            hover={{ textDecoration: 'underline' }}
          >
            The package
          </Link>
        </Flex>
      </Box>
    </Reveal>
  );
}

interface SectionProps {
  id: string;
  eyebrow: string;
  title: string;
  children: ReactNode;
}

/** One pillar's proof. The scroll margin keeps the heading clear of the sticky header a phone carries. */
function Section({ id, eyebrow, title, children }: SectionProps) {
  return (
    <Reveal y={8}>
      <Box
        tag="section"
        id={id}
        css={{ scrollMarginTop: '5rem' }}
        py={10}
        bt={1}
        theme={{ dark: { borderColor: 'slate-800' }, light: { borderColor: 'slate-200' } }}
      >
        <Box
          tag="code"
          props={{ 'data-md': 'skip' }}
          display="inline-block"
          fontSize={12}
          fontWeight={600}
          px={2}
          py={1}
          borderRadius={1}
          mb={3}
          theme={{ dark: { bgColor: 'slate-800', color: 'indigo-300' }, light: { bgColor: 'indigo-50', color: 'indigo-600' } }}
        >
          {eyebrow}
        </Box>
        <H2
          fontSize={24}
          sm={{ fontSize: 30 }}
          fontWeight={700}
          letterSpacing={-1}
          mb={4}
          theme={{ dark: { color: 'white' }, light: { color: 'slate-900' } }}
        >
          {title}
        </H2>
        <Box fontSize={15} lineHeight={26} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-600' } }}>
          {children}
        </Box>
      </Box>
    </Reveal>
  );
}

function ProofPanel({ tone, title, caption, children }: { tone: 'muted' | 'error'; title: string; caption: string; children: ReactNode }) {
  return (
    <Flex
      d="column"
      p={4}
      b={1}
      borderRadius={3}
      theme={{
        dark: { bgColor: 'slate-900', borderColor: tone === 'error' ? 'red-500/40' : 'slate-700' },
        light: { bgColor: 'white', borderColor: tone === 'error' ? 'red-500/40' : 'slate-200' },
      }}
    >
      <Box
        props={{ 'data-md': 'label' }}
        fontSize={12}
        fontWeight={600}
        mb={3}
        theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-500' } }}
      >
        {title}
      </Box>
      <Box overflow="auto">{children}</Box>
      {/* `auto` rather than a gap: the two panels are different heights, and their captions line up. */}
      <Box mt="auto" pt={4} fontSize={13} lineHeight={20} theme={{ dark: { color: 'slate-500' }, light: { color: 'slate-500' } }}>
        {caption}
      </Box>
    </Flex>
  );
}

function Point({ children }: { children: ReactNode }) {
  return (
    <Li display="flex" gap={3} ai="start" fontSize={15} lineHeight={24}>
      <Icon size={4.5} mt={1} flexShrink={0} theme={{ dark: { color: 'emerald-400' }, light: { color: 'emerald-600' } }}>
        <Check />
      </Icon>
      <Box>{children}</Box>
    </Li>
  );
}

function Stat({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <Box
      props={{ 'data-md': 'inline' }}
      p={4}
      b={1}
      borderRadius={3}
      theme={{
        dark: { bgColor: accent ? 'indigo-500/20' : 'slate-800', borderColor: accent ? 'indigo-500/40' : 'slate-700' },
        light: { bgColor: accent ? 'indigo-50' : 'white', borderColor: accent ? 'indigo-200' : 'slate-200' },
      }}
    >
      <Box fontSize={20} fontWeight={700} mb={1} theme={{ dark: { color: 'white' }, light: { color: 'slate-900' } }}>
        {value}
      </Box>
      <Box fontSize={13} lineHeight={20} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-600' } }}>
        {label}
      </Box>
    </Box>
  );
}

function Signal({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <Box props={{ 'data-md': 'inline' }}>
      <Box fontSize={12} fontWeight={600} mb={1} textTransform="uppercase" letterSpacing={1}>
        {label}
      </Box>
      <Box fontSize={22} fontWeight={700} mb={1} theme={{ dark: { color: 'white' }, light: { color: 'slate-900' } }}>
        {value}
      </Box>
      <Box fontSize={13} lineHeight={20} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-600' } }}>
        {note}
      </Box>
    </Box>
  );
}

function SectionLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <SiteLink
      to={to}
      display="flex"
      ai="center"
      gap={2}
      fontSize={14}
      fontWeight={500}
      theme={{ dark: { color: 'violet-400' }, light: { color: 'violet-600' } }}
      hover={{ textDecoration: 'underline' }}
    >
      {children}
      <Icon size={3.5}>
        <ArrowRight />
      </Icon>
    </SiteLink>
  );
}
