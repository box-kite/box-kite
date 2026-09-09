import { ArrowRight, Languages, Search } from 'lucide-react';
import { ReactNode, useState } from 'react';
import Box from '../../src/box';
import Button from '../../src/components/button';
import Checkbox from '../../src/components/checkbox';
import DataGrid from '../../src/components/dataGrid';
import Dropdown from '../../src/components/dropdown';
import Flex from '../../src/components/flex';
import Icon from '../../src/components/icon';
import RadioGroup from '../../src/components/radioGroup';
import { H2 } from '../../src/components/semantics';
import Switch from '../../src/components/switch';
import Textbox from '../../src/components/textbox';
import Tooltip from '../../src/components/tooltip';
import Code from '../components/code';
import Mono from '../components/mono';
import PageHeader from '../components/pageHeader';
import Reveal from '../components/reveal';
import useTableOfContents from '../hooks/useTableOfContents';

type Direction = 'ltr' | 'rtl';

const invoices = [
  { id: 'INV-1041', customer: 'Acme Corp', country: 'Egypt', status: 'Paid', items: 12, total: 2480.5 },
  { id: 'INV-1042', customer: 'Globex', country: 'Morocco', status: 'Open', items: 3, total: 145.0 },
  { id: 'INV-1043', customer: 'Initech', country: 'Israel', status: 'Paid', items: 7, total: 918.75 },
  { id: 'INV-1044', customer: 'Umbrella', country: 'Jordan', status: 'Overdue', items: 21, total: 5310.2 },
  { id: 'INV-1045', customer: 'Soylent', country: 'Iran', status: 'Open', items: 1, total: 39.99 },
  { id: 'INV-1046', customer: 'Vehement', country: 'Pakistan', status: 'Paid', items: 9, total: 1204.0 },
];

