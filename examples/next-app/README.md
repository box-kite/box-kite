# Box in a Server Component

A Next.js App Router app whose pages are **Server Components**: no `'use client'`, no provider, no
stylesheet to import. Every class in the HTML has its rule in the same response, because Box renders
each rule as a `<style href precedence>` element and React 19 hoists it into `<head>`.

```bash
npm run build            # in the repository root — the library itself
npm run build:next-app   # packs dist/, installs it here, runs `next build`
npm run smoke:next-app   # starts the production server and asserts on the HTML
npm run dev:next-app     # http://localhost:3010
```

The example depends on `@box-kite/react` as a **tarball built from `dist/`**
(`.local/box-kite.tgz`, produced by `npm run pack:local`), not on the source. That is the point: it
exercises the published `exports` map, so the `react-server` condition is what decides which Box the
server graph gets — exactly as it would in a consumer's app. A directory dependency would be
symlinked and resolve its own copy of React from the repository root.

## What is where

| File                      | What it shows                                                                                    |
| ------------------------- | ------------------------------------------------------------------------------------------------ |
| `app/layout.tsx`          | Server Component. Sets the theme name on `<html>` — that is all theming needs on the server      |
| `app/page.tsx`            | Server Component. Props, pseudo-classes, breakpoints, themes; `force-dynamic` so it streams      |
| `app/streamedSection.tsx` | An `async` Server Component behind `<Suspense>` — its markup and its CSS arrive in a later chunk |
| `app/elementMode.ts`      | The one line a client bundle needs: `Box.configure({ sink: 'element' })`                         |
| `app/counter.tsx`         | A client island using `Flex`/`Button`, server-rendered with its CSS in the HTML                  |
| `app/themeToggle.tsx`     | `createThemeController()` from `@box-kite/core` — theme switching with no provider               |
| `app/components/page.tsx` | Server Component. The pre-built components imported straight into it, hook-free and stateful     |
| `app/generative/`         | The generative-UI loop: a prompt, `streamObject` behind `/api/generative`, `<SpecRenderer>`      |
| `smoke.mjs`               | The CI check: 17 assertions against the served HTML                                              |

## The generative-UI loop

`/generative` is the live half of the docs site's [Generative UI](https://www.box-kite.dev/generative-ui/)
page, which replays a recording because it is served as static files. Here the model is really called:

- `app/generative/allowed.ts` — one `catalog()` for both sides of the call, and the app's data beside it;
- `app/api/generative/route.ts` — `streamObject` under `specSchema(ALLOWED, { bindings: true })`. The
  schema comes from `@box-kite/react/catalog`, **not** from `/spec`: the entry that renders a spec is a
  client entry, and a route handler is a server call;
- `app/generative/page.tsx` — `useObject` for the partial JSON, `<SpecRenderer>` over whatever has arrived.

Set `ANTHROPIC_API_KEY` to use it. Without one the route answers `503` and the page says so, which is what
CI checks — the example has to build and smoke-test for anyone who has not got a key.

## What the smoke test proves

Things no unit test can see, because Vitest renders with the client React and never runs a Next
server build:

- the pages carry no `'use client'` directive, and the build resolved the `react-server` entry;
- the base element (the reset, `:root`, and the cascade-layer order) is hoisted into `<head>`;
- every class in the markup has a rule in the response — nothing waits for a client runtime;
- class names are content hashes, so the server and the browser bundle resolve the same strings;
- a Suspense boundary streams its markup **and** its CSS, including a variable first used there;
- a client island's CSS is server-rendered too;
- the theme class on `<html>` selects real, ancestor-scoped rules;
- `Flex`, `Button`, `Textbox` and the semantic tags render **on the server**, CSS included, when a
  Server Component imports them;
- `Checkbox` — which needs a client runtime — can be imported by a Server Component without failing
  the build;
- the generative-UI page survives a real Next build, CSS included, and its model route answers with no
  API key rather than crashing.

Two details worth knowing when reading the HTML: React merges every style element of one precedence
group into a single `<style>` tag and lists what it merged in `data-href`, and styles that arrive
after the shell are streamed as `<style media="not all">` and enabled by React on the client.

## The two kinds of pre-built component

`/components` is a Server Component that imports both kinds, which is the whole difference:

- **`Flex`, `Grid`, `Button`, `Textbox`, `Textarea`, `RadioButton`, `Icon`, the SVG elements and the semantic tags**
  are hook-free wrappers around Box. Their published chunks import `@box-kite/react` by name
  rather than by a relative path, so the `react-server` condition reaches them and they resolve the
  same hook-free Box the page did. They render on the server, CSS in the HTML, no JavaScript behind
  them.
- **`Dropdown`, `Tooltip`, `DataGrid`, `Checkbox`, `Select` and `Form`** hold state or measure the
  DOM. Their chunks ship a `'use client'` banner, so importing one here opens a client boundary
  instead of compiling `useState` into the server graph. Their markup is server-rendered like any
  client component's; their _rules_ come with the client bundle, unless a client module of the app
  has already run `Box.configure({ sink: 'element' })` — which is what `app/elementMode.ts` is for.

`Box.Theme` and hover-callback children (`{({ isHover }) => …}`) stay client-only: they need state.
