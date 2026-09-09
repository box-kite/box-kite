import { ArrowRight, Box as BoxIcon, Eye, Grid3X3, Layers, Maximize2, MousePointer, Move, Palette, Type } from 'lucide-react';
import { ReactNode, Ref, useState } from 'react';
import { useRovingFocus } from '../../src/a11y';
import Box from '../../src/box';
import Button from '../../src/components/button';
import Checkbox from '../../src/components/checkbox';
import Flex from '../../src/components/flex';
import Grid from '../../src/components/grid';
import Presence from '../../src/components/presence';
import Textbox from '../../src/components/textbox';
import Code from '../components/code';
import PageHeader from '../components/pageHeader';
import Reveal from '../components/reveal';

// Property category definitions with visual demos
const categories = [
  { id: 'spacing', name: 'Spacing', icon: Move, color: 'violet' },
  { id: 'sizing', name: 'Sizing', icon: Maximize2, color: 'blue' },
  { id: 'layout', name: 'Layout', icon: Grid3X3, color: 'emerald' },
  { id: 'position', name: 'Position', icon: Layers, color: 'amber' },
  { id: 'typography', name: 'Typography', icon: Type, color: 'rose' },
  { id: 'visual', name: 'Visual', icon: Palette, color: 'cyan' },
  { id: 'border', name: 'Border', icon: BoxIcon, color: 'orange' },
  { id: 'interaction', name: 'Interaction', icon: MousePointer, color: 'pink' },
  { id: 'misc', name: 'Misc', icon: Eye, color: 'slate' },
] as const;

type CategoryId = (typeof categories)[number]['id'];

// Demo wrapper component
function DemoCard({ title, description, children, code }: { title: string; description: string; children: ReactNode; code: string }) {
  const [showCode, setShowCode] = useState(false);
  // Derived from the title rather than `useIdentifier`, for the reason the tabs below use static ids.
  const codeId = `box-demo-${title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')}-code`;

  return (
    <Reveal>
      <Flex
        d="column"
        b={1}
        borderRadius={2}
        overflow="hidden"
        theme={{ dark: { bgColor: 'slate-800', borderColor: 'slate-700' }, light: { bgColor: 'white', borderColor: 'slate-200' } }}
        // Inherited, so declaring it on the card is what lets the panel below animate to `height: auto`.
        interpolateSize="allow-keywords"
      >
        <Flex p={4} d="column" gap={1} theme={{ dark: { bgColor: 'slate-900' }, light: { bgColor: 'slate-50' } }} bb={1}>
          <Box fontSize={14} fontWeight={600} theme={{ dark: { color: 'slate-200' }, light: { color: 'slate-800' } }}>
            {title}
          </Box>
          <Box fontSize={12} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-500' } }}>
            {description}
          </Box>
        </Flex>
        {/* The rendered demo, so the markdown mirror leaves it out and keeps the caption below it. */}
        <Box p={4} minHeight={32} props={{ 'data-md': 'skip' }}>
          {children}
        </Box>
        <Flex
          px={4}
          py={2}
          bt={1}
          jc="space-between"
          ai="center"
          theme={{ dark: { bgColor: 'slate-900', borderColor: 'slate-700' }, light: { bgColor: 'slate-50', borderColor: 'slate-200' } }}
        >
          {/* slate-500 on slate-900 measured 3.74:1 at 11px, which is a contrast failure at any size. */}
          <Box fontSize={11} fontWeight={500} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-600' } }} fontStyle="italic">
            {code}
          </Box>
          {/* A real button, because a clickable Box is reachable by mouse only — the same shape as the
              category switchers above it (bug #116), and there are forty of these cards. */}
          {/* The colours are inside `theme`, not beside it: the `button` component declares its own
              inside one, and a nested rule outranks a flat prop however late it is written. */}
          <Button
            fontSize={11}
            fontWeight={400}
            p={0}
            hover={{ textDecoration: 'underline' }}
            theme={{
              dark: { bgColor: 'transparent', color: 'violet-400', hover: { bgColor: 'transparent' }, active: { bgColor: 'transparent' } },
              light: { bgColor: 'transparent', color: 'violet-600', hover: { bgColor: 'transparent' }, active: { bgColor: 'transparent' } },
            }}
            onClick={() => setShowCode(!showCode)}
            props={{ 'aria-expanded': showCode, 'aria-controls': codeId, 'data-md': 'skip' }}
          >
            {showCode ? 'Hide' : 'Show'} code
          </Button>
        </Flex>
        {/* Mounted only while it is open — every card on this page would otherwise run Prism over a
            block nobody asked to see — so the collapse needs `<Presence>` to have a node to run on. */}
        <Presence present={showCode}>
          {(presence) => (
            <Box
              id={codeId}
              ref={presence.ref}
              props={presence.props}
              height={presence.present ? 'auto' : 0}
              opacity={presence.present ? 1 : 0}
              overflow="hidden"
              startingStyle={{ height: 0, opacity: 0 }}
              transitionDuration={200}
            >
              <Box bt={1} theme={{ dark: { borderColor: 'slate-700' }, light: { borderColor: 'slate-200' } }}>
                <Code language="jsx" code={`<Box ${code}>content</Box>`} />
              </Box>
            </Box>
          )}
        </Presence>
      </Flex>
    </Reveal>
  );
}

// Visual box for demos
function DemoBox(props: Parameters<typeof Box>[0] & { label?: string }) {
  const { label, children, ...boxProps } = props;
  return (
    <Box
      theme={{ dark: { bgColor: 'violet-950', borderColor: 'violet-500' }, light: { bgColor: 'violet-100', borderColor: 'violet-400' } }}
      b={1}
      borderStyle="dashed"
      p={2}
      fontSize={11}
      textAlign="center"
      {...boxProps}
    >
      {label ?? children}
    </Box>
  );
}

