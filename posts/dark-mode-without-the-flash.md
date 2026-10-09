# Dark mode without the flash

_9 October 2026 · Use case_

A dark mode should paint the reader's theme on the first frame, switch without re-rendering the page, and let one section disagree with the rest. Most manage one or two of those three jobs. This article builds all three with Box Kite, shows what each line costs, and is explicit about the one piece the library leaves to you.

## The problem

Somebody opens your server-rendered page at night with their system set to dark. The HTML arrives, the browser paints it — white — and a moment later JavaScript runs, reads the preference and repaints everything dark. That flash is the most-reported dark-mode bug there is: the [long-running Next.js discussion](https://github.com/vercel/next.js/discussions/53063) on it has dozens of replies, and [a newer one](https://github.com/vercel/next.js/discussions/64391) opened because the usual fixes broke in the App Router.

The fixes people reach for each trade one problem for another:

- **Keep the theme in React state** and pass it to every component. The server cannot know the reader's preference, so it renders a guess; the client renders the truth; React reports a hydration mismatch and the page flashes anyway. Every switch re-renders the tree.
- **Two sets of CSS variables**, swapped by a class. This is the right mechanism, but it means a stylesheet of tokens maintained apart from the components that use them, and every new colour is an edit in two places.
- **Hide the page until JavaScript has decided.** No flash, and no content either, for as long as the bundle takes.

## The model: a theme is a class on an ancestor

In Box Kite a theme is a prop on the element it styles:

```tsx
import Box from '@box-kite/react';

export function Card() {
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
```

The library turns `theme={{ dark: … }}` into an ordinary CSS rule that applies when an ancestor carries the class `dark`. Nothing about it happens in React: there is no context to read and no prop to thread through. Which theme is showing is decided by one class on one element — usually `<html>` — and everything below follows it.

That one decision is what makes the other three jobs cheap.

## Deciding the theme: `Box.Theme`

`Box.Theme` is the part that decides. Put it around the app once:

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

`use="global"` writes the theme onto `<html>`. With no choice stored, it follows `prefers-color-scheme` — and keeps following it, so a system that switches to dark at sunset takes the page with it. `storageKey` persists an explicit choice in `localStorage`, and a stored choice wins over the system from then on. A switch is a hook:

```tsx
import Box from '@box-kite/react';
import Button from '@box-kite/react/components/button';

export function ThemeSwitch() {
  const [theme, setTheme] = Box.Theme.useTheme();

  return (
    <Button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} props={{ 'aria-label': 'Switch theme' }}>
      {theme === 'dark' ? 'Light' : 'Dark'}
    </Button>
  );
}
```

`setTheme(null)` forgets the stored choice and hands control back to the system.

**What a switch costs.** We measured it in Chrome with a render counter on every component: pressing the switch changed one class on `<html>`; the component that called `useTheme()` re-rendered, because it reads the theme; the page component, whose every colour changed, rendered exactly once in total — on mount. The colours change because the browser re-matches CSS, not because React re-rendered anything.

## The first frame: a few lines you own

`Box.Theme` reads the system preference and the stored choice in the browser, after React starts. In a single-page app that is before anything is painted, so there is nothing to flash. A **server-rendered or prerendered** page is different: the HTML paints before any JavaScript runs, so the theme class has to be on `<html>` before that first paint — and only a script in the `<head>` runs early enough.

The library does not inject one for you; it is yours, and it is short. Ship the light theme in the HTML, and swap it before the body is painted:

```html
<html lang="en" class="light" data-theme="light">
  <head>
    <script>
      try {
        var theme = localStorage.getItem('theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        var root = document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(theme);
        root.setAttribute('data-theme', theme);
      } catch (error) {}
    </script>
  </head>
</html>
```

The key is the same `storageKey` the provider uses, and the rule is the same — stored choice first, system second — so when React starts, `Box.Theme` resolves the theme the script already chose and leaves `<html>` alone. We checked that too: with the system set to dark, the class on `<html>` changed exactly once, from the shipped `light` to `dark`, before React ran, and never again; with `light` stored, the same page under a dark system kept `light` throughout. The `try` is for the reader whose browser blocks storage — they get the light theme the HTML shipped, which is also what a reader with JavaScript turned off sees.

Two variations:

- **If your server already knows the choice** — from a cookie, say — render the class on `<html>` on the server and skip the script. The repository's Next.js example renders `<html className="dark" data-theme="dark">` in a Server Component, and the theme needs no provider at all there, because the rules only care about the class.
- **If React renders the `<html>` element** (Next.js and other frameworks do), the script changes an attribute React also rendered, so add `suppressHydrationWarning` to that element — the warning is about exactly the change you meant to make.

This is how [box-kite.dev](https://www.box-kite.dev) itself works: every page is prerendered in the light theme, and an inline script in the shell switches it before the first paint.

## A section that stays light

Real pages have parts that ignore the page's theme: a code sample that is always dark, a print preview that is always light, a marketing block with its own colours. Because a theme is a class on an ancestor, a nested `Box.Theme` is simply a nearer ancestor:

```tsx
import Box from '@box-kite/react';

export function PrintPreview() {
  return (
    <Box.Theme use="local" theme="light">
      <Box p={6} bgColor="white" color="slate-900" theme={{ dark: { bgColor: 'slate-900', color: 'slate-100' } }}>
        Light, whatever the page around it is doing.
      </Box>
    </Box.Theme>
  );
}
```

The nested theme is a real boundary, not a second class competing with the first. Each theme rule is written with CSS `@scope`, from the theme's class down to the next element that declares a theme of its own, so the dark page's rules stop at the light section's edge — including for a property the inner section never mentions. In the measurement above, the light section kept its light background while the page around it was dark, and kept it through every switch.

## The switch, animated

A theme change can cross-fade the whole page instead of snapping:

```tsx
import Box from '@box-kite/react';
import type { ReactNode } from 'react';

export function Root({ children }: { children: ReactNode }) {
  return (
    <Box.Theme use="global" storageKey="theme" viewTransition>
      {children}
    </Box.Theme>
  );
}
```

`viewTransition` runs the switch inside the browser's View Transitions API. Writing it by hand has a trap — the browser captures the page the moment your callback returns, before React has rendered the new state, so a hand-rolled version captures the old theme twice and nothing appears to animate — and the prop flushes the update inside the callback for you. A reader who asked for reduced motion gets the theme change without the cross-fade, and a browser without view transitions simply switches.

## Charts follow too

The theme reaches markup the library did not render, through CSS variables. A chart library takes a colour string; give it a variable, and declare the variable per theme on a container:

```tsx
import { ChartContainer } from '@box-kite/react/components/chart';
import { Line, LineChart, ResponsiveContainer } from 'recharts';

const months = [
  { month: 'Jan', revenue: 12 },
  { month: 'Feb', revenue: 18 },
  { month: 'Mar', revenue: 15 },
];

export function Revenue() {
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
```

`ChartContainer` declares one `--color-<series>` per name, with a value for each theme, so the chart names no colour at all and its dark mode is the page's. The [charts page](https://www.box-kite.dev/charts) shows a full example with a grid and axis labels.

## The honest limits

- **The pre-paint script is yours.** For a server-rendered page, nothing in the library can run before the first paint; the few lines above are the whole of it, and they have to agree with the `storageKey` you gave `Box.Theme`.
- **Theme rules need `@scope`**: Chrome 118, Safari 17.4, Firefox 128 and later. In an older browser the theme rules are dropped — which is why the examples here write the light colours as plain props and only the dark ones in `theme`: an old browser then shows a working light page rather than an unstyled one.
- **The system preference only knows light and dark.** A theme is any class name — `high-contrast`, `sepia`, a brand theme — and `theme={{ 'high-contrast': … }}` works the same way, but choosing one of those is always an explicit `setTheme`.

## Try it

- [Theme setup](https://www.box-kite.dev/theme-setup) — the reference for `theme`, `Box.Theme` and component themes.
- [The playground](https://www.box-kite.dev/playground) — write a `theme` prop and see the rule it produces.
- `npm install @box-kite/react`, and wrap your app in `Box.Theme`.
