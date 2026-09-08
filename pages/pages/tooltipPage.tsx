import { Keyboard, MessageSquare, MousePointerClick, ShieldCheck } from 'lucide-react';
import { ReactNode, useState } from 'react';
import tooltipApi from '../../api/components/tooltip.json';
import Box from '../../src/box';
import Button from '../../src/components/button';
import Flex from '../../src/components/flex';
import { H2, Span } from '../../src/components/semantics';
import Tooltip, { TooltipReason } from '../../src/components/tooltip';
import ApiReference from '../components/apiReference';
import Code from '../components/code';
import Mono from '../components/mono';
import PageHeader from '../components/pageHeader';
import Reveal from '../components/reveal';
import useTableOfContents from '../hooks/useTableOfContents';
import { apiSections } from '../site/componentApi';

export default function TooltipPage() {
  useTableOfContents(sidebarLinks);

  const [lastReason, setLastReason] = useState<TooltipReason>();

  return (
    <Box>
      <PageHeader
        icon={MessageSquare}
        title="Tooltip"
        description="A description that appears on hover and on focus, wired to its trigger with aria-describedby — the APG tooltip, including the three WCAG 1.4.13 rules everyone forgets."
      />

      <Reveal delay={0.1}>
        <Flex d="column" gap={10}>
          <Code label="Import" language="jsx" code="import Tooltip from '@box-kite/react/components/tooltip';" />

          <Code
            id="usage"
            label="Usage"
            language="jsx"
            code={`<Tooltip content="Deletes the row for good">
  {(trigger) => <Button {...trigger}>Delete</Button>}
</Tooltip>`}
          >
            <Flex gap={4} flexWrap="wrap" ai="center" py={6}>
              <Tooltip content="Deletes the row for good">{(trigger) => <Button {...trigger}>Delete</Button>}</Tooltip>
              <Tooltip content="Hover me, then move the pointer onto the tooltip — it waits for you.">
                {(trigger) => <Button {...trigger}>Hoverable</Button>}
              </Tooltip>
              <Tooltip content="Tab to me: focus shows the tooltip with no delay. Escape puts it away." openDelay={0}>
                {(trigger) => <Button {...trigger}>Keyboard</Button>}
              </Tooltip>
            </Flex>
          </Code>

          <Section id="trigger" title="Why the trigger is a render prop">
            <Box>
              The tooltip has to put <Mono>aria-describedby</Mono> on the element the user lands on — the control itself, not a wrapper
              around it. Cloning a child would mean guessing where that attribute goes, and this library has two answers: Box takes DOM
              attributes in a <Mono>props</Mono> bag, a plain <Mono>&lt;button&gt;</Mono> takes them at the top level. So the trigger is
              handed to you instead, and you say where it belongs. It carries a <Mono>ref</Mono> too — the bubble is positioned against the
              trigger's own box, which is what keeps it under the control and out of the layout.
            </Box>
            <Box mt={4}>
              <Code
                language="jsx"
                codeOnly
                code={`// A Box component — ref and props are both top-level Box props, so one spread does it.
<Tooltip content="Save the draft">{(trigger) => <Button {...trigger}>Save</Button>}</Tooltip>

// A plain element — the same two pieces, named.
<Tooltip content="Save the draft">{(trigger) => <button ref={trigger.ref} {...trigger.props}>Save</button>}</Tooltip>`}
              />
            </Box>
          </Section>

          <Section id="wcag" title="What the component guarantees">
            <Flex d="column" gap={3}>
              <Note icon={ShieldCheck} title="Dismissible — WCAG 1.4.13">
                Escape closes the tooltip and focus does not move. It stays closed while the pointer sits where it is: re-showing it because
                nothing moved would put the user straight back where they were.
              </Note>
              <Note icon={MousePointerClick} title="Hoverable — WCAG 1.4.13">
                Leaving the trigger starts a <Mono>closeDelay</Mono> (150&nbsp;ms) rather than closing, so the pointer can travel onto the
                tooltip — to read a long description, or to select text in it. Once it is on the tooltip, the tooltip keeps it open.
              </Note>
              <Note icon={Keyboard} title="Persistent — WCAG 1.4.13">
                Nothing hides it on a timer. It closes when the pointer leaves and focus has moved on, and not before.
              </Note>
            </Flex>
          </Section>

          <Code
            id="controlled"
            label="Controlled, with the reason it changed"
            language="jsx"
            code={`const [open, setOpen] = useState(false);

<Tooltip
  content="Deletes the row for good"
  open={open}
  onOpenChange={(next, { reason }) => {
    setOpen(next);
    console.log(reason); // 'hover' | 'focus' | 'pointer-leave' | 'blur' | 'escape'
  }}
>
  {(trigger) => <Button {...trigger}>Delete</Button>}
</Tooltip>`}
          >
            <Flex gap={4} ai="center" py={6}>
              <Tooltip content="Watch the reason change" openDelay={0} onOpenChange={(_open, { reason }) => setLastReason(reason)}>
                {(trigger) => <Button {...trigger}>Hover or tab to me</Button>}
              </Tooltip>
              <Span fontSize={14} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-600' } }}>
                last reason: <Mono>{lastReason ?? '—'}</Mono>
              </Span>
            </Flex>
          </Code>

          <Section id="styling" title="Styling">
            <Box>
              Every Box prop on <Mono>&lt;Tooltip&gt;</Mono> styles the bubble, on top of the built-in <Mono>tooltip</Mono> component style
              (inverted against the page, so it reads as an overlay in either theme). <Mono>adjustTranslateX</Mono> and{' '}
              <Mono>adjustTranslateY</Mono> nudge where it lands.
            </Box>
            <Box mt={4}>
              <Code
                language="jsx"
                codeOnly
                code={`<Tooltip content="On brand" bgColor="indigo-600" color="white" borderRadius={2} adjustTranslateY="4px">
  {(trigger) => <Button {...trigger}>Delete</Button>}
</Tooltip>`}
              />
            </Box>
          </Section>

          <Section id="overlay" title="Only need the positioning?">
            <Box>
              A tooltip is a pattern; escaping an <Mono>overflow: hidden</Mono> is not. The portal-and-position half of this component ships
              on its own as <Mono>Overlay</Mono> — no ARIA, no open state, no dismissal — and that is what to reach for when the thing being
              rendered is not a description of a control. Before A3 this component <em>was</em> that primitive, so code that used it to
              escape an overflow becomes <Mono>Overlay</Mono>, unchanged.
            </Box>
            <Box mt={4}>
              <Code
                language="jsx"
                codeOnly
                code={`import Overlay from '@box-kite/react/components/overlay';

<Overlay p={3} bgColor="slate-800">anything, anywhere</Overlay>`}
              />
            </Box>
          </Section>
          <ApiReference api={tooltipApi} />
        </Flex>
      </Reveal>
    </Box>
  );
}

const sidebarLinks = [
  { id: 'usage', label: 'Usage' },
  { id: 'trigger', label: 'Why a render prop' },
  { id: 'keyboard', label: 'Keyboard and pointer' },
  { id: 'wcag', label: 'What it guarantees' },
  { id: 'controlled', label: 'Controlled' },
  { id: 'styling', label: 'Styling' },
  { id: 'overlay', label: 'Only the positioning' },
  ...apiSections(tooltipApi),
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
