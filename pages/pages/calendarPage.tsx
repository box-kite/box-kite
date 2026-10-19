import { CalendarDays, Keyboard, ZoomOut } from 'lucide-react';
import { ReactNode, useState } from 'react';
import calendarApi from '../../api/components/calendar.json';
import Box from '../../src/box';
import Calendar, { DateRange } from '../../src/components/calendar';
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
    <Box mt={3} fontSize={13} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-600' } }}>
      {children}
    </Box>
  );
}

function UsageDemo() {
  const [day, setDay] = useState<string | null>('2026-10-21');

  return (
    <Box py={4}>
      <Calendar label="Delivery" value={day} onValueChange={setDay} defaultFocusedDate="2026-10-21" />
      <Readout>
        value: <Mono>{String(day)}</Mono>
      </Readout>
    </Box>
  );
}

function RangeDemo() {
  const [stay, setStay] = useState<DateRange | null>({ start: '2026-10-19', end: '2026-10-23' });

  return (
    <Box py={4}>
      <Calendar mode="range" months={2} label="Stay" value={stay} onValueChange={setStay} defaultFocusedDate="2026-10-19" />
      <Readout>
        value: <Mono>{stay ? `${stay.start} → ${stay.end}` : 'null'}</Mono>
      </Readout>
    </Box>
  );
}

export default function CalendarPage() {
  useTableOfContents(sidebarLinks);

  return (
    <Box>
      <PageHeader
        icon={CalendarDays}
        title="Calendar"
        description="A month of days on APG's grid keys — one day or a range, the week starting where the reader's starts, every name from Intl, and a day that is a YYYY-MM-DD string rather than a Date at midnight somewhere."
      />

      <Reveal delay={0.1}>
        <Flex d="column" gap={10}>
          <Code label="Import" language="jsx" code="import Calendar from '@box-kite/react/components/calendar';" />

          <Code id="usage" label="Usage" language="jsx" code={`<Calendar label="Delivery" value={day} onValueChange={setDay} />`}>
            <UsageDemo />
          </Code>

          <Section id="range" title="A range">
            <Box>
              <Mono>mode="range"</Mono> turns the value into <Mono>{'{ start, end }'}</Mono>: the first press anchors it, the pointer or the
              arrows preview it, and the second press ends it, whichever way round they came. A range is refused across a day nobody can
              choose, and Escape drops a half-picked one. The band is the cell's and the caps are the day's, so it runs unbroken along a
              week and mirrors in a right-to-left page.
            </Box>
            <Box mt={4}>
              <Code language="jsx" code={`<Calendar mode="range" months={2} label="Stay" value={stay} onValueChange={setStay} />`}>
                <RangeDemo />
              </Code>
            </Box>
          </Section>

          <Section id="bounds" title="Days that cannot be chosen">
            <Box>
              <Mono>min</Mono> and <Mono>max</Mono> end the calendar: a day past them is not focusable and the arrows stop at the edge.{' '}
              <Mono>isDateUnavailable</Mono> is softer — a weekend, a holiday — reachable so it can be read out, and crossed out so nobody
              mistakes it for a choice.
            </Box>
            <Box mt={4}>
              <Code
                language="jsx"
                code={`<Calendar label="Appointment" min="2026-10-12" max="2026-11-15"
  isDateUnavailable={(day) => [0, 6].includes(new Date(day).getUTCDay())} />`}
              >
                <Box py={4}>
                  <Calendar
                    label="Appointment"
                    min="2026-10-12"
                    max="2026-11-15"
                    defaultFocusedDate="2026-10-19"
                    isDateUnavailable={(day) => [0, 6].includes(new Date(day).getUTCDay())}
                  />
                </Box>
              </Code>
            </Box>
          </Section>

          <Section id="locale" title="The reader's week">
            <Box>
              The week starts on the locale's first day — Monday in Moldova, Sunday in the US, Saturday in much of the Gulf — and the month
              and weekday names are the locale's own. <Mono>weekNumbers</Mono> adds the ISO week down the side.
            </Box>
            <Box mt={4}>
              <Code language="jsx" code={`<Calendar label="Calendar" locale="ro-MD" weekNumbers />`}>
                <Flex gap={8} py={4} flexWrap="wrap">
                  <Calendar label="ro-MD" locale="ro-MD" weekNumbers defaultFocusedDate="2026-10-19" />
                  <Calendar label="ar-EG" locale="ar-EG" defaultFocusedDate="2026-10-19" />
                </Flex>
              </Code>
            </Box>
          </Section>

          <Section id="keyboard" title="The keyboard">
            <Flex d="column" gap={3}>
              <Note icon={Keyboard} title="APG's grid keys">
                The arrows move a day or a week, Home and End go to the week's ends, Page Up and Page Down a month, and with Shift a year.
                The sideways pair follows the reading order, so in a right-to-left page Left is the next day.
              </Note>
              <Note icon={ZoomOut} title="Press the title to zoom out">
                Days, then the year's months, then a run of years — the quick way back to a date of birth, without a dropdown.
              </Note>
            </Flex>
          </Section>

          <Section id="styling" title="Styling">
            <Box>
              <Mono>calendar</Mono> with <Mono>calendar.nav</Mono>, <Mono>calendar.title</Mono>, <Mono>calendar.weekday</Mono>,{' '}
              <Mono>calendar.weekNumber</Mono>, <Mono>calendar.cell</Mono> (the range band: <Mono>rangeStart</Mono>,{' '}
              <Mono>rangeMiddle</Mono>, <Mono>rangeEnd</Mono>), <Mono>calendar.day</Mono> (<Mono>today</Mono>, <Mono>selected</Mono>,{' '}
              <Mono>outside</Mono>, <Mono>blocked</Mono>, <Mono>unavailable</Mono>) and <Mono>calendar.zoomItem</Mono>. The paint is mixed
              from the text colour, so it follows any theme with no second rule.
            </Box>
            <Box mt={4}>
              <Code
                language="jsx"
                code={`Box.components({
  calendar: {
    children: { day: { variants: { selected: { bgColor: 'rose-600', hover: { bgColor: 'rose-700' } } } } },
  },
});`}
              />
            </Box>
          </Section>

          <ApiReference api={calendarApi} />
        </Flex>
      </Reveal>
    </Box>
  );
}

const sidebarLinks = [
  { id: 'usage', label: 'Usage' },
  { id: 'range', label: 'A range' },
  { id: 'bounds', label: 'Days that cannot be chosen' },
  { id: 'locale', label: "The reader's week" },
  { id: 'keyboard', label: 'The keyboard' },
  { id: 'styling', label: 'Styling' },
  ...apiSections(calendarApi),
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

function Note({ icon: Icon, title, children }: { icon: typeof Keyboard; title: string; children: ReactNode }) {
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
