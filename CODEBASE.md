# QGen — Codebase Map

Maps the components in `BLUEPRINT.md` to physical files. This document covers
implementation mapping only. Architectural reasoning lives in `BLUEPRINT.md`.

Status: implemented. Every path listed here exists and is checked by
`scripts/verify_codebase_sync.sh`.

---

## 1. Delivery Boundary

| Group | Paths | Shipped to users |
|---|---|---|
| Application | `src/` | Yes |
| Test and verification tooling | `tests/`, `scripts/` | No |
| Reference proof of concept | `/work/tmp/qgen_qr_code_generator.html` | No, read-only reference |
| Documentation | `BLUEPRINT.md`, `CODEBASE.md`, `README.md`, `docs/memory/` | No |

`src/` contains no test file, no build output, and no third-party code.

---

## 2. Repository Tree

```
/work
├── AGENTS.md
├── BLUEPRINT.md
├── CHANGELOG.md                           version history, Keep a Changelog format
├── CODEBASE.md
├── README.md                              script usage, how to run app and tests
├── VERSION                                MAJOR.MINOR.PATCH
├── .gitignore                             test artifacts, Python env, node_modules
├── docs/
│   └── memory/                            session decisions and index
├── scripts/
│   ├── bump-version.sh                    raise the version in VERSION
│   ├── validate-changelog.sh              check CHANGELOG.md against VERSION
│   └── verify_codebase_sync.sh            checks every path listed here exists
├── src/                                   delivered application
│   ├── index.html                         landing page, single page of the app
│   ├── css/
│   │   ├── tokens.css                     colour and spacing custom properties
│   │   ├── base.css                       reset, typography, focus styles
│   │   ├── layout.css                     shell, panes, tab bar, breakpoints, export block
│   │   ├── components.css                 cards, fields, buttons, menu, modal, toast
│   │   └── states.css                     preview empty, invalid, error states
│   └── js/
│       ├── main.js                        application bootstrap and wiring
│       ├── core/
│       │   ├── state-store.js             sole state owner, clamps, notify
│       │   ├── state-rules.js             field rules, clamps, enum lists
│       │   ├── schema-registry.js         8 content types: specs, defaults, rules
│       │   ├── render-pipeline.js         debounce, one attempt at a time, capacity meter
│       │   └── export-service.js          high-res render, file save, clipboard
│       ├── qr/
│       │   ├── tables.js                  EC block table, alignment coords, version info
│       │   ├── bit-buffer.js              bit and codeword assembly
│       │   ├── mode-selector.js           numeric, alphanumeric, byte choice
│       │   ├── version-selector.js        smallest fitting version
│       │   ├── data-encoder.js            segments, terminator, padding
│       │   ├── bch.js                     format and version BCH codewords
│       │   ├── reed-solomon.js            GF(256) arithmetic, block splitting
│       │   ├── matrix.js                  function patterns and data placement
│       │   ├── masking.js                 8 masks, penalty rules, selection
│       │   └── encoder.js                 engine orchestrator, symbol output
│       ├── render/
│       │   ├── surface.js                 canvas sizing, integer module edges
│       │   ├── painter.js                 module shapes, colour mapping
│       │   └── overlay.js                 backing plate, emoji, image compositing
│       └── ui/
│           ├── dom-refs.js                element lookup registry
│           ├── bindings.js                control events to state commands
│           ├── form-renderer.js           dynamic field form build
│           ├── panel-sync.js              control visibility from state
│           ├── preview-states.js          ready, empty, invalid, error switching
│           ├── dialogs.js                 menu, About modal, Escape, focus return
│           ├── tabs.js                    mobile settings and preview switching
│           └── toasts.js                  transient feedback messages
└── tests/                                 verification tooling, never shipped
    ├── package.json                       node:test plus pinned Playwright library
    ├── package-lock.json                  locked versions
    ├── helpers/
    │   ├── static-server.js               Node built-in http server for src/
    │   ├── browser-matrix.js              Firefox and WebKit contexts, desktop and phone
    │   ├── decoder.js                     bridge to the uv decoder tool
    │   └── qr-inspect.js                  format and version bit read-back
    ├── unit/
    │   ├── bch.test.js                    published BCH worked examples, codeword distance
    │   ├── reed-solomon.test.js           GF(256) roots and interleaved block counts
    │   ├── qr-encoder.test.js             mode, version, mask, capacity, function patterns
    │   ├── schema-registry.test.js        payload formats and validation rules
    │   ├── state-store.test.js            clamping, rejection, notification
    │   ├── render-pipeline.test.js        debounce, sequence guard, export payload
    │   ├── export-service.test.js         clipboard fallback and failure wording
    │   └── dependency-free.test.js        static proof that src/ loads nothing external
    ├── e2e/
    │   ├── browser.test.js                scenario suite over the browser matrix
    │   ├── decode-round-trip.test.js      rendered PNGs decoded by the independent tool
    │   ├── dialogs.test.js                menu and About dialog close by outside click
    │   └── responsive.test.js             pane switch checked at 767 px and 768 px
    └── tools/
        └── decoder/
            ├── pyproject.toml             pinned decoder tool dependencies
            ├── uv.lock                    locked versions
            ├── decode_png.py              PNG in, decoded payload JSON out
            └── matrix_to_png.py           symbol dump in, PNG out
```

