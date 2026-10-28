import { LogIn, LogOut, RefreshCw } from 'lucide-react';
import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Box from '../../src/box';
import Button from '../../src/components/button';
import { ProgressRing } from '../../src/components/chart';
import DashboardGrid, { Widget } from '../../src/components/dashboard';
import DataGrid from '../../src/components/dataGrid';
import Flex from '../../src/components/flex';
import Icon from '../../src/components/icon';
import { H1, Li, Link, P, Span, Ul } from '../../src/components/semantics';
import { Rect, Svg, SvgText } from '../../src/components/svg';
import { DashboardLayout } from '../../src/utils/dashboard/dashboardUtils';
import Mono from '../components/mono';
import { ADMIN_PATH } from '../site/site';
import {
  AdminRequestError,
  change,
  countryName,
  dayBars,
  demoEvents,
  demoOverview,
  EVENT_LIMIT,
  EventRow,
  fetchEvents,
  fetchOverview,
  formatBytes,
  formatChange,
  Overview,
  pagesPerSession,
  Range,
  RANGES,
  ranked,
  STORAGE_LIMIT,
} from './adminData';
import {
  AdminConfig,
  AdminSession,
  configFrom,
  freshSession,
  readSession,
  sessionFromHash,
  signInUrl,
  signOut,
  storeSession,
} from './adminSession';

type Status =
  | { kind: 'checking' }
  | { kind: 'unconfigured' }
  | { kind: 'signed-out'; error?: string }
  | { kind: 'forbidden'; session: AdminSession }
  | { kind: 'ready'; session?: AdminSession };

type Data = { overview: Overview; events: EventRow[] } | { error: string } | null;

const LAYOUT: DashboardLayout = {
  version: 1,
  columns: 12,
  items: [
    { id: 'views', x: 0, y: 0, w: 3, h: 1 },
    { id: 'sessions', x: 3, y: 0, w: 3, h: 1 },
    { id: 'depth', x: 6, y: 0, w: 3, h: 1 },
    { id: 'events', x: 9, y: 0, w: 3, h: 1 },
    { id: 'daily', x: 0, y: 1, w: 8, h: 3 },
    { id: 'storage', x: 8, y: 1, w: 4, h: 3 },
    { id: 'pages', x: 0, y: 4, w: 6, h: 4 },
    { id: 'referrers', x: 6, y: 4, w: 3, h: 4 },
    { id: 'countries', x: 9, y: 4, w: 3, h: 4 },
    { id: 'interactions', x: 0, y: 8, w: 6, h: 3 },
    { id: 'controls', x: 6, y: 8, w: 6, h: 3 },
    { id: 'log', x: 0, y: 11, w: 12, h: 5 },
  ],
};

const numbers = new Intl.NumberFormat('en');
const days = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', timeZone: 'UTC' });

function storage(): Storage | undefined {
  try {
    return localStorage;
  } catch {
    return undefined;
  }
}

