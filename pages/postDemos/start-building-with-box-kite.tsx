import Box from '../../src/box';
import Button from '../../src/components/button';
import Flex from '../../src/components/flex';
import Grid from '../../src/components/grid';
import { H2, P } from '../../src/components/semantics';

// The article's own snippets, run: an image named `hello-world.png` is replaced by `HelloWorld`. Keep each identical to its
// code block except two things: `minHeight="fit-screen"` is the frame's height, and an `H1` is an `H2` (the post owns the `<h1>`).

export function HelloWorld() {
  return (
    <Flex d="column" ai="center" jc="center" gap={4} minHeight={60} p={6}>
      <H2 fontSize={48} fontWeight={700}>
        Hello, world
      </H2>
      <P fontSize={18} color="slate-600">
        My first page with Box Kite.
      </P>
    </Flex>
  );
}

const features = [
  { title: 'Fast', text: 'Pages that load before you finish blinking.' },
  { title: 'Simple', text: 'Every style lives on the element it styles.' },
  { title: 'Typed', text: 'A misspelt colour is an error, not a surprise.' },
];

export function LandingPage() {
  return (
    <Flex d="column" ai="center" gap={10} p={6} md={{ p: 12 }}>
      <H2 fontSize={32} md={{ fontSize: 48 }} fontWeight={700} textAlign="center">
        Hello, world
      </H2>

      <Grid gridTemplateColumns={1} md={{ gridTemplateColumns: 3 }} gap={6} maxWidth={240} width="fit">
        {features.map((feature) => (
          <Box key={feature.title} p={6} borderRadius={3} b={1} borderColor="slate-200" hover={{ borderColor: 'indigo-400', shadow: 'md' }}>
            <H2 fontSize={20} fontWeight={600} mb={2}>
              {feature.title}
            </H2>
            <P color="slate-600">{feature.text}</P>
          </Box>
        ))}
      </Grid>

      <Button px={6} py={3} fontWeight={600}>
        Get started
      </Button>
    </Flex>
  );
}

function ThemeButton() {
  const [theme, setTheme] = Box.Theme.useTheme();

  return <Button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</Button>;
}

export function DarkModePage() {
  return (
    <Flex
      d="column"
      ai="center"
      gap={6}
      minHeight={60}
      p={6}
      theme={{
        light: { bgColor: 'white', color: 'slate-900' },
        dark: { bgColor: 'slate-950', color: 'slate-100' },
      }}
    >
      <ThemeButton />
      <H2 fontSize={32} fontWeight={700}>
        Hello, world
      </H2>
    </Flex>
  );
}
