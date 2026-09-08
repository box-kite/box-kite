import { ChartSpline } from 'lucide-react';
import { lazy, ReactNode, Suspense, useMemo, useState } from 'react';
import chartContainerApi from '../../api/components/chartcontainer.json';
import gaugeApi from '../../api/components/gauge.json';
import miniDonutApi from '../../api/components/minidonut.json';
import progressRingApi from '../../api/components/progressring.json';
import sparklineApi from '../../api/components/sparkline.json';
import Box from '../../src/box';
import Button from '../../src/components/button';
import { Gauge, MiniDonut, ProgressRing, Sparkline } from '../../src/components/chart';
import DataGrid from '../../src/components/dataGrid';
import CellModel from '../../src/components/dataGrid/models/cellModel';
import Flex from '../../src/components/flex';
import { H2 } from '../../src/components/semantics';
import { Defs, LinearGradient, Stop, SvgText } from '../../src/components/svg';
import ApiReference from '../components/apiReference';
import Code from '../components/code';
import Mono from '../components/mono';
import PageHeader from '../components/pageHeader';
import Reveal from '../components/reveal';
import useTableOfContents from '../hooks/useTableOfContents';
import { apiSections } from '../site/componentApi';

// Recharts and its d3 packages are ~95 KB gzipped: the one demo that needs them is a chunk of its
// own, so only a reader who opens this page downloads them.
const RechartsDemo = lazy(() => import('../components/rechartsDemo'));

/** A deterministic wander, so the demo grid looks like data without shipping any. */
function series(seed: number, length = 12): number[] {
  const out: number[] = [];
  let value = 40 + (seed % 30);

  for (let index = 0; index < length; index++) {
    value = Math.max(4, value + (((seed * (index + 3)) % 17) - 8));
    out.push(value);
  }

  return out;
}

interface Row {
  id: number;
  name: string;
  revenue: number;
  trend: number[];
  share: number;
}

// Defined once, not inside the render: a cell renderer is a component, and a new one every render
// remounts every cell in the column.
function TrendCell({ cell }: { cell: CellModel<Row> }) {
  const up = cell.row.data.trend.at(-1)! >= cell.row.data.trend[0];

  return (
    <Flex px={3} ai="center" height="fit">
      <Sparkline
        data={cell.row.data.trend}
        color={up ? 'emerald-500' : 'rose-500'}
        theme={{ dark: { color: up ? 'emerald-400' : 'rose-400' } }}
      />
    </Flex>
  );
}

function ShareCell({ cell }: { cell: CellModel<Row> }) {
  return (
    <Flex px={3} ai="center" gap={2} height="fit">
      <ProgressRing
        value={cell.row.data.share}
        width="1.25rem"
        height="1.25rem"
        thickness={18}
        color="sky-500"
        theme={{ dark: { color: 'sky-400' } }}
      />
      <Box fontSize={13}>{Math.round(cell.row.data.share * 100)}%</Box>
    </Flex>
  );
}

