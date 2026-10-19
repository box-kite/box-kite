import { Keyboard, Languages, ListChecks, TextCursorInput } from 'lucide-react';
import { ReactNode, useState } from 'react';
import dateFieldApi from '../../api/components/datefield.json';
import Box from '../../src/box';
import DateField from '../../src/components/dateField';
import Flex from '../../src/components/flex';
import { H2 } from '../../src/components/semantics';
import ApiReference from '../components/apiReference';
import Code from '../components/code';
import Mono from '../components/mono';
import PageHeader from '../components/pageHeader';
import Reveal from '../components/reveal';
import useTableOfContents from '../hooks/useTableOfContents';
import { apiSections } from '../site/componentApi';

function Readout({ children }: { children: ReactNode }) {
  return (
    <Box mt={3} fontSize={13} theme={{ dark: { color: 'base-400' }, light: { color: 'base-600' } }}>
      {children}
    </Box>
  );
}

// Each demo owns its value, so typing into one re-renders nothing else on the page.
function UsageDemo() {
  const [value, setValue] = useState<string | null>('2026-10-19');

  return (
    <Box py={4}>
      <DateField label="Due" value={value} onValueChange={setValue} />
      <Readout>
        value: <Mono>{String(value)}</Mono>
      </Readout>
    </Box>
  );
}

function ReadingsDemo() {
  const [readings, setReadings] = useState<{ value: string | null; utc: string | null; local: string | null }>({
    value: null,
    utc: null,
    local: null,
  });

  return (
    <Box py={4}>
      <DateField
        type="datetime"
        zone="America/New_York"
        label="Starts (New York)"
        onValueChange={(value, { utc, local }) => setReadings({ value, utc, local })}
      />
      <Readout>
        <Flex d="column" gap={1}>
          <Box>
            value: <Mono>{String(readings.value)}</Mono>
          </Box>
          <Box>
            utc: <Mono>{String(readings.utc)}</Mono>
          </Box>
          <Box>
            local: <Mono>{String(readings.local)}</Mono>
          </Box>
        </Flex>
      </Readout>
    </Box>
  );
}

const LOCALES = ['en-US', 'ro-MD', 'de-DE', 'ja-JP', 'sv-SE'];

