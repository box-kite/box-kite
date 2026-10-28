import { CalendarRange, Globe, Layers, Smartphone } from 'lucide-react';
import { ReactNode, useState } from 'react';
import datePickerApi from '../../api/components/datepicker.json';
import dateRangePickerApi from '../../api/components/daterangepicker.json';
import timeZoneSelectApi from '../../api/components/timezoneselect.json';
import Box from '../../src/box';
import DateField from '../../src/components/dateField';
import DatePicker, { DateRange, DateRangePicker } from '../../src/components/datePicker';
import Flex from '../../src/components/flex';
import { H2 } from '../../src/components/semantics';
import TimeZoneSelect from '../../src/components/timeZoneSelect';
import { add, startOf, today } from '../../src/date';
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

function UsageDemo() {
  const [value, setValue] = useState<string | null>(null);

  return (
    <Box py={4}>
      <DatePicker label="Check-in" value={value} onValueChange={setValue} clearable />
      <Readout>
        value: <Mono>{String(value)}</Mono>
      </Readout>
    </Box>
  );
}

function TimeDemo() {
  const [value, setValue] = useState<string | null>('18:30:00');

  return (
    <Box py={4}>
      <DatePicker type="time" label="Time" width={50} step={30} value={value} onValueChange={setValue} />
      <Readout>
        value: <Mono>{String(value)}</Mono>
      </Readout>
    </Box>
  );
}

function PublishDemo() {
  const [readings, setReadings] = useState<{ value: string | null; utc: string | null }>({ value: null, utc: null });

  return (
    <Box py={4}>
      <DatePicker
        type="datetime"
        zone="utc"
        label="Publish at (UTC)"
        step={15}
        onValueChange={(value, { utc }) => setReadings({ value, utc })}
      />
      <Readout>
        <Flex d="column" gap={1}>
          <Box>
            value: <Mono>{String(readings.value)}</Mono>
          </Box>
          <Box>
            utc: <Mono>{String(readings.utc)}</Mono>
          </Box>
        </Flex>
      </Readout>
    </Box>
  );
}

function RangeDemo() {
  const [range, setRange] = useState<DateRange | null>(null);
  const day = today();
  const presets = [
    { label: 'This week', value: { start: startOf(day, 'week')!, end: add(startOf(day, 'week')!, { days: 6 })! } },
    { label: 'Next 7 days', value: { start: day, end: add(day, { days: 6 })! } },
    { label: 'Next 30 days', value: { start: day, end: add(day, { days: 29 })! } },
  ];

  return (
    <Box py={4}>
      <DateRangePicker label="Stay" value={range} onValueChange={setRange} presets={presets} clearable />
      <Readout>
        value: <Mono>{range ? `${range.start} → ${range.end}` : 'null'}</Mono>
      </Readout>
    </Box>
  );
}

function ZoneDemo() {
  const [zone, setZone] = useState<string | null>('Europe/Chisinau');

  return (
    <Flex d="column" gap={4} py={4} ai="start">
      <TimeZoneSelect label="Time zone" value={zone} onValueChange={setZone} />
      <DateField type="datetime" zone={zone ?? 'utc'} label="Meeting" defaultValue="2026-10-19T11:30:00Z" />
    </Flex>
  );
}

