import { ToggleLeft } from 'lucide-react';
import { ReactNode, useState } from 'react';
import Box from '../../src/box';
import Flex from '../../src/components/flex';
import { H2 } from '../../src/components/semantics';
import Switch from '../../src/components/switch';
import Code from '../components/code';
import PageHeader from '../components/pageHeader';
import Reveal from '../components/reveal';
import useTableOfContents from '../hooks/useTableOfContents';

export default function SwitchPage() {
  useTableOfContents(sidebarLinks);

  const [notify, setNotify] = useState(true);
  const [emerald, setEmerald] = useState(true);

  return (
    <Box>
      <PageHeader
        icon={ToggleLeft}
        title="Switch"
        description="An on/off control. A real checkbox input underneath, wearing role=switch — so a screen reader says on and off, and a form still submits it."
      />

      <Reveal delay={0.1}>
        <Flex d="column" gap={10}>
          <Code label="Import" language="jsx" code="import Switch from '@box-kite/react/components/switch';" />

          <Code id="usage" label="Usage" language="jsx" code={`<Switch name="notify" label="Email notifications" defaultChecked />`}>
            <Flex d="column" gap={3}>
              <Switch name="notify-demo" label="Email notifications" defaultChecked />
              <Switch name="digest-demo" label="Weekly digest" />
              <Switch name="beta-demo" label="Beta features" disabled />
            </Flex>
          </Code>

          <Section id="why" title="Why it is still an input">
            <Box>
              A switch drawn from a <Mono>&lt;div&gt;</Mono> has to reimplement focus, Space, the disabled state and the tab order — and it
              submits nothing. This one is the same <Mono>&lt;input type=&quot;checkbox&quot;&gt;</Mono> a <Mono>Checkbox</Mono> renders,
              with <Mono>role=&quot;switch&quot;</Mono> over it, so all of that comes from the platform. The role is the whole difference to
              a screen reader: &quot;on&quot;/&quot;off&quot; rather than &quot;checked&quot;/&quot;not checked&quot;.
            </Box>
            <Box mt={4}>
              The track and the thumb are one element and its <Mono>::before</Mono>. Nothing decorative is in the accessibility tree, and
              there is no second element to keep in sync with the first.
            </Box>
          </Section>

          <Section id="keyboard" title="Keyboard">
            <KeyTable />
          </Section>

          <Code
            id="controlled"
            label="Controlled"
            language="jsx"
            code={`const [notify, setNotify] = useState(true);

<Switch name="notify" label="Email notifications" checked={notify} onChange={(e) => setNotify(e.target.checked)} />`}
          >
            <Flex gap={6} ai="center">
              <Switch name="notify-controlled" label="Email notifications" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
              <Box fontSize={14} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-600' } }}>
                <Mono>{notify ? 'on' : 'off'}</Mono>
              </Box>
            </Flex>
          </Code>

          <Section id="styling" title="Styling">
            <Box>
              Box props on <Mono>&lt;Switch&gt;</Mono> style the track, on top of the built-in <Mono>switch</Mono> component style;{' '}
              <Mono>labelProps</Mono> styles the <Mono>&lt;label&gt;</Mono> around the pair. <Mono>checked</Mono> is both the state and the
              styles for it — the tuple form takes the value first and what <Mono>:checked</Mono> should look like second, so recolouring
              the on state does not need a second prop or a class of your own.
            </Box>
            <Box mt={4}>
              <Code
                language="jsx"
                codeOnly
                code={`<Switch
  name="notify"
  label="Email notifications"
  checked={[on, { bgColor: 'emerald-500' }]}
  onChange={(e) => setOn(e.target.checked)}
  labelProps={{ gap: 3, fontSize: 14 }}
/>`}
              />
            </Box>
            <Box mt={4}>
              <Flex gap={6}>
                <Switch
                  name="styled-demo"
                  label="Emerald"
                  checked={[emerald, { bgColor: 'emerald-500' }]}
                  onChange={(e) => setEmerald(e.target.checked)}
                  labelProps={{ gap: 3 }}
                />
              </Flex>
            </Box>
          </Section>
        </Flex>
      </Reveal>
    </Box>
  );
}

const sidebarLinks = [
  { id: 'usage', label: 'Usage' },
  { id: 'why', label: 'Why it is an input' },
  { id: 'keyboard', label: 'Keyboard' },
  { id: 'controlled', label: 'Controlled' },
  { id: 'styling', label: 'Styling' },
] as const;

const interactions: { input: string; result: string }[] = [
  { input: 'Tab', result: 'Focuses the switch — it is one tab stop, like any other control.' },
  { input: 'Space', result: 'Toggles it. The platform supplies this one.' },
  {
    input: 'Enter',
    result: 'Toggles it too, and does not submit the surrounding form. APG lists Enter as optional; a bare checkbox ignores it.',
  },
];

function KeyTable() {
  return (
    <Box tag="table" width="fit" css={{ borderCollapse: 'collapse' }}>
      <Box tag="thead">
        <Box tag="tr">
          <HeadCell>Key</HeadCell>
          <HeadCell>Result</HeadCell>
        </Box>
      </Box>
      <Box tag="tbody">
        {interactions.map((row) => (
          <Box tag="tr" key={row.input}>
            <Cell>
              <Mono>{row.input}</Mono>
            </Cell>
            <Cell>{row.result}</Cell>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

function HeadCell({ children }: { children: ReactNode }) {
  return (
    <Box
      tag="th"
      textAlign="left"
      fontSize={13}
      fontWeight={600}
      py={2}
      pr={6}
      bb={1}
      theme={{ dark: { color: 'slate-300', borderColor: 'slate-700' }, light: { color: 'slate-700', borderColor: 'slate-200' } }}
    >
      {children}
    </Box>
  );
}

function Cell({ children }: { children: ReactNode }) {
  return (
    <Box
      tag="td"
      fontSize={14}
      py={2}
      pr={6}
      bb={1}
      theme={{ dark: { color: 'slate-400', borderColor: 'slate-800' }, light: { color: 'slate-600', borderColor: 'slate-100' } }}
    >
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

function Mono({ children }: { children: ReactNode }) {
  return (
    <Box
      tag="code"
      display="inline"
      px={1}
      borderRadius={1}
      fontSize={13}
      theme={{ dark: { bgColor: 'slate-800', color: 'slate-200' }, light: { bgColor: 'slate-100', color: 'slate-800' } }}
    >
      {children}
    </Box>
  );
}
