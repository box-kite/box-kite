---
name: box-kite
description: "@box-kite/react (Box Kite) expert — the runtime CSS-in-JS library whose Box component takes CSS properties as typed props and writes the CSS itself. Use for any work with Box props, the Flex/Grid/Button/Textbox/Dropdown/DataGrid components, themes, Box.extend() or Box.components() — and read it before writing props, because the prop names collide with Tailwind's and Chakra's while the numbers mean different things. Also covers installing and updating the package."
license: MIT
---

# @box-kite/react

Runtime CSS-in-JS. `Box` takes CSS properties as typed props and generates the CSS for them at runtime — no stylesheet, no class name to invent, and two elements written with the same value share one class.

## This library is not in your training data

It was renamed at 1.0.0 (September 2026) and its prop surface nearly doubled on the way, so a plausible-looking memory of it is a memory of a different library. Four facts first, because each one is silently wrong in the APIs this most resembles:

- **The dividers are per prop.** Spacing is ÷4 (`p={4}` is 1rem), `fontSize` is ÷16 (`fontSize={14}` is 14px), `borderRadius` is ÷4, and border width and `lineHeight` are direct px (`b={1}` is 1px).
- **There is no `style` attribute.** Every visual value is a prop; the one-off nothing has a prop for is `css={{ … }}`, which still compiles to a shared class.
- **The element comes from the component, not from `tag`.** `<Flex>`, `<Button>`, `<H1>`, `<Ul>`, `<Path>` — `<Box tag="…">` is the fallback, not the idiom.
- **HTML attributes go in `props`.** `<Link props={{ href: '/about' }}>`; an `href` written at the top level typechecks and is then dropped.

## The numbers, measured

The divider is per prop, so the same number is a different length depending on which prop it is written on — `p={4}` is 16px and `b={4}` is 4px. Every row here is what the engine emitted for that example, not what a doc claims about it:

| Prop                | Which props                                                | Written                    | Emitted                                  |
| ------------------- | ---------------------------------------------------------- | -------------------------- | ---------------------------------------- |
| `p`                 | spacing — `p`/`m`/`gap`/`px`/`py`/`pt`… all of them        | `p={4}`                    | `padding: 1rem`                          |
| `width`             | sizing — `width`/`height` and the four `min`/`max` props   | `width={4}`                | `width: 1rem`                            |
| `borderRadius`      | the corner radius, on the spacing scale                    | `borderRadius={4}`         | `border-radius: 1rem`                    |
| `b`                 | border width — `b`/`bx`/`by`/`bt`/`bs`…                    | `b={4}`                    | `border-width: 4px`                      |
| `fontSize`          | the one that is ÷16                                        | `fontSize={14}`            | `font-size: 0.875rem`                    |
| `lineHeight`        | and `letterSpacing`                                        | `lineHeight={24}`          | `line-height: 24px`                      |
| `strokeWidth`       | SVG lengths — and the geometry props `cx`/`cy`/`r`/`x`/`y` | `strokeWidth={4}`          | `--boxStrokeWidth: 4px; stroke-width: 4` |
| `animationDuration` | every animation and transition time                        | `animationDuration={1100}` | `animation-duration: 1100ms`             |

## Read this next

| Read                                                                                      | When the question is                                                                   |
| ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| [`references/styling.md`](references/styling.md) — Styling reference                      | writing props: the categories, the six kinds of nesting, the theme                     |
| [`references/components.md`](references/components.md) — Components reference             | choosing a component, or wiring a Dropdown, a Select or a DataGrid                     |
| [`references/extending.md`](references/extending.md) — Extending Box                      | a value used twice, or a prop that does not exist yet                                  |
| [`references/patterns.md`](references/patterns.md) — Patterns and the rest of the surface | server rendering, the behaviour hooks, portals, form controls, the tooltip             |
| [`references/rules.md`](references/rules.md) — The rules, in full                         | one of the rules below in depth: the reasons, the measurements and the traps behind it |
| `node_modules/@box-kite/react/docs/props.md`                                              | one prop exactly: every one, the CSS each writes, one measured example                 |
| `node_modules/@box-kite/react/BOX_KITE_AI_CONTEXT.md`                                     | the long-form reference, when a reference above is not enough                          |

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
- `@box-kite/react/components/dataGrid#onSelectionChange` — `onSelectedRowKeysChange` is the selection itself, with the `action` as a named reason — the spelling every component reports a change under.
- `@box-kite/react/components/dataGrid#onPageChange` — `onPaginationChange` reports both pager values with a reason, which is what says whether the page changed because the user navigated or because a filter reset it.
- `@box-kite/react/components/dataGrid#onPageSizeChange` — `onPaginationChange` covers it: a new page size always returns to page 1, so the two were never separate changes.
- `@box-kite/react/components/dataGrid#onSortChange` — `onSortingChange` reports the sort as one value with a reason beside it.
- `@box-kite/react/components/dropdown#onChange` — `onValueChange` is what every component reports a value change under, and it carries the reason — which is the thing a `(value, values)` pair cannot say.
- `@box-kite/react/components/radioGroup#onChange` — `onValueChange` is what every other component reports a value change under, and a group is not an `<input>` — this spelling still works and means the same thing.
- `@box-kite/react/components/select#onChange` — `onValueChange` is what every component reports a value change under, and it carries the reason.
- `@box-kite/react/components/semantics` — `MenuList` is this element now.

