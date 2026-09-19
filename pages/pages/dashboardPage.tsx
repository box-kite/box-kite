import { LayoutDashboard, Move, Sparkles } from 'lucide-react';
import { ReactNode, useMemo, useState, useSyncExternalStore } from 'react';
import dashboardApi from '../../api/components/dashboardgrid.json';
import widgetApi from '../../api/components/widget.json';
import Box from '../../src/box';
import Button from '../../src/components/button';
import { Gauge, ProgressRing, Sparkline } from '../../src/components/chart';
import DashboardGrid, { DashboardUtils, Widget } from '../../src/components/dashboard';
import Flex from '../../src/components/flex';
import { H2 } from '../../src/components/semantics';
import Switch from '../../src/components/switch';
import { DashboardLayout } from '../../src/utils/dashboard/dashboardUtils';
import ApiReference from '../components/apiReference';
import Code from '../components/code';
import Mono from '../components/mono';
import PageHeader from '../components/pageHeader';
import Reveal from '../components/reveal';
import useTableOfContents from '../hooks/useTableOfContents';
import { apiSections } from '../site/componentApi';

const STARTING_LAYOUT: DashboardLayout = {
  version: 1,
  columns: 12,
  items: [
    { id: 'revenue', x: 0, y: 0, w: 6, h: 2 },
    { id: 'conversion', x: 6, y: 0, w: 3, h: 2, minW: 2 },
    { id: 'load', x: 9, y: 0, w: 3, h: 2, minW: 2 },
    { id: 'orders', x: 0, y: 2, w: 12, h: 2 },
  ],
};

const REVENUE = [12, 19, 14, 22, 28, 24, 31, 35, 30, 38, 42, 47];
const ORDERS = [4, 9, 7, 12, 10, 16, 14, 19, 17, 24, 21, 27];