// Category content components
function SpacingDemo() {
  return (
    <Flex d="column" gap={6}>
      <DemoCard
        title="Margin (m, mx, my, mt, mr, mb, ml, ms, me)"
        description="Controls space outside the element"
        code="m={4} mx={2} mt={6}"
      >
        <Flex gap={4} ai="center" flexWrap="wrap">
          <Flex theme={{ dark: { bgColor: 'slate-700' }, light: { bgColor: 'slate-200' } }} borderRadius={1}>
            <DemoBox m={0} label="m={0}" />
          </Flex>
          <Flex theme={{ dark: { bgColor: 'slate-700' }, light: { bgColor: 'slate-200' } }} borderRadius={1}>
            <DemoBox m={2} label="m={2}" />
          </Flex>
          <Flex theme={{ dark: { bgColor: 'slate-700' }, light: { bgColor: 'slate-200' } }} borderRadius={1}>
            <DemoBox m={4} label="m={4}" />
          </Flex>
          <Flex theme={{ dark: { bgColor: 'slate-700' }, light: { bgColor: 'slate-200' } }} borderRadius={1}>
            <DemoBox mx={4} my={1} label="mx={4} my={1}" />
          </Flex>
        </Flex>
      </DemoCard>

      <DemoCard title="Padding (p, px, py, pt, pr, pb, pl, ps, pe)" description="Controls space inside the element" code="p={4} px={6}">
        <Flex gap={4} ai="center" flexWrap="wrap">
          <DemoBox p={1} label="p={1}" />
          <DemoBox p={3} label="p={3}" />
          <DemoBox p={5} label="p={5}" />
          <DemoBox px={6} py={2} label="px={6} py={2}" />
        </Flex>
      </DemoCard>

      <DemoCard title="Gap (gap, rowGap, columnGap)" description="Controls space between flex/grid children" code="gap={4}">
        <Flex gap={8} flexWrap="wrap">
          <Flex d="column" gap={1}>
            <Box fontSize={11} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-500' } }}>
              gap={1}
            </Box>
            <Flex gap={1}>
              <DemoBox p={2} />
              <DemoBox p={2} />
              <DemoBox p={2} />
            </Flex>
          </Flex>
          <Flex d="column" gap={1}>
            <Box fontSize={11} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-500' } }}>
              gap={4}
            </Box>
            <Flex gap={4}>
              <DemoBox p={2} />
              <DemoBox p={2} />
              <DemoBox p={2} />
            </Flex>
          </Flex>
        </Flex>
      </DemoCard>
    </Flex>
  );
}

function SizingDemo() {
  return (
    <Flex d="column" gap={6}>
      <DemoCard title="Width (width, minWidth, maxWidth)" description="Controls element width" code="width={40} minWidth={20}">
        <Flex d="column" gap={3}>
          <DemoBox width={20} label="width={20}" />
          <DemoBox width={40} label="width={40}" />
          <DemoBox width="fit" label='width="fit"' />
          <DemoBox width="1/2" label='width="1/2"' />
        </Flex>
      </DemoCard>

      <DemoCard title="Height (height, minHeight, maxHeight)" description="Controls element height" code="height={20} minHeight={10}">
        <Flex gap={4} ai="flex-end" height={32}>
          <DemoBox height={8} width={16} label="h={8}" />
          <DemoBox height={16} width={16} label="h={16}" />
          <DemoBox height={24} width={16} label="h={24}" />
          <DemoBox height="fit" width={16} label='h="fit"' />
        </Flex>
      </DemoCard>

      <DemoCard
        title="Flex Sizing (flex1, flexGrow, flexShrink)"
        description="Controls how elements grow/shrink in flex containers"
        code="flex1"
      >
        <Flex gap={2}>
          <DemoBox p={3} label="normal" />
          <DemoBox p={3} flex1 label="flex1" />
          <DemoBox p={3} label="normal" />
        </Flex>
      </DemoCard>
    </Flex>
  );
}

function LayoutDemo() {
  return (
    <Flex d="column" gap={6}>
      <DemoCard title="Display (display, inline)" description="Controls element display type" code='display="flex"'>
        <Flex d="column" gap={4}>
          <Flex gap={2} ai="center">
            <Box fontSize={11} width={24} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-500' } }}>
              block:
            </Box>
            <DemoBox display="block" width="fit" label="Full width block" />
          </Flex>
          <Flex gap={2} ai="center">
            <Box fontSize={11} width={24} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-500' } }}>
              inline:
            </Box>
            <DemoBox inline label="Inline" />
            <DemoBox inline label="Inline" />
          </Flex>
        </Flex>
      </DemoCard>

      <DemoCard title="Flex Direction (d)" description="Controls main axis direction" code='d="column"'>
        <Flex gap={8}>
          <Flex d="column" gap={1}>
            <Box fontSize={11} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-500' } }}>
              d="row"
            </Box>
            <Flex d="row" gap={1}>
              <DemoBox p={2}>1</DemoBox>
              <DemoBox p={2}>2</DemoBox>
              <DemoBox p={2}>3</DemoBox>
            </Flex>
          </Flex>
          <Flex d="column" gap={1}>
            <Box fontSize={11} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-500' } }}>
              d="column"
            </Box>
            <Flex d="column" gap={1}>
              <DemoBox p={2}>1</DemoBox>
              <DemoBox p={2}>2</DemoBox>
              <DemoBox p={2}>3</DemoBox>
            </Flex>
          </Flex>
        </Flex>
      </DemoCard>

      <DemoCard title="Justify & Align (jc, ai)" description="Controls alignment on main and cross axes" code='jc="center" ai="center"'>
        <Flex gap={4} flexWrap="wrap">
          {(['flex-start', 'center', 'flex-end', 'space-between'] as const).map((jc) => (
            <Flex key={jc} d="column" gap={1}>
              <Box fontSize={10} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-500' } }}>
                jc="{jc}"
              </Box>
              <Flex
                jc={jc}
                width={28}
                p={2}
                b={1}
                borderStyle="dashed"
                theme={{ dark: { borderColor: 'slate-600' }, light: { borderColor: 'slate-300' } }}
              >
                <DemoBox p={1} />
                <DemoBox p={1} />
              </Flex>
            </Flex>
          ))}
        </Flex>
      </DemoCard>

      <DemoCard title="Grid Layout" description="Create grid-based layouts" code="gridTemplateColumns={3} gap={2}">
        <Grid gridTemplateColumns={3} gap={2}>
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <DemoBox key={n} p={3} label={`${n}`} />
          ))}
        </Grid>
      </DemoCard>

      <DemoCard title="Flex Wrap (flexWrap)" description="Controls how items wrap" code='flexWrap="wrap"'>
        <Flex gap={4}>
          <Flex d="column" gap={1}>
            <Box fontSize={11} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-500' } }}>
              nowrap
            </Box>
            <Flex flexWrap="nowrap" width={24} gap={1} overflow="hidden">
              <DemoBox p={2} minWidth={10} />
              <DemoBox p={2} minWidth={10} />
              <DemoBox p={2} minWidth={10} />
            </Flex>
          </Flex>
          <Flex d="column" gap={1}>
            <Box fontSize={11} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-500' } }}>
              wrap
            </Box>
            <Flex flexWrap="wrap" width={24} gap={1}>
              <DemoBox p={2} minWidth={10} />
              <DemoBox p={2} minWidth={10} />
              <DemoBox p={2} minWidth={10} />
            </Flex>
          </Flex>
        </Flex>
      </DemoCard>

      <DemoCard
        title="Item Alignment (placeItems, justifyItems)"
        description="Aligns every child at once — and safe alignment keeps an overflowing one reachable"
        code='placeItems="center"'
      >
        <Flex gap={4} flexWrap="wrap">
          {(['center', 'start', 'end', 'safe center'] as const).map((placeItems) => (
            <Flex key={placeItems} d="column" gap={1}>
              <Box fontSize={10} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-500' } }}>
                placeItems="{placeItems}"
              </Box>
              <Grid
                placeItems={placeItems}
                gridTemplateColumns={2}
                width={28}
                height={20}
                gap={1}
                p={1}
                b={1}
                borderStyle="dashed"
                theme={{ dark: { borderColor: 'slate-600' }, light: { borderColor: 'slate-300' } }}
              >
                <DemoBox p={1} />
                <DemoBox p={1} />
              </Grid>
            </Flex>
          ))}
        </Flex>
      </DemoCard>

      <DemoCard
        title="Aspect Ratio (aspectRatio)"
        description="A preferred ratio the sizing props fill in one axis of: two names, a compact ratio, or a number"
        code='aspectRatio="video" width="fit"'
      >
        <Flex gap={4} flexWrap="wrap" ai="flex-start">
          {(['square', 'video', '4/3', 3] as const).map((aspectRatio) => (
            <Flex key={aspectRatio} d="column" gap={1} width={28}>
              <Box fontSize={10} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-500' } }}>
                aspectRatio={typeof aspectRatio === 'number' ? `{${aspectRatio}}` : `"${aspectRatio}"`}
              </Box>
              <DemoBox aspectRatio={aspectRatio} width="fit" p={0} />
            </Flex>
          ))}
        </Flex>
      </DemoCard>
    </Flex>
  );
}

