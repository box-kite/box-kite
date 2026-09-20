# @box-kite/mcp

The [Box Kite](https://www.box-kite.dev) MCP server: the retrieval channel for an agent writing Box
Kite code. Six tools, at capability level — what may I write, what does this component take, and the
one no documentation mirror can answer: **does this value actually work.**

```bash
npx @box-kite/mcp
```

No key, no network, no state. Everything it answers with was built into it from the library's own
repository at the version you install, including the styling engine itself.

## Install

**Claude Code**

```bash
claude mcp add box-kite -- npx -y @box-kite/mcp
```

**Cursor, VS Code, Codex, Zed** — anything that speaks stdio:

```json
{
  "mcpServers": {
    "box-kite": { "command": "npx", "args": ["-y", "@box-kite/mcp"] }
  }
}
```

## The tools

| tool            | what it answers                                                                                                                                   |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `search_docs`   | The prop, component, nesting key or rule for what you are trying to build — ranked across all four, so a goal finds the answer without its name.  |
| `get_props`     | A style prop's whole record: the CSS it writes, every value it accepts, a measured example, and for a numeric prop its scale measured at 1/2/4/8. |
| `get_component` | One component's contract: props and defaults, sub-parts, the keyboard map and the ARIA it writes.                                                 |
| `check_styles`  | A prop bag through the real engine: the CSS each prop writes, or why it wrote none.                                                               |
| `get_rules`     | The rules the library is written by, as an index or in full.                                                                                      |
| `get_blocks`    | Whole sections the `shadcn` CLI installs — a data-grid page, a settings form, a dashboard shell.                                                  |

## Why `check_styles` exists

Box Kite accepts a closed set of values per prop, and **a value it does not accept produces no rule
and no class name** — silently, by design, because a typo must not emit a broken declaration. That is
the right behaviour and it is invisible, so the only honest way to answer "does `bgColor="blue-550"`
work" is to hand it to the engine:

```
check_styles { "props": { "p": 4, "bgColor": "blue-550", "fontSize": 14, "href": "/about" } }

✅ `p` → `.p-4{padding:1rem}`
❌ `bgColor` does not accept "blue-550" — no rule and no class name were written.
✅ `fontSize` → `.fontSize-14{font-size:0.875rem}`
⚠️ `href` an HTML attribute, not a style prop. It goes in `props={{ "href": … }}`.
```

The dividers differ per prop — spacing is ÷4, `fontSize` is ÷16, border width is direct px — which is
why `get_props` measures a scale rather than describing one.

## What else the library ships for agents

- `AGENTS.md` and `docs/` inside the published `@box-kite/react` package
- The skill and rules file: `npx skills add box-kite/box-kite`
- Every documentation page as markdown at `https://www.box-kite.dev/<route>.md`, indexed by
  [llms.txt](https://www.box-kite.dev/llms.txt)

MIT © Box Kite
