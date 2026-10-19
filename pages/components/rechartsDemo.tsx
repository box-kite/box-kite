import { Area, AreaChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { ChartContainer } from '../../src/components/chart';

/**
 * The /charts page's Recharts demo, in a file of its own so it is a **lazy chunk**: recharts and its d3
 * packages are ~95 KB gzipped and this site is one bundle per route, so the Textbox page should not pay
 * for it. Everything else is deliberately ordinary — the chart names no colour, only the variables.
 */

/** Eight months of two series, for the chart that is drawn by somebody else entirely. */
const months = [
  { month: 'Jan', revenue: 42, cost: 30 },
  { month: 'Feb', revenue: 48, cost: 31 },
  { month: 'Mar', revenue: 45, cost: 33 },
  { month: 'Apr', revenue: 57, cost: 36 },
  { month: 'May', revenue: 62, cost: 38 },
  { month: 'Jun', revenue: 59, cost: 41 },
  { month: 'Jul', revenue: 71, cost: 44 },
  { month: 'Aug', revenue: 78, cost: 46 },
];

export default function RechartsDemo() {
  return (
    <ChartContainer
      series={['revenue', 'cost']}
      vars={{ 'chart-grid': 'base-200', 'chart-label': 'base-500' }}
      theme={{ dark: { vars: { 'chart-grid': 'base-800', 'chart-label': 'base-400' } } }}
      height={60}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={months}>
          <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="month" stroke="var(--chart-label)" fontSize={12} />
          <YAxis stroke="var(--chart-label)" fontSize={12} width={36} />
          <Area dataKey="revenue" stroke="var(--color-revenue)" fill="var(--color-revenue)" fillOpacity={0.15} strokeWidth={2} />
          <Area dataKey="cost" stroke="var(--color-cost)" fill="var(--color-cost)" fillOpacity={0.15} strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
