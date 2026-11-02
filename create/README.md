# @box-kite/create

Start a Vite + React app with [Box Kite](https://box-kite.dev) and a design already in it.

```sh
npm create @box-kite@latest my-app -- --design mono
cd my-app
npm run dev
```

It runs Vite's own `create-vite`, then:

- adds `@box-kite/react` and the design's fonts to `package.json`, and installs them;
- writes the design to `src/design.tsx`: the palette, the page's colours and fonts, and every component's styles, in light and dark;
- wraps the app in it in `src/main.tsx`;
- replaces `src/App.tsx` with a sample page of buttons, fields, a dialog, tabs and a data grid;
- removes the template's own `App.css` and logos;
- writes `AGENTS.md`, `CLAUDE.md` and the MCP server's config for Claude Code, Cursor and VS Code, so a coding agent writes Box Kite right from its first prompt.

`src/design.tsx` and `src/App.tsx` are ordinary files in your project, so change them as you like.

## Options

| Option                               | What it does                                                            |
| ------------------------------------ | ----------------------------------------------------------------------- |
| `-d, --design NAME`                  | `classic`, `ember`, `azure` or `mono`. Asks when it is not given.       |
| `-t, --template NAME`                | `react-ts` (default), `react-compiler-ts`, `react` or `react-compiler`. |
| `--no-install`                       | Writes the files and skips the install.                                 |
| `--overwrite`                        | Empties the directory first when it has files in it.                    |
| `--eslint`                           | Uses ESLint instead of Oxlint, passed to create-vite.                   |
| `--no-agents`                        | Leaves out `AGENTS.md`, `CLAUDE.md` and the MCP server configs.         |
| `--agents-only`                      | Adds only those to an existing project, and creates no app.             |
| `--interactive` / `--no-interactive` | Always ask, or never ask. By default it asks when run in a terminal.    |

With npm, options go after `--`. pnpm and yarn take them directly:

```sh
pnpm create @box-kite my-app --design azure
```

## For your coding agent

Box Kite is newer than any model's training data, and its prop names collide with other libraries' while the numbers mean different things. So a new app comes with:

- **`AGENTS.md`**: the four facts a model gets wrong from memory, and a pointer to `node_modules/@box-kite/react/AGENTS.md`, the whole rules, which an upgrade keeps current. Codex, Cursor, Copilot, Windsurf, Cline and Zed read it on every run.
- **`CLAUDE.md`**: the one line `@AGENTS.md`, which is how Claude Code reads the same file.
- **The MCP server** (`npx -y @box-kite/mcp`) in `.mcp.json`, `.cursor/mcp.json` and `.vscode/mcp.json`. It runs the real styling engine, so an agent can check that a value works rather than guess. Each tool asks once before it starts a server from a project file.

For a project that already exists, run this in its root:

```sh
npm create @box-kite@latest -- --agents-only
```

It adds the block to your own `AGENTS.md` (and replaces it in place on a later run), the import to your `CLAUDE.md`, and the server beside the ones your MCP configs already list. It writes an editor's config only when that editor's folder is there, and leaves alone a config with comments in it, printing the entry to add by hand.

## The designs

- **Classic**: the components as Box Kite ships them, indigo on gray in the system font.
- **Ember**: warm paper, a vermilion accent and a serif (Fraunces) for headings.
- **Azure**: clear-sky blue on cool slate, frosted-glass layers and pill controls, with Sora for headings.
- **Mono**: ink `#16191e` on white in Roboto, with 1px edges and focus drawn as a second pixel.

You can see each of them on [box-kite.dev](https://box-kite.dev) with the **Theme** button in the header.

## Requirements

Node 22.12 or later, which is create-vite's own floor.
