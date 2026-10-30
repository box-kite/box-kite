import Box from '../../src/box';
import Flex from '../../src/components/flex';
import Grid from '../../src/components/grid';
import { H2, P, Span } from '../../src/components/semantics';
import Switch from '../../src/components/switch';

// The article's own snippets, run: an image named `before-after.png` is replaced by `BeforeAfter`. Keep each identical to its code block.

const card = {
  d: 'column',
  gap: 3,
  p: 4,
  b: 1,
  borderRadius: 3,
  theme: { light: { bgColor: 'white', borderColor: 'base-200' }, dark: { bgColor: 'base-950', borderColor: 'base-800' } },
} as const;

const muted = { fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: 'base-500' } as const;

function Code({ children }: { children: React.ReactNode }) {
  return (
    <Box tag="code" fontSize={14} fontWeight={600} theme={{ light: { color: 'base-900' }, dark: { color: 'base-100' } }}>
      {children}
    </Box>
  );
}

function Verdict({ rejected, children }: { rejected?: boolean; children: React.ReactNode }) {
  const tone = rejected
    ? ({ light: { bgColor: 'red-50', color: 'red-700' }, dark: { bgColor: 'red-950', color: 'red-300' } } as const)
    : ({ light: { bgColor: 'amber-50', color: 'amber-800' }, dark: { bgColor: 'amber-950', color: 'amber-300' } } as const);

  return (
    <Span alignSelf="start" px={2} py={0.5} borderRadius={1} fontSize={13} fontWeight={600} theme={tone}>
      {children}
    </Span>
  );
}

/** One preview, labelled: what the engine drew, or what the prop was meant to draw. */
function Preview({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Flex d="column" gap={1}>
      <Span {...muted}>{label}</Span>
      <Box minHeight={10} p={2} borderRadius={2} theme={{ light: { bgColor: 'base-50' }, dark: { bgColor: 'base-900' } }}>
        {children}
      </Box>
    </Flex>
  );
}

function Pill() {
  return <Box width={8} height={4} borderRadius={2} bgColor="accent-500" />;
}

// The three props from the hook, drawn by the engine with the values the assistant wrote.
export function SilentMistakes() {
  return (
    <Grid gridTemplateColumns={1} gap={3} md={{ gridTemplateColumns: 3 }}>
      <Flex {...card}>
        <Code>jc="between"</Code>
        <Verdict rejected>❌ wrote no CSS</Verdict>
        <Preview label="Rendered">
          <Flex jc={'between' as never} ai="center" gap={2} fontSize={14}>
            <Span>Email</Span>
            <Pill />
          </Flex>
        </Preview>
        <Preview label="Meant">
          <Flex jc="space-between" ai="center" gap={2} fontSize={14}>
            <Span>Email</Span>
            <Pill />
          </Flex>
        </Preview>
      </Flex>
      <Flex {...card}>
        <Code>fontSize={'{4}'}</Code>
        <Verdict>⚠️ 4px text</Verdict>
        <Preview label="Rendered">
          <Span fontSize={4}>Email me about new comments</Span>
        </Preview>
        <Preview label="Meant">
          <Span fontSize={16}>Email me about new comments</Span>
        </Preview>
      </Flex>
      <Flex {...card}>
        <Code>lineHeight={'{1.5}'}</Code>
        <Verdict>⚠️ a 1.5px line</Verdict>
        <Preview label="Rendered">
          <P fontSize={14} lineHeight={1.5}>
            Email me about new comments and send a weekly digest
          </P>
        </Preview>
        <Preview label="Meant">
          <P fontSize={14} lineHeight={20}>
            Email me about new comments and send a weekly digest
          </P>
        </Preview>
      </Flex>
    </Grid>
  );
}