export default function AdminPage() {
  const config = useMemo(() => configFrom(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY), []);
  // The prerender and the first client render agree on `checking`; what the browser knows is read after hydration.
  const [status, setStatus] = useState<Status>({ kind: 'checking' });
  const [range, setRange] = useState<Range>(7);
  const [reload, setReload] = useState(0);
  // Keyed by what it was loaded for, so a period it no longer matches reads as loading with no reset in the effect.
  const [loaded, setLoaded] = useState<{ key: string; data: Data } | null>(null);
  // The live session: a refresh rotates the refresh token, and the old one must never be sent again.
  const sessionRef = useRef<AdminSession | undefined>(undefined);
  const key = `${range}:${reload}`;

  useEffect(() => {
    const next = initialStatus(config);
    sessionRef.current = next.kind === 'ready' ? next.session : undefined;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the URL and storage are unreadable during the prerender
    setStatus(next);
  }, [config]);

  const session = status.kind === 'ready' ? status.session : undefined;
  const ready = status.kind === 'ready';

  useEffect(() => {
    if (!ready) return;

    let current = true;
    load(config, sessionRef.current, range).then(
      (result) => {
        if (!current) return;
        if ('status' in result) {
          sessionRef.current = result.status.kind === 'forbidden' ? result.status.session : undefined;

          return setStatus(result.status);
        }
        if (result.session) sessionRef.current = result.session;
        setLoaded({ key, data: result.data });
      },
      () => current && setLoaded({ key, data: { error: 'The analytics could not be reached.' } }),
    );

    return () => {
      current = false;
    };
  }, [ready, config, range, key]);

  const leave = useCallback(async () => {
    if (config && sessionRef.current) await signOut(config, sessionRef.current);
    sessionRef.current = undefined;
    storeSession(storage(), null);
    setStatus({ kind: 'signed-out' });
  }, [config]);

  const signIn = () => {
    if (config) window.location.assign(signInUrl(config, `${window.location.origin}${ADMIN_PATH}/`));
  };

  if (status.kind === 'ready') {
    return (
      <Dashboard
        account={session?.account}
        range={range}
        data={loaded?.key === key ? loaded.data : null}
        onRange={setRange}
        onRefresh={() => setReload((count) => count + 1)}
        onSignOut={session ? leave : undefined}
      />
    );
  }

  return (
    <Flex d="column" ai="center" jc="center" minHeight="fit-screen" p={6}>
      <Flex
        d="column"
        gap={4}
        maxWidth={140}
        width="fit"
        p={8}
        b={1}
        borderColor="base-200"
        borderRadius={4}
        theme={{ dark: { borderColor: 'base-800' } }}
      >
        <H1 fontSize={24} fontWeight={700}>
          Analytics
        </H1>
        {status.kind === 'checking' && <P color="base-500">Checking who is signed in…</P>}
        {status.kind === 'unconfigured' && (
          <P>
            This build names no Supabase project. Set the <Mono>SUPABASE_URL</Mono> and <Mono>SUPABASE_PUBLISHABLE_KEY</Mono> repository
            variables, and run the Pages workflow again.
          </P>
        )}
        {status.kind === 'signed-out' && (
          <>
            <P>What people do on box-kite.dev, for the accounts on the admin list.</P>
            {status.error && (
              <P color="red-600" props={{ role: 'alert' }}>
                {status.error}
              </P>
            )}
            <Button onClick={signIn}>
              <Icon size={4}>
                <LogIn />
              </Icon>
              Sign in with GitHub
            </Button>
          </>
        )}
        {status.kind === 'forbidden' && (
          <>
            <P>
              You are signed in as <Mono>{status.session.account}</Mono>, which is not on the admin list. To add it, run this in the
              project’s SQL editor:
            </P>
            <Mono display="block" whiteSpace="pre-wrap" p={3} props={{ translate: 'no' }}>
              {`insert into public.analytics_admins (user_id)\nvalues ('${status.session.userId}');`}
            </Mono>
            <Flex gap={2}>
              <Button onClick={() => setStatus({ kind: 'ready', session: status.session })}>Try again</Button>
              <Button variant="secondary" onClick={leave}>
                Sign out
              </Button>
            </Flex>
          </>
        )}
        <P fontSize={14} color="base-500">
          <Link props={{ href: `${ADMIN_PATH}/?demo` }} color="accent-600" textDecoration="underline">
            Preview it with sample data
          </Link>
        </P>
      </Flex>
    </Flex>
  );
}

/** Where the page starts once it can read the browser: sample data, no project, a sign-in coming back, or a stored session. */
function initialStatus(config: AdminConfig | null): Status {
  if (new URLSearchParams(window.location.search).has('demo')) return { kind: 'ready' };
  if (!config) return { kind: 'unconfigured' };

  const returned = sessionFromHash(window.location.hash, Date.now());
  // The tokens are not left in the address bar, the history or a copied link.
  if (returned) history.replaceState(history.state, '', window.location.pathname + window.location.search);
  if (returned && 'error' in returned) return { kind: 'signed-out', error: returned.error };
  if (returned) storeSession(storage(), returned);

  const session = returned ?? readSession(storage());

  return session ? { kind: 'ready', session } : { kind: 'signed-out' };
}

