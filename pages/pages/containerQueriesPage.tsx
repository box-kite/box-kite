import { Proportions } from 'lucide-react';
import { ReactNode } from 'react';
import Box from '../../src/box';
import Button from '../../src/components/button';
import Flex from '../../src/components/flex';
import { H2, P } from '../../src/components/semantics';
import Code from '../components/code';
import Mono from '../components/mono';
import PageHeader from '../components/pageHeader';
import Reveal from '../components/reveal';
import useTableOfContents from '../hooks/useTableOfContents';

export default function ContainerQueriesPage() {
  useTableOfContents(sidebarLinks);

  return (
    <Box>
      <PageHeader
        icon={Proportions}
        title="Container Queries"
        description="A component that answers to the space it was given rather than to the size of the window — cq, keyed by the same six sizes Tailwind uses."
        badge="NEW"
      />

      <Reveal delay={0.1}>
        <Flex d="column" gap={10}>
          <Section id="concept" title="The width that matters is the container's">
            A breakpoint asks about the window, which is the wrong question for a card: the same card is wide in a page and narrow in a
            sidebar, and the viewport says nothing about which. <Mono>cq</Mono> asks the element's own container instead. It nests exactly
            like a breakpoint — the same value shape, the same states, themes and groups inside it — and it fills the same one slot, because
            a rule lives in exactly one at-rule block.
          </Section>

          <Code
            id="concept-code"
            label="Two props and one nesting key"
            language="jsx"
            codeOnly
            code={`<Flex container>                          {/* container-type: inline-size */}
  <Box cq={{ md: { d: 'row' } }} />       {/* @container (min-width: 28rem) */}
</Flex>

<Flex container="sidebar">                {/* a named container */}
  <Box cq={{ 'sidebar/md': { d: 'row' } }} />
</Flex>`}
          />

          <Section id="live" title="One card, two slots, no JavaScript">
            The card below is written once. The left slot is 256px wide (<Mono>width</Mono> is the ÷4 scale, so 64) and the right one takes
            whatever the page has left, and the card lays itself out from that — the window never comes into it, so this reads the same in a
            phone-width column as it does here.
          </Section>

          <Code
            id="live-demo"
            label="cq on a card"
            language="jsx"
            code={`<Flex container width={64}>       {/* 256px — below the sm container size */}
  <Flex
    d="column"
    cq={{ sm: { d: 'row', ai: 'center' } }}
    gap={4}
    p={4}
    b={1}
    borderColor="slate-300"
    borderRadius={3}
  >
    <Box width={12} height={12} borderRadius={12} bgColor="indigo-500" />
    <Box flexGrow={1}>
      <Box fontWeight={600}>Container queries</Box>
      <Box fontSize={13} color="slate-500">
        This card becomes a row once its container passes 24rem.
      </Box>
    </Box>
    <Button variant="secondary">Open</Button>
  </Flex>
</Flex>`}
          >
            <Flex gap={6} flexWrap="wrap" ai="start">
              <Flex container width={64} flexShrink={0}>
                <DemoCard />
              </Flex>
              <Flex container flexGrow={1} minWidth={64}>
                <DemoCard />
              </Flex>
            </Flex>
          </Code>

          <Section id="resize" title="Drag it">
            The same card again, in a container the browser lets you resize. Nothing here listens for anything: the styles are two CSS rules
            and the browser re-evaluates them as the box changes width. One thing a drag does need, though: every Box transitions on{' '}
            <Mono>--transitionTime</Mono>, so a resized box would <em>chase</em> the pointer instead of following it — and since a custom
            property is inherited, <Mono>vars={`{{ transitionTime: '0s' }}`}</Mono> on the container settles that for the whole subtree.
          </Section>

          <Code
            id="resize-demo"
            label="A container you can drag"
            language="jsx"
            code={`<Box
  container
  resize="horizontal"
  overflow="auto"
  vars={{ transitionTime: '0s' }}   // direct manipulation: follow the pointer, do not animate to it
  width={72}
  minWidth={50}
  maxWidth="fit"
  p={2}
>
  {/* the card from above */}
</Box>`}
          >
            <Box
              container
              resize="horizontal"
              overflow="auto"
              vars={{ transitionTime: '0s' }}
              width={72}
              minWidth={50}
              maxWidth="fit"
              p={2}
              borderRadius={3}
              b={1}
              borderColor="slate-300"
              theme={{ dark: { borderColor: 'slate-700' } }}
            >
              <DemoCard />
            </Box>
          </Code>

          <Section id="scale" title="Six sizes, and their complements">
            The scale is Tailwind's <Mono>@xs</Mono>…<Mono>@2xl</Mono>, so a component copied from there queries at the same widths — and
            deliberately far smaller than the breakpoints, because a card is 400px wide and a viewport is not. Every size has a{' '}
            <Mono>max</Mono> form, which is its <em>complement</em> rather than a max-width an epsilon below it: <Mono>md</Mono> and{' '}
            <Mono>maxMd</Mono> can never both match.
          </Section>

          <Code
            id="scale-code"
            label="The scale"
            language="css"
            codeOnly
            check={false}
            code={`xs   20rem / 320px      maxXs   not (min-width: 20rem)
sm   24rem / 384px      maxSm   not (min-width: 24rem)
md   28rem / 448px      maxMd   not (min-width: 28rem)
lg   32rem / 512px      maxLg   not (min-width: 32rem)
xl   36rem / 576px      maxXl   not (min-width: 36rem)
xxl  42rem / 672px      maxXxl  not (min-width: 42rem)`}
          />

          <Section id="named" title="Naming a container, and what a name may be">
            <Mono>cq</Mono> queries the nearest container by default, which is what you want until a card sits inside a card. A name is
            written on the container and addressed as <Mono>name/size</Mono>. Because that name lands in an at-rule prelude, it is validated
            first: anything that is not a CSS identifier — or that is a word the prelude itself uses, like <Mono>not</Mono> — drops the
            whole block, with no rule and no class name, the way an unmatched prop value does.
          </Section>

          <Code
            id="named-code"
            label="name/size"
            language="jsx"
            codeOnly
            code={`<Flex container="page" d="column" gap={4}>
  <Flex container="card" p={4}>
    <Box
      cq={{
        md: { fontSize: 16 },              // the nearest container — the card
        'page/xl': { fontSize: 18 },       // the one two levels up
        maxSm: { display: 'none' },        // and the card again, when it is narrow
      }}
    />
  </Flex>
</Flex>`}
          />

          <Section id="cascade" title="Where it lands in the cascade">
            A container query is a more local statement than a breakpoint, so it is ranked after every breakpoint and before every user
            preference — a wide window is no reason to override what the card's own space says, and neither of them is a reason to override{' '}
            <Mono>motionReduce</Mono>. Sizes ascend; the <Mono>max</Mono> keys descend, so the narrower one wins where two overlap.
          </Section>

          <Code
            id="cascade-code"
            label="The order rules are written in"
            language="css"
            codeOnly
            check={false}
            code={`/* p={2} md={{ p: 4 }} cq={{ md: { p: 6 } }} motionReduce={{ p: 8 }} */
.a { padding: 0.5rem }
@media (min-width: 768px) { .b { padding: 1rem } }
@container (min-width: 28rem) { .c { padding: 1.5rem } }
@media (prefers-reduced-motion: reduce) { .d { padding: 2rem } }`}
          />

          <Section id="establish" title="Becoming a container costs something">
            <Mono>container</Mono> means <Mono>container-type: inline-size</Mono>: the element's width no longer depends on its contents, so
            an inline-size container is laid out first and its children second. That is the point — and the reason not to declare it on
            everything. <Mono>containerType="size"</Mono> queries both axes and needs the element to have a block size of its own;{' '}
            <Mono>containerName</Mono> is the longhand, for when you want a name without the shorthand's type.
          </Section>

          <Code
            id="establish-code"
            label="The three props"
            language="jsx"
            codeOnly
            code={`<Flex d="column" gap={4}>
  <Box container />                                   {/* container-type: inline-size */}
  <Box container="sidebar" />                         {/* container: sidebar / inline-size */}
  <Box containerName="panel" containerType="size" />  {/* both axes, named */}
  <Box container="sidebar" containerType="normal" />  {/* and off again */}
</Flex>`}
          />

          <Section id="limits" title="One block per rule">
            A rule sits in one at-rule block, so <Mono>cq</Mono> does not nest inside a breakpoint and a breakpoint does not nest inside{' '}
            <Mono>cq</Mono> — the types refuse both, the way they already refuse a breakpoint inside a breakpoint. Everything else nests in
            either direction: pseudo-classes, groups, themes, the state variants, a pseudo-element and <Mono>startingStyle</Mono>.
          </Section>

          <Code
            id="limits-code"
            label="What nests inside a query"
            language="jsx"
            codeOnly
            code={`<Box
  cq={{
    md: {
      hover: { color: 'indigo-500' },
      theme: { dark: { bgColor: 'slate-800' } },
      dataAttr: { 'state=open': { height: 40 } },
      before: { content: 'Wide' },
      startingStyle: { opacity: 0 },
    },
  }}
/>`}
          />
        </Flex>
      </Reveal>
    </Box>
  );
}

