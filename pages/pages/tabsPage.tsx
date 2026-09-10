import { Columns3, Focus, Keyboard, MousePointerClick, Rows3 } from 'lucide-react';
import { ReactNode, useState } from 'react';
import tabsApi from '../../api/components/tabs.json';
import Box from '../../src/box';
import Flex from '../../src/components/flex';
import { H2 } from '../../src/components/semantics';
import Tabs, { TabsReason } from '../../src/components/tabs';
import Textbox from '../../src/components/textbox';
import ApiReference from '../components/apiReference';
import Code from '../components/code';
import Mono from '../components/mono';
import PageHeader from '../components/pageHeader';
import Reveal from '../components/reveal';
import useTableOfContents from '../hooks/useTableOfContents';
import { apiSections } from '../site/componentApi';

export default function TabsPage() {
  useTableOfContents(sidebarLinks);

  const [lastReason, setLastReason] = useState<TabsReason>();
  const [controlled, setControlled] = useState('activity');

  return (
    <Box>
      <PageHeader
        icon={Columns3}
        title="Tabs"
        description="The APG tabs pattern: one list of tabs over one panel at a time, with selection following focus and the arrows following the reading order."
      />

      <Reveal delay={0.1}>
        <Flex d="column" gap={10}>
          <Code label="Import" language="jsx" code="import Tabs from '@box-kite/react/components/tabs';" />

          <Code
            id="usage"
            label="Usage"
            language="jsx"
            code={`<Tabs defaultValue="overview">
  <Tabs.List label="Project">
    <Tabs.Tab value="overview">Overview</Tabs.Tab>
    <Tabs.Tab value="activity">Activity</Tabs.Tab>
    <Tabs.Tab value="settings">Settings</Tabs.Tab>
  </Tabs.List>
  <Tabs.Panel value="overview">Who is on it, and what is left.</Tabs.Panel>
  <Tabs.Panel value="activity">What changed this week.</Tabs.Panel>
  <Tabs.Panel value="settings">Who is allowed to change it.</Tabs.Panel>
</Tabs>`}
          >
            <Box py={6}>
              <Tabs defaultValue="overview">
                <Tabs.List label="Project">
                  <Tabs.Tab value="overview">Overview</Tabs.Tab>
                  <Tabs.Tab value="activity">Activity</Tabs.Tab>
                  <Tabs.Tab value="settings">Settings</Tabs.Tab>
                </Tabs.List>
                <Tabs.Panel value="overview">Who is on it, and what is left.</Tabs.Panel>
                <Tabs.Panel value="activity">What changed this week.</Tabs.Panel>
                <Tabs.Panel value="settings">Who is allowed to change it.</Tabs.Panel>
              </Tabs>
            </Box>
          </Code>

          <Section id="keyboard" title="Selection follows focus">
            <Box>
              One arrow key moves to a tab <em>and</em> shows its panel, which is APG's default and what a reader expects. The three things
              the pattern asks of the keyboard are all here:
            </Box>
            <Box mt={4}>
              <Flex d="column" gap={3}>
                <Note icon={Keyboard} title="One tab stop for the whole list">
                  Tab enters the list once, landing on the selected tab, and again leaves it for the panel — the roving tabindex, so a
                  twelve-tab list is not twelve stops on the way down the page.
                </Note>
                <Note icon={Focus} title="The arrows follow the reading order">
                  Right and Left in a horizontal list, Down and Up in a vertical one, wrapping at the ends and stepping over a disabled tab.
                  In a right-to-left page ArrowLeft is the <em>next</em> tab. The off-axis pair is left to the page, so a horizontal list
                  does not eat a scroll.
                </Note>
                <Note icon={MousePointerClick} title="Manual activation, when a panel is expensive">
                  <Mono>activation="manual"</Mono> splits focus from selection: the arrows move, and Enter or Space chooses. Nothing renders
                  on the way past.
                </Note>
              </Flex>
            </Box>
          </Section>

          <Section id="manual" title="Manual activation">
            <Box>
              Arrow across these and nothing happens until Enter or Space — worth it when a panel fetches or renders something heavy, and
              wrong otherwise, since it costs the reader a keystroke per tab.
            </Box>
            <Code
              language="jsx"
              mt={4}
              code={`<Tabs defaultValue="daily" activation="manual">
  <Tabs.List label="Report">
    <Tabs.Tab value="daily">Daily</Tabs.Tab>
    <Tabs.Tab value="weekly">Weekly</Tabs.Tab>
    <Tabs.Tab value="yearly">Yearly</Tabs.Tab>
  </Tabs.List>
  <Tabs.Panel value="daily">Today, hour by hour.</Tabs.Panel>
  <Tabs.Panel value="weekly">This week, day by day.</Tabs.Panel>
  <Tabs.Panel value="yearly">Twelve months of it.</Tabs.Panel>
</Tabs>`}
            >
              <Box py={6}>
                <Tabs defaultValue="daily" activation="manual">
                  <Tabs.List label="Report">
                    <Tabs.Tab value="daily">Daily</Tabs.Tab>
                    <Tabs.Tab value="weekly">Weekly</Tabs.Tab>
                    <Tabs.Tab value="yearly">Yearly</Tabs.Tab>
                  </Tabs.List>
                  <Tabs.Panel value="daily">Today, hour by hour.</Tabs.Panel>
                  <Tabs.Panel value="weekly">This week, day by day.</Tabs.Panel>
                  <Tabs.Panel value="yearly">Twelve months of it.</Tabs.Panel>
                </Tabs>
              </Box>
            </Code>
          </Section>

          <Section id="vertical" title="Vertical">
            <Box>
              <Mono>orientation="vertical"</Mono> turns the widget's axis, moves the arrows to Down and Up, and puts the indicator on the
              inline end — where it mirrors in a right-to-left page, which a border on the right would not.
            </Box>
            <Code
              language="jsx"
              mt={4}
              code={`<Tabs defaultValue="general" orientation="vertical">
  <Tabs.List label="Settings">
    <Tabs.Tab value="general">General</Tabs.Tab>
    <Tabs.Tab value="members">Members</Tabs.Tab>
    <Tabs.Tab value="billing">Billing</Tabs.Tab>
  </Tabs.List>
  <Tabs.Panel value="general">Name, description, visibility.</Tabs.Panel>
  <Tabs.Panel value="members">Who is in, and what they may do.</Tabs.Panel>
  <Tabs.Panel value="billing">The plan and the invoices.</Tabs.Panel>
</Tabs>`}
            >
              <Box py={6}>
                <Tabs defaultValue="general" orientation="vertical">
                  <Tabs.List label="Settings">
                    <Tabs.Tab value="general">General</Tabs.Tab>
                    <Tabs.Tab value="members">Members</Tabs.Tab>
                    <Tabs.Tab value="billing">Billing</Tabs.Tab>
                  </Tabs.List>
                  <Tabs.Panel value="general">Name, description, visibility.</Tabs.Panel>
                  <Tabs.Panel value="members">Who is in, and what they may do.</Tabs.Panel>
                  <Tabs.Panel value="billing">The plan and the invoices.</Tabs.Panel>
                </Tabs>
              </Box>
            </Code>
          </Section>

          <Section id="disabled" title="Disabled tabs">
            <Box>
              A disabled tab is not selectable and the arrows step over it — the opposite of <Mono>Menu.Item</Mono>, which APG asks stay
              reachable. Selection follows focus here, so a tab focus could reach and selection could not would leave the widget with no
              state to be in.
            </Box>
            <Code
              language="jsx"
              mt={4}
              code={`<Tabs defaultValue="overview">
  <Tabs.List label="Project">
    <Tabs.Tab value="overview">Overview</Tabs.Tab>
    <Tabs.Tab value="audit" disabled>Audit log</Tabs.Tab>
    <Tabs.Tab value="activity">Activity</Tabs.Tab>
  </Tabs.List>
  <Tabs.Panel value="overview">Who is on it.</Tabs.Panel>
  <Tabs.Panel value="activity">What changed.</Tabs.Panel>
</Tabs>`}
            >
              <Box py={6}>
                <Tabs defaultValue="overview">
                  <Tabs.List label="Project">
                    <Tabs.Tab value="overview">Overview</Tabs.Tab>
                    <Tabs.Tab value="audit" disabled>
                      Audit log
                    </Tabs.Tab>
                    <Tabs.Tab value="activity">Activity</Tabs.Tab>
                  </Tabs.List>
                  <Tabs.Panel value="overview">Who is on it.</Tabs.Panel>
                  <Tabs.Panel value="activity">What changed.</Tabs.Panel>
                </Tabs>
              </Box>
            </Code>
          </Section>

          <Section id="mounting" title="Only the selected panel is rendered">
            <Box>
              An unmounted panel costs nothing and gets an entrance for free, since <Mono>startingStyle</Mono> runs on the mount — but it
              also loses whatever state it held. <Mono>keepMounted</Mono> renders them all and hides the rest, which is what a panel holding
              a half-filled form wants. Type into the first field, switch away and back:
            </Box>
            <Code
              language="jsx"
              mt={4}
              code={`<Tabs defaultValue="details" keepMounted>
  <Tabs.List label="New project">
    <Tabs.Tab value="details">Details</Tabs.Tab>
    <Tabs.Tab value="access">Access</Tabs.Tab>
  </Tabs.List>
  <Tabs.Panel value="details"><Textbox props={{ 'aria-label': 'Name' }} /></Tabs.Panel>
  <Tabs.Panel value="access"><Textbox props={{ 'aria-label': 'Owner' }} /></Tabs.Panel>
</Tabs>`}
            >
              <Box py={6}>
                <Tabs defaultValue="details" keepMounted>
                  <Tabs.List label="New project">
                    <Tabs.Tab value="details">Details</Tabs.Tab>
                    <Tabs.Tab value="access">Access</Tabs.Tab>
                  </Tabs.List>
                  <Tabs.Panel value="details">
                    <Textbox props={{ 'aria-label': 'Name' }} mt={2} />
                  </Tabs.Panel>
                  <Tabs.Panel value="access">
                    <Textbox props={{ 'aria-label': 'Owner' }} mt={2} />
                  </Tabs.Panel>
                </Tabs>
              </Box>
            </Code>
            <Box mt={4}>
              A hidden panel carries the <Mono>hidden</Mono> attribute <em>and</em> a <Mono>display: none</Mono> rule of its own, because
              every Box carries <Mono>display: block</Mono> and any author rule outranks the UA's <Mono>[hidden]</Mono> one.
            </Box>
          </Section>

          <Section id="controlled" title="Controlled">
            <Box>
              Pass <Mono>value</Mono> and the consumer owns the selection; <Mono>onValueChange</Mono> reports the new tab and why it changed
              — <Mono>'click'</Mono> or <Mono>'keyboard'</Mono>. The tab sequence follows the selection either way, so a value changed from
              somewhere else on the page moves the keyboard's entry point with it.
            </Box>
            <Code
              language="jsx"
              mt={4}
              code={`const [value, setValue] = useState('activity');

<Tabs value={value} onValueChange={(next, { reason }) => { if (next) setValue(next); log(reason); }}>
  …
</Tabs>`}
            >
              <Box py={6}>
                <Tabs
                  value={controlled}
                  onValueChange={(next, details) => {
                    if (next) setControlled(next);
                    setLastReason(details.reason);
                  }}
                >
                  <Tabs.List label="Controlled">
                    <Tabs.Tab value="overview">Overview</Tabs.Tab>
                    <Tabs.Tab value="activity">Activity</Tabs.Tab>
                    <Tabs.Tab value="members">Members</Tabs.Tab>
                  </Tabs.List>
                  <Tabs.Panel value="overview">Who is on it.</Tabs.Panel>
                  <Tabs.Panel value="activity">What changed.</Tabs.Panel>
                  <Tabs.Panel value="members">Who is allowed in.</Tabs.Panel>
                </Tabs>
                <Box mt={4} fontSize={13} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-500' } }}>
                  value: <Mono>{controlled}</Mono>
                  {lastReason ? (
                    <>
                      {' · '}last change: <Mono>{lastReason}</Mono>
                    </>
                  ) : null}
                </Box>
              </Box>
            </Code>
          </Section>

          <Section id="composition" title="A tab is wherever you wrote it">
            <Box>
              The tabs are read off the DOM rather than out of a registry, so a tab a consumer wrapped in a layout of their own, rendered
              from a list, or put behind a condition is in the order it was written and navigates like any other — and a nested set of tabs
              belongs to its own list, not the one around it.
            </Box>
            <Code
              language="jsx"
              mt={4}
              codeOnly
              code={`<Tabs.List label="Project">
  {views.map((view: { id: string; name: string }) => (
    <Tabs.Tab key={view.id} value={view.id}>{view.name}</Tabs.Tab>
  ))}
</Tabs.List>`}
            />
          </Section>

          <Section id="styling" title="Styling">
            <Box>
              Every part is a Box, so every prop is available, and the defaults live in <Mono>Box.components('tabs')</Mono> — with{' '}
              <Mono>tabs.list</Mono>, <Mono>tabs.tab</Mono> and <Mono>tabs.panel</Mono> beneath it. The selected state is{' '}
              <Mono>aria-selected</Mono>, so <Mono>{`ariaAttr={{ selected: … }}`}</Mono> is what styles it on a tab — inside a style tree
              the same state is the bare <Mono>selected</Mono> key, but as a <em>prop</em> <Mono>selected</Mono> writes the attribute the
              component owns. The indicator is a border rather than a background, because a forced-colors mode throws every background away
              and selection would otherwise read identically on and off.
            </Box>
            <Code
              language="jsx"
              mt={4}
              codeOnly
              code={`<Tabs.Tab
  value="overview"
  px={4}
  ariaAttr={{ selected: { color: 'emerald-600', borderColor: 'emerald-500' } }}
>
  Overview
</Tabs.Tab>`}
            />
          </Section>

          <ApiReference api={tabsApi} />
        </Flex>
      </Reveal>
    </Box>
  );
}

const sidebarLinks = [
  { id: 'usage', label: 'Usage' },
  { id: 'keyboard', label: 'Selection follows focus' },
  { id: 'manual', label: 'Manual activation' },
  { id: 'vertical', label: 'Vertical' },
  { id: 'disabled', label: 'Disabled tabs' },
  { id: 'mounting', label: 'Only one panel' },
  { id: 'controlled', label: 'Controlled' },
  { id: 'composition', label: 'Composition' },
  { id: 'styling', label: 'Styling' },
  ...apiSections(tabsApi),
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

function Note({ icon: Icon, title, children }: { icon: typeof Rows3; title: string; children: ReactNode }) {
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