/** One period's overview and log, renewing the session first; an account the database refuses becomes a status instead. */
async function load(
  config: AdminConfig | null,
  session: AdminSession | undefined,
  range: Range,
): Promise<{ data: Data; session?: AdminSession } | { status: Status }> {
  const now = Date.now();
  if (!config || !session) return { data: { overview: demoOverview(range, now), events: demoEvents(now) } };

  const fresh = await freshSession(config, session, now);
  if (!fresh) {
    storeSession(storage(), null);

    return { status: { kind: 'signed-out', error: 'The session ended. Sign in again.' } };
  }
  if (fresh !== session) storeSession(storage(), fresh);

  try {
    const [overview, events] = await Promise.all([
      fetchOverview(config, fresh.accessToken, range),
      fetchEvents(config, fresh.accessToken, range, now),
    ]);

    return { data: { overview, events }, session: fresh };
  } catch (error) {
    if (error instanceof AdminRequestError && error.status === 403) return { status: { kind: 'forbidden', session: fresh } };
    if (error instanceof AdminRequestError && error.status === 401) {
      storeSession(storage(), null);

      return { status: { kind: 'signed-out', error: 'The session was refused. Sign in again.' } };
    }

    // A refusal carries the database's own words; anything else is the network, whose words are the browser's.
    const message = error instanceof AdminRequestError ? error.message : 'The Supabase project could not be reached.';

    return { data: { error: message }, session: fresh };
  }
}

interface DashboardProps {
  account?: string;
  range: Range;
  data: Data;
  onRange(range: Range): void;
  onRefresh(): void;
  onSignOut?: () => void;
}

