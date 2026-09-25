---
name: release
description: Cut a Box Kite release — turn releases/next.md into the versioned notes, bump the manifest and open the release PR; merging it tags, publishes to npm and deploys the site
disable-model-invocation: true
argument-hint: [patch|minor|major|x.y.z] [--dry-run]
---

Cut a release of `@box-kite/react`, `@box-kite/core` and `@box-kite/mcp`. One version, all three packages, one PR.

## How a release works

- **The notes are written as the work lands.** Every PR that changes what a consumer sees adds a
  section to `releases/next.md`; CI (`release-notes.yml`) fails a source change with no note unless
  the PR carries the `no release note` label. By release day the notes exist.
- **`npm run release -- <bump>` opens the release PR.** It turns `releases/next.md` into
  `releases/<version>.md` (stamped with the version, the date and the compare link), resets the
  draft, adds the CHANGELOG row, bumps `package.json` and `package-lock.json`, and opens
  `release/<version>` against main. The manifest leads and the tag follows; `npm version` is never
  run and no tag is made by hand.
- **Merging the PR is the release.** When Tests go green on main, `release.yml` tags `v<version>`,
  creates the GitHub Release with the notes file as its body, and dispatches `publish.yml`, which
  publishes core, then react, then mcp, with provenance. `pages.yml` deploys the site on the same push.

## Steps

1. **Pre-flight.** On `main`, clean, at `origin/main`. Read `releases/next.md` as a reader would:
   is the story there? Decide the bump against SUPPORT.md — a patch for fixes, a minor for new props
   or components, a major for anything under "Breaking changes". The script refuses a non-major bump
   while that section says more than `None.`
2. **Dry run first**: `npm run release -- $ARGUMENTS --dry-run` prints the version, the CHANGELOG
   line and the head of the notes, and writes nothing.
3. **Run it**: `npm run release -- $ARGUMENTS`. It prints the PR URL.
4. **Review the release PR as the release.** Read `releases/<version>.md` whole. Write the intro and
   the Highlights if the draft had none; order the sections biggest first; make sure every breaking
   change has a migration note beside it; check the CHANGELOG line. Fix in place on the release
   branch — the file is the source of truth, and the GitHub Release body follows it.
5. **Merge** (squash), then watch the chain: `gh run list --limit 6` shows Tests → Release →
   Publish to NPM, and Deploy static content to Pages beside them.
6. **Confirm**: `npm view @box-kite/react version`, `npm view @box-kite/core version` and `npm view @box-kite/mcp version` say the new
   version; the release page reads right; the site is up.

## When something fails

- **Tests red on main after the merge**: fix forward on main. Release runs again after the next
  green Tests, and a version with no tag is released then.
- **Release failed after tagging**: run it again from the Actions tab (`workflow_dispatch`). Every
  step checks what already exists before doing it.
- **Publish failed**: `gh workflow run publish.yml -f ref=v<version>`. A package already on the
  registry is skipped, so the one that failed is the only one retried. An OIDC `403` means npm's
  trusted-publisher record does not match — see below.
- **A wrong word in published notes**: edit `releases/<version>.md` in an ordinary PR. The release
  body re-syncs on the next green main.

## Writing a note, for any PR

- One `## ` section per change, above "Breaking changes": a sentence for the heading (the way the
  commit subjects read), a paragraph on what changed and why the reader would care, an example if it
  helps. Lead with the thing to know.
- A breaking change is a bullet under `## Breaking changes` (replace `None.`), with what to change
  beside it. A fix is a bullet under `## Fixes`: **what was wrong**, then what it does now.
- Links are absolute (`https://www.box-kite.dev/…`), because the same text is the GitHub Release
  body. `releases/1.0.0.md` is the reference for the shape.

## Owner setup, once per package

npm trusted publishing is configured per package, and 1.0.0 was published by hand because it was
missing: `@box-kite/react`, `@box-kite/core` **and** `@box-kite/mcp` each need a trusted publisher of
owner `box-kite`, repository `box-kite`, workflow `publish.yml`, environment left blank, with
`npm publish` ticked.

**A new package is published by hand once**, because the trusted-publisher form lives on the
package's Settings page and a package that is not on the registry has none. Seed it from the latest
tag, so its contents match a released version, then configure the publisher; every later release is
the workflow's. For `@box-kite/mcp` (first seeded at 2.1.0):

```bash
git worktree add ../box-kite-seed v2.1.0 && cd ../box-kite-seed
npm ci && npm run build:mcp
npm publish ./dist-mcp --access public   # logged in as a box-kite org owner, with 2FA
cd - && git worktree remove ../box-kite-seed
```
