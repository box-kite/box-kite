import { Line, LineChart, ResponsiveContainer } from 'recharts';
import Box from '../../src/box';
import Button from '../../src/components/button';
import { ChartContainer } from '../../src/components/chart';
import Flex from '../../src/components/flex';
import Grid from '../../src/components/grid';

// The article's own snippets, run: an image named `card-themes.png` is replaced by `CardThemes`. Keep each identical to its code block.

function Card() {
  return (
    <Box
      p={6}
      borderRadius={3}
      b={1}
      bgColor="white"
      color="slate-900"
      borderColor="slate-200"
      theme={{ dark: { bgColor: 'slate-900', color: 'slate-100', borderColor: 'slate-800' } }}
    >
      The light colours are plain props, the dark ones are in theme.
    </Box>
  );
}

function ThemeSwitch() {
  const [theme, setTheme] = Box.Theme.useTheme();

  return (
    <Button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} props={{ 'aria-label': 'Switch theme' }}>
      {theme === 'dark' ? 'Light' : 'Dark'}
    </Button>
  );
}

function PrintPreview() {
  return (
    <Box.Theme use="local" theme="light">
      <Box p={6} bgColor="white" color="slate-900" theme={{ dark: { bgColor: 'slate-900', color: 'slate-100' } }}>
        Light, whatever the page around it is doing.
      </Box>
    </Box.Theme>
  );
}

const months = [
  { month: 'Jan', revenue: 12 },
  { month: 'Feb', revenue: 18 },
  { month: 'Mar', revenue: 15 },
];

function Revenue() {
  return (
    <ChartContainer series={['revenue']} height={60}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={months}>
          <Line dataKey="revenue" stroke="var(--color-revenue)" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}

// One card in each theme at once, which is the point of the snippet and which the page's own theme can only show one of.
export function CardThemes() {
  return (
    <Grid gridTemplateColumns={1} md={{ gridTemplateColumns: 2 }} gap={4}>
      {(['light', 'dark'] as const).map((theme) => (
        <Box.Theme key={theme} use="local" theme={theme}>
          <Card />
        </Box.Theme>
      ))}
    </Grid>
  );
}

export function StaysLight() {
  return (
    <Flex d="column" gap={4}>
      <Box>
        <ThemeSwitch />
      </Box>
      <Card />
      <PrintPreview />
    </Flex>
  );
}

export function RevenueChart() {
  return <Revenue />;
}
