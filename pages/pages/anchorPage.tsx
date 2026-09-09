import { Anchor } from 'lucide-react';
import { ReactNode, useState } from 'react';
import { AnchorAlign, AnchorSide, useAnchorPosition } from '../../src/anchor';
import Box from '../../src/box';
import Button from '../../src/components/button';
import Flex from '../../src/components/flex';
import { H2 } from '../../src/components/semantics';
import Code from '../components/code';
import Mono from '../components/mono';
import PageHeader from '../components/pageHeader';
import Reveal from '../components/reveal';
import useTableOfContents from '../hooks/useTableOfContents';

const sides: AnchorSide[] = ['top', 'bottom', 'start', 'end'];
const aligns: AnchorAlign[] = ['start', 'center', 'end'];

const sections = [
  { id: 'placed-by-the-browser', label: 'Placed by the browser' },
  { id: 'the-gap-is-a-margin', label: 'The gap is a margin' },
  { id: 'a-length-off-the-anchor', label: 'A length off the anchor' },
  { id: 'where-the-browser-has-none', label: 'Where the browser has none' },
  { id: 'what-it-is-not', label: 'What it is not' },
];

export default function AnchorPage() {
  useTableOfContents(sections);

  return (
    <Box>
      <PageHeader
        icon={Anchor}
        title="Anchor Positioning"
        description="A floating layer placed against its trigger by the browser: one hook, six props, and no measuring — with a measured fallback where the browser has none."
      />

      <Reveal delay={0.1}>
        <Flex d="column" gap={8}>
          <Code label="Import" language="jsx" code="import { useAnchorPosition } from '@box-kite/react/anchor';" />

          <Section id={sections[0]!.id} title={sections[0]!.label}>
            <Box>
              Spread <Mono>anchorProps</Mono> on the trigger and <Mono>layerProps</Mono> on the layer. On a browser with CSS anchor
              positioning that is the whole of it: the layer carries <Mono>positionArea</Mono> and <Mono>positionTryFallbacks</Mono>, and
              the browser does the placing — no measuring, no scroll listener, no state, and nothing to keep in sync when the page moves.
            </Box>
            <Box mt={4}>
              <Mono>side</Mono> is which side of the anchor to sit on — <Mono>top</Mono> and <Mono>bottom</Mono> are the block axis,{' '}
              <Mono>start</Mono> and <Mono>end</Mono> the inline one, so a layer after the trigger is on its left in a right-to-left page.{' '}
              <Mono>align</Mono> is which of the anchor&apos;s edges to line up with on the other axis.
            </Box>
          </Section>

          <Playground />

          <Section id={sections[1]!.id} title={sections[1]!.label}>
            <Box>
              There is no <Mono>offset</Mono> property in CSS and there is none here either: the gap between anchor and layer is an ordinary
              margin, on the ÷4 spacing scale, and the hook puts it on the side facing the anchor. A flip flips the margin with it —
              measured in Chrome 152 — so a layer that opens upwards keeps its gap instead of landing on top of its trigger.
            </Box>
            <Box mt={4}>
              A flip is <b>sticky</b>: once the browser takes one it keeps it until the layer is laid out afresh, which is what stops a
              layer oscillating as the page scrolls. Measured in Chrome 152 — hiding the layer and showing it again re-evaluates, so a popup
              that mounts when it opens always picks the side that fits, while one that stays mounted keeps the side it first chose.
            </Box>
          </Section>

          <Code
            label="A menu below its button, left-aligned, 8px away"
            language="jsx"
            code={`const { anchorProps, layerProps } = useAnchorPosition({ side: 'bottom', align: 'start', offset: 2, matchWidth: true });

<Button {...anchorProps} onClick={() => setIsOpen(!isOpen)}>Options</Button>
{isOpen && (
  <Box {...layerProps} p={2} b={1} borderRadius={2} bgColor="white">
    …
  </Box>
)}`}
            codeOnly
          />

          <Section id={sections[2]!.id} title={sections[2]!.label}>
            <Box>
              <Mono>matchWidth</Mono> is one line of CSS rather than a measurement: <Mono>minWidth=&quot;anchor-size(width)&quot;</Mono>.
              Every sizing prop takes an <Mono>anchor-size()</Mono> value and every single-side inset prop takes an <Mono>anchor()</Mono>{' '}
              one, so a layer can be sized and placed against its anchor with no hook at all — which is what makes a floating layer possible
              in a Server Component.
            </Box>
          </Section>

          <Code
            label="The two value families, on ordinary props"
            language="jsx"
            code={`<Box position="fixed" minWidth="anchor-size(width)" maxHeight="anchor-size(height, 20rem)" top="anchor(bottom)" insetStart="anchor(left)" />`}
            codeOnly
          />

          <Section id={sections[3]!.id} title={sections[3]!.label}>
            <Box>
              CSS anchor positioning is Chrome 125+, Firefox 147+ and Safari 26+. Everywhere else the hook measures instead: it flips to the
              opposite side when the requested one has no room, shifts along the other axis to stay in the viewport, and hands the layer its
              coordinates as an inline style. Both paths come out of one model, so the fallback is the CSS placement worked out by hand
              rather than a second set of rules. <Mono>css</Mono> in the returned object says which one is running.
            </Box>
            <Box mt={4}>
              The first render always assumes CSS, so a server-rendered anchor and the client agree; a browser without it says so before it
              paints.
            </Box>
          </Section>

          <Section id={sections[4]!.id} title={sections[4]!.label}>
            <Flex tag="ul" d="column" gap={2}>
              <Bullet>
                <b>Not a pattern.</b> No role, no dismissal, no focus handling — those are <Mono>useDismiss</Mono>,{' '}
                <Mono>useFocusReturn</Mono> and <Mono>useRovingFocus</Mono> from <Mono>@box-kite/react/a11y</Mono>.
              </Bullet>
              <Bullet>
                <b>Not a portal.</b> The layer is <Mono>position: fixed</Mono>, so it escapes every <Mono>overflow: hidden</Mono> ancestor
                without one — but not a <em>transformed</em> ancestor, which is a fixed element&apos;s containing block, and not the
                page&apos;s stacking order. Reach for <Mono>Overlay</Mono> when the layer has to come out on top of everything.
              </Bullet>
              <Bullet>
                <b>Not a class.</b> The anchor&apos;s name is an inline style, deliberately: an identity is per instance, so a class for it
                would be a rule per instance that is never freed.
              </Bullet>
            </Flex>
          </Section>
        </Flex>
      </Reveal>
    </Box>
  );
}