function PositionDemo() {
  return (
    <Flex d="column" gap={6}>
      <DemoCard title="Position" description="Controls positioning scheme" code='position="absolute" top={0} right={0}'>
        <Flex gap={4}>
          <Flex d="column" gap={1}>
            <Box fontSize={11} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-500' } }}>
              relative
            </Box>
            <Box
              position="relative"
              width={24}
              height={24}
              b={1}
              borderStyle="dashed"
              theme={{ dark: { borderColor: 'slate-600' }, light: { borderColor: 'slate-300' } }}
            >
              <DemoBox position="absolute" top={1} left={1} p={1} label="top left" />
              <DemoBox position="absolute" bottom={1} right={1} p={1} label="bottom right" />
            </Box>
          </Flex>
          <Flex d="column" gap={1}>
            <Box fontSize={11} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-500' } }}>
              inset={0}
            </Box>
            <Box
              position="relative"
              width={24}
              height={24}
              b={1}
              borderStyle="dashed"
              theme={{ dark: { borderColor: 'slate-600' }, light: { borderColor: 'slate-300' } }}
            >
              <DemoBox position="absolute" inset={2} label="inset={2}" />
            </Box>
          </Flex>
        </Flex>
      </DemoCard>

      <DemoCard title="Z-Index" description="Controls stacking order" code="zIndex={10}">
        <Box position="relative" height={20}>
          <DemoBox position="absolute" left={0} top={0} width={16} height={16} zIndex={1} label="z={1}" />
          <DemoBox
            position="absolute"
            left={8}
            top={2}
            width={16}
            height={16}
            zIndex={2}
            theme={{
              dark: { bgColor: 'emerald-950', borderColor: 'emerald-500' },
              light: { bgColor: 'emerald-100', borderColor: 'emerald-400' },
            }}
            label="z={2}"
          />
          <DemoBox
            position="absolute"
            left={16}
            top={4}
            width={16}
            height={16}
            zIndex={3}
            theme={{ dark: { bgColor: 'amber-950', borderColor: 'amber-500' }, light: { bgColor: 'amber-100', borderColor: 'amber-400' } }}
            label="z={3}"
          />
        </Box>
      </DemoCard>

      <DemoCard
        title="Transform (translateX, translateY, rotate)"
        description="Apply transforms to elements"
        code="translateX={4} rotate={90}"
      >
        <Flex gap={8} ai="center">
          <Flex d="column" ai="center" gap={1}>
            <Box fontSize={11} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-500' } }}>
              translateX
            </Box>
            <Flex gap={2}>
              <DemoBox p={2} translateX={0} label="0" />
              <DemoBox p={2} translateX={4} label="4" />
            </Flex>
          </Flex>
          <Flex d="column" ai="center" gap={1}>
            <Box fontSize={11} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-500' } }}>
              rotate
            </Box>
            <Flex gap={4}>
              <DemoBox p={2} rotate={0} label="0°" />
              <DemoBox p={2} rotate={90} label="90°" />
              <DemoBox p={2} rotate={180} label="180°" />
            </Flex>
          </Flex>
        </Flex>
      </DemoCard>

      <DemoCard
        title="Logical Insets (insetX, insetY)"
        description="Both insets on one axis — inset-inline and inset-block, the way mx and my are the margin shorthands"
        code='position="absolute" insetX={0} insetY={2}'
      >
        <Flex gap={4} flexWrap="wrap">
          <Flex d="column" gap={1}>
            <Box fontSize={10} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-500' } }}>
              insetX={'{0}'} insetY={'{2}'}
            </Box>
            <Box
              position="relative"
              width={28}
              height={20}
              b={1}
              borderStyle="dashed"
              theme={{ dark: { borderColor: 'slate-600' }, light: { borderColor: 'slate-300' } }}
            >
              <DemoBox position="absolute" insetX={0} insetY={2} p={0} label="insetX / insetY" fontSize={10} />
            </Box>
          </Flex>
          <Flex d="column" gap={1}>
            <Box fontSize={10} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-500' } }}>
              inset="1/4"
            </Box>
            <Box
              position="relative"
              width={28}
              height={20}
              b={1}
              borderStyle="dashed"
              theme={{ dark: { borderColor: 'slate-600' }, light: { borderColor: 'slate-300' } }}
            >
              <DemoBox position="absolute" inset="1/4" p={0} label="a quarter in" fontSize={10} />
            </Box>
          </Flex>
        </Flex>
      </DemoCard>

      <DemoCard
        title="Logical Sides (ps, pe, ms, me, bs, be, insetStart, insetEnd, borderRadiusStart, borderRadiusEnd)"
        description="The two sides of the inline axis: start is left in a left-to-right reading and right in a right-to-left one, so a translation needs no second stylesheet"
        code="ps={4} bs={4} borderRadiusEnd={2}"
      >
        <Flex gap={4} flexWrap="wrap">
          {(['ltr', 'rtl'] as const).map((direction) => (
            <Flex key={direction} d="column" gap={1}>
              <Box fontSize={10} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-500' } }}>
                dir="{direction}"
              </Box>
              <Flex
                props={{ dir: direction }}
                width={56}
                ai="center"
                gap={2}
                ps={4}
                pe={2}
                py={2}
                bs={4}
                borderStyle="solid"
                borderColor="violet-500"
                borderRadiusEnd={2}
                fontSize={11}
                theme={{ dark: { bgColor: 'violet-950', color: 'slate-200' }, light: { bgColor: 'violet-100', color: 'slate-800' } }}
              >
                <Box flex1>The accent stays on the start edge</Box>
              </Flex>
            </Flex>
          ))}
        </Flex>
      </DemoCard>

      <DemoCard
        title="Anchor Positioning (anchorName, positionAnchor, positionArea, positionTryFallbacks)"
        description="The browser places the layer against the named anchor and flips it when it does not fit — no measuring, no scroll listener, no state"
        code='positionAnchor="tag" positionArea="block-end center" positionTryFallbacks="flip-block"'
      >
        <Flex gap={8} flexWrap="wrap">
          {(
            [
              { area: 'block-end center', label: 'block-end center' },
              { area: 'block-start center', label: 'block-start center' },
              { area: 'center inline-end', label: 'center inline-end' },
            ] as const
          ).map(({ area, label }, index) => (
            <Flex key={area} d="column" gap={2} ai="center">
              {/* The wrapper is the layer's containing block, so it has to be bigger than the anchor —
                  a `position-area` region is intersected with it, and an anchor filling it leaves nowhere to go. */}
              <Box position="relative" width={52} height={28}>
                <Flex
                  position="absolute"
                  top={9}
                  left={6}
                  width={28}
                  height={10}
                  ai="center"
                  jc="center"
                  fontSize={11}
                  borderRadius={1}
                  anchorName={`box-demo-anchor-${index}`}
                  theme={{ dark: { bgColor: 'slate-700', color: 'slate-200' }, light: { bgColor: 'slate-200', color: 'slate-700' } }}
                >
                  anchor
                </Flex>
                {/* The layer is narrower than the anchor, so the centre column fits and `flip-block` can
                    fire — a candidate has to fit on both axes, or every one of them is disqualified. */}
                <Box
                  position="absolute"
                  positionAnchor={`box-demo-anchor-${index}`}
                  positionArea={area}
                  positionTryFallbacks="flip-block"
                  px={2}
                  py={1}
                  m={1}
                  fontSize={10}
                  borderRadius={1}
                  theme={{ dark: { bgColor: 'amber-500', color: 'slate-900' }, light: { bgColor: 'amber-400', color: 'slate-900' } }}
                >
                  layer
                </Box>
              </Box>
              <Box fontSize={10} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-500' } }}>
                {label}
              </Box>
            </Flex>
          ))}
        </Flex>
      </DemoCard>
    </Flex>
  );
}

