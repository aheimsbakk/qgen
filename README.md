# QGen

QGen is a browser QR code generator. It runs as static files, loads nothing from
outside the project, and needs no account, server, or API key.

Version: see `VERSION`. Architecture: `BLUEPRINT.md`. File map: `CODEBASE.md`.

## What exists now

- `src/` — the delivered application: HTML, CSS, and dependency-free JavaScript.
- `tests/` — unit tests, browser tests, and an independent QR decode tool.
- `scripts/` — version, changelog, and codebase-sync tooling.
- `docs/memory/` — recorded decisions for this project.
- `tmp/` — the original proof of concept, kept for reference and ignored by
  Git. Do not edit it.

## Run the application

The page uses ES modules, so it must be served over `http://`. Opening
`src/index.html` straight from disk fails in Firefox and WebKit.

```bash
node tests/helpers/static-server.js     # http://127.0.0.1:8080/
QGEN_PORT=9000 node tests/helpers/static-server.js
```

Open the printed address in Firefox or WebKit.

## Run the tests

All test commands run from `tests/`.

```bash
cd tests
npm install                             # installs the pinned Playwright library
npm run unit                            # Node test runner, no browser needed
```

Browser tests need browser builds. If they are not already installed:

```bash
npx playwright install firefox webkit
```

If the browsers live in a shared cache instead of the default location, point at
it:

```bash
PLAYWRIGHT_BROWSERS_PATH=/home/opencode/.cache/ms-playwright npm run e2e
```

`npm run e2e` runs the browser scenario suite, the decode round-trip suite, the
dialog close suite, and the responsive breakpoint suite. To run them separately:

```bash
node --test "e2e/browser.test.js"
node --test "e2e/decode-round-trip.test.js"
node --test "e2e/dialogs.test.js"
node --test "e2e/responsive.test.js"
```

Run a single browser entry while debugging:

```bash
QGEN_MATRIX=webkit-mobile node --test "e2e/browser.test.js"
```

### Decode round-trip tool

The round-trip test renders QR symbols and decodes them with OpenCV, so the
symbol encoder is never graded against itself. The tool lives in its own `uv`
environment:

```bash
cd tests
uv sync --project tools/decoder
uv run --project tools/decoder tools/decoder/decode_png.py artifacts/browser-firefox-desktop-default.png
```

`uv.lock` holds the pinned versions. Generated dumps and PNGs land in
`tests/artifacts/`, which Git ignores.

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

### scripts/verify_codebase_sync.sh

Checks that every `src/`, `tests/`, `scripts/`, or `docs/` path named in
`CODEBASE.md` exists on disk. Run it after any change that moves files.

```bash
scripts/verify_codebase_sync.sh
```

Exit code 0 lists the number of verified paths. Any other code lists the missing
paths.

## Configuration

The delivered app reads no environment variables and makes no network request.

Test tooling reads these, all optional:

| Variable | Effect |
|---|---|
| `PLAYWRIGHT_BROWSERS_PATH` | Where Playwright looks for browser builds |
| `QGEN_MATRIX` | Comma-separated browser entries to run, for example `webkit-mobile` |
| `QGEN_PORT` | Port for `tests/helpers/static-server.js` when run directly |

No secrets are used anywhere in this project. Test fixtures use obviously fake
values.

## Contributing

Follow the order in `AGENTS.md`: architecture, implementation, testing,
synchronization, then wrap-up. Commits use Conventional Commits.
