import { CalendarClock, Clock, Globe, Languages, Server, Sigma } from 'lucide-react';
import { ReactNode, useEffect, useState } from 'react';
import dateTimeApi from '../../api/components/datetime.json';
import Box from '../../src/box';
import DateTime from '../../src/components/dateTime';
import Flex from '../../src/components/flex';
import { H2 } from '../../src/components/semantics';
import { format, now, toLocal } from '../../src/date';
import ApiReference from '../components/apiReference';
import Code from '../components/code';
import Mono from '../components/mono';
import PageHeader from '../components/pageHeader';
import Reveal from '../components/reveal';
import useTableOfContents from '../hooks/useTableOfContents';
import { apiSections } from '../site/componentApi';

const ORDER_PLACED = '2026-10-19T11:30:00Z';

/** The four kinds, each with a value written the way the layer writes it. */
const KINDS: { kind: string; value: string; means: string }[] = [
  { kind: 'date', value: '2026-10-19', means: 'A day with no time and no zone: a birthday, a due date. The same day everywhere.' },
  { kind: 'time', value: '14:30:00', means: 'A time of day with no date: opening hours, an alarm.' },
  {
    kind: 'datetime',
    value: '2026-10-19T14:30:00',
    means: 'A wall clock with no zone: a train timetable, a meeting "at nine wherever you are".',
  },
  {
    kind: 'instant',
    value: '2026-10-19T14:30:00+03:00',
    means: 'One moment, written as one zone sees it — or `…Z` in UTC. Anything stored or sent.',
  },
];

// The clock demo ticks once a second, so it holds its own state: in the page component it would re-render every
// code block on the page with it.
function Clocks() {
  const [moment, setMoment] = useState<string | null>(null);

  useEffect(() => {
    // From a timer rather than the effect itself: the first tick is as asynchronous as the rest.
    const tick = () => setMoment(now('utc'));
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, 1000);

    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, []);

  const rows: [string, string][] = moment
    ? [
        ['now("utc")', moment],
        ['toLocal(…)', toLocal(moment) ?? ''],
        ['format(…)', format(moment, { timeStyle: 'medium' })],
        ['format(…, Tokyo)', format(moment, { zone: 'Asia/Tokyo', timeStyle: 'medium', timeZoneName: 'short' })],
      ]
    : [];

  return (
    <Flex d="column" gap={2} py={4} fontSize={14} minHeight={30}>
      {rows.map(([label, value]) => (
        <Flex key={label} gap={4} flexWrap="wrap">
          <Box width={36} flexShrink={0}>
            <Mono>{label}</Mono>
          </Box>
          <Box>{value}</Box>
        </Flex>
      ))}
    </Flex>
  );
}

