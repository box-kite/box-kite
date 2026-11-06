import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { TooltipContentProps } from 'recharts';
import Box from '../../src/box';
import { ChartContainer } from '../../src/components/chart';
import Flex from '../../src/components/flex';
import Grid from '../../src/components/grid';

// The article's own snippets, run: an image named `chart-themes.png` is replaced by `ChartThemes`. Keep each identical to
// its code block. Two differ where the site forces it: each chart is shown in both themes at once, and the `:root`
// stylesheet of the trap is an outer Box's `vars`, since a demo cannot add a global stylesheet.

const months = [
  { month: 'Jan', revenue: 12, cost: 8 },
  { month: 'Feb', revenue: 18, cost: 9 },
  { month: 'Mar', revenue: 15, cost: 11 },
  { month: 'Apr', revenue: 22, cost: 12 },
  { month: 'May', revenue: 26, cost: 13 },
  { month: 'Jun', revenue: 31, cost: 15 },
];

function ChartTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload?.length) return null;

  return (
    <Box
      p={2}
      b={1}
      borderRadius={2}
      fontSize={12}
      bgColor="white"
      color="slate-900"
      borderColor="slate-200"
      theme={{ dark: { bgColor: 'slate-900', color: 'slate-100', borderColor: 'slate-700' } }}
    >
      <Box fontWeight={600}>{label}</Box>
      {payload.map((entry) => (
        <Box key={String(entry.dataKey)}>
          {entry.name}: {entry.value}
        </Box>
      ))}
    </Box>
  );
}

function SalesChart() {
  return (
    <ChartContainer
      series={['revenue', 'cost']}
      vars={{ 'chart-grid': 'slate-200', 'chart-label': 'slate-500' }}
      theme={{ dark: { vars: { 'chart-grid': 'slate-800', 'chart-label': 'slate-400' } } }}
      height={60}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={months}>
          <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="month" stroke="var(--chart-label)" fontSize={12} />
          <YAxis stroke="var(--chart-label)" fontSize={12} width={32} />
          <Tooltip content={ChartTooltip} />
          <Area dataKey="revenue" stroke="var(--color-revenue)" fill="var(--color-revenue)" fillOpacity={0.15} />
          <Area dataKey="cost" stroke="var(--color-cost)" fill="var(--color-cost)" fillOpacity={0.15} />
        </AreaChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}

const weeks = [
  { week: 'W1', completed: 4, started: 3 },
  { week: 'W2', completed: 6, started: 2 },
  { week: 'W3', completed: 5, started: 4 },
  { week: 'W4', completed: 8, started: 2 },
];

function Goals() {
  return (
    <ChartContainer
      series={{ completed: 'violet-600', started: 'violet-600/35' }}
      theme={{ dark: { vars: { 'color-completed': 'violet-400', 'color-started': 'violet-400/35' } } }}
      height={50}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={weeks}>
          <XAxis dataKey="week" stroke="currentColor" fontSize={12} />
          <Bar dataKey="completed" stackId="goals" fill="var(--color-completed)" />
          <Bar dataKey="started" stackId="goals" fill="var(--color-started)" />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}

function Revenue() {
  return (
    <ResponsiveContainer width="100%" height={120}>
      <LineChart data={months}>
        <Line dataKey="revenue" stroke="var(--color-revenue)" strokeWidth={2} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function Panel({ theme, children }: { theme: 'light' | 'dark'; children: React.ReactNode }) {
  return (
    <Box.Theme use="local" theme={theme}>
      <Box
        p={4}
        borderRadius={3}
        b={1}
        bgColor="white"
        borderColor="slate-200"
        theme={{ dark: { bgColor: 'slate-950', borderColor: 'slate-800', color: 'slate-300' } }}
      >
        {children}
      </Box>
    </Box.Theme>
  );
}

function BothThemes({ children }: { children: React.ReactNode }) {
  return (
    <Grid gridTemplateColumns={1} md={{ gridTemplateColumns: 2 }} gap={4}>
      <Panel theme="light">{children}</Panel>
      <Panel theme="dark">{children}</Panel>
    </Grid>
  );
}

export function ChartThemes() {
  return (
    <BothThemes>
      <SalesChart />
    </BothThemes>
  );
}

export function RootAlias() {
  return (
    <Box vars={{ 'chart-1': 'sky-600', 'color-revenue': 'var(--chart-1)' }}>
      <Box.Theme use="local" theme="dark">
        <Grid gridTemplateColumns={1} md={{ gridTemplateColumns: 2 }} gap={4} p={4} borderRadius={3} bgColor="slate-950" color="slate-300">
          <Box theme={{ dark: { vars: { 'chart-1': 'sky-300' } } }}>
            <Flex fontSize={14}>Aliased in :root</Flex>
            <Revenue />
          </Box>
          <ChartContainer series={['revenue']}>
            <Flex fontSize={14}>Declared by ChartContainer</Flex>
            <Revenue />
          </ChartContainer>
        </Grid>
      </Box.Theme>
    </Box>
  );
}

export function BrandSeries() {
  return (
    <BothThemes>
      <Goals />
    </BothThemes>
  );
}
