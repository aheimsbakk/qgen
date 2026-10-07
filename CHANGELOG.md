# Changelog

## [0.6.1] - 2026-10-07

- **why:** The README led with developer commands, so a visitor looking for
  the app had to dig. The site also moved to a custom domain
- **model:** kompis/qwen3.8-flash-next-iq3_s
- **tags:** docs, readme, deployment

### Changed

- `README.md`: user content leads — live link (<https://sanntid.org/qgen/>),
  what the app does, a three-step start, behaviour, privacy, and the limit of
  one QR code. The developer and script reference moved below under "For
  developers", since `RULES.md` #24 keeps script docs in this file.
- `README.md`: the deploy section names the custom domain instead of the
  `github.io` host.
- `CODEBASE.md`: the README annotation matches the new order.

## [0.6.0] - 2026-10-07

- **why:** Picking the Emoji centre image left the Symbol field empty, so the
  user saw no example of what the control does
- **model:** kompis/qwen3.8-flash-next-iq3_s
- **tags:** qgen, overlay, emoji, defaults

### Added

- `OVERLAY_EMOJI_EXAMPLE` in `src/js/core/state-rules.js`: the smiley
  (U+1F642) that fills the Symbol field.
- `tests/e2e/browser.test.js`: the overlay scenario checks that the Symbol
  field shows the smiley after the kind switches to Emoji.

### Changed

- `src/js/core/state-store.js`: switching the overlay kind to `emoji` now
  fills the smiley example. Switching to `none` or `image` still clears
  content.
- `src/js/ui/panel-sync.js`: the Symbol field mirrors the store's symbol.
  Writes that match the field are skipped, so the caret stays put while the
  user types.
- `src/index.html`: the Symbol placeholder now reads "For example: 🙂".

## [0.5.0] - 2026-10-07

- **why:** A push to `main` should publish the site on its own, with no
  manual deploy step
- **model:** kompis/qwen3.8-flash-next-iq3_s
- **tags:** ci-cd, github-pages, deployment

### Added

- `.github/workflows/deploy-pages.yml`: on a push to `main` or a manual run,
  uploads `src/` as the Pages artifact and deploys it. The app needs no build
  step, so the folder ships as-is. Actions carry explicit versions:
  checkout v7.0.1, upload-pages-artifact v5.0.0, deploy-pages v5.0.1.
- `README.md`: a "Deploy to GitHub Pages" section covers the one-time Pages
  source setting and the site address.

### Changed

- `AGENTS.md`: the CI/CD rule now allows one workflow, the Pages deploy.
- `CODEBASE.md`: the tree, delivery boundary, specifications, and entry
  points list the workflow.
- `scripts/verify_codebase_sync.sh`: also checks `.github/` paths named in
  `CODEBASE.md`.

## [0.4.1] - 2026-10-05

- **why:** The Module size slider offered finer settings than the blueprint
  declares, so the interface and the specification disagreed
- **model:** kompis/qwen3.8-flash-next-iq3_s
- **tags:** qgen, slider, testing

### Fixed

- `src/index.html`: the Module size slider now steps by 0.1, the value
  `BLUEPRINT.md` §4.2 declares. It stepped by 0.05, so it offered settings the
  state tree does not allow.
- `tests/e2e/browser.test.js`: the shape scenario reads the slider's `step` and
  checks that an off-grid value such as 0.14 snaps back to 0.1.

## [0.4.0] - 2026-10-05

- **why:** Show the payload limit before the user hits it, drop a guard that
  could never fire, and cover the dialog close paths no test reached
- **model:** kompis/qwen3.8-flash-next-iq3_s
- **tags:** qgen, capacity, overlay, testing

### Added

- `src/index.html`, `src/js/ui/form-renderer.js`, `src/css/components.css`: a
  capacity line under the field form shows the payload length and the largest
  payload one code holds at the level in use. It takes the danger colour when
  the payload passes the limit.
- `payloadMeter()` in `src/js/core/render-pipeline.js`: reports `chars`,
  `limit`, `level`, and `mode` on every attempt, including one that fails.
  `tests/unit/render-pipeline.test.js` pins the numbers and the order of
  results the interface sees.
- `tests/e2e/dialogs.test.js`: eight checks that the About dialog closes on a
  backdrop click and the menu closes on a click outside it, in Firefox and
  WebKit at desktop and phone widths. Neither path had a test.

### Changed

- `BLUEPRINT.md` §3.2: the ordering guarantee now says one attempt runs at a
  time, which is what the code does. It described a sequence number the
  pipeline never used.

### Fixed

- `src/js/core/render-pipeline.js`: removed the sequence guard, `lastResult`,
  and `lastSymbol`. `renderNow()` encodes and paints before it returns, so the
  check could never be true.
- `src/index.html`: the Centre size slider now steps by 1%, the value
  `BLUEPRINT.md` §4.2 states. It stepped by 5%, and the browser snapped any
  value set on it to the nearest 5%.

## [0.3.0] - 2026-10-05

- **why:** Put export next to the code it exports, and make the layout match the blueprint
- **model:** kompis/qwen3.8-flash-next-iq3_xxs
- **tags:** qgen, layout, responsive, export, testing

### Added

- `tests/e2e/responsive.test.js`: four checks that open the page at 767 px and
  768 px in Firefox and WebKit and assert which panes and the tab strip show.
  Nothing guarded the breakpoint before, which is how it drifted to 720 px.
- `src/css/layout.css`: the sticky preview panel gets `max-height` and
  `overflow-y: auto` on desktop. The export controls made the panel taller than
  a short window, and a sticky panel hid its own buttons.
- `docs/memory/`: recorded that the 768 px value is written twice in CSS and
  must change in both places.

### Changed

- `src/index.html`: the Export group moved from the settings pane to the preview
  pane, below the image. The mobile tab is now "Preview & Export". Control ids
  are unchanged, so `bindings.js` and `export-service.js` needed no edit.
- `src/css/layout.css` and `src/css/states.css`: the pane switch now happens at
  768 px, the value `BLUEPRINT.md` section 11 states. It was 720 px. Viewports
  between 721 and 767 px now get the single-pane layout.
- `src/css/components.css` and `src/css/states.css`: the Settings and Preview &
  Export tabs look like buttons. Full border, full radius, and a filled accent
  for the selected tab, matching `.button-primary`.
- `src/css/layout.css`: the tab strip keeps 16 px above and below the tabs, and
  the divider line above the Export heading is gone. Groups are separated by
  space alone, as elsewhere on the page.

### Fixed

- `src/index.html`: the Settings tab starts with the `is-active` class, so the
  selected tab no longer fades in from white over 120 ms on load.
- `tests/e2e/browser.test.js`: the save and copy scenarios switch to the preview
  pane first. On phone viewports the export buttons now live in a hidden pane,
  and the click timed out.

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