export default function DashboardPage() {
  useTableOfContents(sidebarLinks);

  return (
    <Box>
      <PageHeader
        icon={LayoutDashboard}
        title="Dashboard"
        description="A dashboard people rearrange and a model can write: the layout is JSON in cells, every place is a class, and the only thing measured is the pointer."
      />

      <Reveal delay={0.1}>
        <Flex d="column" gap={10}>
          <Code label="Import" language="jsx" code="import DashboardGrid, { Widget } from '@box-kite/react/components/dashboard';" />

          <Section id="usage" title="A dashboard, and the layout behind it">
            <Box>
              A <Mono>DashboardGrid</Mono> takes a layout and some widgets; each <Mono>Widget</Mono> fills the layout item with its{' '}
              <Mono>id</Mono>. Turn edit mode on below and drag a title bar — or Tab to a handle and press Enter, which does the same thing
              without a mouse.
            </Box>
            <Box mt={4}>
              <LiveDashboard />
            </Box>
            <Box mt={4}>
              <Code
                language="jsx"
                codeOnly
                code={`<DashboardGrid layout={layout} onLayoutChange={setLayout} editable columns={12}>
  <Widget id="revenue" title="Revenue" description="Last 12 weeks">
    <Sparkline data={revenue} variant="area" width="100%" height="100%" />
  </Widget>
  <Widget id="orders" title="Orders" onRefresh={reload}>
    <Sparkline data={orders} width="100%" height="100%" />
  </Widget>
</DashboardGrid>`}
              />
            </Box>
          </Section>

          <Section id="layout" title="The layout is the artifact">
            <Box>
              One version, one column count and one place per widget, in cells — plain JSON with no component and no measurement in it. It
              is what a model emits, what a drag reports back and what an app stores.
            </Box>
            <Box mt={4}>
              <Code
                language="jsx"
                codeOnly
                check={false}
                code={`{
  "version": 1,
  "columns": 12,
  "items": [
    { "id": "revenue", "x": 0, "y": 0, "w": 6, "h": 2 },
    { "id": "orders",  "x": 6, "y": 0, "w": 6, "h": 2, "minW": 3 }
  ]
}`}
              />
            </Box>
            <Box mt={4}>
              The layout is <strong>compacted upward</strong>: a widget cannot be parked in mid-air, so a drop below its neighbours rises to
              meet them and two dashboards holding the same widgets in the same places compare equal. A widget dropped on a neighbour{' '}
              <strong>takes the cell</strong>, and the neighbour is handed one of its own — the row above where there is room for it, the
              row below otherwise. An item may carry its own <Mono>minW</Mono>/<Mono>minH</Mono>/<Mono>maxW</Mono>/<Mono>maxH</Mono>, and{' '}
              <Mono>fixed</Mono> pins it: it is never moved, never resized, and has no handles rather than handles that refuse.
            </Box>
          </Section>

          <Section id="classes" title="Every place is a class">
            <Box>
              A widget's cell is <Mono>grid-column</Mono> and <Mono>grid-row</Mono> — props, so they are shared classes. There is no
              transform per item, no <Mono>ResizeObserver</Mono> and no measured pixel in a resting dashboard, which is what makes the same
              layout render on a server. The one inline style in the component is the translate that keeps a dragged widget under the
              pointer: a value per frame, which a class would make a rule per frame that is never freed.
            </Box>
            <Box mt={4}>
              <Code language="jsx" codeOnly code={`<Box gridColumnStart={7} gridColumnEnd={13} gridRowStart={1} gridRowEnd={3} />`} />
            </Box>
          </Section>

          <Section id="responsive" title="Narrower is a projection, not a second layout">
            <Box>
              <Mono>columns</Mono> takes a count per container size, and the default is <Mono>{'{ xs: 1, md: 6, xxl: 12 }'}</Mono>: one
              column until the dashboard is 28rem wide, six from there and twelve from 42rem — the space the layout is written in. Each
              narrower arrangement is the same layout <em>projected</em>: arithmetic done at render, written as a container query, so the
              browser picks between classes and nothing measures a width. The smallest count is the plain one, which is also what a
              container narrower than every size named gets.
            </Box>
            <Box mt={4}>
              <Code language="jsx" codeOnly code={`<DashboardGrid columns={{ sm: 2, md: 6, xxl: 12 }} layout={layout} />`} />
            </Box>
            <Box mt={4}>
              It answers to its own width rather than the page's, so a dashboard in a sidebar stacks while the same layout in the main
              column stays arranged. Every projection is drawn on the widest arrangement's tracks, because{' '}
              <strong>a grid cannot container-query itself</strong> — a track count per size resolves against an ancestor container and
              silently does nothing, which is a thing to know before writing <Mono>cq</Mono> on the element carrying <Mono>container</Mono>.
              The other consequence worth knowing: <strong>an arrangement can only be edited in the space it is written in</strong>. Where
              the grid is showing a projection the handles are not there at all, because an edit made in six columns is not a layout in
              twelve, and writing one back would quietly replace the other.
            </Box>
          </Section>

          <Section id="editing" title="Edit mode, and the grab">
            <Box>
              <Mono>editable</Mono> is the whole split between looking at a dashboard and changing it: without it there are no handles and
              nothing in the tab order. With it, each widget has two — a grip in the title bar and a corner — and both are real buttons.
            </Box>
            <Box mt={4}>
              <Note icon={Move} title="Dragging is not a keyboard gesture, so the keyboard gets a grab">
                Enter or Space picks the widget up, the arrows move it a cell at a time, Enter drops it and Escape puts it back — the layout
                with it. Every step is announced in a live region that was there before there was anything to say, and the arrows follow the
                reading order, so in a right-to-left page ArrowLeft moves a widget to the right. Focus never leaves the handle, so there is
                nothing to hand back; a grab that loses focus is cancelled rather than dropped somewhere nobody looked at.
              </Note>
            </Box>
            <Box mt={4}>
              <Mono>onLayoutChange</Mono> fires on every cell a drag crosses — the live value — and <Mono>onLayoutCommit</Mono> once when
              the interaction ends, which is the one to write to a server. Both carry a reason, <Mono>'move'</Mono> or <Mono>'resize'</Mono>
              ; which device did it is in <Mono>details.event</Mono>.
            </Box>
          </Section>

          <Section id="states" title="A widget is chrome, and four states">
            <Box>
              <Mono>loading</Mono> draws bars where the content will be and reports <Mono>aria-busy</Mono>, <Mono>error</Mono> replaces the
              content with the message and — where there is an <Mono>onRefresh</Mono> — a retry, and <Mono>empty</Mono> says so in words
              rather than leaving a panel that looks broken. Anything else renders the children.
            </Box>
            <Box mt={4}>
              <Code
                language="jsx"
                code={`<Widget title="Revenue" description="Last 30 days" onRefresh={() => {}} error="The report timed out." />`}
              >
                <Flex gap={4} py={6} width="fit" flexWrap="wrap">
                  <Box width={64}>
                    <Widget title="Revenue" description="Last 30 days" onRefresh={() => {}} error="The report timed out." />
                  </Box>
                  <Box width={64}>
                    <Widget title="Orders" loading />
                  </Box>
                  <Box width={64}>
                    <Widget title="Refunds" empty />
                  </Box>
                </Flex>
              </Code>
            </Box>
            <Box mt={4}>
              The title is a real heading at <Mono>level</Mono> (default 3), so a dashboard has an outline rather than a page of anonymous
              boxes — and outside a <Mono>DashboardGrid</Mono> a <Mono>Widget</Mono> is simply a card with the same chrome.
            </Box>
          </Section>

          <Section id="persistence" title="Where a dashboard is kept is the app's decision">
            <Box>
              The grid holds no storage of its own: only the app knows whether a dashboard belongs to a person, a team or a URL. The demo
              above keeps its layout in <Mono>localStorage</Mono>, which is the whole of it — <Mono>DashboardUtils.parse</Mono> reads
              whatever comes back and reports what it could not use rather than throwing, so a layout written by an older version, or by
              hand, still renders.
            </Box>
            <Box mt={4}>
              <Code
                language="jsx"
                codeOnly
                code={`import DashboardGrid, { DashboardUtils, Widget } from '@box-kite/react/components/dashboard';

const stored = localStorage.getItem('dashboard');
const { layout, issues } = DashboardUtils.parse(stored ? JSON.parse(stored) : null);

<DashboardGrid
  layout={layout}
  onLayoutChange={setLayout}
  onLayoutCommit={(next) => localStorage.setItem('dashboard', JSON.stringify(next))}
  editable
/>;`}
              />
            </Box>
          </Section>

          <Section id="generated" title="A layout a model writes">
            <Box>
              <Mono>DashboardUtils.SCHEMA</Mono> is the layout as JSON Schema — the constraint a model generates a dashboard under, in the
              same subset <Mono>catalog()</Mono> emits and <Mono>&lt;SpecRenderer&gt;</Mono> validates. The schema says the shape and{' '}
              <Mono>parse</Mono> says the sense: a generated <Mono>w: 0</Mono> or a column count of 400 is clamped rather than refused, and
              two items claiming one id become one.
            </Box>
            <Box mt={4}>
              <Note icon={Sparkles} title="The pair this is built for">
                <Mono>catalog()</Mono> says which components a generated UI may name and what their props may be; this says where they go.
                Hand a model both, render what comes back with <Mono>&lt;SpecRenderer&gt;</Mono> inside the widgets, and the arrangement is
                still something a person can drag afterwards — which is the point of keeping the layout an artifact rather than a render.
              </Note>
            </Box>
            <Box mt={4}>
              <Code
                language="jsx"
                codeOnly
                code={`import { DashboardUtils } from '@box-kite/react/components/dashboard';

const layout = await generate({ schema: DashboardUtils.SCHEMA, prompt });
const { layout: safe, issues } = DashboardUtils.parse(layout);`}
              />
            </Box>
          </Section>

          <Section id="styling" title="Styling">
            <Box>
              The tree is <Mono>dashboard</Mono> and <Mono>dashboard.placeholder</Mono> for the grid, and <Mono>widget</Mono> with{' '}
              <Mono>header</Mono>, <Mono>label</Mono>, <Mono>title</Mono>, <Mono>description</Mono>, <Mono>actions</Mono>,{' '}
              <Mono>handle</Mono>, <Mono>body</Mono>, <Mono>message</Mono>, <Mono>retry</Mono> and <Mono>skeleton</Mono> under it. Both
              handles are the one <Mono>handle</Mono> node — the corner is its <Mono>corner</Mono> variant — and the row height is a
              variable rather than a prop, so it can be set per breakpoint or per theme like any other value.
            </Box>
            <Box mt={4}>
              <Code
                language="jsx"
                codeOnly
                code={`Box.components({
  widget: { styles: { borderRadius: 4, shadow: 'medium' } },
  dashboard: { styles: { gap: 6, vars: { 'dashboard-row': '8rem' } } },
});`}
              />
            </Box>
          </Section>

          <ApiReference api={dashboardApi} />

          <ApiReference api={widgetApi} />
        </Flex>
      </Reveal>
    </Box>
  );
}