Test runs write generated dumps and PNGs to `tests/artifacts/`, which is ignored.

---

## 3. Component to Path Mapping

| Blueprint component | Physical path |
|---|---|
| App shell, header, panes, tab bar | `src/index.html`, `src/css/layout.css` |
| Content panel | `src/js/ui/form-renderer.js`, `src/css/components.css` |
| Style panel | `src/index.html`, `src/js/ui/panel-sync.js` |
| Overlay panel | `src/index.html`, `src/js/ui/panel-sync.js` |
| Preview panel and states | `src/index.html`, `src/js/ui/preview-states.js`, `src/css/states.css` |
| Export bar | `src/index.html`, `src/css/layout.css`, `src/js/core/export-service.js` |
| Menu and About dialog | `src/js/ui/dialogs.js` |
| Feedback surface | `src/js/ui/toasts.js` |
| Field error surface | `src/js/ui/form-renderer.js`, `src/css/states.css` |
| Capacity meter | `src/index.html`, `src/js/ui/form-renderer.js`, `src/css/components.css` |
| Control bindings | `src/js/ui/bindings.js` |
| Dialog controller | `src/js/ui/dialogs.js` |
| View switcher | `src/js/ui/tabs.js` |
| Responsive pane switch at 768 px | `src/css/layout.css`, `src/css/states.css` |
| State store | `src/js/core/state-store.js` |
| Validation and clamp rules | `src/js/core/state-rules.js` |
| Schema registry | `src/js/core/schema-registry.js` |
| Render pipeline | `src/js/core/render-pipeline.js` |
| Export service | `src/js/core/export-service.js` |
| Mode selector | `src/js/qr/mode-selector.js` |
| Version selector | `src/js/qr/version-selector.js` |
| Bit stream builder | `src/js/qr/bit-buffer.js`, `src/js/qr/data-encoder.js` |
| Format and version BCH | `src/js/qr/bch.js` |
| Error correction coder | `src/js/qr/reed-solomon.js` |
| Matrix constructor | `src/js/qr/matrix.js` |
| Mask evaluator | `src/js/qr/masking.js` |
| Symbol output | `src/js/qr/encoder.js` |
| Module painter | `src/js/render/painter.js` |
| Colour mapper | `src/js/render/painter.js` |
| Overlay compositor | `src/js/render/overlay.js` |
| Surface adapter | `src/js/render/surface.js` |
| Quiet zone and preview sizing | `src/js/render/surface.js` |
| End-to-end suite | `tests/e2e/browser.test.js` |
| Symbol unit suite | `tests/unit/qr-encoder.test.js`, `tests/unit/bch.test.js`, `tests/unit/reed-solomon.test.js` |
| Decode verifier | `tests/tools/decoder/decode_png.py`, `tests/helpers/decoder.js` |
| Dependency guard | `tests/unit/dependency-free.test.js` |
| Test fixture server | `tests/helpers/static-server.js` |
| Specification tables | `src/js/qr/tables.js` |

---

## 4. Specifications

