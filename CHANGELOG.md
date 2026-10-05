# Changelog

## [0.1.0] - 2026-10-05

- **why:** Define the QGen architecture before writing any application code
- **model:** kompis/qwen3.8-flash-next-iq3_xxs
- **tags:** blueprint, codebase-map, architecture, qr-code

### Added

- `BLUEPRINT.md`: language-agnostic specification for QGen v0.1, covering the
  eight content types, the from-scratch QR symbol engine, the state tree,
  payload contracts, error boundaries, accessibility rules, and the test
  strategy.
- `CODEBASE.md`: file map for `src/` and `tests/`, with entry points, naming
  rules, file size budgets, and the Playwright and uv tooling choices.
- `VERSION` file to hold the project version.
- `scripts/bump-version.sh` to raise the version by patch, minor, or major.
- `scripts/validate-changelog.sh` to check that `CHANGELOG.md` matches
  `VERSION` and carries the why, model, and tags bullets.
- `docs/memory/INDEX.md` and four archive entries recording the v0.1 decisions.

### Changed

- `.gitignore` now excludes `node_modules/`, Playwright output, Python caches,
  `.env`, and `.qa-error.log`. The `tmp` reference folder stays ignored.
