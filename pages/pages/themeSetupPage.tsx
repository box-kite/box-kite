import { Moon, Paintbrush, Sun } from 'lucide-react';
import Box from '../../src/box';
import Button from '../../src/components/button';
import Flex from '../../src/components/flex';
import Code from '../components/code';
import PageHeader from '../components/pageHeader';
import Reveal from '../components/reveal';
import useTableOfContents from '../hooks/useTableOfContents';

export default function ThemeSetupPage() {
  useTableOfContents(sidebarLinks);

  return (
    <Box>
      <PageHeader
        icon={Paintbrush}
        title="Theme Setup"
        description="Customize your app design by defining styles as a theme with variants."
      />

      <Reveal delay={0.1}>
        <Flex d="column" gap={8}>
          <Code
            id="define-styles"
            label="Define Your Own Styles"
            language="jsx"
            code={`// boxExtends.ts — register the styles, and export what you registered.
import Box from '@box-kite/react';

export const components = Box.components({
  button: {
    styles: {
      bgColor: 'blue-500',
      b: 0,
      hover: {
        bgColor: 'blue-400',
      },
    },
    variants: {
      primary: {
        bgColor: 'sky-400',
        hover: {
          bgColor: 'sky-500',
        },
      },
      secondary: {
        bgColor: 'indigo-400',
        hover: {
          bgColor: 'indigo-500',
        },
      },
    },
  },
});`}
            codeOnly
          />

          <Code
            label="Teach TypeScript the names"
            language="jsx"
            check={false}
            code={`// box.d.ts — without this, variant="primary" is a type error: the names exist at runtime only.
import '@box-kite/react';
import { ExtractComponentsAndVariants } from '@box-kite/core/types';
import { components } from './boxExtends';

declare module '@box-kite/core/types' {
  namespace Augmented {
    interface ComponentsTypes extends ExtractComponentsAndVariants<typeof components> {}
  }
}`}
            codeOnly
          />

          <Code
            label="Use them"
            language="jsx"
            check={false}
            code={`import Flex from '@box-kite/react/components/flex';
import Button from '@box-kite/react/components/button';

function App() {
  return (
    <Flex gap={3}>
      <Button>Default</Button>
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
    </Flex>
  );
}`}
          >
            <Flex gap={3}>
              <Button>Default</Button>
              <Button component="button.demo" variant="primary">
                Primary
              </Button>
              <Button component="button.demo" variant="secondary">
                Secondary
              </Button>
            </Flex>
          </Code>

          <Code
            id="global-styles"
            label="App-wide Styles (globalStyles)"
            language="jsx"
            code={`import Box from '@box-kite/react';

// Apply Box props to <html> for app-wide, inheritable CSS like scrollbar-color, fontFamily, color.
// Only takes effect with use="global". Supports theme-keyed values.
function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Box.Theme
      use="global"
      globalStyles={{
        scrollbarColor: ['violet-500', 'transparent'],
        scrollbarWidth: 'thin',
        theme: {
          dark:  { scrollbarColor: ['violet-700', 'gray-900'] },
          light: { scrollbarColor: ['violet-300', 'gray-100'] },
        },
      }}
    >
      {children}
    </Box.Theme>
  );
}

// Emits rules directly on <html>:
//   html              { scrollbar-color: var(--violet-500) var(--transparent); scrollbar-width: thin; }
//   html.dark         { scrollbar-color: var(--violet-700) var(--gray-900); }
//   html.light        { scrollbar-color: var(--violet-300) var(--gray-100); }`}
          />

          <Code
            id="theme-switching"
            label="Theme Switching"
            language="jsx"
            code={`import Box from '@box-kite/react';
import Button from '@box-kite/react/components/button';
import Flex from '@box-kite/react/components/flex';

function App() {
  return (
    <Box.Theme theme="light">
      <Sample />
    </Box.Theme>
  );
}

function Sample() {
  const [theme, setTheme] = Box.useTheme();

  return (
    <Box
      p={3}
      borderRadius={2}
      b={1}
      theme={{
        light: { color: 'indigo-950', bgColor: 'white' },
        dark: { color: 'white', bgColor: 'indigo-950' },
      }}
    >
      <Flex gap={3} ai="center">
        <Button bgColor="transparent" onClick={() => setTheme('light')}>
          Light
        </Button>
        <Button bgColor="transparent" onClick={() => setTheme('dark')}>
          Dark
        </Button>
        <Box textTransform="capitalize" p={3}>
          This is {theme} theme
        </Box>
      </Flex>
    </Box>
  );
}`}
          >
            <Box.Theme theme="light">
              <Sample />
            </Box.Theme>
          </Code>

          <Code
            id="nesting"
            label="A Theme Inside a Theme"
            language="jsx"
            code={`import Box from '@box-kite/react';

// A theme reaches the subtree it owns and stops at the next element that declares one, so a panel
// keeps its own theme inside a page that has another — the demo above is one, inside this page.
// What marks a theme root is data-theme: <Box.Theme> renders it beside the class, and a theme class
// you write by hand (the one on <html> in a prerendered shell) wants it beside it too.
function Panel() {
  return (
    <Box.Theme use="local" theme="light">
      <Box
        p={4}
        borderRadius={2}
        theme={{ light: { bgColor: 'white', color: 'slate-900' }, dark: { bgColor: 'slate-950', color: 'white' } }}
      >
        Light in here, whatever the page around it is.
      </Box>
    </Box.Theme>
  );
}

// Each theme is one scoped rule:
//   @scope (.light) to ([data-theme]) { :scope .theme-light-bgColor-white { background-color: var(--white) } }
// The limit is what settles it. Two themes are two ancestor classes of the same specificity, so
// without one the rule written last would win however far away it was — and an outer rule carrying
// one more pseudo-class would win even then. Chrome 118+, Safari 17.4+, Firefox 128+.`}
          >
            <Box.Theme use="local" theme="light">
              <Box
                p={4}
                borderRadius={2}
                theme={{ light: { bgColor: 'white', color: 'slate-900' }, dark: { bgColor: 'slate-950', color: 'white' } }}
              >
                Light in here, whatever the page around it is.
              </Box>
            </Box.Theme>
          </Code>
        </Flex>
      </Reveal>
    </Box>
  );
}

const sidebarLinks = [
  { id: 'define-styles', label: 'Define Your Own Styles' },
  { id: 'global-styles', label: 'App-wide Styles (globalStyles)' },
  { id: 'theme-switching', label: 'Theme Switching' },
  { id: 'nesting', label: 'A Theme Inside a Theme' },
] as const;

function Sample() {
  const [theme, setTheme] = Box.useTheme();

  return (
    <Box
      p={3}
      borderRadius={2}
      b={1}
      theme={{
        light: { color: 'indigo-950', bgColor: 'white' },
        dark: { color: 'white', bgColor: 'indigo-950' },
      }}
    >
      <Flex gap={3} ai="center">
        <Button bgColor="transparent" onClick={() => setTheme('light')}>
          <Sun size={18} color="#fbbf24" />
        </Button>
        <Button bgColor="transparent" onClick={() => setTheme('dark')}>
          <Moon size={18} color="#6366f1" />
        </Button>
        <Box textTransform="capitalize" p={3}>
          This is {theme} theme
        </Box>
      </Flex>
    </Box>
  );
}
