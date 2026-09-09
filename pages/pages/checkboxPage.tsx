import { CheckSquare } from 'lucide-react';
import { ReactNode } from 'react';
import checkboxApi from '../../api/components/checkbox.json';
import Box from '../../src/box';
import Checkbox from '../../src/components/checkbox';
import Flex from '../../src/components/flex';
import { H2 } from '../../src/components/semantics';
import ApiReference from '../components/apiReference';
import Code from '../components/code';
import Mono from '../components/mono';
import PageHeader from '../components/pageHeader';
import Reveal from '../components/reveal';
import useTableOfContents from '../hooks/useTableOfContents';
import { apiSections } from '../site/componentApi';

export default function CheckboxPage() {
  useTableOfContents(sidebarLinks);

  return (
    <Box>
      <PageHeader icon={CheckSquare} title="Checkbox" description="Use Checkbox component to turn an option on or off." />

      <Reveal delay={0.1}>
        <Flex d="column" gap={10}>
          <Code label="Import" language="jsx" code="import Checkbox from '@box-kite/react/components/checkbox';" />

          <Code id="basic" label="Basic Checkbox" language="jsx" code={`<Checkbox label="Accept the terms" name="terms" defaultChecked />`}>
            <Checkbox label="Accept the terms" name="terms" defaultChecked />
          </Code>

          <Section id="label" title="The label is the component's job">
            <Box>
              <Mono>label</Mono> renders the text inside a <Mono>&lt;label&gt;</Mono> that wraps the input. The association is implicit, so
              there is no <Mono>htmlFor</Mono>/<Mono>id</Mono> pair to generate or keep in sync, and the whole row is a click target — which
              is what a checkbox row is expected to be. A checkbox with no label is the most common accessibility failure there is, so this
              is not left to the consumer.
            </Box>
            <Box mt={4}>
              Style that <Mono>&lt;label&gt;</Mono> with <Mono>labelProps</Mono>; every other Box prop still styles the box itself. Leave{' '}
              <Mono>label</Mono> out and nothing wraps the input at all — the markup is exactly what it was before.
            </Box>
            <Box mt={4}>
              <Code
                language="jsx"
                codeOnly
                code={`<Checkbox label="Accept the terms" name="terms" labelProps={{ gap: 3, fontSize: 14 }} />`}
              />
            </Box>
          </Section>

          <Code
            id="indeterminate"
            label="Indeterminate"
            language="jsx"
            code={`<Checkbox label="Select all rows" name="rows" indeterminate />`}
          >
            <Checkbox label="Select all rows" name="rows" indeterminate />
          </Code>

          <Section id="mixed" title="The mixed state is announced, not just drawn">
            <Box>
              <Mono>indeterminate</Mono> is a DOM property, not an attribute — set it and the browser draws the dash, but the accessibility
              tree still says checked or not checked. The component adds <Mono>aria-checked=&quot;mixed&quot;</Mono> alongside it, which is
              what a screen reader reads out. A parent checkbox over a partly-selected list is the case this exists for.
            </Box>
            <Box mt={4}>
              <Mono>indeterminate</Mono> is a pseudo-class style prop as well as a state, so the tuple form carries both:{' '}
              <Mono>indeterminate=&#123;[mixed, &#123; opacity: 0.6 &#125;]&#125;</Mono> is the state first and what{' '}
              <Mono>:indeterminate</Mono> should look like second.
            </Box>
          </Section>

          <Code
            id="disabled"
            label="Disabled Checkbox"
            language="jsx"
            code={`<Checkbox label="Accept the terms" disabled defaultChecked />`}
          >
            <Checkbox label="Accept the terms" disabled defaultChecked />
          </Code>

          <Code id="clean" label="Clean Checkbox" language="jsx" code={`<Checkbox clean defaultChecked />`}>
            <Checkbox clean defaultChecked />
          </Code>

          <Section id="switch" title="On or off, rather than checked?">
            <Box>
              A setting that takes effect immediately is a switch, not a checkbox. <Mono>Switch</Mono> is the same input underneath with{' '}
              <Mono>role=&quot;switch&quot;</Mono> and a track-and-thumb style — see its page.
            </Box>
          </Section>
          <ApiReference api={checkboxApi} />
        </Flex>
      </Reveal>
    </Box>
  );
}

const sidebarLinks = [
  { id: 'basic', label: 'Basic Checkbox' },
  { id: 'label', label: 'The label' },
  { id: 'indeterminate', label: 'Indeterminate' },
  { id: 'mixed', label: 'The mixed state' },
  { id: 'disabled', label: 'Disabled Checkbox' },
  { id: 'clean', label: 'Clean Checkbox' },
  { id: 'switch', label: 'Or a Switch' },
  ...apiSections(checkboxApi),
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