function TypographyDemo() {
  return (
    <Flex d="column" gap={6}>
      <DemoCard title="Font Size (fontSize)" description="Controls text size" code="fontSize={16}">
        <Flex gap={4} ai="baseline" flexWrap="wrap">
          <Box fontSize={12} theme={{ dark: { color: 'slate-300' }, light: { color: 'slate-700' } }}>
            12px
          </Box>
          <Box fontSize={14} theme={{ dark: { color: 'slate-300' }, light: { color: 'slate-700' } }}>
            14px
          </Box>
          <Box fontSize={18} theme={{ dark: { color: 'slate-300' }, light: { color: 'slate-700' } }}>
            18px
          </Box>
          <Box fontSize={24} theme={{ dark: { color: 'slate-300' }, light: { color: 'slate-700' } }}>
            24px
          </Box>
          <Box fontSize={32} theme={{ dark: { color: 'slate-300' }, light: { color: 'slate-700' } }}>
            32px
          </Box>
        </Flex>
      </DemoCard>

      <DemoCard title="Font Weight (fontWeight)" description="Controls text boldness" code="fontWeight={600}">
        <Flex gap={4} flexWrap="wrap">
          {([300, 400, 500, 600, 700] as const).map((weight) => (
            <Box key={weight} fontWeight={weight} theme={{ dark: { color: 'slate-300' }, light: { color: 'slate-700' } }}>
              {weight}
            </Box>
          ))}
        </Flex>
      </DemoCard>

      <DemoCard title="Text Align (textAlign)" description="Controls text alignment" code='textAlign="center"'>
        <Flex d="column" gap={2}>
          {(['left', 'center', 'right'] as const).map((align) => (
            <Box
              key={align}
              textAlign={align}
              p={2}
              b={1}
              borderStyle="dashed"
              theme={{ dark: { borderColor: 'slate-600', color: 'slate-300' }, light: { borderColor: 'slate-300', color: 'slate-700' } }}
            >
              {align}
            </Box>
          ))}
        </Flex>
      </DemoCard>

      <DemoCard
        title="Text Decoration & Transform"
        description="Modify text appearance"
        code='textDecoration="underline" textTransform="uppercase"'
      >
        <Flex gap={4} flexWrap="wrap">
          <Box textDecoration="underline" theme={{ dark: { color: 'slate-300' }, light: { color: 'slate-700' } }}>
            underline
          </Box>
          <Box textDecoration="line-through" theme={{ dark: { color: 'slate-300' }, light: { color: 'slate-700' } }}>
            line-through
          </Box>
          <Box textTransform="uppercase" theme={{ dark: { color: 'slate-300' }, light: { color: 'slate-700' } }}>
            uppercase
          </Box>
          <Box textTransform="capitalize" theme={{ dark: { color: 'slate-300' }, light: { color: 'slate-700' } }}>
            capitalize this
          </Box>
        </Flex>
      </DemoCard>

      <DemoCard
        title="Text Overflow (textOverflow, textWrap)"
        description="Handle text overflow"
        code='textOverflow="ellipsis" textWrap="nowrap"'
      >
        <Flex d="column" gap={2}>
          <Box
            width={40}
            textOverflow="ellipsis"
            textWrap="nowrap"
            overflow="hidden"
            theme={{ dark: { color: 'slate-300' }, light: { color: 'slate-700' } }}
          >
            This is a very long text that will be truncated with ellipsis
          </Box>
          <Box width={40} textWrap="wrap" theme={{ dark: { color: 'slate-300' }, light: { color: 'slate-700' } }}>
            This text will wrap normally when it reaches the container width
          </Box>
        </Flex>
      </DemoCard>

      <DemoCard title="Line Height & Letter Spacing" description="Fine-tune text spacing" code="lineHeight={24} letterSpacing={2}">
        <Flex gap={6}>
          <Flex d="column" gap={1}>
            <Box fontSize={11} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-500' } }}>
              lineHeight
            </Box>
            <Box lineHeight={16} width={32} theme={{ dark: { color: 'slate-300' }, light: { color: 'slate-700' } }}>
              Tight line height makes text compact
            </Box>
          </Flex>
          <Flex d="column" gap={1}>
            <Box fontSize={11} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-500' } }}>
              letterSpacing
            </Box>
            <Box letterSpacing={2} theme={{ dark: { color: 'slate-300' }, light: { color: 'slate-700' } }}>
              Spaced Letters
            </Box>
          </Flex>
        </Flex>
      </DemoCard>
    </Flex>
  );
}

