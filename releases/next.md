# Box Kite next

_Unreleased. A PR that changes what a consumer sees adds its section here — see CONTRIBUTING.md, "Release notes"._

The package now carries instructions for the agent writing the code, the documentation site answers in markdown, and the same rules install as a skill in about forty-five coding agents — all of it generated from the sources the library is built from.

## Highlights

- **[The package tells an agent how to use it](#the-package-tells-an-agent-how-to-use-it)** — `AGENTS.md` and a `docs/` folder ship in the tarball, generated from the prop registry and the built chunks themselves.
- **[Every docs page is also markdown](#every-docs-page-is-also-markdown)** — append `.md` to any address, or start at `llms.txt`, which indexes all of them and states the four facts a model's priors get wrong.
- **[The rules install as a skill](#the-rules-install-as-a-skill)** — `npx skills add box-kite/box-kite` for about forty-five coding agents, a plugin marketplace for Claude Code, and a `.mdc` for Cursor.

## The package tells an agent how to use it

A coding agent has priors about a library this new, and they are wrong: the prop names collide with Tailwind's and Chakra's while the numbers mean something else, so the failure mode is code that compiles and is laid out wrong. The cheapest fix is a file in the tree it already greps, so the tarball carries one:

```shell
node_modules/@box-kite/react/
  AGENTS.md                the rules, and the block that argues with the model's priors
  docs/props.md            all 212 props, the CSS each writes, and one measured example
  docs/components.md       every component, its import, and whether it renders on a server
  docs/a11y.md             the behaviour hooks, for a pattern the library does not ship
  BOX_KITE_AI_CONTEXT.md   the long-form reference, as before
```

`AGENTS.md` is the file agents look for: Codex, Cursor, Copilot, VS Code, Windsurf, Cline and Zed read a root one natively, and Claude Code reads `CLAUDE.md`, so a file holding the one line `@AGENTS.md` points it at the same place.

```shell
cp node_modules/@box-kite/react/AGENTS.md ./AGENTS.md
```

None of it is written by hand. `docs/props.md` comes from the prop reference, where every example is measured from the CSS the engine emits rather than quoted from a doc; `docs/components.md` is read out of the built chunks' own exports; `AGENTS.md` inlines the rules file. The build fails if a generated file comes out empty, if a component no longer loads, or if the prop count disagrees with the registry.

## Every docs page is also markdown

The other half of the same problem: an agent that fetches a documentation page gets an HTML shell and a JavaScript bundle, and its usual answer is to guess instead. Every page on [box-kite.dev](https://www.box-kite.dev/) now answers in markdown at its own address with `.md` appended, and [llms.txt](https://www.box-kite.dev/llms.txt) is the index — one line per page, the four facts to read before writing any props, and the props and components that still work under an older name.

```shell
curl https://www.box-kite.dev/llms.txt      # the index: every page, and what each one covers
curl https://www.box-kite.dev/box.md        # any page, as markdown — append .md to the address
curl https://www.box-kite.dev/props.md      # every prop, the CSS it writes, one measured example
curl https://www.box-kite.dev/llms-full.txt # all of it in one file, for a tool that indexes a site
```

The pages are **converted from the rendered HTML during the build**, not written a second time: a mirror that can fall behind the page it mirrors is worse than none, because it is the copy an agent trusts. `props.md` is the same file the tarball carries as `docs/props.md`, from the same generator, and the facts in `llms.txt` are read out of `AGENTS.md` — so there is one statement of each of them in the repository. Both forms of the address work, `/box.md` and `/box/index.md`, and each page names the address it is a copy of.

Every page also links its own markdown at the foot of the page.

## The rules install as a skill

The third address for the same instructions, and the first one that is a command rather than a copy. Agent Skills are an open standard about forty-five coding agents read, so one `SKILL.md` reaches nearly all of them — and unlike a file copied into a repository, an install command brings the current one:

```shell
npx skills add box-kite/box-kite                # Claude Code, Cursor, Codex, Copilot, Gemini CLI, Zed…
npx skills add box-kite/box-kite -a cursor -g   # one agent, and globally
```

In Claude Code the repository is also a plugin marketplace, so the skill installs and updates with the plugin machinery:

```shell
/plugin marketplace add box-kite/box-kite
/plugin install box-kite@box-kite
```

Cursor takes the same rules as a rule file of its own, glob-attached to the files where props get written rather than loaded on every request:

```shell
mkdir -p .cursor/rules
cp node_modules/@box-kite/react/.cursor/rules/box-kite.mdc .cursor/rules/
curl -O https://www.box-kite.dev/box-kite.mdc   # or without the package installed
```

The skill is **shorter than the file it replaces and says more**. Its body is the four facts a model's priors get wrong, the twenty-six rules, a divider table measured from the engine — `p={4}` is `padding: 1rem` and `b={4}` is `border-width: 4px`, the same number twice — the deprecations, and a table of contents. The depth moved into four references it loads only when a question needs one: `styling.md` (every prop by category, the six kinds of nesting, the theme), `components.md` (which component replaces which `<Box tag>`, and the Dropdown, Select and DataGrid), `extending.md` (`Box.extend()` and `Box.components()`) and `patterns.md` (server rendering, the behaviour hooks, portals, form controls, the tooltip). A skill's body loads in full every time it is used, so what an agent pays for on a `p={4}` question dropped from 49 KB to 21 KB.

All three files are generated from the sources the library is built from — the rules file, the prop reference, the lead block of `AGENTS.md`, the `@deprecated` tags — and CI fails if one has been edited by hand instead of its source. The docs site serves the first two at [skill.md](https://www.box-kite.dev/skill.md) and [box-kite.mdc](https://www.box-kite.dev/box-kite.mdc), generated the same way, for an agent that can fetch a URL but not run a command; `llms.txt` lists both.

## Breaking changes

None.

## Fixes

<!-- One bullet per fix: **What was wrong.** What it does now. -->

- **Inline code in the prose of ten documentation pages was rendered as a block.** Each `<code>` took a line of its own, breaking the paragraph around it into stripes — the local helper was missing `display="inline"`, which is the trap the library's own rules warn about: a `Box` is `display: block` whatever element it renders. Nothing in the library changed; the pages read as paragraphs again. The same pages' tables also lost their last nine inline `style` attributes to `css={{ borderCollapse: 'collapse' }}`, which is what the escape hatch is for.
