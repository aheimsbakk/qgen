# QGen — Codebase Map

Maps the components in `BLUEPRINT.md` to physical files. This document covers
implementation mapping only. Architectural reasoning lives in `BLUEPRINT.md`.

Status: target layout approved. No application or test file exists yet. The
verification script listed below is created when the files it checks exist.

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
│   ├── validate-changelog.sh             check CHANGELOG.md against VERSION
│   └── verify_codebase_sync.sh            checks every path listed here exists
├── src/                                   delivered application
│   ├── index.html                         landing page, single page of the app
│   ├── css/
│   │   ├── tokens.css                     colour and spacing custom properties
│   │   ├── base.css                       reset, typography, focus styles
│   │   ├── layout.css                     shell, panes, tab bar, breakpoints
│   │   ├── components.css                 cards, fields, buttons, menu, modal, toast
│   │   └── states.css                     preview empty, invalid, error states
│   └── js/
│       ├── main.js                        application bootstrap and wiring
│       ├── core/
│       │   ├── state-store.js             sole state owner, clamps, notify
│       │   ├── schema-registry.js         8 content types: specs, defaults, rules
│       │   ├── render-pipeline.js         debounce, sequence guard, validate to render
│       │   └── export-service.js          high-res render, file save, clipboard
│       ├── qr/
│       │   ├── tables.js                  EC block table, alignment coords, version info
│       │   ├── bit-buffer.js              bit and codeword assembly
│       │   ├── mode-selector.js           numeric, alphanumeric, byte choice
│       │   ├── version-selector.js        smallest fitting version
│       │   ├── data-encoder.js            segments, terminator, padding
│       │   ├── reed-solomon.js            GF(256) arithmetic, block splitting
│       │   ├── matrix.js                  function patterns and data placement
│       │   ├── masking.js                 8 masks, penalty rules, selection
│       │   └── encoder.js                 engine orchestrator, symbol output
│       ├── render/
│       │   ├── painter.js                 module shapes, colour mapping
│       │   ├── overlay.js                 backing plate, emoji, image compositing
│       │   └── surface.js                 canvas sizing, preview and offscreen
│       └── ui/
│           ├── dom-refs.js                element lookup registry
│           ├── bindings.js                control events to state commands
│           ├── form-renderer.js           dynamic field form build
│           ├── panel-sync.js              control visibility from state
│           ├── preview-states.js          ready, empty, invalid, error switching
│           ├── dialogs.js                 menu, About modal, Escape, focus trap
│           ├── tabs.js                    mobile settings and preview switching
│           └── toasts.js                  transient feedback messages
└── tests/                                 verification tooling, never shipped
    ├── package.json                       Playwright Test only, pinned version
    ├── playwright.config.js               projects, browsers, server, timeouts
    ├── fixtures/
    │   ├── reference-vectors.json         published worked examples
    │   └── expected-grids.json            payload to module grid cases
    ├── helpers/
    │   ├── png-artifact.js                write exported PNG to disk
    │   ├── decode-payload.js              call the decoder tool, return payload
    │   └── request-guard.js              fail the test on any external request
    ├── unit/
    │   ├── qr-encoder.spec.js             mode, version, EC, mask stages
    │   ├── qr-reference-vectors.spec.js   encoder output vs published grids
    │   ├── schema-registry.spec.js        payload formats and validation rules
    │   └── state-store.spec.js            clamping, rejection, notification
    ├── e2e/
    │   ├── defaults.spec.js               valid code on load and on type switch
    │   ├── content-types.spec.js          all 8 types produce expected payloads
    │   ├── styling.spec.js                shapes, colours, eye colour, dot size
    │   ├── overlay.spec.js                emoji, image, backing, size ratio
    │   ├── export.spec.js                 size clamp, save name, clipboard
    │   ├── errors.spec.js                 required fields, ranges, capacity
    │   ├── dialogs-a11y.spec.js           menu, modal, Escape, focus behaviour
    │   ├── responsive.spec.js             pane and tab layout at breakpoints
    │   ├── decode-roundtrip.spec.js       exported PNG decoded independently
    │   └── zero-dependency.spec.js        no request leaves the origin
    └── tools/
        ├── static-server.mjs              Node built-in http server for src/
        └── decoder/
            ├── pyproject.toml             pinned decoder tool dependencies
            ├── uv.lock                    locked versions
            └── decode_qr.py               PNG in, decoded payload JSON out