function VisualDemo() {
  return (
    <Flex d="column" gap={6}>
      <DemoCard
        title="Colors (color, bgColor)"
        description="Apply foreground and background colors"
        code='color="violet-500" bgColor="slate-800"'
      >
        <Flex gap={3} flexWrap="wrap">
          {(['violet', 'blue', 'emerald', 'amber', 'rose'] as const).map((c) => (
            <Box key={c} bgColor={`${c}-500`} color="white" p={3} borderRadius={1} fontSize={12}>
              {c}-500
            </Box>
          ))}
        </Flex>
      </DemoCard>

      <DemoCard title="Opacity" description="Control element transparency" code="opacity={0.5}">
        <Flex gap={2}>
          {([1, 0.8, 0.6, 0.4, 0.2] as const).map((o) => (
            <Box key={o} bgColor="violet-500" p={4} borderRadius={1} opacity={o} fontSize={11} color="white">
              {o}
            </Box>
          ))}
        </Flex>
      </DemoCard>

      <DemoCard title="Box Shadow (shadow)" description="Add shadows to elements" code='shadow="medium"'>
        <Flex gap={6} flexWrap="wrap" p={4}>
          {(['small', 'medium', 'large'] as const).map((s) => (
            <Box
              key={s}
              shadow={s}
              p={4}
              borderRadius={2}
              theme={{ dark: { bgColor: 'slate-700' }, light: { bgColor: 'white' } }}
              fontSize={12}
            >
              {s}
            </Box>
          ))}
        </Flex>
      </DemoCard>

      <DemoCard title="Backdrop Filter" description="Apply blur effects to backgrounds" code='backdropFilter="blur(8px)"'>
        <Box position="relative" height={24} overflow="hidden" borderRadius={2}>
          <Box position="absolute" inset={0} bgImage="gradient-primary" />
          <Flex position="absolute" inset={0} ai="center" jc="center" gap={4}>
            <Box backdropFilter="blur(4px)" bgColor="slate-800" opacity={0.7} p={3} borderRadius={1} color="white" fontSize={12}>
              blur(4px)
            </Box>
            <Box backdropFilter="blur(8px)" bgColor="slate-800" opacity={0.7} p={3} borderRadius={1} color="white" fontSize={12}>
              blur(8px)
            </Box>
            <Box backdropFilter="blur(12px)" bgColor="slate-800" opacity={0.7} p={3} borderRadius={1} color="white" fontSize={12}>
              blur(12px)
            </Box>
          </Flex>
        </Box>
      </DemoCard>
    </Flex>
  );
}

