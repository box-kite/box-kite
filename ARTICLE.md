# Why I Chose TypeScript Over Tailwind and Built My Own React Styling Library

My name is Maxim. I've been a full-stack software engineer for my entire career. And on June 4, 2022, I made an initial commit to a repo called `react-box`.

I wasn't planning to build an open source library. I was deep in a project, writing React components day after day, and I kept noticing the same pattern: I'd build a component, then go create a CSS file for it. Or wrap it in `styled-components`. Or write a long chain of Tailwind classes. Every time, I felt like I was leaving TypeScript's world — the world where my editor knows everything, catches my mistakes, and guides me — to enter a world of strings where anything goes and nothing is checked.

So I started extracting something. Not for GitHub stars. Not for a product launch. Just because I was tired of repeating myself. That extraction became [@box-kite/react](https://github.com/box-kite/box-kite) — a React component library where every CSS property is a typed prop.

---

## Why Not Tailwind?

I want to be clear: Tailwind is a great tool. It solved a real problem for millions of developers, and I respect that.

But here's the thing — I was already living inside TypeScript. My IDE already knew my types. It autocompleted my function arguments, caught typos at compile time, and told me when I passed the wrong value. So why, the moment I needed to style something, was I suddenly writing untyped strings in a `className` attribute?

Tailwind turns CSS into utility classes. I wanted to turn CSS into typed function arguments.

Here's the difference in practice:

```tsx
// Tailwind approach
<div
  className="flex items-center gap-4 p-6 bg-indigo-500
  text-white rounded-lg hover:bg-indigo-600
  md:p-8 md:gap-6"
>
  Content
</div>
```

```tsx
// Box Kite approach
<Flex ai="center" gap={4} p={6} bgColor="indigo-500" color="white" borderRadius={8} hover={{ bgColor: 'indigo-600' }} md={{ p: 8, gap: 6 }}>
  Content
</Flex>
```

In the second version, every prop name and every value gets autocomplete. If I type `bgColor="indgo-500"` — that's a compile error. Hover states and responsive breakpoints are structured objects, not string prefixes. TypeScript understands the whole thing.

I didn't choose this path because Tailwind is wrong. I chose it because TypeScript was already there, and it felt wrong not to use it.

---

## The Anatomy of Box

At the heart of the library is a single component called `Box`. It accepts 215 CSS properties as typed props and renders any HTML element you need.

The simplest usage looks like this:

```tsx
import Box from '@box-kite/react';

<Box p={4} bgColor="blue-500" color="white" borderRadius={8}>
  Hello World
</Box>;
```

No CSS file. No styled-components setup. No theme provider required. Just import and go. That `p={4}` becomes `padding: 1rem` (16px) — the library uses a divider system where spacing values divide by 4 to produce rem units, so you think in a consistent 4px grid.

But you don't use raw `Box` for everything. The library ships with semantic components that map to the right HTML elements:

```tsx
import Flex from '@box-kite/react/components/flex';
import Button from '@box-kite/react/components/button';
import { H1, P } from '@box-kite/react/components/semantics';

<Flex d="column" gap={4}>
  <H1 fontSize={32} fontWeight={700}>
    Welcome
  </H1>
  <P color="gray-600">Build UIs with type-safe props.</P>
  <Button hover={{ bgColor: 'indigo-700' }}>Get Started</Button>
</Flex>;
```

`Flex` renders a `div` with `display: flex`. `H1` renders an `h1`. `Button` renders a `button`. Each one accepts the full set of Box props with complete TypeScript support. There are 17 semantic HTML wrappers — `H1` through `H6`, `P`, `Span`, `Nav`, `Header`, `Footer`, `Link`, `Img`, and more.

Now here's where it gets interesting. Hover states, responsive breakpoints, and dark theme styles all compose as nested objects:

```tsx
<Box
  p={4}
  bgColor="white"
  hover={{ bgColor: 'gray-100' }}
  md={{ p: 8, hover: { bgColor: 'gray-200' } }}
  theme={{
    dark: {
      bgColor: 'gray-900',
      hover: { bgColor: 'gray-800' },
    },
  }}
/>
```

This is a single component that handles base styles, hover state, medium breakpoint, medium breakpoint hover, dark theme, and dark theme hover — all as a typed, nested object. No string concatenation. No utility class combinations to memorize. TypeScript tells you what's valid at every nesting level.

---

## Under the Hood

The styling engine works differently from what you might expect. When you write `p={4}`, the library doesn't set an inline style. Instead, it generates a short CSS class name (like `._2a`) and a corresponding CSS rule (`._2a { padding: 1rem }`), then injects it directly into the browser's CSSOM using `CSSStyleSheet.insertRule()`. Not `innerHTML` — direct stylesheet manipulation.

The key insight is **deduplication**. If 50 components across your app all use `p={4}`, there's still only one CSS rule. An internal `IdentityFactory` ensures each unique value gets exactly one class. Your stylesheet stays small no matter how many components you have.

The library ships with 286 color variables (Tailwind's OKLCH palette, twenty-six families), but they're loaded lazily. Navigate to a page that uses `violet-500` for the first time? The CSS variable gets injected on the fly. Colors you never use never touch the DOM.

And there's no build step for styles. It works with Vite, Webpack, Next.js — whatever you use. `npm install @box-kite/react` and you're done. The entire main Box component is 99 lines of code.

---

## Making It Yours

The library is designed to be extended, not forked. `Box.extend()` lets you add custom CSS variables and new props:

```tsx
import Box from '@box-kite/react';

Box.extend(
  { 'brand-primary': '#ff6600' }, // Custom CSS variables
  {}, // New props
  {
    bgColor: [
      {
        values: ['brand-primary'] as const,
        styleName: 'background-color',
        valueFormat: (value, getVar) => getVar(value),
      },
    ],
  },
);

// Now this works with full autocomplete:
<Box bgColor="brand-primary" />;
```

And `Box.components()` lets you define design system components with variants:

```tsx
Box.components({
  card: {
    styles: { display: 'flex', d: 'column', p: 4, borderRadius: 8, shadow: 'medium' },
    variants: {
      bordered: { b: 1, borderColor: 'gray-200', shadow: 'none' },
      elevated: { shadow: 'large' },
    },
  },
});

<Box component="card" variant="bordered">
  Content
</Box>;
```

You get a type-safe component system on top of a type-safe styling system. The theme system supports light/dark mode with auto-detection from system preferences, and you can scope theme styles to individual components or apply them globally.

Over time, I also built higher-level components: a full `DataGrid` with sorting, filtering, column grouping, row selection, and virtualization. A `Dropdown` with multi-select. A `Tooltip` that uses portals to escape overflow containers. Each one is a separate entry point for tree-shaking — you only ship what you use.

---

## Teaching AI to Use It

Here's something I didn't expect to build: an AI context document.

In 2025, I realized that a growing share of code in my projects was being written by AI assistants. And they kept getting my library wrong — using inline styles instead of Box props, writing `<Box tag="button">` instead of `<Button>`, confusing the numeric formatters (fontSize divides by 16, spacing divides by 4).

So I wrote [BOX_AI_CONTEXT.md](https://github.com/box-kite/box-kite/blob/main/src/BOX_KITE_AI_CONTEXT.md) — a comprehensive reference document that ships with the npm package. It contains every prop, every formatter rule, every "do this, not that" pattern. It starts with the two most common AI mistakes in bold: **never use inline styles** and **always use component shortcuts**.

Not many npm packages ship with AI-readable documentation as a first-class feature. But in 2026, if your library doesn't explain itself to AI, half the code written against it will be wrong. I'd rather teach the machine once than fix its output every time.

---

## The Numbers

These are the numbers behind the library:

- **First commit**: June 4, 2022
- **Latest commit**: February 2026
- **300** commits
- **169** published versions on npm
- **215** CSS properties
- **99** lines in the main Box component
- **1,364** lines in the core style definitions
- **17** semantic HTML wrappers
- Current version: **3.1.10**

These are small numbers by any measure. This isn't React or Next.js. But every one of those 300 commits is mine, and every one of those 169 releases solved a real problem I was having in a real project.

---

## Does It Make Sense?

I'll be honest — I don't know if anyone will use this. In a world where Tailwind dominates and AI writes more code every day, maybe the tool you use to style components matters less than ever. Maybe more.

But I know this: I built something that solved my problem. I extracted it from my daily work, documented it, published it 169 times, and wrote an AI context document so that even the machines could understand it. I made it open source not because I expect stars, but because that's what you do when you build something useful — you share it.

There's a special kind of freedom in building your own tools. You make every decision. You own every trade-off. You don't wait for a PR to be approved by a framework team. You just build the thing the way you think it should work, and then you use it every day to see if you were right.

Sometimes you were. Sometimes you ship version 170 to fix what version 169 got wrong. And that's fine. That's the work.

If you're curious, take a look:

- Website: [box-kite.dev](https://www.box-kite.dev/)
- GitHub: [github.com/box-kite/box-kite](https://github.com/box-kite/box-kite)
- npm: [@box-kite/react](https://www.npmjs.com/package/@box-kite/react)

Or don't. Just go build something of your own. That's the whole point.

---

_Tags: #react #typescript #css #opensource_
