import Box from '@box-kite/react';
import { ProgressRing, Sparkline } from '@box-kite/react/components/chart';
import Flex from '@box-kite/react/components/flex';
import Grid from '@box-kite/react/components/grid';
import { Span } from '@box-kite/react/components/semantics';
import { type ReactNode } from 'react';

/**
 * The row of tiles above a dashboard. The shapes are `components/chart` primitives — an SVG each, no
 * chart library — and there is no `'use client'` here on purpose: nothing in this file holds state, so
 * it renders in a Server Component, styles and all.
 */
export interface Stat {
  label: string;
  value: string;
  delta: string;
  up: boolean;
  trend: number[];
}

const dashboardStats: Stat[] = [
  { label: 'Revenue', value: '$48,210', delta: '+12.4%', up: true, trend: [12, 18, 14, 22, 25, 21, 28, 31, 29, 36, 34, 42] },
  { label: 'Invoices paid', value: '182', delta: '+4.1%', up: true, trend: [30, 28, 33, 31, 36, 34, 38, 37, 41, 40, 44, 46] },
  { label: 'Overdue', value: '$6,940', delta: '-8.2%', up: false, trend: [22, 24, 21, 19, 20, 17, 16, 18, 15, 13, 12, 10] },
];

function Card({ children }: { children: ReactNode }) {
  return (
    <Flex
      d="column"
      gap={3}
      p={4}
      b={1}
      borderRadius={3}
      borderColor="slate-200"
      bgColor="white"
      theme={{ dark: { borderColor: 'slate-800', bgColor: 'slate-900' } }}
    >
      {children}
    </Flex>
  );
}

export default function DashboardStats() {
  return (
    <Grid gridTemplateColumns={1} gap={4} md={{ gridTemplateColumns: 4 }}>
      {dashboardStats.map((stat) => (
        <Card key={stat.label}>
          <Span fontSize={13} color="slate-500" theme={{ dark: { color: 'slate-400' } }}>
            {stat.label}
          </Span>
          {/* Stacked rather than side by side: a tile is a quarter of the row, and a long figure next
              to its delta is the first thing to overflow — on one tile, which leaves the row ragged. */}
          <Flex d="column" gap={1}>
            <Span fontSize={24} fontWeight={600}>
              {stat.value}
            </Span>
            <Span
              fontSize={13}
              color={stat.up ? 'emerald-600' : 'rose-600'}
              theme={{ dark: { color: stat.up ? 'emerald-400' : 'rose-400' } }}
            >
              {stat.delta}
            </Span>
          </Flex>
          {/* `width`/`height` on an SVG are the attributes, not the ÷4 layout props — a CSS length, or
              a bare number meaning user units. `color` paints it: the stroke is `currentColor`. */}
          <Sparkline data={stat.trend} height="2rem" color={stat.up ? 'emerald-500' : 'rose-500'} strokeWidth={2} />
        </Card>
      ))}
      <Card>
        <Span fontSize={13} color="slate-500" theme={{ dark: { color: 'slate-400' } }}>
          Collection rate
        </Span>
        <Flex ai="center" gap={3} flexWrap="wrap">
          <ProgressRing value={0.86} width="3rem" height="3rem" color="violet-500" />
          <Box>
            <Span fontSize={24} fontWeight={600}>
              86%
            </Span>
            <Box fontSize={13} color="slate-500" theme={{ dark: { color: 'slate-400' } }}>
              of this quarter
            </Box>
          </Box>
        </Flex>
      </Card>
    </Grid>
  );
}