function BorderDemo() {
  return (
    <Flex d="column" gap={6}>
      <DemoCard title="Border Width (b, bt, br, bb, bl, bs, be)" description="Control border thickness" code="b={2} bt={4}">
        <Flex gap={4} flexWrap="wrap">
          <DemoBox b={1} label="b={1}" />
          <DemoBox b={2} label="b={2}" />
          <DemoBox bt={2} label="bt={2}" />
          <DemoBox br={2} label="br={2}" />
          <DemoBox bb={2} label="bb={2}" />
          <DemoBox bl={2} label="bl={2}" />
        </Flex>
      </DemoCard>

      <DemoCard title="Border Style" description="Change border appearance" code='borderStyle="dashed"'>
        <Flex gap={4} flexWrap="wrap">
          {(['solid', 'dashed', 'dotted', 'double'] as const).map((style) => (
            <Box
              key={style}
              b={2}
              borderStyle={style}
              p={3}
              theme={{ dark: { borderColor: 'violet-500' }, light: { borderColor: 'violet-400' } }}
              fontSize={12}
            >
              {style}
            </Box>
          ))}
        </Flex>
      </DemoCard>

      <DemoCard title="Border Radius" description="Round element corners" code="borderRadius={2}">
        <Flex gap={4} flexWrap="wrap" ai="center">
          {[0, 1, 2, 3, 4].map((r) => (
            <Box
              key={r}
              borderRadius={r}
              bgColor="violet-500"
              width={12}
              height={12}
              theme={{ dark: { bgColor: 'violet-500' }, light: { bgColor: 'violet-400' } }}
            />
          ))}
          <Box fontSize={11} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-500' } }}>
            0 → 4
          </Box>
        </Flex>
      </DemoCard>

      <DemoCard title="Individual Border Radius" description="Round specific corners" code="borderRadiusTopLeft={3}">
        <Flex gap={4} flexWrap="wrap">
          <DemoBox borderRadiusTop={2} p={3} label="Top" />
          <DemoBox borderRadiusRight={2} p={3} label="Right" />
          <DemoBox borderRadiusBottom={2} p={3} label="Bottom" />
          <DemoBox borderRadiusLeft={2} p={3} label="Left" />
          <DemoBox borderRadiusTopLeft={3} borderRadiusBottomRight={3} p={3} label="Diagonal" />
        </Flex>
      </DemoCard>

      <DemoCard title="Outline" description="Draw outside the border" code='outline={2} outlineColor="violet-500"'>
        <Flex gap={6} flexWrap="wrap">
          <Box
            outline={2}
            outlineStyle="solid"
            outlineColor="violet-500"
            p={3}
            borderRadius={1}
            theme={{ dark: { color: 'slate-300' }, light: { color: 'slate-700' } }}
          >
            outline={2}
          </Box>
          <Box
            outline={2}
            outlineStyle="dashed"
            outlineColor="emerald-500"
            outlineOffset={2}
            p={3}
            borderRadius={1}
            theme={{ dark: { color: 'slate-300' }, light: { color: 'slate-700' } }}
          >
            offset={2}
          </Box>
        </Flex>
      </DemoCard>
    </Flex>
  );
}

function InteractionDemo() {
  return (
    <Flex d="column" gap={6}>
      <DemoCard title="Cursor" description="Change mouse cursor on hover" code='cursor="pointer"'>
        <Flex gap={3} flexWrap="wrap">
          {(['default', 'pointer', 'move', 'text', 'not-allowed', 'grab'] as const).map((c) => (
            <Box
              key={c}
              cursor={c}
              p={3}
              b={1}
              borderRadius={1}
              theme={{ dark: { borderColor: 'slate-600', color: 'slate-300' }, light: { borderColor: 'slate-300', color: 'slate-700' } }}
              fontSize={12}
            >
              {c}
            </Box>
          ))}
        </Flex>
      </DemoCard>

      <DemoCard title="Hover States" description="Apply styles on hover" code='hover={{ bgColor: "violet-500" }}'>
        <Flex gap={4} flexWrap="wrap">
          <Box
            p={3}
            b={1}
            borderRadius={1}
            cursor="pointer"
            transitionDuration={200}
            theme={{ dark: { borderColor: 'slate-600', color: 'slate-300' }, light: { borderColor: 'slate-300', color: 'slate-700' } }}
            hover={{ bgColor: 'violet-500', color: 'white', borderColor: 'violet-500' }}
            fontSize={12}
          >
            Hover me!
          </Box>
          <Box
            p={3}
            b={1}
            borderRadius={1}
            cursor="pointer"
            transitionDuration={200}
            theme={{ dark: { borderColor: 'slate-600', color: 'slate-300' }, light: { borderColor: 'slate-300', color: 'slate-700' } }}
            hover={{ translateY: -1, shadow: 'large' }}
            fontSize={12}
          >
            Lift effect
          </Box>
        </Flex>
      </DemoCard>

      <DemoCard title="Pointer Events" description="Control click/touch behavior" code='pointerEvents="none"'>
        <Flex gap={4}>
          <Box
            p={3}
            b={1}
            borderRadius={1}
            pointerEvents="none"
            opacity={0.5}
            theme={{ dark: { borderColor: 'slate-600', color: 'slate-300' }, light: { borderColor: 'slate-300', color: 'slate-700' } }}
            fontSize={12}
          >
            pointerEvents="none"
          </Box>
          <Box
            p={3}
            b={1}
            borderRadius={1}
            cursor="pointer"
            theme={{ dark: { borderColor: 'slate-600', color: 'slate-300' }, light: { borderColor: 'slate-300', color: 'slate-700' } }}
            fontSize={12}
          >
            pointerEvents="auto"
          </Box>
        </Flex>
      </DemoCard>

      <DemoCard title="User Select" description="Control text selection" code='userSelect="none"'>
        <Flex gap={4} flexWrap="wrap">
          <Box
            p={3}
            b={1}
            borderRadius={1}
            userSelect="none"
            theme={{ dark: { borderColor: 'slate-600', color: 'slate-300' }, light: { borderColor: 'slate-300', color: 'slate-700' } }}
            fontSize={12}
          >
            Cannot select this
          </Box>
          <Box
            p={3}
            b={1}
            borderRadius={1}
            userSelect="all"
            theme={{ dark: { borderColor: 'slate-600', color: 'slate-300' }, light: { borderColor: 'slate-300', color: 'slate-700' } }}
            fontSize={12}
          >
            Select all at once
          </Box>
        </Flex>
      </DemoCard>

      <DemoCard title="Transitions" description="Animate property changes" code='transition="all" transitionDuration={300}'>
        <Flex gap={4}>
          <Box
            p={3}
            b={1}
            borderRadius={1}
            cursor="pointer"
            transitionDuration={100}
            theme={{ dark: { borderColor: 'slate-600', color: 'slate-300' }, light: { borderColor: 'slate-300', color: 'slate-700' } }}
            hover={{ bgColor: 'violet-500', color: 'white' }}
            fontSize={12}
          >
            100ms
          </Box>
          <Box
            p={3}
            b={1}
            borderRadius={1}
            cursor="pointer"
            transitionDuration={300}
            theme={{ dark: { borderColor: 'slate-600', color: 'slate-300' }, light: { borderColor: 'slate-300', color: 'slate-700' } }}
            hover={{ bgColor: 'violet-500', color: 'white' }}
            fontSize={12}
          >
            300ms
          </Box>
          <Box
            p={3}
            b={1}
            borderRadius={1}
            cursor="pointer"
            transitionDuration={500}
            theme={{ dark: { borderColor: 'slate-600', color: 'slate-300' }, light: { borderColor: 'slate-300', color: 'slate-700' } }}
            hover={{ bgColor: 'violet-500', color: 'white' }}
            fontSize={12}
          >
            500ms
          </Box>
        </Flex>
      </DemoCard>

      <DemoCard
        title="Native Controls (accentColor, caretColor, colorScheme, fieldSizing)"
        description="The parts of a control the page does not draw: a tick, a caret, and the scheme native UI follows"
        code='accentColor="violet-500" caretColor="violet-500"'
      >
        <Flex d="column" gap={3}>
          <Flex gap={4} ai="center" flexWrap="wrap">
            <Checkbox accentColor="violet-500" label="accentColor" defaultChecked />
            <Checkbox accentColor="emerald-500" label="emerald-500" defaultChecked />
            <Checkbox label="the browser's own" defaultChecked />
          </Flex>
          <Textbox
            caretColor="violet-500"
            fieldSizing="content"
            placeholder="fieldSizing=content — type and watch it grow"
            minWidth={40}
            theme={{ dark: { bgColor: 'slate-800', color: 'white' } }}
          />
          <Box fontSize={11} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-500' } }}>
            <code>colorScheme="light dark"</code> is what makes the scrollbars, the form controls and the spellcheck underline follow the
            theme — <code>Box.Theme</code> already sets it on the root.
          </Box>
        </Flex>
      </DemoCard>
    </Flex>
  );
}