## The rules

Each rule is what to write and the trap to avoid. The reasons, measurements and edge cases behind rule N are under the same number in the skill's `references/rules.md`.

1. **NEVER use `style={{ }}`** — every visual value is a Box prop. A missing one is `Box.extend()`; a one-off is `css={{ }}` (rule 26).
2. **NEVER `<Box tag="...">`** for common elements — use `<Button>`, `<Link>`, `<H1>`, `<P>`, `<Ul>`/`<Li>`, `<Nav>`, `<Flex>`, `<Grid>`, and for SVG `<Svg>`, `<Path>`, `<Circle>`, `<Rect>`, `<SvgText>`… from `components/svg`. A component is its entry's **default** export (`import Button from '@box-kite/react/components/button'`); families are named (`{ H1, P }` from `semantics`, `{ Path }` from `svg`, `{ Sparkline }` from `chart`, `{ AlertDialog }` from `dialog`, `{ toast }` from `toaster`).
3. **An icon from lucide/Tabler/react-icons goes in `<Icon>`** (`components/icon`): `<Icon size={5} color="amber-500"><Sun /></Icon>`. `size` is the ÷4 scale; no `label` means `aria-hidden`. SVG you draw yourself is `<Svg>`. Other sets come through the same `<Icon>` (`unplugin-icons`, `@iconify/react`).
4. **NEVER `<Box display="flex/grid">`** — use `<Flex>` / `<Grid>`. `d` is `flex-direction` (`d="column"`), not `display`.
5. **fontSize divider is 16** (not 4): `fontSize={14}` → 14px.
6. **Spacing divider is 4**: `p={4}` → 16px (1rem).
7. **Border width and lineHeight are direct px**: `b={1}` → 1px, `lineHeight={24}` → 24px. **borderRadius uses divider 4**: `borderRadius={2}` → 8px.
8. **A paint reference is a value, not an attribute**: `fill="url(#sky)"`, `stroke="var(--chart-1)"`, `clipPath="url(#frame)"`. A dashboard shape is `components/chart`: `<Sparkline>`, `<ProgressRing>`, `<Gauge>`, `<MiniDonut>`.
9. **A CSS variable is a prop**: `vars={{ 'color-revenue': 'sky-500' }}` declares `--color-revenue` for the subtree. A third-party chart goes in `<ChartContainer series={['revenue', 'cost']}>` and reads `var(--color-revenue)`; `series` also takes a record of paints.
10. **SVG lengths have no divider**: `strokeWidth={2}` → `stroke-width: 2`; `cx`/`cy`/`r`/`rx`/`ry`/`x`/`y` write px (user units). On `<Rect>`, `width`/`height` are the SVG attributes; on `<Path>`, `d` is path data.
11. **HTML attributes go in `props`**: `<Link props={{ href: '/about' }}>`, not `<Link href>` — at the top level they typecheck and are dropped. The form controls take their own directly: `<Button type="submit" onClick={…}>`, `<Textbox name="email" type="email" value onChange>`, `<Checkbox name defaultChecked onChange>`.
12. **Size shortcuts**: `width="fit"` = 100%, `width="fit-screen"` = 100vw, `width="1/2"` = 50%.
13. **An animation is a prop**: `animation="spin|pulse|bounce|ping"`, or your own with `Box.keyframes()`. Times are ms (`transitionDuration={150}`). `transition` takes a group (`colors`, `transform`, `opacity`, `shadow`, `size`, `filter`). `translateX`/`translateY`/`rotate`/`scale` compose. A spring names both props: `transitionTimingFunction="spring-bouncy"` + `transitionDuration="spring-bouncy"`, or `Box.spring()`.
14. **An entrance is `startingStyle`**: `startingStyle={{ opacity: 0, translateY: 2 }}` (plain props; nest a breakpoint or theme around it). For an exit, hide with `display` + `transitionBehavior="allow-discrete"`, or hold the node with `<Presence present>` (`components/presence`), putting its `ref` on the element that transitions. `interpolateSize="allow-keywords"` animates `height: auto`.
15. **`data-*` and `aria-*` go in `props`**: `props={{ 'data-state': 'open' }}`. At the top level they are dropped.
16. **Style a state your code sets with nested props**: `dataAttr={{ 'state=open': { … } }}`, `ariaAttr={{ selected: { … } }}`, `has={{ ':checked': { … } }}`, `not={{ hover: { … } }}`, `nth={{ odd: { … } }}`. The attribute itself still goes in `props`; a key the grammar rejects drops its block.
17. **A pseudo-element is a nested prop, one per rule**: `before`/`after` (with `content: ''` added), `placeholder`, `selection`, `marker`, `firstLine`, `firstLetter`, `backdrop`, `fileButton`. `content="New"` is quoted for you. Put `marker`/`selection` on the `<Ul>`/`<P>`. On `Textbox`/`Textarea` an object `placeholder` is styles; the text goes in `props`.
18. **Forced colors keep only system colours**: `forcedColors={{ bgColor: 'ButtonFace', color: 'ButtonText' }}` (also `Canvas`, `CanvasText`, `Highlight`, `HighlightText`, `GrayText`, `LinkText`). A state shown by fill alone needs them.
19. **A component sized by its own space uses `cq`, not a breakpoint**: `container` on the parent, `cq={{ md: { d: 'row' } }}` → `@container (min-width: 28rem)`. Sizes `xs` (20rem) to `xxl` (42rem), `maxMd` is the complement, `'sidebar/md'` names a container. `cq` and a breakpoint do not nest.
20. **An opacity is part of the colour**: `bgColor="blue-500/40"` on every colour prop and in `vars` — not `opacity`, which fades the element and its children. The palette is Tailwind 4.3's OKLCH families, `50`–`950`; an unknown token or a percentage over 100 writes nothing.
21. **A gradient is a record, and shadows stack**: `bgGradient={{ linear: 'r', colors: ['blue-500', 'pink-500'] }}` (or `radial`, `conic`; `interpolate="oklch"`); one bad stop or key writes nothing. `shadow` (`xxs`…`xxl`), `insetShadow`, `ring` and `insetRing` (px) are four layers that coexist, each with its own colour prop. `textShadow` + `textShadowColor` for text.
22. **Filters stack, and a mask is a gradient**: `blur`, `brightness`, `contrast`, `grayscale`, `hueRotate`, `invert`, `saturate`, `sepia`, `dropShadow` — each number is that function's unit (`brightness={110}` is %, `hueRotate={90}` degrees, `blur={3}` px or `xs`…`xxxl`). `backdrop*` are the same behind the element. `maskImage` takes the `bgGradient` record. Gradient text is `bgClip="text"` + `color="transparent"`.
23. **Alignment can be overflow-safe, and a ratio is a value**: every alignment prop takes `'safe center'`. `aspectRatio` is `'square'`, `'video'`, `'4/3'` or a number (`'4:3'` writes nothing). `insetX`/`insetY` and every inset take `'auto'` and fractions. Native controls: `accentColor`, `caretColor`, `colorScheme`, `fieldSizing="content"`, `scrollbarGutter="stable"`. `willChange` only on the few elements that move.
24. **Another element's state is `group` or `peer`**: `group={{ 'card/hover': { … } }}` → `.card:hover .x`; `peer={{ 'agree/checked': { … } }}` → `.agree:checked ~ .x`; the ancestor or sibling carries the name in `className`. Also state props: `open`, `placeholderShown`, `autofill`, `inRange`/`outOfRange`, `target`, `inert`, `visited` (colours only), and media keys `pointerCoarse`/`pointerFine`.
25. **Sides are logical, and direction is a state**: `ps`/`pe`, `ms`/`me`, `bs`/`be`, `insetStart`/`insetEnd`, `borderRadiusStart`/`borderRadiusEnd` and the logical corners (block axis first); `textAlign="start"`. For what cannot be logical, `rtl={{ flip: 'xAxis' }}` → `:dir(rtl)`. The `dir` attribute goes in `props`.
26. **A one-off property is `css`, and it is still a class**: `css={{ mixBlendMode: 'multiply', WebkitLineClamp: 2 }}` — camelCase, typed, lengths with units (`width: '100px'`), colour tokens resolve. It nests anywhere a prop does and wins over a typed prop. Prefer a typed prop, then `Box.extend()`.
27. **A floating layer is anchored in CSS**: `anchorName="trigger"`; on the layer `position="absolute"` + `positionAnchor="trigger"` + `positionArea="block-end span-all"` (block axis first, one keyword family). `positionTryFallbacks="flip-block"` flips, `positionVisibility="anchors-visible"` hides. A layer wider than its anchor needs `span-all`, or no flip fits. Portable path: rule 28.
28. **`useAnchorPosition` writes the placement**: `const { anchorProps, layerProps } = useAnchorPosition({ side: 'bottom', align: 'start', offset: 2, matchWidth: true })` from `@box-kite/react/anchor`. Sizing props take `anchor-size(width)`, insets `anchor(bottom)`. A gap is `offset`, not a margin. `Overlay`, `Tooltip` and `Dropdown` take the same `side`/`align`/`offset`/`flip`.
29. **A panel with content is `<Popover>`**: `<Popover label="Filters" trigger={(t) => <Button {...t}>Filters</Button>}>…</Popover>` — the children are the panel, in the top layer, with the browser's light dismiss and focus return. The trigger must be a button, and never add an `onClick` toggle of your own. The panel is always rendered: gate heavy children on `open`; its exit is CSS, never `<Presence>`.
30. **Every floating layer is in the top layer, not portalled**: `Overlay`, `Tooltip`, `Dropdown` and the DataGrid menu inherit the theme, variables and direction where they are declared. NEVER declare a layer inside its trigger — put it beside it. A layer left open while the page scrolls keeps its side.
31. **A modal is `<Dialog>`**: `<Dialog trigger={(t) => <Button {...t}>Rename</Button>}><Dialog.Title>…</Dialog.Title>…</Dialog>` — `showModal()` supplies the backdrop, the inert page, Escape and focus. `Dialog.Title` (or `label`) names it. `<AlertDialog>` is a decision: no outside-press close, `initialFocus` on the least destructive action. `dismissible={false}` makes it unavoidable; the exit is CSS, never `<Presence>`.
32. **A menu button is `<Menu>`**: `Menu.Item onSelect`, `Menu.CheckboxItem`, `Menu.RadioGroup` + `Menu.RadioItem`, `Menu.Group label`, `Menu.Separator`, `Menu.Sub label`. A disabled item stays focusable. A command closes the menu, a checkbox or radio item does not (`closeOnSelect` swaps it). The semantic `<menu>` element is `MenuList` from `components/semantics`.
33. **Tabs are `<Tabs>`**: `<Tabs defaultValue="a"><Tabs.List label="Project"><Tabs.Tab value="a">…</Tabs.Tab></Tabs.List><Tabs.Panel value="a">…</Tabs.Panel></Tabs>`. Selection follows focus (`activation="manual"` splits them), and the list is one tab stop. Only the selected panel renders unless `keepMounted`. `indicator="sliding"` and `Tabs.Panels` animate. Style a selected tab with `ariaAttr={{ selected: … }}`.
34. **An accordion is `<Accordion>`; one disclosure is `Collapsible`** (same module): `<Accordion defaultValue={['a']}><Accordion.Item value="a"><Accordion.Trigger>…</Accordion.Trigger><Accordion.Panel>…</Accordion.Panel></Accordion.Item></Accordion>`. `multiple` allows several open; `level` is the heading level (default 3). Closed panels stay rendered, so gate heavy children yourself. Pad the panel, never `accordion.clip`.
35. **A slider is `<Slider>`, a bar is `<Progress>`**: `<Slider label="Volume" defaultValue={40} />`; an array value is a range, named with `thumbLabels`. `name` posts the value in a form. `onValueChange` fires per step, `onValueCommit` once. `<Progress label="Upload" value={62} />` renders on a server; no `value` means indeterminate.
36. **A message you send is `<Toaster />` + `toast()`**: mount `<Toaster />` once, then `toast.success('Saved')` from anywhere, even before it mounts. `toast.promise(p, { loading, success, error })`, `toast.update(id, …)`, `toast.dismiss(id?)`; options `description`, one `action`, `duration` (ms, `Infinity` waits), `onDismiss`. Past `limit` toasts queue.
37. **A DataGrid cell is edited with `column.editable` + `def.onCellEdit`**: `onCellEdit` validates — return nothing to accept, a string or `false` to refuse, or a promise. The editor follows the value or `column.editor` (`text`/`number`/`checkbox`/`select`/`date`/`time`/`datetime`); `column.EditCell` is your own. Accepted edits sit over `data` and arrive in `onCellEditsChange`; `clearEdits()` on the ref. An edit never re-sorts.
38. **A DataGrid range is `def.rangeSelection`**: drag or Shift+arrows mark a block, and Ctrl+C copies tab-separated text (one cell needs no opt-in). `onRangeChange(range, { reason })`. A copy uses `exportValue` and accepted edits. Styling: `isCurrentCell`, `isInRange`.
39. **A DataGrid paste is Ctrl+V through `onCellEdit`**: it fills from the current cell or block, tiling or spilling, and judges each cell separately — a refused cell is skipped and ringed. `onPaste({ range, applied, rejected, skipped })` reports the whole block. An unchanged value is not an edit.
40. **A UI a model writes is `catalog()` + `<SpecRenderer>`**: `catalog()` (`@box-kite/react/catalog`) is every component and value as JSON Schema; `specSchema(registry)` is what a model generates under (import it from `/catalog` in a route handler). `createSpecRegistry({ catalog, components })` is the allow-list; `<SpecRenderer spec registry data onAction onIssues />` renders. A node is `{ type, props, children, slots, on, repeat }`; `{ $data }`/`{ $item }`/`{ $index }` read `data`. Generate controlled props (`value`, `layout`), never `default…`.
41. **A dashboard people rearrange is `<DashboardGrid>` + `<Widget>`**: `layout` is `{ version, columns, items: [{ id, x, y, w, h }] }` with `onLayoutChange`/`onLayoutCommit` and `editable`. `columns` is a count per container size, and only the widest arrangement is editable. A `Widget` has `loading`/`error`/`empty` states and a `title` heading. `DashboardUtils.SCHEMA` and `parse()` read a stored or generated layout. Row height: `vars={{ 'dashboard-row': '8rem' }}`.
42. **A theme is an ancestor, and the nearest one owns the subtree**: `theme={{ dark: { bgColor: 'slate-900' } }}` nests anything. `<Box.Theme use="global">` themes `<html>`, `use="local"` a wrapper; `Box.useTheme()` reads and sets it. A hand-written theme class needs `data-theme` beside it.
43. **An agent's turn is `<ToolCallCard>`, `<ApprovalCard>` and `<Reasoning>`** (`components/agent`): `status` is `pending`/`running`/`success`/`error`; `onDecisionChange(decision, { reason })` answers an approval; `Reasoning` is closed by default (`open={streaming}` follows the stream). Values are formatted and capped, not trusted.
44. **Streamed text is `<StreamingText>`, `markdownComponents` and `<Skeleton>`**: pass `text` the whole message so far each render, never the delta. `markdownComponents` (`components/markdown`) is a constant map for react-markdown/Streamdown — override by spreading it at module scope, never inside render. `<Skeleton lines={3} />` is `aria-hidden` unless one `label` names the region.
45. **A runtime's tool calls are `toolPart()`, and A2UI is `a2uiToSpec()`** (`@box-kite/react/interop`, which imports no runtime): `toolPart` reads AI SDK, assistant-ui or CopilotKit parts; `applyToolEvent` folds AG-UI events; `a2uiApply` → `a2uiSurface` → `a2uiToSpec` renders A2UI; `a2uiCatalog(catalog())` goes the other way. Lift one component's schema with `a2uiComponentSchema(document, name)`, or its `$ref`s break.
46. **A scroll-driven animation is a timeline prop**: `animationTimeline="scroll()"` or `"view()"`; across elements, `scrollTimeline`/`viewTimeline` + `timelineScope`. `animationRange="entry 0% entry 50%"`. Always add `motionReduce={{ animation: 'none' }}` — it does not stop itself — and make the end state the resting state. Never put `animation` inside `css`: it resets the timeline.
47. **A view transition is `Box.viewTransition()` + `viewTransitionName`**: in React flush the update, `Box.viewTransition(() => flushSync(() => setTheme('dark')))`, or use `<Box.Theme viewTransition>`. A name must be unique while it runs, so a per-item name goes in `props={{ style: { viewTransitionName: id } }}`. Reduced motion skips it by default.
48. **In development, read the console**: a `[box-kite]` warning names what rendered and the line to write — a value no prop takes (with the nearest match), an HTML attribute at the top level, or a number in an unlikely unit (`fontSize={4}`, `lineHeight={1.5}`, `transitionDuration={0.3}`). `Box.configure({ warnings: false })` silences it; `check_styles` in `@box-kite/mcp` checks before rendering.
49. **A design for one subtree is `Box.createComponents()`**, not `Box.components()` (app-wide, merges): `const aurora = Box.createComponents({ … })` at module scope, then `<Box.Components value={aurora}>` or `<Box.Theme use="local" components={aurora}>`. Props still beat the design; a Server Component cannot read it.
50. **A list to read and pick from is `<List>`**: `List.Item` holds `List.Media`, `List.Content` (rows of `List.Title`, `List.Meta`, `List.Description`) and `List.End`. One `List.Action` in the title covers the row (`props={{ href }}` makes it a link); the item's own controls go in `List.Actions`. `variant="plain|card|separated"`, tuned with `vars`. Arrow-key selection is `Combobox`/`Select`, not `List`.
51. **On a phone a DataGrid is a list**: below `def.list.breakpoint` (576px of the grid's own width) rows render as `List` items, and `column.list` places a column (`title`, `kicker`, `subtitle`, `end`, `field`, `detail`, `hidden`). `layout: 'table'` or `'list'` forces one. No `overflow: hidden`/`auto` ancestor (`css={{ overflow: 'clip' }}` instead). In a test, `await loadListLayout()` first.
52. **Swiping, reordering and windowing are `SwipeItem`, `SortableList` and `VirtualList`**: `<SwipeItem endActions={…} fullSwipe>` (keep the commands pressable elsewhere too); `<SortableList onOrderChange>` — the app owns the order; `<VirtualList items itemKey>{(row) => <List.Item>…</List.Item>}</VirtualList>` returns exactly one `<li>` per item. Reorder short lists, window long ones.
53. **A date is an ISO string whose shape is its kind**: `2026-10-19` a date, `14:30:00` a time, `2026-10-19T14:30:00` a wall clock, `…Z`/`…+03:00` an instant — never hold a `Date`. `@box-kite/react/date` has `toUtc`, `toLocal`, `toZone`, `toPlainDate`, `format`, `parse`, `add`. `DateField`, `Calendar`, `DatePicker`/`DateRangePicker`, `TimeZoneSelect` and `DateTime` take and give that string; on a server, set the zone with `<DateProvider timeZone>` or `configureDates()`.
54. **A design is two families and a `Box.components()` object**: built-ins are drawn in `accent` and `base`, so `vars={Box.palette({ accent: 'orange', base: 'stone' })}` recolours a subtree; write `accent-*`/`base-*` in your own components to follow it. `Box.components(styles, { design: 'ember' })` + `<Box.Theme design="ember">` / `Box.useDesign()` switch designs. A design removes a style with that prop's `none` (`bgGradient: 'none'`, never `bgImage`).
55. **Sizes are `compact`, `normal` and `large`, set by two variables**: `variant="compact"` on any control sizes it and everything inside. Define the three once: `vars={Box.sizes({ compact: 8, normal: 9, large: 11 })}`. Never size one control by hand (`height={9}`); your own control uses `height="control"` + `fontSize="control"`. An icon button is `variant="square"` with an `aria-label` in `props`.
56. **An SVG shape turns about the viewBox's corner**: `<G rotate={45} transformBox="fill-box" transformOrigin="center">`. `pointerEvents="visibleStroke"` makes an edge's stroke its hit area; `touchAction="none"` keeps a drag from panning the page.

Full reference: `references/rules.md` beside this file for any rule in depth, the rest of `references/`, and `docs/props.md` inside the package.
