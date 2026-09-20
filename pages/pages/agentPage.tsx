import { Bot, ShieldCheck, Sparkles } from 'lucide-react';
import { ReactNode, useEffect, useRef, useState } from 'react';
import approvalApi from '../../api/components/approvalcard.json';
import reasoningApi from '../../api/components/reasoning.json';
import toolCallApi from '../../api/components/toolcallcard.json';
import Box from '../../src/box';
import { ApprovalCard, ApprovalDecision, Reasoning, ToolCallCard, ToolCallStatus } from '../../src/components/agent';
import Button from '../../src/components/button';
import Flex from '../../src/components/flex';
import { H2 } from '../../src/components/semantics';
import ApiReference from '../components/apiReference';
import Code from '../components/code';
import Mono from '../components/mono';
import PageHeader from '../components/pageHeader';
import Reveal from '../components/reveal';
import useTableOfContents from '../hooks/useTableOfContents';
import { apiSections } from '../site/componentApi';

const THOUGHT =
  'The order is 4182 and the customer is asking for a refund. The refund window is 30 days; the order was placed on the 4th, so it is still open. The amount is 6,400 MDL, which is over the 5,000 threshold, so a person has to say yes.';

export default function AgentPage() {
  useTableOfContents(sidebarLinks);

  return (
    <Box>
      <PageHeader
        icon={Bot}
        title="Agent"
        description="The three parts of an agent's turn that are not prose: what it ran, what it was thinking, and what it wants permission to do."
      />

      <Reveal delay={0.1}>
        <Flex d="column" gap={10}>
          <Code
            label="Import"
            language="jsx"
            code="import { ToolCallCard, ApprovalCard, Reasoning } from '@box-kite/react/components/agent';"
          />

          <Section id="usage" title="One turn, from thought to decision">
            <Box>
              A tool call, its reasoning and the gate in front of the next step. Press the button and the turn runs — the same four statuses
              an agent runtime reports, in the order it reports them.
            </Box>
            <Box mt={4}>
              <LiveTurn />
            </Box>
            <Box mt={4}>
              <Code
                language="jsx"
                codeOnly
                code={`<Reasoning duration={1200}>{reasoningText}</Reasoning>

<ToolCallCard name="searchOrders" status="success" input={{ orderId: 4182 }} output={{ total: 6400 }} />

<ApprovalCard
  title="Refund order 4182"
  description="6,400 MDL back to the customer. This cannot be undone."
  input={{ orderId: 4182, amount: 6400 }}
  onDecisionChange={(decision) => respond(decision === 'approved')}
/>`}
              />
            </Box>
          </Section>

          <Section id="status" title="The status is a word, not a colour">
            <Box>
              Four states — <Mono>pending</Mono>, <Mono>running</Mono>, <Mono>success</Mono>, <Mono>error</Mono> — and each carries its own
              label beside the dot. A forced-colors mode throws a tint away and a screen reader never had it, so a state told by fill alone
              is a state half the readers of a transcript cannot see.
            </Box>
            <Box mt={4}>
              <Code language="jsx" code={`<ToolCallCard name="searchOrders" status="running" input={{ query: 'refunds' }} />`}>
                <Flex d="column" gap={3} py={4}>
                  {(['pending', 'running', 'success', 'error'] as ToolCallStatus[]).map((status) => (
                    <ToolCallCard
                      key={status}
                      name="searchOrders"
                      status={status}
                      input={{ query: 'refunds', limit: 20 }}
                      output={status === 'success' ? [{ id: 4182, total: 6400 }] : undefined}
                      error={status === 'error' ? 'The search index is rebuilding. Try again in a minute.' : undefined}
                    />
                  ))}
                </Flex>
              </Code>
            </Box>
            <Box mt={4}>
              They map one for one onto what every runtime already reports under its own spelling — AI SDK's <Mono>input-streaming</Mono>,{' '}
              <Mono>input-available</Mono>, <Mono>output-available</Mono> and <Mono>output-error</Mono> — so wiring a part to a card is a
              lookup rather than a state machine.
            </Box>
            <Box mt={4}>
              <Code
                language="jsx"
                codeOnly
                check={false}
                code={`const STATUS = {
  'input-streaming': 'pending',
  'input-available': 'running',
  'output-available': 'success',
  'output-error': 'error',
};

{message.parts.map((part) =>
  part.type.startsWith('tool-') ? (
    <ToolCallCard
      key={part.toolCallId}
      name={part.type.slice(5)}
      status={STATUS[part.state]}
      input={part.input}
      output={part.output}
      error={part.errorText}
    />
  ) : null,
)}`}
              />
            </Box>
          </Section>

          <Section id="values" title="A value is whatever the model produced">
            <Box>
              A tool's arguments are not data an app wrote — they are JSON a model invented, and it can be circular, hold a{' '}
              <Mono>BigInt</Mono>, or be four megabytes long. All three make <Mono>JSON.stringify</Mono> throw or freeze the frame, so the
              card formats rather than trusts: the text is capped at <Mono>valueLimit</Mono> (20,000 characters) with a line saying how much
              was left, and a value that cannot be serialised is described instead of crashing the transcript around it.
            </Box>
            <Box mt={4}>
              <Note icon={Sparkles} title="The judgement is a model, not a component">
                <Mono>AgentUtils.formatValue</Mono>, <Mono>formatDuration</Mono> and <Mono>statusLabel</Mono> are framework-free and
                exported from the same entry, so the same decisions can be made in a server route, a test or a log line.
              </Note>
            </Box>
            <Box mt={4}>
              <Code
                language="jsx"
                codeOnly
                code={`import { AgentUtils } from '@box-kite/react/components/agent';

const { text, truncated } = AgentUtils.formatValue(part.output, 4000);`}
              />
            </Box>
            <Box mt={4}>
              A card with nothing to show renders no control at all: a header that discloses nothing is a tab stop nobody wants to land on.
              Pass <Mono>collapsible={'{false}'}</Mono> to keep a row of text whatever it holds.
            </Box>
          </Section>

          <Section id="approval" title="The decision is one channel">
            <Box>
              <Mono>onDecisionChange(decision, {'{ reason }'})</Mono> is the whole API — the decision says what was chosen and the reason
              says which button chose it, the shape every other component in the library reports through. It maps straight onto AI SDK 6's{' '}
              <Mono>needsApproval</Mono>, CopilotKit's <Mono>renderAndWaitForResponse</Mono> and AG-UI's <Mono>INTERRUPT</Mono>.
            </Box>
            <Box mt={4}>
              <Code
                language="jsx"
                code={`<ApprovalCard title="Refund order 4182" input={{ orderId: 4182 }} onDecisionChange={() => {}} />`}
              >
                <Flex d="column" gap={4} py={4}>
                  <ApprovalCard
                    title="Refund order 4182"
                    description="6,400 MDL back to the customer. This cannot be undone."
                    input={{ orderId: 4182, amount: 6400, currency: 'MDL' }}
                  />
                </Flex>
              </Code>
            </Box>
            <Box mt={4}>
              <Note icon={ShieldCheck} title="Two things a decision card must not do">
                It does not take focus. An agent's turn arrives while the reader is somewhere else, and a card that grabs the keyboard is
                one that gets answered by accident — <Mono>autoFocus</Mono> is the opt-in, and it lands on <em>Reject</em>, which is APG's
                rule for a decision: the least destructive action. And it does not announce itself; the transcript it is rendered into is
                what does that. What the card owns is the <em>answer</em>, in a live region that is in the DOM before there is anything in
                it — a region inserted together with its text is not reliably read out.
              </Note>
            </Box>
            <Box mt={4}>
              <Mono>busy</Mono> is the round trip: both buttons disabled and <Mono>aria-busy</Mono> on the card while the answer is on its
              way to a server. Once there is a decision the buttons are gone, because a decision that can be pressed twice is not one.
            </Box>
          </Section>

          <Section id="reasoning" title="Reasoning is an aside">
            <Box>
              Closed by default, because a chain of thought is an aside and a transcript of them is unreadable. <Mono>streaming</Mono>{' '}
              changes what the header says and shimmers it; whether it also opens is the app's call, since that is a value somebody may be
              controlling — <Mono>open={'{streaming}'}</Mono> is the usual answer, and <Mono>duration</Mono> is what the header says once it
              is over.
            </Box>
            <Box mt={4}>
              <Code language="jsx" code={`<Reasoning duration={4200}>{thought}</Reasoning>`}>
                <Flex d="column" gap={4} py={4}>
                  <Reasoning duration={4200}>{THOUGHT}</Reasoning>
                </Flex>
              </Code>
            </Box>
            <Box mt={4}>
              It opens in the same one-row grid an <Mono>Accordion</Mono> panel does — a track running <Mono>1fr</Mono> to <Mono>0fr</Mono>,
              so nothing is measured, nothing is written per instance and the rules are shared with every other disclosure on the page.
            </Box>
          </Section>

          <Section id="styling" title="Styling">
            <Box>
              Three trees: <Mono>toolCall</Mono> with <Mono>header</Mono>, <Mono>summary</Mono>, <Mono>name</Mono>, <Mono>description</Mono>
              , <Mono>status</Mono> (and <Mono>status.dot</Mono>), <Mono>arrow</Mono>, <Mono>body</Mono>, <Mono>section</Mono>,{' '}
              <Mono>label</Mono>, <Mono>value</Mono> and <Mono>truncated</Mono> under it; <Mono>approval</Mono> with <Mono>title</Mono>,{' '}
              <Mono>description</Mono>, the same three value nodes, <Mono>footer</Mono>, <Mono>actions</Mono>, <Mono>button</Mono> and{' '}
              <Mono>decision</Mono>; and <Mono>reasoning</Mono> with <Mono>trigger</Mono>, <Mono>arrow</Mono>, <Mono>duration</Mono> and{' '}
              <Mono>body</Mono>. The status is a variant on <Mono>toolCall.status</Mono> and the decision one on <Mono>approval</Mono>{' '}
              itself, so a card can be re-skinned per state without a prop.
            </Box>
            <Box mt={4}>
              <Code
                language="jsx"
                codeOnly
                code={`Box.components({
  toolCall: { styles: { borderRadius: 3, shadow: 'xs' } },
  approval: { variants: { approved: { bgColor: 'emerald-100' } } },
});`}
              />
            </Box>
          </Section>

          <ApiReference api={toolCallApi} />

          <ApiReference api={approvalApi} />

          <ApiReference api={reasoningApi} />
        </Flex>
      </Reveal>
    </Box>
  );
}