function MiscDemo() {
  return (
    <Flex d="column" gap={6}>
      <DemoCard title="Overflow" description="Handle content overflow" code='overflow="hidden"'>
        <Flex gap={4}>
          <Flex d="column" gap={1}>
            <Box fontSize={11} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-500' } }}>
              hidden
            </Box>
            <Box
              width={24}
              height={16}
              overflow="hidden"
              b={1}
              borderStyle="dashed"
              theme={{ dark: { borderColor: 'slate-600' }, light: { borderColor: 'slate-300' } }}
            >
              <DemoBox width={32} height={24} label="Large content" />
            </Box>
          </Flex>
          <Flex d="column" gap={1}>
            <Box fontSize={11} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-500' } }}>
              auto
            </Box>
            <Box
              width={24}
              height={16}
              overflow="auto"
              b={1}
              borderStyle="dashed"
              theme={{ dark: { borderColor: 'slate-600' }, light: { borderColor: 'slate-300' } }}
            >
              <DemoBox width={32} height={24} label="Large content" />
            </Box>
          </Flex>
        </Flex>
      </DemoCard>

      <DemoCard title="Visibility" description="Show/hide without affecting layout" code='visibility="hidden"'>
        <Flex gap={2}>
          <DemoBox p={3} label="1" />
          <DemoBox p={3} visibility="hidden" label="2 (hidden)" />
          <DemoBox p={3} label="3" />
        </Flex>
        <Box fontSize={11} mt={2} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-500' } }}>
          Notice: box 2 is hidden but still takes space
        </Box>
      </DemoCard>

      <DemoCard title="Object Fit" description="Control replaced element sizing" code='objectFit="cover"'>
        <Flex gap={4}>
          {(['fill', 'contain', 'cover'] as const).map((fit) => (
            <Flex key={fit} d="column" gap={1}>
              <Box fontSize={11} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-500' } }}>
                {fit}
              </Box>
              <Box width={20} height={16} b={1} theme={{ dark: { borderColor: 'slate-600' }, light: { borderColor: 'slate-300' } }}>
                <Box tag="img" width="fit" height="fit" objectFit={fit} props={{ src: 'https://picsum.photos/200/100', alt: 'demo' }} />
              </Box>
            </Flex>
          ))}
        </Flex>
      </DemoCard>

      <DemoCard
        title="Responsive Breakpoints (sm, md, lg, xl)"
        description="Apply styles at different screen sizes"
        code="p={2} md={{ p: 4 }} lg={{ p: 6 }}"
      >
        <DemoBox p={2} sm={{ p: 3 }} md={{ p: 4 }} lg={{ p: 5 }} xl={{ p: 6 }} label="Resize window to see padding change" />
        <Box fontSize={11} mt={2} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-500' } }}>
          sm: 640px | md: 768px | lg: 1024px | xl: 1280px
        </Box>
      </DemoCard>

      <DemoCard
        title="Pseudo Classes (hover, focus, active)"
        description="Style different element states"
        code='hover={{ bgColor: "violet-500" }}'
      >
        <Box
          tag="button"
          p={3}
          b={1}
          borderRadius={1}
          cursor="pointer"
          transitionDuration={150}
          theme={{
            dark: { borderColor: 'slate-600', color: 'slate-300', bgColor: 'slate-800' },
            light: { borderColor: 'slate-300', color: 'slate-700', bgColor: 'white' },
          }}
          hover={{ bgColor: 'violet-500', color: 'white', borderColor: 'violet-500' }}
          active={{ bgColor: 'violet-600' }}
          focus={{ outline: 2, outlineColor: 'violet-500', outlineOffset: 2 }}
          fontSize={12}
        >
          Focus, hover, or click me
        </Box>
      </DemoCard>

      <DemoCard
        title="Accessibility Preferences (motionReduce, forcedColors, contrastMore)"
        description="The same shape as a breakpoint, keyed by what the user asked their OS for — and ranked above every breakpoint"
        code="motionReduce={{ transition: 'none' }} forcedColors={{ b: 1 }} contrastMore={{ borderColor: 'black' }}"
      >
        <Flex gap={4} flexWrap="wrap">
          <DemoBox motionReduce={{ borderStyle: 'solid', bgColor: 'violet-500', color: 'white' }} label="motionReduce" />
          <DemoBox forcedColors={{ borderStyle: 'solid', bgColor: 'violet-500', color: 'white' }} label="forcedColors" />
          <DemoBox contrastMore={{ borderStyle: 'solid', bgColor: 'violet-500', color: 'white' }} label="contrastMore" />
        </Flex>
        <Box fontSize={11} mt={2} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-500' } }}>
          Each box fills in when its preference is on — set them in your OS, or emulate all three in Chrome DevTools ▸ Rendering. Reduced
          motion is already handled without any of this: it sets --transitionTime to 0s, so every Box stops animating.
        </Box>
      </DemoCard>

      <DemoCard
        title="Scrollbar Gutter & Will Change (scrollbarGutter, willChange)"
        description="Reserve the scrollbar's space before there is one, and promote an element before it animates rather than during"
        code='scrollbarGutter="stable" willChange="transform"'
      >
        <Flex gap={4} flexWrap="wrap">
          {(['auto', 'stable'] as const).map((scrollbarGutter) => (
            <Flex key={scrollbarGutter} d="column" gap={1}>
              <Box fontSize={10} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-500' } }}>
                scrollbarGutter="{scrollbarGutter}"
              </Box>
              <Box
                width={32}
                height={16}
                overflow="auto"
                scrollbarGutter={scrollbarGutter}
                b={1}
                borderStyle="dashed"
                fontSize={11}
                p={1}
                theme={{ dark: { borderColor: 'slate-600', color: 'slate-300' }, light: { borderColor: 'slate-300', color: 'slate-700' } }}
              >
                Short text — the gutter is reserved even with nothing to scroll, so the text does not shift when there is.
              </Box>
            </Flex>
          ))}
        </Flex>
        <Box fontSize={11} mt={2} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-500' } }}>
          `willChange` is a hint with a real cost — a promoted layer holds memory and can take text off subpixel rendering — so it belongs
          on the few elements that move, never on a list.
        </Box>
      </DemoCard>
    </Flex>
  );
}

