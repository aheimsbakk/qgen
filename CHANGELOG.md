# Changelog

## [0.2.0] - 2026-10-05

- **why:** Deliver the QR generator the v0.1 blueprint describes
- **model:** kompis/qwen3.8-flash-next-iq3_xxs
- **tags:** qgen, qr-code, testing, accessibility

### Added

- `src/`: the delivered app. `src/index.html`, five stylesheets in `src/css/`,
  and modules in `src/js/core`, `src/js/qr`, `src/js/render`, and `src/js/ui`.
  No runtime dependency and no network request.
- `src/js/qr/`: QR engine written from scratch. Mode and version selection, bit
  assembly, Reed-Solomon coding over GF(256), BCH format and version words,
  mask scoring, and matrix construction.
- `tests/unit/`: 55 checks for BCH words, Reed-Solomon roots, encoder limits,
  state rules, the render pipeline, export fallbacks, and a static scan that
  proves `src/` loads nothing external.
- `tests/e2e/`: 47 checks. `browser.test.js` runs 11 scenarios in Firefox and
  WebKit at desktop and phone viewports. `decode-round-trip.test.js` decodes
  rendered symbols with OpenCV. `tests/helpers/static-server.js` serves `src/`
  for the tests and for local use.

### Changed

- `BLUEPRINT.md`: the capacity table now holds the specification values 7089
  numeric and 1852 alphanumeric.
- `CODEBASE.md` and `README.md`: describe the files and commands that exist now,
  including `scripts/verify_codebase_sync.sh`.
- `docs/memory/`: recorded the test runner choice, the matrix phone flag, and
  the whole-pixel drawing rule.

### Fixed

- `src/js/render/surface.js`: module edges are whole pixels. Fractional edges
  drew anti-aliased borders that scanners could not read.
- `src/js/core/state-store.js`: a write that changes nothing no longer notifies
  subscribers, and `rememberPayload` stores the export payload without starting
  another render.
- `src/js/core/export-service.js`: a copy failure no longer repeats a period in
  its message.
- `tests/helpers/browser-matrix.js`: sessions carry a `phone` flag. The WebKit
  phone entry is named `webkit-mobile`, so name-based checks skipped phone steps.

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