export default function DatePickerPage() {
  useTableOfContents(sidebarLinks);

  return (
    <Box>
      <PageHeader
        icon={CalendarRange}
        title="DatePicker"
        description="A date field with a calendar, a list of times, or both behind a button inside it; a range picker on two months; and a time zone select — on the platform's popover, with no portal."
      />

      <Reveal delay={0.1}>
        <Flex d="column" gap={10}>
          <Code
            label="Import"
            language="jsx"
            code={`import DatePicker, { DateRangePicker } from '@box-kite/react/components/datePicker';
import TimeZoneSelect from '@box-kite/react/components/timeZoneSelect';`}
          />

          <Code
            id="usage"
            label="Usage"
            language="jsx"
            code={`<DatePicker label="Check-in" value={value} onValueChange={setValue} clearable />`}
          >
            <UsageDemo />
          </Code>

          <Section id="field" title="Type it or pick it">
            <Box>
              The field is a <Mono>DateField</Mono>, so everything typed is in the reader's order and the value is the same ISO string with
              the same readings beside it. The button says what is chosen — <Mono>Choose date, Oct 19, 2026</Mono> — and opening it puts
              focus on the chosen day, or today. Choosing closes the panel and hands focus back.
            </Box>
          </Section>

          <Section id="time" title="Times and date-times">
            <Box>
              <Mono>type="time"</Mono> opens a list of times every <Mono>step</Mono> minutes, and <Mono>type="datetime"</Mono> puts the
              calendar and the list side by side: a day keeps the time already chosen, and the panel closes once a time is picked. The zone
              rules are <Mono>DateField</Mono>'s — <Mono>'local'</Mono> by default, <Mono>'utc'</Mono> or any IANA zone, or{' '}
              <Mono>'none'</Mono>.
            </Box>
            <Box mt={4}>
              <Code
                language="jsx"
                code={`<DatePicker type="time" label="Time" width={50} step={30} value={value} onValueChange={setValue} />`}
              >
                <TimeDemo />
              </Code>
            </Box>
            <Box mt={4}>
              <Code
                language="jsx"
                code={`<DatePicker type="datetime" zone="utc" label="Publish at (UTC)" step={15}
  onValueChange={(value, { utc }) => schedule(utc)} />`}
              >
                <PublishDemo />
              </Code>
            </Box>
          </Section>

          <Section id="range" title="A range, with presets">
            <Box>
              <Mono>DateRangePicker</Mono> is two fields — start and end, each named for a screen reader — over a range calendar on two
              months. Its value is <Mono>{'{ start, end }'}</Mono>, reported once both are filled in and in order; an end before its start
              marks the pair invalid rather than swapping it. <Mono>presets</Mono> puts shortcuts beside the calendar, and the date layer's
              arithmetic writes them.
            </Box>
            <Box mt={4}>
              <Code
                language="jsx"
                code={`<DateRangePicker label="Stay" startName="from" endName="to" clearable
  presets={[{ label: 'Next 7 days', value: { start: today(), end: add(today(), { days: 6 })! } }]} />`}
              >
                <RangeDemo />
              </Code>
            </Box>
          </Section>

          <Section id="zones" title="Choosing a zone">
            <Box>
              <Mono>TimeZoneSelect</Mono> is a <Mono>Combobox</Mono> over every zone the runtime knows, each with the offset it is at now,
              searchable by place, region or offset — <Mono>chis</Mono>, <Mono>europe</Mono> and <Mono>+3</Mono> all find Chișinău. Its
              value is the IANA name every date component takes, so a meeting typed on another city's clock is two lines.
            </Box>
            <Box mt={4}>
              <Code
                language="jsx"
                code={`<TimeZoneSelect label="Time zone" value={zone} onValueChange={setZone} />
<DateField type="datetime" zone={zone} label="Meeting" />`}
              >
                <ZoneDemo />
              </Code>
            </Box>
          </Section>

          <Section id="layer" title="The panel">
            <Flex d="column" gap={3}>
              <Note icon={Layers} title="The top layer, no portal">
                The panel is the platform's popover: it paints above every stacking context, light dismiss and focus return are the
                browser's, and it inherits the theme and the direction around it. It hangs off the whole field, not off the button.
              </Note>
              <Note icon={Smartphone} title="Mounted while open">
                A closed picker renders no calendar and no list of times, so a form with twenty of them carries twenty fields and nothing
                else.
              </Note>
              <Note icon={Globe} title="Why not the native input">
                <Mono>&lt;input type="date"&gt;</Mono> follows the browser's language rather than the page's, has no zone, no range and no
                presets, and its popup cannot be styled. <Mono>Textbox type="date"</Mono> is still there for the cases it suits.
              </Note>
            </Flex>
          </Section>

          <Section id="styling" title="Styling">
            <Box>
              The field is a <Mono>dateField</Mono> and the panel a <Mono>popover</Mono>; what the picker adds is{' '}
              <Mono>datePicker.trigger</Mono>, <Mono>datePicker.clear</Mono>, <Mono>datePicker.presets</Mono>/<Mono>preset</Mono> and{' '}
              <Mono>datePicker.times</Mono>/<Mono>time</Mono>, whose <Mono>selected</Mono> variant is the chosen slot.
            </Box>
          </Section>

          <ApiReference api={datePickerApi} />
          <ApiReference api={dateRangePickerApi} />
          <ApiReference api={timeZoneSelectApi} />
        </Flex>
      </Reveal>
    </Box>
  );
}

const sidebarLinks = [
  { id: 'usage', label: 'Usage' },
  { id: 'field', label: 'Type it or pick it' },
  { id: 'time', label: 'Times and date-times' },
  { id: 'range', label: 'A range, with presets' },
  { id: 'zones', label: 'Choosing a zone' },
  { id: 'layer', label: 'The panel' },
  { id: 'styling', label: 'Styling' },
  ...apiSections(datePickerApi),
  ...apiSections(dateRangePickerApi),
  ...apiSections(timeZoneSelectApi),
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

function Note({ icon: Icon, title, children }: { icon: typeof Layers; title: string; children: ReactNode }) {
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
