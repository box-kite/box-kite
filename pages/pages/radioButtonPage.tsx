import { Circle } from 'lucide-react';
import { ReactNode, useState } from 'react';
import Box from '../../src/box';
import Flex from '../../src/components/flex';
import RadioButton from '../../src/components/radioButton';
import RadioGroup, { RadioGroupReason } from '../../src/components/radioGroup';
import { H2, Span } from '../../src/components/semantics';
import Code from '../components/code';
import PageHeader from '../components/pageHeader';
import Reveal from '../components/reveal';
import useTableOfContents from '../hooks/useTableOfContents';

export default function RadioButtonPage() {
  useTableOfContents(sidebarLinks);

  const [plan, setPlan] = useState<string | undefined>('free');
  const [lastReason, setLastReason] = useState<RadioGroupReason>();

  return (
    <Box>
      <PageHeader
        icon={Circle}
        title="Radio Button"
        description="One choice out of a set. RadioGroup is the APG pattern — a named group, a shared field name, and the arrow keys between the options."
      />

      <Reveal delay={0.1}>
        <Flex d="column" gap={10}>
          <Code
            label="Import"
            language="jsx"
            code={`import RadioGroup from '@box-kite/react/components/radioGroup';
import RadioButton from '@box-kite/react/components/radioButton';`}
          />

          <Code
            id="group"
            label="A group"
            language="jsx"
            code={`<RadioGroup label="Plan" name="plan" defaultValue="free">
  <RadioGroup.Item value="free" label="Free" />
  <RadioGroup.Item value="pro" label="Pro" />
  <RadioGroup.Item value="team" label="Team" />
</RadioGroup>`}
          >
            <RadioGroup label="Plan" name="plan-demo" defaultValue="free">
              <RadioGroup.Item value="free" label="Free" />
              <RadioGroup.Item value="pro" label="Pro" />
              <RadioGroup.Item value="team" label="Team" />
            </RadioGroup>
          </Code>

          <Section id="why" title="What the group is for">
            <Box>
              A set of radios with nothing over it is, to a screen reader, a handful of unrelated controls. <Mono>RadioGroup</Mono> gives
              them <Mono>role=&quot;radiogroup&quot;</Mono> named by its own label, hands every <Mono>RadioGroup.Item</Mono> the same{' '}
              <Mono>name</Mono> — so the set submits as one field, generated if you do not supply one — and owns the selected value.
            </Box>
            <Box mt={4}>
              The tab order it deliberately leaves alone. A native radio set is already a single tab stop, with the checked option holding
              it; a <Mono>tabIndex</Mono> of ours would only fight the platform. The arrow keys are the half worth owning, and they select
              as they move, which is what APG asks of a radio group and what distinguishes it from a listbox.
            </Box>
          </Section>

          <Section id="keyboard" title="Keyboard">
            <KeyTable />
          </Section>

          <Code
            id="orientation"
            label="Horizontal"
            language="jsx"
            code={`<RadioGroup label="Billing" orientation="horizontal" defaultValue="monthly">
  <RadioGroup.Item value="monthly" label="Monthly" />
  <RadioGroup.Item value="yearly" label="Yearly" />
</RadioGroup>`}
          >
            <RadioGroup label="Billing" name="billing-demo" orientation="horizontal" defaultValue="monthly">
              <RadioGroup.Item value="monthly" label="Monthly" />
              <RadioGroup.Item value="yearly" label="Yearly" />
            </RadioGroup>
          </Code>

          <Code
            id="controlled"
            label="Controlled, with the reason it changed"
            language="jsx"
            code={`// A radio group can also hold nothing, so the state is string | undefined.
const [plan, setPlan] = useState<string | undefined>('free');

<RadioGroup
  label="Plan"
  value={plan}
  onChange={(next, { reason }) => {
    setPlan(next);
    console.log(reason); // 'click' | 'keyboard'
  }}
>
  <RadioGroup.Item value="free" label="Free" />
  <RadioGroup.Item value="pro" label="Pro" />
</RadioGroup>`}
          >
            <Flex gap={6} ai="center" flexWrap="wrap">
              <RadioGroup
                label="Plan"
                name="plan-controlled"
                value={plan}
                onChange={(next, { reason }) => {
                  setPlan(next);
                  setLastReason(reason);
                }}
              >
                <RadioGroup.Item value="free" label="Free" />
                <RadioGroup.Item value="pro" label="Pro" />
                <RadioGroup.Item value="team" label="Team" disabled />
              </RadioGroup>
              <Span fontSize={14} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-600' } }}>
                {plan ?? '—'} · last reason: <Mono>{lastReason ?? '—'}</Mono>
              </Span>
            </Flex>
          </Code>

          <Code
            id="single"
            label="One radio on its own"
            language="jsx"
            code={`<RadioButton name="plan" value="free" label="Free" defaultChecked />
<RadioButton name="plan" value="pro" label="Pro" />`}
          >
            <Flex gap={4}>
              <RadioButton name="plain" value="free" label="Free" defaultChecked />
              <RadioButton name="plain" value="pro" label="Pro" />
            </Flex>
          </Code>

          <Section id="label" title="The label is the component's job">
            <Box>
              <Mono>label</Mono> renders the text inside a <Mono>&lt;label&gt;</Mono> that wraps the input, so the two are associated with
              no <Mono>htmlFor</Mono>/<Mono>id</Mono> pair to keep in sync and the whole row is a click target. Style that element with{' '}
              <Mono>labelProps</Mono>; every other Box prop still styles the radio itself.
            </Box>
            <Box mt={4}>
              <Code
                language="jsx"
                codeOnly
                code={`<RadioButton name="plan" value="pro" label="Pro" labelProps={{ gap: 3, fontSize: 14 }} />`}
              />
            </Box>
          </Section>

          <Code
            id="disabled"
            label="Disabled"
            language="jsx"
            code={`<RadioButton name="plan" value="free" label="Free" disabled defaultChecked />
<RadioButton name="plan" value="pro" label="Pro" disabled />`}
          >
            <Flex gap={4}>
              <RadioButton name="disabled-demo" value="free" label="Free" disabled defaultChecked />
              <RadioButton name="disabled-demo" value="pro" label="Pro" disabled />
            </Flex>
          </Code>

          <Code id="clean" label="Clean" language="jsx" code={`<RadioButton clean name="plan" value="free" label="Free" defaultChecked />`}>
            <Flex gap={4}>
              <RadioButton clean name="clean-demo" value="free" label="Free" defaultChecked />
              <RadioButton clean name="clean-demo" value="pro" label="Pro" />
            </Flex>
          </Code>
        </Flex>
      </Reveal>
    </Box>
  );
}

const sidebarLinks = [
  { id: 'group', label: 'A group' },
  { id: 'why', label: 'What the group is for' },
  { id: 'keyboard', label: 'Keyboard' },
  { id: 'orientation', label: 'Horizontal' },
  { id: 'controlled', label: 'Controlled' },
  { id: 'single', label: 'One on its own' },
  { id: 'label', label: 'The label' },
  { id: 'disabled', label: 'Disabled' },
  { id: 'clean', label: 'Clean' },
] as const;

const interactions: { input: string; result: string }[] = [
  { input: 'Tab', result: 'Enters the group once, landing on the checked option — or the first, when none is checked.' },
  { input: 'Down / Right', result: 'Next option, selecting it as focus arrives. Wraps to the first.' },
  { input: 'Up / Left', result: 'Previous option, same. Wraps to the last.' },
  { input: 'Space', result: 'Selects the focused option (the platform supplies this one).' },
  { input: 'Tab, again', result: 'Leaves the group entirely — a radio set is one stop, not one per option.' },
  { input: 'A disabled option', result: 'Skipped by the arrows, never landed on.' },
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