function Dashboard({ account, range, data, onRange, onRefresh, onSignOut }: DashboardProps) {
  const loading = data === null;
  const error = data && 'error' in data ? data.error : undefined;
  const overview = data && 'overview' in data ? data.overview : undefined;
  const events = data && 'events' in data ? data.events : [];
  // Said once above the grid; each widget only says it has nothing.
  const state = { loading, error: error && 'Not loaded.' };
  const totals = overview?.totals;
  const previous = overview?.previous;

  return (
    <Box p={6} md={{ p: 8 }} maxWidth={360} mx="auto">
      <Flex ai="center" jc="space-between" gap={4} flexWrap="wrap" mb={6}>
        <Box>
          <H1 fontSize={28} fontWeight={700}>
            Analytics
          </H1>
          <P color="base-500" fontSize={14}>
            {account ? `box-kite.dev, signed in as ${account}` : 'Sample data: nothing here was measured.'}
          </P>
        </Box>
        <Flex gap={2} ai="center" flexWrap="wrap">
          <Flex gap={1} props={{ role: 'group', 'aria-label': 'Period' }}>
            {RANGES.map((option) => (
              <Button
                key={option}
                variant={option === range ? undefined : 'secondary'}
                props={{ 'aria-pressed': option === range }}
                onClick={() => onRange(option)}
              >
                {option} days
              </Button>
            ))}
          </Flex>
          <Button variant="secondary" onClick={onRefresh} disabled={loading}>
            <Icon size={4}>
              <RefreshCw />
            </Icon>
            Refresh
          </Button>
          {onSignOut && (
            <Button variant="ghost" onClick={onSignOut}>
              <Icon size={4}>
                <LogOut />
              </Icon>
              Sign out
            </Button>
          )}
        </Flex>
      </Flex>

      {error && (
        <Flex
          ai="center"
          jc="space-between"
          gap={4}
          mb={6}
          p={4}
          b={1}
          borderRadius={3}
          borderColor="red-300"
          bgColor="red-50"
          theme={{ dark: { borderColor: 'red-800', bgColor: 'red-950/40' } }}
          props={{ role: 'alert' }}
        >
          <P>{error}</P>
          <Button variant="secondary" onClick={onRefresh}>
            Try again
          </Button>
        </Flex>
      )}

      <DashboardGrid label="Analytics" layout={LAYOUT} rowHeight={26}>
        <Stat id="views" title="Page views" value={totals?.pageViews} previous={previous?.pageViews} range={range} {...state} />
        <Stat id="sessions" title="Sessions" value={totals?.sessions} previous={previous?.sessions} range={range} {...state} />
        <Stat
          id="depth"
          title="Pages per session"
          value={totals && pagesPerSession(totals)}
          previous={previous && pagesPerSession(previous)}
          range={range}
          {...state}
        />
        <Stat id="events" title="Interactions" value={totals?.events} previous={previous?.events} range={range} {...state} />

        <Widget id="daily" title="Page views per day" description="Days in UTC" {...state}>
          {overview && <DailyChart days={overview.days} />}
        </Widget>

        <Widget id="storage" title="Storage" description="Of the free plan’s 500 MB database" {...state}>
          {overview && (
            <Flex d="column" ai="center" jc="center" gap={3} height="fit">
              <ProgressRing
                value={Math.min(1, overview.storage.database / STORAGE_LIMIT)}
                label={`${Math.round((overview.storage.database / STORAGE_LIMIT) * 100)}% of the database used`}
                width="7rem"
                height="7rem"
                color="accent-500"
              >
                <SvgText x={50} y={58} textAnchor="middle" fontSize={22} fontWeight={600} fill="currentColor" stroke="none">
                  {`${Math.round((overview.storage.database / STORAGE_LIMIT) * 100)}%`}
                </SvgText>
              </ProgressRing>
              <P fontSize={14} textAlign="center">
                {formatBytes(overview.storage.database)} used, {formatBytes(overview.storage.tables)} of it analytics.
                <Span display="block" color="base-500">
                  Raw events are kept for 90 days, daily page totals for good.
                </Span>
              </P>
            </Flex>
          )}
        </Widget>

        <Widget id="pages" title="Top pages" empty={overview?.pages.length === 0} {...state}>
          {overview && <RankedList rows={ranked(overview.pages, (row) => row.views)} name={(row) => row.page} unit="views" />}
        </Widget>
        <Widget
          id="referrers"
          title="Referrers"
          description="Sessions that arrived from another site"
          empty={overview?.referrers.length === 0}
          {...state}
        >
          {overview && <RankedList rows={ranked(overview.referrers, (row) => row.sessions)} name={(row) => row.referrer} unit="sessions" />}
        </Widget>
        <Widget id="countries" title="Countries" empty={overview?.countries.length === 0} {...state}>
          {overview && (
            <RankedList rows={ranked(overview.countries, (row) => row.sessions)} name={(row) => countryName(row.country)} unit="sessions" />
          )}
        </Widget>

        <Widget
          id="interactions"
          title="Interactions"
          description="Everything but page views"
          empty={overview?.events.length === 0}
          {...state}
        >
          {overview && <RankedList rows={ranked(overview.events, (row) => row.count)} name={(row) => row.name} unit="times" />}
        </Widget>
        <Widget
          id="controls"
          title="Most-pressed controls"
          description="By the words on them"
          empty={overview?.labels.length === 0}
          {...state}
        >
          {overview && (
            <RankedList rows={ranked(overview.labels, (row) => row.count)} name={(row) => `${row.label} · ${row.name}`} unit="presses" />
          )}
        </Widget>

        <Widget
          id="log"
          title="Recent events"
          description={`The newest ${EVENT_LIMIT} of the period`}
          empty={!loading && events.length === 0}
          {...state}
        >
          <EventLog events={events} />
        </Widget>
      </DashboardGrid>
    </Box>
  );
}

interface StatProps {
  id: string;
  title: string;
  value?: number;
  previous?: number;
  range: Range;
  loading: boolean;
  error?: string;
}

function Stat({ id, title, value, previous, range, loading, error }: StatProps) {
  const delta = value === undefined || previous === undefined ? null : change(value, previous);

  return (
    <Widget id={id} title={title} loading={loading} error={error}>
      <Flex ai="baseline" gap={3} flexWrap="wrap">
        <Span fontSize={32} fontWeight={700} lineHeight={40} css={{ fontVariantNumeric: 'tabular-nums' }}>
          {value === undefined ? '–' : numbers.format(value)}
        </Span>
        {delta !== null && (
          <Span fontSize={13} color="base-500">
            {formatChange(delta)} on the {range} days before
          </Span>
        )}
      </Flex>
    </Widget>
  );
}

