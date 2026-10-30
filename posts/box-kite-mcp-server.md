# AI-written styles typecheck. Some still render nothing

_30 October 2026 · Use case_

Box Kite's MCP server runs your AI assistant's props through the real styling engine mid-task, and names each value that would render nothing. Below: the mistakes it catches, a worked session with every answer pasted from the server, and what it can't know about your project. It documents `@box-kite/mcp` 2.2.12.

## The problem

Three props an assistant wrote for a settings row, handed to the server:

```text
check_styles { "props": { "jc": "between", "fontSize": 4, "lineHeight": 1.5 } }

Some of these write no CSS, or CSS they almost certainly did not mean.

- ❌ `jc` does not accept "between" — no rule and no class name were written. It takes start, end, flex-start, flex-end, center, left, right, space-between, space-around, space-evenly, stretch, safe center, … (17 in all — call `get_props`).
- ⚠️ `fontSize` → `.fontSize-4{font-size:0.25rem}` — fontSize={4} is 4px text: fontSize's divider is 16, not the spacing scale's 4, so the number is the pixel size. For 16px write fontSize={16}.
- ⚠️ `lineHeight` → `.lineHeight-1\.5{line-height:1.5px}` — lineHeight={1.5} is a 1.5px line: lineHeight is direct pixels, not the unitless multiple CSS also takes. Write the pixels (lineHeight={24} is 24px), lineHeight="font-size" for a multiple of 1, or css={{ lineHeight: 1.5 }} for any other multiple.
…
```

And here is what those props draw:

