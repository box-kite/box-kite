# @box-kite/react - AI Assistant Context

Runtime CSS-in-JS library. `Box` component accepts 221 CSS props and generates CSS classes at runtime. Same prop values share a single class.

---

## CRITICAL RULES

### Rule #1: NEVER Use Inline Styles

Always use Box props. If a prop doesn't exist, create it with `Box.extend()` (see Extension System) — or,
for a one-off property, write it in `css={{ … }}`: the typed escape hatch, which is still a class and
never a `style` attribute (see "The escape hatch").

| Inline Style (WRONG)                          | Box Prop (CORRECT)                             |
| --------------------------------------------- | ---------------------------------------------- |
| `style={{ width: "100%" }}`                   | `width="fit"`                                  |
| `style={{ width: "100vw" }}`                  | `width="fit-screen"`                           |
| `style={{ height: "100%" }}`                  | `height="fit"`                                 |
| `style={{ height: "100vh" }}`                 | `height="fit-screen"`                          |
| `style={{ minHeight: "100vh" }}`              | `minHeight="fit-screen"`                       |
| `style={{ maxWidth: "1200px" }}`              | `maxWidth={300}` (300/4=75rem=1200px)          |
| `style={{ alignItems: "center" }}`            | `ai="center"`                                  |
| `style={{ justifyContent: "space-between" }}` | `jc="between"`                                 |
| `style={{ flexDirection: "column" }}`         | `d="column"`                                   |
| `style={{ pointerEvents: "none" }}`           | `pointerEvents="none"`                         |
| `style={{ cursor: "pointer" }}`               | `cursor="pointer"`                             |
| `style={{ overflow: "hidden" }}`              | `overflow="hidden"`                            |
| `style={{ position: "relative" }}`            | `position="relative"`                          |
| `style={{ zIndex: 10 }}`                      | `zIndex={10}`                                  |
| `style={{ opacity: 0.5 }}`                    | `opacity={0.5}`                                |
| `sm={{ style: { maxWidth: 600 } }}`           | `sm={{ maxWidth: 150 }}` (150/4=37.5rem=600px) |

**`style` is top-level only** — it is NOT supported inside breakpoints, pseudo-classes, or theme objects. Always use Box props for responsive/conditional styles; `css` nests anywhere a prop does (`md={{ css: { objectPosition: 'center' } }}` compiles to a rule).

### Rule #2: ALWAYS Use Component Shortcuts

NEVER use `<Box tag="...">` when a component exists. NEVER use `<Box display="flex/grid">`.

| Instead of...                        | Use...                           | Import from            |
| ------------------------------------ | -------------------------------- | ---------------------- |
| `<Box display="flex">`               | `<Flex>`                         | `components/flex`      |
| `<Box display="grid">`               | `<Grid>`                         | `components/grid`      |
| `<Box tag="button">`                 | `<Button>`                       | `components/button`    |
| `<Box tag="input">`                  | `<Textbox>`                      | `components/textbox`   |
| `<Box tag="textarea">`               | `<Textarea>`                     | `components/textarea`  |
| `<Box tag="a/img/label">`            | `<Link>/<Img>/<Label>`           | `components/semantics` |
| `<Box tag="h1/h2/h3/h4/h5/h6">`      | `<H1>/<H2>/.../<H6>`             | `components/semantics` |
| `<Box tag="p/span">`                 | `<P>/<Span>`                     | `components/semantics` |
| `<Box tag="ul/ol/li">`               | `<Ul>/<Ol>/<Li>`                 | `components/semantics` |
| `<Box tag="nav/header/footer/main">` | `<Nav>/<Header>/<Footer>/<Main>` | `components/semantics` |
| `<Box tag="section/article/aside">`  | `<Section>/<Article>/<Aside>`    | `components/semantics` |
| `<Box tag="svg/path/circle/rect">`   | `<Svg>/<Path>/<Circle>/<Rect>`   | `components/svg`       |
| a lucide/Tabler icon, styled         | `<Icon>`                         | `components/icon`      |

All imports from `@box-kite/react/components/...`. Semantics also export: `Mark`, `Figure`, `Figcaption`, `Details`, `Summary`, `Menu`, `Time`.

---

## Numeric Value Formatters

**#1 source of confusion.** Different props have different dividers:

| Prop Category                                                                          | Divider | Example                    | CSS Output                     |
| -------------------------------------------------------------------------------------- | ------- | -------------------------- | ------------------------------ |
| Spacing (`p`, `m`, `gap`, `px`, `py`, `mx`, `my`, etc.)                                | 4       | `p={4}`                    | `padding: 1rem` (16px)         |
| Font size (`fontSize`)                                                                 | **16**  | `fontSize={14}`            | `font-size: 0.875rem` (14px)   |
| Width/Height (numeric)                                                                 | 4       | `width={20}`               | `width: 5rem` (80px)           |
| Border width (`b`, `bx`, `by`, `bt`, `br`, `bb`, `bl`, `bs`, `be`)                     | none    | `b={1}`                    | `border-width: 1px`            |
| Border radius (`borderRadius`, `borderRadiusTop`, …)                                   | 4       | `borderRadius={2}`         | `border-radius: 0.5rem` (8px)  |
| Line height (`lineHeight`)                                                             | none    | `lineHeight={24}`          | `line-height: 24px`            |
| SVG lengths (`strokeWidth`, `strokeDasharray`, `r`, `cx`, …)                           | none    | `strokeWidth={2}`          | `stroke-width: 2` (user units) |
| Times (`animationDuration`, `animationDelay`, `transitionDuration`, `transitionDelay`) | none    | `animationDuration={1100}` | `animation-duration: 1100ms`   |

```tsx
// fontSize: divider 16 → value maps directly to px
fontSize={12} // 12px    fontSize={14} // 14px    fontSize={16} // 16px
fontSize={18} // 18px    fontSize={24} // 24px    fontSize={32} // 32px

// Spacing: divider 4 → value/4 = rem
p={1} // 4px    p={2} // 8px    p={3} // 12px    p={4} // 16px    p={6} // 24px    p={8} // 32px

// Width/Height/min/max: divider 4 → value/4 = rem (NOT direct pixels)
width={20} // 5rem = 80px      height={10} // 2.5rem = 40px     height={20} // 5rem = 80px
maxWidth={300} // 75rem = 1200px    minHeight={50} // 12.5rem = 200px
height="fit" // 100%    height="fit-screen" // 100vh    width="1/2" // 50%
```

---

## Prop Reference

### Spacing

| Prop                                                        | CSS Property                                                                    |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `p` / `px` / `py` / `pt` / `pr` / `pb` / `pl` / `ps` / `pe` | padding (all / inline axis / block axis / one physical side / one logical side) |
| `m` / `mx` / `my` / `mt` / `mr` / `mb` / `ml` / `ms` / `me` | margin (all / inline axis / block axis / one physical side / one logical side)  |
| `gap`                                                       | gap (flexbox/grid)                                                              |

### Logical properties and RTL

Every axis prop was already logical — `mx` is `margin-inline`, `px` is `padding-inline`, `insetX` is `inset-inline`. These are the two **sides** of that axis, so one stylesheet serves both reading directions: the browser resolves them from `dir`, and nothing re-renders.

| Physical                                          | Logical                                                                                           | CSS                                                     |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `pl` / `pr`                                       | `ps` / `pe`                                                                                       | `padding-inline-start` / `padding-inline-end`           |
| `ml` / `mr`                                       | `ms` / `me`                                                                                       | `margin-inline-start` / `margin-inline-end`             |
| `bl` / `br`                                       | `bs` / `be`                                                                                       | `border-inline-start-width` / `border-inline-end-width` |
| `left` / `right`                                  | `insetStart` / `insetEnd`                                                                         | `inset-inline-start` / `inset-inline-end`               |
| `borderRadiusLeft` / `borderRadiusRight`          | `borderRadiusStart` / `borderRadiusEnd`                                                           | the two corners on that inline side                     |
| `borderRadiusTopLeft` … `borderRadiusBottomRight` | `borderRadiusStartStart` / `borderRadiusStartEnd` / `borderRadiusEndEnd` / `borderRadiusEndStart` | one corner; **block axis first, inline axis second**    |

`textAlign` takes `'start'` and `'end'` beside `'left'`/`'right'`. The dividers are unchanged: `ps`/`pe`/`ms`/`me`/`insetStart`/`insetEnd` and the radii are the ÷4 spacing scale, `bs`/`be` are direct px.

```tsx
// A notification card whose accent bar stays on the side the text starts from
<Flex props={{ dir }} ps={4} pe={3} py={3} bs={4} borderStyle="solid" borderColor="indigo-500" borderRadiusEnd={2}>
  <Box flex1>Your order is on its way</Box>
  <Box rtl={{ flip: 'xAxis' }}>→</Box>
</Flex>
```

`rtl` and `ltr` are ordinary pseudo-class keys for what the logical props cannot express — an arrow that has to point the other way, a shadow that has to fall the other way. They compile to `:dir(rtl)` / `:dir(ltr)` rather than Tailwind's `[dir="rtl"] &`: the direction belongs to **this** element, so a `<bdi>` or a `dir="auto"` that flipped one paragraph is seen. Two consequences: with no `dir` anywhere the document is left-to-right, so `ltr` matches (it is a state, not an attribute you have to write); and the `dir` attribute itself goes in `props`, where every attribute goes.

```tsx
<Box props={{ dir: 'rtl' }} rtl={{ flip: 'xAxis' }} not={{ rtl: { ms: 2 } }} md={{ rtl: { textAlign: 'end' } }} />
```

**The pre-built components come with it**, so one `dir` is the whole change:

- **The arrow keys follow the reading order.** `useRovingFocus` reads the element's _resolved_ direction when a sideways arrow arrives, so in a right-to-left list or grid `ArrowLeft` moves to the **next** item — which is what APG asks for. Nothing is configured; a `dir` anywhere above the list is enough, and a vertical list pays nothing. Tab, Home and End never flip.
- **A DataGrid column pins to `'START'` or `'END'`** of the inline axis rather than to a screen side, so it stays where the reading begins under either direction; `'LEFT'`/`'RIGHT'` are the older spelling of those two. `align` gained `'start'`/`'end'`, the resize handle grows a column towards the reading end, and the column menu's _Pin Left_ reads _Pin Right_ when that is the side it would pin to.
- **A popup carries the direction out of the tree with it.** `Overlay` portals into a container that is a child of the body, where nothing of the declaration site is inherited, so it reads the direction off its anchor and writes it back on as `dir` — `Tooltip`, the `Dropdown` popup and the grid's column menu all get that.
- **What stays physical, on purpose**: the grid's loading bar sweeps the same way in both. (`Overlay` no longer positions in page coordinates at all — a `side` is logical, so a layer beside its anchor mirrors with the reading order.)

### Layout

| Prop                                                                                          | CSS Property                                                                            | Values                                                                                                                                                                                                                                                                                                                                                                                                                  |
| --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `display`                                                                                     | display                                                                                 | `'flex'`, `'block'`, `'inline'`, `'grid'`, `'none'`, `'inline-flex'`, etc.                                                                                                                                                                                                                                                                                                                                              |
| `d`                                                                                           | flex-direction                                                                          | `'row'`, `'column'`, `'row-reverse'`, `'column-reverse'`                                                                                                                                                                                                                                                                                                                                                                |
| `wrap`                                                                                        | flex-wrap                                                                               | `'wrap'`, `'nowrap'`, `'wrap-reverse'`                                                                                                                                                                                                                                                                                                                                                                                  |
| `ai`                                                                                          | align-items                                                                             | `'center'`, `'start'`, `'end'`, `'stretch'`, `'baseline'`                                                                                                                                                                                                                                                                                                                                                               |
| `jc`                                                                                          | justify-content                                                                         | `'center'`, `'start'`, `'end'`, `'between'`, `'around'`, `'evenly'`                                                                                                                                                                                                                                                                                                                                                     |
| `justifyItems` / `placeItems` / `placeContent` / `alignContent` / `alignSelf` / `justifySelf` | justify-items / place-items / place-content / align-content / align-self / justify-self | `'center'`, `'start'`, `'end'`, `'stretch'`, `'baseline'`, `'self-start'`, `'self-end'`. **Every alignment prop also takes the overflow-safe forms** — `'safe center'`, `'safe start'`, `'safe end'` and the `'unsafe …'` twins: `safe center` centres until the content stops fitting and then aligns to `start`, where plain `center` overflows both edges and the half above the scrollable origin cannot be reached |
| `aspectRatio`                                                                                 | aspect-ratio                                                                            | `'square'` (1/1), `'video'` (16/9), a ratio written compactly (`'4/3'`), a number (`aspectRatio={2}`), or `'auto'`                                                                                                                                                                                                                                                                                                      |
| `flex` / `grow` / `shrink`                                                                    | flex / flex-grow / flex-shrink                                                          | number or string                                                                                                                                                                                                                                                                                                                                                                                                        |
| `container`                                                                                   | container(-type)                                                                        | `true`, or a name — makes the element a query container (see `cq` below)                                                                                                                                                                                                                                                                                                                                                |

### Sizing

| Prop                                                | CSS Property   | Accepts                                                                                                                                             |
| --------------------------------------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `width` / `height`                                  | width / height | number (rem/4), `'auto'`, `'fit'` (100%), `'fit-screen'` (100vw/vh), fractions (`'1/2'`, `'1/3'`, `'2/3'`, `'1/4'`, `'3/4'`), percentages (`'33%'`) |
| `minWidth` / `maxWidth` / `minHeight` / `maxHeight` | min/max sizing | number or string                                                                                                                                    |

All sizing, spacing, and positioning props also accept percentage strings: `p="5%"`, `top="10%"`, `gap="2%"`.

### Visual