export default function DatesPage() {
  useTableOfContents(sidebarLinks);

  return (
    <Box>
      <PageHeader
        icon={CalendarClock}
        title="Dates and times"
        description="Dates, times and time zones with no dependency: every value is an ISO string, every zone comes from Intl, and every control hands back UTC and the reader's own clock beside the value."
      />

      <Reveal delay={0.1}>
        <Flex d="column" gap={10}>
          <Code label="Import" language="jsx" code={`import { format, toUtc, toLocal, today, parse } from '@box-kite/react/date';`} />

          <Section id="kinds" title="A value's shape is its kind">
            <Box>
              A date in JavaScript is a <Mono>Date</Mono>, and a <Mono>Date</Mono> is always a moment in the runtime's zone — which is how a
              birthday saved in Chișinău comes back as the day before in New York. This layer never holds one. Every value is an ISO string,
              and what the string looks like is what it means:
            </Box>
            <Flex d="column" gap={3} mt={4}>
              {KINDS.map(({ kind, value, means }) => (
                <Flex key={kind} gap={4} flexWrap="wrap">
                  <Box width={20} flexShrink={0} fontWeight={600}>
                    {kind}
                  </Box>
                  <Box width={64} flexShrink={0}>
                    <Mono>{value}</Mono>
                  </Box>
                  <Box flex1 minWidth={60}>
                    {means}
                  </Box>
                </Flex>
              ))}
            </Flex>
            <Box mt={4}>
              A string is what a form posts, what JSON carries and what a Server Component can hand a client one, so a value never needs
              converting at a boundary — only when the app asks a question of it. Temporal, which ships in Chrome and Firefox and not yet in
              Safari, draws the same four lines; the names here are its names.
            </Box>
          </Section>

          <Section id="conversions" title="Conversions say what they mean">
            <Box>
              Every conversion names its target. <Mono>toUtc</Mono> is the moment in UTC, <Mono>toLocal</Mono> the reader's wall clock,{' '}
              <Mono>toZone</Mono> another one, and <Mono>toPlainDate</Mono> the day a moment falls on <em>somewhere</em> — which is the
              question a <Mono>Date</Mono> answers wrong.
            </Box>
            <Box mt={4}>
              <Code
                language="jsx"
                code={`toUtc('2026-10-19T14:30', { from: 'Europe/Chisinau' }); // '2026-10-19T11:30:00Z'
toZone('2026-10-19T11:30:00Z', 'America/New_York');   // '2026-10-19T07:30:00-04:00'
toLocal('2026-10-19T11:30:00Z');                       // the reader's wall clock, with its offset
toPlainDate('2026-10-19T23:30:00Z', { zone: 'utc' });  // '2026-10-19' — and '2026-10-20' in Tokyo`}
              >
                <Clocks />
              </Code>
            </Box>
          </Section>

          <Section id="zones" title="Zones, offsets and the hour that does not exist">
            <Box>
              A zone is <Mono>'local'</Mono> (the reader), <Mono>'utc'</Mono>, an IANA name or a fixed offset like <Mono>'+03:00'</Mono>,
              and every one of them is read through <Mono>Intl</Mono> — so there is no zone database to ship and no update to wait for. The
              offsets are cached per zone, one formatter each: about 4µs a lookup.
            </Box>
            <Box mt={4}>
              Twice a year a wall clock skips an hour or repeats one, and a time inside it names no moment or two. The layer answers the way
              Temporal does: <Mono>disambiguation: 'compatible'</Mono> by default (the later reading of a skipped time, the earlier of a
              repeated one, which is what every operating system does), with <Mono>'earlier'</Mono>, <Mono>'later'</Mono> and{' '}
              <Mono>'reject'</Mono> beside it.
            </Box>
            <Box mt={4}>
              <Code
                language="jsx"
                code={`toInstant('2026-03-29T02:30', { zone: 'Europe/Berlin' });                  // '2026-03-29T03:30:00+02:00'
toInstant('2026-10-25T02:30', { zone: 'Europe/Berlin', disambiguation: 'later' }); // '…+01:00'
add('2026-03-28T12:00:00+01:00', { days: 1 }, { zone: 'Europe/Berlin' });        // noon again, '…+02:00'`}
              />
            </Box>
          </Section>

          <Section id="locale" title="Every locale, nothing shipped">
            <Box>
              Names, orders, the first day of the week and the 12- or 24-hour clock all come from the runtime's <Mono>Intl</Mono>, so the
              library carries no locale data at all — Romanian, Japanese and Arabic cost the same as English. <Mono>format</Mono> takes
              presets rather than tokens, and <Mono>parse</Mono> reads text in the locale's own order:
            </Box>
            <Box mt={4}>
              <Code
                language="jsx"
                code={`format('2026-10-19', { locale: 'ro-MD', dateStyle: 'long' }); // '19 octombrie 2026'
format('14:30', { locale: 'en-US' });                         // '2:30 PM'
formatRelative('2026-10-20', { now: '2026-10-19T12:00:00Z' });  // 'tomorrow'
parse('03/04/2026', { locale: 'en-US' });                     // '2026-03-04'
parse('03/04/2026', { locale: 'en-GB' });                     // '2026-04-03'
parse('19 oct 2026 14:30', { locale: 'ro-MD' });              // '2026-10-19T14:30:00'`}
              />
            </Box>
          </Section>

          <Section id="display" title="Writing a value out: DateTime">
            <Box>
              <Mono>&lt;DateTime&gt;</Mono> writes a value for whoever is reading, inside a real <Mono>&lt;time datetime&gt;</Mono> that
              keeps the exact value for a machine. Order placed <DateTime value={ORDER_PLACED} /> — on your own wall clock.
            </Box>
            <Box mt={4}>
              <Code
                language="jsx"
                code={`<DateTime value="2026-10-19T11:30:00Z" />
<DateTime value="2026-10-19T11:30:00Z" zone="utc" format={{ timeStyle: 'short', timeZoneName: 'short' }} />
<DateTime value="2026-10-19" format={{ dateStyle: 'full' }} />`}
              >
                <Flex d="column" gap={2} py={4}>
                  <DateTime value={ORDER_PLACED} />
                  <DateTime value={ORDER_PLACED} zone="utc" format={{ timeStyle: 'short', timeZoneName: 'short' }} />
                  <DateTime value="2026-10-19" format={{ dateStyle: 'full' }} />
                </Flex>
              </Code>
            </Box>
          </Section>

          <Section id="server" title="On a server">
            <Box>
              A server does not know who is reading, and its own zone is usually UTC. So <Mono>'local'</Mono> on a server is whatever{' '}
              <Mono>configureDates({'{ timeZone }'})</Mono> or a <Mono>DateProvider</Mono> says the reader is, and the server's own zone is
              always <Mono>systemZone()</Mono> — next to UTC, never instead of it.
            </Box>
            <Flex d="column" gap={3} mt={4}>
              <Note icon={Server} title="No hydration error, ever">
                A date component on a server and while hydrating renders in the fallback — <Mono>UTC</Mono> and <Mono>en-US</Mono>, or what
                a <Mono>DateProvider</Mono> above it says — and the render after hydration switches to the reader's zone and language. Two
                renders that disagree are a hydration error, and this is the one way they cannot.
              </Note>
              <Note icon={Globe} title="Right on the first paint">
                The browser writes its zone into a cookie with <Mono>zoneCookie()</Mono>; the next request's server reads it back with{' '}
                <Mono>readZoneCookie</Mono> and hands it to a <Mono>DateProvider</Mono>, and the server's HTML is already in the reader's
                zone.
              </Note>
            </Flex>
            <Box mt={4}>
              <Code
                language="jsx"
                code={`// In the browser, once:
document.cookie = zoneCookie();

// On the server (a Next.js layout):
const zone = readZoneCookie((await headers()).get('cookie'));
<DateProvider timeZone={zone} locale="ro-MD">{children}</DateProvider>`}
                check={false}
              />
            </Box>
            <Box mt={4}>
              In a Server Component with nothing to hydrate, <Mono>format()</Mono> is the same text with no component at all.
            </Box>
          </Section>

          <Section id="arithmetic" title="Arithmetic">
            <Box>
              <Mono>add</Mono> and <Mono>subtract</Mono> keep a value's kind. The calendar half of a duration (years to days) moves the wall
              clock, so a day later is the same time tomorrow across a daylight-saving change; the clock half (hours down) moves the moment.{' '}
              <Mono>startOf</Mono>, <Mono>endOf</Mono>, <Mono>difference</Mono>, <Mono>compare</Mono> and <Mono>isSame</Mono> take a unit —
              and <Mono>'week'</Mono> starts where the reader's locale starts it.
            </Box>
            <Box mt={4}>
              <Code
                language="jsx"
                code={`add('2026-01-31', { months: 1 });                       // '2026-02-28'
add('23:30', { minutes: 45 });                          // '00:15:00'
startOf('2026-10-21', 'week', { locale: 'en-US' });     // '2026-10-18', a Sunday
difference('2026-02-28', '2026-01-31', 'month');        // 0 — not a month yet
isSame('2026-10-19T22:30:00Z', '2026-10-20', 'day');    // in the reader's zone`}
              />
            </Box>
          </Section>

          <Section id="readings" title="Every reading at once">
            <Box>
              <Mono>details(value, {'{ zone }'})</Mono> answers every question at once — the canonical string, the moment in UTC, on the
              zone's wall clock and on the reader's, the offset, a <Mono>Date</Mono> and the epoch — and it is what every date control hands
              its <Mono>onValueChange</Mono> beside the string, so <Mono>(value, {'{ utc, local }'}) =&gt; …</Mono> is all an app writes.
            </Box>
            <Flex d="column" gap={3} mt={4}>
              <Note icon={Sigma} title="Small">
                The whole layer is under 8 KB gzipped with no React and no engine in it — under half of date-fns with its zone add-on, and
                no locale files to add.
              </Note>
              <Note icon={Languages} title="Not a Date">
                <Mono>toDate()</Mono> and <Mono>fromDate()</Mono> are there for an API that insists on one. A date is its midnight in the
                zone you name, which is the one way a <Mono>Date</Mono> can hold a day.
              </Note>
              <Note icon={Clock} title="Gregorian">
                Values are on the Gregorian calendar with Latin digits, which is what ISO 8601 and every database speak; a locale's own
                calendar is used for display only where you pass it in <Mono>format</Mono>'s options.
              </Note>
            </Flex>
          </Section>

          <ApiReference api={dateTimeApi} />
        </Flex>
      </Reveal>
    </Box>
  );
}

const sidebarLinks = [
  { id: 'kinds', label: 'A shape is a kind' },
  { id: 'conversions', label: 'Conversions' },
  { id: 'zones', label: 'Zones and DST' },
  { id: 'locale', label: 'Every locale' },
  { id: 'display', label: 'DateTime' },
  { id: 'server', label: 'On a server' },
  { id: 'arithmetic', label: 'Arithmetic' },
  { id: 'readings', label: 'Every reading' },
  ...apiSections(dateTimeApi),
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

function Note({ icon: Icon, title, children }: { icon: typeof Server; title: string; children: ReactNode }) {
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
