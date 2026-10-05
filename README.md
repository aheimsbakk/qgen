# QGen

QGen is a browser QR code generator. This repository currently holds its
specification and tooling. The application is not built yet.

## What exists now

- `BLUEPRINT.md` — language-agnostic architecture for QGen v0.1.
- `CODEBASE.md` — planned file map for `src/` and `tests/`.
- `scripts/` — version and changelog tooling.
- `docs/memory/` — recorded decisions for this project.
- `tmp/` — the original proof of concept, kept for reference and ignored by
  Git. Do not edit it.

## Quick start

```bash
scripts/validate-changelog.sh
```

This prints `Changelog OK for version <version>` or lists what is wrong.

## Scripts

### scripts/bump-version.sh

Raises the version stored in `VERSION`.

Arguments: `patch`, `minor`, or `major`.

```bash
scripts/bump-version.sh minor   # 0.1.0 -> 0.2.0
scripts/bump-version.sh patch   # 0.1.0 -> 0.1.1
```

The script fails if `VERSION` is missing or does not hold `MAJOR.MINOR.PATCH`.

### scripts/validate-changelog.sh

Checks `CHANGELOG.md` against `VERSION`. It requires a `# Changelog` heading, a
section for the current version, and the `why`, `model`, and `tags` bullets in
that section.

```bash
scripts/validate-changelog.sh
```

Exit code 0 means the changelog is valid. Any other code means a check failed.

## Planned commands

These exist after implementation, as recorded in `CODEBASE.md`:

```bash
node tests/tools/static-server.mjs      # serve src/ for local use
npx playwright test                     # run the browser test matrix
uv run decode_qr.py <png-path>          # decode a PNG, print the payload
```

## Configuration

The delivered app will need no environment variables and will make no network
request. Test tooling reads no secrets.

## Contributing

Follow the order in `AGENTS.md`: architecture, implementation, testing,
synchronization, then wrap-up. Commits use Conventional Commits.