export default function DateFieldPage() {
  useTableOfContents(sidebarLinks);

  return (
    <Box>
      <PageHeader
        icon={TextCursorInput}
        title="DateField"
        description="A date, a time or both, typed one segment at a time in the reader's own order — and the value is an ISO string with its UTC reading beside it."
      />

      <Reveal delay={0.1}>
        <Flex d="column" gap={10}>
          <Code label="Import" language="jsx" code="import DateField from '@box-kite/react/components/dateField';" />

          <Code id="usage" label="Usage" language="jsx" code={`<DateField label="Due" value={value} onValueChange={setValue} />`}>
            <UsageDemo />
          </Code>

          <Section id="kinds" title="Date, time, or both">
            <Box>
              <Mono>type</Mono> says what it edits, and the value is the string of that kind: <Mono>2026-10-19</Mono>, <Mono>14:30:00</Mono>
              , or for a date-time the instant it names on the field's zone. A time is a 12- or 24-hour clock the way the locale reads one,
              and <Mono>granularity="second"</Mono> adds the seconds.
            </Box>
            <Box mt={4}>
              <Code
                language="jsx"
                code={`<DateField type="time" label="Opens at" />
<DateField type="time" label="Lap" granularity="second" hourCycle={24} />
<DateField type="datetime" label="Meeting" />`}
              >
                <Flex d="column" gap={4} py={4} ai="start">
                  <DateField type="time" label="Opens at" />
                  <DateField type="time" label="Lap" granularity="second" hourCycle={24} />
                  <DateField type="datetime" label="Meeting" />
                </Flex>
              </Code>
            </Box>
          </Section>

          <Section id="zones" title="UTC or local">
            <Box>
              A date-time is typed on somebody's wall clock, and <Mono>zone</Mono> says whose: <Mono>'local'</Mono> (the default, the
              reader's), <Mono>'utc'</Mono>, any IANA zone, or <Mono>'none'</Mono> for a wall clock that belongs to nobody — an alarm, a
              timetable. A zone that is not the reader's is named after the time, so nobody types a New York time thinking it is theirs.
            </Box>
            <Box mt={4}>
              <Code
                language="jsx"
                code={`<DateField type="datetime" zone="America/New_York" label="Starts (New York)"
  onValueChange={(value, { utc, local }) => save(utc)} />`}
              >
                <ReadingsDemo />
              </Code>
            </Box>
            <Box mt={4}>
              <Mono>onValueChange</Mono> hands over every reading an app is likely to want beside the string: <Mono>utc</Mono>, the reader's{' '}
              <Mono>local</Mono> wall clock, the field zone's <Mono>zoned</Mono> one, a <Mono>Date</Mono> and the epoch — and{' '}
              <Mono>null</Mono> for all of them while a segment is empty.
            </Box>
          </Section>

          <Section id="locales" title="The reader's order, with nothing to parse">
            <Box>
              Free text is ambiguous — <Mono>03/04/2026</Mono> is two different days depending on who typed it — so the field never parses
              what was typed. Each part is its own spin button, laid out in the order and with the separators <Mono>Intl</Mono> writes for
              the locale, and the reader types numbers into the parts.
            </Box>
            <Box mt={4}>
              <Code language="jsx" code={`<DateField label="ro-MD" locale="ro-MD" defaultValue="2026-10-19" />`}>
                <Flex d="column" gap={4} py={4} ai="start">
                  {LOCALES.map((locale) => (
                    <DateField key={locale} type="datetime" zone="utc" locale={locale} label={locale} defaultValue="2026-10-19T14:30:00Z" />
                  ))}
                </Flex>
              </Code>
            </Box>
            <Box mt={4}>
              A paste is the one place text is read, because a whole value arrives at once: ISO in any spelling, or a date the way the
              reader writes one.
            </Box>
          </Section>

          <Section id="keyboard" title="Typing it">
            <Flex d="column" gap={3}>
              <Note icon={Keyboard} title="Digits move on by themselves">
                <Mono>4</Mono> in a month is April at once; <Mono>1</Mono> waits for a <Mono>0</Mono>, <Mono>1</Mono> or <Mono>2</Mono>. A
                separator key moves on too, the way it would in a text box.
              </Note>
              <Note icon={ListChecks} title="The arrows step and wrap">
                Up and Down step a segment and wrap like a clock; Page Up and Page Down take a bigger step; Home and End go to its ends. An
                empty segment starts from today.
              </Note>
              <Note icon={Languages} title="Read out in the reader's words">
                Each segment is named by its unit in the reader's language (<Mono>Monat</Mono>, <Mono>месяц</Mono>), and a month reads as
                its name.
              </Note>
            </Flex>
          </Section>

          <Section id="forms" title="In a form">
            <Box>
              <Mono>name</Mono> posts the canonical string, so a server reads <Mono>2026-10-19</Mono> whatever the reader's locale.{' '}
              <Mono>required</Mono> is a real input the browser validates, so an empty field stops the form with the browser's own message,
              and a form reset puts the default back. <Mono>min</Mono>, <Mono>max</Mono> and <Mono>isDateUnavailable</Mono> mark a value
              outside them <Mono>aria-invalid</Mono> without throwing it away.
            </Box>
            <Box mt={4}>
              <Code
                language="jsx"
                code={`<DateField label="Check-in" name="checkIn" required min="2026-10-19" isDateUnavailable={(day) => day.endsWith('-25')} />`}
              >
                <Box py={4}>
                  <DateField label="Check-in" name="checkIn" required min="2026-10-19" isDateUnavailable={(day) => day.endsWith('-25')} />
                </Box>
              </Code>
            </Box>
          </Section>

          <Section id="styling" title="Styling">
            <Box>
              The frame is <Mono>textbox</Mono>'s, extended: <Mono>dateField</Mono> with <Mono>compact</Mono>, <Mono>invalid</Mono> and{' '}
              <Mono>disabled</Mono> variants, and <Mono>dateField.segment</Mono>, <Mono>dateField.literal</Mono>,{' '}
              <Mono>dateField.zone</Mono> and <Mono>dateField.label</Mono> inside it.
            </Box>
            <Box mt={4}>
              <Code
                language="jsx"
                code={`Box.components({
  dateField: {
    children: { segment: { styles: { focus: { bgColor: 'emerald-600' } } } },
  },
});`}
              />
            </Box>
          </Section>

          <ApiReference api={dateFieldApi} />
        </Flex>
      </Reveal>
    </Box>
  );
}

const sidebarLinks = [
  { id: 'usage', label: 'Usage' },
  { id: 'kinds', label: 'Date, time, or both' },
  { id: 'zones', label: 'UTC or local' },
  { id: 'locales', label: "The reader's order" },
  { id: 'keyboard', label: 'Typing it' },
  { id: 'forms', label: 'In a form' },
  { id: 'styling', label: 'Styling' },
  ...apiSections(dateFieldApi),
];

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <Box id={id}>
      <H2 fontSize={20} fontWeight={600} mb={4} theme={{ dark: { color: 'white' }, light: { color: 'base-900' } }}>
        {title}
      </H2>
      <Box fontSize={15} lineHeight={26} theme={{ dark: { color: 'base-400' }, light: { color: 'base-600' } }}>
        {children}
      </Box>
    </Box>
  );
}

function Note({ icon: Icon, title, children }: { icon: typeof Keyboard; title: string; children: ReactNode }) {
  return (
    <Flex
      gap={3}
      p={4}
      borderRadius={2}
      b={1}
      theme={{
        dark: { bgColor: 'base-900', borderColor: 'base-800' },
        light: { bgColor: 'base-50', borderColor: 'base-200' },
      }}
    >
      <Box theme={{ dark: { color: 'accent-400' }, light: { color: 'accent-500' } }} pt={0.5}>
        <Icon size={16} />
      </Box>
      <Box>
        <Box fontSize={14} fontWeight={600} mb={1} theme={{ dark: { color: 'base-200' }, light: { color: 'base-800' } }}>
          {title}
        </Box>
        <Box fontSize={14}>{children}</Box>
      </Box>
    </Flex>
  );
}
