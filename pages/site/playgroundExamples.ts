/**
 * The snippets the playground's Examples menu opens: each one small, and each about one idea, and each already
 * in the shape Ctrl+S formats it to (`playgroundFormat.test.ts`), so formatting an example changes nothing.
 */

export interface PlaygroundExample {
  id: string;
  title: string;
  source: string;
}

export const PLAYGROUND_EXAMPLES: readonly PlaygroundExample[] = [
  {
    id: 'props',
    title: 'Every value is a prop',
    source: `<Flex
  d="column"
  gap={4}
  p={6}
  borderRadius={3}
  b={1}
  borderColor="slate-200"
  theme={{ dark: { borderColor: 'slate-700' } }}
>
  <H2 fontSize={20} fontWeight={600}>
    Every value is a prop
  </H2>

  <Flex gap={3} flexWrap="wrap">
    <Box
      px={4}
      py={2}
      borderRadius={2}
      fontSize={14}
      bgColor="sky-500/15"
      color="sky-600"
    >
      A token at 15%
    </Box>
    <Box
      px={4}
      py={2}
      borderRadius={2}
      fontSize={14}
      bgColor="violet-500"
      color="white"
      transition="transform"
      hover={{ scale: 1.05 }}
    >
      Hover me
    </Box>
  </Flex>
</Flex>`,
  },
  {
    id: 'states',
    title: 'Hover, focus and press',
    source: `<Flex gap={3} flexWrap="wrap">
  <Button
    clean
    cursor="pointer"
    px={5}
    py={2.5}
    borderRadius={2}
    bgColor="indigo-600"
    color="white"
    fontWeight={600}
    transition="all"
    hover={{ bgColor: 'indigo-500', translateY: -0.5, shadow: 'md' }}
    active={{ translateY: 0, shadow: 'none' }}
    focusVisible={{ ring: 2, ringColor: 'indigo-300' }}
  >
    Save changes
  </Button>
  <Button
    clean
    cursor="pointer"
    px={5}
    py={2.5}
    borderRadius={2}
    b={1}
    borderColor="slate-300"
    hover={{ bgColor: 'slate-100' }}
    focusVisible={{ ring: 2, ringColor: 'indigo-300' }}
    theme={{
      dark: { borderColor: 'slate-600', hover: { bgColor: 'slate-800' } },
    }}
  >
    Cancel
  </Button>
</Flex>`,
  },
  {
    id: 'responsive',
    title: 'A responsive grid',
    source: `<Grid
  gap={4}
  gridTemplateColumns={1}
  sm={{ gridTemplateColumns: 2 }}
  lg={{ gridTemplateColumns: 3 }}
>
  {['Design', 'Build', 'Ship'].map((step, index) => (
    <Flex
      key={step}
      d="column"
      gap={2}
      p={5}
      borderRadius={3}
      bgColor="emerald-500/10"
    >
      <Box fontSize={12} fontWeight={600} color="emerald-600">
        STEP {index + 1}
      </Box>
      <Box fontSize={18} fontWeight={600}>
        {step}
      </Box>
    </Flex>
  ))}
</Grid>`,
  },
  {
    id: 'theme',
    title: 'Light and dark',
    source: `{/* Flip the preview with the sun or moon in its header. */}
<Flex
  d="column"
  gap={3}
  maxWidth={100}
  p={6}
  borderRadius={3}
  b={1}
  shadow="sm"
  theme={{
    light: { bgColor: 'white', borderColor: 'slate-200' },
    dark: { bgColor: 'slate-800', borderColor: 'slate-700' },
  }}
>
  <Flex ai="center" jc="space-between" gap={3}>
    <H3 fontSize={18} fontWeight={600}>
      Weekly report
    </H3>
    <Box
      px={2.5}
      py={0.5}
      borderRadius={10}
      fontSize={12}
      fontWeight={600}
      theme={{
        light: { bgColor: 'emerald-100', color: 'emerald-700' },
        dark: { bgColor: 'emerald-400/15', color: 'emerald-300' },
      }}
    >
      On track
    </Box>
  </Flex>
  <Box
    fontSize={14}
    lineHeight={22}
    color="slate-600"
    theme={{ dark: { color: 'slate-400' } }}
  >
    Every colour here has a light and a dark answer, and the theme is one
    class on an ancestor, so switching it re-renders nothing.
  </Box>
  <Button
    clean
    cursor="pointer"
    alignSelf="start"
    px={4}
    py={2}
    borderRadius={2}
    fontWeight={600}
    theme={{
      light: {
        bgColor: 'slate-900',
        color: 'white',
        hover: { bgColor: 'slate-700' },
      },
      dark: {
        bgColor: 'white',
        color: 'slate-900',
        hover: { bgColor: 'slate-200' },
      },
    }}
  >
    Open the report
  </Button>
</Flex>`,
  },
  {
    id: 'gradient',
    title: 'Gradient and shadow',
    source: `<Flex
  d="column"
  gap={2}
  p={8}
  borderRadius={4}
  color="white"
  bgGradient={{ linear: 'br', colors: ['violet-500', 'pink-500'] }}
  shadow="xl"
  shadowColor="violet-500/40"
>
  <Box fontSize={24} fontWeight={700}>
    Box Kite
  </Box>
  <Box opacity={0.8}>A gradient is a value, and a shadow is a stack.</Box>
</Flex>`,
  },
  {
    id: 'motion',
    title: 'Animation and springs',
    source: `<Flex gap={6} ai="center">
  <Box
    width={10}
    height={10}
    borderRadius={10}
    bgColor="sky-500"
    animation="pulse"
  />
  <Box
    width={10}
    height={10}
    borderRadius={2}
    bgColor="rose-500"
    animation="spin"
  />
  <Box
    px={4}
    py={2}
    borderRadius={2}
    bgColor="slate-900"
    color="white"
    cursor="pointer"
    transition="transform"
    transitionTimingFunction="spring-bouncy"
    transitionDuration="spring-bouncy"
    hover={{ scale: 1.15 }}
  >
    A spring on hover
  </Box>
</Flex>`,
  },
  {
    id: 'form',
    title: 'A small form',
    source: `<Flex d="column" gap={4} maxWidth={90}>
  <Textbox placeholder="you@example.com" props={{ 'aria-label': 'Email' }} />
  <Checkbox label="Send me the release notes" />
  <Switch label="Dark mode for the editor" />
  <Button>Subscribe</Button>
</Flex>`,
  },
];

/** What the page opens on when the URL carries nothing. */
export const STARTER = PLAYGROUND_EXAMPLES[0].source;

/** The widest line an example may have: the formatter's width, which the editor shows without scrolling. */
export const EXAMPLE_COLUMNS = 80;
