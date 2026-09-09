---
name: box-kite
description: "@box-kite/react (Box Kite) expert — the runtime CSS-in-JS library whose Box component takes 215 typed CSS props and writes the CSS itself. Use for any work with Box props, the Flex/Grid/Button/Textbox/Dropdown/DataGrid components, themes, Box.extend() or Box.components() — and read it before writing props, because the prop names collide with Tailwind's and Chakra's while the numbers mean different things. Also covers installing and updating the package."
license: MIT
---

# @box-kite/react

Runtime CSS-in-JS. `Box` takes 215 typed CSS props and generates the CSS for them at runtime — no stylesheet, no class name to invent, and two elements written with the same value share one class.

## This library is not in your training data

It was renamed at 1.0.0 (September 2026) and its prop surface nearly doubled on the way, so a plausible-looking memory of it is a memory of a different library. Four facts first, because each one is silently wrong in the APIs this most resembles:

- **The dividers are per prop.** Spacing is ÷4 (`p={4}` is 1rem), `fontSize` is ÷16 (`fontSize={14}` is 14px), `borderRadius` is ÷4, and border width and `lineHeight` are direct px (`b={1}` is 1px).
- **There is no `style` attribute.** Every visual value is a prop; the one-off nothing has a prop for is `css={{ … }}`, which still compiles to a shared class.
- **The element comes from the component, not from `tag`.** `<Flex>`, `<Button>`, `<H1>`, `<Ul>`, `<Path>` — `<Box tag="…">` is the fallback, not the idiom.
- **HTML attributes go in `props`.** `<Link props={{ href: '/about' }}>`; an `href` written at the top level typechecks and is then dropped.

## The numbers, measured

The divider is per prop, so the same number is a different length depending on which prop it is written on — `p={4}` is 16px and `b={4}` is 4px. Every row here is what the engine emitted for that example, not what a doc claims about it:

| Prop                | Which props                                                | Written                    | Emitted                      |
| ------------------- | ---------------------------------------------------------- | -------------------------- | ---------------------------- |
| `p`                 | spacing — `p`/`m`/`gap`/`px`/`py`/`pt`… all of them        | `p={4}`                    | `padding: 1rem`              |
| `width`             | sizing — `width`/`height` and the four `min`/`max` props   | `width={4}`                | `width: 1rem`                |
| `borderRadius`      | the corner radius, on the spacing scale                    | `borderRadius={4}`         | `border-radius: 1rem`        |
| `b`                 | border width — `b`/`bx`/`by`/`bt`/`bs`…                    | `b={4}`                    | `border-width: 4px`          |
| `fontSize`          | the one that is ÷16                                        | `fontSize={14}`            | `font-size: 0.875rem`        |
| `lineHeight`        | and `letterSpacing`                                        | `lineHeight={24}`          | `line-height: 24px`          |
| `strokeWidth`       | SVG lengths — and the geometry props `cx`/`cy`/`r`/`x`/`y` | `strokeWidth={4}`          | `stroke-width: 4`            |
| `animationDuration` | every animation and transition time                        | `animationDuration={1100}` | `animation-duration: 1100ms` |

## Read this next

| Read                                                                                      | When the question is                                                       |
| ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| [`references/styling.md`](references/styling.md) — Styling reference                      | writing props: the categories, the six kinds of nesting, the theme         |
| [`references/components.md`](references/components.md) — Components reference             | choosing a component, or wiring a Dropdown, a Select or a DataGrid         |
| [`references/extending.md`](references/extending.md) — Extending Box                      | a value used twice, or a prop that does not exist yet                      |
| [`references/patterns.md`](references/patterns.md) — Patterns and the rest of the surface | server rendering, the behaviour hooks, portals, form controls, the tooltip |
| `node_modules/@box-kite/react/docs/props.md`                                              | one prop exactly: all 215, the CSS each writes, one measured example       |
| `node_modules/@box-kite/react/BOX_KITE_AI_CONTEXT.md`                                     | the long-form reference, when a reference above is not enough              |

With the package not installed, the prop reference is https://www.box-kite.dev/props.md, and https://www.box-kite.dev/llms.txt indexes every documentation page as markdown beside it.

## Installing and updating

Detect the package manager from the lock file rather than asking:

