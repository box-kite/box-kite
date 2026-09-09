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
        description="A floating layer anchored by the browser and rendered in its top layer — so it escapes overflow: hidden, clipped and transformed ancestors and the z-index wars, and flips when there is no room."
      />

      <Reveal delay={0.1}>
        <Flex d="column" gap={8}>
          <Code label="Import" language="jsx" code="import Overlay from '@box-kite/react/components/overlay';" />

          <Section title="A layer, not a pattern">
            <Box>
              Overlay owns no open state, no ARIA and no dismissal: it names an anchor, asks the browser to put the layer on a side of it,
              and renders it in the browser&apos;s top layer. That is all every popup in this library shares — <Mono>Tooltip</Mono>,{' '}
              <Mono>Dropdown</Mono> and the DataGrid menu each add a different pattern on top. If what you are rendering describes a
              control, reach for <Mono>Tooltip</Mono> instead: it adds <Mono>role="tooltip"</Mono>, the <Mono>aria-describedby</Mono>{' '}
              wiring, hover-and-focus open and Escape.
            </Box>
            <Box mt={4}>
              The placement is CSS anchor positioning — <Mono>useAnchorPosition</Mono> under the hood, so on a browser that has it nothing
              runs at all: no measurement, no scroll listener, no state. The top layer answers the other half of the problem.{' '}
              <Mono>position: fixed</Mono> escapes every <Mono>overflow: hidden</Mono> ancestor but neither a <em>transformed</em> one nor
              the page's stacking order, and a layer has to come out on top of both.
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

      {/* Overlay — in the top layer, so nothing clips it */}
      <Box flex1 height={40} b={1} borderRadius={1} overflow="auto" position="relative" minWidth={80}>
        <Flex ml={4}>
          <Box>
            <Button onClick={() => setOpenOverlay(!openOverlay)} display="block" width={30}>
              Click me!
            </Button>
            {openOverlay && (
              <Overlay height={50} borderRadius={2} p={3} offset={0.5} b={1}>
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
                        offset={0.5}
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

          <Section title="The top layer, and the one rule that comes with it">
            <Box>
              The layer carries <Mono>popover=&quot;manual&quot;</Mono> and is shown the moment it mounts, which puts it in the
              browser&apos;s <b>top layer</b>: it paints over every stacking context and out of every clipped <em>and transformed</em>{' '}
              ancestor, which <Mono>position: fixed</Mono> alone cannot do. Measured in Chrome 152 against a sibling with{' '}
              <Mono>z-index: 9999</Mono>, which covers a plain fixed layer at the same coordinates and loses to this one.{' '}
              <Mono>manual</Mono> rather than <Mono>auto</Mono> because a layer owns no dismissal — <Mono>Popover</Mono> is the{' '}
              <Mono>auto</Mono> one, with light dismiss and focus return from the browser.
            </Box>
            <Box mt={4}>
              Because nothing is moved, the layer inherits the theme, the custom properties and the text direction around it, and the tab
              order runs trigger then layer then the rest of the page. It also means a press inside the layer is a press inside whatever
              popover it was <em>declared</em> in, so a <Mono>Dropdown</Mono> inside a <Mono>Popover</Mono> panel no longer dismisses the
              panel — the bug a portal caused by moving the popup to the end of the body, where every press in it read as outside.
            </Box>
            <Box mt={4}>
              <b>The rule: never declare a layer inside its trigger.</b> A portal used to move it before a browser ever saw it, so{' '}
              <Mono>{'<Button>{overlay}</Button>'}</Mono> worked by accident. It stays where you put it now, and a{' '}
              <Mono>role=&quot;listbox&quot;</Mono> or <Mono>role=&quot;menu&quot;</Mono> full of buttons inside a <Mono>button</Mono> is
              content no keyboard can reach. Put the layer beside the trigger and give it <Mono>anchor</Mono>.
            </Box>
            <Box mt={4}>
              Where the browser has no Popover API the layer is portalled into <Mono>#box-kite-portal</Mono> instead, with everything a
              portal costs — including the direction, which is measured off the anchor and written back on as <Mono>dir</Mono>. Mounting is
              still yours (or <Mono>Presence</Mono>&apos;s): a closed dropdown renders none of its options, and an exit transition runs in
              the top layer like anywhere else.
            </Box>
          </Section>
          <Section title="Where it goes">
            <Flex tag="ul" d="column" gap={2}>
              <Bullet>
                <Mono>anchor</Mono> — the element to hang off. A trigger is almost always the right answer; with none, the layer anchors to
                the spot it was declared in, which is a real box with no size, so <Mono>align</Mono> and <Mono>matchWidth</Mono> have
                nothing to work from.
              </Bullet>
              <Bullet>
                <Mono>side</Mono> / <Mono>align</Mono> / <Mono>offset</Mono> — the placement vocabulary <Mono>Tooltip</Mono> and{' '}
                <Mono>useAnchorPosition</Mono> share. <Mono>side</Mono> is <Mono>top</Mono>/<Mono>bottom</Mono> on the block axis or{' '}
                <Mono>start</Mono>/<Mono>end</Mono> on the inline one, so a layer beside its anchor mirrors in a right-to-left page;{' '}
                <Mono>offset</Mono> is the ÷4 scale.
              </Bullet>
              <Bullet>
                <Mono>flip</Mono> — on by default, so a side with no room is swapped for its opposite by the browser. It shadows the CSS
                prop of that name.
              </Bullet>
              <Bullet>
                <Mono>onSideChange</Mono> — the side it ended up on, which is how the dropdown popup knows to animate upwards instead.
                Asking for it turns on the one read the CSS path otherwise never does.
              </Bullet>
              <Bullet>
                <Mono>matchWidth</Mono> — on by default: the layer is at least as wide as its anchor (<Mono>anchor-size(width)</Mono>,
                measured nowhere), which is what lines a dropdown popup up with its trigger. Turn it off for content that should size to
                itself.
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