export default function RtlPage() {
  useTableOfContents(sidebarLinks);
  const [dir, setDir] = useState<Direction>('rtl');

  return (
    <Box>
      <PageHeader
        icon={Languages}
        title="Right to Left"
        description="One dir attribute and the whole page mirrors: the sides are logical, the arrow keys follow the reading order, and the components come with it. No second stylesheet, and nothing re-renders."
        badge="NEW"
      />

      <Reveal delay={0.1}>
        <Flex d="column" gap={10}>
          <Section id="switch" title="The direction is one attribute, and the browser does the rest">
            <Mono>dir</Mono> is an attribute, so it goes in <Mono>props</Mono> — on the <Mono>&lt;html&gt;</Mono> element for a whole
            locale, or on any subtree for one panel of it. Everything below is inside a single wrapper carrying it, and the switch on this
            page changes nothing else: no state reaches a style, no class is rebuilt, no component is told. The logical props —{' '}
            <Mono>ps</Mono>/<Mono>pe</Mono>, <Mono>ms</Mono>/<Mono>me</Mono>, <Mono>bs</Mono>/<Mono>be</Mono>, <Mono>insetStart</Mono>/
            <Mono>insetEnd</Mono>, <Mono>borderRadiusStart</Mono>/<Mono>borderRadiusEnd</Mono> — are resolved by the browser from that one
            attribute, which is why a translation costs no CSS.
          </Section>

          <Flex gap={2} ai="center">
            {(['ltr', 'rtl'] as const).map((next) => (
              <Button key={next} variant={dir === next ? 'primary' : 'secondary'} onClick={() => setDir(next)}>
                dir=&quot;{next}&quot;
              </Button>
            ))}
            <Box fontSize={13} ps={2} theme={{ dark: { color: 'slate-500' }, light: { color: 'slate-500' } }}>
              every demo on this page is inside it
            </Box>
          </Flex>

          <Code
            id="switch-demo"
            label="A card that reads both ways"
            language="jsx"
            context="declare const dir: 'ltr' | 'rtl';"
            code={`import { ArrowRight } from 'lucide-react';

<Flex props={{ dir }} ai="center" gap={3} ps={4} pe={3} py={3} bs={4} borderStyle="solid" borderColor="indigo-500" borderRadiusEnd={2}>
  <Box flex1 fontSize={14}>
    Your order is on its way
  </Box>
  {/* The one thing a logical property cannot say: which way the arrow points. */}
  <Box color="indigo-500" rtl={{ flip: 'xAxis' }}>
    <Icon size={5}>
      <ArrowRight />
    </Icon>
  </Box>
</Flex>`}
          >
            <Flex
              props={{ dir }}
              ai="center"
              gap={3}
              ps={4}
              pe={3}
              py={3}
              bs={4}
              borderStyle="solid"
              borderColor="indigo-500"
              borderRadiusEnd={2}
              theme={{ dark: { bgColor: 'slate-800' }, light: { bgColor: 'slate-100' } }}
            >
              <Box flex1 fontSize={14}>
                Your order is on its way — مرحبا
              </Box>
              <Box color="indigo-500" rtl={{ flip: 'xAxis' }}>
                <Icon size={5}>
                  <ArrowRight />
                </Icon>
              </Box>
            </Flex>
          </Code>

          <Section id="forms" title="The form controls mirror, including the parts the page does not draw">
            A field's icon, the room made for it, the gap between a checkbox and its label: all of it is declared on the inline axis, so all
            of it swaps. The interesting one is the switch. Its thumb is a <Mono>::before</Mono> that <em>travels</em>, and travel is a{' '}
            <Mono>translateX</Mono> — the one thing no logical property can express. So the built-in style says the distance once and{' '}
            <Mono>rtl</Mono> says it again with the other sign, which is what the two direction keys are for.
          </Section>

          <Code
            id="forms-demo"
            label="Fields, boxes and switches"
            language="jsx"
            context="declare const dir: 'ltr' | 'rtl';"
            code={`import { Search } from 'lucide-react';

<Flex props={{ dir }} d="column" gap={4}>
  <Box position="relative" width={70}>
    {/* Both the icon and the room made for it are on the inline axis, so both swap. */}
    <Flex position="absolute" insetStart={3} top="1/2" translateY="-1/2" color="slate-400" pointerEvents="none">
      <Icon size={4}>
        <Search />
      </Icon>
    </Flex>
    <Textbox placeholder="Search invoices" ps={10} width="fit" />
  </Box>
  <Checkbox label="Email me a copy" defaultChecked />
  <Switch label="Send reminders" defaultChecked />
  <RadioGroup label="Currency" defaultValue="usd" orientation="horizontal">
    <RadioGroup.Item value="usd" label="USD" />
    <RadioGroup.Item value="egp" label="EGP" />
    <RadioGroup.Item value="ils" label="ILS" />
  </RadioGroup>
</Flex>`}
          >
            <Flex props={{ dir }} d="column" gap={4} width="fit">
              <Box position="relative" width={70}>
                <Flex position="absolute" insetStart={3} top="1/2" translateY="-1/2" color="slate-400" pointerEvents="none">
                  <Icon size={4}>
                    <Search />
                  </Icon>
                </Flex>
                <Textbox placeholder="Search invoices" ps={10} width="fit" />
              </Box>
              <Checkbox label="Email me a copy" defaultChecked />
              <Switch label="Send reminders" defaultChecked />
              <RadioGroup label="Currency" defaultValue="usd" orientation="horizontal">
                <RadioGroup.Item value="usd" label="USD" />
                <RadioGroup.Item value="egp" label="EGP" />
                <RadioGroup.Item value="ils" label="ILS" />
              </RadioGroup>
            </Flex>
          </Code>

          <Section id="keyboard" title="The arrow keys follow the reading order, not the screen">
            This is the half no prop can fix. APG says the arrows move in the reading order, so in a right-to-left list{' '}
            <Mono>ArrowLeft</Mono> goes to the <em>next</em> item and <Mono>ArrowRight</Mono> goes back. Nothing in the markup says which:{' '}
            <Mono>useRovingFocus</Mono> asks the element for its <em>resolved</em> direction the moment a sideways arrow arrives, so a{' '}
            <Mono>dir</Mono> anywhere above it is enough and a vertical list pays nothing. The radio group above and the grid below both go
            through it. Tab, Home and End never flip — Home is the first item in the reading order either way.
          </Section>

          <Code
            id="keyboard-demo"
            label="Arrow through it in both directions"
            language="jsx"
            codeOnly
            check={false}
            code={`// Inside useRovingFocus: the direction is a state of the element, so it is read, not configured.
const forward = (event.key === 'ArrowRight') !== isRtl(event.currentTarget);

move(step(activeIndex, forward ? 1 : -1, count, loop, isDisabled), 'keyboard');`}
          />

          <Section id="popups" title="A popup keeps the direction it was declared in">
            <Mono>Overlay</Mono> stays in the subtree it was declared in — it is in the browser's top layer rather than a portal, and a
            top-layer element inherits normally — so <Mono>Tooltip</Mono>, the <Mono>Dropdown</Mono> popup and the grid's column menu simply
            inherit the direction around them. Only on the no-Popover-API fallback does the layer leave that subtree for a container hanging
            off the body, where nothing of the declaration site is inherited and a tooltip on an Arabic paragraph would come out reading
            left to right; there it measures the direction off its anchor and writes it back on as <Mono>dir</Mono>.
          </Section>

          <Code
            id="popups-demo"
            label="A tooltip and a dropdown, mirrored"
            language="jsx"
            context="declare const dir: 'ltr' | 'rtl';"
            code={`<Flex props={{ dir }} gap={4} ai="center">
  <Dropdown label="Country" defaultValue="eg">
    <Dropdown.Item value="eg">Egypt</Dropdown.Item>
    <Dropdown.Item value="ma">Morocco</Dropdown.Item>
    <Dropdown.Item value="jo">Jordan</Dropdown.Item>
  </Dropdown>
  <Tooltip content="Sends the invoice and marks it open">
    {(trigger) => <Button {...trigger}>Send</Button>}
  </Tooltip>
</Flex>`}
          >
            <Flex props={{ dir }} gap={4} ai="center">
              <Dropdown label="Country" defaultValue="eg" width={50}>
                <Dropdown.Item value="eg">Egypt</Dropdown.Item>
                <Dropdown.Item value="ma">Morocco</Dropdown.Item>
                <Dropdown.Item value="jo">Jordan</Dropdown.Item>
              </Dropdown>
              <Tooltip content="Sends the invoice and marks it open">{(trigger) => <Button {...trigger}>Send</Button>}</Tooltip>
            </Flex>
          </Code>

          <Section id="grid" title="A pinned column belongs to the reading order too">
            A column is pinned to the <Mono>START</Mono> or the <Mono>END</Mono> of the inline axis, not to the left or the right of the
            screen — so the invoice number below stays where the reading begins under either direction, and the total stays where it ends.{' '}
            <Mono>LEFT</Mono> and <Mono>RIGHT</Mono> are the older spelling and still mean those two. Three more things follow the reading
            order with it: <Mono>align: 'end'</Mono> on a numeric column, the resize handle (drag it — it grows the column towards the
            reading end in both directions), and the column menu, whose <em>Pin&nbsp;Left</em> says <em>Pin&nbsp;Right</em> when that is the
            side it would pin to. Scroll it sideways: the pinned columns hold their edges.
          </Section>

          <Code
            id="grid-demo"
            defer
            label="A grid with both edges pinned"
            language="jsx"
            context="declare const dir: 'ltr' | 'rtl';
declare const invoices: { id: string; customer: string; country: string; status: string; items: number; total: number }[];"
            code={`<Box props={{ dir }}>
  <DataGrid
    data={invoices}
    def={{
      columns: [
        { key: 'id', header: 'Invoice', pin: 'START', width: 120 },
        { key: 'customer', header: 'Customer', width: 200 },
        { key: 'country', header: 'Country', width: 160 },
        { key: 'status', header: 'Status', width: 140 },
        { key: 'items', header: 'Items', width: 120, align: 'end' },
        { key: 'total', header: 'Total', pin: 'END', width: 130, align: 'end' },
      ],
      rowHeight: 40,
      visibleRowsCount: 6,
      sortable: true,
      resizable: true,
    }}
  />
</Box>`}
          >
            <Box props={{ dir }} width="fit">
              <DataGrid
                data={invoices}
                def={{
                  columns: [
                    { key: 'id', header: 'Invoice', pin: 'START', width: 120 },
                    { key: 'customer', header: 'Customer', width: 200 },
                    { key: 'country', header: 'Country', width: 160 },
                    { key: 'status', header: 'Status', width: 140 },
                    { key: 'items', header: 'Items', width: 120, align: 'end' },
                    { key: 'total', header: 'Total', pin: 'END', width: 130, align: 'end' },
                  ],
                  rowHeight: 40,
                  visibleRowsCount: 6,
                  sortable: true,
                  resizable: true,
                }}
              />
            </Box>
          </Code>

          <Section id="physical" title="What stays physical, and why">
            Three things are deliberately not mirrored, because the reading order is not what they are about. <Mono>Overlay</Mono> positions
            its layer with a transform in <em>page</em> coordinates measured off the anchor, so its box is anchored at the page's own origin
            in both directions — a measured pixel has no reading order. The grid's loading bar sweeps the same way either way, because a
            sweep is not a sentence. And <Mono>left</Mono>, <Mono>right</Mono>, <Mono>pl</Mono>, <Mono>mr</Mono> and the rest of the
            physical props are still there and still physical: when you mean the screen side — a shadow the light casts, a decoration in a
            corner — say so.
          </Section>

          <Section id="checklist" title="Making your own components mirror">
            <Flex tag="ul" d="column" gap={2} mt={2}>
              <Bullet>
                Reach for <Mono>ps</Mono>/<Mono>pe</Mono>, <Mono>ms</Mono>/<Mono>me</Mono>, <Mono>bs</Mono>/<Mono>be</Mono>,{' '}
                <Mono>insetStart</Mono>/<Mono>insetEnd</Mono> and <Mono>borderRadiusStart</Mono>/<Mono>borderRadiusEnd</Mono> by default;
                the axis shorthands <Mono>px</Mono>, <Mono>mx</Mono> and <Mono>insetX</Mono> have always been logical.
              </Bullet>
              <Bullet>
                <Mono>textAlign="start"</Mono> rather than <Mono>"left"</Mono>, and <Mono>jc="start"</Mono>/<Mono>"end"</Mono> rather than{' '}
                <Mono>"left"</Mono>/<Mono>"right"</Mono>.
              </Bullet>
              <Bullet>
                For what is left — a rotation, a translation, a gradient direction — nest it under <Mono>rtl</Mono>. Remember{' '}
                <Mono>ltr</Mono> matches a document with no <Mono>dir</Mono> at all, since left to right is the initial value.
              </Bullet>
              <Bullet>
                Read a direction, never store one: <Mono>getComputedStyle(el).direction</Mono> is the only answer that accounts for a{' '}
                <Mono>dir="auto"</Mono> or a <Mono>&lt;bdi&gt;</Mono> above you.
              </Bullet>
            </Flex>
          </Section>
        </Flex>
      </Reveal>
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

function Bullet({ children }: { children: ReactNode }) {
  return (
    <Flex tag="li" gap={3} ai="baseline">
      <Box width={1} height={1} borderRadius={10} bgColor="indigo-400" />
      <Box flex1>{children}</Box>
    </Flex>
  );
}

const sidebarLinks = [
  { id: 'switch', label: 'One attribute' },
  { id: 'forms', label: 'Form controls' },
  { id: 'keyboard', label: 'The arrow keys' },
  { id: 'popups', label: 'Popups' },
  { id: 'grid', label: 'The DataGrid' },
  { id: 'physical', label: 'What stays physical' },
  { id: 'checklist', label: 'Your own components' },
];