| Lock file           | Manager | Install                       | Update                         |
| ------------------- | ------- | ----------------------------- | ------------------------------ |
| `package-lock.json` | npm     | `npm install @box-kite/react` | `npm update @box-kite/react`   |
| `yarn.lock`         | yarn    | `yarn add @box-kite/react`    | `yarn upgrade @box-kite/react` |
| `pnpm-lock.yaml`    | pnpm    | `pnpm add @box-kite/react`    | `pnpm update @box-kite/react`  |
| `bun.lockb`         | bun     | `bun add @box-kite/react`     | `bun update @box-kite/react`   |

`@box-kite/react` needs React 18 or 19 as a peer, and installs `@box-kite/core` (the engine) with itself.

## Still working, but no longer the spelling to write

- `placeholderStyles` — The name is `placeholder` now — this spelling still works and means the same thing.
- `hoverGroup` — `group={{ 'card/hover': … }}` — the same rule, and every other state beside it.
- `focusGroup` — `group={{ 'card/focus': … }}`.
- `activeGroup` — `group={{ 'card/active': … }}`.
- `disabledGroup` — `group={{ 'card/disabled': … }}`.
- `selectedGroup` — `group={{ 'card/selected': … }}`.
- `@box-kite/react/components/baseSvg` — Since SV3 every SVG element has a component, and `Svg` is this one without the presets: `<Svg viewBox="0 0 24 24" width="1.5rem">`.

## The rules