![The three props as the engine draws them, each next to what was meant: the row stays bunched, the text is 4px, and the lines overlap.](https://www.box-kite.dev/img/blog/box-kite-mcp-server/silent-mistakes.png)

The two numbers typecheck, the build passes, and nothing fails loudly. In development the engine logs a `[box-kite]` warning once the component renders. A production build says nothing.

## Why a server and not a docs file

Box Kite's prop names look like the utility classes you already type, so an assistant brings its habits along. Three of them fail:

- **Each prop takes a closed set of values.** Anything else writes no rule and no class name, so a typo can't become a broken declaration.
- **Numbers mean different units per prop.** `p={4}` is 1rem (÷4), `fontSize={14}` is 14px (÷16), `b={1}` and `lineHeight={24}` are direct pixels.
- **HTML attributes go in `props`.** A top-level `href` or `data-*` typechecks and is then dropped.

The package ships a rules file, but an agent reads it once, at the start of a task. It can ask a server at the moment the question comes up. No document can answer "does this exact value work?" either. The server bundles the engine of its own release, and `check_styles` runs each prop on a fresh engine of its own.

![The four moments in a task when an agent asks the server, and the tool for each.](https://www.box-kite.dev/img/blog/box-kite-mcp-server/when-to-ask.png)

## Install

Node 22 or newer. No key, no network. In Claude Code:

```bash
claude mcp add box-kite -- npx -y @box-kite/mcp
```

Cursor, VS Code, Codex, Zed and any other stdio client:

```json
{
  "mcpServers": {
    "box-kite": { "command": "npx", "args": ["-y", "@box-kite/mcp"] }
  }
}
```

On connect, the server also hands the model the library's four core facts (the dividers, no `style`, the element comes from the component, attributes in `props`), plus "before believing a value, call `check_styles`".

## A settings panel, start to finish

**1. Find the component.**

```text
search_docs { "query": "toggle switch" }

- **Switch** (component) — The APG switch: an on/off control drawn as a track and a thumb.
…
```

**2. Read its contract.** `get_component` returns props, parts, keyboard map and ARIA. Two rows change the code:

```text
get_component { "name": "Switch", "include": ["props", "a11y"] }
…
| `label` | `React.ReactNode` | — | The text beside the switch, rendered inside a label that wraps the input. |
| `labelProps` | `BoxProps<'label'>` | — | Styles for the wrapping `<label>`: the row's layout, not the track's own appearance. |
…
```

So the row needs no `Flex` and `Span` of its own. The label names the switch and makes the whole row clickable.

**3. The first draft**, written from habit:

```tsx nocheck
import Flex from '@box-kite/react/components/flex';
import { H2, Span } from '@box-kite/react/components/semantics';
import Switch from '@box-kite/react/components/switch';

export function NotificationSettings() {
  return (
    <Flex d="column" p={6} rounded="xl" shadow="md" bgColor="white" color="gray-900" borderColor="gray-150">
      <H2 fontSize={5} fontWeight="semibold">
        Notifications
      </H2>
      <Flex jc="between" ai="center" py={3} borderBottom={1} data-setting="email">
        <Span lineHeight={1.5}>Email me about new comments</Span>
        <Switch name="comments" defaultChecked />
      </Flex>
    </Flex>
  );
}
```

**4. Check it**, one `check_styles` call per element. The verdicts, summarized:

| Draft                    | Verdict                            | Fix                                   |
| ------------------------ | ---------------------------------- | ------------------------------------- |
| `rounded="xl"`           | ❌ no prop of that name            | `borderRadius={3}`                    |
| `borderColor="gray-150"` | ❌ not a palette step              | `"gray-200"`                          |
| `fontSize={5}`           | ⚠️ 5px text                        | `fontSize={20}`                       |
| `fontWeight="semibold"`  | ❌ takes 100 to 900                | `fontWeight={600}`                    |
| `jc="between"`           | ❌ not accepted                    | `jc="space-between"`                  |
| `borderBottom={1}`       | ❌ no prop; suggests `borderColor` | `bb={1}`                              |
| `data-setting="email"`   | ⚠️ HTML attribute, dropped         | `props={{ 'data-setting': 'email' }}` |
| `lineHeight={1.5}`       | ⚠️ a 1.5px line                    | `lineHeight={20}`                     |

One of those answers, as the agent sees it:

```text
check_styles { "props": { "jc": "between", "ai": "center", "py": 3, "borderBottom": 1, "data-setting": "email" } }

Some of these write no CSS, or CSS they almost certainly did not mean.

- ❌ `jc` does not accept "between" — no rule and no class name were written. It takes start, end, flex-start, flex-end, center, left, right, space-between, space-around, space-evenly, stretch, safe center, … (17 in all — call `get_props`).
- ✅ `ai` → `.ai-center{align-items:center}`
- ✅ `py` → `.py-3{padding-block:0.75rem}`
- ❌ `borderBottom` no prop of that name. Try: `borderColor`.
- ⚠️ `data-setting` an HTML attribute, not a style prop. Written at the top level it typechecks and is then dropped — it goes in `props={{ "data-setting": … }}`.
…
```

TypeScript catches the ❌ rows, one error per element, so it takes a few rounds. It never catches the ⚠️ rows. Two fixes came from elsewhere: `search_docs` for "rounded corners" returns `borderRadius` first, but nothing led to `bb`. Once you know the name, `get_props` confirms that `bb={1}` writes `border-bottom-width:1px`.

**5. The second draft.** Every call now answers "Every prop writes CSS.":

![The first draft as the engine renders it, beside the version that passed check_styles.](https://www.box-kite.dev/img/blog/box-kite-mcp-server/before-after.png)

```tsx
import Flex from '@box-kite/react/components/flex';
import { H2 } from '@box-kite/react/components/semantics';
import Switch from '@box-kite/react/components/switch';

const row = {
  width: 'fit',
  d: 'row-reverse',
  jc: 'space-between',
  gap: 3,
  py: 3,
  bb: 1,
  borderColor: 'gray-200',
  fontSize: 14,
  lineHeight: 20,
} as const;

export function NotificationSettings() {
  return (
    <Flex d="column" p={6} borderRadius={3} shadow="md" bgColor="white" color="gray-900" b={1} borderColor="gray-200">
      <H2 fontSize={20} fontWeight={600} mb={2}>
        Notifications
      </H2>
      <Switch name="comments" defaultChecked label="Email me about new comments" labelProps={row} props={{ 'data-setting': 'email' }} />
      <Switch name="digest" label="Weekly digest" labelProps={row} props={{ 'data-setting': 'digest' }} />
    </Flex>
  );
}
```

`d: 'row-reverse'` puts the text first, because the label renders the input before it.

To skip the typing altogether, `get_blocks` has a ready settings panel: `get_blocks { "name": "settings-form" }` answers with `npx shadcn@latest add https://www.box-kite.dev/r/settings-form.json`.

## Field notes from a production app

From a team running the server on a real app, each checked against the source.

**Pin the server next to the library.** Each release builds `@box-kite/mcp` from the same commit, at the same version, with that release's engine inlined. `npx -y @box-kite/mcp` runs whatever version npx resolves, not the one in your lockfile. So the team installed it as a dev dependency at the library's version (`npm install -D @box-kite/mcp@2.2.12`) and pointed the project's `.mcp.json` at its bin:

```json
{
  "mcpServers": {
    "box-kite": { "command": "npx", "args": ["box-kite-mcp"] }
  }
}
```

**Your own tokens look wrong to it.** The app's colours came from `Box.extend()`:

```text
check_styles { "props": { "bgColor": "ui-primary/20", "borderColor": "ui-primary" } }

Some of these write no CSS, or CSS they almost certainly did not mean.

- ❌ `bgColor` does not accept "ui-primary/20" — no rule and no class name were written. It takes currentColor, transparent, green, red, blue, gray, black, white, vi, slate-50, slate-100, slate-200, … (326 in all — call `get_props`).
…
```

The server can't load your configuration. It reads no config file, environment variable or argument, so read its rejection of your own token as "unknown", not "wrong". What still works:

- Every other prop in the bag is judged on its own, so those verdicts stand.
- Your app's engine knows your tokens. With `Box.extend({ 'ui-primary': '#3355ff' }, {}, {})`, `bgColor="ui-primary/20"` renders with no warning, and the typo `ui-primry/20` gets a `[box-kite] … wrote no CSS` warning in development. For your own tokens, the console is the check.
- A design that only recolours the components can use `Box.palette()`. Its `accent-*` and `base-*` tokens are built in, and `check_styles` accepts them.

**`get_blocks` goes through the shadcn CLI.** The server installs nothing. The CLI copies a block's files into your project as code you own. That suits starting a new page, not editing an existing one. It needs a `components.json` (setup on the [registry page](https://www.box-kite.dev/registry)), and installed blocks don't update.

## The honest limits

- **Values, not layouts.** `jc="space-between"` passes whether or not the element is a flex container.
- **Not your project.** Your `Box.extend()` tokens and props and your `Box.components()` designs are invisible to it.
- **Keyword search.** "on/off toggle" didn't find `Switch`, and "border bottom" never found `bb`. Searching by the CSS property name works best.
- **Gaps in coverage.** `VisuallyHidden` and the SVG elements have no `get_component` entry, and the tool says so.
- **It can't make the agent ask.** Ask for `check_styles` in your prompt or your rules file.

## Try it

[Built for AI](https://www.box-kite.dev/ai-context) runs `check_styles` in your browser on the same engine, before you install anything. Then:

```bash
claude mcp add box-kite -- npx -y @box-kite/mcp
```
