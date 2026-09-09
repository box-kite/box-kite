import { Layers } from 'lucide-react';
import { ReactNode, useState } from 'react';
import overlayApi from '../../api/components/overlay.json';
import Box from '../../src/box';
import Button from '../../src/components/button';
import Flex from '../../src/components/flex';
import Overlay from '../../src/components/overlay';
import { H2 } from '../../src/components/semantics';
import ApiReference from '../components/apiReference';
import Code from '../components/code';
import Mono from '../components/mono';
import PageHeader from '../components/pageHeader';
import Reveal from '../components/reveal';
import useTableOfContents from '../hooks/useTableOfContents';
import { apiSections } from '../site/componentApi';

export default function OverlayPage() {
  useTableOfContents([...apiSections(overlayApi)]);
  const [openAbsolute, setOpenAbsolute] = useState(false);
  const [openOverlay, setOpenOverlay] = useState(false);

  return (
    <Box>
      <PageHeader
        icon={Layers}
        title="Overlay"
        description="Renders its children into a portal, positioned where it is declared — so they escape overflow: hidden, clipped ancestors and stacking contexts."
      />

      <Reveal delay={0.1}>
        <Flex d="column" gap={8}>
          <Code label="Import" language="jsx" code="import Overlay from '@box-kite/react/components/overlay';" />

          <Section title="A layer, not a pattern">
            <Box>
              Overlay owns no open state, no ARIA and no dismissal: it measures where it sits in the layout and renders its children at that
              spot, in the portal container. That is all every popup in this library shares — <Mono>Tooltip</Mono>, <Mono>Dropdown</Mono>{' '}
              and the DataGrid menu each add a different pattern on top. If what you are rendering describes a control, reach for{' '}
              <Mono>Tooltip</Mono> instead: it adds <Mono>role="tooltip"</Mono>, the <Mono>aria-describedby</Mono> wiring, hover-and-focus
              open and Escape.
            </Box>
            <Box mt={4}>
              This component was called <Mono>Tooltip</Mono> before the accessibility work; code that used it purely to escape an overflow
              is this component, unchanged.
            </Box>
          </Section>

          <Code
            label="The problem it solves"
            language="jsx"
            code={`function Component() {
  const [openAbsolute, setOpenAbsolute] = useState(false);
  const [openOverlay, setOpenOverlay] = useState(false);

  return (
    <Flex gap={4} flexWrap="wrap">
      {/* position: absolute — clipped by the scrolling parent */}
      <Box flex1 height={40} b={1} borderRadius={1} overflow="auto" position="relative" minWidth={80}>
        <Flex ml={4}>
          <Button onClick={() => setOpenAbsolute(!openAbsolute)} position="relative" width={30}>
            Click me!
            {openAbsolute && (
              <Box position="absolute" left={0} top={12} height={50} p={3} b={1} borderRadius={2}>
                position absolute box
              </Box>
            )}
          </Button>
        </Flex>
      </Box>

      {/* Overlay — portalled out, so nothing clips it */}
      <Box flex1 height={40} b={1} borderRadius={1} overflow="auto" position="relative" minWidth={80}>
        <Flex ml={4}>
          <Box>
            <Button onClick={() => setOpenOverlay(!openOverlay)} display="block" width={30}>
              Click me!
            </Button>
            {openOverlay && (
              <Overlay height={50} borderRadius={2} p={3} mt={0.5} b={1}>
                overlay box
              </Overlay>
            )}
          </Box>
        </Flex>
      </Box>
    </Flex>
  );
}`}
          >
            <Flex gap={4} flexWrap="wrap">
              <Box flex1 height={40} b={1} borderRadius={1} overflow="auto" position="relative" minWidth={80}>
                <Flex jc="space-between">
                  <Box position="sticky" top={4} textAlign="right" m={4}>
                    (position absolute)
                  </Box>
                  <Box position="sticky" top={4} textAlign="right" m={4}>
                    overflow hidden box
                  </Box>
                </Flex>
                <Flex ml={4}>
                  <Button onClick={() => setOpenAbsolute(!openAbsolute)} position="relative" jc="center" width={30}>
                    Click me!
                    {openAbsolute && (
                      <Box
                        textAlign="left"
                        height={50}
                        borderRadius={2}
                        p={3}
                        left={0}
                        top={12}
                        theme={{
                          light: { bgColor: 'slate-300' },
                          dark: { bgColor: 'slate-700' },
                        }}
                        b={1}
                        position="absolute"
                      >
                        position absolute box
                      </Box>
                    )}
                  </Button>
                </Flex>
              </Box>

              <Box flex1 height={40} b={1} borderRadius={1} overflow="auto" position="relative" minWidth={80}>
                <Flex jc="space-between">
                  <Box position="sticky" top={4} textAlign="right" m={4}>
                    (overlay)
                  </Box>
                  <Box position="sticky" top={4} textAlign="right" m={4}>
                    overflow hidden box
                  </Box>
                </Flex>
                <Flex ml={4}>
                  <Box>
                    <Button onClick={() => setOpenOverlay(!openOverlay)} display="block" width={30}>
                      Click me!
                    </Button>
                    {openOverlay && (
                      <Overlay
                        height={50}
                        borderRadius={2}
                        p={3}
                        mt={0.5}
                        b={1}
                        theme={{
                          light: { bgColor: 'slate-300' },
                          dark: { bgColor: 'slate-700' },
                        }}
                      >
                        overlay box
                      </Overlay>
                    )}
                  </Box>
                </Flex>
              </Box>
            </Flex>
          </Code>

          <Section title="Props">
            <Flex tag="ul" d="column" gap={2}>
              <Bullet>
                <Mono>onPositionChange</Mono> — called with the measured page position, so a caller can decide to open upwards instead.
              </Bullet>
              <Bullet>
                <Mono>adjustTranslateX</Mono> / <Mono>adjustTranslateY</Mono> — CSS lengths added to that position.
              </Bullet>
              <Bullet>
                <Mono>matchWidth</Mono> — on by default: the layer takes the measured width of the space it was declared in, which is what
                lines a dropdown popup up with its trigger. Turn it off for content that should size to itself.
              </Bullet>
              <Bullet>Every Box prop, applied to the layer's content.</Bullet>
            </Flex>
          </Section>
          <ApiReference api={overlayApi} />
        </Flex>
      </Reveal>
    </Box>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box>
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
      <Box width={1} height={1} borderRadius={10} bgColor="indigo-400" />
      <Box flex1>{children}</Box>
    </Flex>
  );
}