1. **NEVER use `style={{ }}`** — always use Box props. Missing prop? Create with `Box.extend()`
2. **NEVER `<Box tag="...">`** for common elements — use `<Button>`, `<Link>`, `<H1>`, `<P>`, `<Ul>`/`<Li>`, `<Nav>`, `<Flex>`, `<Grid>`, and for SVG `<Svg>`, `<Path>`, `<Circle>`, `<Rect>`, `<SvgText>`… from `components/svg`
3. **An icon from lucide/Tabler/react-icons goes in `<Icon>`** (`components/icon`) — `<Icon size={5} color="amber-500"><Sun /></Icon>`. `size` is the ÷4 scale (the set's own `size` prop is pixels), and no `label` means `aria-hidden`. SVG you draw yourself is `<Svg>`, not `<Icon>`. An icon from any other set comes through the same `<Icon>`: `unplugin-icons` (`~icons/<set>/<name>`) at build time, `@iconify/react` when the name is data
4. **NEVER `<Box display="flex/grid">`** — use `<Flex>` / `<Grid>` components
5. **fontSize divider is 16** (not 4): `fontSize={14}` → 14px
6. **Spacing divider is 4**: `p={4}` → 16px (1rem)
7. **Border width and lineHeight are direct px**: `b={1}` → 1px. **borderRadius uses divider 4**: `borderRadius={2}` → 8px
8. **A gradient fill is a value, not an attribute**: `fill="url(#sky)"`, `stroke="var(--chart-1)"`, `clipPath="url(#frame)"` — so it can be themed and hovered. **A dashboard shape is `components/chart`**: `<Sparkline data={[…]}/>`, `<ProgressRing value={0.6}/>`, `<Gauge>`, `<MiniDonut>` — Box props, no chart library
9. **A CSS variable is a prop too**: `vars={{ 'color-revenue': 'sky-500' }}` declares `--color-revenue` on the element and everything inside it — the answer for markup this library does not render. **A third-party chart goes in `<ChartContainer series={['revenue', 'cost']}>`** (`components/chart`), which declares `--chart-1..6` in both themes and one `--color-<series>` per series, so `<Line stroke="var(--color-revenue)"/>` is all the chart ever says about colour
10. **SVG lengths have no divider and no unit**: `strokeWidth={2}` → `stroke-width: 2` (user units), same for `strokeDasharray`/`strokeDashoffset` and the geometry props `cx`/`cy`/`r`/`rx`/`ry`/`x`/`y`. `<Rect width={40} height={40}>` and `<Path d="M…">` take those as the SVG attributes they are — the Box props of those names mean something else
11. **HTML attributes go in `props` prop**: `<Link props={{ href: '/about' }}>` not `<Link href>`
12. **Size shortcuts**: `width="fit"` = 100%, `width="fit-screen"` = 100vw, `width="1/2"` = 50%
13. **An animation is a prop**: `animation="spin|pulse|bounce|ping"` (keyframes included, and they stop under reduced motion on their own), `Box.keyframes({ name: { from, to } })` for your own — its steps are Box props. **Times are milliseconds**: `animationDuration={1100}`, `transitionDelay={150}`. `transition` takes a group (`colors`, `transform`, `opacity`, `shadow`, `size`, `filter`), and `translateX`/`translateY`/`rotate`/`scale` are longhands that compose. **A spring is two props**: `transitionTimingFunction="spring-bouncy"` with `transitionDuration="spring-bouncy"` (also `spring`, `spring-gentle`, `spring-snappy`; `Box.spring({ stiffness, damping })` for your own)
14. **An entrance is a prop too**: `startingStyle={{ opacity: 0, translateY: 2 }}` is what a just-mounted element starts from (`@starting-style`, plain props only — nest a breakpoint or a theme _around_ it). Going out, React unmounts too fast to animate: either hide instead with `display` + `transitionBehavior="allow-discrete"`, which flips `display` at the _end_, or hold the node with **`<Presence present>`** (`components/presence`) — a render prop given `{ present, ref, props }`, where `ref` goes on the element carrying the transition. `interpolateSize="allow-keywords"` on a container is what makes `height: auto` animate (Chromium-only, snaps elsewhere)
15. **`data-*` and `aria-*` are attributes, so they go in `props`** — `props={{ 'data-state': 'open' }}`. Written at the top level (`<Box data-state="open">`) they typecheck and are silently dropped
16. **A state your own code sets is a nested prop too**: `dataAttr={{ 'state=open': { … } }}` → `[data-state="open"]` (a bare key is presence: `[data-loading]`), `ariaAttr={{ selected: { … } }}` → `[aria-selected="true"]`, `has={{ ':checked': { … } }}`, `not={{ hover: { … } }}` — keyed by state name, so it stays typed — and `nth={{ odd: { … }, 'last 1': { … } }}` → `:nth-child(odd)`/`:nth-last-child(1)`, which also takes `first`/`last`/`only`/`even` and an `An+B` formula. The attribute itself still goes in `props`; everything else (a breakpoint, a theme, a group, `startingStyle`) nests around them in either direction. A key the grammar rejects drops its whole block, the way an unmatched value does
17. **A pseudo-element is a nested prop, and CSS allows one**: `before`/`after` (which come with `content: ''`, because a generated element with none renders nothing), `placeholder`, `selection`, `marker`, `firstLine`, `firstLetter`, `backdrop`, `fileButton`. It is a slot, not a list — a second nested one is a type error — and it lands last on the element's own selector, so it composes with everything else in either direction. **`content` takes text and quotes it for you** (`content="New"` → `content: "New"`); `attr()`/`counter()`/`url()`/`var()` and a quoted sequence (`'"Step " counter(step)'`) are written out as CSS. `marker` and `selection` reach descendants, so they go on the `<Ul>` or the `<P>`. On a `Textbox`/`Textarea` a `placeholder` **string** is the attribute and an object is the styles; for both, the text goes in `props`
18. **A forced-colors mode keeps only the system colours**, so they are values on every colour prop: `forcedColors={{ bgColor: 'ButtonFace', color: 'ButtonText' }}` (also `Canvas`, `CanvasText`, `Highlight`, `HighlightText`, `GrayText`, `LinkText`). They are keywords, not tokens — a state signalled by fill alone needs them or it reads identically on and off

19. **A component that answers to its own space uses `cq`, not a breakpoint**: `container` makes an element a query container (`true`, or a name — both mean `container-type: inline-size`; `containerName`/`containerType` are the longhands), and `cq={{ md: { d: 'row' } }}` → `@container (min-width: 28rem)`. Six sizes, `xs` 20rem through `xxl` 42rem — **the container scale, not the breakpoint one** — each with a complement (`maxMd` is `not (min-width: 28rem)`), and `cq={{ 'sidebar/md': { … } }}` addresses a container by name. Ranked after every breakpoint and before every preference; one at-rule block per rule, so `cq` and a breakpoint do not nest inside each other

20. **An opacity is part of the colour, not a second prop**: `bgColor="blue-500/40"`, `borderColor="black/10"`, `color="currentColor/60"` — a slash and a percentage on any colour value, on every colour prop and on a `vars` entry. It compiles to `color-mix(in oklab, var(--blue-500) 40%, transparent)`, so the token stays a variable (still themed, still one shared class) — unlike `opacity`, which fades the element, its text and its children. The palette itself is **Tailwind 4.3's, in OKLCH**: twenty-six families (the five neutrals, `mauve`/`mist`/`olive`/`taupe`, and seventeen hues) of eleven steps, `50`–`950`. A token the palette does not have, or a percentage outside 0–100, produces no rule and no class name; a variable from `Box.extend()` takes the modifier too

21. **A gradient is a value, and a shadow is a stack.** `bgGradient={{ linear: 'r', colors: ['blue-500', 'pink-500'] }}` — the key names the kind (`linear` a direction `t`/`tr`/`r`/… or an angle in degrees, `radial` a shape, `conic` a start angle), `colors` are the stops in order, and a stop is any colour value: a token, `blue-500/40`, `var(--chart-1)`, or a `[colour, position]` pair. `at` centres a radial or conic one, `interpolate="oklch"` keeps two stops out of the grey middle sRGB drags them through, and `oklch-longer` turns two stops into a spectrum. Two stops minimum, and the record is judged **whole** — one bad stop or one unknown key and the value emits nothing. It writes `background-image`, so it and `bgImage` are the same property. **Four shadows stack** rather than overwriting one `box-shadow`: `shadow` (`xxs`…`xxl` on Tailwind's scale, or the presets `small`/`medium`/`large`), `insetShadow` (`xxs`/`xs`/`sm`), and `ring`/`insetRing`, which are a **width in px** (`ring={2}`) that follows `borderRadius` and costs no layout, unlike `outline`. Each takes a colour of its own (`shadowColor`, `ringColor`, …) which shows nothing until the layer is painted; `none` — or `0` on a ring — clears just that layer. `textShadow` is `xxs`…`lg` with `textShadowColor`, and `transition="shadow"` covers both properties

22. **Nine filters stack too, and a mask is a gradient.** `blur`, `brightness`, `contrast`, `grayscale`, `hueRotate`, `invert`, `saturate`, `sepia` and `dropShadow` each set their own layer of one composed `filter`, so a blur and a desaturation coexist. **A number is the function's own unit** — `brightness={110}` is a percentage, `hueRotate={90}` degrees, `blur={3}` pixels — and `blur` takes Tailwind's scale as well (`xs` 4px … `xxxl` 64px). `dropShadow` (`xs`…`xxl`, with `dropShadowColor`) is cast by the **shape**, where `shadow` draws a rectangle; `none` clears one function. The nine `backdrop*` props are the same functions behind the element — `backdropBlur="sm" backdropSaturate={180}` over something translucent is glassmorphism — and they and the older `backdropFilter` are the same property, so use one. **`maskImage` takes the `bgGradient` record** and reads its alpha: `maskImage={{ linear: 'b', colors: ['black', 'transparent'] }}` fades an edge, `url(#id)` masks by a shape. **`bgClip="text"` needs `color="transparent"`** beside it, and together they are how a gradient becomes type

23. **An alignment can be overflow-safe, and a ratio is a value.** The box-alignment set is complete: `jc`/`ai` plus `justifyItems`/`placeItems`/`placeContent`/`alignContent`/`alignSelf`/`justifySelf`, and every one of them takes `'safe center'`, `'safe start'`, `'safe end'` and the `'unsafe …'` twins — `safe center` centres until the content stops fitting and then aligns to `start`, where plain `center` overflows both edges and the half above the scrollable origin cannot be reached. `aspectRatio` is `'square'` (1/1), `'video'` (16/9), a compact ratio (`'4/3'`) or a number; `'4:3'` emits nothing. `insetX`/`insetY` are `inset-inline`/`inset-block`, the way `mx`/`my` are the margin shorthands, and every inset prop now takes `'auto'` and the fractions (`inset="1/4"`, `top="-1/3"`). **The parts of a native control the page does not draw are props too**: `accentColor` (a checkbox tick, a radio dot, a range track — it inherits, so a form sets it once), `caretColor`, `colorScheme` (`'light dark'` — what scrollbars and form controls follow), `fieldSizing="content"` (a field that grows as it is typed into), `scrollbarGutter="stable"` (the scrollbar's space reserved before there is one) and `willChange`, which costs memory: put it on the few elements that move, never on a list.

24. **Somebody else's state is `group` or `peer`.** `group={{ 'card/hover': { opacity: 1 } }}` → `.card:hover .className` (an ancestor), `peer={{ 'agree/checked': { color: 'emerald-500' } }}` → `.agree:checked ~ .className` (a preceding sibling); the ancestor or sibling carries the class through `className`, and a bare key uses Tailwind's default names (`group`, `peer`). The state half is the vocabulary `not` takes — any pseudo-class, or a `data-`/`aria-` prefix for an attribute the ancestor carries (`'row/data-state=open'`). **The element's own states stay on the element**: `group={{ 'card/hover': { hover: … } }}` is `.card:hover .x:hover`. `hoverGroup`/`focusGroup`/`activeGroup`/`disabledGroup`/`selectedGroup` are the older spelling of the same rule and share its class. **Eight more browser states are pseudo-class props**: `open` (an `[open]` element, a popover, a `<select>`'s picker), `placeholderShown`, `autofill`, `inRange`/`outOfRange`, `target`, `inert` (the whole inert subtree) and `visited`, which takes **colour properties only** — the browser refuses the rest so a page cannot read a reader's history. **`pointerCoarse`/`pointerFine`** are two more media keys beside the preferences, ranked below them: a finger needs a bigger target and never hovers.

25. **A side is logical, and the direction is a state.** `ps`/`pe`, `ms`/`me`, `bs`/`be`, `insetStart`/`insetEnd` and `borderRadiusStart`/`borderRadiusEnd` (plus the four logical corners, **block axis first**: `borderRadiusStartStart`…) are the two sides of the inline axis the `px`/`mx`/`insetX` pairs already work on — start is left in a left-to-right reading and right in a right-to-left one, resolved by the browser from `dir`, so a translation needs no second stylesheet and no re-render. Same dividers as the physical twins (÷4, and direct px for `bs`/`be`); `textAlign` takes `'start'`/`'end'` beside `'left'`/`'right'`. For what a logical property cannot express — an arrow that must point the other way — `rtl={{ flip: 'xAxis' }}` and `ltr={{ … }}` are ordinary pseudo-class keys compiling to `:dir(rtl)`/`:dir(ltr)`, **not** Tailwind's `[dir="rtl"] &`: the direction belongs to _this_ element, so a `<bdi>` or a `dir="auto"` is seen. With no `dir` anywhere the document is left-to-right, so `ltr` matches — it is a state, not an attribute you have to write, and the `dir` attribute itself goes in `props`. **The pre-built components come with it**: the arrow keys follow the reading order (`ArrowLeft` is the _next_ item in a right-to-left list, APG's rule), a DataGrid column pins to `'START'`/`'END'` of the inline axis (`'LEFT'`/`'RIGHT'` still mean those two) and `align` takes `'start'`/`'end'`, and a portalled popup carries the direction it was declared in out of the tree with it. `Overlay`'s page coordinates stay physical on purpose — a measured pixel has no reading order.

26. **The 5% is `css`, and it is still a class.** `css={{ mixBlendMode: 'multiply', WebkitLineClamp: 2 }}` takes a style object for the properties this library has no prop for and compiles it through the same pipeline as every other prop — one shared class, nested anywhere a prop nests (`hover={{ css: … }}`, `md`, `theme`, `dataAttr`, `before`, `startingStyle`, a keyframes step), rendered on a server — so it is never `style={{ }}`. Names are camelCase and typed by csstype (a misspelt property is a compile error, `WebkitLineClamp` → `-webkit-line-clamp`); values are CSS written as they stand, a number included, so a length wants its unit (`width: '100px'`, the type refuses `100`) and a colour token resolves the way a `vars` value does (`outlineColor: 'sky-500'`). It is sorted **last**, so on one element it wins the property a typed prop also names. A value carrying `;` or a brace is dropped, that entry only. Reach for a typed prop first, `Box.extend()` for anything used twice, `css` for the one-off.

Full reference: `references/` beside this file, and `docs/props.md` inside the package.