/** Where the demo turn has got to. Each step is one render of the three cards, in the state it is in. */
const STEPS = ['idle', 'thinking', 'searching', 'searched', 'deciding'] as const;

type Step = (typeof STEPS)[number];

/** How long each step is left on screen before the next one, in milliseconds. */
const TIMINGS: Partial<Record<Step, number>> = { thinking: 1400, searching: 1200, searched: 700 };

function LiveTurn() {
  const [step, setStep] = useState<Step>('idle');
  const [decision, setDecision] = useState<ApprovalDecision | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const wait = TIMINGS[step];

    if (wait === undefined) return;

    timer.current = setTimeout(() => setStep(STEPS[STEPS.indexOf(step) + 1]), wait);

    return () => clearTimeout(timer.current);
  }, [step]);

  const run = () => {
    setDecision(null);
    setStep('thinking');
  };

  const status: ToolCallStatus = step === 'searching' ? 'running' : step === 'idle' || step === 'thinking' ? 'pending' : 'success';

  return (
    <Box>
      <Flex gap={4} ai="center" mb={4} flexWrap="wrap">
        <Button onClick={run}>{step === 'idle' ? 'Run the turn' : 'Run it again'}</Button>
      </Flex>
      <Flex d="column" gap={3}>
        <Reasoning streaming={step === 'thinking'} open={step === 'thinking'} duration={step === 'idle' ? undefined : 1400}>
          {THOUGHT}
        </Reasoning>
        <ToolCallCard
          name="searchOrders"
          description="Looking the order up before anything is changed"
          status={status}
          input={{ orderId: 4182 }}
          output={status === 'success' ? { id: 4182, total: 6400, currency: 'MDL', placed: '2026-09-04' } : undefined}
        />
        {step === 'deciding' && (
          <ApprovalCard
            title="Refund order 4182"
            description="6,400 MDL back to the customer. This cannot be undone."
            input={{ orderId: 4182, amount: 6400, currency: 'MDL' }}
            decision={decision}
            onDecisionChange={(next) => setDecision(next)}
          />
        )}
      </Flex>
    </Box>
  );
}

const sidebarLinks = [
  { id: 'usage', label: 'Usage' },
  { id: 'status', label: 'The status is a word' },
  { id: 'values', label: 'A value the model produced' },
  { id: 'approval', label: 'The decision is one channel' },
  { id: 'reasoning', label: 'Reasoning is an aside' },
  { id: 'styling', label: 'Styling' },
  ...apiSections(toolCallApi),
  ...apiSections(approvalApi),
  ...apiSections(reasoningApi),
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

function Note({ icon: Icon, title, children }: { icon: typeof Sparkles; title: string; children: ReactNode }) {
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
