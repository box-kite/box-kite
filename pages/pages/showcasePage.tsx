import { Compass, LayoutList, Search, Star, Sun } from 'lucide-react';
import { ReactNode, useRef } from 'react';
import Box from '../../src/box';
import Accordion, { Collapsible } from '../../src/components/accordion';
import { ApprovalCard, Reasoning, StreamingText, ToolCallCard } from '../../src/components/agent';
import Button from '../../src/components/button';
import { ChartContainer, Gauge, MiniDonut, ProgressRing, Sparkline } from '../../src/components/chart';
import Checkbox from '../../src/components/checkbox';
import Combobox from '../../src/components/combobox';
import DashboardGrid, { Widget } from '../../src/components/dashboard';
import DataGrid from '../../src/components/dataGrid';
import Dialog, { AlertDialog } from '../../src/components/dialog';
import Dropdown from '../../src/components/dropdown';
import Flex from '../../src/components/flex';
import Grid from '../../src/components/grid';
import Icon from '../../src/components/icon';
import Menu from '../../src/components/menu';
import Overlay from '../../src/components/overlay';
import Popover from '../../src/components/popover';
import Presence from '../../src/components/presence';
import Progress from '../../src/components/progress';
import RadioButton from '../../src/components/radioButton';
import RadioGroup from '../../src/components/radioGroup';
import { H2 } from '../../src/components/semantics';
import Skeleton from '../../src/components/skeleton';
import Slider from '../../src/components/slider';
import { G, Rect, Svg } from '../../src/components/svg';
import Switch from '../../src/components/switch';
import Tabs from '../../src/components/tabs';
import Textarea from '../../src/components/textarea';
import Textbox from '../../src/components/textbox';
import Toaster, { toast } from '../../src/components/toaster';
import Tooltip from '../../src/components/tooltip';
import { DashboardLayout } from '../../src/utils/dashboard/dashboardUtils';
import { useHydrated } from '../app/hydration';
import Code from '../components/code';
import Mono from '../components/mono';
import PageHeader from '../components/pageHeader';
import Reveal from '../components/reveal';
import SiteLink from '../components/siteLink';
import useTableOfContents from '../hooks/useTableOfContents';
import { entries, entriesIn, groups, ShowcaseCard, ShowcaseName } from './showcase';

/**
 * Every component the library ships, twice, on one page: once in a light theme and once in a dark one,
 * side by side, whatever theme the site itself is in. That is what makes it a fixture — one screenshot
 * covers the library in both themes — and it is also the strongest demonstration of what a nested theme
 * does, since each half is a `<Box.Theme use="local">` and the nearest theme owns its subtree.
 *
 * The list is `showcase.ts` and the test beside it holds that list to `api/components/*.json`, so a
 * component added to the library and not to this page fails CI rather than quietly going missing.
 */
export default function ShowcasePage() {
  useTableOfContents([{ id: 'themes', label: 'Both themes at once' }, ...groups.map((group) => ({ id: group.id, label: group.label }))]);

  return (
    <Box>
      <PageHeader
        icon={LayoutList}
        title="Showcase"
        description={`All ${entries.length} components on one page, each drawn twice — a light theme and a dark one, side by side, whatever theme you are reading in.`}
      />

      {/* One viewport per app, so it is mounted here rather than inside a card. */}
      <Toaster />

      <Reveal delay={0.1}>
        <Flex d="column" gap={12}>
          <Box id="themes">
            <H2 fontSize={22} fontWeight={600} mb={3}>
              Both themes at once
            </H2>
            <Box maxWidth={180} lineHeight={28}>
              Each card renders its component twice, and the two halves are nothing but a <Mono>&lt;Box.Theme use="local"&gt;</Mono> each. A
              theme is a class on an ancestor and every rule is scoped to the subtree it owns, so a light half inside a dark page is light
              throughout — including for the props the inner theme never mentions. No re-render, no context read in a component, no second
              stylesheet.
            </Box>
            <Box mt={5}>
              <Code
                language="jsx"
                codeOnly
                code={`<Box.Theme use="local" theme="light">
  <Button>Save</Button>
</Box.Theme>
<Box.Theme use="local" theme="dark">
  <Button>Save</Button>
</Box.Theme>`}
              />
            </Box>
            <Box mt={5} maxWidth={180} lineHeight={28}>
              Where a component paints in the top layer — a dialog, a menu, a tooltip — the card shows the trigger, which is what the page
              itself draws. Every card links to the page that documents the rest of it, and every snippet on those pages opens in the{' '}
              <SiteLink to="/playground" textDecoration="underline">
                playground
              </SiteLink>
              .
            </Box>
          </Box>

          {groups.map((group) => (
            <Box key={group.id} id={group.id}>
              <H2 fontSize={22} fontWeight={600} mb={2}>
                {group.label}
              </H2>
              <Box mb={6} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-600' } }}>
                {group.note}
              </Box>
              <Flex d="column" gap={6}>
                {entriesIn(group.id).map((entry) => (
                  <Card key={entry.name} entry={entry} />
                ))}
              </Flex>
            </Box>
          ))}
        </Flex>
      </Reveal>
    </Box>
  );
}

