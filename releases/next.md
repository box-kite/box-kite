# Box Kite next

_Unreleased. A PR that changes what a consumer sees adds its section here — see CONTRIBUTING.md, "Release notes"._

The release pipeline publishes to npm again, and signs what it publishes. Nothing inside the library changed: neither 1.0.0 nor 2.0.0 had reached the registry from CI, both went out by hand, and this is the first release to travel the whole way from a merged pull request to npm on its own.

## Breaking changes

None.

## Fixes

- **Neither package had reached npm from CI since the 1.0.0 rename.** `publish.yml` authenticates by trusted publishing — npm exchanges a GitHub OIDC token for a short-lived credential, which is also what signs the provenance — and npmjs.com had no trusted-publisher entry for `@box-kite/core` or `@box-kite/react` to match it against. The registry answers that with `403 OIDC permission denied`, and it answers it _after_ npm has packed the tarball and signed the statement, so the log reads like a success until its last line. The entry exists now, and the workflow checks the npm 11.5.1 floor trusted publishing needs rather than assuming whatever npm the runner image ships that week. The consequence a reader can check: this is the first release whose packages carry [provenance](https://docs.npmjs.com/generating-provenance-statements), so what is on the registry can be traced to the commit and the workflow run that built it.

- **A release whose notes ran past 125,000 characters could not be released at all, and took the npm publish down with it.** The GitHub Release body was the whole notes file, and the API caps it — 2.0.0's notes were 130,296 characters, so the release was refused with a `422` after the tag had been pushed and before the step reached the line that hands the tag to the publish. A tag with no release and nothing on npm, which is the worst of the three states, because the tag makes it look done. The body is assembled by a script now and cut structurally when it will not fit — Highlights, Breaking changes and Fixes are kept and the detail sections are dropped, with the links that pointed at them rewritten to absolute addresses on the site, which carries the file whole either way. The publish is dispatched whether or not the body was accepted.