| Prop                                                                                                                                                                                 | CSS Property                            | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bgColor` / `color` / `borderColor`                                                                                                                                                  | background-color / color / border-color | Tailwind's OKLCH palette, 26 families × 11 steps: `'gray-50'`..`'gray-950'`, same for slate/zinc/neutral/stone/mauve/mist/olive/taupe/red/orange/amber/yellow/lime/green/emerald/teal/cyan/sky/blue/indigo/violet/purple/fuchsia/pink/rose. Also `'white'`, `'black'`, `'transparent'`, `'currentColor'`. Any of them takes an **opacity modifier** — `bgColor="blue-500/40"`. Plus the CSS **system colours** (`'Canvas'`, `'CanvasText'`, `'ButtonFace'`, `'ButtonText'`, `'Highlight'`, `'HighlightText'`, `'GrayText'`, `'LinkText'`) — keywords rather than tokens, and the one palette a forced-colors mode keeps |
| `b` / `bx` / `by` / `bt` / `br` / `bb` / `bl` / `bs` / `be`                                                                                                                          | border-width                            | direct px                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `borderRadius`                                                                                                                                                                       | border-radius                           | divider 4 (spacing scale)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `borderStyle`                                                                                                                                                                        | border-style                            | `'solid'`, `'dashed'`, `'dotted'`, `'none'`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `fontSize`                                                                                                                                                                           | font-size                               | divider 16                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `fontWeight`                                                                                                                                                                         | font-weight                             | `400`, `500`, `600`, `700`, etc.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `lineHeight`                                                                                                                                                                         | line-height                             | direct px                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `textAlign` / `textDecoration` / `textTransform` / `whiteSpace` / `textOverflow`                                                                                                     | text properties                         | string values                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `overflow`                                                                                                                                                                           | overflow                                | `'hidden'`, `'auto'`, `'scroll'`, `'visible'`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `position`                                                                                                                                                                           | position                                | `'relative'`, `'absolute'`, `'fixed'`, `'sticky'`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `top` / `right` / `bottom` / `left` / `inset` / `insetX` / `insetY` / `insetStart` / `insetEnd`                                                                                      | positioning offsets                     | number (rem/4), `'auto'`, fractions (`'1/2'`, `'-1/3'`), percentages. `insetX`/`insetY` are the logical shorthands `inset-inline`/`inset-block`, the way `mx`/`my` are `margin-inline`/`margin-block`                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `zIndex`                                                                                                                                                                             | z-index                                 | number                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `shadow` / `insetShadow` / `ring` / `insetRing`                                                                                                                                      | box-shadow (four stacking layers)       | `shadow`: `'xxs'`..`'xxl'` on Tailwind's scale, the presets `'small'`/`'medium'`/`'large'`, or `'none'`. `insetShadow`: `'xxs'`/`'xs'`/`'sm'`. `ring`/`insetRing`: a width in px. Each is its own layer, so they stack. `shadowColor`/`insetShadowColor`/`ringColor`/`insetRingColor` recolour one. See _Gradients, shadows and rings_                                                                                                                                                                                                                                                                                  |
| `textShadow` / `textShadowColor`                                                                                                                                                     | text-shadow                             | `'xxs'`..`'lg'` or `'none'`; the colour is a separate prop, as with the box shadows                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `bgGradient`                                                                                                                                                                         | background-image                        | A gradient as a record: `{ linear: 'r', colors: ['blue-500', 'pink-500'] }`. Same property as `bgImage` — use one                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |     |
| `blur` / `brightness` / `contrast` / `grayscale` / `hueRotate` / `invert` / `saturate` / `sepia`                                                                                     | filter (nine stacking functions)        | A number is the function's own unit — `%` for the six that take one, `deg` for `hueRotate`, `px` for `blur`, which also takes `'xs'`..`'xxxl'`. `'none'` clears one function. See _Filters, backdrop filters and masks_                                                                                                                                                                                                                                                                                                                                                                                                 |
| `dropShadow` / `dropShadowColor`                                                                                                                                                     | filter: drop-shadow()                   | `'xs'`..`'xxl'` or `'none'`. Cast by the shape, not the box — the ninth filter function, not a fifth shadow layer                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `backdropBlur` / `backdropBrightness` / `backdropContrast` / `backdropGrayscale` / `backdropHueRotate` / `backdropInvert` / `backdropOpacity` / `backdropSaturate` / `backdropSepia` | backdrop-filter                         | The same nine on what is behind the element. Same property as `backdropFilter` — use one                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `maskImage`                                                                                                                                                                          | mask-image                              | The gradient record `bgGradient` takes, `'url(#id)'`, `'var(--name)'` or `'none'`. One mask, not a stack                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `bgClip`                                                                                                                                                                             | background-clip                         | `'border'`, `'padding'`, `'content'`, `'text'` — `text` needs `color="transparent"` beside it                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `opacity`                                                                                                                                                                            | opacity                                 | number                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `accentColor` / `caretColor`                                                                                                                                                         | accent-color / caret-color              | The palette, its opacity modifier and the system colours. `accentColor` tints the parts of a native control the page does not draw — a checkbox's tick, a radio's dot, a range track, a progress bar — without `appearance="none"` and a rebuild, and it inherits, so a form can set it once                                                                                                                                                                                                                                                                                                                            |
| `colorScheme`                                                                                                                                                                        | color-scheme                            | `'light'`, `'dark'`, `'light dark'`, `'only light'`, `'only dark'`, `'normal'`. What native UI follows: scrollbars, form controls, the spellcheck underline. A dark theme that leaves it alone gets light scrollbars over a dark page                                                                                                                                                                                                                                                                                                                                                                                   |
| `fieldSizing`                                                                                                                                                                        | field-sizing                            | `'content'` — a control that grows with what is typed into it, no JavaScript measuring anything — or `'fixed'`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `scrollbarGutter` / `scrollbarWidth` / `scrollbarColor`                                                                                                                              | scrollbar-gutter / -width / -color      | `'stable'` / `'stable both-edges'` reserve the scrollbar's space before there is one, so nothing shifts when content overflows. `scrollbarWidth`: `'auto'`/`'thin'`/`'none'`; `scrollbarColor`: `[thumb, track]`                                                                                                                                                                                                                                                                                                                                                                                                        |
| `willChange`                                                                                                                                                                         | will-change                             | `'transform'`, `'opacity'`, `'filter'`, `'scroll-position'`, `'contents'`, `'auto'`. A hint with a real cost (a promoted layer holds memory), so it belongs on the few elements that animate, not on a list                                                                                                                                                                                                                                                                                                                                                                                                             |
| `cursor` / `pointerEvents` / `userSelect`                                                                                                                                            | misc                                    | string values. For `transition`, `animation` and the transform props see _Animation and transitions_ below                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |

### Anchor positioning — a floating layer with no JavaScript

CSS Anchor Positioning as six props, so a tooltip, popup or badge is placed by the browser instead of measured in an effect. The anchor names itself; the layer says which anchor and which cell of the 3×3 grid around it:

```tsx
<Button anchorName="menu-trigger">Options</Button>

<Box position="absolute" positionAnchor="menu-trigger" positionArea="block-end span-all" positionTryFallbacks="flip-block" mt={2}>
  …
</Box>
```

| Prop                   | CSS                      | Values                                                                                                                                      |
| ---------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `anchorName`           | `anchor-name`            | a name with or without `--` (`"trigger"` → `--trigger`), or `'none'`. Global to the document, so one instance needs one name                |
| `positionAnchor`       | `position-anchor`        | the same name, or `'auto'` / `'none'`. Needs `position="absolute"` (or `"fixed"`) beside it                                                 |
| `positionArea`         | `position-area`          | one or two keywords, **block axis first**, both from one family: `'block-end center'`, `'top left'`, `'center inline-end'`, `'span-all'`    |
| `positionTryFallbacks` | `position-try-fallbacks` | `'flip-block'`, `'flip-inline'`, `'flip-start'`, space-combined into one candidate, comma-separated into a list tried in order, or `'none'` |
| `positionTryOrder`     | `position-try-order`     | `'normal'` (first fit), `'most-width'`, `'most-height'`, `'most-block-size'`, `'most-inline-size'`                                          |
| `positionVisibility`   | `position-visibility`    | `'always'`, `'anchors-visible'`, `'no-overflow'`, `'anchors-visible no-overflow'`                                                           |

`justifySelf` and `alignSelf` also take `'anchor-center'`. Offset a layer from its anchor with an ordinary margin — there is no offset prop, because `mt={2}` already is one.

The keyword families do not mix: physical (`top`/`bottom` × `left`/`right`), logical (`block-start`/`block-end` × `inline-start`/`inline-end`), their `self-` twins, the `start`/`end` shorthand, its `self-` twin, and the `y-*` × `x-*` pair — with `center` and `span-all` neutral in all of them. So `'block-end inline-start'` is a value and `'top inline-start'` is not; a mixed pair emits no rule and no class, as does an unknown flip keyword or a name that is not an identifier.

**Two traps, both measured in Chrome 152 rather than read off the spec:**

- **A candidate position has to fit on _both_ axes to be taken**, so an overflow the flips cannot fix disqualifies every one of them and the layer silently stays where it started. `positionArea="block-end center"` with a layer wider than its anchor overflows the centre column, and `flip-block` then does nothing at all. Span the axis being kept — `"block-end span-all"` — and it flips.
- **`positionVisibility` hides at paint time**, so the layer keeps its box and its computed `visibility` still reads `visible` (`checkVisibility()` agrees). Only painting and hit-testing stop, so a test asserting it needs a screenshot.

Chrome 125+, Firefox 147+, Safari 26+. Where it is missing the layer renders unpositioned, so the portable path is `useAnchorPosition` (which measures instead) or `Overlay`, which is that hook plus a portal.

A length can also come off the anchor. Every sizing prop takes an `anchor-size()` value and every single-side inset prop an `anchor()` one, so a layer sizes and places itself against its anchor with nothing measured:

```tsx
<Box position="fixed" positionAnchor="menu-trigger" minWidth="anchor-size(width)" maxHeight="anchor-size(height, 20rem)" />
<Box position="fixed" top="anchor(bottom)" insetStart="anchor(left)" />
```

`anchor-size()` takes an axis (`width`, `height`, `block`, `inline`, `self-block`, `self-inline`), `anchor()` an edge (`top`, `right`, `bottom`, `left`, `start`, `end`, `self-start`, `self-end`, `center`, `inside`, `outside`) or a percentage along one. Both take an optional anchor name first — with the same optional `--` — and an optional fallback after a comma. A bare `anchor()` is rejected (CSS needs the edge); a bare `anchor-size()` is not (it means the layer's own axis).

### `useAnchorPosition` — the placement as one hook

`@box-kite/react/anchor` turns a side and an alignment into the props above, and measures instead where the browser has no anchor positioning. It renders nothing and owns no state beyond that.

```tsx
import { useAnchorPosition } from '@box-kite/react/anchor';

const { css, anchorProps, layerProps } = useAnchorPosition({ side: 'bottom', align: 'start', offset: 2, matchWidth: true });

<Button {...anchorProps} onClick={toggle}>
  Options
</Button>;
{
  isOpen && (
    <Box {...layerProps} component="menu">
      …
    </Box>
  );
}
```

| Option       | Default    | What it means                                                                                                       |
| ------------ | ---------- | ------------------------------------------------------------------------------------------------------------------- |
| `side`       | `'bottom'` | `'top'`/`'bottom'` are the block axis, `'start'`/`'end'` the inline one — so a side mirrors in a right-to-left page |
| `align`      | `'center'` | which of the anchor's edges to line up with on the other axis                                                       |
| `offset`     | `0`        | the gap, on the ÷4 spacing scale — emitted as the margin on the side facing the anchor, and a flip flips it too     |
| `flip`       | `true`     | `positionTryFallbacks`: the side's own axis, then the alignment's, then both                                         |
| `matchWidth` | `false`    | `minWidth="anchor-size(width)"`                                                                                     |
| `name`       | generated  | the anchor's name; one per instance unless you pass one                                                             |
| `anchor`     | —          | an anchor handed to the hook rather than one it spreads props onto — the name is written on in an effect            |
| `trackSide`  | `false`    | whether `side` in the result reports where the layer ended up, which costs one read after layout                    |

`css` in the result says which path ran: `true` is the browser placing the layer with no JavaScript at all, `false` is the measured fallback (flip to the opposite side, then shift along the other axis to stay in the viewport). `side` is where the layer actually is — the requested side unless `trackSide` is on and a flip moved it.

**Three more things worth knowing, all measured:**

- **The layer is `position: fixed`**, so it escapes every `overflow: hidden` ancestor without a portal — but not a _transformed_ ancestor, which is a fixed element's containing block, and not the page's stacking order. `Overlay` is this hook plus a portal, and is still the answer when the layer has to come out on top of everything.
- **Three fallbacks, not one.** A candidate has to fit on _both_ axes, so a lone `flip-block` does nothing at all for a layer that overflows the _cross_ axis — the browser leaves it pressed against the edge of the viewport. `flip` therefore offers the side's axis, the alignment's, and both, and a menu aligned to its trigger's end mirrors to the other end rather than running off the page.
- **Which side the browser chose costs the entrance.** `trackSide` reads the _used_ `position-area`, and that read is the style resolution `@starting-style` computes its before-change style from — so a class that depends on the answer lands after the entrance has already been decided. The exit runs long afterwards and can use it (`dropdown.items` has `closedUp` and no `up`).
- **A used `position-area` is not the value that went in.** Chrome 152 drops a `span-all` half (`block-end span-all` reads back `block-end`) and collapses a value naming both axes into the `start`/`end` shorthand, where position names the axis: `block-end span-inline-end` reads back `end span-end`, and `start span-end` once it has flipped.
- **A flip is sticky.** Once the browser takes one it keeps it until the layer is laid out afresh, which is what stops it oscillating as the page scrolls: hiding the layer and showing it again re-evaluates. So a popup that mounts when it opens always picks the side that fits, while one that stays mounted keeps the side it first chose.
- **The anchor's name is an inline style, not a prop.** An identity is per instance, so a class for it would be a rule per instance that is never freed — the same reason a sparkline's `d` is an attribute while its stroke is a class. Everything shared — the area, the flip, the margin, the width — is an ordinary prop.

### Colours, and the opacity modifier

The palette is **Tailwind 4.3's, in OKLCH**: twenty-six families of eleven steps (`50`–`950`) — the five
neutrals (`slate`, `gray`, `zinc`, `neutral`, `stone`), the four Tailwind 4.3 added (`mauve`, `mist`,
`olive`, `taupe`) and seventeen hues (`red`, `orange`, `amber`, `yellow`, `lime`, `green`, `emerald`,
`teal`, `cyan`, `sky`, `blue`, `indigo`, `violet`, `purple`, `fuchsia`, `pink`, `rose`). Each token is a
CSS variable declared in `:root` the first time something uses it, so a colour you never write costs
nothing.

Any colour value takes a slash and a percentage:

```tsx
<Box bgColor="blue-500/40" borderColor="black/10" color="currentColor/60" />
<Box theme={{ dark: { bgColor: 'sky-400/25' } }} hover={{ bgColor: 'blue-500/60' }} />
<Flex vars={{ 'color-grid': 'slate-500/20' }} />
```

- It compiles to `color-mix(in oklab, var(--blue-500) 40%, transparent)`. The mix wraps the
  **variable**, so a themed token is still themed and every element asking for the same value shares
  one class. `oklab` because mixing towards transparency in a polar space drags the hue along.
- Not `opacity`, which fades the element, its text and its children. The modifier fades one declaration.
- Works on `color`, `bgColor`, `borderColor`, `outlineColor`, `fill`, `stroke` and on a `vars` entry —
  and on a variable declared through `Box.extend()` (`bgColor="brand/30"`).
- A token the palette does not have, or a percentage outside 0–100, produces **no rule and no class
  name** — the same silence every unmatched value gets.

### Gradients, shadows and rings

A gradient is a **value**, written as a record — so its stops are palette tokens, it takes the opacity
modifier, it is themed, and two elements asking for the same one share a class.

```tsx
// The key names the kind and carries its geometry; `colors` are the stops in order.
<Box bgGradient={{ linear: 'r', colors: ['blue-500', 'pink-500'] }} />
<Box bgGradient={{ linear: 135, colors: ['blue-500/40', 'transparent'] }} />
<Box bgGradient={{ radial: 'circle', at: 'top left', colors: [['sky-500', '20%'], 'indigo-900'] }} />
<Box bgGradient={{ conic: 45, colors: ['red-500', 'yellow-500', 'red-500'] }} />