```

---

## 3. Component to Path Mapping

| Blueprint component | Physical path |
|---|---|
| App shell, header, panes, tab bar | `src/index.html`, `src/css/layout.css` |
| Content panel | `src/js/ui/form-renderer.js`, `src/css/components.css` |
| Style panel | `src/index.html`, `src/js/ui/panel-sync.js` |
| Overlay panel | `src/index.html`, `src/js/ui/panel-sync.js` |
| Preview panel and states | `src/index.html`, `src/js/ui/preview-states.js`, `src/css/states.css` |
| Export bar | `src/index.html`, `src/js/core/export-service.js` |
| Menu and About dialog | `src/js/ui/dialogs.js` |
| Feedback surface | `src/js/ui/toasts.js` |
| Field error surface | `src/js/ui/form-renderer.js`, `src/css/states.css` |
| Control bindings | `src/js/ui/bindings.js` |
| Dialog controller | `src/js/ui/dialogs.js` |
| View switcher | `src/js/ui/tabs.js` |
| State store | `src/js/core/state-store.js` |
| Schema registry | `src/js/core/schema-registry.js` |
| Render pipeline | `src/js/core/render-pipeline.js` |
| Export service | `src/js/core/export-service.js` |
| Mode selector | `src/js/qr/mode-selector.js` |
| Version selector | `src/js/qr/version-selector.js` |
| Bit stream builder | `src/js/qr/bit-buffer.js`, `src/js/qr/data-encoder.js` |
| Error correction coder | `src/js/qr/reed-solomon.js` |
| Matrix constructor | `src/js/qr/matrix.js` |
| Mask evaluator | `src/js/qr/masking.js` |
| Symbol output | `src/js/qr/encoder.js` |
| Module painter | `src/js/render/painter.js` |
| Colour mapper | `src/js/render/painter.js` |
| Overlay compositor | `src/js/render/overlay.js` |
| Surface adapter | `src/js/render/surface.js` |
| Quiet zone and preview sizing | `src/js/render/surface.js` |
| End-to-end suite | `tests/e2e/` |
| Symbol unit suite | `tests/unit/qr-encoder.spec.js`, `tests/unit/qr-reference-vectors.spec.js` |
| Decode verifier | `tests/tools/decoder/decode_qr.py`, `tests/helpers/decode-payload.js` |
| Dependency guard | `tests/helpers/request-guard.js`, `tests/e2e/zero-dependency.spec.js` |
| Test fixture server | `tests/tools/static-server.mjs` |
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
| Identifier convention | `camelCase` variables and functions, `PascalCase` classes |
| Test framework | Playwright Test, pinned `1.63.0` |
| Test manifest | `tests/package.json`, isolated from `src/` |
| Browser engines in the matrix | Firefox desktop, Firefox at phone viewport, WebKit desktop, WebKit mobile |
| Chromium | Not part of the required matrix |
| Mobile profiles | iPhone 14 for WebKit mobile, phone viewport resize for Firefox mobile |
| Decoder toolchain | Python 3.13 managed by `uv`, pinned `opencv-python-headless`, `numpy`, `Pillow` |
| Fixture server | Node built-in `http` module, no dependency |
| Version control | Conventional Commits, `docs(sync):` for documentation |
| CI/CD | None. No `.github` directory |

### File size budget

`BLUEPRINT.md` requires one layer per file. `RULES.md` requires review at 200
lines and a split at 300 lines. Planned budgets:

| Area | Budget |
|---|---|
| `src/js/qr/*` | 60 to 200 lines each |
| `src/js/core/*` | 80 to 200 lines each |
| `src/js/ui/*` | 60 to 180 lines each |
| `src/js/render/*` | 80 to 180 lines each |
| `src/css/*` | 60 to 200 lines each |
| `src/js/qr/tables.js` | exempt, specification data tables |
| `tests/**/*.spec.js` | exempt as test suites, kept under 300 lines by splitting files |

---

## 5. Entry Points

| Purpose | Exact path |
|---|---|
| Landing page | `src/index.html` |
| Application bootstrap | `src/js/main.js`, loaded by `src/index.html` as a module |
| Symbol engine entry | `src/js/qr/encoder.js`, exports one encode function |
| Fixture server | `tests/tools/static-server.mjs`, run as `node tests/tools/static-server.mjs` |
| Playwright configuration | `tests/playwright.config.js` |
| Decoder command line | `tests/tools/decoder/decode_qr.py`, run as `uv run decode_qr.py <png-path>` |
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
  use therefore runs through `tests/tools/static-server.mjs`, and `README.md`
  documents that command.
- No bundler means the browser resolves the import graph. Import order is
  declared in `src/js/main.js` instead of a script list in HTML.
- Tailwind utility classes from the proof of concept are replaced by semantic
  class names in `src/css/`. Colour values move to custom properties in
  `src/css/tokens.css` so the palette is defined once.
- `qrcode-generator` is removed. `src/js/qr/` implements encoding directly, so
  the specification tables in `src/js/qr/tables.js` are the only large data
  asset in the app.
- Canvas 2D is the raster surface. Rounded modules use a hand-written path
  helper rather than the canvas rounded-rectangle method, so behaviour does not
  depend on engine support differences between Firefox and WebKit.
- Clipboard export uses the browser clipboard image write API and treats
  unavailability as an expected failure with a message, not an exception path.
- State is a single object owned by `src/js/core/state-store.js`. UI modules call
  its commands and never assign to state fields, which keeps writes serialised
  in one module.
- The render pipeline carries a sequence number per attempt so a slow encode
  cannot overwrite a newer preview.
- Playwright Test is used because it drives Firefox and WebKit natively and can
  attach a request listener for the zero-dependency check. Its version is pinned
  to `1.63.0` to match the browser builds already installed on this machine.
- Test dependencies live in `tests/package.json`. `src/` stays free of any
  manifest, which keeps the delivered artifact dependency-free.
- The decoder runs in a separate `uv` environment under `tests/tools/decoder/`
  with a lockfile. `pyzbar` is avoided because it needs a system library.
  OpenCV headless ships its own wheels and needs no host package.
- The fixture server uses Node's built-in `http` module so the test harness does
  not gain an extra dependency just to serve files.

---

## 7. Test Matrix Mapping

| Blueprint verification requirement | Test file |
|---|---|
| Symbol correctness against reference vectors | `tests/unit/qr-reference-vectors.spec.js` |
| Encoder stage behaviour | `tests/unit/qr-encoder.spec.js` |
| Independent decode round-trip at dot size 1.0 | `tests/e2e/decode-roundtrip.spec.js` |
| Overlay coverage | `tests/e2e/overlay.spec.js`, `tests/e2e/decode-roundtrip.spec.js` |
| Content type coverage | `tests/e2e/content-types.spec.js`, `tests/unit/schema-registry.spec.js` |
| Default-state guarantee | `tests/e2e/defaults.spec.js` |
| Error boundaries | `tests/e2e/errors.spec.js` |
| Interaction coverage | `tests/e2e/export.spec.js`, `tests/e2e/dialogs-a11y.spec.js` |
| Zero dependency proof | `tests/e2e/zero-dependency.spec.js` |
| Browser and viewport matrix | `tests/playwright.config.js` projects |

---

## 8. Ignored Paths

Added to `.gitignore` when the tooling is created:

```
node_modules/
tests/artifacts/
test-results/
playwright-report/
.venv/
__pycache__/
*.pyc
```
