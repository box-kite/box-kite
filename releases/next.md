# Box Kite next

_Unreleased. A PR that changes what a consumer sees adds its section here — see CONTRIBUTING.md, "Release notes"._

<!-- Intro: one or two sentences on what this release is about. The first one becomes the CHANGELOG line. -->

## Highlights

<!-- One bullet per section below, linking to it: **[Heading](#heading)** — one line on why it matters. -->

<!-- One `##` per change, above Breaking changes: a sentence for the heading, a paragraph on what and why, an example if it helps. -->

## Breaking changes

None.

## Fixes

<!-- One bullet per fix: **What was wrong.** What it does now. -->

- **A Server Component page carried the base stylesheet once per Box.** The browser saw one copy, because React
  dedupes `<style href>` by href. The RSC payload under the HTML still sent the whole ~24 KB base block, plus
  every rule, for each Box: 1,000 four-Box cards in Next.js 16 came to 102 MB of HTML. Every Box now gets the same
  style elements, which React sends once and refers to afterwards. The same page is 1.3 MB (34 KB gzipped,
  against 25 KB for the page written with a CSS module), and nothing changes in your code.