/** The live demo: one trigger, one layer, and the twelve placements the two options make. */
function Playground() {
  const [side, setSide] = useState<AnchorSide>('bottom');
  const [align, setAlign] = useState<AnchorAlign>('center');
  // `flip: false` so the side you pick is the side you see: a flip already taken is kept until the
  // layer is laid out again, and this one never unmounts.
  const { css, anchorProps, layerProps } = useAnchorPosition({ side, align, offset: 2, flip: false });

  return (
    <Code
      label="Twelve placements, one hook"
      language="jsx"
      check={false}
      code={`const [side, setSide] = useState('bottom');
const [align, setAlign] = useState('center');
const { anchorProps, layerProps } = useAnchorPosition({ side, align, offset: 2, flip: false });

<Button {...anchorProps}>anchor</Button>
<Box {...layerProps} p={2} px={3} borderRadius={2} bgColor="indigo-500" color="white">
  {side} / {align}
</Box>`}
    >
      <Flex d="column" gap={4}>
        <Flex gap={4} flexWrap="wrap" fontSize={13}>
          <Options label="side" values={sides} value={side} onSelect={setSide} />
          <Options label="align" values={aligns} value={align} onSelect={setAlign} />
        </Flex>

        <Flex height={40} ai="center" jc="center">
          <Button {...anchorProps} clean px={4} py={2} borderRadius={2} b={1} borderColor="slate-400">
            anchor
          </Button>
          <Box {...layerProps} p={2} px={3} borderRadius={2} bgColor="indigo-500" color="white" fontSize={13}>
            {side} / {align}
          </Box>
        </Flex>

        <Box fontSize={12} theme={{ dark: { color: 'slate-500' }, light: { color: 'slate-400' } }}>
          {css ? 'Placed by the browser — no JavaScript ran.' : 'Measured: this browser has no CSS anchor positioning.'}
        </Box>
      </Flex>
    </Code>
  );
}

function Options<TValue extends string>(props: { label: string; values: TValue[]; value: TValue; onSelect: (value: TValue) => void }) {
  return (
    <Flex gap={2} ai="center">
      <Box theme={{ dark: { color: 'slate-500' }, light: { color: 'slate-400' } }}>{props.label}</Box>
      {props.values.map((value) => (
        <Button
          key={value}
          clean
          px={3}
          py={1}
          borderRadius={2}
          b={1}
          borderColor={props.value === value ? 'indigo-500' : 'slate-300'}
          onClick={() => props.onSelect(value)}
          props={{ 'aria-pressed': props.value === value }}
        >
          {value}
        </Button>
      ))}
    </Flex>
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

function Bullet({ children }: { children: ReactNode }) {
  return (
    <Flex tag="li" gap={3} ai="baseline">
      <Box width={1} height={1} borderRadius={10} bgColor="indigo-400" mt={2} />
      <Box flex1>{children}</Box>
    </Flex>
  );
}