| Item | Choice |
|---|---|
| Application language | JavaScript, ES2022 modules, browser only |
| Module system | Native ES modules, `type="module"` script tag |
| Build step | None. Files in `src/` are served as written |
| Stylesheet language | Plain CSS with custom properties |
| Markup | HTML5, no template engine |
| Runtime dependencies | None. No package manager, no CDN, no bundler |
| Naming convention | `kebab-case` for files and directories |
| Responsive breakpoint | 768 px. One pane below it, both panes at and above it |
| Identifier convention | `camelCase` variables and functions, `PascalCase` classes |
| Test runner | Node built-in `node:test`, run from `tests/` |
| Browser driver | Playwright library, pinned `1.63.0` |
| Test manifest | `tests/package.json`, isolated from `src/` |
| Browser engines in the matrix | Firefox desktop, Firefox at phone viewport, WebKit desktop, WebKit mobile |
| Chromium | Not part of the required matrix |
| Phone profiles | 390 by 844 viewport with `isMobile` and `hasTouch` on both engines |
| Matrix narrowing | `QGEN_MATRIX=webkit-mobile` limits a run to named entries |
| Decoder toolchain | Python managed by `uv`, pinned `opencv-python-headless==4.11.0.86`, `numpy` supplied by OpenCV |
| Fixture server | Node built-in `http` module, no dependency |
| Version control | Conventional Commits, `docs(sync):` for documentation |
| CI/CD | None. No `.github` directory |

### File size budget

`BLUEPRINT.md` requires one layer per file. `RULES.md` requires review at 200
lines and a split at 300 lines. Budgets in force:

| Area | Budget |
|---|---|
| `src/js/qr/*` | 60 to 200 lines each |
| `src/js/core/*` | 80 to 200 lines each |
| `src/js/ui/*` | 60 to 200 lines each |
| `src/js/render/*` | 60 to 180 lines each |
| `src/css/*` | 100 to 250 lines each |
| `src/index.html` | exempt as the page shell |
| `src/js/main.js` | exempt as the composition root |
| `src/js/qr/tables.js` | exempt, specification data tables |
| `tests/**` | exempt as test suites, kept under 300 lines by splitting files |

---

## 5. Entry Points

| Purpose | Exact path |
|---|---|
| Landing page | `src/index.html` |
| Application bootstrap | `src/js/main.js`, loaded by `src/index.html` as a module |
| Symbol engine entry | `src/js/qr/encoder.js`, exports `encode`, `capacityFor`, `symbolRows` |
| Fixture server | `tests/helpers/static-server.js`, started in-process by the end-to-end suite |
| Unit test command | `node --test "unit/**/*.test.js"`, run in `tests/` |
| End-to-end test command | `node --test "e2e/**/*.test.js"`, run in `tests/` |
| Decoder command line | `tests/tools/decoder/decode_png.py`, run as `uv run --project tools/decoder tools/decoder/decode_png.py <png-path>` from `tests/` |
| Sync verification | `scripts/verify_codebase_sync.sh`, run as `scripts/verify_codebase_sync.sh` |
| Version bump | `scripts/bump-version.sh`, run as `scripts/bump-version.sh [patch\|minor\|major]` |
| Changelog check | `scripts/validate-changelog.sh`, run as `scripts/validate-changelog.sh` |

### Import graph

`src/js/main.js` is the only module referenced by the page. It imports the core,
render, and UI modules. Core modules import the symbol engine. The symbol engine
imports nothing outside `src/js/qr/`. No module in `src/js/qr/` or `src/js/core/`
imports a UI module.

---

## 6. Language Rationale

- ES modules were chosen for explicit imports and no build step. The consequence
  is that `src/index.html` must be served over `http://`. Opening it directly
  from the file system fails module loading in both Firefox and WebKit. Local
  use therefore runs through the fixture server in `tests/helpers/static-server.js`,
  and `README.md` documents that command.
- No bundler means the browser resolves the import graph. Import order is
  declared in `src/js/main.js` instead of a script list in HTML.
- Tailwind utility classes from the proof of concept are replaced by semantic
  class names in `src/css/`. Colour values move to custom properties in
  `src/css/tokens.css` so the palette is defined once.