function Card({ entry }: { entry: ShowcaseCard }) {
  return (
    <Box
      b={1}
      borderRadius={3}
      overflow="hidden"
      theme={{ dark: { borderColor: 'slate-700', bgColor: 'slate-900' }, light: { borderColor: 'slate-200', bgColor: 'white' } }}
    >
      <Flex
        ai="baseline"
        jc="space-between"
        gap={4}
        flexWrap="wrap"
        px={5}
        py={4}
        bb={1}
        theme={{
          dark: { borderColor: 'slate-700', bgColor: 'slate-800' },
          light: { borderColor: 'slate-200', bgColor: 'slate-50' },
        }}
      >
        <Flex ai="baseline" gap={3}>
          <Box tag="h3" fontSize={16} fontWeight={600} theme={{ dark: { color: 'white' }, light: { color: 'slate-900' } }}>
            {entry.name}
          </Box>
          <SiteLink
            to={entry.route}
            fontSize={12}
            textDecoration="none"
            theme={{ dark: { color: 'indigo-400' }, light: { color: 'indigo-600' } }}
            hover={{ textDecoration: 'underline' }}
          >
            Docs →
          </SiteLink>
        </Flex>
        <Box fontSize={13} theme={{ dark: { color: 'slate-400' }, light: { color: 'slate-600' } }}>
          {entry.note}
        </Box>
      </Flex>

      <Grid gridTemplateColumns={1} md={{ gridTemplateColumns: 2 }}>
        <Half name={entry.name} theme="light" />
        <Half name={entry.name} theme="dark" />
      </Grid>
    </Box>
  );
}

/**
 * One theme's half of a card. The `<Box.Theme>` wrapper is the grid item and carries no styles of its
 * own, so the surface is the Box inside it, filling it.
 */
function Half({ name, theme }: { name: ShowcaseName; theme: 'light' | 'dark' }) {
  return (
    <Box.Theme use="local" theme={theme}>
      <Box
        height="fit"
        p={5}
        pt={8}
        position="relative"
        // The demos are the point of the page and nothing a markdown reader wants: a grid is four rows
        // of mock data as text. The heading, the note and the link above are what the mirror keeps.
        props={{ 'data-md': 'skip' }}
        bt={1}
        md={{ bt: 0, bl: theme === 'dark' ? 1 : 0 }}
        theme={{ dark: { bgColor: 'slate-900', borderColor: 'slate-700' }, light: { bgColor: 'white', borderColor: 'slate-200' } }}
      >
        <Box
          position="absolute"
          top={2}
          insetStart={5}
          fontSize={10}
          fontWeight={600}
          letterSpacing={1}
          textTransform="uppercase"
          theme={{ dark: { color: 'slate-500' }, light: { color: 'slate-400' } }}
        >
          {theme}
        </Box>
        {demos[name](theme)}
      </Box>
    </Box.Theme>
  );
}

/**
 * What each card draws. Keyed by the ledger's own names, so a component listed there with nothing to
 * render is a compile error rather than an empty card.
 *
 * The `scope` is the half's theme name, and it is there for one reason: two radio groups sharing a
 * `name` in one document are one radio group, so the light half and the dark half would otherwise
 * deselect each other. Everything else ignores it.
 */