// Interpolation is what keeps two stops out of the grey middle sRGB runs them through.
<Box bgGradient={{ linear: 'r', colors: ['blue-500', 'pink-500'], interpolate: 'oklch' }} />
```

- `linear` takes `t`/`tr`/`r`/`br`/`b`/`bl`/`l`/`tl` or a number of degrees; `radial` takes
  `'circle'`/`'ellipse'`/`true`; `conic` takes a start angle or `true`. Exactly one of the three.
- `at` centres a `radial` or `conic` gradient (not a `linear` one, which runs in a direction).
- `interpolate`: `'srgb'`, `'hsl'`, `'oklab'`, `'oklch'`, `'hsl-longer'`, `'oklch-longer'`.
- A stop is any colour value — a token, `blue-500/40`, a system colour, `var(--chart-1)` — or a
  `[colour, position]` pair. **Two stops minimum**, and the record is judged whole: one bad stop, one
  unknown key, two kinds at once, and the whole value emits no rule and no class name.
- It writes `background-image`, so `bgGradient` and `bgImage` are the same property.

**Four shadows stack**, because each sets its own custom property and all four write one composed
`box-shadow`. A ring and an elevation coexist instead of the last one winning:

```tsx
<Box shadow="md" ring={2} ringColor="indigo-500" />
<Box insetShadow="sm" insetRing={1} shadow="lg" shadowColor="blue-500/40" />
<P textShadow="sm" textShadowColor="black/20" />
```

- `shadow`: `xxs` `xs` `sm` `md` `lg` `xl` `xxl`, Tailwind's elevation scale — plus the three original
  presets `small`/`medium`/`large`, which carry their own colour. `insetShadow`: `xxs`/`xs`/`sm`.
- `ring`/`insetRing` are a **width in px**, not a scale: `ring={2}`. Unlike `outline` a ring joins the
  shadow stack, follows `borderRadius` and costs no layout. `currentColor` unless recoloured.
- `none` on `shadow` or `insetShadow` — and `0` on a ring — clears **just that layer**.
- A colour prop shows nothing on its own, the way `borderColor` does with no border width.
- `transition="shadow"` covers `box-shadow` and `text-shadow` both.

### Filters, backdrop filters and masks

**Nine filter functions stack** the way the shadows do: `filter` is one property whose value is a list,
so each prop sets a layer of its own and all nine write the same composed declaration.

```tsx
<Box blur="sm" grayscale={100} />
<Box brightness={110} saturate={150} hueRotate={90} />
<Box dropShadow="lg" dropShadowColor="indigo-500/40" />
<Box backdropBlur="sm" backdropSaturate={180} bgColor="white/20" />
```

- `blur`, `brightness`, `contrast`, `grayscale`, `hueRotate`, `invert`, `saturate`, `sepia`,
  `dropShadow`. **A number is the function's own unit** — a percentage for the six that take one,
  degrees for `hueRotate`, px for `blur`.
- `blur` takes Tailwind's scale too: `xs` (4px) `sm` (8px) `md` (12px) `lg` (16px) `xl` (24px)
  `xxl` (40px) `xxxl` (64px).
- `dropShadow` is `xs`..`xxl` with `dropShadowColor`. It is cast by the **shape** — an SVG path, the
  opaque part of a transparent PNG — where `shadow` draws a rectangle round the box.
- `none` clears **just that function**, the way it clears just one shadow layer.
- The nine `backdrop*` props are the same functions on `backdrop-filter`, which is the glassmorphism
  half. `backdropOpacity` exists and `backdropDropShadow` does not — neither means anything on the
  other side. The older `backdropFilter` prop writes that property directly: use one or the other.
- `transition="filter"` covers `filter` and `backdrop-filter` both.

**A mask is the gradient grammar again.** `maskImage` reads a gradient's alpha channel to decide which
of the element's pixels are painted, so a fade to `transparent` is the whole edge-fade recipe:

```tsx
<Box maskImage={{ linear: 'b', colors: ['black', ['black', '55%'], 'transparent'] }} />
<Box maskImage="url(#frame)" />
```

- The same record `bgGradient` takes and judged the same way, plus `url(#id)`/`var(--name)` and
  `none`. One mask, not a stack.

**`bgClip="text"` is what turns a gradient into type**, and it needs `color="transparent"` beside it
or the text paints over its own background:

```tsx
<H1 color="transparent" bgClip="text" bgGradient={{ linear: 'r', colors: ['violet-500', 'cyan-400'] }}>
  Painted by the background
</H1>
```

- `border` / `padding` / `content` / `text`.

### Custom properties (`vars`)

The one prop whose declaration _names_ come from its value, for styling markup this library never
rendered — a chart library, a third-party widget, a subtree with its own tokens:

```tsx
<Flex vars={{ 'color-revenue': 'sky-500', 'chart-gap': '4px', rows: 3 }} theme={{ dark: { vars: { 'color-revenue': 'sky-400' } } }}>
  {/* --color-revenue, --chart-gap and --rows are inherited by everything in here */}
</Flex>
```

- A **colour token** resolves to the variable behind it (`--color-revenue: var(--sky-500)`), and one
  carrying an opacity modifier to the mix that applies it (`slate-500/20`), so it
  follows the palette. Every other value is written out as it stands: a length, a number, a
  `var(--x)`/`url(#x)` reference, a colour of your own. Names may carry a leading `--` or not.
- It is an ordinary prop: it nests in `theme`, `hover`, `md` and a group selector like all the others,
  and it lands in a **class** — so two subtrees declaring the same variables share one rule, and
  nothing needs a `<style>` tag or an `id` to scope it. It renders in a Server Component.
- A name that is not a CSS identifier, or a value containing `;` or a brace, is skipped — that entry
  only, not the whole record, so one bad name cannot take a palette down with it.
- Not the same thing as `Box.extend({ variables })`, which declares tokens globally on `:root` before
  the first render. `vars` is per element, per theme, per breakpoint.

### The escape hatch (`css`)

The 5% the typed set does not cover, without an inline style: a style object compiled through the
same pipeline as every other prop — one class per object, shared between elements writing the same
one, nested wherever a prop nests, rendered on a server.

```tsx
<Box css={{ mixBlendMode: 'multiply', scrollSnapType: 'x mandatory' }} hover={{ css: { isolation: 'isolate' } }} />
<Img css={{ objectPosition: 'top' }} md={{ css: { objectPosition: 'center' } }} />
```

- **Property names are camelCase**, as React spells them (`WebkitLineClamp` → `-webkit-line-clamp`,
  `msOverflowStyle` → `-ms-overflow-style`); a hyphenated name or a `--custom` one is written as it
  stands. Names and keyword values are typed by `csstype`, so a misspelt property is a compile error.
- **Values are CSS, written out as they stand** — a number too, so a length wants its unit
  (`width: '100px'`; the type refuses `width: 100`) while `zIndex`, `opacity`, `flexGrow` and
  `lineHeight` take theirs. A colour token resolves the way a `vars` value does
  (`outlineColor: 'sky-500'` → `var(--sky-500)`, `'rose-400/60'` → the mix), so the hatch stays themed.
- **It is sorted last**: on one element a `css` declaration wins over the typed prop naming the same
  property. It is the override, and the cascade says so.
- **It nests like any prop** — `hover`, `md`, `theme`, `dataAttr`, `before`, `startingStyle`, a
  `Box.keyframes()` step. What it does _not_ take is a selector or a nested rule: those are the
  nesting keys' job, around it.
- A value carrying `;` or a brace, or a name that is not a property name, is dropped — that entry
  only. A data URI's `;` is written `%3B`.
- **Governance**: reach for a typed prop first; for a property used more than once, `Box.extend()`
  (five lines, indistinguishable from a built-in afterwards); `css` is for the one-off. An ESLint rule
  that flags or forbids it per team policy is planned; until it ships, `grep -rn "css={{"` is the audit.

### SVG

Twenty-three SVG properties, on any Box, plus twenty element components in `components/svg` — `Svg`, `G`, `Defs`, `Path`, `Circle`, `Ellipse`, `Rect`, `Line`, `Polyline`, `Polygon`, `SvgText`, `TSpan`, `LinearGradient`, `RadialGradient`, `Stop`, `ClipPath`, `Mask`, `Use`, `SvgSymbol`, `Marker`. **Never `<Box tag="path">`.** For an icon from somebody else's set, `<Icon>` (`components/icon`) — see below. (`BaseSvg` is deprecated: it is `Svg` with a 24×24 preset.)

| Prop                            | CSS Property                  | Accepts                                                                                                                          |
| ------------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `fill` / `stroke`               | fill / stroke                 | any colour variable, or `'none'`                                                                                                 |
| `fillOpacity` / `strokeOpacity` | fill-opacity / stroke-opacity | `0`–`1` in tenths, same scale as `opacity`                                                                                       |
| `fillRule`                      | fill-rule                     | `'nonzero'`, `'evenodd'`                                                                                                         |
| `strokeWidth`                   | stroke-width                  | number, **user units — no divider** (`strokeWidth={2}` → `2`)                                                                    |
| `strokeLinecap`                 | stroke-linecap                | `'butt'`, `'round'`, `'square'`                                                                                                  |
| `strokeLinejoin`                | stroke-linejoin               | `'miter'`, `'round'`, `'bevel'`                                                                                                  |
| `strokeMiterlimit`              | stroke-miterlimit             | number, 1 or greater                                                                                                             |
| `strokeDasharray`               | stroke-dasharray              | number (`{12}` = dash 12, gap 12) or the pattern as a string (`"12 4"`)                                                          |
| `strokeDashoffset`              | stroke-dashoffset             | number, or a percentage of the path length (`'40%'`)                                                                             |
| `paintOrder`                    | paint-order                   | `'normal'`, `'fill'`, `'stroke'`, `'markers'`                                                                                    |
| `vectorEffect`                  | vector-effect                 | `'none'`, `'non-scaling-stroke'`                                                                                                 |
| `shapeRendering`                | shape-rendering               | `'auto'`, `'optimizeSpeed'`, `'crispEdges'`, `'geometricPrecision'`                                                              |
| `textAnchor`                    | text-anchor                   | `'start'`, `'middle'`, `'end'` — which part of a label sits on its `x`                                                           |
| `dominantBaseline`              | dominant-baseline             | `'auto'`, `'alphabetic'`, `'central'`, `'middle'`, `'hanging'`, `'text-top'`, `'text-bottom'`, `'ideographic'`, `'mathematical'` |
| `cx` / `cy`                     | cx / cy                       | number in user units, or a percentage — `<circle>`, `<ellipse>`                                                                  |
| `r`                             | r                             | number in user units, or a percentage — `<circle>`                                                                               |
| `rx` / `ry`                     | rx / ry                       | number, a percentage, or `'auto'` — `<ellipse>` radii, `<rect>` corners                                                          |
| `x` / `y`                       | x / y                         | number in user units, or a percentage — `<rect>`, `<image>`, `<use>`, `<foreignObject>`, nested `<svg>`. NOT `<text>`            |

```tsx
import { Circle, Path, Rect, Svg, SvgText } from '@box-kite/react/components/svg';

// Every property except vectorEffect is inherited, so set it once on the <svg>.
<Svg viewBox="0 0 200 48" width="200px" fill="none" stroke="violet-500" strokeWidth={3} strokeLinecap="round">
  <Path d="M8 40 L56 12 L104 34 L152 8 L192 24" />
</Svg>

// Draw-on animation: the transition is already there (--svgTransitionTime), and
// prefers-reduced-motion zeroes it, so this is the whole thing.
<Svg fill="none" stroke="violet-500" strokeWidth={3} strokeDasharray={320} strokeDashoffset={320} hover={{ strokeDashoffset: 0 }}>
  <Path d="M8 40 L56 12 L104 34 L152 8 L192 24" />
</Svg>

// Geometry is CSS, so a shape moves with no JavaScript. Text is placed by the two text props.
<Svg viewBox="0 0 96 96" width="96px" label="Three quarters" fill="none" textAnchor="middle" dominantBaseline="central">
  <Circle cx={48} cy={48} r={38} stroke="indigo-600" strokeWidth={10} hover={{ r: 40 }} />
  <SvgText x={48} y={48} fontSize={20} fill="slate-700">
    75%
  </SvgText>
</Svg>

// A bar: y is the CSS geometry prop, width/height are the rect's own attributes.
<Rect x={16} y={32} width={24} height={64} rx={3} fill="sky-600" />
```

**Nine things to get right:**

1. **No divider on SVG lengths.** `strokeWidth`, `strokeDasharray`, `strokeDashoffset` and `strokeMiterlimit` pass the number through unchanged — they are measured in the coordinate system the `viewBox` sets up.
2. **Inheritance does the work.** Put `fill`/`stroke`/`strokeWidth` on the `<svg>`, not on every shape. The exception is a shape carrying its own `fill=` attribute — a presentation attribute on an element beats a value inherited from its parent, so style that shape directly.
3. **`vectorEffect` and `dominantBaseline` are not inherited**, so their rules target the element _and_ its descendants (`.cls, .cls *`). `vectorEffect="non-scaling-stroke"` on the `<svg>` keeps a hairline one pixel wide at any scale; `dominantBaseline="central"` on the `<svg>` reaches every label inside it.
4. **Geometry belongs to the shape, and it transitions.** `cx`/`cy`/`r`/`rx`/`ry`/`x`/`y` are real CSS in SVG 2, so a gauge or a growing bar is a pseudo-class and no JavaScript. They are not inherited and should not be — set them on the shape.
5. **Each component settles the names SVG and Box both use, for its own element.** On `Path`, `d` is path data (not `flexDirection`); on `Rect`, `width`/`height` are user units (not the ÷4 layout scale); on `SvgText` and `TSpan`, `x`/`y`/`dx`/`dy` are attributes, because the CSS geometry properties do not apply to text; on `RadialGradient`, `cx`/`cy`/`r` are attributes, because they do not apply to a gradient either — while on `Circle` the same names stay CSS and transition. `transform` is a prop on every shape and group (`transform="rotate(-90 48 48)"` carries its own centre, which the CSS `rotate` prop cannot).
6. **`Svg` sizes with attributes and names itself with `label`.** `viewBox`, `preserveAspectRatio`, `width` and `height` are the SVG attributes (`width="100%"`, `width={200}`), so the ÷4 layout `width`/`height` are not available on it. No `label` means `aria-hidden` — decoration, which is what most SVG is; `label` makes it `role="img"` with that name. A role or `aria-*` of your own in `props` wins over both.
7. **An icon from a set is not SVG you draw — it is `<Icon>`.** `<Icon size={5} color="amber-500" label="Sunny"><Sun /></Icon>` from `components/icon`, wrapping one element from lucide, Tabler, react-icons, or a raw `<svg>`. `size` is the ÷4 scale (`size={6}` is 24px, the default) and lands in the _class_, where a CSS declaration outranks the `width`/`height` attributes the icon set writes — which is why `Icon` needs to know no set's API. `strokeWidth` is the same: an ordinary Box prop, so it can change on hover. No `label` means `aria-hidden`; a `label` means `role="img"`. **Reach for `Svg` rather than wrapping one in `Icon`** — `Svg` takes these props directly. (Wrapping one does work: `Icon` asks the child which convention it follows and routes `role`/`aria-label` into `props` for a component of ours. It is still a layer nobody needs.)
8. **A paint server is a value, not an attribute.** `fill`, `stroke` and `clipPath` take `url(#id)` (a `<LinearGradient>`, a pattern, a `<ClipPath>` the document defines) and `var(--name)` (a variable somebody else declared) beside the colour tokens — so `fill="url(#sky)"` and `clipPath="url(#frame)"`, and both can differ per theme, on `hover` and per breakpoint. Only those two shapes are accepted: anything else emits no rule at all rather than a broken declaration. A gradient stop is still themed the same way — `<Stop stopColor="currentColor" color="amber-300" />`.
9. **An icon outside lucide comes through the same `<Icon>`.** Iconify carries 300,000+ icons in 200-plus sets, and the choice is only about _when_ the icon becomes markup. One icon: copy its SVG and paste it into an `<Icon>` — no dependency, renders on a server. A set: `unplugin-icons` compiles `~icons/<set>/<name>` into a component at build time from an `@iconify-json/<set>` devDependency (`npm i -D unplugin-icons @iconify-json/<set> @svgr/core @svgr/plugin-jsx`, the plugin with `{ compiler: 'jsx', jsx: 'react' }`, and `/// <reference types="unplugin-icons/types/react" />` in a `.d.ts`) — nothing fetched at runtime, server-renders. A name that is data (from a CMS, from a user): `@iconify/react`'s `<Icon icon="set:name"/>` inside our `<Icon>` — it fetches in the browser, so it is a client component and the server sends no icon. **Turbopack runs no unplugin**, so under Next.js 16 the build-time recipe needs `next build --webpack`; the other two work as they are.

---

### Animation and transitions

Every Box already transitions `all` its properties over `--transitionTime` (0.25s), which is why a
`hover` colour fades without being asked. On top of that:

| Prop                                                              | CSS Property        | Notes                                                                                                                                                                                    |
| ----------------------------------------------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `animation`                                                       | animation           | One of four presets: `'spin'`, `'pulse'`, `'bounce'`, `'ping'`, or `'none'`. Keyframes come with the engine                                                                              |
| `animationName`                                                   | animation-name      | A sequence registered with `Box.keyframes()`, a preset name, or a name from any stylesheet                                                                                               |
| `animationDuration` / `animationDelay`                            | ms                  | **Milliseconds, no divider**: `animationDuration={1100}` → `1100ms`                                                                                                                      |
| `animationIterationCount`                                         | number              | A number or `'infinite'`                                                                                                                                                                 |
| `animationDirection` / `animationFillMode` / `animationPlayState` | keywords            | `'normal'`/`'reverse'`/`'alternate'`/`'alternate-reverse'`; `'none'`/`'forwards'`/`'backwards'`/`'both'`; `'running'`/`'paused'`                                                         |
| `animationTimingFunction` / `transitionTimingFunction`            | timing function     | Keywords, the four springs (`'spring'`, `'spring-gentle'`, `'spring-bouncy'`, `'spring-snappy'`), or a curve: `'cubic-bezier(0.4, 0, 0.6, 1)'`, `'steps(4, end)'`, `'linear(0, 0.5, 1)'` |
| `transition`                                                      | transition-property | `'all'`, `'none'`, or a group: `'colors'`, `'opacity'`, `'shadow'`, `'transform'`, `'size'`, `'filter'`                                                                                  |
| `transitionDuration` / `transitionDelay`                          | ms                  | Milliseconds, same as the animation pair. Both duration props also take a spring name — that spring's settling time                                                                      |
| `transitionBehavior`                                              | transition-behavior | `'normal'` or `'allow-discrete'`, which lets `display`, `overlay` and `content-visibility` transition — the property that makes an element animate _out_ without unmounting              |
| `interpolateSize`                                                 | interpolate-size    | `'numeric-only'` or `'allow-keywords'`, which is what makes `height: auto` animate. Inherited, so it belongs on a container. Chromium-only; elsewhere the size snaps                     |
| `startingStyle`                                                   | `@starting-style`   | A nested block of plain props: what they start from the first time the element is styled. `startingStyle={{ opacity: 0, translateY: 2 }}` is an entrance with no JavaScript              |
| `translateX` / `translateY` / `rotate` / `scale` / `flip`         | transform longhands | Each writes its own CSS property, so they compose. `scale={1.05}` is unitless; `rotate={45}` is degrees                                                                                  |

```tsx
// A preset: no registration, and it stops under prefers-reduced-motion on its own
<Icon size={6} animation="spin"><Loader2 /></Icon>

// A sequence of your own — the steps are Box props, so the ÷4 scale and colour tokens apply
Box.keyframes({
  'slide-in': {
    from: { opacity: 0, translateY: 3 },   // 3 → 0.75rem
    to: { opacity: 1, translateY: 0 },
  },
});

<Box animationName="slide-in" animationDuration={450} animationTimingFunction="ease-out" animationFillMode="backwards" />

// Narrow what transitions, and compose transforms on hover
<Box transition="transform" transitionDuration={300} hover={{ translateX: 2, translateY: -2, scale: 1.05 }} />

// A spring: the same name on both props, because a spring is a curve *and* a settling time
<Box transition="transform" transitionTimingFunction="spring-bouncy" transitionDuration="spring-bouncy" hover={{ scale: 1.1 }} />

// One of your own — sampled once, at module scope
const wobble = Box.spring({ stiffness: 120, damping: 8 });

<Box transition="transform" transitionTimingFunction={wobble.easing} transitionDuration={wobble.duration} hover={{ translateY: -2 }} />

// An entrance: what a just-mounted element starts from. No state, no effect, no library.
<Box p={4} startingStyle={{ opacity: 0, translateY: 2 }} transitionDuration={280} />

// Both directions, by hiding rather than unmounting: display flips at the *end* of the transition
<Box
  display={open ? 'block' : 'none'}
  opacity={open ? 1 : 0}
  transitionBehavior="allow-discrete"
  startingStyle={{ opacity: 0 }}
  transitionDuration={260}
/>

// Or really unmounting, once the exit has run: <Presence> holds the node until its CSS is finished
<Presence present={open}>
  {({ present, ref, props }) => (
    <Box
      ref={ref}
      props={props}
      opacity={present ? 1 : 0}
      translateY={present ? 0 : -2}
      startingStyle={{ opacity: 0, translateY: -2 }}
      transitionDuration={320}
    />
  )}
</Presence>

// height: auto, animated — the container opts its subtree in
<Box interpolateSize="allow-keywords">
  <Box height={expanded ? 'auto' : 0} overflow="hidden" transition="size" transitionDuration={300}>
    …
  </Box>
</Box>
```

- **`Box.keyframes({ name: { from, '50%', to } })`** registers sequences; stop keys are `'from'`,
  `'to'` or a percentage string. Registration is free — a sequence is written into the stylesheet the
  first time a rule names it, and exactly once, so an unused preset costs nothing. It reaches static
  output through `getStyles()` and rides the base `<style>` element in element mode, so a Server
  Component can animate with no client JavaScript.
- **A preset already respects reduced motion.** Preset durations are multiples of `--transitionTime`,
  which the base stylesheet zeroes under `prefers-reduced-motion`. The moment you name a duration in
  milliseconds you own that decision: say `motionReduce={{ animationName: 'none' }}` yourself.
- **`animation` is declared before the longhands**, so `animationDuration` and friends override
  whatever a preset chose.
- **The transform props are CSS longhands, not one `transform` declaration.** `translateX` and
  `translateY` each set a custom property and both compose into one `translate`, which still
  transitions (a `var()` is substituted before the browser compares the two states) and still
  animates (the base stylesheet registers both axes with `@property`, without which a keyframe
  moving them would jump rather than interpolate). `rotate` and `scale` are their own properties
  too. The one collision left: `flip` and `scale` both write `scale`.
- **A spring is a sampled curve, so it is two props.** The four presets are a damped oscillator
  sampled into `linear()`: `spring` (540ms, barely a bounce), `spring-gentle` (660ms),
  `spring-bouncy` (880ms, 20% past the target), `spring-snappy` (420ms). Name one on the timing
  function and the same one on the duration — the duration is the spring's settling time, counted in
  `--transitionTime` units, so reduced motion stops a spring too. For a spring of your own,
  `Box.spring()` takes `stiffness`, `damping`, `mass` and `velocity` and returns `{ easing, duration }`.
- **What a sampled spring is not**: the curve is fixed once it is a string, so an interrupted
  transition restarts rather than carrying its velocity across — fine for hover, a panel or a toggle,
  not for a drag (that is framer-motion's job). `linear()` is missing in roughly one browser in
  eight, so every curve is written with an `ease-out` declaration underneath it.
- **`startingStyle` is nesting, not a value.** It takes plain props — no breakpoint, pseudo-class or
  theme _inside_ it; those nest around it instead — `md: { startingStyle: { … } }`, and the same inside a
  `theme`. Every rule it writes sorts after the ordinary rules **and is emitted `!important`**, because
  the browser computes the before-change style from the whole cascade: source order settles a tie in
  specificity and nothing else, so a starting rule at `.x` would lose to the value it starts from at
  `.dark .x` or `.x[data-state="open"]` and nothing would transition at all. The importance reaches
  nothing but the before-change style. A browser without `@starting-style` drops the one rule and shows
  the element finished. `Tooltip` and the `Dropdown` popup already carry one.
- **An exit needs someone to hold the node.** `@starting-style` runs when an element is first
  rendered — mounted, or shown from `display: none`. Going the other way, React unmounts the node
  immediately and there is nothing left to animate. Two answers: hide it instead — `display` plus
  `transitionBehavior="allow-discrete"` flips `display` at the _end_ of the transition — or, when the
  node really has to leave, `<Presence>`.
- **`<Presence present>` (`components/presence`) is the exit.** It keeps rendering its child with
  `present: false` until the child's own CSS says the transition is over, then lets React remove it. A
  render prop, handed `{ present, state, ref, props }`: `ref` goes on the element that carries the
  transition (it is the one whose computed style the wait is measured from), `props` is
  `{ 'data-state': 'open' | 'closed' }`. The wait is the element's computed `transition-duration` /
  `animation-duration`, not a `transitionend` listener — which fires once per property with no way to
  know how many are coming. So a reader on `prefers-reduced-motion` measures `0s` and the node leaves in
  the same commit, with nothing to configure. `Tooltip`, the `Dropdown` popup and the DataGrid column
  menu are all built on it, and each expresses its exit as a `closed` variant in its component styles — plus `up`/`closedUp` on `dropdown.items`, since a popup that opened upward has to collapse upward.
- **`Box.configure({ transition })`** changes what the base class transitions for the whole engine:
  a group name, or `false` to declare nothing at all and leave transitions entirely to the props.
  Call it before the first render.

---

## Pseudo-Classes, Breakpoints & Themes

```tsx
// Pseudo-classes: hover, focus (:focus-within), focusVisible, hasFocus, active, valid, invalid,
//   optional, disabled, checked, indeterminate, required, selected, hasChecked, hasRequired,
//   hasDisabled, hasValid, hasInvalid — plus the eight states the browser tracks and nothing
//   else can see: visited, target, open, placeholderShown, autofill, inRange, outOfRange, inert
//   — plus rtl and ltr, the element's own resolved text direction
<Box bgColor="blue-500" hover={{ bgColor: 'blue-600' }} disabled={{ opacity: 0.5 }} />

// `open` is a <details>/<dialog> with the attribute, a popover, or a <select>'s picker; `inert`
// matches the whole inert subtree; `visited` takes colour properties only (the privacy rule)
<Box open={{ rotate: 180 }} placeholderShown={{ color: 'gray-400' }} inRange={{ borderColor: 'emerald-500' }} />

// Responsive breakpoints (mobile-first): sm(640) md(768) lg(1024) xl(1280) xxl(1536)
<Box p={2} md={{ p: 4 }} lg={{ p: 6 }} />

// Combine: breakpoints can nest pseudo-classes
<Box bgColor="white" hover={{ bgColor: 'gray-100' }} md={{ bgColor: 'gray-50', hover: { bgColor: 'gray-200' } }} />
```

### State variants — `dataAttr`, `ariaAttr`, `has`, `not`, `nth`

A fourth kind of nesting: a selector fragment on the element's **own** compound selector, so a state your code sets — a menu that is open, a row that is selected, a step that is loading — is styled in CSS instead of with a ternary in the markup. The record _key_ is the selector.

| Prop       | Key                                                                                     | Selector it builds                                                                  |
| ---------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `dataAttr` | `'state=open'` / `'loading'`                                                            | `[data-state="open"]` / `[data-loading]`                                            |
| `ariaAttr` | `'selected'` / `'sort=ascending'`                                                       | `[aria-selected="true"]` — a bare key means `="true"` — / `[aria-sort="ascending"]` |
| `has`      | `':checked'` / `'img[alt]'`                                                             | `:has(:checked)` / `:has(img[alt])`                                                 |
| `not`      | a **state**: `hover`, `checked`, `'data-loading'`…                                      | `:not(:hover)` / `:not([data-loading])`                                             |
| `nth`      | `'first'`, `'last'`, `'only'`, `'odd'`, `'even'`, `'3'`, `'2n+1'`, `'-n+3'`, `'last 2'` | `:first-child` / `:nth-child(2n+1)` / `:nth-last-child(2)`                          |

```tsx
// The attribute goes in `props`, where every attribute goes; the styling goes in `dataAttr`.
<Box
  props={{ 'data-state': state }}
  dataAttr={{ 'state=busy': { bgColor: 'amber-500' }, 'state=done': { bgColor: 'emerald-500' } }}
/>

// A bare aria key means ="true", so the attribute that makes the tab list correct is the one that colours it
<Button props={{ role: 'tab', 'aria-selected': isCurrent }} ariaAttr={{ selected: { bgColor: 'indigo-500' } }} />

// A container reacting to its own contents, and the inverse of a state
<Box has={{ 'input:checked': { borderColor: 'indigo-500' } }} />
<Box group={{ 'deck/hover': { not: { hover: { opacity: 0.5 } } } }} />

// A position among siblings: striping a list and dropping the last divider, with no index in the markup
<Box bb={1} nth={{ odd: { bgColor: 'slate-500/10' }, 'last 1': { bb: 0 } }} />

// Everything else nests around them, in either direction — the class name is built from the set
// rather than the order, so these two resolve to one class and one rule
<Box md={{ dataAttr: { 'state=open': { hover: { color: 'red-500' } } } }} />
<Box md={{ hover: { dataAttr: { 'state=open': { color: 'red-500' } } } }} />
```

- **A variant needs no cascade rank of its own**: `.a[data-state="open"]` is 0,2,0 against a plain class's 0,1,0, so it already outranks the rule it overrides.
- **A key the grammar rejects drops its whole block** — no rule and no class name, the same failure mode as an unmatched prop value. An attribute name that is not one, a value carrying a quote, an unbalanced `:has()`.
- **The library sets two attributes itself**: `data-state="open" | "closed"` on whatever `<Presence>` is holding, so `Tooltip`, the `Dropdown` popup and the DataGrid column menu all carry it; and `data-theme` on the element `Box.Theme` writes to.

### Somebody else's state — `group` and `peer`

Every key above is about the element itself. `group` is about an **ancestor** and `peer` about a preceding **sibling**: the record key is a state, on the default class (`group`/`peer` — the names Tailwind uses) or on one you name, `'card/hover'`. The state vocabulary is `not`'s, so any pseudo-class works and a `data-`/`aria-` prefix reaches an attribute the ancestor carries.

```tsx
// `.group:hover .x` — the ancestor carries the class itself
<Flex className="card">
  <Box opacity={0} group={{ 'card/hover': { opacity: 1 } }}>Edit</Box>
</Flex>

// `.peer:checked ~ .x` — what styles a label from the input before it, with no JavaScript
<Checkbox className="agree" label={<Box peer={{ 'agree/checked': { color: 'emerald-500' } }}>I agree</Box>} />

// A state this library never sets, on the ancestor
<Box group={{ 'row/data-state=open': { rotate: 90 }, 'row/aria-selected': { bgColor: 'sky-100' } }} />

// The element's own states still belong to the element: `.card:hover .x:hover`
<Box group={{ 'card/hover': { opacity: 0.6, hover: { opacity: 1 } } }} />
```

- `hoverGroup`, `focusGroup`, `activeGroup`, `disabledGroup` and `selectedGroup` are the older spelling of the same thing — `hoverGroup={{ card: … }}` is `group={{ 'card/hover': … }}` and compiles to the same class. They still work; new states go on `group`.
- **The group name is validated**: it lands in rule text as a class selector, so it has to be a CSS identifier. A key the grammar rejects drops its whole block, no rule and no class name.
- A group means nothing in `Box.addGlobalStyles` — `<html>` has no ancestor to name — so it is dropped there. A theme is the exception: its class is on the same element (`html.dark`).

### Pseudo-elements — `before`, `after`, `placeholder`, `selection`, `marker`…

A fifth kind of nesting, and the only one CSS allows **one** of: a pseudo-element is a slot, not a list, and it is appended last to whatever the other keys build.

| Prop                        | Element                                 | Notes                                                                       |
| --------------------------- | --------------------------------------- | --------------------------------------------------------------------------- |
| `before` / `after`          | `::before` / `::after`                  | Generate a box, so they come with `content` (below)                         |
| `placeholder`               | `::placeholder`                         | On `Textbox`/`Textarea` a **string** is the attribute, an object the styles |
| `selection`                 | `::selection`                           | Names descendants too — the text may be in a child                          |
| `marker`                    | `::marker`                              | Same: write it on the `<Ul>`, it reaches the `<Li>`                         |
| `firstLine` / `firstLetter` | `::first-line` / `-letter`              | Typography only, per CSS                                                    |
| `backdrop` / `fileButton`   | `::backdrop` / `::file-selector-button` | A `<dialog>`/popover, and an `<input type="file">`                          |

```tsx
// A ::before with no `content` generates no box at all, so declaring one supplies content: '' —
// and the element exists in exactly the states you styled it in.
<Box position="relative" before={{ position: 'absolute', inset: 0, bgColor: 'indigo-500' }} />
<Box hover={{ before: { width: 'fit' } }} /> // .x:hover::before, content included

// content: a keyword, text (quoted for you), or CSS you wrote
<Box before={{ content: 'empty' }} />                  // content: ''
<Box before={{ content: 'New' }} />                    // content: "New"
<Box after={{ content: 'attr(data-count)' }} />        // attr(), counter(), url(), var(), image-set()
<Box after={{ content: '"Step " counter(step)' }} />   // a sequence has to be written as CSS
<Box before={{ content: 'none' }} />                   // off again

// Everything nests around them, and the element still lands last and on the target
<Box md={{ dataAttr: { 'state=open': { after: { opacity: 1 } } } }} />   // @media … .x[data-state="open"]::after
<Box group={{ 'card/hover': { before: { opacity: 1 } } }} />              // .card:hover .x::before

// On an input the name means both things; both at once puts the text where attributes go
<Textbox props={{ placeholder: 'Search…' }} placeholder={{ color: 'slate-400', fontStyle: 'italic' }} />
```

- **One per compound selector**: nesting a second is a type error, and a merged component style that manages it anyway is dropped rather than emitting `::before::after`, which matches nothing.
- **`content` is the one prop whose value is text**, so text is quoted and escaped, a value written as CSS is scanned instead (every quote closed, parentheses balanced, no `;`, `}` or `@` outside a string), and one that fails produces no rule and no class name.
- `placeholderStyles` is the old name for `placeholder` and still works.

### Device and accessibility preferences

Five more media keys, shaped exactly like a breakpoint — they nest pseudo-classes, themes and group selectors the same way, and they win the cascade against every breakpoint.

| Prop            | Media query                      | When it applies                                    |
| --------------- | -------------------------------- | -------------------------------------------------- |
| `pointerCoarse` | `pointer: coarse`                | A finger or a pen — a bigger target, and no hover  |
| `pointerFine`   | `pointer: fine`                  | A mouse or a trackpad                              |
| `motionReduce`  | `prefers-reduced-motion: reduce` | The user asked their OS for less motion            |
| `forcedColors`  | `forced-colors: active`          | A forced-colors mode is on (Windows High Contrast) |
| `contrastMore`  | `prefers-contrast: more`         | The user asked their OS for more contrast          |

The pointer pair ranks **below** the three preferences: what the pointer can do is a fact about the device, and what the reader asked for still wins where both apply.

```tsx
// Reduced motion is already the default: every Box transitions on --transitionTime, and the
// preference sets that variable to 0s. Nothing to opt into — declare motionReduce only to
// replace a movement with something still, or to keep a transition you decided is safe.
<Box motionReduce={{ transform: 'none' }} />

// A component that named its own duration is the one case the default cannot reach.
<Box transitionDuration={150} motionReduce={{ transition: 'none' }} />

// Forced colors throw away background-color and color, so anything whose only edge was a fill
// (or a shadow, also dropped) needs a border — borders survive.
<Box bgColor="gray-900" color="gray-50" forcedColors={{ b: 1 }} />

// They nest like a breakpoint does
<Box contrastMore={{ borderColor: 'black', hover: { borderColor: 'blue-700' }, theme: { dark: { borderColor: 'white' } } }} />
```

**They do not nest inside a breakpoint, or inside each other** — one rule lives in one `@media` block, so `md={{ motionReduce: {...} }}` is a type error rather than a query that silently drops half of what was asked.

### Container queries — `cq`

The same question a breakpoint asks, addressed to the element's own container: the card is wide in a page and narrow in a sidebar, and the viewport says nothing about which. `container` makes an element a container, `cq` queries one.

| Prop            | CSS                            | Notes                                                                             |
| --------------- | ------------------------------ | --------------------------------------------------------------------------------- |
| `container`     | `container-type` / `container` | `true` → `inline-size`; a name → `container: <name> / inline-size`                |
| `containerName` | `container-name`               | The longhand, for a name beside `containerType="size"`                            |
| `containerType` | `container-type`               | `'inline-size'`, `'size'` (both axes, needs its own block size), `'normal'` (off) |
| `cq`            | `@container`                   | Keyed by size: `md`, its complement `maxMd`, or `'name/md'` for a named container |

| Size  | Query                      | Complement                         |
| ----- | -------------------------- | ---------------------------------- |
| `xs`  | `(min-width: 20rem)` 320px | `maxXs` → `not (min-width: 20rem)` |
| `sm`  | `(min-width: 24rem)` 384px | `maxSm`                            |
| `md`  | `(min-width: 28rem)` 448px | `maxMd`                            |
| `lg`  | `(min-width: 32rem)` 512px | `maxLg`                            |
| `xl`  | `(min-width: 36rem)` 576px | `maxXl`                            |
| `xxl` | `(min-width: 42rem)` 672px | `maxXxl`                           |

```tsx
// A card that lays itself out from the space it was given — the window never comes into it
<Flex container>
  <Flex d="column" cq={{ sm: { d: 'row', ai: 'center' } }} gap={4} p={4}>…</Flex>
</Flex>

// A name, for when a card sits inside a card. `cq` queries the *nearest* container by default.
<Flex container="page">
  <Flex container="card">
    <Box cq={{ md: { fontSize: 16 }, 'page/xl': { fontSize: 18 }, maxSm: { display: 'none' } }} />
  </Flex>
</Flex>

// Everything a breakpoint nests, nests here too
<Box cq={{ md: { hover: { color: 'indigo-500' }, theme: { dark: { bgColor: 'slate-800' } }, before: { content: 'Wide' } } }} />
```

- **The cascade puts a container query after every breakpoint and before every preference** — the element's own space is the more local statement, and neither is a reason to override `motionReduce`. Sizes ascend, the `max` keys descend, so the narrower one wins where two overlap.
- **One at-rule block per rule**, so `cq` does not nest inside a breakpoint and a breakpoint does not nest inside `cq` — a type error, the same way two breakpoints are.
- **The container name is validated** because it lands in an at-rule prelude: anything that is not a CSS identifier, or a word the prelude uses (`not`, `and`, `or`), drops the whole block — no rule and no class name.
- `container` costs something: an inline-size container's width no longer depends on its contents. That is what makes the query possible, and the reason not to declare it everywhere.

### Theme System

```tsx
import Box from '@box-kite/react';

// Setup: wrap app in Box.Theme (auto-detects via prefers-color-scheme)
<Box.Theme>                                      {/* auto light/dark detection */}
<Box.Theme theme="dark">                         {/* explicit theme, ignores system pref */}
<Box.Theme theme="dark" use="global">            {/* applies class + data-theme to <html> */}
<Box.Theme storageKey="app-theme">               {/* persists user choice to localStorage */}

// Hook: read + set theme programmatically (must be within Box.Theme)
const [theme, setTheme] = Box.useTheme();
setTheme('dark');   // set explicit theme (persists to localStorage if storageKey provided)
setTheme(null);     // reset to system auto-detection (clears localStorage)

// Supports any custom theme name — not limited to 'light'/'dark'
<Box.Theme theme="high-contrast">

// Theme-aware styles — nests with pseudo-classes and breakpoints
<Box
  bgColor="white" color="gray-900"
  hover={{ bgColor: 'gray-100' }}
  theme={{ dark: { bgColor: 'gray-900', color: 'gray-100', hover: { bgColor: 'gray-700' } } }}
/>
```

**Props**: `theme?` (string — explicit theme name), `use?` (`'global'`|`'local'`, default `'local'`), `storageKey?` (string — localStorage key for persistence), `globalStyles?` (BoxStyleProps — app-wide styles on `<html>`, only with `use="global"`).
**DOM**: Sets `data-theme` attribute and theme class on wrapper (local) or `document.documentElement` (global). Cleaned up on unmount.

#### globalStyles — App-wide styles on `<html>`

```tsx
// Style the root document scrollbar (and any other html-level CSS). Only takes effect when use="global".
<Box.Theme
  use="global"
  globalStyles={{
    scrollbarColor: ['violet-500', 'transparent'],
    scrollbarWidth: 'thin',
    theme: {
      dark: { scrollbarColor: ['violet-700', 'gray-900'] },
      light: { scrollbarColor: ['violet-300', 'gray-100'] },
    },
  }}
>
  <App />
</Box.Theme>
```

Accepts the same shape as Box style props (including theme-keyed values, pseudo-classes, breakpoints). Rules are emitted directly on `html` — useful for inheritable CSS like `scrollbar-color`/`scrollbar-width`/`fontFamily`/`color`. Group selectors (`group`/`peer`) are not supported here since `<html>` has no ancestor to name.

---

## Component System

```tsx
// Component + variant props apply registered styles from Box.components()
<Box component="card" variant="bordered">
  <Box component="card.header">Title</Box>
  <Box component="card.body">Content</Box>
</Box>
```

### Box.components() — Define Custom Component Styles

```tsx
Box.components({
  card: {
    styles: { display: 'flex', d: 'column', p: 4, bgColor: 'white', borderRadius: 8, shadow: 'medium' },
    variants: {
      bordered: { b: 1, borderColor: 'gray-200', shadow: 'none' },
      elevated: { shadow: 'large' },
    },
    children: {
      header: { styles: { fontSize: 18, fontWeight: 600, mb: 3 } },
      body: { styles: { flex: 1 } },
    },
  },
});
```

### Component Inheritance with `extends`

```tsx
Box.components({
  subgrid: {
    extends: 'datagrid', // inherits all styles, variants, and children; deep-merges overrides
    styles: { b: 0, borderRadius: 0, shadow: 'none' },
    children: { header: { children: { cell: { styles: { fontSize: 12 } } } } },
  },
});
```

---

## Extension System

### Box.extend() — Add New Props, Colors, Variables

```tsx
import Box from '@box-kite/react';

export const { extendedProps, extendedPropTypes } = Box.extend(
  { 'brand-primary': '#ff6600', 'brand-secondary': '#0066ff' }, // CSS variables
  {
    // New props — a CSS property the registry does not have (`aspectRatio` is built in now)
    imageRendering: [
      {
        values: ['auto', 'pixelated', 'crisp-edges'] as const,
        styleName: 'image-rendering',
      },
    ],
  },
  {
    // Extend existing props with new values
    bgColor: [
      {
        values: ['brand-primary', 'brand-secondary'] as const,
        styleName: 'background-color',
        valueFormat: (value, getVariable) => getVariable(value),
      },
    ],
    color: [
      {
        values: ['brand-primary', 'brand-secondary'] as const,
        styleName: 'color',
        valueFormat: (value, getVariable) => getVariable(value),
      },
    ],
  },
);
```

### Per-Property Values (Multi-styleName)

When `styleName` is an array, `valueFormat` is called once per CSS property with `styleName` as the third argument. Use for typography presets or any design token spanning multiple CSS properties:

```tsx
Box.extend(
  {
    'text-display-lg-size': '36px',
    'text-display-lg-weight': '700',
    'text-display-lg-line-height': '1.2',
    'text-display-lg-letter-spacing': '-0.02em',
  },
  {
    textStyle: [
      {
        values: ['display-lg', 'display-sm'] as const,
        styleName: ['font-size', 'font-weight', 'line-height', 'letter-spacing'],
        valueFormat: (value, getVariable, styleName) => {
          const suffix = { 'font-size': 'size', 'font-weight': 'weight', 'line-height': 'line-height', 'letter-spacing': 'letter-spacing' };
          return getVariable(`text-${value}-${suffix[styleName!]}`);
        },
      },
    ],
  },
  {},
);
// <Box textStyle="display-lg" /> → sets all 4 CSS properties
```

### TypeScript Type Augmentation

```typescript
// types.d.ts — Generic approach (recommended)
import { ExtractComponentsAndVariants, ExtractBoxStyles } from '@box-kite/core/types';
import { components } from './boxComponents';
import { extendedPropTypes, extendedProps } from './boxExtends';

declare module '@box-kite/core/types' {
  namespace Augmented {
    interface BoxProps extends ExtractBoxStyles<typeof extendedProps> {}
    interface BoxPropTypes extends ExtractBoxStyles<typeof extendedPropTypes> {}
    interface ComponentsTypes extends ExtractComponentsAndVariants<typeof components> {}
  }
}

// Manual approach (simple cases):
declare module '@box-kite/core/types' {
  namespace Augmented {
    interface BoxPropTypes {
      bgColor: 'brand-primary' | 'brand-secondary';
    }
    interface ComponentsTypes {
      card: 'bordered' | 'elevated';
    }
  }
}
```

---

## Common Patterns

```tsx
import Flex from '@box-kite/react/components/flex';
import Grid from '@box-kite/react/components/grid';
import Button from '@box-kite/react/components/button';
import Textbox from '@box-kite/react/components/textbox';

// Flex layout
<Flex d="column" gap={4} ai="center" jc="between">{children}</Flex>
<Flex inline gap={2}>Inline flex</Flex>

// Responsive stack
<Flex d="column" gap={2} md={{ d: 'row', gap: 4 }}>{children}</Flex>

// Grid
<Grid gridCols={3} gap={4}>{items.map(i => <Box key={i.id}>{i.content}</Box>)}</Grid>

// Card
<Box p={4} bgColor="white" borderRadius={8} shadow="medium">{content}</Box>

// Button with states
<Button px={4} py={2} bgColor="blue-500" color="white" borderRadius={6}
  hover={{ bgColor: 'blue-600' }} disabled={{ opacity: 0.5, cursor: 'not-allowed' }}>Click</Button>

// Input
<Textbox placeholder="Enter..." width="fit" px={3} py={2} b={1} borderColor="gray-300"
  borderRadius={6} focus={{ borderColor: 'blue-500', outline: 'none' }} />

// Truncated text
<Box overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">Long text...</Box>

// Overlay
<Box position="fixed" top={0} left={0} right={0} bottom={0} bgColor="black" opacity={0.5} zIndex={50} />
```

**Portals**: `Overlay` (`components/overlay`) anchors a layer to a trigger (`anchor`, `side`, `align`,
`offset`, `flip`, `matchWidth` — the vocabulary `useAnchorPosition` and `Tooltip` share) and renders it
into `#box-kite-portal`, so it escapes `overflow: hidden`, clipped ancestors and the stacking order. No
ARIA, no open state — it is positioning only. For a _description of a control_, use `Tooltip` instead
(below): it is the same layer with the APG pattern on it.

### Styling an element Box cannot render (`useClassNames`)

An icon from a set, a `motion.div`, a router's `NavLink`, a third-party chart: there is no `tag` that
renders one, and the only styling channel they offer is `className`. `useClassNames` resolves the
same props Box would and gives you the class list to put on them.

```tsx
import { useClassNames } from '@box-kite/react';

const { className, styles } = useClassNames({ color: 'sky-500', hover: { color: 'sky-300' } });

<>
  {styles}
  <NavLink to="/" className={className} />
</>;
```

`styles` is defined in element mode only (the CSS as hoistable `<style>` elements); elsewhere it is
undefined and rendering it costs nothing, so write the line either way. Pass `{ svg: true }` as a
second argument for an element inside an `<svg>`. `<Icon>` is this hook plus that flag — reach for
`Icon` for an icon and this only for everything else.

### Group and Peer

```tsx
<Flex className="card-row" gap={2}>
  <Box opacity={0} group={{ 'card-row/hover': { opacity: 1 } }}>
    Actions
  </Box>
</Flex>
```

### Server-Side Rendering

```tsx
import { getStyles, resetStyles } from '@box-kite/react/ssg';

const html = renderToString(<App />); // any React server renderer
const cssString = getStyles(); // the CSS for what was just rendered
// <style id="box-kite-styles">{cssString}</style> in the document head
resetStyles(); // reset before the next request
```

Or in one call, which injects the styles into the rendered `<head>` and resets afterwards:

```tsx
import { renderToStaticMarkup } from '@box-kite/react/ssg';

const { html, styles } = renderToStaticMarkup(<App />);
```

No DOM is needed: with no `document` in the process the engine collects CSS in memory. Sequential
requests are independent and identical markup gets identical class names.

---

## React Server Components (React 19)

Box renders in a Server Component with no `'use client'` and no configuration — the `react-server`
export condition resolves to a build that calls no hook and touches no DOM. Its CSS travels with its
markup as `<style href precedence>` elements, which React 19 hoists into `<head>` and dedupes.

```tsx
// app/page.tsx — a Server Component
import Flex from '@box-kite/react/components/flex';
import { H1 } from '@box-kite/react/components/semantics';

export default function Page() {
  return (
    <Flex d="column" gap={2} p={6} bgColor="slate-50" sm={{ p: 8 }}>
      <H1 fontSize={24}>Rendered on the server</H1>
    </Flex>
  );
}
```

Client components in the same app should use the same path, so their CSS is in the HTML too — one
call, in a module the root layout imports:

```tsx
'use client';
import Box from '@box-kite/react';

Box.configure({ sink: 'element' }); // React 19 only
```

- `Box.configure({ sink, classNames })` — `sink`: `'cssom'` (browser default), `'textContent'`
  (tests, readable rules), `'string'` (server), `'element'` (React 19 style elements);
  `classNames`: `'hashed'` (default), `'readable'`, `'stable'` (content-hashed — the default in
  element mode so server and client agree). Call it before the first render.
- In element mode rules live in CSS cascade layers, so **your own unlayered CSS always wins** over
  Box props, and declaring `Box.extend()` props before the first render matters.
- The hook-free pre-built components render on the server too: `Flex`, `Grid`, `Button`,
  `Textbox`, `Textarea`, `RadioButton`, `Icon`, the SVG elements (`Svg`, `Path`, `Circle`, …) and the semantic tags (`H1`, `P`, `Link`, …).
  Import them straight into a Server Component.
- `Dropdown`, `Tooltip`, `Overlay`, `DataGrid`, `Checkbox`, `Switch`, `RadioGroup`, `Select` and `Form` hold state, so their chunks
  ship a `'use client'` banner: a Server Component may import one, but it becomes a client
  boundary and its CSS is in the HTML only if a client module already ran
  `Box.configure({ sink: 'element' })`.
- Client-only, so use them inside `'use client'`: hover-callback children
  (`{({ isHover }) => …}`) and `Box.Theme`. Theme _styles_ (`theme={{ dark: { … } }}`) work in a
  server component — put the theme class on `<html>`.
- React 18 cannot hoist these elements; keep the default sink there.

---

## Behaviour primitives (`@box-kite/react/a11y`)

Five client hooks for building accessible components — the mechanics, not the ARIA. 2.2 KB gzipped
and no styling engine behind them.

```tsx
import { useControllableState, useDismiss, useFocusReturn, useIdentifier, useRovingFocus } from '@box-kite/react/a11y';
import VisuallyHidden from '@box-kite/react/components/visuallyHidden';

const id = useIdentifier('menu'); // stable id: `${id}-trigger`, `${id}-listbox`
const [open, setOpen] = useControllableState({ value: props.open, defaultValue: false, onChange: props.onOpenChange });

const roving = useRovingFocus({ count: items.length, textOf: (i) => items[i].label, onSelect: (i) => choose(i) });
// roving.activeIndex · roving.onKeyDown (on the focused element) · roving.itemProps(i) · roving.activeItem()

useDismiss({ enabled: open, inside: [triggerRef, popupRef], onDismiss: (reason, event) => setOpen(false, { reason, event }) });
useFocusReturn({ enabled: open, returnTo: triggerRef });
```

- Every change carries a reason: `onChange(value, { reason, event })` — `'escape'`,
  `'outside-pointer'`, or one you name. The setter takes an updater and its identity is stable.
- `useDismiss`: pass the **trigger** in `inside` as well as the popup, or pressing the trigger of an
  open popup dismisses and reopens in one gesture. Escape reaches the innermost layer only.
- `useRovingFocus`: arrows per `orientation` (`'vertical'` default), Home/End, typeahead when
  `textOf` is given, Enter/Space to select, disabled items skipped. `focusItems: false` keeps DOM
  focus where it is for an `aria-activedescendant` pattern.
- `useIdentifier`: React's `useId` without the punctuation, so the id also works as a CSS selector.
- `VisuallyHidden`: screen-reader-only content — clipped, so it stays in the accessibility tree
  (`display: none` would not). It is a Box: `tag`, `component` and every style prop work.
- The entry is client-only (`'use client'`); `visuallyHidden` renders on a server.

Full reference: `docs/a11y-primitives.md`.

---

## Form controls: Checkbox, Switch, RadioGroup

All three render **real native inputs**, so focus, the checked state, the disabled state and form
submission come from the platform. What the components add is the part the platform cannot guess.

```tsx
import Checkbox from '@box-kite/react/components/checkbox';
import Switch from '@box-kite/react/components/switch';
import RadioGroup from '@box-kite/react/components/radioGroup';
import RadioButton from '@box-kite/react/components/radioButton';

<Checkbox label="Accept the terms" name="terms" />
<Checkbox label="Select all rows" name="rows" indeterminate />
<Switch label="Email notifications" name="notify" defaultChecked />

<RadioGroup label="Plan" name="plan" defaultValue="free" onChange={(plan, { reason }) => setPlan(plan)}>
  <RadioGroup.Item value="free" label="Free" />
  <RadioGroup.Item value="pro" label="Pro" />
  <RadioGroup.Item value="team" label="Team" disabled />
</RadioGroup>

<RadioButton name="plan" value="free" label="Free" />   {/* on its own, outside a group */}
```

**`label` is the important prop.** It renders the text inside a `<label>` that wraps the input, so
the association needs no `htmlFor`/`id` pair and the whole row is a click target. Leave it out and
nothing wraps the input — the markup is what it always was. `labelProps` styles that `<label>`;
every other Box prop styles the control itself.

| Component    | Prop                     | What it does                                                                            |
| ------------ | ------------------------ | --------------------------------------------------------------------------------------- |
| all three    | `label` / `labelProps`   | The wrapping `<label>` and its styles.                                                  |
| `Checkbox`   | `indeterminate`          | Sets the DOM property **and** `aria-checked="mixed"`, which is what is announced.       |
| `Switch`     | —                        | `role="switch"` over the same input; Space **and** Enter toggle, Enter does not submit. |
| `RadioGroup` | `label`                  | `role="radiogroup"` named by it — a set of radios with nothing over it is a flat list.  |
| `RadioGroup` | `name`                   | The field every item submits under. Generated when left out.                            |
| `RadioGroup` | `value` / `defaultValue` | The selected item's value (a string — the platform's own model for a radio).            |
| `RadioGroup` | `onChange`               | `(value, { reason, event })` — `click` or `keyboard`.                                   |
| `RadioGroup` | `orientation`            | `vertical` (default) or `horizontal`. Both arrow pairs navigate either way.             |

Arrow keys move **and select** inside a group, wrapping at both ends and skipping disabled items;
Tab enters the group once and leaves it once, because a native radio set is already a single tab
stop and the component does not fight that.

`checked`, `disabled` and `indeterminate` are each both a state and a pseudo-class style prop. Pass
a boolean for the state, or the tuple `[state, styles]` for both:
`checked={[on, { bgColor: 'emerald-500' }]}`.

---

## Form Component

A `<form>` that reads its own fields when it submits, so a simple form needs no state per input.

```tsx
import Form from '@box-kite/react/components/form';
import Textbox from '@box-kite/react/components/textbox';

interface Credentials {
  email: string;
  password: string;
}

<Form<Credentials> p={4} onSubmit={(values, e) => signIn(values)}>
  <Textbox name="email" type="email" />
  <Textbox name="password" type="password" />
  <Button type="submit">Sign in</Button>
</Form>;
```

`onSubmit(values, event)` runs after the event's own `preventDefault()`, so nothing navigates. The
object is built from the form's elements, and a field is in it only if it has a `name`:

| In the markup                     | In `values`                                              |
| --------------------------------- | -------------------------------------------------------- |
| one named input                   | its `value` as a string                                  |
| one named checkbox or radio       | its `checked` **boolean**                                |
| several elements sharing a `name` | an array — the checked values, or every value for inputs |
| `name="address.city"`             | nested: `{ address: { city } }`                          |
| `name="lines[0].qty"`             | nested through an array: `{ lines: [{ qty }] }`          |

The type argument is the shape you expect back; it is not checked against the fields, so keep it
next to the markup. Everything else is a Box prop, and `props` takes the `<form>` attributes
(`onSubmit` and `ref` are the component's own).

---

## Tooltip Component

```tsx
import Tooltip from '@box-kite/react/components/tooltip';

<Tooltip content="Deletes the row for good">{(trigger) => <Button {...trigger}>Delete</Button>}</Tooltip>;
```

The child is a **render prop**, not an element: what it receives (a `ref`, plus `aria-describedby`
and the pointer/focus handlers in `props`) has to land on the control itself. One spread on a Box
component — `<Button {...trigger}>` — or, on a plain element,
`<button ref={trigger.ref} {...trigger.props}>`. The `ref` is what the bubble is positioned against,
so the tooltip sits under the trigger and adds nothing to the layout.

| Prop                      | Default | What it does                                                                       |
| ------------------------- | ------- | ---------------------------------------------------------------------------------- |
| `content`                 | —       | The description. Nothing renders while it is empty.                                |
| `open` / `defaultOpen`    | —       | Controlled / uncontrolled open state.                                              |
| `onOpenChange`            | —       | `(open, { reason, event })` — `hover`, `focus`, `pointer-leave`, `blur`, `escape`. |
| `openDelay`               | `300`   | Hover dwell before it appears. Focus ignores it and shows immediately.             |
| `closeDelay`              | `150`   | Grace period after the pointer leaves, so it can travel onto the tooltip.          |
| `side` / `align`          | `bottom` / `center` | Which side of the trigger the bubble sits on, and how it lines up. |
| `offset`                  | `1`     | The gap, on the ÷4 scale — 4px, near enough for the pointer to cross.              |
| `flip`                    | `true`  | Whether a side with no room is swapped for its opposite.                           |

Every other Box prop styles the bubble, over the built-in `tooltip` component style. What the
component guarantees, so you do not wire it: `role="tooltip"`, `aria-describedby` on the trigger only
while it is open, opening on hover **and** focus, Escape to dismiss with focus left where it is (and
no re-show until the pointer leaves and returns), the pointer able to move onto the tooltip, and no
auto-hide timer — the three WCAG 1.4.13 rules.

---

## Chart primitives (`components/chart`)

Four small drawings built from the `components/svg` elements, server-safe, in one entry. **Not a
chart library**: no axes, no legends, no data transformations. What they give you is that a chart is
a Box — its colour, size, dark mode, hover state and breakpoints are the props you already know.
For a real chart with axes and a tooltip, theme Recharts instead.

```tsx
import { Gauge, MiniDonut, ProgressRing, Sparkline } from '@box-kite/react/components/chart';

// A sparkline stretches to whatever box it is in and keeps its line one width thick.
<Sparkline data={[4, 9, 6, 12, 10, 15]} width="7rem" color="sky-500" />
<Sparkline data={[4, 9, 6, 12, 10, 15]} variant="area" fillOpacity={0.2} color="violet-500" />
<Sparkline data={[4, 9, 6, 12]} variant="bar" min={0} max={20} color="emerald-500" />

// A ring or a dial: the arc eases between values with no animation code.
<ProgressRing value={0.62} color="emerald-500" label="62% complete" />
<Gauge value={0.4} sweep={180} start={270} color="rose-500">
  <SvgText x={50} y={48} textAnchor="middle" fontSize={22} fill="rose-500" stroke="none">40%</SvgText>
</Gauge>

// One segment per value, each its share of the whole. No total needed.
<MiniDonut data={[5, 3, 2]} colors={['sky-500', 'emerald-500', 'var(--chart-3)']} />

// A gradient fill is a value now, so it takes a theme and a hover like any other paint.
<Sparkline data={[4, 9, 6, 12]} variant="area" stroke="url(#trend)" fill="url(#trend)">
  <Defs>
    <LinearGradient id="trend" x1="0" y1="0" x2="1" y2="0">
      <Stop offset="0%" stopColor="currentColor" color="sky-500" />
      <Stop offset="100%" stopColor="currentColor" color="violet-500" />
    </LinearGradient>
  </Defs>
</Sparkline>
```

| Prop              | Component                | Default                 | What it is                                                                                         |
| ----------------- | ------------------------ | ----------------------- | -------------------------------------------------------------------------------------------------- |
| `data`            | `Sparkline`, `MiniDonut` | —                       | The numbers. A sparkline reads them oldest-first; a donut draws each as its share of the whole     |
| `variant`         | `Sparkline`              | `'line'`                | `'line'`, `'area'` (the line with the space beneath it filled) or `'bar'`                          |
| `min` / `max`     | `Sparkline`              | the data's own ends     | Fix the value axis, so a column of rows is comparable instead of each being scaled to itself       |
| `value`           | `ProgressRing`, `Gauge`  | —                       | How full the arc is, 0–1. Rounded to half a percent (see below) and clamped                        |
| `thickness`       | all but `Sparkline`      | `10` (`20` for a donut) | The ring's width, out of the 100-unit box the drawing is computed in                               |
| `trackOpacity`    | `ProgressRing`, `Gauge`  | `0.2`                   | The unfilled part, as the same colour faded — so the track follows the theme too                   |
| `sweep` / `start` | `Gauge`                  | `270` / `225`           | How far round the dial goes and where it begins, in degrees clockwise from twelve o'clock          |
| `colors`          | `MiniDonut`              | six tokens              | One paint per segment, cycled. Anything `fill` takes, including `var(--chart-1)`                   |
| `label`           | all                      | —                       | Names the drawing: `role="img"` with this text. Without one it is `aria-hidden`                    |
| `children`        | all                      | —                       | SVG content drawn after the chart — an `SvgText` in the middle of a ring, a `Defs` with a gradient |

Everything else is an `Svg`'s: `width`/`height` are the SVG attributes (`width="7rem"`,
`width={200}`, and a sparkline defaults to `width="100%"`), the paint is inherited by the shapes
inside (the default stroke is `currentColor`, so `color="sky-500"` recolours any of them), and every
Box prop, pseudo-class, breakpoint and theme works.

**Four things to get right:**

1. **Naming is `Svg`'s rule, and a chart is where it matters.** A sparkline beside the number it
   summarises is decoration — leave it unnamed, or a screen reader reads the row twice. A chart that
   _is_ the data needs a `label` saying what the shape shows: `label="Revenue, rising 12% over six
months"`, not `label="Chart"`.
2. **Shape is an attribute, paint is a class.** A sparkline's geometry is the `d` attribute, which
   the styling engine never sees, so ten thousand different shapes generate no CSS at all; the
   colour and the width are style props, so the rows share one rule each. That is what makes one
   sparkline per row of a virtualized grid affordable.
3. **A ring's value is rounded to half a percent.** A dash length has to be a style prop to be able
   to transition, so it lands in a class name — rounding caps a column of percentages at a couple of
   hundred rules instead of one per row, and half a percent of a 48px ring is a third of a pixel.
4. **A sparkline is the one primitive not drawn to scale.** It is `preserveAspectRatio="none"` and
   `vectorEffect="non-scaling-stroke"`, so it fills a cell of unknown width and the line stays one
   width thick. Both are ordinary props — `vectorEffect="none"` opts out. The rings are drawn to
   scale and stay circular.

In a DataGrid, a cell renderer is a component: define it outside the render, or every scroll
remounts the column.

### Theming a chart library — `ChartContainer`

The bridge for the chart you did not write. It declares the variables a chart reads, so the chart
names no colour at all and its dark mode belongs to the page:

```tsx
import { ChartContainer } from '@box-kite/react/components/chart';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from 'recharts';

<ChartContainer
  series={['revenue', 'cost']}
  vars={{ 'chart-grid': 'slate-200', 'chart-label': 'slate-500' }}
  theme={{ dark: { vars: { 'chart-grid': 'slate-800', 'chart-label': 'slate-400' } } }}
  height={60}
>
  <ResponsiveContainer width="100%" height="100%">
    <AreaChart data={months}>
      <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" vertical={false} />
      <XAxis dataKey="month" stroke="var(--chart-label)" fontSize={12} />
      <YAxis stroke="var(--chart-label)" fontSize={12} width={36} />
      <Area dataKey="revenue" stroke="var(--color-revenue)" fill="var(--color-revenue)" fillOpacity={0.15} />
      <Area dataKey="cost" stroke="var(--color-cost)" fill="var(--color-cost)" fillOpacity={0.15} />
    </AreaChart>
  </ResponsiveContainer>
</ChartContainer>;
```

| Prop     | What it is                                                                                                 |
| -------- | ---------------------------------------------------------------------------------------------------------- |
| `series` | `['revenue', 'cost']` takes the palette in order, or `{ revenue: 'emerald-600' }` names a paint per series |

Everything else is a Box prop, which is the point:

- It always declares `--chart-1` … `--chart-6` (the six `MiniDonut` cycles through) and redeclares
  them one step lighter under the dark theme. A series with no paint of its own reads a slot, wrapping
  round after six.
- Replacing a slot needs no prop for it: `vars={{ 'chart-1': 'teal-600' }}` and
  `theme={{ dark: { vars: { 'chart-1': 'teal-400' } } }}` merge with the defaults rather than replacing
  them, and any other name a chart reads (`--chart-grid`, `--chart-label`) is declared the same way.
- `--color-<series>` and `--chart-n` are deliberately the names the ecosystem uses, so a chart copied
  from shadcn's charts works unchanged. Unlike that recipe there is no `<style>` tag per chart and no
  `id` to scope it with: the variables are in a class, so two tiles with the same series share one rule.
- A series name becomes part of a custom-property name, so it has to be a CSS identifier. A Recharts
  dot-path `dataKey` (`user.name`) is skipped — that series only, not the rest of the palette.
- It adds no role, no ARIA and no styling of its own: it is a `<div>` with variables on it, and what is
  inside owns its own semantics. Size it like any Box (`height={60}` is 15rem) — Recharts
  `ResponsiveContainer` measures the parent.

```tsx
function TrendCell({ cell }: { cell: CellModel<Row> }) {
  return (
    <Flex px={3} ai="center" height="fit">
      <Sparkline data={cell.row.data.trend} color="emerald-500" />
    </Flex>
  );
}

<DataGrid data={rows} def={{ rowKey: 'id', columns: [{ key: 'trend', header: 'Last 12 months', width: 180, Cell: TrendCell }] }} />;
```

---

## Key Reminders for AI Assistants

1. **NEVER `style={{ }}`** — use Box props. Missing prop? Use `Box.extend()`, or `css={{ … }}` for a one-off — the typed escape hatch compiles to a class, never a `style` attribute
2. **NEVER `<Box tag="...">` for common elements** — use `<Button>`, `<Link>`, `<H1>`, `<P>`, `<Nav>`, `<Svg>`, `<Path>`, `<Circle>`, etc.
3. **NEVER `<Box display="flex/grid">`** — use `<Flex>` / `<Grid>`
4. **fontSize divider is 16** (not 4). `fontSize={14}` → 14px
5. **Spacing divider is 4**. `p={4}` → 16px (1rem)
6. **Border width and lineHeight are direct px**. `b={1}` → 1px. **borderRadius uses divider 4**: `borderRadius={2}` → 8px
7. **Colors are Tailwind's OKLCH palette**: `'gray-500'`, `'blue-600'` — 26 families × 11 steps, and an opacity modifier on any of them: `bgColor="blue-500/40"` (a `color-mix`, not `opacity`)
8. **Breakpoints are mobile-first**: base → sm → md → lg → xl → xxl
9. **Theme styles nest**: `theme={{ dark: { hover: { ... } } }}`
10. **HTML attributes go in `props` prop**: `<Link props={{ href: '/about' }}>` not `<Link href>`. `data-*` and `aria-*` go there too — a `data-state` written at the top level typechecks and is then dropped
11. **Size shortcuts**: `width="fit"` = 100%, `width="fit-screen"` = 100vw, `width="1/2"` = 50%
12. **Box is memoized** with `React.memo`
13. **`style` is top-level only** — never inside breakpoints (`sm={{ style: ... }}`), pseudo-classes, or theme objects. `css` is the one that nests: `sm={{ css: { objectPosition: 'top' } }}` is a rule
14. **A CSS variable is a prop**: `vars={{ 'color-x': 'sky-500' }}` declares `--color-x` for everything inside — and a third-party chart goes in `<ChartContainer series={['revenue']}>` so it names no colour at all
15. **All sizing props use divider 4** — `width`, `height`, `minWidth`, `maxWidth`, `minHeight`, `maxHeight` are NOT direct pixels. `height={10}` = 2.5rem = 40px
16. **A state your own code sets is a nested prop too**: `dataAttr={{ 'state=open': { … } }}` → `[data-state="open"]`, `ariaAttr={{ selected: { … } }}` → `[aria-selected="true"]`, `has={{ ':checked': { … } }}`, `not={{ hover: { … } }}`, `nth={{ odd: { … } }}`. The attribute itself still goes in `props`
17. **Somebody else's state is `group`/`peer`**: `group={{ 'card/hover': { … } }}` → `.card:hover .x`, `peer={{ 'agree/checked': { … } }}` → `.agree:checked ~ .x`. The ancestor or sibling carries the class via `className`; `hoverGroup` and its four siblings are the older spelling

---

## DataGrid Component

```tsx
import DataGrid from '@box-kite/react/components/dataGrid';

<DataGrid
  data={users}
  def={{
    rowKey: 'id',
    title: 'Users',
    topBar: true,
    bottomBar: true,
    globalFilter: true,
    rowSelection: { pinned: true },
    showRowNumber: { pinned: true },
    rowHeight: 40,
    visibleRowsCount: 15, // or 'all' to disable virtualization
    columns: [
      { key: 'name', header: 'Name', filterable: true },
      { key: 'age', header: 'Age', width: 80, align: 'right', filterable: { type: 'number' } },
      { key: 'email', header: 'Email', width: 250, filterable: true },
      { key: 'status', header: 'Status', filterable: { type: 'multiselect' } },
      { key: 'country', header: 'Country', pin: 'END' },
      {
        key: 'actions',
        header: '',
        pin: 'END',
        width: 80,
        sortable: false,
        resizable: false,
        Cell: ({ cell }) => <Button onClick={() => edit(cell.row.data)}>Edit</Button>,
      },
    ],
    rowDetail: { content: (user) => <UserDetails user={user} />, height: 'auto', expandOnRowClick: true, expandColumnHeader: 'Details' },
    contextMenu: { sort: true, pin: true, group: false },
    resizerStyle: 'hover',
  }}
  onSelectionChange={(e) => console.log(e.selectedRowKeys)}
/>;
```

### DataGridProps

| Prop                                          | Type                                  | Description                                                                                |
| --------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------ |
| `data`                                        | `TRow[]`                              | Row data (required)                                                                        |
| `def`                                         | `GridDefinition`                      | Grid config (required)                                                                     |
| `component`                                   | `string`                              | Style tree name (default: `'datagrid'`)                                                    |
| `loading`                                     | `boolean`                             | Loading state                                                                              |
| `filters`                                     | `((row) => boolean)[]`                | External predicate filters (applied before column/global filters)                          |
| `page` / `onPageChange`                       | `number` / `(page, size) => void`     | Controlled pagination (1-indexed)                                                          |
| `onSortChange`                                | `(columnKey, direction) => void`      | Sort callback (`direction`: `'ASC'`/`'DESC'`/`undefined`)                                  |
| `onServerStateChange`                         | `(state) => void`                     | Unified: `{ page, pageSize, sortColumn, sortDirection, columnFilters, globalFilterValue }` |
| `onSelectionChange`                           | `(event) => void`                     | `event`: `{ action, selectedRowKeys, affectedRowKeys, isAllSelected }`                     |
| `expandedRowKeys` / `onExpandedRowKeysChange` | `Key[]` / `(keys) => void`            | Controlled expanded rows                                                                   |
| `globalFilterValue` / `onGlobalFilterChange`  | `string` / `(value) => void`          | Controlled global filter                                                                   |
| `columnFilters` / `onColumnFiltersChange`     | `ColumnFilters` / `(filters) => void` | Controlled column filters                                                                  |

### GridDefinition

| Prop                      | Type                               | Default     | Description                                                                                                    |
| ------------------------- | ---------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------- |
| `columns`                 | `ColumnType[]`                     | required    | Column definitions                                                                                             |
| `rowKey`                  | `keyof TRow \| (row) => Key`       | auto        | Unique row identifier                                                                                          |
| `rowHeight`               | `number`                           | `48`        | Row height in px                                                                                               |
| `visibleRowsCount`        | `number \| 'all'`                  | `10`        | Visible rows. `'all'` disables virtualization                                                                  |
| `showRowNumber`           | `boolean \| { pinned?, width? }`   | `false`     | Row number column                                                                                              |
| `rowSelection`            | `boolean \| { pinned? }`           | `false`     | Checkbox selection column                                                                                      |
| `rowDetail`               | `RowDetailConfig`                  | —           | Expandable detail panel (see below)                                                                            |
| `pagination`              | `{ totalCount, pageSize? }`        | —           | Server-side pagination. Bypasses client-side filtering                                                         |
| `topBar` / `bottomBar`    | `boolean`                          | `false`     | Show top/bottom bars                                                                                           |
| `title` / `topBarContent` | `ReactNode`                        | —           | Top bar content                                                                                                |
| `globalFilter`            | `boolean`                          | `false`     | Enable global fuzzy search                                                                                     |
| `globalFilterKeys`        | `(keyof TRow)[]`                   | all         | Limit global filter columns                                                                                    |
| `sortable` / `resizable`  | `boolean`                          | `true`      | Enable sorting/resizing for all columns                                                                        |
| `contextMenu`             | `boolean \| ContextMenuConfig`     | `true`      | Control column header context menu. `false` hides it. Object: `{ sort?, pin?, group? }`                        |
| `resizerStyle`            | `'visible' \| 'hover' \| 'hidden'` | `'visible'` | Resizer handle visibility. `'hover'`: shows on header cell hover. `'hidden'`: invisible but resize still works |
| `noDataComponent`         | `ReactNode`                        | `'empty'`   | Custom empty state                                                                                             |

### ColumnType

| Prop                     | Type                                                | Default  | Description                                                                                                                                     |
| ------------------------ | --------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `key`                    | `Key`                                               | required | Column identifier (maps to TRow property)                                                                                                       |
| `header`                 | `string`                                            | —        | Header text                                                                                                                                     |
| `width`                  | `number`                                            | `200`    | Base width in px                                                                                                                                |
| `align`                  | `'start' \| 'end' \| 'center' \| 'left' \| 'right'` | `'left'` | Cell alignment. `start`/`end` follow the reading order; `left`/`right` stay on the screen side they name                                        |
| `pin`                    | `'START' \| 'END'` (also `'LEFT'`/`'RIGHT'`)        | —        | Pin to an edge of the **inline axis** (sticky on scroll), so it holds under either `dir`. `LEFT`/`RIGHT` are the older spelling of the same two |
| `columns`                | `ColumnType[]`                                      | —        | Nested columns (grouped header)                                                                                                                 |
| `Cell`                   | `({ cell }) => ReactNode`                           | —        | Custom renderer. `cell`: `{ value, row, column, grid }`                                                                                         |
| `sortable` / `resizable` | `boolean`                                           | inherits | Override grid-level setting                                                                                                                     |
| `flexible`               | `boolean`                                           | `true`   | Participate in flex width distribution                                                                                                          |
| `filterable`             | `boolean \| FilterConfig`                           | —        | `true` (text), `{ type: 'number', min?, max? }`, `{ type: 'multiselect', options? }`                                                            |
| `contextMenu`            | `boolean \| ContextMenuConfig`                      | inherits | Override grid-level context menu. `false` hides entirely. `{ sort?, pin?, group? }` controls sections                                           |

### RowDetailConfig

| Prop                 | Type                                  | Default  | Description                                   |
| -------------------- | ------------------------------------- | -------- | --------------------------------------------- |
| `content`            | `(row: TRow) => ReactNode`            | required | Render function for the detail panel          |
| `height`             | `'auto' \| number \| (row) => number` | `'auto'` | Detail row height                             |
| `expandOnRowClick`   | `boolean`                             | `false`  | Click anywhere on the row to toggle expansion |
| `pinned`             | `boolean`                             | `false`  | Pin the expand column to the reading start    |
| `expandColumnWidth`  | `number`                              | `50`     | Width of the expand column in px              |
| `expandColumnHeader` | `string`                              | `''`     | Header text for the expand column             |

### ContextMenuConfig

| Prop    | Type      | Default | Description                                                               |
| ------- | --------- | ------- | ------------------------------------------------------------------------- |
| `sort`  | `boolean` | `true`  | Show Sort Ascending / Sort Descending / Clear Sort                        |
| `pin`   | `boolean` | `true`  | Show the two pin actions and Unpin, each labelled by the side it lands on |
| `group` | `boolean` | `true`  | Show Group By / Un-Group All                                              |

### Server-Side Pagination

```tsx
<DataGrid
  data={pageData} page={page} loading={loading}
  onServerStateChange={(state) => {
    // state = { page, pageSize, sortColumn, sortDirection, columnFilters, globalFilterValue }
    setPage(state.page); refetch(state);
  }}
  def={{ columns: [...], bottomBar: true, pagination: { totalCount, pageSize: 25 }, globalFilter: true }}
/>
```

### Style Customization

All sub-components are customizable via `Box.components()`:

```tsx
Box.components({
  datagrid: { children: { header: { children: { cell: { styles: { textTransform: 'uppercase' } } } } } },
  subgrid: {
    extends: 'datagrid', // MUST use extends — inherits pinning, sticky, hover groups, filters, etc.
    styles: { b: 0, shadow: 'none' },
    children: { body: { children: { cell: { styles: { fontSize: 13 } } } } },
  },
});
<DataGrid component="subgrid" data={data} def={def} />  {/* children resolve under subgrid.* */}
```

### Accessibility (A7)

DataGrid is the APG **grid** pattern, over a virtualized body, and it supplies the whole thing — do
not add roles or `tabIndex` by hand.

- Roles: the scrolling element is `role="grid"` (not the root, which also holds the top and bottom
  bars); the header and the body are `rowgroup`s; rows are `role="row"` and cells `role="gridcell"`
  / `columnheader`. The scroll spacers virtualization needs are `role="presentation"`.
- Numbers that survive virtualization: `aria-rowcount` / `aria-colcount` describe the **whole**
  grid, and `aria-rowindex` / `aria-colindex` place each rendered row and cell inside it — header
  rows are row 1 onwards, so a body row's number counts them.
- `aria-sort` on every sortable header (`none` until it is the sorted one), `aria-selected` on rows
  **only** when `rowSelection` is on, `aria-multiselectable` on the grid with it, `aria-busy` while
  `loading`, and `aria-expanded` on a group row and on a row with an open detail panel.
- Keyboard: one cell is in the tab order at a time. Arrows move it, Home/End go to the row's ends,
  Ctrl+Home/End to the grid's corners (scrolling to a row that has not been rendered), PageUp/Down
  move a screenful. Enter/Space sorts on a sortable header and otherwise steps into the cell's own
  control; F2 steps in even on a header; Escape hands the keyboard back to the cell. Down/Up keep
  the **column**, not the cell ordinal, so they land under where they started even through a
  grouped header or a group row whose cells cover several columns each.
- The column resizer is APG's window splitter: `role="separator"` with `aria-valuenow`/`-valuemin`/
  `-valuemax` in pixels and `aria-controls` on its header cell. Tab or F2 reaches it, the arrows
  move it 16px, Home/End take it to the narrowest the grid allows and to the grid's own width.
- Every control the grid draws for itself is named after what it acts on: "Select row 4", "Filter
  Country", "Column options for Age", "Columns". The column menu is the APG menu button —
  `aria-haspopup="menu"`, `role="menuitem"` rows, arrows and typeahead, Escape returns focus.
- Selection is announced through a live region ("3 of 200 rows selected"), because ticking a
  checkbox halfway down a grid changes nothing a screen reader would otherwise read out.

**Give it a title.** A grid is not named by the rows in it: `def.title` is rendered in the top bar
and pointed at by `aria-labelledby`.

**Known gap:** Tab does not yet stay inside the grid — controls inside cells are still their own tab
stops, as they were before A7.

### Component Style Tree

| Component Name                                            | Description                                      | Variants                                                                                                                                                                                     |
| --------------------------------------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `datagrid`                                                | Root container                                   | —                                                                                                                                                                                            |
| `datagrid.content`                                        | Scroll container for header + body               | —                                                                                                                                                                                            |
| `datagrid.topBar`                                         | Top bar (title, filters, column groups)          | —                                                                                                                                                                                            |
| `datagrid.topBar.globalFilter`                            | Global search wrapper                            | —                                                                                                                                                                                            |
| `datagrid.topBar.globalFilter.stats`                      | Filtered rows count badge                        | —                                                                                                                                                                                            |
| `datagrid.topBar.columnGroups`                            | Column group chips container                     | —                                                                                                                                                                                            |
| `datagrid.topBar.columnGroups.icon`                       | Column group icon                                | —                                                                                                                                                                                            |
| `datagrid.topBar.columnGroups.separator`                  | Separator between groups                         | —                                                                                                                                                                                            |
| `datagrid.topBar.columnGroups.item`                       | Column group chip                                | —                                                                                                                                                                                            |
| `datagrid.topBar.columnGroups.item.icon`                  | Remove icon on chip                              | —                                                                                                                                                                                            |
| `datagrid.topBar.columnVisibility`                        | Column visibility dropdown                       | —                                                                                                                                                                                            |
| `datagrid.topBar.columnVisibility.badge`                  | Hidden columns count badge                       | —                                                                                                                                                                                            |
| `datagrid.filter.cell`                                    | Filter row cell                                  | `isPinned`, `isFirstLeftPinned`, `isLastLeftPinned`, `isFirstRightPinned`, `isLastRightPinned`                                                                                               |
| `datagrid.filter.cell.input`                              | Filter input container (text/number/multiselect) | —                                                                                                                                                                                            |
| `datagrid.header`                                         | Header grid container (sticky)                   | —                                                                                                                                                                                            |
| `datagrid.header.cell`                                    | Header cell                                      | `isPinned`, `isFirstLeftPinned`, `isLastLeftPinned`, `isFirstRightPinned`, `isLastRightPinned`, `isSortable`, `isRowSelection`, `isRowNumber`, `isFirstLeaf`, `isLastLeaf`, `isEmptyCell`    |
| `datagrid.header.cell.contextMenu`                        | Column context menu button                       | —                                                                                                                                                                                            |
| `datagrid.header.cell.contextMenu.icon`                   | Context menu icon                                | —                                                                                                                                                                                            |
| `datagrid.header.cell.contextMenu.tooltip`                | Context menu popup                               | —                                                                                                                                                                                            |
| `datagrid.header.cell.contextMenu.tooltip.item`           | Context menu action                              | —                                                                                                                                                                                            |
| `datagrid.header.cell.contextMenu.tooltip.item.icon`      | Action icon                                      | —                                                                                                                                                                                            |
| `datagrid.header.cell.contextMenu.tooltip.item.separator` | Menu separator line                              | —                                                                                                                                                                                            |
| `datagrid.header.cell.resizer`                            | Column resize handle                             | —                                                                                                                                                                                            |
| `datagrid.body`                                           | Body grid container (virtualized rows)           | —                                                                                                                                                                                            |
| `datagrid.body.cell`                                      | Body cell                                        | `isPinned`, `isFirstLeftPinned`, `isLastLeftPinned`, `isFirstRightPinned`, `isLastRightPinned`, `isRowNumber`, `isRowSelection`, `isRowSelected`, `isFirstLeaf`, `isLastLeaf`, `isEmptyCell` |
| `datagrid.body.cell.text`                                 | Default cell text renderer                       | —                                                                                                                                                                                            |
| `datagrid.body.cell.rowDetail`                            | Row detail expand/collapse button                | —                                                                                                                                                                                            |
| `datagrid.body.row`                                       | Data row (display: contents)                     | —                                                                                                                                                                                            |
| `datagrid.body.groupRow`                                  | Group row (display: contents)                    | —                                                                                                                                                                                            |
| `datagrid.body.groupRow.expandButton`                     | Group expand/collapse button                     | —                                                                                                                                                                                            |
| `datagrid.body.detailRow`                                 | Expanded detail row                              | —                                                                                                                                                                                            |
| `datagrid.body.empty`                                     | Empty state container                            | —                                                                                                                                                                                            |
| `datagrid.emptyColumns`                                   | No columns selected placeholder                  | —                                                                                                                                                                                            |
| `datagrid.bottomBar`                                      | Bottom bar (row count, pagination)               | —                                                                                                                                                                                            |
| `datagrid.bottomBar.info`                                 | Status text ("Rows: ...", "Selected: ...")       | —                                                                                                                                                                                            |
| `datagrid.bottomBar.clearFilters`                         | "Clear filters" link                             | —                                                                                                                                                                                            |
| `datagrid.bottomBar.pagination`                           | Pagination controls wrapper                      | —                                                                                                                                                                                            |
| `datagrid.bottomBar.pagination.button`                    | Pagination nav button                            | —                                                                                                                                                                                            |
| `datagrid.bottomBar.pagination.info`                      | Page info text ("1 of 5")                        | —                                                                                                                                                                                            |

---

## Dropdown Component

```tsx
import Dropdown from '@box-kite/react/components/dropdown';
```

### Usage

```tsx
// Single selection (uncontrolled). `label` is not decoration — see Accessibility below.
<Dropdown<string> label="Fruit" defaultValue="apple" onChange={(value, values) => console.log(value)}>
  <Dropdown.Unselect>Pick a fruit...</Dropdown.Unselect>
  <Dropdown.Item value="apple">Apple</Dropdown.Item>
  <Dropdown.Item value="banana">Banana</Dropdown.Item>
</Dropdown>

// Controlled
<Dropdown<string> label="Fruit" value={fruit} onChange={(value) => setFruit(value!)}>
  <Dropdown.Item value="apple">Apple</Dropdown.Item>
  <Dropdown.Item value="banana">Banana</Dropdown.Item>
</Dropdown>

// Multiple + search + checkboxes
<Dropdown<string> label="Fruit" multiple showCheckbox isSearchable searchPlaceholder="Search...">
  <Dropdown.SelectAll>Select all</Dropdown.SelectAll>
  <Dropdown.EmptyItem>No results</Dropdown.EmptyItem>
  <Dropdown.Display>{(values) => values.length === 0 ? 'Pick...' : `${values.length} selected`}</Dropdown.Display>
  <Dropdown.Item value="apple">Apple</Dropdown.Item>
  <Dropdown.Item value="banana">Banana</Dropdown.Item>
</Dropdown>

// Form integration: name prop renders hidden inputs with JSON-stringified values
<Dropdown<string> name="fruits" multiple defaultValue={['apple']}>...</Dropdown>
```

### Props

| Prop                     | Type                                                 | Description                                                               |
| ------------------------ | ---------------------------------------------------- | ------------------------------------------------------------------------- |
| `value` / `defaultValue` | `TVal \| TVal[]`                                     | Controlled / uncontrolled selected value(s)                               |
| `label`                  | `ReactNode`                                          | The control's name, rendered above it and wired with `aria-labelledby`    |
| `labelProps`             | `BoxProps<'div'>`                                    | Styles for the wrapper the label and the trigger share                    |
| `multiple`               | `boolean`                                            | Multi-select mode                                                         |
| `isSearchable`           | `boolean`                                            | Editable combobox: a text field that filters the list (see Accessibility) |
| `searchPlaceholder`      | `string`                                             | Search input placeholder                                                  |
| `hideIcon`               | `boolean`                                            | Hide chevron icon                                                         |
| `showCheckbox`           | `boolean`                                            | Show checkboxes in multiple mode                                          |
| `name`                   | `string`                                             | Form field name (renders hidden `<input>` elements)                       |
| `onChange`               | `(value: TVal \| undefined, values: TVal[]) => void` | Selection callback                                                        |
| `itemsProps`             | `BoxStyleProps`                                      | Style overrides for the opened items container (`dropdown.items`)         |
| `iconProps`              | `BoxStyleProps`                                      | Style overrides for the chevron icon container (`dropdown.icon`)          |
| `variant`                | `ClassNameType`                                      | Propagates to root **and all child sub-components**                       |

Also accepts all `BoxProps` (styling props), which apply to the root element — a `<button>`, or the wrapper around the text field when `isSearchable`. Anything in `props` goes to the combobox itself: the button, or that field.

### Sub-Components

All sub-components accept BoxProps for per-instance style overrides.

| Sub-Component         | Purpose                                                                            |
| --------------------- | ---------------------------------------------------------------------------------- |
| `Dropdown.Item<TVal>` | Selectable option. Requires `value` prop                                           |
| `Dropdown.Unselect`   | Clear selection option (shown when items selected)                                 |
| `Dropdown.SelectAll`  | Select all (shown in `multiple` when not all selected)                             |
| `Dropdown.EmptyItem`  | Shown when search yields no results                                                |
| `Dropdown.Display`    | Custom display: static content or `(values: TVal[], isOpen: boolean) => ReactNode` |

### Accessibility

Dropdown is the APG **select-only combobox**, and it supplies the whole pattern — do not add roles by
hand (`props={{ role: 'combobox' }}` on the trigger and `role="option"` on items used to be the advice;
delete it). What you get:

- Trigger: `role="combobox"`, `aria-expanded`, `aria-controls`, `aria-activedescendant`. **DOM focus
  never leaves it** — the popup is navigated by naming the highlighted option, not by focusing it.
- Popup: `role="listbox"` (`aria-multiselectable` in `multiple` mode), rows `role="option"` with
  `aria-selected`. `Dropdown.Unselect` and `Dropdown.SelectAll` are options too, so the arrows reach them.
- Keyboard, closed: Down/Up/Enter/Space open (on the selection, else at an end), Home/End open at an end,
  a printable character opens at the first match. Open: arrows move, Home/End jump, typing searches,
  Enter/Space choose, Escape closes unchanged, Tab chooses then leaves, Alt+Up chooses and closes.
- `disabled` on a `Dropdown.Item` gets `aria-disabled`, is skipped by the arrows and ignores clicks.
- `showCheckbox` draws the boxes as decoration (`aria-hidden`): `aria-selected` on the option is the state,
  and a focusable input inside an option would be one widget nested in another.

**You still owe it a name.** A combobox is not named by its contents — the trigger's text is its _value_ —
so pass `label`, or your own `aria-label` / `aria-labelledby` through `props`. With neither, the control
has no accessible name at all.

```tsx
<Dropdown<string> label="Fruit">…</Dropdown>
<Dropdown<string> props={{ 'aria-label': 'Fruit' }}>…</Dropdown>
```

`isSearchable` switches patterns rather than decorating this one: the **editable combobox**. The search
`<input>` _is_ the combobox — `role="combobox"`, `aria-autocomplete="list"`, and whatever you pass in
`props` all land on it, so nothing focusable sits inside anything else focusable. The field shows the
selection as its value and the query while one is being typed; a custom `Dropdown.Display` keeps drawing
the selection instead, since arbitrary JSX cannot be a field's value. Its keyboard map differs: the
printable keys type (no typeahead — the visible field owns them), Space types a space, Home/End and the
left/right arrows move the caret and hand the highlight back to the field, only Down/Up reach the listbox,
Enter chooses the highlighted option, and Escape closes the listbox before a second Escape clears the
field. Filtering never moves the highlight onto a suggestion — that is the user's to do with an arrow.

### Style Customization

**Per-instance** — use `itemsProps`, `iconProps`, or BoxProps directly on sub-components:

```tsx
<Dropdown<string> itemsProps={{ width: 80, maxHeight: 50 }} iconProps={{ color: 'gray-400' }}>
  <Dropdown.Item value="a" bgColor="blue-50" fontWeight={600}>
    Highlighted
  </Dropdown.Item>
</Dropdown>
```

**Global** — override defaults via `Box.components()` (deep-merged):

```tsx
Box.components({
  dropdown: {
    styles: { borderRadius: 4, bgColor: 'gray-50' },
    children: {
      items: { styles: { shadow: 'large', borderRadius: 4 } },
      item: { styles: { borderRadius: 2, hover: { bgColor: 'blue-50' } } },
    },
  },
});
```

**Custom variants** — `variant` propagates to all children. Define matching variants on each child:

```tsx
Box.components({
  dropdown: {
    variants: { dense: { p: 1, fontSize: 12 } },
    children: {
      items: { variants: { dense: { maxHeight: 40, gap: 0 } } },
      item: { variants: { dense: { p: 1, lineHeight: 16 } } },
      unselect: { variants: { dense: { p: 1 } } },
      selectAll: { variants: { dense: { p: 1 } } },
      emptyItem: { variants: { dense: { p: 1 } } },
    },
  },
});
<Dropdown variant="dense">...</Dropdown>; // applies to root + all children
```

### Component Style Tree

| Component Name       | Description                     | Built-in Variants     |
| -------------------- | ------------------------------- | --------------------- |
| `dropdown`           | Root button trigger             | `compact`             |
| `dropdown.items`     | Opened items container (portal) | —                     |
| `dropdown.item`      | Selectable item                 | `compact`, `multiple` |
| `dropdown.unselect`  | Clear selection option          | `compact`             |
| `dropdown.selectAll` | Select all option               | `compact`             |
| `dropdown.emptyItem` | No results placeholder          | `compact`             |
| `dropdown.icon`      | Chevron arrow container         | —                     |

---

## Select Component

Data-driven dropdown — pass `data` + `def` instead of composing children. Wraps Dropdown internally, shares the same `dropdown.*` style tree.

```tsx
import Select from '@box-kite/react/components/select';

// Basic — `label` names the combobox, same as on Dropdown
<Select<User, number> label="User" data={users} def={{ valueKey: 'id', displayKey: 'name', placeholder: 'Pick...' }}
  value={selected} onChange={(value) => setSelected(value!)} />

// Multiple + search + custom display
<Select<User, number> label="Users" data={users} multiple showCheckbox isSearchable searchPlaceholder="Search..."
  def={{
    valueKey: 'id', displayKey: 'name', placeholder: 'Pick users...',
    selectAllText: 'Select all', emptyText: 'No results',
    display: (user) => `${user.name} — ${user.role}`,
    selectedDisplay: (rows) => `${rows.length} selected`,
  }} />
```

### SelectDef

| Prop              | Type                                           | Description                                            |
| ----------------- | ---------------------------------------------- | ------------------------------------------------------ |
| `valueKey`        | `keyof TRow`                                   | Required — field used as option value                  |
| `displayKey`      | `keyof TRow`                                   | Field to display (defaults to valueKey)                |
| `display`         | `(row: TRow) => ReactNode`                     | Custom render per item                                 |
| `selectedDisplay` | `(rows: TRow[], isOpen: boolean) => ReactNode` | Custom trigger display (receives resolved row objects) |
| `placeholder`     | `string`                                       | Unselect/placeholder text                              |
| `selectAllText`   | `string`                                       | Select all option text (multiple mode)                 |
| `emptyText`       | `string`                                       | Empty search results text                              |

Also accepts: `data` (TRow[]), `value`/`defaultValue`, `label`/`labelProps`, `multiple`, `isSearchable`, `searchPlaceholder`, `showCheckbox`, `hideIcon`, `name`, `onChange`, `itemsProps`, `iconProps`, `variant`, and all BoxProps. Same styling, variants and combobox accessibility as Dropdown — including owing it a name, and including `isSearchable` switching it to the editable combobox.

---

## Debugging Tips

1. **Inspect styles**: `<style id="box-kite-styles">` in document head
2. **Class names**: Elements get classes like `_b`, `_2a`, etc.
3. **CSS variables**: In `:root` rules
4. **Theme issues**: Ensure `<Box.Theme>` wraps your app
5. **Portal theming**: Tooltips/dropdowns use `#box-kite-portal` container