const CHART_WIDTH = 600;
const BAR_GAP = 8;
const CHART_HEIGHT = 160;

function DailyChart({ days: series }: { days: Overview['days'] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const bars = dayBars(
    series.map((day) => day.pageViews),
    CHART_WIDTH,
    CHART_HEIGHT,
    BAR_GAP,
  );
  const shown = series[hovered ?? series.length - 1];
  const total = series.reduce((sum, day) => sum + day.pageViews, 0);

  return (
    <Flex d="column" gap={2} height="fit">
      <P fontSize={14} props={{ 'aria-live': 'polite' }}>
        {shown && (
          <>
            <Span fontWeight={600}>{days.format(new Date(shown.day))}</Span>: {numbers.format(shown.pageViews)} page views,{' '}
            {numbers.format(shown.sessions)} sessions
          </>
        )}
      </P>
      <Box flex1 minHeight={0}>
        <Svg
          label={`${numbers.format(total)} page views over ${series.length} days`}
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          width="100%"
          height="100%"
          props={{
            preserveAspectRatio: 'none',
            onPointerMove: (event) => {
              const box = event.currentTarget.getBoundingClientRect();
              setHovered(Math.min(series.length - 1, Math.max(0, Math.floor(((event.clientX - box.left) / box.width) * series.length))));
            },
            onPointerLeave: () => setHovered(null),
          }}
        >
          {bars.map((bar, index) => (
            <Rect
              key={series[index].day}
              width={bar.width}
              height={bar.height}
              transform={`translate(${bar.x} ${bar.y})`}
              fill={index === hovered ? 'accent-700' : 'accent-500'}
            />
          ))}
        </Svg>
      </Box>
      <Flex jc="space-between" fontSize={12} color="base-500">
        <Span>{series[0] && days.format(new Date(series[0].day))}</Span>
        <Span>{series.at(-1) && days.format(new Date(series.at(-1)!.day))}</Span>
      </Flex>
    </Flex>
  );
}

interface RankedListProps<T> {
  rows: { row: T; value: number; share: number }[];
  name(row: T): ReactNode;
  unit: string;
}

function RankedList<T>({ rows, name, unit }: RankedListProps<T>) {
  return (
    <Ul display="flex" d="column" gap={2} listStyle="none" p={0} m={0} overflowY="auto" height="fit">
      {rows.map(({ row, value, share }, index) => (
        <Li key={index} display="flex" d="column" gap={1}>
          <Flex jc="space-between" gap={3} fontSize={14}>
            <Span overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
              {name(row)}
            </Span>
            <Span
              css={{ fontVariantNumeric: 'tabular-nums' }}
              color="base-600"
              theme={{ dark: { color: 'base-400' } }}
              props={{ 'aria-label': `${numbers.format(value)} ${unit}` }}
            >
              {numbers.format(value)}
            </Span>
          </Flex>
          {/* The length is an attribute, so a list of different lengths writes no CSS. */}
          <Svg viewBox="0 0 100 4" width="100%" height={4} props={{ preserveAspectRatio: 'none' }}>
            <Rect width={100} height={4} fill="base-100" theme={{ dark: { fill: 'base-800' } }} />
            <Rect width={Math.max(1, share * 100)} height={4} fill="accent-500" />
          </Svg>
        </Li>
      ))}
    </Ul>
  );
}

function EventLog({ events }: { events: EventRow[] }) {
  return (
    <DataGrid
      data={events}
      def={{
        rowKey: 'id',
        rowHeight: 32,
        visibleRowsCount: 12,
        sortable: true,
        globalFilter: true,
        columns: [
          { key: 'occurred_at', header: 'When', width: 170, dateFormat: 'datetime' },
          { key: 'name', header: 'Event', width: 180, filterable: true },
          { key: 'page', header: 'Page', width: 200, filterable: true },
          { key: 'label', header: 'Label', width: 140 },
          { key: 'reason', header: 'Reason', width: 90 },
          { key: 'referrer', header: 'Referrer', width: 160 },
          { key: 'country', header: 'Country', width: 80 },
          { key: 'session_id', header: 'Session', width: 120 },
        ],
      }}
    />
  );
}