const demos: Record<ShowcaseName, (scope: string) => ReactNode> = {
  Button: () => (
    <Flex gap={3} flexWrap="wrap">
      <Button>Save</Button>
      <Button variant="secondary">Cancel</Button>
      <Button variant="ghost">More</Button>
      <Button disabled>Disabled</Button>
    </Flex>
  ),

  Textbox: () => <Textbox placeholder="you@example.com" width="fit" props={{ 'aria-label': 'Email address' }} />,

  Textarea: () => <Textarea placeholder="What changed?" width="fit" fieldSizing="content" props={{ 'aria-label': 'What changed' }} />,

  Checkbox: () => (
    <Flex d="column" gap={3}>
      <Checkbox label="Accept the terms" defaultChecked />
      <Checkbox label="Send me the weekly digest" />
      <Checkbox label="Not available here" disabled />
    </Flex>
  ),

  RadioGroup: (scope) => (
    <RadioGroup label="Plan" name={`plan-${scope}`} defaultValue="pro">
      <RadioGroup.Item value="free" label="Free" />
      <RadioGroup.Item value="pro" label="Pro" />
      <RadioGroup.Item value="team" label="Team" />
    </RadioGroup>
  ),

  RadioButton: (scope) => (
    <Flex d="column" gap={3}>
      <RadioButton name={`region-${scope}`} value="eu" label="Europe" defaultChecked />
      <RadioButton name={`region-${scope}`} value="us" label="North America" />
    </Flex>
  ),

  Switch: (scope) => (
    <Flex d="column" gap={3}>
      <Switch name={`notify-${scope}`} label="Email notifications" defaultChecked />
      <Switch name={`digest-${scope}`} label="Weekly digest" />
      <Switch name={`beta-${scope}`} label="Beta features" disabled />
    </Flex>
  ),

  Slider: () => (
    <Flex d="column" gap={8}>
      <Slider label="Volume" defaultValue={40} />
      <Slider label="Price" defaultValue={[20, 80]} thumbLabels={['Lowest', 'Highest']} />
    </Flex>
  ),

  Popover: () => (
    <Popover label="Filters" trigger={(trigger) => <Button {...trigger}>Filters</Button>}>
      <Flex d="column" gap={3} minWidth={40}>
        <Checkbox label="Only mine" defaultChecked />
        <Checkbox label="Archived" />
      </Flex>
    </Popover>
  ),

  Dialog: () => (
    <Dialog trigger={(trigger) => <Button {...trigger}>Rename</Button>}>
      <Dialog.Title>Rename this view</Dialog.Title>
      <Dialog.Description>The name is only shown to you.</Dialog.Description>
      <Textbox name="name" defaultValue="Overview" props={{ 'aria-label': 'Name' }} />
    </Dialog>
  ),

  AlertDialog: () => (
    <AlertDialog trigger={(trigger) => <Button {...trigger}>Delete</Button>}>
      <AlertDialog.Title>Delete this view?</AlertDialog.Title>
      <AlertDialog.Description>It cannot be brought back.</AlertDialog.Description>
    </AlertDialog>
  ),

  Menu: () => (
    <Menu trigger={(trigger) => <Button {...trigger}>Actions</Button>}>
      <Menu.Item>Duplicate</Menu.Item>
      <Menu.Item disabled>Move</Menu.Item>
      <Menu.Separator />
      <Menu.Sub label="Share">
        <Menu.Item>Copy link</Menu.Item>
        <Menu.Item>Invite someone</Menu.Item>
      </Menu.Sub>
    </Menu>
  ),

  Tooltip: () => <Tooltip content="Deletes the row for good">{(trigger) => <Button {...trigger}>Delete</Button>}</Tooltip>,

  Dropdown: () => (
    <Dropdown label="Theme" defaultValue="system">
      <Dropdown.Item value="system">Follow the system</Dropdown.Item>
      <Dropdown.Item value="light">Always light</Dropdown.Item>
      <Dropdown.Item value="dark">Always dark</Dropdown.Item>
    </Dropdown>
  ),

  Combobox: () => <Combobox data={PEOPLE} def={{ label: 'name', key: 'id' }} label="Assignee" placeholder="Search people" />,

  Overlay: () => <OverlayDemo />,

  Tabs: () => (
    <Tabs defaultValue="overview">
      <Tabs.List label="Project">
        <Tabs.Tab value="overview">Overview</Tabs.Tab>
        <Tabs.Tab value="activity">Activity</Tabs.Tab>
        <Tabs.Tab value="settings">Settings</Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value="overview">Four open pull requests, two of them yours.</Tabs.Panel>
      <Tabs.Panel value="activity">Nothing since Tuesday.</Tabs.Panel>
      <Tabs.Panel value="settings">Who can see this project.</Tabs.Panel>
    </Tabs>
  ),

  Accordion: () => (
    <Accordion defaultValue={['shipping']}>
      <Accordion.Item value="shipping">
        <Accordion.Trigger>Shipping</Accordion.Trigger>
        <Accordion.Panel>Two to four working days, tracked.</Accordion.Panel>
      </Accordion.Item>
      <Accordion.Item value="returns">
        <Accordion.Trigger>Returns</Accordion.Trigger>
        <Accordion.Panel>Thirty days, in the packaging it arrived in.</Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  ),

  Collapsible: () => (
    <Collapsible trigger={(trigger) => <Button {...trigger}>What is in the box?</Button>}>
      <Box pt={3}>A kite, and the string for it.</Box>
    </Collapsible>
  ),

  Progress: () => (
    <Flex d="column" gap={6}>
      <Progress label="Upload" value={62} />
      <Progress label="Preparing" />
    </Flex>
  ),

  Toaster: () => (
    <Flex gap={3} flexWrap="wrap">
      <Button onClick={() => toast.success('Saved')}>Send a toast</Button>
      <Button variant="secondary" onClick={() => toast.error('That did not work')}>
        And an error
      </Button>
    </Flex>
  ),

  Skeleton: () => (
    <Flex gap={4} ai="flex-start">
      <Skeleton circle width={12} />
      <Skeleton lines={3} flex1 />
    </Flex>
  ),

  Presence: () => (
    <Presence present>
      {({ present, ref, props }) => (
        <Box
          ref={ref}
          props={props}
          p={4}
          borderRadius={2}
          opacity={present ? 1 : 0}
          startingStyle={{ opacity: 0 }}
          transitionDuration={200}
          theme={{ dark: { bgColor: 'slate-800' }, light: { bgColor: 'slate-100' } }}
        >
          Still here until its own transition says otherwise.
        </Box>
      )}
    </Presence>
  ),

  DataGrid: () => (
    <DataGrid
      data={ORDERS}
      def={{
        rowHeight: 36,
        visibleRowsCount: 4,
        columns: [
          { key: 'customer', header: 'Customer', width: 130 },
          { key: 'status', header: 'Status', width: 100 },
          { key: 'total', header: 'Total', width: 80, align: 'end' },
        ],
      }}
    />
  ),

  DashboardGrid: () => (
    <DashboardGrid layout={DASHBOARD} vars={{ 'dashboard-row': '4rem' }}>
      <Widget id="revenue" title="Revenue" level={4}>
        <Sparkline data={REVENUE} variant="area" width="100%" height="100%" color="sky-500" />
      </Widget>
      <Widget id="orders" title="Orders" level={4}>
        <Sparkline data={ORDER_COUNTS} width="100%" height="100%" color="emerald-500" />
      </Widget>
    </DashboardGrid>
  ),

  Widget: () => (
    <Flex d="column" gap={4}>
      <Widget title="Revenue" description="Last 12 weeks" level={4}>
        <Sparkline data={REVENUE} variant="area" width="100%" height="3rem" color="violet-500" />
      </Widget>
      <Widget title="Orders" loading level={4} />
      <Widget title="Refunds" empty level={4} />
    </Flex>
  ),

  Sparkline: () => (
    <Flex gap={4} ai="center" flexWrap="wrap">
      <Sparkline data={REVENUE} width="6rem" color="sky-500" />
      <Sparkline data={REVENUE} width="6rem" variant="area" color="violet-500" />
      <Sparkline data={REVENUE} width="6rem" variant="bar" color="emerald-500" />
    </Flex>
  ),

  ProgressRing: () => (
    <Flex gap={4} ai="center" flexWrap="wrap">
      <ProgressRing value={0.25} color="sky-500" />
      <ProgressRing value={0.62} color="emerald-500" thickness={16} />
      <ProgressRing value={0.9} color="amber-500" thickness={6} />
    </Flex>
  ),

  Gauge: () => (
    <Flex gap={4} ai="center" flexWrap="wrap">
      <Gauge value={0.4} color="sky-500" />
      <Gauge value={0.75} color="rose-500" sweep={180} start={270} />
    </Flex>
  ),

  MiniDonut: () => (
    <Flex gap={4} ai="center" flexWrap="wrap">
      <MiniDonut data={[5, 3, 2]} />
      <MiniDonut data={[6, 4]} colors={['violet-500', 'violet-200']} thickness={30} />
    </Flex>
  ),

  // The bars name no colour of their own — only the variables the container declares, which is the
  // whole point of it. A third-party chart reads the same two through its own stroke/fill attributes.
  ChartContainer: () => (
    <ChartContainer series={['revenue', 'cost']}>
      <Svg viewBox="0 0 100 40" width="100%" height="3rem" preserveAspectRatio="none" label="Revenue against cost">
        {REVENUE.map((value, index) => (
          <G key={index}>
            <Rect x={index * 8 + 1} y={40 - value * 0.8} width={3} height={value * 0.8} fill="var(--color-revenue)" />
            <Rect
              x={index * 8 + 4.5}
              y={40 - ORDER_COUNTS[index] * 0.8}
              width={3}
              height={ORDER_COUNTS[index] * 0.8}
              fill="var(--color-cost)"
            />
          </G>
        ))}
      </Svg>
    </ChartContainer>
  ),

  ToolCallCard: () => (
    <Flex d="column" gap={3}>
      <ToolCallCard name="searchOrders" status="running" input={{ query: 'refunds', limit: 20 }} />
      <ToolCallCard name="searchOrders" status="success" input={{ orderId: 4182 }} output={{ total: 6400 }} />
    </Flex>
  ),

  ApprovalCard: () => (
    <ApprovalCard
      title="Refund order 4182"
      description="6,400 MDL back to the customer. This cannot be undone."
      input={{ orderId: 4182, amount: 6400 }}
    />
  ),

  Reasoning: () => <Reasoning duration={4200}>{THOUGHT}</Reasoning>,

  StreamingText: () => <StreamingText text="Four orders were refunded this week, all of them from the same batch." />,

  Flex: () => (
    <Flex
      gap={3}
      jc="space-between"
      ai="center"
      p={3}
      borderRadius={2}
      theme={{ dark: { bgColor: 'slate-800' }, light: { bgColor: 'slate-100' } }}
    >
      <Box>jc="space-between"</Box>
      <Box>ai="center"</Box>
    </Flex>
  ),

  Grid: () => (
    <Grid gridTemplateColumns={3} gap={3}>
      {[1, 2, 3, 4, 5, 6].map((cell) => (
        <Box
          key={cell}
          p={3}
          borderRadius={2}
          textAlign="center"
          theme={{ dark: { bgColor: 'slate-800' }, light: { bgColor: 'slate-100' } }}
        >
          {cell}
        </Box>
      ))}
    </Grid>
  ),

  Icon: () => (
    <Flex gap={4} ai="center">
      <Icon size={6} color="amber-500">
        <Sun />
      </Icon>
      <Icon size={6} color="rose-500">
        <Star />
      </Icon>
      <Icon size={6} color="sky-500">
        <Compass />
      </Icon>
      <Icon size={6}>
        <Search />
      </Icon>
    </Flex>
  ),
};

