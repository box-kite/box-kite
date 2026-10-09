---
name: article
description: Write the next Box Kite blog article — pick a researched topic from the backlog, verify every claim in a browser, write it into posts/ for box-kite.dev/blog, and prepare the cross-post kit for Medium, dev.to and Hashnode
argument-hint: '[topic, backlog row like B4, or "next"]'
---

Write one article for **box-kite.dev/blog**. The site is the canonical copy of every article: Medium, dev.to and Hashnode get
a copy whose canonical URL points back here, and nothing is ever published only off-site.

## Two levels

| Level      | Written for                                                                   | Shape                                                                                                                                                              |
| ---------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Beginner` | someone starting web development, often with an AI assistant writing the code | a goal → numbered steps, each ending in something visible on screen → "What you learned" → "Where to go next". Every step's code is the whole file, ready to paste |
| `Use case` | a React developer with a real problem, who has probably tried the usual fixes | the problem with evidence → why the usual fixes hurt → the solution in increasing depth → "The honest limits" → "Try it"                                           |

## Steps

1. **Pick the topic.** Read `../box-kite-plans/content/article-backlog.md`. Take the row the argument names, or with
   `next` (or no argument) the highest-ranked row whose status is not `written`. Tell the owner the row, the level and the
   working title, and wait for a yes before writing.
2. **Check the problem is still real.** Search for current evidence — GitHub issues and discussions (reactions and
   comment counts are the readable frequency signal), Hacker News, recent blog posts. Reddit and Stack Overflow block
   automated fetching: say so and ask the owner to check them by hand when the article leans on them. Add what you find to
   the backlog row.
3. **Read the library's own answer before writing a line.** `.claude/rules/box-kite-rules.md`, the matching file in
   `.claude/skills/box-kite/references/`, the component or engine source, and the docs page for it. The article may not
   promise more than the code does.
4. **Probe every claim in a browser.** A throwaway `pages/probe.html` + `pages/probe.tsx` (copy the two
   `<!--site-metadata-->` marker lines from `pages/index.html`), `npm run dev`, then the Playwright MCP — computed styles,
   class names on `<html>`, render counters, console warnings, whatever the claim is about. Delete the probe files
   afterwards. **A claim that was not seen working is not written**; a gap you find goes into the article as a limit, and
   into the roadmap's bug ledger if it is a bug.
5. **Write `posts/<slug>.md`.** The slug is lowercase words joined by hyphens and becomes the address. The header:

   ```markdown
   # The title, in sentence case

   _9 October 2026 · Use case_

   The intro paragraph. Its first sentence is the meta description and the index line, so it says what the reader gets
   in under 160 characters.
   ```

6. **Write the cross-post kit** at `../box-kite-plans/launches/blog-<slug>.md`: the dev.to / Hashnode / Medium steps with
   `canonical_url: https://www.box-kite.dev/blog/<slug>/`, a Reddit post (r/reactjs for a use case, r/webdev or
   r/learnreactjs for a beginner article), an X thread of five to seven posts, a short LinkedIn post, a Show HN line when
   the article is technical enough to earn one, and the numbers to record afterwards for H7. Add a row to
   `../box-kite-plans/launches/README.md`.
7. **Mark the backlog row** `written`, with the slug.
8. **Verify:** `npx vitest run pages/site/posts.test.ts`, `npm run check:docs`, `npm run check:brand`, then
   `npm run build:pages`, `npx vite preview ./pages --config ./pages.vite.config.ts --outDir ../dist-pages` and a
   Playwright look at `/blog/<slug>/` (trailing slash) in both themes — the page renders, the console has no hydration
   error, and `dist-pages/blog/<slug>/index.md` exists. Then the rest of the CI list in `AGENTS.md`'s "Verification".

## Rules the tests enforce

`pages/site/posts.test.ts` and `npm run check:docs` fail the build on each of these, so write them right the first time:

- **No exact counts of anything the library has** — no "235 props", "38 components", "six tools". The numbers change from
  one PR to the next. Write "every CSS property", "the components", "the MCP server's tools".
- **Links to the site are absolute** (`https://www.box-kite.dev/theme-setup`) and point at pages that exist, so the
  same markdown works pasted into another platform.
- **No competing library is named.** The site says what this library is, not what it is not. A framework (React, Next.js,
  Vite) or a library it works _with_ (Recharts) is fine.
- **Every ` ```tsx ` block compiles** against the published entry points, imports included. A block that cannot — it
  imports the reader's own `./App` — is marked ` ```tsx nocheck `, and its Box Kite code also appears in a block that
  compiles.
- The meta line is `date · level`, and the first sentence fits a search result whole.

## Voice

- The reader's problem comes before the library. A beginner article starts from what they want on screen; a use case
  starts from the bug they have.
- Plain sentences, second person, no hype words ("blazing", "seamless", "game-changing", "revolutionary").
- Every claim is something the reader can check: a measured number, a link, a block they can paste.
- Say the trade-off out loud. An article that admits the limit is the one people trust with the rest.
- 1,200–2,500 words. A beginner article is longer in code and shorter in prose.
- Box Kite's own rules apply to every snippet: no `style={{ }}`, `<Flex>`/`<Grid>`/`<Button>`/`<H1>` rather than
  `<Box tag>`, HTML attributes in `props`, `fontSize` in pixels and spacing on the ÷4 scale.
