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
- removes the template's own `App.css` and logos.

`src/design.tsx` and `src/App.tsx` are ordinary files in your project, so change them as you like.

## Options

| Option                               | What it does                                                            |
| ------------------------------------ | ----------------------------------------------------------------------- |
| `-d, --design NAME`                  | `classic`, `ember`, `azure` or `mono`. Asks when it is not given.       |
| `-t, --template NAME`                | `react-ts` (default), `react-compiler-ts`, `react` or `react-compiler`. |
| `--no-install`                       | Writes the files and skips the install.                                 |
| `--overwrite`                        | Empties the directory first when it has files in it.                    |
| `--eslint`                           | Uses ESLint instead of Oxlint, passed to create-vite.                   |
| `--interactive` / `--no-interactive` | Always ask, or never ask. By default it asks when run in a terminal.    |

With npm, options go after `--`. pnpm and yarn take them directly:

```sh
pnpm create @box-kite my-app --design azure
```

## The designs

- **Classic**: the components as Box Kite ships them, indigo on gray in the system font.
- **Ember**: warm paper, a vermilion accent and a serif (Fraunces) for headings.
- **Azure**: clear-sky blue on cool slate, frosted-glass layers and pill controls, with Sora for headings.
- **Mono**: ink `#16191e` on white in Roboto, with 1px edges and focus drawn as a second pixel.

You can see each of them on [box-kite.dev](https://box-kite.dev) with the **Theme** button in the header.

## Requirements

Node 22.12 or later, which is create-vite's own floor.
