import { ToggleLeft } from 'lucide-react';
import { ReactNode, useState } from 'react';
import switchApi from '../../api/components/switch.json';
import Box from '../../src/box';
import Flex from '../../src/components/flex';
import { H2 } from '../../src/components/semantics';
import Switch from '../../src/components/switch';
import ApiReference from '../components/apiReference';
import Code from '../components/code';
import Mono from '../components/mono';
import PageHeader from '../components/pageHeader';
import Reveal from '../components/reveal';
import useTableOfContents from '../hooks/useTableOfContents';
import { apiSections } from '../site/componentApi';

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
          <ApiReference api={switchApi} />
        </Flex>
      </Reveal>
    </Box>
  );
}

const sidebarLinks = [
  { id: 'usage', label: 'Usage' },
  { id: 'why', label: 'Why it is an input' },
  { id: 'controlled', label: 'Controlled' },
  { id: 'styling', label: 'Styling' },
  ...apiSections(switchApi),
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