const moments = [
  { when: 'Picking what to build', question: 'Is there a component or a block for this?', tools: ['search_docs', 'get_blocks'] },
  { when: 'Composing it', question: 'What does it take, and which keys does it handle?', tools: ['get_component', 'get_rules'] },
  { when: 'Writing a prop', question: 'What does a number on fontSize write?', tools: ['get_props'] },
  { when: 'Before trusting a value', question: 'Does this exact value write CSS?', tools: ['check_styles'] },
];

// When an agent asks the server, as against the rules file it read once at the start.
export function WhenToAsk() {
  return (
    <Flex d="column" gap={3}>
      <Flex ai="center" gap={3} fontSize={14} theme={{ light: { color: 'base-600' }, dark: { color: 'base-400' } }}>
        <Span {...muted} flexShrink={0}>
          Task starts
        </Span>
        <Span>AGENTS.md and the rules file are read once, up front</Span>
      </Flex>
      <Grid gridTemplateColumns={1} gap={3} md={{ gridTemplateColumns: 4 }}>
        {moments.map((moment, index) => (
          <Flex key={moment.when} {...card} gap={2}>
            <Flex ai="center" gap={2}>
              <Flex
                jc="center"
                ai="center"
                flexShrink={0}
                width={6}
                height={6}
                borderRadius={3}
                fontSize={13}
                fontWeight={700}
                color="white"
                bgColor="accent-500"
              >
                {index + 1}
              </Flex>
              <Span fontSize={14} fontWeight={600}>
                {moment.when}
              </Span>
            </Flex>
            <Span fontSize={13} lineHeight={20} theme={{ light: { color: 'base-600' }, dark: { color: 'base-400' } }}>
              {moment.question}
            </Span>
            <Flex gap={1} flexWrap="wrap" mt="auto">
              {moment.tools.map((tool) => (
                <Span
                  key={tool}
                  px={2}
                  py={0.5}
                  borderRadius={1}
                  fontSize={12}
                  fontWeight={600}
                  theme={{ light: { bgColor: 'accent-50', color: 'accent-700' }, dark: { bgColor: 'accent-950', color: 'accent-300' } }}
                >
                  {tool}
                </Span>
              ))}
            </Flex>
          </Flex>
        ))}
      </Grid>
    </Flex>
  );
}

// The first draft, as written. `rounded` and `borderBottom` are left out: they are not props, so they write nothing either way.
function DraftSettings() {
  return (
    <Flex d="column" p={6} shadow="md" bgColor="white" color="gray-900" borderColor={'gray-150' as never}>
      <H2 fontSize={5} fontWeight={'semibold' as never}>
        Notifications
      </H2>
      <Flex jc={'between' as never} ai="center" py={3}>
        <Span lineHeight={1.5}>Email me about new comments</Span>
        <Switch name="comments" defaultChecked />
      </Flex>
    </Flex>
  );
}

const row = {
  width: 'fit',
  d: 'row-reverse',
  jc: 'space-between',
  gap: 3,
  py: 3,
  bb: 1,
  borderColor: 'gray-200',
  fontSize: 14,
  lineHeight: 20,
} as const;

export function NotificationSettings() {
  return (
    <Flex d="column" p={6} borderRadius={3} shadow="md" bgColor="white" color="gray-900" b={1} borderColor="gray-200">
      <H2 fontSize={20} fontWeight={600} mb={2}>
        Notifications
      </H2>
      <Switch name="comments" defaultChecked label="Email me about new comments" labelProps={row} props={{ 'data-setting': 'email' }} />
      <Switch name="digest" label="Weekly digest" labelProps={row} props={{ 'data-setting': 'digest' }} />
    </Flex>
  );
}

export function BeforeAfter() {
  return (
    <Grid gridTemplateColumns={1} gap={6} md={{ gridTemplateColumns: 2 }}>
      <Flex d="column" gap={2}>
        <Span {...muted}>First draft, as rendered</Span>
        <DraftSettings />
      </Flex>
      <Flex d="column" gap={2}>
        <Span {...muted}>After check_styles</Span>
        <NotificationSettings />
      </Flex>
    </Grid>
  );
}
