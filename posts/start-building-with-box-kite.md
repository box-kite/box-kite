# Your first web page with Box Kite

_9 October 2026 · Beginner_

This guide takes you from an empty folder to a responsive landing page with a dark mode, live on the internet, without writing a single CSS file. You need Node.js installed and a terminal; knowing a little HTML helps, and knowing React is not required — the page is small enough to read line by line.

Box Kite is a React library where every CSS property is a typed prop. Instead of writing a class name in one file and its rules in another, you write `p={6}` or `bgColor="indigo-600"` on the element itself, and the library generates the CSS for you. Your editor autocompletes every name and every value, and a typo is an error before the page ever runs.

## Step 1: create the app

Open a terminal in the folder where you keep your projects and run:

```bash
npm create vite@latest my-site -- --template react-ts
cd my-site
npm install
npm install @box-kite/react
npm run dev
```

The first command creates a React app with TypeScript, the fourth adds Box Kite, and the last one starts a development server. Open the address it prints (usually `http://localhost:5173`) and you will see Vite's starter page.

There is nothing else to set up: no configuration file, no plugin, no stylesheet to import. Delete `src/App.css` and `src/index.css`, remove the line importing `index.css` from `src/main.tsx`, and the app is ready.

## Step 2: tell your AI assistant about it (optional, but do it)

If you write code with an AI assistant — Claude Code, Cursor, Copilot, Codex — this step matters more than any other. Box Kite's prop names look like props from other libraries, but the numbers mean different things, and an assistant writing from memory will guess wrong.

The package carries its own instructions. Add a line to your project's `AGENTS.md` (or `CLAUDE.md`) pointing at them:

```text
Before writing UI code, read node_modules/@box-kite/react/AGENTS.md.
```

Two more things make an assistant noticeably better at it. The skill teaches the rules to most coding agents in one command, and the MCP server lets the assistant ask the library itself what CSS a prop produces before it writes one:

```bash
npx skills add box-kite/box-kite
claude mcp add box-kite -- npx -y @box-kite/mcp
```

