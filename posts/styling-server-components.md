# Styling Server Components without a stylesheet or a build step

_13 October 2026 · Use case_

Style React Server Components with typed props and no 'use client', style registry or build plugin, with the CSS inside the HTML React streams. This article shows how that works in a Next.js App Router app, measures what it costs against a plain CSS module, and lists what still has to run on the client.

## The problem

You moved a page to the App Router, and the first component that styles itself wants `'use client'`. Runtime CSS-in-JS works by collecting styles while the tree renders and then writing them somewhere, either from an effect or through a context that a provider sets up. A Server Component has neither. It runs once, on the server, and React never calls an effect there.

The [Next.js guide to CSS-in-JS](https://nextjs.org/docs/app/guides/css-in-js) lists the popular libraries as supported **in Client Components**. The recipe takes three pieces: a style registry, a `useServerInsertedHTML` callback that flushes what the registry collected, and a `'use client'` wrapper around the app. Where Server Component support has been added since, the theme provider is the part that had to go, because context does not exist on the server.

The usual ways around it each cost something real:

- **Put `'use client'` on everything that styles itself.** The build passes. But every component with a style now ships its code to the browser and hydrates, which is the cost Server Components exist to remove.
- **Move to a compiler that extracts CSS at build time.** It ships no runtime, but it adds a bundler plugin, and a value only known at render time has to become a CSS variable written by hand.
- **Go back to stylesheets.** This is reliable, but the styles live in one file and the markup in another again, and nothing checks that a class name you wrote still exists.

## Styling as rendering

Box Kite takes a different route. Every CSS property is a typed prop, and in a Server Component it does not inject anything. Each rule a Box needs comes back as a React element, `<style href precedence>`, rendered next to the markup. React 19 hoists those elements into `<head>`, keeps one copy per `href`, and orders them by `precedence`. Styling becomes part of rendering, so it needs no effect, no provider and no registry.

Here is a Server Component page. There is no `'use client'` in it and nothing above it:

```tsx
import Flex from '@box-kite/react/components/flex';
import Grid from '@box-kite/react/components/grid';
import { H1, H2, P, Span } from '@box-kite/react/components/semantics';

const orders = [
  { id: 4100, customer: 'Ana', status: 'Shipped' },
  { id: 4101, customer: 'Ion', status: 'Packing' },
  { id: 4102, customer: 'Mara', status: 'Delivered' },
];

export default function OrdersPage() {
  return (
    <Flex d="column" gap={6} p={6} maxWidth={300} mx="auto">
      <H1 fontSize={28} fontWeight={700}>
        Orders
      </H1>
      <Grid gridTemplateColumns={1} gap={4} md={{ gridTemplateColumns: 3 }}>
        {orders.map((order) => (
          <Flex
            key={order.id}
            d="column"
            gap={2}
            p={5}
            borderRadius={3}
            b={1}
            borderColor="slate-200"
            bgColor="white"
            hover={{ borderColor: 'sky-500' }}
            theme={{ dark: { bgColor: 'slate-900', borderColor: 'slate-800' } }}
          >
            <H2 fontSize={16} fontWeight={600}>
              Order #{order.id}
            </H2>
            <P fontSize={14} color="slate-600" theme={{ dark: { color: 'slate-400' } }}>
              {order.customer}
            </P>
            <Span fontSize={12} fontWeight={600} color="sky-600">
              {order.status}
            </Span>
          </Flex>
        ))}
      </Grid>
    </Flex>
  );
}
```

The page has a breakpoint, a hover state and a dark theme. Each is just one more rule, so all three render on the server like the rest. You don't configure anything for this. The package's `react-server` export condition gives a Server Component a build of Box that calls no hook and never touches the DOM. Importing it is the whole setup.

Look at the HTML response and you'll find two `<style>` elements in `<head>`. React merges each `precedence` group into one element and lists what it merged in `data-href`. Every class in the markup has its rule in that response, so nothing waits for JavaScript to define it. The class names are hashes of their content, which is why the class the server wrote is exactly the class a client bundle would compute. Hydration has nothing to disagree about.

The order of the rules is not left to chance either. React hoists elements in the order it meets them, and rules are shared between Boxes, so element order alone could let `p` override `px`. Every rule therefore sits in a cascade layer, and the first style element declares the order of all layers once. Layer order beats source order.

## What it costs, measured

Talk of "zero runtime" is cheap, so here are numbers instead. The setup:

- a Next.js 16.3.5 production build (`next start`) with React 19.3, measured on a laptop;
- a page of cards like the one above, each a `Flex` with an `H2`, a `P` and a `Span` inside, so four Boxes per card;
- a baseline page with the same markup, styled by a plain CSS module.

Both pages render on every request.

| Cards | HTML, gzipped (Box / CSS module) | Server response, median of 40 (Box / CSS module) |
| ----- | -------------------------------- | ------------------------------------------------- |
| 100   | 11.2 KB / 4.4 KB                 | 15 ms / 10 ms                                     |
| 1,000 | 33.6 KB / 24.7 KB                | 79 ms / 35 ms                                     |

The JavaScript the browser downloaded was **byte for byte the same on both pages**: Next.js's own runtime, 172.9 KB gzipped. None of those chunks contained the styling engine. On a page with no client component, the engine never leaves the server.

Two costs show in the table, and both are real:

- **Rendering a Box takes time.** At 1,000 cards, the page with 4,000 Boxes took 44 ms longer to render than the one with plain class names, which is about 11 µs per Box. Boxes styled alike resolve through one cache lookup, so a long list of identical rows costs less than a page of all-different elements.
- **The CSS travels in the HTML.** A CSS module is a file the browser caches once for the whole site, while these rules come with each response. Most of the gap at 100 cards is the base stylesheet: the reset and the layer order, about 24 KB before compression, sent with every page.

### What measuring this turned up

The first run of this benchmark didn't look like the table above. The page with 1,000 cards weighed **102 MB**. On screen everything was right: two style elements in `<head>`, every class styled. The extra weight was in the RSC payload, the copy of the component tree that Next.js puts under the HTML for the client to pick up. React removes duplicate style elements from the page, but the payload carried every Box's elements in full, including the 24 KB base stylesheet, once per Box.

The fix is in the library: every Box now gets the *same* element objects. React's serializer sends an object it has already sent as a short reference, so the base stylesheet now crosses the wire once. That turned 102 MB into the 1.3 MB of the table above, and it shipped in Box Kite 2.2.4. A regression check now measures it against a real Next.js build on every pull request, because no unit test could have seen it.

## Suspense streams the CSS with the markup

Streaming is where collecting styles in a registry gets awkward. The registry flushes when the shell is ready, and a section that arrives later needs its own flush. Here the CSS is part of what a component renders, so it arrives in the same chunk as the markup it styles:

```tsx
import Flex from '@box-kite/react/components/flex';
import { H2, P } from '@box-kite/react/components/semantics';
import { Suspense } from 'react';

async function fetchTotals() {
  await new Promise((resolve) => setTimeout(resolve, 700));

  return { revenue: '€48,200', orders: 1204 };
}

async function Totals() {
  const totals = await fetchTotals();

  return (
    <Flex d="column" gap={1} p={6} borderRadius={3} b={1} borderColor="emerald-500">
      <H2 fontSize={18} fontWeight={600}>
        {totals.revenue}
      </H2>
      <P fontSize={14} color="slate-600">
        from {totals.orders} orders this month
      </P>
    </Flex>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={<P color="slate-500">Loading totals…</P>}>
      <Totals />
    </Suspense>
  );
}
```

The example app in the repository has a section like this behind a 700 ms wait. Its smoke test checks the served HTML: the fallback, the late markup and the late section's own rule are all in the response. A style element that arrives after the shell is streamed disabled (`media="not all"`), and React turns it on when it reveals the boundary, so the late section never shows unstyled.

## Themes without a provider

A provider can't run on the server, but a theme doesn't need one. In Box Kite a theme rule is scoped to an ancestor carrying the theme's class. The server decides the theme by putting that class on `<html>`:

```tsx
import type { ReactNode } from 'react';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark" data-theme="dark">
      <body>{children}</body>
    </html>
  );
}
```

Every `theme={{ dark: … }}` below it applies from the first paint. Switching later means changing that one class in the browser, which re-renders nothing. [Dark mode without the flash](https://www.box-kite.dev/blog/dark-mode-without-the-flash) covers the rest: the reader's own preference, a stored choice, and the few lines that run before the first paint.

## Client components: one line, once

Most apps still have interactive parts. A client component resolves the *client* build of Box, which by default writes its rules through the CSSOM after hydration. That works, but it means the server-rendered HTML of an island would arrive without its CSS. One module puts the island on the same path as the server:

```tsx
'use client';
import Box from '@box-kite/react';

Box.configure({ sink: 'element' });
```

Import it from your client components, and an island's rules are in the HTML before it hydrates, under the same class names the server used.

The ready-made components split the same way. `Flex`, `Grid`, `Button`, `Textbox`, the headings and the other semantic elements, the SVG elements and `Icon` call no hook, so a Server Component renders them with their CSS. Those that hold state, such as `Dialog`, `Menu`, `Tabs` or `DataGrid`, ship with a `'use client'` banner. Importing one into a Server Component opens a client boundary rather than failing the build.

## The honest limits

- **It is runtime CSS-in-JS on the server.** About 11 µs per Box in the measurement above. That's small next to a database call, but it isn't zero, and a page of thousands of different elements will notice.
- **The CSS isn't a cached file.** It travels with every HTML response: about 9 KB more than a CSS module at 1,000 cards, gzipped, and the base stylesheet on every page.
- **React 19 only.** Hoisting `<style href precedence>` arrived in React 19. On React 18, keep the default mode, which writes to a stylesheet from the client.
- **`Box.Theme` and hover-callback children stay on the client.** They need state. The theme *rules* work on the server, as shown above.
- **Your own CSS wins.** Every Box rule sits in a cascade layer, so an unlayered stylesheet of yours overrides it. That's usually what you want, but it surprises people who expect props to win.

## Try it

- [React Server Components](https://www.box-kite.dev/server-components) is the reference for this mode, including server rendering without Server Components.
- `examples/next-app` in the [repository](https://github.com/box-kite/box-kite) is the App Router app the checks above run against: a streamed section, a client island, a theme toggle and a page of the ready-made components.
- `npm install @box-kite/react`, then import `Flex` into a page that has no `'use client'`.