- `qrcode-generator` is removed. `src/js/qr/` implements encoding directly, so
  the specification tables in `src/js/qr/tables.js` are the only large data
  asset in the app. BCH helpers sit in `src/js/qr/bch.js` because `matrix.js`
  passed its line budget once format and version words were added.
- Validation rules live in `src/js/core/state-rules.js` so `state-store.js` keeps
  a single job: owning state and notifying subscribers.
- Canvas 2D is the raster surface. Module edges are rounded to whole pixels in
  `src/js/render/surface.js`, because fractional edges produce anti-aliased module
  borders that scanners reject. Rounded modules use a hand-written path helper
  rather than the canvas rounded-rectangle method, so behaviour does not depend
  on engine support differences between Firefox and WebKit.
- Clipboard export uses the browser clipboard image write API and treats
  unavailability as an expected failure with a message, not an exception path.
- State is a single object owned by `src/js/core/state-store.js`. UI modules call
  its commands and never assign to state fields, which keeps writes serialised
  in one module. Derived writes that must not re-trigger a render, such as the
  last valid export payload, go through a dedicated store method.
- The render pipeline runs one attempt at a time: `renderNow()` encodes and
  paints before it returns, so an older attempt cannot overtake a newer one. No
  ordering marker is carried while encoding and painting stay synchronous.
  `tests/unit/render-pipeline.test.js` pins the one-result-per-attempt order.
- Tests run on Node's built-in test runner. Playwright is used as a library, not
  as a test framework, because the matrix needs plain Firefox and WebKit
  contexts rather than Playwright Test projects, and the matrix is data-driven
  from `tests/helpers/browser-matrix.js`. Its version is pinned to `1.63.0` to
  match the browser builds already installed on this machine.
- Test dependencies live in `tests/package.json`. `src/` stays free of any
  manifest, which keeps the delivered artifact dependency-free.
- The zero-dependency guarantee is proven by a static scan in
  `tests/unit/dependency-free.test.js` rather than a network listener, because
  the app contains no request code at all to intercept.
- The decoder runs in a separate `uv` environment under `tests/tools/decoder/`
  with a lockfile. `pyzbar` is avoided because it needs a system library.
  OpenCV headless ships its own wheels and needs no host package.
- The fixture server uses Node's built-in `http` module so the test harness does
  not gain an extra dependency just to serve files.
- The 768 px breakpoint is written as a literal in `src/css/layout.css` and
  repeated in `src/css/states.css`. Plain CSS media queries cannot read a custom
  property, and a shared value would need a build step, which the delivery rules
  forbid. `tests/e2e/responsive.test.js` checks both sides of the boundary so the
  copies cannot drift apart unnoticed.

---

## 7. Test Matrix Mapping

| Blueprint verification requirement | Test file |
|---|---|
| Published BCH worked examples | `tests/unit/bch.test.js` |
| Encoder stage behaviour | `tests/unit/qr-encoder.test.js`, `tests/unit/reed-solomon.test.js` |
| Independent decode round-trip at dot size 1.0 | `tests/e2e/decode-round-trip.test.js` |
| Overlay coverage | `tests/e2e/browser.test.js`, `tests/e2e/decode-round-trip.test.js` |
| Content type coverage | `tests/e2e/decode-round-trip.test.js`, `tests/unit/schema-registry.test.js` |
| Default-state guarantee | `tests/e2e/browser.test.js` |
| Error boundaries | `tests/e2e/browser.test.js`, `tests/unit/qr-encoder.test.js`, `tests/unit/state-store.test.js` |
| Capacity limit shown | `tests/unit/render-pipeline.test.js`, `tests/e2e/browser.test.js` |
| One render attempt at a time | `tests/unit/render-pipeline.test.js` |
| Interaction coverage | `tests/e2e/browser.test.js`, `tests/e2e/dialogs.test.js`, `tests/unit/export-service.test.js` |
| Zero dependency proof | `tests/unit/dependency-free.test.js` |
| Browser and viewport matrix | `tests/helpers/browser-matrix.js` |
| Responsive pane switch at 768 px | `tests/e2e/responsive.test.js` |

---

## 8. Ignored Paths

Declared in `.gitignore`:

```
tmp
node_modules/
test-results/
playwright-report/
tests/artifacts/
.venv/
__pycache__/
*.pyc
.env
.qa-error.log
```