The second line is for Claude Code; the [Built for AI page](https://www.box-kite.dev/ai-context) has the same setup for every other assistant. If you would rather let the assistant build the whole page, [Start with AI](https://www.box-kite.dev/start) has prompts to paste — this guide is the version where you see every line.

## Step 3: put something in the middle of the screen

Replace everything in `src/App.tsx` with this:

```tsx
import Flex from '@box-kite/react/components/flex';
import { H1, P } from '@box-kite/react/components/semantics';

export default function App() {
  return (
    <Flex d="column" ai="center" jc="center" gap={4} minHeight="fit-screen" p={6}>
      <H1 fontSize={48} fontWeight={700}>
        Hello, world
      </H1>
      <P fontSize={18} color="slate-600">
        My first page with Box Kite.
      </P>
    </Flex>
  );
}
```

Save, and the heading sits in the middle of the window. Three things are worth noticing:

- **`Flex` is a component, not a setting.** It renders a `<div>` laid out with flexbox. `d="column"` stacks the children, `ai="center"` centres them across, `jc="center"` centres them along. `H1` and `P` render a real `<h1>` and `<p>`, which matters for search engines and screen readers.
- **Spacing is a scale of 4.** `gap={4}` is 16px and `p={6}` is 24px: every step is a quarter of a rem. You think in a grid of 4px and never type a unit.
- **`fontSize` is the exception: it is in pixels.** `fontSize={48}` is 48px. This is the one number that catches people out, which is why it is in the rules your assistant reads.

## Step 4: make it work on a phone

A layout that looks right on a laptop usually needs less padding and a smaller heading on a phone. In Box Kite a screen size is a prop that takes the props to use from that width up:

```tsx
import Flex from '@box-kite/react/components/flex';
import { H1, P } from '@box-kite/react/components/semantics';

export default function App() {
  return (
    <Flex d="column" ai="center" jc="center" gap={4} minHeight="fit-screen" p={6} md={{ p: 12 }}>
      <H1 fontSize={32} md={{ fontSize: 48 }} fontWeight={700} textAlign="center">
        Hello, world
      </H1>
      <P fontSize={18} color="slate-600">
        My first page with Box Kite.
      </P>
    </Flex>
  );
}
```

Write the phone version first, then say what changes on a bigger screen: `md` means 768px wide and up, so the heading is 32px on a phone and 48px on a laptop. Narrow the browser window and watch it change. The other sizes are `sm`, `lg`, `xl` and `xxl`, and they all work the same way.

## Step 5: a row of cards and a button

Most landing pages are a heading, a few cards and a call to action. Cards are a grid; a button is a `Button`:

```tsx
import Box from '@box-kite/react';
import Button from '@box-kite/react/components/button';
import Flex from '@box-kite/react/components/flex';
import Grid from '@box-kite/react/components/grid';
import { H1, H2, P } from '@box-kite/react/components/semantics';

const features = [
  { title: 'Fast', text: 'Pages that load before you finish blinking.' },
  { title: 'Simple', text: 'Every style lives on the element it styles.' },
  { title: 'Typed', text: 'A misspelt colour is an error, not a surprise.' },
];

export default function App() {
  return (
    <Flex d="column" ai="center" gap={10} p={6} md={{ p: 12 }}>
      <H1 fontSize={32} md={{ fontSize: 48 }} fontWeight={700} textAlign="center">
        Hello, world
      </H1>

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
```

One column on a phone, three from 768px up. `b={1}` is a 1px border — border widths are in pixels, like `fontSize` — and `borderRadius={3}` is on the spacing scale, so 12px. `hover={{ borderColor: 'indigo-400', shadow: 'md' }}` is what a card looks like while the pointer is over it: a state is a prop holding the props for that state, the same shape as `md`.

`Button` comes styled — indigo, a shade darker on hover, a focus ring for keyboard users, and adjusted for dark mode — so it needs only the props you want to change.

The colours are a palette: `slate`, `indigo`, `sky`, `emerald`, `rose` and the rest, each from `50` (lightest) to `950` (darkest). Type `bgColor="` in your editor and it lists them all.

## Step 6: add a dark mode

A dark mode is two things: the colours each element uses in the dark, and something that decides which one is showing. The first is a `theme` prop on any element; the second is `Box.Theme`, once, around the app.

In `src/main.tsx`, wrap the app:

```tsx nocheck
import Box from '@box-kite/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Box.Theme use="global" storageKey="theme">
      <App />
    </Box.Theme>
  </StrictMode>,
);
```

Then give the page its two sets of colours, and a button to switch:

```tsx
import Box from '@box-kite/react';
import Button from '@box-kite/react/components/button';
import Flex from '@box-kite/react/components/flex';
import { H1 } from '@box-kite/react/components/semantics';

function ThemeButton() {
  const [theme, setTheme] = Box.Theme.useTheme();

  return <Button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</Button>;
}

export default function App() {
  return (
    <Flex
      d="column"
      ai="center"
      gap={6}
      minHeight="fit-screen"
      p={6}
      theme={{
        light: { bgColor: 'white', color: 'slate-900' },
        dark: { bgColor: 'slate-950', color: 'slate-100' },
      }}
    >
      <ThemeButton />
      <H1 fontSize={32} fontWeight={700}>
        Hello, world
      </H1>
    </Flex>
  );
}
```

On its first visit the page follows the operating system's setting. Once someone presses the button, `storageKey="theme"` remembers their choice for the next visit. Any element can carry a `theme` prop, so a card can say `theme={{ dark: { borderColor: 'slate-800' } }}` and nothing else.

If you later render your pages on a server and want the right theme on the very first frame, the [dark mode article](https://www.box-kite.dev/blog/dark-mode-without-the-flash) explains the one extra script that takes.

## Step 7: when a prop does nothing, read the console

Sooner or later you will write a prop that has no effect. In development, Box Kite says so in the browser console, and says what to write instead:

```text
[box-kite] fontSize={4} is 4px text: fontSize's divider is 16, not the spacing scale's 4, so the number is the pixel size. For 16px write fontSize={16}.
[box-kite] href is an HTML attribute, not a style prop, so at the top level it was dropped: write props={{ href: ... }}.
```

The second one is the other rule worth learning early: HTML attributes (`href`, `id`, `type`, `aria-label`) go in a `props` object, because every top-level prop is a style. A link is written like this:

```tsx
import { Link } from '@box-kite/react/components/semantics';

export function Docs() {
  return (
    <Link props={{ href: 'https://www.box-kite.dev' }} color="indigo-600" textDecoration="underline">
      Read the docs
    </Link>
  );
}
```

And a misspelt colour never gets as far as the console — `bgColor="bleu-500"` is a TypeScript error the moment you type it.

## Step 8: put it on the internet

Stop the development server and build the site:

```bash
npm run build
```

Vite writes the finished site into a `dist` folder: an `index.html` and a few JavaScript files. Any static host serves it. The quickest is [Netlify Drop](https://app.netlify.com/drop) — drag the `dist` folder onto the page and you get a public address in seconds. GitHub Pages and Cloudflare Pages work the same way once the project is in a repository.

There is no stylesheet to upload and nothing to configure on the host: the CSS is generated by the page as it runs.

## What you learned

- Every CSS property is a prop, and its name and values autocomplete. There are no CSS files.
- Layout is `Flex` and `Grid`; text is `H1`, `P` and the other semantic elements.
- Spacing and corners are a scale of 4 (`p={4}` is 16px); font sizes and border widths are pixels.
- A screen size (`md`), a state (`hover`) and a theme (`theme={{ dark: … }}`) are props that hold more props.
- HTML attributes go in `props`, and the console tells you when a prop did nothing.

## Where to go next

- [The playground](https://www.box-kite.dev/playground) — change props and watch the CSS they write.
- [Box](https://www.box-kite.dev/box) — every prop, searchable, with the CSS each one produces.
- [Components](https://www.box-kite.dev/dialog) — dialogs, menus, tabs, forms and a data grid, all keyboard-accessible.
- [Start with AI](https://www.box-kite.dev/start) — the same page, written by your assistant from a few prompts.
