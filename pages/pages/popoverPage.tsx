import { Keyboard, Layers, PanelTop, ShieldCheck } from 'lucide-react';
import { ReactNode, useState } from 'react';
import popoverApi from '../../api/components/popover.json';
import Box from '../../src/box';
import Button from '../../src/components/button';
import Checkbox from '../../src/components/checkbox';
import Flex from '../../src/components/flex';
import Popover, { PopoverReason } from '../../src/components/popover';
import { H2 } from '../../src/components/semantics';
import ApiReference from '../components/apiReference';
import Code from '../components/code';
import Mono from '../components/mono';
import PageHeader from '../components/pageHeader';
import Reveal from '../components/reveal';
import useTableOfContents from '../hooks/useTableOfContents';
import { apiSections } from '../site/componentApi';

export default function PopoverPage() {
  useTableOfContents(sidebarLinks);

  const [lastReason, setLastReason] = useState<PopoverReason>();

  return (
    <Box>
      <PageHeader
        icon={PanelTop}
        title="Popover"
        description="A panel anchored to its trigger, on the platform's own Popover API: the top layer, light dismiss and focus return are the browser's, so there is no portal and no z-index to manage."
      />

      <Reveal delay={0.1}>
        <Flex d="column" gap={10}>
          <Code label="Import" language="jsx" code="import Popover from '@box-kite/react/components/popover';" />

          <Code
            id="usage"
            label="Usage"
            language="jsx"
            code={`<Popover label="Filters" trigger={(t) => <Button {...t}>Filters</Button>}>
  <Checkbox label="Only mine" />
</Popover>`}
          >
            <Flex gap={4} flexWrap="wrap" ai="center" py={6}>
              <Popover label="Filters" trigger={(t) => <Button {...t}>Filters</Button>}>
                <Flex d="column" gap={3} minWidth={44}>
                  <Checkbox label="Only mine" />
                  <Checkbox label="Archived" />
                </Flex>
              </Popover>
              <Popover label="Above the trigger" side="top" trigger={(t) => <Button {...t}>Opens up</Button>}>
                <Box>Nothing was measured to put this here.</Box>
              </Popover>
              <Popover label="Beside the trigger" side="end" align="start" trigger={(t) => <Button {...t}>Beside</Button>}>
                <Box>
                  <Mono>side="end"</Mono> is the inline axis, so this mirrors in a right-to-left page.
                </Box>
              </Popover>
            </Flex>
          </Code>

          <Section id="no-portal" title="There is no portal">
            <Box>
              A popover is in the browser's <strong>top layer</strong>: it paints above every stacking context and outside every clipped
              ancestor, which is the entire class of bug a portal exists to work around. Measured in Chrome 152 against a sibling with{' '}
              <Mono>z-index: 9999</Mono>, a <Mono>transform</Mono>ed ancestor and an <Mono>overflow: hidden</Mono> one — the panel wins all
              three, and <Mono>position: fixed</Mono> loses two of them.
            </Box>
            <Box mt={4}>
              Because nothing is moved, the panel keeps everything it inherits where it was declared: the theme around it, the custom
              properties, the text direction, and its place in the tab order — trigger, then panel, then the rest of the page. A portalled
              layer has none of that by default, which is why <Mono>Overlay</Mono> has to carry its direction across by hand.
            </Box>
            <Box mt={4}>
              <Code
                language="jsx"
                codeOnly
                code={`// Inside a clipped, transformed, z-indexed box — and it still escapes all three.
<Box overflow="hidden" translateX={1} position="relative" zIndex={1} height={20}>
  <Popover label="Escapes" trigger={(t) => <Button {...t}>Open</Button>}>
    <Box>Painted above the page, clipped by nothing.</Box>
  </Popover>
</Box>`}
              />
            </Box>
            <Box mt={4}>
              <Flex
                overflow="hidden"
                translateX={1}
                position="relative"
                height={24}
                ai="center"
                px={4}
                borderRadius={2}
                b={1}
                theme={{
                  dark: { bgColor: 'slate-900', borderColor: 'slate-800' },
                  light: { bgColor: 'slate-50', borderColor: 'slate-200' },
                }}
              >
                <Popover label="Escapes its ancestors" trigger={(t) => <Button {...t}>Open me</Button>}>
                  <Box>Clipped by nothing.</Box>
                </Popover>
              </Flex>
            </Box>
          </Section>

          <Section id="mounting" title="The panel is always rendered">
            <Box>
              Closed means <Mono>display: none</Mono> from the browser's own stylesheet, not unmounted. That is what lets the browser own
              showing and hiding — and it is what makes the exit a plain CSS transition instead of a <Mono>&lt;Presence&gt;</Mono>, since
              nothing ever leaves the DOM to be held back. The entrance is <Mono>startingStyle</Mono> and the exit is one prop,{' '}
              <Mono>transitionBehavior="allow-discrete"</Mono>, both already in the component's styles.
            </Box>
            <Box mt={4}>
              The cost is that the children render whether or not anyone has opened it. For a panel that is expensive to build, gate it
              yourself:
            </Box>
            <Box mt={4}>
              <Code
                language="jsx"
                codeOnly
                code={`const [open, setOpen] = useState(false);

<Popover label="Report" open={open} onOpenChange={setOpen} trigger={(t) => <Button {...t}>Report</Button>}>
  {open ? <Box>The expensive part</Box> : null}
</Popover>`}
              />
            </Box>
          </Section>

          <Section id="controlled" title="Controlled, and why a close cannot be refused">
            <Box>
              Leave <Mono>open</Mono> out and the popover owns its state. Pass it and you own it — with one asymmetry that comes from the
              platform: the browser's <Mono>beforetoggle</Mono> event is cancelable when it opens and <strong>not</strong> when it closes.
              So a controlled popover can refuse to open, but a light dismiss has already happened by the time you hear about it. Keep{' '}
              <Mono>open</Mono> true and the component shows it again rather than arguing.
            </Box>
            <Box mt={4}>
              <Code
                language="jsx"
                codeOnly
                code={`<Popover
  label="Filters"
  onOpenChange={(open, { reason }) => console.log(open, reason)}
  trigger={(t) => <Button {...t}>Filters</Button>}
>
  <Checkbox label="Only mine" />
</Popover>`}
              />
            </Box>
            <Flex gap={4} ai="center" mt={4} flexWrap="wrap">
              <Popover
                label="Reasons"
                onOpenChange={(open, { reason }) => setLastReason(reason)}
                trigger={(t) => <Button {...t}>Open, then dismiss it</Button>}
              >
                <Box>Press Escape, or click away.</Box>
              </Popover>
              <Box fontSize={14}>
                Last reason: <Mono>{lastReason ?? '—'}</Mono>
              </Box>
            </Flex>
          </Section>

          <Section id="focus" title="Focus, and the two things the platform does not do">
            <Flex d="column" gap={3}>
              <Note icon={Keyboard} title="Opening moves focus into the panel">
                The Popover API moves focus nowhere unless something inside carries <Mono>autofocus</Mono>. APG's dialog wants focus in the
                panel, so the component puts it there — on the panel itself, which is focusable by script and never by Tab. An{' '}
                <Mono>autofocus</Mono> inside still wins, and <Mono>autoFocus=&#123;false&#125;</Mono> turns the whole thing off.
              </Note>
              <Note icon={ShieldCheck} title="Closing returns focus — unless React got there first">
                The platform returns focus to the trigger when a popover is <em>hidden</em>, and does nothing at all when the element is{' '}
                <em>removed</em> while open — focus falls to <Mono>&lt;body&gt;</Mono>, which is the commonest keyboard bug in a popup. A
                consumer closing a controlled popover removes it, so <Mono>useFocusReturn</Mono> covers exactly that gap.
              </Note>
              <Note icon={Layers} title="Nothing is trapped">
                This is a non-modal dialog: Tab leaves the panel for the rest of the page, and because the panel was never moved, "the rest
                of the page" is what follows the trigger. A modal that holds focus is <Mono>&lt;dialog&gt;</Mono>, and it is a different
                component.
              </Note>
            </Flex>
          </Section>

          <Section id="trigger" title="The trigger is a render prop, and it has to be a button">
            <Box>
              The component hands you a <Mono>ref</Mono> and a bag of attributes rather than cloning a child, for the reason{' '}
              <Mono>Tooltip</Mono> does: Box takes DOM attributes in a <Mono>props</Mono> bag and a plain <Mono>&lt;button&gt;</Mono> takes
              them on top, and guessing wrong costs the wiring the pattern is for.
            </Box>
            <Box mt={4}>
              It must be a <strong>button</strong>. The toggle is the platform's own <Mono>popovertarget</Mono>, which the browser reads off
              a button and nothing else — and handing it over is what fixes the trap every hand-rolled popover falls into: light dismiss
              closes on <Mono>pointerdown</Mono>, so a click handler of your own runs afterwards, reads "closed", and opens it straight back
              up. Pressing the trigger of an open popover would never close it.
            </Box>
            <Box mt={4}>
              <Code
                language="jsx"
                codeOnly
                code={`// A Box component — ref and props are both top-level Box props, so one spread does it.
<Popover label="Filters" trigger={(t) => <Button {...t}>Filters</Button>}>
  <Checkbox label="Only mine" />
</Popover>

// A plain element — the same two pieces, named.
<Popover label="Filters" trigger={(t) => <button ref={t.ref} {...t.props}>Filters</button>}>
  <Checkbox label="Only mine" />
</Popover>`}
              />
            </Box>
          </Section>

          <Section id="fallback" title="Where the browser has no Popover API">
            <Box>
              The Popover API is Baseline and widely available; anchor positioning is not, and neither is universal. Where either is missing
              the panel falls back to a portalled <Mono>Overlay</Mono> with <Mono>useDismiss</Mono> and <Mono>useFocusReturn</Mono>{' '}
              supplying what the platform would have. The API is identical and so is the styling; what you lose is what the portal costs,
              which is the tab order and a local theme following the markup. That is the older browser's price rather than a choice.
            </Box>
          </Section>

          <Section id="styling" title="Styling">
            <Box>
              The panel is a Box, so every prop is available on it, and the defaults live in <Mono>Box.components('popover')</Mono> —
              including the reset for the border, padding and system colours the browser's own <Mono>[popover]</Mono> rules put underneath
              it.
            </Box>
            <Box mt={4}>
              <Code
                language="jsx"
                codeOnly
                code={`<Popover label="Wide" p={6} maxWidth={100} borderRadius={4} shadow="large" trigger={(t) => <Button {...t}>Open</Button>}>
  <Box>Any Box prop, including a theme.</Box>
</Popover>`}
              />
            </Box>
          </Section>

          <ApiReference api={popoverApi} />
        </Flex>
      </Reveal>
    </Box>
  );
}