// Category content map
const categoryContent: Record<CategoryId, () => ReactNode> = {
  spacing: SpacingDemo,
  sizing: SizingDemo,
  layout: LayoutDemo,
  position: PositionDemo,
  typography: TypographyDemo,
  visual: VisualDemo,
  border: BorderDemo,
  interaction: InteractionDemo,
  misc: MiscDemo,
};

export default function BoxPage() {
  const [activeCategory, setActiveCategory] = useState<CategoryId>('spacing');
  const ActiveContent = categoryContent[activeCategory];

  // APG tabs, because the nine categories used to be clickable `<div>`s: eight of the panels of the
  // largest prop reference on the site could not be reached without a mouse (bug #116). Selection
  // follows focus, which is APG's automatic activation — the panel is already rendered either way.
  // Static ids, not `useIdentifier`: the site's prerendered HTML and its hydration disagree about
  // `useId` (bug #94), and the tabs and the panel are different subtrees — so one kept the server's id
  // while the other took the client's, and `aria-labelledby` pointed at nothing. There is one /box.
  const panelId = 'box-category-panel';
  const tabId = (id: CategoryId) => `box-category-${id}`;
  const selectCategory = (index: number) => setActiveCategory(categories[index].id);
  const roving = useRovingFocus({
    count: categories.length,
    orientation: 'horizontal',
    activeIndex: categories.findIndex((cat) => cat.id === activeCategory),
    onActiveIndexChange: (index) => selectCategory(index),
  });

  return (
    <Box>
      <PageHeader
        icon={BoxIcon}
        title="Box"
        description="The foundational component with CSS-as-props. Build anything with type-safe styling."
      />

      <Reveal delay={0.1}>
        <Flex d="column" gap={8}>
          <Code label="Import" language="jsx" code="import Box from '@box-kite/react';" />

          {/* Category Navigation — a control, so the markdown mirror leaves it out: the page it
              mirrors shows one category at a time and the full list of props is /props.md. */}
          <Box props={{ 'data-md': 'skip' }}>
            <Box fontSize={14} fontWeight={600} theme={{ dark: { color: 'slate-300' }, light: { color: 'slate-700' } }} mb={4}>
              Property Categories
            </Box>
            <Grid
              gridTemplateColumns={3}
              sm={{ gridTemplateColumns: 4 }}
              md={{ gridTemplateColumns: 5 }}
              lg={{ gridTemplateColumns: 9 }}
              gap={2}
              props={{ role: 'tablist', 'aria-label': 'Property categories', onKeyDown: roving.onKeyDown }}
            >
              {categories.map((cat, index) => {
                const Icon = cat.icon;
                const isActive = activeCategory === cat.id;
                const { ref, tabIndex } = roving.itemProps(index);

                return (
                  <Button
                    key={cat.id}
                    ref={ref as Ref<HTMLButtonElement>}
                    d="column"
                    ai="center"
                    gap={2}
                    p={3}
                    borderRadius={2}
                    cursor="pointer"
                    b={1}
                    transitionDuration={150}
                    theme={{
                      dark: {
                        bgColor: isActive ? 'violet-950' : 'slate-800',
                        borderColor: isActive ? 'violet-500' : 'slate-700',
                        color: 'slate-200',
                      },
                      light: {
                        bgColor: isActive ? 'violet-50' : 'white',
                        borderColor: isActive ? 'violet-400' : 'slate-200',
                        color: 'slate-800',
                      },
                    }}
                    hover={{ borderColor: 'violet-500', scale: 1.02 }}
                    active={{ scale: 0.98 }}
                    onClick={() => selectCategory(index)}
                    id={tabId(cat.id)}
                    props={{ role: 'tab', tabIndex, 'aria-selected': isActive, 'aria-controls': panelId }}
                  >
                    <Icon size={20} />
                    <Box fontSize={11} fontWeight={500} textAlign="center">
                      {cat.name}
                    </Box>
                  </Button>
                );
              })}
            </Grid>
          </Box>

          {/* Active Category Content */}
          <Box id={panelId} props={{ role: 'tabpanel', 'aria-labelledby': tabId(activeCategory), tabIndex: 0 }}>
            <Flex ai="center" gap={2} mb={4}>
              <Box fontSize={14} fontWeight={600} theme={{ dark: { color: 'slate-300' }, light: { color: 'slate-700' } }}>
                {categories.find((c) => c.id === activeCategory)?.name} Properties
              </Box>
              <ArrowRight size={14} />
              <Box fontSize={12} theme={{ dark: { color: 'slate-500' }, light: { color: 'slate-400' } }}>
                Interactive demos
              </Box>
            </Flex>
            <Reveal key={activeCategory} x={5} y={0}>
              <ActiveContent />
            </Reveal>
          </Box>
        </Flex>
      </Reveal>
    </Box>
  );
}