/** The one card both demos render, so the page proves the same component reads its own container twice. */
function DemoCard() {
  return (
    <Flex
      d="column"
      cq={{ sm: { d: 'row', ai: 'center' } }}
      gap={4}
      p={4}
      width="fit"
      borderRadius={3}
      b={1}
      borderColor="slate-300"
      theme={{ dark: { borderColor: 'slate-700', bgColor: 'slate-900' }, light: { bgColor: 'white' } }}
    >
      <Box width={12} height={12} borderRadius={12} bgColor="indigo-500" flexShrink={0} />
      <Box flexGrow={1}>
        <Box fontWeight={600} theme={{ dark: { color: 'white' }, light: { color: 'slate-900' } }}>
          Container queries
        </Box>
        <Box fontSize={13} color="slate-500">
          This card becomes a row once its container passes 24rem.
        </Box>
      </Box>
      <Button variant="secondary">Open</Button>
    </Flex>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <Box id={id}>
      <H2 fontSize={20} fontWeight={600} mb={4} theme={{ dark: { color: 'white' }, light: { color: 'slate-900' } }}>
        {title}
      </H2>
      <P fontSize={15} lineHeight={26} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-600' } }}>
        {children}
      </P>
    </Box>
  );
}

const sidebarLinks = [
  { id: 'concept', label: 'What they are' },
  { id: 'live', label: 'One card, two slots' },
  { id: 'resize', label: 'Drag it' },
  { id: 'scale', label: 'The scale' },
  { id: 'named', label: 'Named containers' },
  { id: 'cascade', label: 'The cascade' },
  { id: 'establish', label: 'The three props' },
  { id: 'limits', label: 'One block per rule' },
];