const sidebarLinks = [
  { id: 'usage', label: 'Usage' },
  { id: 'no-portal', label: 'There is no portal' },
  { id: 'mounting', label: 'Always rendered' },
  { id: 'controlled', label: 'Controlled' },
  { id: 'focus', label: 'Focus' },
  { id: 'trigger', label: 'The trigger' },
  { id: 'fallback', label: 'The fallback' },
  { id: 'styling', label: 'Styling' },
  ...apiSections(popoverApi),
];

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

function Note({ icon: Icon, title, children }: { icon: typeof ShieldCheck; title: string; children: ReactNode }) {
  return (
    <Flex
      gap={3}
      p={4}
      borderRadius={2}
      b={1}
      theme={{
        dark: { bgColor: 'slate-900', borderColor: 'slate-800' },
        light: { bgColor: 'slate-50', borderColor: 'slate-200' },
      }}
    >
      <Box theme={{ dark: { color: 'indigo-400' }, light: { color: 'indigo-500' } }} pt={0.5}>
        <Icon size={16} />
      </Box>
      <Box>
        <Box fontSize={14} fontWeight={600} mb={1} theme={{ dark: { color: 'slate-200' }, light: { color: 'slate-800' } }}>
          {title}
        </Box>
        <Box fontSize={14}>{children}</Box>
      </Box>
    </Flex>
  );
}