const STORAGE_KEY = 'box-kite-dashboard-demo';

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);

  return () => void listeners.delete(listener);
}

function readStored(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    // Blocked storage is an empty dashboard, not a broken page.
    return null;
  }
}

function writeStored(value: string | null): void {
  try {
    value === null ? localStorage.removeItem(STORAGE_KEY) : localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // As above: the dashboard still works, it just will not be there tomorrow.
  }
  listeners.forEach((listener) => listener());
}

/**
 * The demo, persisted the way the page says to persist one. The stored layout is read through
 * `useSyncExternalStore` rather than copied into state by an effect — the page is prerendered, so the
 * server snapshot has to be the layout the HTML was built with, and React is what reconciles the two.
 */
function LiveDashboard() {
  const [editable, setEditable] = useState(true);
  const [edited, setEdited] = useState<DashboardLayout | null>(null);
  const storedText = useSyncExternalStore(subscribe, readStored, () => null);

  const stored = useMemo(() => {
    if (!storedText) return null;

    try {
      return DashboardUtils.parse(JSON.parse(storedText)).layout;
    } catch {
      // A layout nobody can read is one to forget, not one to shout about.
      return null;
    }
  }, [storedText]);

  const layout = edited ?? stored ?? STARTING_LAYOUT;

  const store = (next: DashboardLayout) => {
    setEdited(next);
    writeStored(JSON.stringify(next));
  };

  const reset = () => {
    setEdited(null);
    writeStored(null);
  };

  return (
    <Box>
      <Flex gap={4} ai="center" mb={4} flexWrap="wrap">
        <Switch label="Edit mode" checked={editable} onChange={(event) => setEditable(event.target.checked)} />
        <Button variant="secondary" onClick={reset}>
          Reset the layout
        </Button>
      </Flex>
      <DashboardGrid
        label="Sales"
        columns={{ sm: 2, md: 6, xxl: 12 }}
        rowHeight={22}
        editable={editable}
        layout={layout}
        onLayoutChange={setEdited}
        onLayoutCommit={store}
      >
        <Widget id="revenue" title="Revenue" description="Last 12 weeks">
          <Sparkline data={REVENUE} variant="area" width="100%" height="100%" color="indigo-500" />
        </Widget>
        <Widget id="conversion" title="Conversion">
          <Flex ai="center" jc="center" height="fit">
            <ProgressRing value={0.62} label="62 per cent" color="emerald-500" />
          </Flex>
        </Widget>
        <Widget id="load" title="Load">
          <Flex ai="center" jc="center" height="fit">
            <Gauge value={0.4} label="40 per cent" color="amber-500" />
          </Flex>
        </Widget>
        <Widget id="orders" title="Orders" description="One bar a week">
          <Sparkline data={ORDERS} variant="bar" width="100%" height="100%" color="sky-500" />
        </Widget>
      </DashboardGrid>
    </Box>
  );
}

const sidebarLinks = [
  { id: 'usage', label: 'Usage' },
  { id: 'layout', label: 'The layout is the artifact' },
  { id: 'classes', label: 'Every place is a class' },
  { id: 'responsive', label: 'Narrower is a projection' },
  { id: 'editing', label: 'Edit mode and the grab' },
  { id: 'states', label: 'A widget is four states' },
  { id: 'persistence', label: 'Where it is kept' },
  { id: 'generated', label: 'A layout a model writes' },
  { id: 'styling', label: 'Styling' },
  ...apiSections(dashboardApi),
  ...apiSections(widgetApi),
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

function Note({ icon: Icon, title, children }: { icon: typeof Move; title: string; children: ReactNode }) {
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
