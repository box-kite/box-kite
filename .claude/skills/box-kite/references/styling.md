# Styling reference

Every prop by category, the six kinds of nesting, and the theme system. Read this when writing props you have not written before; `props.md` in this package (or the `/props.md` address on the docs site) is the exhaustive, measured version.

## Props

**Spacing**: `p`/`px`/`py`/`pt`/`pr`/`pb`/`pl`/`ps`/`pe`, `m`/`mx`/`my`/`mt`/`mr`/`mb`/`ml`/`ms`/`me`, `gap` — the axis pair is already logical (`px` is `padding-inline`) and `ps`/`pe`, `ms`/`me` are its two sides
**Layout**: `display`, `d` (flex-direction), `wrap`, `ai` (align-items), `jc` (justify-content), `justifyItems`/`placeItems`/`placeContent`/`alignContent`/`alignSelf`/`justifySelf`, `flex`/`grow`/`shrink`, `container`/`containerName`/`containerType` (a query container — see `cq`). Every alignment prop also takes the **overflow-safe** forms — `'safe center'`, `'safe start'`, `'safe end'` and the `'unsafe …'` twins: `safe center` centres until the content stops fitting and then aligns to `start`, where plain `center` overflows both edges and the half above the scrollable origin cannot be reached at all. `aspectRatio` is `'square'` (1/1), `'video'` (16/9), a compact ratio (`'4/3'`), a number, or `'auto'`
**Sizing**: `width`/`height` — number (÷4=rem), `'auto'`, `'fit'` (100%), `'fit-screen'` (100vw/vh), fractions (`'1/2'`…), `'33%'`. `minWidth`/`maxWidth`/`minHeight`/`maxHeight` same. All accept `"5%"`.
**Colors**: `bgColor`/`color`/`borderColor`/`outlineColor`/`fill`/`stroke` — Tailwind's OKLCH palette, 26 families × 11 steps `'50'`..`'950'` (slate/gray/zinc/neutral/stone/mauve/mist/olive/taupe/red/orange/amber/yellow/lime/green/emerald/teal/cyan/sky/blue/indigo/violet/purple/fuchsia/pink/rose), plus `'white'`/`'black'`/`'transparent'`/`'currentColor'`. **Opacity modifier on any colour value**: `bgColor="blue-500/40"` → `color-mix(in oklab, var(--blue-500) 40%, transparent)` — the mix wraps the _variable_, so it stays themed and shared; unlike `opacity` it fades one declaration, not the element. Works in `vars` and on a `Box.extend()` variable (`"brand/30"`); an unknown token or a percentage outside 0–100 emits nothing
**Borders**: `b`/`bx`/`by`/`bt`/`br`/`bb`/`bl`/`bs`/`be` (px — `bs`/`be` are the logical sides), `borderRadius` (÷4) and its nine physical corners plus six logical ones (`borderRadiusStart`/`borderRadiusEnd`, and `borderRadiusStartStart`/`StartEnd`/`EndEnd`/`EndStart` — **block axis first, inline axis second**), `borderStyle`
**Text**: `fontSize` (÷16), `fontWeight`, `lineHeight` (px), `textAlign` (`'start'`/`'end'` follow the text direction where `'left'`/`'right'` do not)/`textDecoration`/`textTransform`/`whiteSpace`/`textOverflow`, `textWrap`
**Position**: `position`, `top`/`right`/`bottom`/`left`/`inset`/`insetX`/`insetY`/`insetStart`/`insetEnd`, `zIndex` — number (÷4), `'auto'`, fractions (`'1/2'`, `'-1/3'`) or a percentage; `insetX`/`insetY` are `inset-inline`/`inset-block`, the way `mx`/`my` are `margin-inline`/`margin-block`, and `insetStart`/`insetEnd` are that axis's two sides
**SVG paint & stroke**: `fill`/`stroke` (a colour variable, or a reference CSS resolves itself — `url(#sky)` for a gradient, pattern or `<ClipPath>`, `var(--chart-1)` for somebody else's variable; `clipPath` takes `url(#…)` the same way, and anything else emits no rule at all), `fillOpacity`/`strokeOpacity` (0–1 in tenths), `fillRule`, `strokeWidth`/`strokeDasharray`/`strokeDashoffset`/`strokeMiterlimit` (**user units — no divider**; a dash pattern with a gap is a string, `"12 4"`), `strokeLinecap`, `strokeLinejoin`, `paintOrder`, `vectorEffect`, `shapeRendering`. All inherited except `vectorEffect`, so set them on the `<svg>` (`Svg`) rather than on every shape.

**SVG text**: `textAnchor` (`start`/`middle`/`end` — which part of a label sits on its `x`) and `dominantBaseline` (`alphabetic`/`central`/`hanging`/… — which part sits on its `y`). `textAnchor` is inherited; `dominantBaseline` is not, so like `vectorEffect` its rule targets the element _and_ its descendants and still works on the `<svg>`.

**SVG geometry** (SVG 2, all **user units — no divider**, or a percentage): `cx`/`cy` (`<circle>`, `<ellipse>`), `r` (`<circle>`), `rx`/`ry` (`<ellipse>` radii, `<rect>` corners; also `auto`), `x`/`y` (`<rect>`, `<image>`, `<use>`, `<foreignObject>`, nested `<svg>` — **not** `<text>`). They are real CSS, so they transition: `<Circle r={38} hover={{ r: 40 }} />` is a whole animation. Not inherited — put them on the shape. A `<rect>`'s `width`/`height` are NOT in this family (those prop names are the ÷4 layout scale), which is why `<Rect>` claims them back as its own attributes — `<Rect width={40} height={40} />`. A path's `d` stays an attribute too (no Safari support), and `<Path d="M…" />` is how you write it.

**SVG elements** (`@box-kite/react/components/svg`, 20 components, server-safe): `Svg`, `G`, `Defs`, `Path`, `Circle`, `Ellipse`, `Rect`, `Line`, `Polyline`, `Polygon`, `SvgText`, `TSpan`, `LinearGradient`, `RadialGradient`, `Stop`, `ClipPath`, `Mask`, `Use`, `SvgSymbol`, `Marker` — so a drawing never writes `tag`. Each one is a Box and takes every prop above. **Each also settles the names SVG and Box both use, for its own element**: `Path`'s `d` is path data, `Rect`'s `width`/`height` are user units, `SvgText`/`TSpan`'s `x`/`y`/`dx`/`dy` are attributes (CSS geometry does not apply to text), `RadialGradient`'s `cx`/`cy`/`r` are attributes (nor to a gradient) — while `Circle`'s `cx` stays CSS and transitions. `transform` is a prop on every shape and group. `Svg` takes `viewBox`/`preserveAspectRatio`/`width`/`height` as attributes (so no ÷4 layout `width` on it) and a `label` prop: no label means `aria-hidden`, a label means `role="img"` with that name. A paint server is a value, not an attribute: `fill="url(#sky)"`, `clipPath="url(#frame)"` — themed and hoverable like any other paint. A themed gradient stop is `<Stop stopColor="currentColor" color="amber-300" />`. `BaseSvg` is deprecated — it is `Svg` with a 24×24 preset.

**Icons** (`@box-kite/react/components/icon`, server-safe): `<Icon size={5} color="amber-500" label="Sunny"><Sun /></Icon>` — Box props on an icon somebody else drew, wrapping exactly one element from lucide, Tabler, react-icons, or a raw `<svg>`. It resolves the props to a class and puts that on the icon's own `<svg>`, so it knows no set's API: `size` is the ÷4 scale (`size={6}` is 24px, the default; an icon set's own `size` counts in pixels, so `size={20}` becomes `size={5}`) and it lands in the _class_, where a CSS declaration outranks the `width`/`height` attributes the set writes for itself. `strokeWidth` is likewise the ordinary Box prop, so it can change on hover or at a breakpoint. No `label` means `aria-hidden`, a `label` means `role="img"` — the same rule `Svg` follows. **Prefer `Svg` over wrapping one in `Icon`**: `Svg` takes these props directly. (Wrapping works — `Icon` asks the child which convention it follows and routes `role`/`aria-label` into `props` for a component of ours — but it is a layer nobody needs.) The hook underneath is public — `useClassNames(props)` from the main entry returns `{ className, styles }` for anything Box cannot render (a `motion.div`, a `NavLink`); render `styles` beside the element (it is defined in element mode only). **Beyond lucide**: Iconify's 300k+ icons in 200+ sets reach the same `<Icon>`, the choice being only when the icon becomes markup — paste one icon's SVG (no dependency, server-renders); `unplugin-icons` for a set at build time (`npm i -D unplugin-icons @iconify-json/<set> @svgr/core @svgr/plugin-jsx`, plugin with `{ compiler: 'jsx', jsx: 'react' }`, `/// <reference types="unplugin-icons/types/react" />` in a `.d.ts`, then `import SiGithub from '~icons/simple-icons/github'`); or `@iconify/react` when the name is data — it fetches in the browser, so it is a client component and the server sends no icon. Turbopack runs no unplugin: under Next.js 16 the build-time recipe needs `next build --webpack`.

**Charts** (`@box-kite/react/components/chart`, server-safe): `Sparkline`, `ProgressRing`, `Gauge`, `MiniDonut` — micro-primitives over the SVG components, **not a chart library** (no axes, no legends, no data transformations; theme Recharts for that). Each is an `Svg`, so `width`/`height` are the attributes, the paint is inherited by the shapes inside (default stroke `currentColor`, so `color="sky-500"` recolours one), and every prop, pseudo-class, breakpoint and theme works. `<Sparkline data={[4, 9, 6, 12]} variant="line|area|bar" min={0} max={20} />` — it fills its box (`preserveAspectRatio="none"` + `vectorEffect="non-scaling-stroke"`, so the line stays one width thick at any size), and `min`/`max` fix the axis so a column of rows is comparable. `<ProgressRing value={0.62} thickness={10} trackOpacity={0.2} />` and `<Gauge value={0.4} sweep={270} start={225} />` (degrees clockwise from twelve o'clock; `sweep={360}` is a ring) draw the value as a dash on the arc — a style prop, so it **eases between values with no animation code**; the fraction is rounded to half a percent, because a dash length lands in a class name. `<MiniDonut data={[5, 3, 2]} colors={['sky-500', 'var(--chart-2)']} />` gives each value its share of the circle. `children` is SVG drawn after the chart (an `SvgText` in the middle, a `Defs` with a gradient); `label` names it `role="img"`, and without one it is `aria-hidden` — leave a sparkline beside its own number unnamed, name one that _is_ the data. Cheap in a grid: the shape is the `d` attribute (no CSS at all, so 10,000 rows share every rule) while the paint is a class. A DataGrid cell renderer is a component — define it outside the render.

**Theming a chart library** — `<ChartContainer>` (same entry, server-safe): the bridge for Recharts and anything
else that takes a colour. It declares `--chart-1` … `--chart-6` in both themes plus one `--color-<series>` per
series, so the chart itself names no colour at all: `series={['revenue', 'cost']}` (the palette in order) or
`series={{ revenue: 'emerald-600' }}` (your own paint), then `<Line stroke="var(--color-revenue)" />` inside. A
series name becomes part of a custom-property name, so it has to be a CSS identifier — a dot-path `dataKey` is
skipped. Overriding a slot needs no prop of its own, because the container is a Box:
`vars={{ 'chart-1': 'teal-600' }}`, `theme={{ dark: { vars: { 'chart-1': 'teal-400' } } }}`, and any other name
the chart reads (`--chart-grid`, `--chart-label` for axes) is declared the same way. The names are the ones the
ecosystem already uses, so a chart lifted from shadcn's charts works unchanged. It adds no role and no ARIA.

**Custom properties**: `vars` — the one prop whose declaration _names_ come from its value.
`vars={{ 'color-revenue': 'sky-500', 'chart-gap': '4px' }}` declares `--color-revenue: var(--sky-500)` and
`--chart-gap: 4px` on the element, inherited by everything inside it — including markup this library never
rendered (a chart library, a third-party widget). A colour token resolves to the variable behind it; every other
value is written out as it stands. Names may carry a leading `--` or not. It is an ordinary prop, so it nests in
`theme`/`hover`/a breakpoint and lands in a **class** — two subtrees declaring the same variables share one rule,
and nothing needs a `<style>` tag or an `id` to scope it. A name that is not a CSS identifier, or a value
containing `;` or a brace, is skipped (that entry only, not the whole record).

**Escape hatch**: `css={{ mixBlendMode: 'multiply', WebkitLineClamp: 2 }}` — a style object for the properties with
no prop, compiled to a **class** through the same pipeline (shared, nests in `hover`/`md`/`theme`/`dataAttr`/`before`/
`startingStyle`/a keyframes step, renders on a server), never an inline style. camelCase names typed by csstype (a
misspelling is a compile error, `WebkitLineClamp` → `-webkit-line-clamp`); values are CSS written as they stand — a
number too, so `width: 100` is a type error while `zIndex: 3` is fine — and a colour token resolves like a `vars`
value (`outlineColor: 'sky-500'`). Sorted **last**, so on one element it wins the property a typed prop also names.
A value with `;` or a brace is dropped (that entry only). Prefer a prop, then `Box.extend()` for anything used
twice; `css` is the one-off.

**Animation & transitions**: every Box already transitions `all` over `--transitionTime` (0.25s), which is why a `hover` colour fades
unasked. `animation` takes a preset — `'spin'`/`'pulse'`/`'bounce'`/`'ping'`/`'none'`, keyframes included, durations riding
`--transitionTime` so `prefers-reduced-motion` stops them for free. Longhands (declared after it, so they win): `animationName`,
`animationDuration`/`animationDelay` (**milliseconds, no divider** — `animationDuration={1100}`), `animationIterationCount` (number or
`'infinite'`), `animationDirection`, `animationFillMode`, `animationPlayState`, `animationTimingFunction`. Name a duration in ms and you
own reduced motion: add `motionReduce={{ animationName: 'none' }}`. `transition` narrows what transitions to a group — `'colors'`,
`'opacity'`, `'shadow'`, `'transform'`, `'size'`, `'filter'` (or `'all'`/`'none'`) — with `transitionDuration`/`transitionDelay` in ms and
`transitionTimingFunction` taking the keywords plus computed curves (`'cubic-bezier(0.4, 0, 0.6, 1)'`, `'steps(4, end)'`,
`'linear(0, 0.5, 1)'`; a typo emits no rule). **Springs** are four sampled curves — `'spring'` (540ms), `'spring-gentle'` (660ms),
`'spring-bouncy'` (880ms, 20% overshoot), `'spring-snappy'` (420ms) — and a spring is a curve _and_ a settling time, so name it on both
props: `<Box transition="transform" transitionTimingFunction="spring-bouncy" transitionDuration="spring-bouncy" hover={{ scale: 1.1 }} />`.
The durations ride `--transitionTime`, so reduced motion stops a spring too; `Box.spring({ stiffness, damping, mass, velocity })` returns
`{ easing, duration }` for one of your own. The curve is fixed once sampled (an interrupted transition restarts rather than carrying its
velocity — that is framer-motion's job), and every `linear()` is written with an `ease-out` under it for the ~13% of browsers without it. **`Box.keyframes()`** registers sequences whose steps are Box props —
`Box.keyframes({ 'slide-in': { from: { opacity: 0, translateY: 3 }, to: { opacity: 1, translateY: 0 } } })`, stops keyed `'from'`/`'to'`/`'50%'`
— written into the stylesheet the first time a rule names one, and exactly once, so an unused sequence costs nothing; it reaches
`getStyles()` and element mode, so a Server Component animates with no client JS. **Transforms compose**: `translateX`/`translateY` (÷4,
fractions, percentages) both feed one `translate` and still transition _and_ animate (the base stylesheet registers both axes with
`@property`, or a keyframe moving them would jump), `rotate={45}` (degrees) and `scale={1.05}` (unitless) are their own
properties — only `flip` and `scale` collide, both writing `scale`. **`startingStyle` is an entrance with no JavaScript**: a nested block of
plain props (`startingStyle={{ opacity: 0, translateY: 2 }}`) saying what they start from the first time the element is styled — mounted, or
shown from `display: none`. It compiles to `@starting-style`, nests inside a breakpoint/pseudo-class/theme rather than around one
(`md: { startingStyle: … }`), and a browser without the at-rule shows the element finished. Its declarations are emitted `!important` — a
starting rule at `.x` would otherwise lose on specificity to the value it starts from at `.dark .x` or `.x[data-state="open"]` and nothing
would transition at all; the importance reaches nothing but the before-change style. `Tooltip` and the `Dropdown` popup already carry
one. For the way back out React unmounts too fast to animate, so either hide instead — `transitionBehavior="allow-discrete"` lets `display`
transition, flipping it at the _end_, so `<Box display={open ? 'block' : 'none'} opacity={open ? 1 : 0} transitionBehavior="allow-discrete"
startingStyle={{ opacity: 0 }} />` animates both directions — or hold the node with **`<Presence present>`**
(`components/presence`): a render prop handed `{ present, state, ref, props }` that keeps rendering its child with `present: false` until the
child's own CSS says the transition is over, then lets React remove it. `ref` goes on the element carrying the transition (its computed
`transition-duration`/`animation-duration` _is_ the wait — not a `transitionend` listener, which fires once per property), `props` is
`{ 'data-state': 'open' | 'closed' }`. Under `prefers-reduced-motion` the measured wait is `0` and the node leaves in the same commit.
`Tooltip`, the `Dropdown` popup and the DataGrid column menu are built on it. `interpolateSize="allow-keywords"` on a container is what makes
`height: auto` animate inside it (inherited; Chromium-only, elsewhere it snaps). `Box.configure({ transition: 'colors' | false })` changes
what the base class transitions, before the first render.

**Gradients**: `bgGradient` — a gradient as a _value_, written as a record, so its stops are palette tokens and it is
themed, takes the opacity modifier and shares one class. The key names the kind and carries its geometry:
`{ linear: 'r', colors: ['blue-500', 'pink-500'] }` (a direction `t`/`tr`/`r`/`br`/`b`/`bl`/`l`/`tl`, or a number of
degrees — `{ linear: 135, … }`), `{ radial: 'circle' | 'ellipse' | true, at: 'top left', … }`, `{ conic: 45 | true, … }`.
Exactly one kind; `at` centres a radial or conic gradient, never a linear one. A stop is any colour value —
`'blue-500/40'`, `'transparent'`, `'var(--chart-1)'` — or a `[colour, position]` pair (`['sky-500', '20%']`), **two
minimum**. `interpolate` names the space: `'srgb'`, `'hsl'`, `'oklab'`, `'oklch'`, `'hsl-longer'`, `'oklch-longer'` —
`'oklch'` is what keeps two stops out of the grey middle sRGB drags them through, and a `-longer` hue turns two stops
into a spectrum. The record is judged **whole**: one unknown stop, one misspelt key (`interpolat`), two kinds at once,
and the value emits no rule and no class name. It writes `background-image`, so `bgGradient` and `bgImage` are the
same property — use one.

**Shadows stack, four at a time**: `box-shadow` is one property, so each layer sets its own custom property and all
four write the same composed declaration — a ring and an elevation coexist instead of the last rule winning.
`shadow`: `'xxs'`/`'xs'`/`'sm'`/`'md'`/`'lg'`/`'xl'`/`'xxl'` on Tailwind's elevation scale, plus the three original presets
`'small'`/`'medium'`/`'large'` (which carry their own colour), plus `'none'`. `insetShadow`: `'xxs'`/`'xs'`/`'sm'`, drawn
inside the border box. `ring`/`insetRing` are a **width in px**, not a scale — `ring={2}` — and unlike `outline` a ring
joins the stack, follows `borderRadius` and costs no layout. Each layer takes a colour of its own: `shadowColor`,
`insetShadowColor`, `ringColor` (`currentColor` by default), `insetRingColor` — every colour value, modifier included
(`shadowColor="blue-500/40"`). A colour prop **shows nothing on its own**, the way `borderColor` does with no border
width. `'none'` — or `0` on a ring — clears just that layer. `textShadow` (`'xxs'`…`'lg'`, `'none'`) with
`textShadowColor` is the text-side pair, and `transition="shadow"` covers `box-shadow` and `text-shadow` both.

**Filters stack, nine at a time**, for the reason the shadows do: `filter` is one property whose value is a list, so
each function sets its own custom property and all nine write the same composed declaration. `blur`, `brightness`,
`contrast`, `grayscale`, `hueRotate`, `invert`, `saturate`, `sepia`, `dropShadow`. **A number is the function's own
unit**: a percentage for the six that take one (`brightness={110}`, `grayscale={100}`), degrees for `hueRotate`, px for
`blur` — which also takes Tailwind's scale, `'xs'` (4px) `'sm'` (8px) `'md'` (12px) `'lg'` (16px) `'xl'` (24px)
`'xxl'` (40px) `'xxxl'` (64px). `dropShadow` is `'xs'`…`'xxl'` with `dropShadowColor`, and it is cast by the **shape** —
an SVG path, the opaque part of a transparent PNG — where `shadow` draws a rectangle round the box. `'none'` clears
just that function. The nine `backdrop*` props (`backdropBlur`, `backdropBrightness`, `backdropContrast`,
`backdropGrayscale`, `backdropHueRotate`, `backdropInvert`, `backdropOpacity`, `backdropSaturate`, `backdropSepia`) are
the same functions on `backdrop-filter`, which is the glassmorphism half; there is no `backdropDropShadow` and no
`opacity` filter, because neither means anything on the other side. The older `backdropFilter` prop writes that
property directly — it and the nine are the same declaration, so use one. `transition="filter"` covers both properties.

**Masks and clipping**: `maskImage` takes the same record `bgGradient` does and reads its alpha channel — where the
gradient is transparent the element is not painted, so `maskImage={{ linear: 'b', colors: ['black', 'transparent'] }}`
is the whole edge-fade recipe. It also takes `'url(#id)'`, `'var(--name)'` and `'none'`; one mask, not a stack.
`bgClip` is `'border'`/`'padding'`/`'content'`/`'text'`, and `bgClip="text"` with `color="transparent"` is how a
gradient becomes lettering — the pairing is deliberately not automatic.

**Effects**: `opacity`, `cursor`, `pointerEvents`, `userSelect`, `overflow`

**Native controls**: `accentColor` tints the parts of a checkbox, radio, range or progress bar the page does not draw — the palette, its opacity modifier and the system colours, and it inherits, so a form sets it once instead of every control giving up `appearance`. `caretColor` is the text caret. `colorScheme` (`'light'`, `'dark'`, `'light dark'`, `'only light'`, `'only dark'`, `'normal'`) is what native UI follows: scrollbars, form controls, the spellcheck underline — a dark theme that leaves it alone gets light scrollbars over a dark page. `fieldSizing="content"` is a control that grows with what is typed into it, with nothing measuring anything. `scrollbarGutter="stable"` (or `'stable both-edges'`) reserves the scrollbar's space before there is one, so a panel does not shift when its content overflows; `scrollbarWidth`/`scrollbarColor` style the bar itself. `willChange` (`'transform'`, `'opacity'`, `'filter'`, `'scroll-position'`, `'contents'`) promotes an element before it animates rather than during — a hint with a real cost, so it goes on the few elements that move, never on a list

## Pseudo-Classes, Breakpoints, State Variants & Container Queries

```tsx
<Box bgColor="blue-500" hover={{ bgColor: 'blue-600' }} disabled={{ opacity: 0.5 }} />
// Pseudo: hover, focus (:focus-within), focusVisible, hasFocus, active, valid, invalid, optional,
//   disabled, checked, indeterminate, required, selected, hasChecked, hasRequired, hasDisabled,
//   visited (colour props only — the privacy rule), target, open (an [open] element, a popover or a
//   <select>'s picker), placeholderShown, autofill, inRange, outOfRange, inert (the subtree too),
//   rtl / ltr (:dir() — this element's own resolved direction, so ltr matches with no dir set anywhere)
// Responsive (mobile-first): sm(640) md(768) lg(1024) xl(1280) xxl(1536)
<Box p={2} md={{ p: 4, hover: { bgColor: 'gray-200' } }} />
// Device + a11y media keys, same shape as a breakpoint, and they beat every breakpoint in the cascade:
//   pointerCoarse / pointerFine (pointer: coarse|fine — a finger needs a bigger target, and never
//   hovers; ranked below the three preferences), motionReduce (prefers-reduced-motion: reduce),
//   forcedColors (forced-colors: active), contrastMore (prefers-contrast: more).
//   Not nestable in a breakpoint or in each other.
// The pre-built components come with one dir and no configuration: useRovingFocus reads the element's
// resolved direction when a sideways arrow arrives, so ArrowLeft is the *next* item in a right-to-left
// list or grid (APG's rule; Tab/Home/End never flip); a DataGrid column pins to 'START'/'END' of the
// inline axis; and Overlay stays in the subtree it was declared in, so the layer inherits its direction
// (on the portal fallback it measures one and writes it on). Physical on purpose: Overlay's coordinates.
// Reduced motion is already the default — the preference sets --transitionTime to 0s, so every
// Box stops animating. Declare motionReduce only to replace a movement or keep a safe one.
<Box transitionDuration={150} motionReduce={{ transition: 'none' }} forcedColors={{ b: 1 }} />
// Forced colours keep only the system colours, so they are values on every colour prop: Canvas,
// CanvasText, ButtonFace, ButtonText, Highlight, HighlightText, GrayText, LinkText (keywords, not tokens).
<Box forcedColors={{ bgColor: 'ButtonFace', color: 'ButtonText' }} />
// State variants — a selector fragment on the element's own class, so a state your code sets is CSS,
// not a ternary. Record key = the selector; a key the grammar rejects drops its block, like a bad value.
//   dataAttr {'state=open'} → [data-state="open"], {'loading'} → [data-loading]
//   ariaAttr {'selected'} → [aria-selected="true"] (bare key means ="true"), {'sort=ascending'}
//   has {':checked'} → :has(:checked)   ·   not {hover} / {'data-loading'} → :not(:hover) / :not([data-loading])
//   nth {first|last|only|odd|even|'3'|'2n+1'|'-n+3'|'last 2'} → :first-child … :nth-last-child(2)
// The attribute itself still goes in `props`. Everything else nests around them, either direction.
<Box props={{ 'data-state': state }} dataAttr={{ 'state=busy': { bgColor: 'amber-500' } }}
  md={{ hover: { ariaAttr: { selected: { color: 'white' } } } }} />
<Box bb={1} nth={{ odd: { bgColor: 'slate-500/10' }, 'last 1': { bb: 0 } }} />
// Somebody else's state: group = an ancestor, peer = a preceding sibling. The key is a state, on the
// default class (group/peer, Tailwind's names) or on one you name — 'card/hover', 'row/data-state=open'.
// The ancestor carries the class through `className`; the element's own states stay on the element.
// hoverGroup/focusGroup/activeGroup/disabledGroup/selectedGroup are the older spelling of the same
// rule (hoverGroup={{ card }} === group={{ 'card/hover' }}) and share its class. A name that is not a
// CSS identifier drops the block; a group means nothing in addGlobalStyles.
<Flex className="card">
  <Box opacity={0} group={{ 'card/hover': { opacity: 1 } }} />
</Flex>
<Checkbox className="agree" label={<Box peer={{ 'agree/checked': { color: 'emerald-500' } }}>I agree</Box>} />
// Pseudo-elements — CSS allows ONE per selector, so it is a slot: a second nested one is a type error,
// and it lands last on the element's own compound (on the target, not on a group's ancestor).
//   before, after (both come with content: '' — a generated element with none renders nothing),
//   placeholder, selection, marker, firstLine, firstLetter, backdrop, fileButton
//   marker/selection also name descendants, so they go on the <Ul> or the <P>
// content: 'empty' → ''  ·  'New' → "New" (text is quoted for you)  ·  'attr(data-x)'/'counter(s)'/
//   'url(...)'/'var(--x)'/'"Step " counter(step)' written out as CSS  ·  'none' turns it off.
//   A value that cannot be quoted or parsed produces no rule and no class name.
<Box position="relative" before={{ position: 'absolute', inset: 0, bgColor: 'indigo-500' }}
  hover={{ before: { width: 'fit' } }} after={{ content: 'attr(data-count)' }} />
// On Textbox/Textarea the name means both: a string is the attribute, an object the styles; both at
// once puts the text in `props`. `placeholderStyles` is the old name for `placeholder` and still works.
<Textbox props={{ placeholder: 'Search…' }} placeholder={{ color: 'slate-400' }} />
// Container queries — the same question, asked of the element's own container. `container` makes one
// (true → container-type: inline-size; a name → container: <name> / inline-size), containerName and
// containerType ('inline-size' | 'size' | 'normal') are the longhands. `cq` queries the NEAREST one,
// keyed by size: xs(20rem) sm(24) md(28) lg(32) xl(36) xxl(42), each with a complement maxXs…maxXxl
// (`not (min-width: …)`, so md and maxMd never both match), and `'name/md'` for a named container.
// Ranked after every breakpoint and before every preference; one at-rule block per rule, so cq and a
// breakpoint do not nest in each other. A name that is not a CSS ident drops its block.
<Flex container="card">
  <Box cq={{ sm: { d: 'row' }, maxSm: { display: 'none' }, 'card/xl': { p: 6 } }} />
</Flex>
```

## Theme System

```tsx
<Box.Theme>                            {/* auto-detect system */}
<Box.Theme theme="dark" use="global">  {/* explicit + applies to <html> */}
<Box.Theme storageKey="app-theme">     {/* persists to localStorage */}
// Hook: const [theme, setTheme] = Box.useTheme();
// setTheme('dark') | setTheme(null) resets to auto
<Box bgColor="white" theme={{ dark: { bgColor: 'gray-900', hover: { bgColor: 'gray-700' } } }} />
// App-wide styles on <html> (only with use="global"). Use for inheritable CSS (scrollbarColor, fontFamily, color):
<Box.Theme use="global" globalStyles={{ scrollbarColor: ['violet-500','transparent'],
  theme: { dark: { scrollbarColor: ['violet-700','gray-900'] } } }} />
```

**Props**: `theme?` (string), `use?` (`'global'`|`'local'`), `storageKey?`, `globalStyles?` (BoxStyleProps — `<html>`, requires `use="global"`). Sets `data-theme` attr + class.