export default function ChartsPage() {
  useTableOfContents(sidebarLinks);
  const [value, setValue] = useState(0.35);

  const rows = useMemo<Row[]>(
    () =>
      Array.from({ length: 10_000 }, (_, index) => ({
        id: index + 1,
        name: `Account ${index + 1}`,
        revenue: 1000 + ((index * 7919) % 90000),
        trend: series(index + 1),
        share: ((index * 37) % 100) / 100,
      })),
    [],
  );

  return (
    <Box>
      <PageHeader
        icon={ChartSpline}
        title="Charts"
        description="Four micro-primitives — sparkline, progress ring, gauge and mini donut — built from the SVG components, styled with the props everything else here takes, and cheap enough to put one in every row of a ten-thousand-row grid."
      />

      <Reveal delay={0.1}>
        <Flex d="column" gap={10}>
          <Section id="what" title="Not a chart library">
            These are the small, dense drawings a dashboard is made of, and nothing more: no axes, no legends, no data transformations. What
            they give you instead is that a chart is <Mono>a Box</Mono> — its colour, its size, its dark mode, its hover state and its
            breakpoints are the props you already know, and there is no second styling system to learn or to theme. For a real chart with
            axes and a tooltip, reach for Recharts and wrap it in a <Mono>ChartContainer</Mono>, which is further down this page; these are
            for the twenty places a dashboard needs a shape rather than a chart.
          </Section>

          <Code id="sparkline" label="Sparkline" language="jsx">
            <Flex gap={8} ai="center" flexWrap="wrap">
              <Sparkline data={[4, 9, 6, 12, 10, 15, 13, 18]} width="7rem" color="sky-500" />
              <Sparkline data={[4, 9, 6, 12, 10, 15, 13, 18]} width="7rem" variant="area" color="violet-500" />
              <Sparkline data={[4, 9, 6, 12, 10, 15, 13, 18]} width="7rem" variant="bar" color="emerald-500" />
            </Flex>
          </Code>

          <Section id="sparkline-notes" title="A sparkline fills its box">
            A sparkline is the one primitive that is not drawn to scale: it is <Mono>100%</Mono> wide and stretches to whatever you give it,
            which is what makes it usable in a table cell of unknown width. The line stays one width thick anyway, because{' '}
            <Mono>vectorEffect="non-scaling-stroke"</Mono> is on by default — the property SVG has for exactly this, and an ordinary prop,
            so <Mono>vectorEffect="none"</Mono> turns it off. Everything else is inherited from the <Mono>&lt;svg&gt;</Mono>:{' '}
            <Mono>color</Mono> paints it (the default stroke is <Mono>currentColor</Mono>), <Mono>strokeWidth</Mono> thickens it, and both
            take a <Mono>hover</Mono>, a <Mono>theme</Mono> and a breakpoint.
          </Section>

          <Code
            id="domain"
            label="One scale for many rows"
            language="jsx"
            code={`// Each sparkline scales to its own data by default — good alone, misleading in a column.
<Sparkline data={[4, 9, 6, 12]} />

// min and max fix the axis, so two rows can be compared at a glance.
<Sparkline data={[4, 9, 6, 12]} min={0} max={20} />
<Sparkline data={[2, 3, 2, 4]} min={0} max={20} />`}
          >
            <Flex d="column" gap={4}>
              <Flex gap={4} ai="center">
                <Box fontSize={13} width={28}>
                  Scaled to itself
                </Box>
                <Sparkline data={[4, 9, 6, 12]} width="6rem" color="sky-500" />
                <Sparkline data={[2, 3, 2, 4]} width="6rem" color="sky-500" />
              </Flex>
              <Flex gap={4} ai="center">
                <Box fontSize={13} width={28}>
                  Shared scale
                </Box>
                <Sparkline data={[4, 9, 6, 12]} min={0} max={20} width="6rem" color="emerald-500" />
                <Sparkline data={[2, 3, 2, 4]} min={0} max={20} width="6rem" color="emerald-500" />
              </Flex>
            </Flex>
          </Code>

          <Code id="gradient" label="A gradient is a value now" language="jsx">
            <Sparkline
              data={[4, 9, 6, 12, 10, 15, 13, 18]}
              variant="area"
              width="16rem"
              height="4rem"
              stroke="url(#trend)"
              fill="url(#trend)"
            >
              <Defs>
                <LinearGradient id="trend" x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0%" stopColor="currentColor" color="sky-500" />
                  <Stop offset="100%" stopColor="currentColor" color="violet-500" />
                </LinearGradient>
              </Defs>
            </Sparkline>
          </Code>

          <Section id="gradient-notes" title="…which it was not before">
            <Mono>fill</Mono> and <Mono>stroke</Mono> used to take a colour token and nothing else, so a gradient had to be written as an
            attribute — <Mono>props={`{{ fill: 'url(#sky)' }}`}</Mono> — which put the paint outside the theme system and outside every
            pseudo-class. Both props now also accept a reference to something the document defines (<Mono>url(#trend)</Mono>) or a variable
            somebody else declared (<Mono>var(--chart-1)</Mono>), so a gradient fill can change on <Mono>hover</Mono> and per theme like any
            other value. <Mono>clipPath</Mono> takes a <Mono>url(#…)</Mono> the same way. A typo still produces nothing at all rather than a
            broken declaration: the definition names the two shapes it accepts.
          </Section>

          <Code id="ring" label="Progress ring" language="jsx">
            <Flex gap={8} ai="center" flexWrap="wrap">
              <ProgressRing value={0.25} color="sky-500" />
              <ProgressRing value={0.62} color="emerald-500" thickness={16} />
              <ProgressRing value={0.9} color="amber-500" thickness={6}>
                <SvgText x={50} y={57} textAnchor="middle" fontSize={26} fill="amber-500" stroke="none">
                  90
                </SvgText>
              </ProgressRing>
            </Flex>
          </Code>

          <Code
            id="transition"
            label="The arc eases with no animation code"
            language="jsx"
            code={`const [value, setValue] = useState(0.35);

<Flex gap={6} ai="center">
  <ProgressRing value={value} color="violet-500" width="5rem" height="5rem" label="Progress" />
  <Button onClick={() => setValue(0.75)}>75%</Button>
</Flex>`}
          >
            <Flex gap={6} ai="center" flexWrap="wrap">
              <ProgressRing value={value} color="violet-500" width="5rem" height="5rem" label={`${Math.round(value * 100)}% complete`} />
              <Flex gap={2}>
                {[0.1, 0.35, 0.6, 1].map((next) => (
                  <Button key={next} onClick={() => setValue(next)} variant={value === next ? 'primary' : 'secondary'}>
                    {Math.round(next * 100)}%
                  </Button>
                ))}
              </Flex>
            </Flex>
          </Code>

          <Section id="transition-notes" title="Why that moves">
            The filled part of a ring is a dash on its outline, and a dash length is an ordinary style prop — so it lands in a CSS class,
            and every shape inside an <Mono>&lt;svg&gt;</Mono> already transitions. Setting a number is all the JavaScript there is; the
            easing is the stylesheet, and it stops on its own for a visitor who asked for <Mono>prefers-reduced-motion</Mono>.
          </Section>

          <Code id="gauge" label="Gauge" language="jsx">
            <Flex gap={8} ai="center" flexWrap="wrap">
              <Gauge value={0.4} color="sky-500" />
              <Gauge value={0.75} color="rose-500" sweep={180} start={270}>
                <SvgText x={50} y={48} textAnchor="middle" fontSize={22} fill="rose-500" stroke="none">
                  75%
                </SvgText>
              </Gauge>
              <Gauge value={0.55} color="emerald-500" sweep={360} thickness={6} />
            </Flex>
          </Code>

          <Section id="gauge-notes" title="A dial is an arc you choose">
            <Mono>sweep</Mono> is how far round it goes and <Mono>start</Mono> is where it begins, in degrees clockwise from twelve o'clock
            — three quarters of a turn from the bottom left by default, a half turn for a speedometer, a whole turn for a ring. Both are
            constants of the shape rather than of the data, so every gauge of the same shape shares one path string.
          </Section>

          <Code id="donut" label="Mini donut" language="jsx">
            <Flex gap={8} ai="center" flexWrap="wrap">
              <MiniDonut data={[5, 3, 2]} />
              <MiniDonut data={[8, 5, 3, 2, 1]} thickness={12} width="4rem" height="4rem" />
              <MiniDonut data={[6, 4]} colors={['violet-500', 'violet-200']} thickness={30} />
            </Flex>
          </Code>

          <Section id="donut-notes" title="Colours, and where they come from">
            A donut is the one primitive that needs more than one colour, so it takes a list and cycles it. Each entry is anything the{' '}
            <Mono>fill</Mono> prop accepts — a token like <Mono>sky-500</Mono>, or <Mono>var(--chart-1)</Mono> if your design system
            publishes a chart palette. The values need no total: each is drawn as its share of the whole.
          </Section>

          <Code
            id="grid"
            label="Ten thousand rows, one sparkline each"
            language="jsx"
            context={`interface Row { id: number; name: string; revenue: number; trend: number[]; share: number }
declare const rows: Row[];`}
            code={`// A cell renderer is a component: define it outside the render, or every scroll remounts the column.
function TrendCell({ cell }: { cell: { row: { data: Row } } }) {
  return (
    <Flex px={3} ai="center" height="fit">
      <Sparkline data={cell.row.data.trend} color="emerald-500" />
    </Flex>
  );
}

<DataGrid
  data={rows}
  def={{
    rowKey: 'id',
    rowHeight: 36,
    columns: [
      { key: 'name', header: 'Account' },
      { key: 'revenue', header: 'Revenue', align: 'right' },
      { key: 'trend', header: 'Last 12 months', width: 180, Cell: TrendCell },
    ],
  }}
/>`}
          >
            <Box height={104}>
              <DataGrid
                data={rows}
                def={{
                  rowKey: 'id',
                  rowHeight: 36,
                  visibleRowsCount: 10,
                  title: 'Accounts',
                  sortable: true,
                  columns: [
                    { key: 'name', header: 'Account', width: 140 },
                    { key: 'revenue', header: 'Revenue', width: 110, align: 'right' },
                    { key: 'trend', header: 'Last 12 months', width: 180, Cell: TrendCell },
                    { key: 'share', header: 'Share of target', width: 150, Cell: ShareCell },
                  ],
                }}
              />
            </Box>
          </Code>

          <Section id="cost" title="Why ten thousand rows is affordable">
            Two different answers, and the split is the whole trick. A sparkline's <em>shape</em> is the <Mono>d</Mono> attribute, which the
            styling engine never sees — ten thousand different shapes generate no CSS at all, and what <em>is</em> a style prop (the colour,
            the width) is shared, so the rows share one rule each. A ring's fill, on the other hand, has to be a style prop to be able to
            transition, so it lands in a class name — and the fraction is rounded to half a percent, which caps a column of percentages at a
            couple of hundred rules instead of one per row. Half a percent of a 48px ring is a third of a pixel.
          </Section>

          <Section id="vars" title="A CSS variable is a Box prop">
            Every prop on this page becomes a CSS declaration inside a class. <Mono>vars</Mono> is the one whose <em>names</em> come out of
            the value: <Mono>{`vars={{ 'color-revenue': 'sky-500' }}`}</Mono> declares <Mono>--color-revenue</Mono> on the element, and
            everything inside it inherits it — including markup this library never rendered. Because it is an ordinary prop it nests inside{' '}
            <Mono>theme</Mono>, <Mono>hover</Mono> and a breakpoint like all the others, and it lands in a class, so two subtrees declaring
            the same palette share one rule rather than each carrying a <Mono>&lt;style&gt;</Mono> tag of its own.
          </Section>

          <Code
            id="recharts"
            label="A Recharts chart, themed by the page it sits on"
            language="jsx"
            code={`import { ChartContainer } from '@box-kite/react/components/chart';\nimport { Area, AreaChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from 'recharts';\n\n<ChartContainer\n  series={['revenue', 'cost']}\n  vars={{ 'chart-grid': 'slate-200', 'chart-label': 'slate-500' }}\n  theme={{ dark: { vars: { 'chart-grid': 'slate-800', 'chart-label': 'slate-400' } } }}\n  height={60}\n>\n  <ResponsiveContainer width="100%" height="100%">\n    <AreaChart data={months}>\n      <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" vertical={false} />\n      <XAxis dataKey="month" stroke="var(--chart-label)" fontSize={12} />\n      <YAxis stroke="var(--chart-label)" fontSize={12} width={36} />\n      <Area dataKey="revenue" stroke="var(--color-revenue)" fill="var(--color-revenue)" fillOpacity={0.15} strokeWidth={2} />\n      <Area dataKey="cost" stroke="var(--color-cost)" fill="var(--color-cost)" fillOpacity={0.15} strokeWidth={2} />\n    </AreaChart>\n  </ResponsiveContainer>\n</ChartContainer>`}
          >
            <Suspense fallback={<Box height={60} />}>
              <RechartsDemo />
            </Suspense>
          </Code>

          <Section id="recharts-notes" title="The chart names no colour">
            Flip the theme in the header and every line above changes with it — the chart code does not. That is the whole of{' '}
            <Mono>ChartContainer</Mono>: it declares <Mono>--chart-1</Mono> … <Mono>--chart-6</Mono> in both themes and one{' '}
            <Mono>--color-&lt;series&gt;</Mono> per name you give it, so <Mono>stroke="var(--color-revenue)"</Mono> is all the chart ever
            says about paint. The two names it does <em>not</em> know about — the grid and the axis labels — are the same mechanism spelled
            out by hand, which is what <Mono>vars</Mono> is for.
            <Box mt={4}>
              The names are deliberately the ones the ecosystem already uses, so a chart lifted out of shadcn's charts works unchanged. What
              is different is where they live: there is no <Mono>&lt;style&gt;</Mono> tag per chart and no <Mono>id</Mono> to scope it with,
              because a Box prop is already scoped to its element — and two tiles with the same series share the rule.
            </Box>
          </Section>

          <Section id="a11y" title="Naming a picture of numbers">
            Every primitive follows <Mono>Svg</Mono>'s rule, and a chart is the case where it matters most: with no <Mono>label</Mono> the
            drawing is <Mono>aria-hidden</Mono>, and with one it is <Mono>role="img"</Mono> with that name. Both are right in different
            places. A sparkline beside the number it summarises is decoration — leave it unnamed, or a screen reader reads the row twice. A
            sparkline that is the only thing in a cell is the data, so give it a label that says what a sighted reader gets from the shape:{' '}
            <Mono>label="Revenue, rising 12% over six months"</Mono>, not <Mono>label="Chart"</Mono>.
          </Section>
          <ApiReference api={sparklineApi} />

          <ApiReference api={progressRingApi} />

          <ApiReference api={gaugeApi} />

          <ApiReference api={miniDonutApi} />

          <ApiReference api={chartContainerApi} />
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

const sidebarLinks = [
  { id: 'what', label: 'Not a chart library' },
  { id: 'sparkline', label: 'Sparkline' },
  { id: 'sparkline-notes', label: 'Filling its box' },
  { id: 'domain', label: 'One scale, many rows' },
  { id: 'gradient', label: 'A gradient fill' },
  { id: 'ring', label: 'Progress ring' },
  { id: 'transition', label: 'The arc eases' },
  { id: 'gauge', label: 'Gauge' },
  { id: 'donut', label: 'Mini donut' },
  { id: 'grid', label: '10,000 sparklines' },
  { id: 'cost', label: 'What it costs' },
  { id: 'vars', label: 'A variable is a prop' },
  { id: 'recharts', label: 'Themed Recharts' },
  { id: 'a11y', label: 'Naming a chart' },
  ...apiSections(sparklineApi),
  ...apiSections(progressRingApi),
  ...apiSections(gaugeApi),
  ...apiSections(miniDonutApi),
  ...apiSections(chartContainerApi),
];