/**
 * Anchored to a real element rather than to the spot it was declared in, which is a box with no size.
 * It is also the one demo held back until after hydration: an `Overlay` reads whether the browser has a
 * top layer *during render*, so with no DOM it takes the portal branch and renders nothing — an open one
 * in prerendered HTML is a guaranteed React #418 (bug #197). Every layer the library ships mounts its
 * `Overlay` when it opens, which is why none of them has ever met this.
 */
function OverlayDemo() {
  const anchor = useRef<HTMLButtonElement>(null);
  const hydrated = useHydrated();

  return (
    <Box height={28}>
      <Button ref={anchor} variant="secondary">
        Anchor
      </Button>
      {hydrated && (
        <Overlay anchor={anchor} side="bottom" align="start" offset={2} matchWidth={false} flip={false}>
          <Box
            p={3}
            borderRadius={2}
            b={1}
            fontSize={13}
            shadow="large"
            theme={{ dark: { bgColor: 'slate-800', borderColor: 'slate-700' }, light: { bgColor: 'white', borderColor: 'slate-200' } }}
          >
            In the top layer, beside its anchor.
          </Box>
        </Overlay>
      )}
    </Box>
  );
}

const PEOPLE = [
  { id: 1, name: 'Ada Lovelace' },
  { id: 2, name: 'Grace Hopper' },
  { id: 3, name: 'Alan Turing' },
  { id: 4, name: 'Katherine Johnson' },
];

const ORDERS = [
  { id: 1001, customer: 'Alice Johnson', status: 'Shipped', total: '259.97' },
  { id: 1002, customer: 'Bob Smith', status: 'Processing', total: '89.98' },
  { id: 1003, customer: 'Carmen Diaz', status: 'Shipped', total: '412.50' },
  { id: 1004, customer: 'Dmitri Petrov', status: 'Cancelled', total: '19.99' },
];

const REVENUE = [12, 19, 14, 22, 28, 24, 31, 35, 30, 38, 42, 47];
const ORDER_COUNTS = [4, 9, 7, 12, 10, 16, 14, 19, 17, 24, 21, 27];

const DASHBOARD: DashboardLayout = {
  version: 1,
  columns: 12,
  items: [
    { id: 'revenue', x: 0, y: 0, w: 7, h: 1 },
    { id: 'orders', x: 7, y: 0, w: 5, h: 1 },
  ],
};

const THOUGHT = 'The refunds all came from one batch, so the customer is asking about a shipment rather than a payment.';
