# Support & Stewardship

## Versioning

`@box-kite/react` follows [Semantic Versioning](https://semver.org/):

- **Patch** (`3.3.x`) — bug fixes, docs, internal refactors. Always safe to upgrade.
- **Minor** (`3.x.0`) — new props, new components, new APIs. Backwards compatible.
- **Major** (`x.0.0`) — breaking changes only. Every breaking change ships with a written migration note in the release, and deprecated APIs keep working (with a warning) for at least one minor release before removal wherever technically possible.

Breaking changes are batched: we would rather ship one well-documented major than trickle breakage across minors.

## Release cadence

We aim for **at least one release every month**. Every release has generated notes on the [GitHub Releases page](https://github.com/box-kite/box-kite/releases).

## Supported environments

- **React** 18 and newer (see `peerDependencies` for the authoritative range)
- **TypeScript**: current and previous major, `moduleResolution: bundler` or `node10`. (`node16`/`nodenext` type resolution has known gaps that are on the roadmap.)
- ESM and CJS builds are both published.

## Getting help

- **Bug reports & feature requests** — [GitHub issues](https://github.com/box-kite/box-kite/issues). Please use the templates.
- **Questions** — [GitHub discussions](https://github.com/box-kite/box-kite/discussions) if enabled, otherwise open an issue with the question label.
- **Security issues** — see [SECURITY.md](SECURITY.md). Please do not open public issues for vulnerabilities.

## Continuity ("bus factor")

A fair question for any small library. The floor is covered regardless of the maintainer:

- The license is **MIT** — forking is always an option.
- The build is fully reproducible from this repository with `npm ci && npm run build` — no private infrastructure, secrets, or services are involved in producing the published artifact.
- Publishing runs from CI on GitHub Releases, so the release process itself is public and auditable.
