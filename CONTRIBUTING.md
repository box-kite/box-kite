# Contributing to @box-kite/react

A comprehensive guide for senior software engineers contributing to this runtime CSS-in-JS library.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Project Structure](#project-structure)
3. [The core boundary](#the-core-boundary)
4. [Core Concepts](#core-concepts)
5. [CSS Generation Engine](#css-generation-engine)
6. [Theme System](#theme-system)
7. [Development Workflow](#development-workflow)
8. [Adding New CSS Properties](#adding-new-css-properties)
9. [Creating Components](#creating-components)
10. [Type System](#type-system)
11. [Testing](#testing)
12. [Build & Publishing](#build--publishing)

---

## Architecture Overview

Box Kite is a **runtime CSS generation library** that converts React component props into CSS classes. Key architectural decisions:

- **No CSS files**: All styles are generated at runtime and injected into `<style id="box-kite-styles">` in `document.head` (`#box-kite-portal` is the portal container, a different element)
- **Single class per value**: If the same prop value (e.g., `p={3}`) is used in multiple components, only ONE CSS class is generated
- **TypeScript-first**: Deep type extraction provides full IDE autocomplete for all valid prop combinations
- **Memoized rendering**: Box component uses `React.memo` and `forwardRef` for optimal performance

### Data Flow

```
Box props → useStyles() → useComponents() → StylesContext → CSS injection → DOM
     ↓
 Component styles merged with props
     ↓
 Class names generated via IdentityFactory
     ↓
 CSS rules grouped by breakpoint/pseudo-class weight
     ↓
 Injected into <style> tag
```

---

## Project Structure

```
box-kite/
├── src/                          # Library source (published to npm)
│   ├── box.ts                    # Main Box component (entry point)
│   ├── a11y.ts                   # Behaviour primitives (`@box-kite/react/a11y`)
│   ├── core.ts                   # The engine with no React (`@box-kite/core`)
│   ├── rsc.ts                    # Box for Server Components (the `react-server` entry, hook-free)
│   ├── types.ts                  # TypeScript type exports
│   ├── ssg.ts                    # Server-side rendering support (entry point)
│   │
│   ├── core/                     # Core styling engine — ZERO react imports (enforced)
│   │   ├── boxStyles.ts          # CSS property definitions (215 props)
│   │   ├── boxStylesFormatters.ts # Value formatters (px, rem, etc.)
│   │   ├── variables.ts          # Where a value becomes a variable: the registry, bgImages, shadows
│   │   ├── palette.ts            # Tailwind's OKLCH palette (26 families) + the `token/alpha` grammar
│   │   ├── containers.ts         # The `cq` key grammar: sizes, complements, named containers
│   │   ├── gradients.ts          # The `bgGradient` record grammar: kinds, stops, interpolation
│   │   ├── shadows.ts            # The four stacking shadow layers and the Tailwind elevation scales
│   │   ├── filters.ts            # The nine filter functions, stacked the same way, on filter and backdrop-filter
│   │   ├── classNames.ts         # Conditional className utility
│   │   ├── coreTypes.ts          # Core TypeScript types (framework-free)
│   │   ├── boxConstants.ts       # Constants (REM divider, etc.)
│   │   ├── hash.ts               # stableHash(): content-addressed class names and style hrefs
│   │   │
│   │   ├── engine/               # The engine instance
│   │   │   ├── styleEngine.ts    # createStyleEngine(): all engine state
│   │   │   ├── styleSink.ts      # Where the CSS goes (cssom/textContent/string/element)
│   │   │   ├── flushScheduler.ts # When pending rules reach the sink
│   │   │   └── defaultEngine.ts  # The lazily-created default instance
│   │   │
│   │   ├── extends/              # Extension system
│   │   │   ├── boxExtends.ts     # Box.extend() and Box.components()
│   │   │   ├── boxComponents.ts  # Default component styles
│   │   │   └── useComponents.ts  # Component style resolution (pure, no hooks)
│   │   │
│   │   └── theme/                # Theme system, platform half
│   │       ├── themeRuntime.ts   # prefers-color-scheme, storage, DOM writes
│   │       └── themeController.ts # The provider's state machine, with no framework
│   │
│   ├── react/                    # The React adapter — everything React-specific
│   │   ├── useStyles.ts          # The binding: class names in render, flush in an effect
│   │   ├── effects.ts            # Which effect runs where (insertion/layout/passive)
│   │   ├── resolveStyles.ts      # The same resolution with no hook (what src/rsc.ts renders with)
│   │   ├── styleElements.ts      # Descriptors → <style href precedence> elements (React 19)
│   │   ├── boxProps.ts           # The prop shape both Box builds share
│   │   ├── boxTagProps.ts        # Props → HTML tag attributes (hook-free)
│   │   ├── reactTypes.ts         # React-only type helpers (ExtractElementFromTag)
│   │   │
│   │   ├── theme/                # Theme system, React half
│   │   │   ├── theme.tsx         # Box.Theme provider component
│   │   │   └── themeContext.ts   # React context
│   │   │
│   │   ├── hooks/                # React hooks shared by components
│   │   │   ├── useVisibility.ts
│   │   │   ├── usePortalContainer.ts
│   │   │   └── useVirtualization.ts
│   │   │
│   │   └── a11y/                 # Behaviour primitives — see docs/a11y-primitives.md
│   │       ├── useControllableState.ts # Controlled/uncontrolled state with change reasons
│   │       ├── useDismiss.ts     # Escape + outside pointer, composable layers
│   │       ├── useFocusReturn.ts # Focus back to the invoker when a layer closes
│   │       ├── useRovingFocus.ts # Arrow keys, Home/End, typeahead; DOM or virtual focus
│   │       ├── useIdentifier.ts  # Stable ids for aria-labelledby/-controls wiring
│   │       └── callbacks.ts      # Stable handler identity (useLatest, useEventCallback)
│   │
│   ├── components/               # Pre-built components
│   │   ├── button.tsx
│   │   ├── checkbox.tsx
│   │   ├── dropdown.tsx
│   │   ├── textbox.tsx
│   │   ├── textarea.tsx
│   │   ├── radioButton.tsx      # One native radio, with the <label> the pattern needs
│   │   ├── radioGroup.tsx        # The APG radio group: the role, the shared name, the arrows
│   │   ├── switch.tsx            # role="switch" over the same input Checkbox renders
│   │   ├── tooltip.tsx           # The APG tooltip, assembled from the a11y primitives
│   │   ├── overlay.tsx           # Its positioning half: a portal at the place it is declared
│   │   ├── form.tsx
│   │   ├── flex.tsx
│   │   ├── grid.tsx
│   │   ├── visuallyHidden.tsx    # Screen-reader-only content (clipped, not hidden)
│   │   ├── semantics.tsx         # Semantic HTML components
│   │   ├── baseSvg.tsx           # Deprecated: Svg with the 24×24 icon preset
│   │   ├── svg.tsx               # One component per SVG element
│   │   ├── icon.tsx              # Box props on an icon from somebody else's set
│   │   └── dataGrid/             # Complex DataGrid component
│   │
│   ├── icons/                    # SVG icon components
│   │
│   └── utils/                    # Utility functions
│       ├── environment/          # Is there a DOM, and what may I touch? (framework-free)
│       ├── dom/                  # Ref/element unwrapping, "did this event happen inside that"
│       ├── box/boxUtils.ts
│       ├── object/objectUtils.ts
│       ├── form/
│       ├── string/
│       ├── fn/
│       └── memo.ts
│
├── pages/                        # Demo/documentation website
│
├── examples/
│   ├── vanilla/                  # The engine with no framework (npm run dev:vanilla)
│   └── next-app/                 # Box in a Server Component (npm run build:next-app)
│
├── vite.config.ts                # Library build config
├── pages.vite.config.ts          # Pages build config
├── tsconfig.json                 # TypeScript config
└── eslint.config.js              # ESLint config
```

---

## The core boundary

`src/core/**` contains **zero** `react` imports, and CI fails if that ever stops being true.

The split is not cosmetic. The engine — prop definitions, formatters, class-name generation, the
rule registry, the sinks, the flush scheduler, the variables, the theme runtime — has no idea a
component tree exists. It is the future `@box-kite/core` package, it already ships as the
`@box-kite/core` entry (`src/core.ts`), and it is what makes the library embeddable in
places React is not: a vanilla-DOM page, an iframe widget, another framework's adapter, a
build-time compiler. `examples/vanilla` is that claim as a running page.

| Layer               | Path                                                     | May import React?                         |
| ------------------- | -------------------------------------------------------- | ----------------------------------------- |
| Core engine         | `src/core/**`, `src/core.ts`, `src/types.ts`             | **No** — enforced, and its own package    |
| React binding       | `src/react/**`, `src/box.ts`, `src/rsc.ts`, `src/ssg.ts` | Yes (`src/rsc.ts`: no hooks — see below)  |
| Components, icons   | `src/components/**`, `src/icons/**`                      | Yes                                       |
| Shared utils, types | `src/utils/**`, `src/types.ts`                           | No — the engine reaches them, so enforced |

Five things enforce it, because one is not enough:

1. **ESLint** — a `no-restricted-imports` block scoped to `src/core/**` (see `eslint.config.js`,
   next to the identical rule that keeps the DataGrid models headless).
2. **`npm run check:boundaries`** (`scripts/check-core-boundary.mjs`) — catches what ESLint cannot
   see: `require()`, dynamic `import()`, a `.tsx` file, and React's _global_ namespace. That last
   one is the reason this script exists: `React.JSX.IntrinsicElements` needs no import at all, so
   `ExtractElementFromTag` sat in `core/coreTypes.ts` for years without a single lint error. It now
   lives in `src/react/reactTypes.ts`. It checks the directory _and_ everything `src/core.ts`
   actually reaches (`scripts/moduleGraph.mjs`), which is how `src/utils/**` and `src/types.ts`
   come under the rule — they are outside `src/core/` but the engine imports them.
3. **`scripts/check-rsc-boundary.mjs`**, run by the same command — the mirror image of the rule
   above: the `react-server` entry (`src/rsc.ts`) may import React, but nothing in its graph may
   call a _client_ hook. See "Element mode and cascade layers". It checks the pre-built components
   the same way, one list at a time (`SERVER_SAFE_COMPONENTS` / `CLIENT_ONLY_COMPONENTS` in
   `scripts/moduleGraph.mjs`), and in both directions: a server-safe component that grows a hook
   fails, and so does a client-only one that no longer needs its banner. A component in neither
   list fails too — being in neither is how bug #43 shipped.
4. **`scripts/postbuild.mjs`** — the same rules on the built output, which is where a bundler can
   quietly undo them. It loads `dist` under `--conditions=react-server` — the main entry _and_
   every server-safe component, by the specifier a consumer writes, so the `exports` map is part of
   the test; it checks that the client-only components carry a `'use client'` banner and that the
   server-safe ones do not; and it walks the chunks `core.mjs`/`core.cjs` import and fails if any
   of them names `react`. All of it has been needed: the chunk split was once derived from the
   `react-server` graph alone, so the theme runtime — which no Box reaches — landed in the client
   chunk that `/core` then imported.
5. **The two example apps**, both built by CI. `examples/vanilla` compiles the engine with no
   framework loaded at all (`npm run build:vanilla`); `examples/next-app` installs the packed
   tarball into a real Next.js App Router app, so a hook in the `react-server` graph — or an export
   condition that stopped resolving — fails `next build`, and `npm run smoke:next-app` then asserts
   on the HTML that server actually serves. Its `/components` route is a Server Component that
   imports the pre-built components directly; `app/page.tsx` is the same claim for Box itself.

The same command prints the adapter ratio published in the README:

```
✔ src/core and everything src/core.ts reaches are framework-free (23 files, 5702 lines, zero React references)
  React binding: 14 files, 573 lines — 9.1% of core + binding
  React feature hooks: 12 files, 911 lines (shared by components, outside the binding)
✔ src/rsc.ts renders with no client hooks (27 modules in its graph)
✔ 12 pre-built components render on a server; 9 are client-only and say so
```

### The chunk split

`vite.config.ts` derives the shared chunks from those same two graph walks, so a new module
cannot be classified one way by the checks and another by the bundler:

| Chunk          | What is in it                                                                                          | Who imports it                                    |
| -------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------- |
| `engine`       | **a tripwire, and empty when the split is intact**: anything `src/core.ts` reaches that leaked in      | nothing — `postbuild.mjs` fails if it exists      |
| `react-shared` | hook-free React modules, plus what only a server-safe component uses                                   | `box`, `rsc`, components                          |
| `behavior`     | `src/react/a11y/**` — the primitives, React and nothing else                                           | `a11y`, and the components A3+ build on them      |
| `platform`     | `src/utils/environment/**`, `src/utils/dom/**` — is there a DOM, and did this event happen inside that | every group, engine included                      |
| `effects`      | `src/react/effects.ts` — which effect to use in this environment                                       | `client`, `behavior`                              |
| `forms`        | `src/react/forms/**` — the `<label>` the form controls share                                           | `checkbox`, `radioButton`, `radioGroup`, `switch` |
| `client`       | hooks, effects, the theme provider                                                                     | `box`, the client-only components                 |

`core.mjs` imports `engine` and nothing else; `rsc.mjs` may not import `client`, and neither may a
server-safe component — which is why `serverSafeModules()`, not the `react-server` walk alone,
decides what `react-shared` holds. (`StringUtils`, which only `semantics` reaches, is the module
that made the difference.)

`platform` and `effects` are the leaves everything else shares: the environment guards
("is there a `document`?"), the DOM containment check behind every click-outside, and the choice
between an insertion, layout and passive effect. A module lives in exactly one chunk, so leaving
them to fall where they would — `platform` is framework-free, so `engine`; `effects` names React,
so `client` — would mean `behavior` importing the whole engine to ask whether there is a document.
They are split for the same reason `behavior` is, one level down. `platform` must stay React-free
(the `/core` entry reaches it), which is why the effect helpers cannot share its chunk. The cost is
visible and small: two extra chunk boundaries put ~0.2 KB gz back onto the main entry.

A module only **one** component entry reaches is not grouped at all: `componentPrivateModules()`
lists them and the split returns `null`, so rolldown inlines each into that component's own chunk.
Every group above is imported by something everybody imports, so a private leaf landing in one is
paid for by consumers who cannot reach it — the sparkline geometry classified into `react-shared`
put ~0.9 KB gz of arithmetic into `box.mjs`, `rsc.mjs` and the DataGrid alike. It is a rule rather
than a fourth hand-maintained group because the same trap had already caught the engine (inside
`client`) and `forms` (inside `react-shared`), and applying it took the DataGrid's icons and the
form utilities out of the shared chunks too: the main entry lost 0.5 KB gz it had been carrying for
components it never loads.

`behavior` is a group for a different reason — not correctness but weight. The primitives are
client code and were correct inside `client`, but that made `@box-kite/react/a11y` import the
chunk holding the styling binding and the theme provider: 17.8 KB gzipped for a consumer who wanted
`useDismiss` alone. Split out, the entry is 2.2 KB and reaches no engine at all. `npm run size` is
what notices this; the budget is per entry for exactly that reason.

`forms` is a group for a third reason: it is the one shared module that imports a _component_
entry (`Flex`). Left in `react-shared` — which is where a module the server-safe components reach
otherwise lands — that edge is a cycle, since those same components import `react-shared` back. It
showed up as `semantics.mjs` reading `StringUtils` before it was defined, and would also have put
a component inside the `react-server` entry's own graph.

### How a component reaches Box

A published component chunk cannot import `../box.mjs`. A relative path bypasses the `exports`
map, so the `react-server` condition never applies and a Server Component importing `Flex` was
handed the _client_ Box — which calls `createContext` at import time, an export the server build
of React does not have. `next build` died with `createContext is not a function`, naming neither
the component nor the fix (bug #43).

So the server-safe components import the package by its own name instead: `vite.config.ts` has a
`resolveId` plugin (`box-self-reference`) that turns their `../box` edge into an external
`@box-kite/react`. The consumer's bundler then resolves it under its own conditions, and the
same `flex.mjs` gets the hook-free Box in a server graph and the client Box in a client one. The
graph walk mirrors this: `componentGraph()` stops at `src/box.ts` and records the package name,
because what lies beyond that edge is not ours to decide.

The client-only components keep the relative path — their `'use client'` banner pins them to the
client graph, where it is already correct. `CLIENT_ONLY_ENTRIES` in the same file says which whole
_entries_ get the banner for the same reason: `a11y` is hooks and effects from top to bottom, so a
Server Component importing `useDismiss` should open a client boundary rather than fail to resolve
`useRef`. The banner is added at `renderChunk` rather than written in the source: a directive in a `.tsx` file makes rolldown, and every consumer's Rollup, warn about
module-level directives on every build, and the sources are also what the demo site and the tests
import, where the directive means nothing.

If the client build ends up in a server graph anyway — a deep import, a bundler without the
condition — `src/react/clientRuntime.ts` turns it into a sentence naming the cause and the fix,
from the first client-only API the entry touches (`createContext`, in `themeContext.ts`).

### Where does my new code go?

- Generating CSS, naming a class, ordering a rule, formatting a value → `src/core/`. If it is
  something a non-React consumer should be able to call, export it from `src/core.ts` too.
- Touching the DOM without a component (`document`, `matchMedia`, `localStorage`) → still
  `src/core/`; DOM is not React. Guard for its absence so a server render can call it (see
  `core/theme/themeRuntime.ts`, `core/engine/styleSink.ts`).
- Hooks, context, JSX, anything typed in React's own types → `src/react/`.
- Something the Server-Component Box also needs → `src/react/`, in a module that calls no hook
  (`resolveStyles.ts`, `styleElements.ts`, `boxTagProps.ts`). Hook-using code stays in a module
  `src/rsc.ts` never reaches.
- If a core module seems to _need_ a hook, it needs an injectable policy instead. That is how
  flushing works: core owns `scheduleFlush()`, and the React binding supplies the timing from
  `useInsertionEffect` (`core/engine/flushScheduler.ts`).

---

## Core Concepts

### 1. CSS Property Definitions (boxStyles.ts)

Each CSS property is defined as an array of `BoxStyle` objects:

```typescript
// src/core/boxStyles.ts
export const cssStyles = {
  /** The padding shorthand CSS property */
  p: [
    {
      values: 0,                          // Accepts any number
      styleName: 'padding',               // CSS property name
      valueFormat: BoxStylesFormatters.Value.rem,  // How to format value
    },
  ],

  /** Values can be string literals for restricted options */
  display: [
    {
      values: ['block', 'flex', 'inline', 'grid', 'none', ...] as const,
    },
  ],

  /** Multiple CSS properties from single prop */
  bx: [
    {
      values: 0,
      styleName: 'border-inline-width',   // Single string or array
      valueFormat: BoxStylesFormatters.Value.px,
    },
  ],

  /**
   * A definition can also write the whole rule body itself, for a prop whose declaration *names*
   * come out of its value. `vars` is the only one: a record, so `styleName` could not hold the
   * names, and `match` decides entry by entry what is safe to write into a rule.
   */
  vars: [
    {
      values: {} as Variables.CustomProperties,
      match: Variables.isCustomProperties,
      declarations: Variables.customProperties,   // → '--color-x:var(--sky-500);--gap:4px'
    },
  ],
};
```

### 2. Value Formatters (boxStylesFormatters.ts)

Formatters convert prop values to CSS values:

```typescript
// src/core/boxStylesFormatters.ts
export namespace BoxStylesFormatters {
  export namespace Value {
    export const rem = (v: number) => `${v / DEFAULT_REM_DIVIDER}rem`;
    export const px = (v: number) => `${v}px`;
    export const fraction = (v: string) => {
      /* '1/2' → '50%' */
    };
    export const gridColumns = (v: number) => `repeat(${v}, minmax(0, 1fr))`;
  }
}
```

### Understanding Numeric Prop Values

**Important**: Most numeric props use specific formatters that transform the value. Understanding these transformations is critical for choosing correct values.

| Prop Type                       | Formatter | Divider | Example            | CSS Output                    |
| ------------------------------- | --------- | ------- | ------------------ | ----------------------------- |
| Spacing (`p`, `m`, `gap`, etc.) | rem       | 4       | `p={4}`            | `padding: 1rem` (16px)        |
| Font size (`fontSize`)          | rem       | **16**  | `fontSize={14}`    | `font-size: 0.875rem` (≈14px) |
| Border width (`b`, `bx`, `by`)  | px        | -       | `b={1}`            | `border-width: 1px`           |
| Width/Height (numeric)          | rem       | 4       | `width={20}`       | `width: 5rem` (80px)          |
| Border radius (`borderRadius`)  | px        | -       | `borderRadius={8}` | `border-radius: 8px`          |

**Common mistake**: Using small values for `fontSize` like `fontSize={3}` results in `3/16 = 0.1875rem ≈ 3px` - nearly invisible text!

**Practical fontSize values**:

- `fontSize={12}` → 0.75rem ≈ 12px (small text)
- `fontSize={14}` → 0.875rem ≈ 14px (body text)
- `fontSize={16}` → 1rem = 16px (default)
- `fontSize={18}` → 1.125rem ≈ 18px (large text)
- `fontSize={24}` → 1.5rem = 24px (heading)

**Practical spacing values** (divider is 4, so value × 4 = pixels):

- `p={1}` → 0.25rem = 4px
- `p={2}` → 0.5rem = 8px
- `p={3}` → 0.75rem = 12px
- `p={4}` → 1rem = 16px

### 3. CSS Variables (variables.ts, palette.ts)

Every value that becomes a CSS custom property. The colours live in `palette.ts` — Tailwind's OKLCH
palette, twenty-six families of eleven steps, packed one string per family and expanded at load because
the table ships in every bundle. It owns the `token/alpha` grammar too (`bgColor="blue-500/40"`), since
that is knowledge about colours rather than about the registry:

```typescript
// src/core/palette.ts
const families = {
  red: '97.1 .013 17.4,93.6 .032 17.7,…', // L C H per step, in `steps` order
  // ... twenty-five more
};

export const colors = expand(); // { 'red-500': 'oklch(63.7% .237 25.3)', … } plus the keywords

// src/core/variables.ts — where a value becomes a *variable*
namespace Variables {
  export const colors = Palette.colors;

  export const percentages = {
    '1/2': '50%',
    '1/3': '33.333333%',
    // ...
  };

  export function getVariableValue(name: string): string;
  export function setUserVariables(vars: Record<string, string>): void;
}
```

### 4. Pseudo-Classes & Breakpoints

Pseudo-classes have **weights** for CSS specificity:

```typescript
// src/core/boxStyles.ts
export const pseudoClassesWeight = {
  hover: 1,
  focus: 2,
  active: 4,
  disabled: 8,
  checked: 16,
  indeterminate: 32,
  required: 64,
  selected: 128,
  // ...
};

export const breakpoints = {
  sm: 640, // @media (min-width: 640px)
  md: 768,
  lg: 1024,
  xl: 1280,
  xxl: 1536,
};
```

Usage in components:

```tsx
<Box p={2} hover={{ bgColor: 'gray-100' }} sm={{ p: 4 }} md={{ p: 6, hover: { bgColor: 'gray-200' } }} />
```

### 5. Component System (boxComponents.ts)

Pre-defined component styles with variants:

```typescript
// src/core/extends/boxComponents.ts
const boxComponents = {
  button: {
    styles: {
      display: 'inline-flex',
      bgColor: 'violet-500',
      p: 3,
      hover: { bgColor: 'violet-600' },
      disabled: { cursor: 'not-allowed', bgColor: 'violet-50' },
    },
    variants: {
      primary: { bgColor: 'blue-500' },
      secondary: { bgColor: 'gray-500' },
    },
    children: {
      icon: { styles: { width: 4 } },
    },
  },
};
```

Usage:

```tsx
<Box component="button" variant="primary" />
<Box component="button.icon" />
```

### 6. Extension System

Users extend the library via `Box.extend()` and `Box.components()`:

```typescript
// User's boxExtends.ts
export const { extendedProps, extendedPropTypes } = Box.extend(
  // Custom CSS variables
  { 'brand-primary': '#ff6600' },

  // New props
  {
    customProp: [{ values: ['a', 'b'] as const, styleName: 'custom-property' }],
  },

  // Extend existing props with new values
  {
    bgColor: [{ values: ['brand-primary'] as const }],
  },
);

// User's boxComponents.ts
Box.components({
  button: {
    styles: { bgColor: 'brand-primary' },
  },
});
```

Both calls **accumulate**: an app can call them once per feature module and a later call keeps
everything the earlier ones registered (a later call still wins on the same key). Variables declared
through `Box.extend()` are usable as values on every prop whose values resolve to a CSS variable —
colours, background images and shadows — so `bgColor="brand-primary"` works from the declaration
alone. Declaring the value on the prop as well (the third argument above) is what makes TypeScript
accept it. The merge semantics are pinned down in `src/core/engine/mergeSemantics.test.ts`.

The third way out is the `css` prop (`src/core/css.ts`): a style object for a property the registry
lacks, compiled into a class through the same pipeline — an escape hatch from the _typed set_, never
from the engine, which is why it nests, dedupes and renders on a server like any prop. Three things
about it are deliberate. It is the **last** key in `cssStyles`, so its rule sorts after every typed
prop's and wins the property both name on one element. Its value grammar is `vars`'
(`Variables.isUsableValue`, `Variables.colorValue`), so there is one rule for a value that reaches a
rule unformatted, and a colour token stays themed. And its types are `csstype`'s `Properties` — the
one dependency `src/core` carries, types only, nothing at runtime — so a misspelt property is a
compile error and `width: 100` is refused where `zIndex: 3` is not, because a number is written out as
it stands.

---

## CSS Generation Engine

### Incremental CSS Injection (core/engine/)

All engine state lives on an instance built by `createStyleEngine()` (`src/core/engine/styleEngine.ts`);
`useStyles` and the public API delegate to one lazily-created default instance
(`src/core/engine/defaultEngine.ts`). Rules are generated incrementally, never by replacing the
whole stylesheet:

```typescript
// src/core/engine/styleEngine.ts
const { classNames } = engine.resolveClassNames(props, isSvg); // during render — queues rules
engine.flushSync(); // pending rules → the sink, now
```

Key mechanisms:

1. **Rule tracking**: Each unique prop combination generates a class name via `IdentityFactory`
2. **Deduplication**: Same prop values across components share the same CSS class
3. **Batched insertion**: Styles accumulated during render, flushed once per commit
4. **Weight-based ordering**: Rules sorted by pseudo-class weight for correct specificity
5. **Selector escaping**: A class name is used verbatim as a selector, so characters a CSS
   identifier cannot hold are escaped (`width="1/2"` → class `width-1/2`, selector `.width-1/2`)

### Flush Scheduling (core/engine/flushScheduler.ts)

Resolving class names only _queues_ the rules behind them; a **`FlushScheduler`** decides when the
queue is drained. The engine calls `scheduleFlush()` itself whenever it queues something (a rule, or
a variable read through `Box.getVariableValue()`), so no caller can leave CSS unflushed, and
`flushSync()` always writes on the spot. The coordinator coalesces: any number of `scheduleFlush()`
calls in one turn produce a single flush.

| Adapter                                        | Policy                                                                                   |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------- |
| React (`useStyles`)                            | `flushSync()` from `useInsertionEffect` (falls back to `useLayoutEffect` on React 16/17) |
| Vanilla DOM, no commit phase                   | the default `microtaskScheduler` — nothing can paint before the microtask queue drains   |
| A framework without concurrent rendering (Vue) | `syncScheduler`                                                                          |
| Server rendering                               | no scheduler arrives in time; `getStyles()` flushes itself                               |
| Tests wanting full control                     | `manualScheduler` + `flushSync()`                                                        |

React's insertion effects run during the commit ahead of _every_ layout effect in it, which is why
the React binding uses them (React's own recommendation for CSS-in-JS): a component that measures
its DOM in `useLayoutEffect` sees the CSS of the whole commit, not just of the Boxes that happened
to commit before it. The scheduled microtask stays as the safety net for rules queued outside a
commit. `flushScheduler.test.ts` pins the contract; the ordering guarantee is covered in
`useStyles.test.tsx`.

### Style Sinks (core/engine/styleSink.ts)

`flush()` decides _what_ to write and in which order; a **sink** decides _how_. Four of them:

| Sink          | Writes to                            | Used when                                        |
| ------------- | ------------------------------------ | ------------------------------------------------ |
| `cssom`       | `CSSStyleSheet.insertRule`           | the browser default                              |
| `textContent` | the `<style>` element's text         | tests and debugging (`Box.configure`)            |
| `string`      | memory, read back with `getStyles()` | server rendering (no `document` in the process)  |
| `element`     | nothing — the adapter renders it     | React 19 / Server Components (`sink: 'element'`) |

With no explicit `sink` the engine follows its environment, which is why server rendering needs no
DOM and no fake `document`. Every sink places a rule at the position its **sort key** gives it
(breakpoint order first, then prop declaration order — and every `@starting-style` rule after all of
them, because the browser computes the before-change style from the whole cascade) no matter which
flush it arrived in, so the
CSS a server produces and the sheet a browser builds agree rule for rule — `styleSink.test.ts` and
`ssr.roundtrip.test.tsx` pin that down.

### Element mode and cascade layers (core/engine + src/rsc.ts)

Element mode is the odd one out: it writes nowhere. `resolveClassNames()` returns a
`StyleElementDescriptor` per rule (`{ href, css, precedence, sortKey }`), the adapter renders each
as `<style href precedence>`, and React 19 hoists them into `<head>` and keeps one copy per `href`.
No effect is involved, which is why this is the path that works in a Server Component and under
streaming SSR — and why `src/rsc.ts` can render Box without a single hook.

Three consequences shape the implementation:

- **Element order is render order, not cascade order.** A Box that only uses `md={{ p: 4 }}` can put
  its rule in `<head>` ahead of the `p={2}` rule another Box needed, and atomic classes are shared
  between Boxes, so no per-Box grouping can fix it either. So every rule is wrapped in a cascade
  layer — `@layer rb<queryRank base36>.p<propIndex base36>` — and the **base element declares the
  order**: one statement naming the ranks, then one per rank naming the props inside it. Layer order
  beats source order, so where React inserts an element no longer matters. The reset goes into the
  first layer (`rb`), because unlayered CSS would otherwise beat every generated rule.
  `@starting-style` rules take one more layer per rank after all of them (`rb_s0`…, no prop
  dimension): a starting declaration has to beat the ordinary declaration of the same property or
  nothing transitions, and two starting declarations only ever collide when they are the same property.
  - **The prop is a sub-layer of the rank because naming every pair does not scale.** One flat name
    per (rank, prop) was 1,378 names at nine ranks; C3's container queries brought twelve more ranks,
    which would have made it 3,277 names and 6.6 KB gzipped in every server-rendered page. Nested,
    the inner statement is the _same text_ once per rank — 14 KB raw but **1.2 KB gzipped**, less than
    half of what nine flat ranks cost, because what gzip stores is the repetition. Verified in Chrome
    with every rule element rendered in reverse document order: the breakpoint still wins over the
    base rule, and `px` still wins over `p` inside one rank.
- **The base element belongs to no Box**, so every Box renders it first in its list: whichever Box
  React sees first establishes the layer order, and the rest are deduped by href. Its href follows
  its content, so a `:root` block that grew a variable becomes a new element rather than a silently
  ignored duplicate.
- **Class names cannot come from a counter.** The server graph, the client bundle and the next
  request are different processes; `classNames: 'stable'` (the default in this mode) hashes the
  descriptive name instead, so they all agree. `core/hash.ts` is that hash, and the same hash is the
  rule's href — dedupe by href is therefore dedupe by content.

`npm run check:boundaries` runs `scripts/check-rsc-boundary.mjs` next to the core check: it walks
the import graph of `src/rsc.ts` and fails on any client hook (`useState`, effects, `useContext`,
`createContext`, …) or `react-dom` import. Vitest renders with the client React, so nothing else
would catch a hook slipping into that graph — and for a consumer it would turn every server render
into a hard React error.

Beyond the static checks, `examples/next-app` is this mode end to end: a Next.js App Router app
whose pages are Server Components, depending on the **packed tarball** rather than on `src`, so the
published `exports` map is what chooses the Box its server graph gets. `npm run smoke:next-app`
starts `next start` and asserts on the served HTML — the base element hoisted into `<head>`, a rule
for every class in the markup, content-hashed class names, a Suspense boundary that streams its CSS
along with its markup, a client island whose styles are in the HTML too, and a `/components` route
whose pre-built `Flex`, `Button`, `Textbox` and semantic tags were all rendered by the server. That
is where React's
own behaviour becomes visible: it merges every style element of one precedence group into a single
`<style>` tag (listing what it merged in `data-href`) and streams post-shell styles as
`<style media="not all">`, enabling them on the client.

### Default Base Styles

The library injects default reset styles on initialization:

```typescript
const defaultRules = [
  `:root{${Variables.generateVariables()}}`,
  `:root{--borderColor: black;--outlineColor: black;...}`,
  `#box-kite-portal {position: absolute;top: 0;left: 0;height: 0;z-index:99999;}`,
  `html{font-size: 16px;font-family: Arial, sans-serif;}`,
  `body{margin: 0;line-height: var(--lineHeight);font-size: var(--fontSize);}`,
  `a,ul{all: unset;}`,
  `button{color: inherit;}`, // Reset user-agent button color
  // ... box and svg base classes
];
```

### Pending Variables System

CSS variables are loaded lazily. When a new color/variable is used for the first time:

```typescript
// src/core/variables.ts — one registry per engine instance
interface VariablesRegistry {
  hasPendingVariables(): boolean;
  getPendingVariables(): Record<string, string>; // returns and clears pending
  reset(): void; // forget what has been used, so the next `:root` block is built from scratch
}
```

The engine's `flush()` writes the variables used so far into the base `:root` block, and anything
first used later into its own block ahead of it:

```typescript
// In flush()
} else if (hasPendingVars) {
  const pendingVars = variables.getPendingVariables();
  target.writeVariables(`:root{...}`);
}
```

This ensures variables are defined before they're used in CSS rules, even when navigating between pages.

### Server Rendering

`src/ssg.ts` is the public SSR entry (`@box-kite/react/ssg`): `getStyles()` flushes and returns
the CSS for what was rendered, `resetStyles()` drops it — rules, cached class lists, the class-name
counter and the resolved variables — so the next request starts blank and identical markup produces
identical class names. `renderToStaticMarkup()` does the whole cycle in one call. Registration
(`Box.extend()`, `Box.components()`) survives a reset; it is configuration, not request state.

### Navigation/Route Change Handling

When navigating between pages in a SPA, components may re-render with styles that were already generated but need to be re-applied. The `useStyles` hook handles this via:

```typescript
// The signature changes whenever the class list does, so every new rule gets a flush
useFlushEffect(() => {
  getDefaultEngine().flushSync();
}, [signature ?? props]);
```

---

## Theme System

### Theme Provider (Box.Theme)

The theme system uses CSS class names (`.dark`, `.light`) applied to container elements:

```tsx
<Box.Theme value="dark">
  <App /> {/* All children inherit dark theme */}
</Box.Theme>
```

### Theme-Aware Styles

Components can define theme-specific styles using the `theme` prop:

```tsx
<Box
  bgColor="white"
  color="gray-900"
  theme={{
    dark: {
      bgColor: 'gray-900',
      color: 'gray-100',
    },
  }}
/>
```

### CSS Selector Generation for Themes

Theme styles generate CSS selectors with the theme class as ancestor:

```css
/* Base styles */
.className {
  background-color: white;
  color: #111827;
}

/* Theme-specific styles */
.dark .className {
  background-color: #111827;
  color: #f3f4f6;
}
```

### Nested Theme + Pseudo-Class Styles

Themes can contain pseudo-class styles:

```tsx
<Box
  bgColor="white"
  hover={{ bgColor: 'gray-100' }}
  theme={{
    dark: {
      bgColor: 'gray-900',
      hover: { bgColor: 'gray-800' },
    },
  }}
/>
```

Generates:

```css
.className {
  background-color: white;
}
.className:hover {
  background-color: #f3f4f6;
}
.dark .className {
  background-color: #111827;
}
.dark .className:hover {
  background-color: #1f2937;
}
```

### Group and Peer with Themes

For parent-child relationships (e.g., highlighting a cell when its row is hovered). `group` reaches an ancestor, `peer` a preceding sibling, and the key is `name/state` — any pseudo-class, or a `data-`/`aria-` prefixed attribute the ancestor carries:

```tsx
// Parent element defines the group
<Box className="grid-row">
  {/* Child responds to parent hover */}
  <Box
    bgColor="white"
    group={{
      'grid-row/hover': { bgColor: 'gray-100' },
    }}
    theme={{
      dark: {
        bgColor: 'gray-900',
        group: {
          'grid-row/hover': { bgColor: 'gray-800' },
        },
      },
    }}
  />
</Box>
```

Generates:

```css
.className {
  background-color: white;
}
.grid-row:hover .className {
  background-color: #f3f4f6;
}
.dark .className {
  background-color: #111827;
}
.dark .grid-row:hover .className {
  background-color: #1f2937;
}
```

### Portal Container Theming

Components rendered in portals (tooltips, dropdowns) need theme awareness. The `usePortalContainer` hook automatically applies the current theme class:

```typescript
// src/react/hooks/usePortalContainer.ts
export default function usePortalContainer() {
  const theme = Theme.useTheme(); // Get current theme from context

  // Apply theme class to portal container
  container.className = theme ?? '';
}
```

This ensures portal content inherits correct theme colors.

---

## Development Workflow

### Setup

```bash
# Clone and install
git clone https://github.com/box-kite/box-kite.git
cd box-kite
npm install

# Start dev server (pages)
npm run dev

# Type check
npm run compile

# Run tests
npm test

# Lint
npm run lint
```

### Key Scripts

| Script                | Description                       |
| --------------------- | --------------------------------- |
| `npm run dev`         | Start Vite dev server for pages/  |
| `npm run build`       | Build library to dist/            |
| `npm run build:pages` | Build demo website to dist-pages/ |
| `npm run compile`     | TypeScript type check only        |
| `npm test`            | Run Vitest tests                  |
| `npm run lint`        | ESLint check                      |
| `npm run docs:props`  | Write the prop reference          |
| `npm run check:props` | Fail if the reference has drifted |

---

## Adding New CSS Properties

### Step 1: Add Property Definition

```typescript
// src/core/boxStyles.ts

export const cssStyles = {
  // ... existing props

  /** The image-rendering CSS property sets how a scaled image is smoothed. */
  imageRendering: [
    {
      values: ['auto', 'pixelated', 'crisp-edges'] as const,
      styleName: 'image-rendering',
    },
  ],
};
```

### Step 2: Add Value Formatter (if needed)

A definition with no `valueFormat` writes its value as it stands. One that transforms it declares a formatter — and one whose
`values` is a **template type** rather than a list must declare `match` beside it: a scalar `values` is matched by `typeof`
alone, so without it the prop takes every string of that shape and a typo reaches CSS verbatim (bug #31). `aspectRatio` is
the shipped example of both — three definitions, one of them a ratio:

```typescript
// src/core/boxStyles.ts
aspectRatio: [
  { styleName: 'aspect-ratio', values: ['auto', 'square', 'video'] as const, valueFormat: (value: string) => Variables.aspectRatios[value] ?? value },
  { styleName: 'aspect-ratio', values: Variables.ratio, match: Variables.isRatio, valueFormat: (value: string) => value.replace('/', ' / ') },
  { styleName: 'aspect-ratio', values: 0 },
],
```

The shared formatters (the three dividers) live in `src/core/boxStylesFormatters.ts`:

```typescript
// src/core/boxStylesFormatters.ts

export namespace BoxStylesFormatters {
  export namespace Value {
    /** Spacing scale: divides by 4, so `p={4}` is `1rem`. */
    export function rem(value: number) {
      return `${value / DEFAULT_REM_DIVIDER}rem`;
    }
  }
}
```

### Step 3: Types are Auto-Generated

The type system in `types.ts` automatically extracts types from `cssStyles`:

```typescript
// types.ts - No changes needed!
type ExtractBoxStylesInternal<T extends Record<string, BoxStyle[]>> = {
  [K in keyof T]?: BoxStylesType<ArrayType<T[K]>['values']>;
};
export type BoxStyles = ExtractBoxStylesInternal<typeof cssStyles>;
```

### Step 4: Add to Variables (if color/size-based)

```typescript
// src/core/variables.ts

namespace Variables {
  /** The two ratios worth a name — CSS has neither. */
  export const aspectRatios: Readonly<Record<string, string>> = { square: '1 / 1', video: '16 / 9' };
}
```

### Step 5: Update the Prop Count

The registry's size is quoted in ten hand-written places — this file, the README, AGENTS.md, ARTICLE.md, the npm
description, `src/BOX_KITE_AI_CONTEXT.md`, both skill files, and two on the docs site. `src/core/boxStyles.test.ts` reads all
ten and fails until they agree with the registry, so a new prop means bumping `PROP_COUNT` there and the ten copies. It
is checked because it drifted twice on its own: once to `~144` against a registry of 117 (bug #71), and once with the
npm description left at 165 while everything else said 186 (bug #114).

### Step 6: Generate the Prop Reference

```shell
npm run docs:props    # writes the @example tags and api/props.json
npm run check:props   # what CI runs: fails when either has drifted
```

Every prop carries an `@example` in its JSDoc, and that line is **generated**. `docs:props` builds an engine from source,
styles a sample value with the prop, reads the rule back and writes down what it measured — `p={4} → padding: 1rem`. The tag
travels from the registry through the mapped type in `types.ts` into `dist/core/boxStyles.d.ts`, so the divider a reader gets
wrong is in the hover of their editor, from the published package. `api/props.json` is the same measurement as data, for the
docs site's props tables (G4) and for generated AI context.

The prose is yours to write and is kept byte for byte; only the example line and the JSON are generated. Where the example's
_value_ is a choice rather than a fact — a keyword that says nothing (`position: static`), a percentage that is a filter's own
unit (`brightness={110}`) — it comes from `SAMPLES` in `scripts/propsApi.mjs`; everything else takes the first value the
registry lists, or `4` for a number. A sample the prop does not accept fails loudly, because the prop then writes no rule to
measure. **Never edit an `@example` by hand**: a changed divider changes 45 of them at once, and the check exists to say so.

---

## Creating Components

### Simple Wrapper Component

```typescript
// src/components/card.tsx
import Box, { BoxProps } from '../box';

export default function Card<TTag extends keyof React.JSX.IntrinsicElements = 'div'>(
  props: BoxProps<TTag, 'card'>
) {
  return <Box component="card" {...props} />;
}
```

### Add Default Styles

```typescript
// src/core/extends/boxComponents.ts

const boxComponents = {
  // ... existing components

  card: {
    styles: {
      display: 'flex',
      d: 'column',
      p: 4,
      bgColor: 'white',
      borderRadius: 2,
      shadow: 'medium',
    },
    variants: {
      bordered: { b: 1, borderColor: 'gray-200', shadow: 'none' },
      elevated: { shadow: 'large' },
    },
    children: {
      header: {
        styles: { fontSize: 18, fontWeight: 600, mb: 3 },
      },
      body: {
        styles: { flex: 1 },
      },
      footer: {
        styles: { mt: 3, pt: 3, bt: 1, borderColor: 'gray-100' },
      },
    },
  },
};
```

### Export from Entry Point

```typescript
// vite.config.ts - Add to entry points
entry: {
  // ... existing entries
  'components/card': 'src/components/card.tsx',
},
```

---

## Type System

### Key Type Files

1. **types.ts** - Public type exports
2. **core/coreTypes.ts** - Internal utility types (framework-free)
3. **react/reactTypes.ts** - React-only type helpers
4. **box.d.ts** - Generated declaration file

### Type Augmentation (for user extensions)

```typescript
// types.ts
export namespace Augmented {
  export interface BoxProps {} // Add new props
  export interface BoxPropTypes {} // Extend existing prop values
  export interface ComponentsTypes {} // Add component types
}
```

Users extend via declaration merging:

```typescript
// user's types.d.ts
import '@box-kite/core/types';

declare module '@box-kite/core/types' {
  namespace Augmented {
    interface BoxPropTypes {
      bgColor: 'brand-primary' | 'brand-secondary';
    }
    interface ComponentsTypes {
      myComponent: 'variantA' | 'variantB';
    }
  }
}
```

### Component Variant Extraction

```typescript
// types.ts - Complex type extraction for component variants

type ExtractVariants<T> = T extends { variants?: infer Variants }
  ? keyof Variants extends never
    ? never
    : Extract<keyof Variants, string>
  : never;

type ExtractChildrenNames<T, Prefix extends string = ''> = T extends { children?: infer Children }
  ? {
      [K in keyof Children & string]:
        `${Prefix}${Prefix extends '' ? '' : '.'}${K}` | ExtractChildrenNames<Children[K], `${Prefix}${Prefix extends '' ? '' : '.'}${K}`>;
    }[keyof Children & string]
  : never;
```

This enables autocomplete for:

- `component="button"`
- `component="button.icon"`
- `variant="primary"`

---

## Testing

### Test Environment

- **Framework**: Vitest
- **DOM**: happy-dom
- **Utils**: @testing-library/react, @testing-library/user-event (real focus movement), jest-dom
  matchers (registered globally in `dev/vitest.setup.ts`), axe-core

### Example Test

```typescript
// src/components/button.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Button from './button';

describe('Button', () => {
  it('renders with default styles', () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('_b'); // Base class
  });

  it('applies variant styles', () => {
    render(<Button variant="primary">Primary</Button>);
    // Check for generated class names
  });
});
```

### Running Tests

```bash
npm test

# With coverage
npm test -- --coverage
```

### Accessibility tests

Two things run on every push, both inside `npm test`:

- **`src/components/a11y.test.tsx`** — every component, rendered as its docs show it
  (`dev/a11y/fixtures.tsx`), put through axe. A rule that fires and is not in that fixture's
  `knownViolations` fails the build; so does a listed rule that has stopped firing, so the ledger
  has to shrink as the accessibility work lands rather than quietly growing.
- **`*.a11y.test.tsx`** — the APG keyboard map as tests, driven with a real keyboard
  (`dev/a11y/keyboard.ts`), because "where does focus go" is most of what the spec says and no
  static check can see it. `checkbox.a11y.test.tsx` and `tooltip.a11y.test.tsx` are the templates.

**axe cannot see semantics that are missing** — a listbox of bare `<div>`s looks clean to it — so a
green sweep is a floor, not a claim that a pattern is implemented. What is covered, what is not, and
the manual screen-reader matrix are in [docs/a11y-testing.md](docs/a11y-testing.md).

---

## Build & Publishing

### Build Output

```
dist/
├── box.mjs          # ESM entry
├── box.cjs          # CommonJS entry
├── box.d.ts         # Type declarations
├── rsc.mjs          # The `react-server` entry (Box for Server Components)
├── rsc.cjs
├── rsc.d.ts
├── a11y.mjs         # The behaviour primitives (hooks only, 'use client')
├── a11y.cjs
├── a11y.d.ts
├── behavior.mjs     # Their shared chunk — React and nothing else, no engine
├── behavior.cjs
├── platform.mjs     # DOM guards and containment checks — framework-free, shared by every chunk
├── platform.cjs
├── effects.mjs      # Which React effect runs where — shared by the binding and the primitives
├── effects.cjs
├── forms.mjs        # The label wrapper the form controls share — server-safe, imports Flex
├── forms.cjs
├── core.mjs         # Engine chunk — no client hook reaches it, so rsc.mjs can import it
├── core.cjs
├── client.mjs       # The client binding: flush effect, theme provider, shared hooks
├── client.cjs
├── ssg.mjs          # SSR support
├── ssg.cjs
├── ssg.d.ts
├── components/      # Individual component chunks. The hook-free ones import the package by
│   │                #   name so a server graph resolves the RSC Box; the rest carry 'use client'
│   ├── button.mjs
│   ├── button.cjs
│   ├── button.d.ts
│   └── ...
└── types.d.ts       # Type exports
```

The `engine`/`react-shared`/`behavior`/`client` split is not cosmetic: `core.mjs` must not import a chunk that
names `react` at all, and `rsc.mjs` must not import one that names `useState` or an effect, because
the `react-server` build of React does not export them. Both splits are derived from the entries'
own module graphs (`scripts/moduleGraph.mjs`, shared with the boundary checks), and
`scripts/postbuild.mjs` then loads the built package under `--conditions=react-server` in both
formats — the same resolution a Next.js server build performs — and walks the `/core` entry's
chunks looking for React, so a regression fails the build instead of a consumer's. Note that
rolldown ignores Rollup's `manualChunks`; the split is declared through
`output.codeSplitting.groups`.

### Vite Build Configuration

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    lib: {
      entry: {
        box: 'src/box.ts',
        rsc: 'src/rsc.ts',
        ssg: 'src/ssg.ts',
        'components/button': 'src/components/button.tsx',
        // ...
      },
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime', 'react-dom/server'],
      preserveEntrySignatures: 'allow-extension',
      output: {
        codeSplitting: {
          includeDependenciesRecursively: false,
          // 'core' for whatever the react-server entry reaches, 'client' for the rest
          groups: [{ name: (id) => /* ... */ null }],
        },
      },
    },
  },
  plugins: [react(), dts({ exclude: ['**/*.test.*', 'pages/**'] })],
});
```

### Release notes

The notes are written when the change lands, not on release day. A PR that changes what a consumer
sees adds a section to `releases/next.md`: a sentence for the heading (the way the commit subjects
read), a paragraph on what changed and why the reader would care, an example if it helps. A breaking
change is a bullet under "Breaking changes" (replacing `None.`) with the migration beside it; a fix
is a bullet under "Fixes". Links are absolute, because the same text becomes the GitHub Release body.
`release-notes.yml` fails a PR that changes `src/` and leaves the draft alone, unless the PR carries the
`no release note` label. `releases/1.0.0.md` is the reference for the shape.

### Publishing Workflow

A release is a pull request, and merging it is the release:

```bash
npm run release -- minor --dry-run   # what would happen: the version, the CHANGELOG line, the notes
npm run release -- minor             # patch | minor | major | x.y.z
```

The script turns `releases/next.md` into `releases/<version>.md` (version, date, compare link), resets
the draft, adds the CHANGELOG row, bumps `package.json` and `package-lock.json`, and opens
`release/<version>` against main. It refuses a non-major bump while the draft lists breaking changes.
Review the notes there as a reader would, fix them in place, and merge. When Tests go green on main,
`release.yml` tags `v<version>`, creates the GitHub Release with the notes file as its body and
dispatches `publish.yml`, which publishes `@box-kite/core` then `@box-kite/react` with provenance;
`pages.yml` deploys the site on the same push. The manifest leads and the tag follows — `npm version`
is never run, and no tag is made by hand. Every step is idempotent, so a run that stopped halfway is
run again from the Actions tab. The full runbook is `.claude/skills/release/SKILL.md`.

---

## Code Style

### ESLint + Prettier

- Print width: 140
- Single quotes
- Trailing commas: all
- Tab width: 2

### Comments

One or two lines, saying what the code cannot: the trap, the reason, the bug it came from. A JSDoc that
needs a code example or has two conventions to reconcile may run to four or five, and nothing should run
longer — a long explanation belongs in this file, on the docs site or in the roadmap, where a reader
reaches it on purpose rather than while trying to read the code around it.

The `terse-comments` skill (`.claude/skills/terse-comments/`) has the patterns worth cutting and the
three scripts a bulk sweep runs on — a worklist by block size, a JSON-plan rewriter, and a gate that
fails if anything but a comment changed.

### Naming Conventions

| Type              | Convention           | Example                                  |
| ----------------- | -------------------- | ---------------------------------------- |
| CSS Props (short) | camelCase            | `p`, `px`, `bgColor`                     |
| CSS Props (full)  | camelCase            | `borderRadius`, `fontSize`               |
| Components        | PascalCase           | `Button`, `DataGrid`                     |
| Hooks             | camelCase with `use` | `useStyles`, `useVisibility`             |
| Types             | PascalCase           | `BoxStyleProps`, `ComponentsAndVariants` |
| Variables         | camelCase            | `stylesToGenerate`, `componentsStyles`   |

### File Organization

- One component per file
- Tests next to source files: `button.tsx` → `button.test.tsx`
- Re-export from index where appropriate

---

## Common Contribution Tasks

### Add a New Shorthand Prop

1. Define in `boxStyles.ts` with JSDoc comment
2. Add formatter if needed in `boxStylesFormatters.ts`
3. Add to variables if value-based in `variables.ts`
4. Types auto-generate

### Add a New Component

1. Create component in `src/components/`
2. Add default styles in `boxComponents.ts`
3. Add entry point in `vite.config.ts`
4. Add to package.json exports
5. Create demo page in `pages/`

### Add a New Pseudo-Class

1. Add to `pseudo1` (nested styles only) or `pseudo2` (also settable as a boolean) in `boxStyles.ts`
2. Weights and the reverse lookup come from the declaration order — `pseudoClassesWeight` and `pseudoClassesOfWeight` derive from `pseudoClasses`, so there is nothing to update by hand. It is a 32-bit mask, so the map cannot grow past 31 keys (26 as of C9)
3. Types auto-generate — and the new key is a `not`, `group` and `peer` state for free, since all three read `pseudoClasses` through `Variants.stateSelector`
4. A state whose selector needs an **argument** (`:nth-child(2n+1)`) cannot be a bit in a mask: make it a variant key instead, the way `nth` is

### Add a Variant or Group Key

A variant is a fragment on the element's **own** compound selector (`src/core/variants.ts`); a group is a selector in **front** of it (`src/core/groups.ts`). Both compile a record key, and both drop the whole block when the grammar rejects it — the key becomes rule text.

1. For a variant: add the key to `Variants.variantKeys`, a `case` to `selectorOf`, and the key's own type slice to `BoxVariantNesting` in `src/types.ts` if the keys are a closed set (`not` and `nth` are; the two attribute keys take a free string)
2. For a group: `Groups.groupKeys` maps the key to the **combinator** it puts between the ancestor and the element, and `Groups.parent` does the rest. The class-name segment must come from the compiled parts rather than the key as written, or two spellings of one selector emit two identical rules
3. The engine's `isStyleKey` has to know the new key, or `computeSignature` will hash two different Boxes to one cache entry

### Add a New Pseudo-Element

A different dimension from a pseudo-class, because CSS allows **one** per compound selector and it has to be last: they live in the `pseudoElements` record and travel as a `StyleContext.element` slot, not as a bit in the weight mask.

1. Add the key and its selector to `pseudoElements` in `boxStyles.ts`
2. If it generates a box of its own, add it to `generatedElements` — the walk supplies `content: ''` for those unless the block declares one, since a generated element with no `content` renders nothing at all
3. If it belongs to a descendant (`::marker` is the list item's, `::selection` is whatever holds the text), add it to `inheritedElements`: its rule then names `.x *::el` as well, the two selectors Tailwind's `marker:`/`selection:` variants emit
4. Types auto-generate — `BoxPseudoElementStyles` is the family that offers everything except a second pseudo-element

### Add a Container-Query Size

The sizes in `src/core/containers.ts` are a scale, not a list of keys: adding one to `containerSizes` gives it a `min-width` condition, a `max` complement and a cascade slot at once, since `rankKeys` and the condition table are both derived from that record.

1. Add the size to `containerSizes` **in ascending order** — `rankKeys` names the sizes ascending and their complements descending, and `queryKeys` in `boxStyles.ts` splices that list between the breakpoints and the preferences
2. Nothing else: the condition, the `maxXx` key, the class-name segment and the type (`Containers.QueryKey`) all follow
3. Note that every new rank is one more cascade layer _and_ one more repeat of the prop order statement in element mode — cheap gzipped, but not free

### Add a Colour Family

The palette in `src/core/palette.ts` is a packed table, one string per family: `L C H` per step, comma-separated, in `steps` order. Adding a family is one line, and the token names, the types and the swatch grid on the docs site all follow from it.

1. Add the family to `families` with **eleven** entries — the lightness as a percentage without its sign, a chroma with no leading zero, a hue (or `none` for a pure grey). Keep the values in the notation Tailwind publishes, rounding the hue to a tenth of a degree: the table ships in every bundle
2. Nothing else: `Palette.Token`, `ColorName`, `Variables.colorValues` and the `token/alpha` type are all derived, and `/colors` groups the swatches off the table
3. A colour that is not a family — a keyword, one end of the greyscale — goes in `keywords` instead, where the value is written out as it stands

### Add a New State Variant

The four in `src/core/variants.ts` (`dataAttr`, `ariaAttr`, `has`, `not`) are a different dimension from a pseudo-class: the record _key_ is the selector, so there is no weight and no bit. A fifth means a key in `variantKeys`, a case in `selectorOf` — **with a grammar that rejects anything it cannot turn into a selector**, since the key becomes rule text — and a type in `src/types.ts`. The engine's `addClassNames` dispatches on `variantKeys` and needs no change.

### Add Dark Theme Support to a Component

1. Add `theme: { dark: { ... } }` to the component's styles in `boxComponents.ts`
2. Include all color-related properties: `bgColor`, `color`, `borderColor`
3. Include theme variants for pseudo-classes like `hover`:
   ```typescript
   hover: { bgColor: 'gray-100' },
   theme: {
     dark: {
       hover: { bgColor: 'gray-800' },
     },
   },
   ```
4. For portal-based components (tooltips, dropdowns), ensure `usePortalContainer` is used
5. Test in both light and dark themes

### Fix Styling Bug

1. Check `core/engine/styleEngine.ts` for class generation logic
2. Check `boxStyles.ts` for property definition
3. Verify CSS output in browser DevTools (`<style id="box-kite-styles">`)
4. Add test case

### Debug CSS Generation Issues

1. **Inspect generated styles**: Open DevTools → Elements → find `<style id="box-kite-styles">`
2. **Check class names**: Inspect element to see generated class names (e.g., `_b`, `_2a`, etc.)
3. **Verify CSS variables**: Check `:root` rules in the style tag for variable definitions
4. **Navigation issues**: If styles don't apply after route change, check:
   - `propsToUse` dependency in useLayoutEffect
   - `hasPendingVariables()` being called in `flush()`
5. **Portal theming issues**: Verify `#box-kite-portal` container has the correct theme class

---

## Performance Considerations

1. **Styles are cached**: Same prop values generate same class names (via IdentityFactory)
2. **Lazy generation**: CSS only generated when props are used
3. **Incremental insertion**: CSS rules added via `insertRule()` not innerHTML replacement
4. **Single flush**: Styles batched and flushed together, once per commit
5. **Component memoization**: Box uses `React.memo` to prevent unnecessary renders
6. **Deep merge optimization**: Component styles merged efficiently
7. **Pending variables**: New CSS variables added incrementally, not regenerating all

---

## Questions?

- GitHub Issues: https://github.com/box-kite/box-kite/issues
- Review existing code patterns before adding new features
- Follow the established type extraction patterns for type safety
