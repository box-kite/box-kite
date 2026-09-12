import { Circle } from 'lucide-react';
import { ReactNode, useState } from 'react';
import radioButtonApi from '../../api/components/radiobutton.json';
import radioGroupApi from '../../api/components/radiogroup.json';
import Box from '../../src/box';
import Flex from '../../src/components/flex';
import RadioButton from '../../src/components/radioButton';
import RadioGroup, { RadioGroupReason } from '../../src/components/radioGroup';
import { H2, Span } from '../../src/components/semantics';
import ApiReference from '../components/apiReference';
import Code from '../components/code';
import Mono from '../components/mono';
import PageHeader from '../components/pageHeader';
import Reveal from '../components/reveal';
import useTableOfContents from '../hooks/useTableOfContents';
import { apiSections } from '../site/componentApi';

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
  onValueChange={(next, { reason }) => {
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
                onValueChange={(next, { reason }) => {
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
          <ApiReference api={radioButtonApi} />

          <ApiReference api={radioGroupApi} />
        </Flex>
      </Reveal>
    </Box>
  );
}

const sidebarLinks = [
  { id: 'group', label: 'A group' },
  { id: 'why', label: 'What the group is for' },
  { id: 'orientation', label: 'Horizontal' },
  { id: 'controlled', label: 'Controlled' },
  { id: 'single', label: 'One on its own' },
  { id: 'label', label: 'The label' },
  { id: 'disabled', label: 'Disabled' },
  { id: 'clean', label: 'Clean' },
  ...apiSections(radioButtonApi),
  ...apiSections(radioGroupApi),
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
