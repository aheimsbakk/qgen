# QGen — System Blueprint

Version: 0.1 (specification draft)
Scope: single-page web application that generates QR code images locally in a
browser.

This document is language-agnostic. It defines goals, components, data flow,
state, contracts, and error boundaries. Concrete files, languages, frameworks,
and dependency choices are recorded in `CODEBASE.md`.

---

## 1. System Goals

1. Generate a scannable QR code image from structured user input.
2. Deliver the whole app as static page assets with **zero third-party runtime
   dependencies**: no CDN, no remote API, no package fetched at run time, no
   network request while the app runs.
3. Run from the local file system or from static hosting, with no build step
   required to produce the delivered artifact.
4. Support Firefox and WebKit, desktop and mobile viewports.
5. Replace a working proof of concept with a production build: same features,
   cleaner internals, accessible interface, clear errors.
6. Keep v0.1 stateless. Nothing persists between visits.

### Product identity

- Name: **QGen**.
- About text: created by Arnulf Heimsbakk, link `https://sanntid.org`.

### Non-goals for v0.1

- Reading or scanning QR codes.
- Persistence, accounts, or sharing.
- Export formats other than PNG.
- QR Micro, QR Model 1, or splitting content across several symbols.
- Languages other than English.
- Batch generation or print layout.

---

## 2. Component Hierarchy

Each component belongs to exactly one layer. No component mixes layers.

### 2.1 Presentation layer

| Component | Responsibility |
|---|---|
| App shell | Page structure, header, two-pane layout, mobile tab bar. |
| Content panel | Renders the dynamic field form for the selected content type. |
| Style panel | Shape, dot size, colours, eye-colour inheritance. |
| Overlay panel | Overlay kind, overlay content input, overlay colours, overlay size. |
| Preview panel | Image surface plus empty, invalid, and error states. |
| Export bar | Export size control, save action, copy action. |
| Menu and About dialog | Header menu, dropdown, modal dialog. |
| Feedback surface | Toast area. |
| Field error surface | Inline error text bound to each field. |

### 2.2 Input layer

| Component | Responsibility |
|---|---|
| Control bindings | Translate control events into state commands. No rules. |
| Dialog controller | Open/close menu and modal, close on Escape or backdrop click. |
| View switcher | Mobile settings/preview tab selection. |

### 2.3 Business logic layer

| Component | Responsibility |
|---|---|
| State store | Sole owner of application state. Validates every write. Notifies subscribers. |
| Schema registry | Declares content types: field specs, defaults, validation rules, payload builders. |
| Render pipeline | Ordered pipeline: validate, build payload, encode, style, rasterise. Debounced. |
| Export service | Produces the final image at the requested size and hands it to file or clipboard. |

### 2.4 QR symbol engine (pure computation, no user interface, no I/O)

| Stage | Responsibility |
|---|---|
| Mode selector | Choose numeric, alphanumeric, or byte encoding per content analysis. |
| Version selector | Pick the smallest symbol version that fits the data at the required error level. |
| Bit stream builder | Assemble mode indicators, character counts, data, terminator, padding. |
| Error correction coder | Split data into blocks and compute error correction codewords. |
| Matrix constructor | Place finder patterns, separators, timing patterns, alignment patterns, format and version information, and data bits. |
| Mask evaluator | Build all eight mask candidates, score them with the standard penalty rules, select the lowest penalty. |
| Symbol output | Expose the module grid, size, version, error level, and mask index. |

### 2.5 Rendering layer

| Component | Responsibility |
|---|---|
| Module painter | Draw dark modules in the selected shape, with finder patterns treated separately. |
| Colour mapper | Map foreground, background, and eye colours onto the surface. |
| Overlay compositor | Draw the backing plate, emoji text, or uploaded image at the centre. |
| Surface adapter | Produce the preview surface and an offscreen surface for export. |

### 2.6 Verification tooling (outside the delivered artifact)

| Component | Responsibility |
|---|---|
| End-to-end suite | Drive a real browser through user journeys. |
| Symbol unit suite | Verify encoder output against reference vectors. |
| Decode verifier | Read exported PNG files with an independent decoder and compare the payload. |
| Dependency guard | Fail the run if the page issues any network request. |
| Test fixture server | Serve `src/` over HTTP for the browser tests. |

---

## 3. Data Flow

### 3.1 Main pipeline

1. A control event produces a state command.
2. The state store validates the command, clamps values, and stores it.
3. The store notifies subscribers.
4. The subscriber updates visible controls and schedules a debounced render.
5. The render pipeline validates the current field values.
6. On validation failure the pipeline stops and reports per-field errors.
7. On success the pipeline builds the payload string.
8. The symbol engine encodes the payload into a module grid.
9. The rendering layer paints the grid with the current style.
10. The pipeline stores the payload as the last valid result.
11. Export re-encodes the last valid payload at the requested pixel size.

### 3.2 Ordering guarantee

Each render attempt carries a sequence number. A completed render with an older
sequence number must be discarded. This prevents a slow render from overwriting
a newer one when the user types quickly.

### 3.3 Debounce rule

Field and style changes restart a short timer, then run one render. Export
actions bypass the timer and render immediately.

---

## 4. State Management

### 4.1 Ownership

One module owns application state. Every write passes through its commands.
Other components read through its interface and never mutate state directly.

### 4.2 State tree

```
app_state
  schema_type            enum: url | text | wifi | contact | email | phone | sms | geo
  fields                 map<string, string | boolean>      per content type
  style
    module_shape         enum: square | rounded | dots | v_bars | h_bars
    dot_scale            number 0.10 .. 1.00, step 0.10     default 1.00
    color_fg             hex color                          default #000000
    color_bg             hex color                          default #FFFFFF
    color_eye            hex color                          default #000000
    inherit_fg           boolean                            default true
    overlay
      kind               enum: none | emoji | image        default none
      content            string | image handle | null      default null
      color_bg           hex color                          default #FFFFFF
      color_fg           hex color                          default #000000
      transparent_bg     boolean                            default false
      size_ratio         number 0.10 .. 0.35, step 0.01     default 0.20
  export
    pixel_size           integer 256 .. 2048                default 1024
    last_valid_payload   string | null                      default null
  ui
    mobile_view          enum: settings | preview           default settings
    menu_open            boolean                            default false
    about_open           boolean                            default false
    preview_status       enum: ready | empty | invalid | error
```

### 4.3 Validation rules on writes

- Numbers outside range are clamped to the nearest bound.
- Colour values must be six-digit hexadecimal. Reject anything else and report it.
- Enum values must exist in the declared set. Reject anything else and report it.
- Overlay content is cleared when the overlay kind changes.
- Eye colour is ignored while inherit foreground colour is true.

### 4.4 Persistence

None. No cookies, no local storage, no session storage, no IndexedDB, no service
worker, no analytics, no remote logging. Uploaded overlay images stay in memory
for the current page session and are never transmitted.

---

## 5. Content Types and Payload Contracts

The schema registry holds exactly these eight content types. Payload text is
built by the registry and passed unchanged to the symbol engine.

| id | Label | Fields (required marked *) | Payload format |
|---|---|---|---|
| url | Website (URL) | url* | The value as typed. |
| text | Plain Text | text* | The value as typed. |
| wifi | Wi-Fi Network | ssid*, password, auth* (WPA/WEP/nopass), hidden | `WIFI:T:<auth>;S:<ssid>;[P:<password>;][H:true;];` |
| contact | Contact (vCard) | fn, tel, email, org (at least one of fn/tel/email) | vCard 3.0 lines: `BEGIN:VCARD`, `VERSION:3.0`, present fields, `END:VCARD` |
| email | Email | addr*, sub, body | `mailto:<addr>[?subject=…&body=…]`, parameter values percent-encoded |
| phone | Phone Number | tel* | `tel:<tel>` |
| sms | SMS | tel*, msg | `SMSTO:<tel>:<msg>` |
| geo | Geo Location | lat*, lon* | `geo:<lat>,<lon>` |

### 5.1 Field validation rules

| Rule | Behaviour |
|---|---|
| Required field empty | Field error, preview marked invalid. |
| Contact with no name, phone, or email | Error on the name field. |
| Latitude outside −90..90 | Field error. |
| Longitude outside −180..180 | Field error. |
| Wi-Fi password with `nopass` | Password omitted from the payload. |
| Wi-Fi escaping | `\`, `;`, `,`, `"`, `:` are backslash-escaped in SSID and password. |

### 5.2 Defaults rule (always a valid code)

Every content type ships default values for all its required fields. The app
starts with a valid, scannable code. Switching content type immediately fills
that type's defaults, so the preview never goes blank because of a switch. The
empty preview state is only reachable when a user clears a required field.

---

## 6. QR Symbol Contract

### 6.1 Standard and coverage

- QR Code Model 2, following ISO/IEC 18001:2015.
- Versions 1 through 40, auto-selected.
- Error correction levels L, M, Q, H.
- Encoding modes: numeric, alphanumeric, byte. The engine selects the mode that
  produces the fewest bits. Byte mode carries UTF-8 text.
- All eight masks evaluated with the four standard penalty rules.
- Quiet zone of 4 light modules on all four sides.

### 6.2 Error level policy

- No overlay: level M.
- Overlay active: level H, because the overlay removes modules the code needs to
  recover from.
- The app reports the level it used.

### 6.3 Capacity limit

The standard fixes the maximum. A single version 40 symbol carries at most:

| Mode | Maximum payload at level L | Maximum payload at level H |
|---|---|---|
| Numeric | 7089 characters | 3057 characters |
| Alphanumeric | 4296 characters | 1852 characters |
| Byte (UTF-8) | 2953 bytes | 1273 bytes |

The limit cannot be extended inside one QR code. Larger content requires either
a lower error correction level, several separate codes, or a different symbology.
Multi-code output is out of scope for v0.1.

The app must show the effective limit for the current level, count the current
payload, and refuse to encode when the payload exceeds it.

---

## 7. Rendering and Style Contract

- Preview renders at a fixed resolution for speed. Export renders at the size the
  user requested.
- Shape rules:
  - square: full module.
  - rounded: module with rounded corners, smaller radius on finder patterns.
  - dots: circle scaled by dot size.
  - vertical bars: full height, width scaled by dot size.
  - horizontal bars: full width, height scaled by dot size.
- Finder patterns are always drawn as recognizable 7×7 blocks. Bars never break
  them apart. Rounded and dot shapes keep them readable.
- Eye colour applies only to finder patterns and only when inherit foreground is
  off.
- Overlay rules:
  - Size is a ratio of the full image side.
  - Backing plate adds a small padding and rounded corners unless transparent.
  - Emoji or text uses the overlay text colour.
  - Uploaded images keep their aspect ratio inside the overlay box.
  - Text colour control is hidden for image overlays.
- Dot size control appears only for dots, vertical bars, and horizontal bars.

---

## 8. Export Contract

- Format: PNG only.
- Two outputs: save to a file, or copy the image to the system clipboard.
- File name pattern: `<content-type>-qr.png`.
- Export size range 256 to 2048 pixels, clamped.
- Export uses the last valid payload, so an invalid edit in the form does not
  change what the user exports.
- Clipboard failure must produce a message that names the cause and the next step.

---

## 9. Error Boundaries

Every failure names the thing that failed, the reason, and the next action.
No silent failure. No empty catch.

| Failure | User-visible result |
|---|---|
| Required field missing | Inline error on that field, preview dimmed, last valid image kept. |
| Out-of-range number | Inline error on that field. |
| Payload over capacity | Preview error state with the limit for the current error level. |
| Uploaded image cannot be read | Error toast, overlay unchanged. |
| Clipboard unavailable or denied | Error toast naming the cause. |
| No valid payload to export | Error toast telling the user to fill the fields first. |
| Encoding failure | Preview error state, previous valid image kept for export. |

The app must never crash into a broken page. A fault in one stage stops that
stage and reports it.

---

## 10. Accessibility Contract

- Every control reachable and operable by keyboard.
- Escape closes the menu and the About dialog.
- Focus is trapped inside an open modal and returned to its trigger on close.
- Visible focus indicator on every interactive control.
- Every field has a label. Error text is programmatically linked to its field.
- Toast messages are announced to assistive technology.
- Menu and dialog expose open and closed state to assistive technology.
- Touch targets at least 44 by 44 pixels.
- Respect the user's reduced-motion preference and skip animations.
- Text contrast stays readable at the default colours.

---

## 11. Responsive Contract

- At or above 768 pixels: settings pane and preview pane side by side.
- Below 768 pixels: one pane at a time, switched by a tab bar with Settings and
  Preview & Export.
- Layout stays usable at small phone widths and at large desktop widths.

---

## 12. External Interfaces

- Runtime services: none. The app makes no network request.
- Authentication: none.
- Environment configuration for the delivered app: none.
- Hardware: none required. Camera and network access are not used.
- File system: read-only access to the page assets. Download writes one PNG
  through the browser's normal download path.
- Clipboard: browser clipboard image write, optional and failure-tolerant.

---

## 13. Verification Architecture

Test tooling lives outside the delivered app and is never shipped to users.
Concrete tools are recorded in `CODEBASE.md`.

### 13.1 Requirements

1. **Symbol correctness.** Encoder output is compared with published reference
   vectors and with expected module grids for known payloads.
2. **Independent decode round-trip.** Exported PNG files are decoded by a tool
   that shares no code with the app. The decoded payload must equal the payload
   the app intended.
3. **Shape coverage.** Decode round-trip runs for all five shapes at dot size
   1.0. Other dot sizes are checked for correct drawing only, not for decoding.
4. **Overlay coverage.** Decode round-trip runs with no overlay and with
   overlays at the smallest, default, and largest size.
5. **Content coverage.** All eight content types, including escaped Wi-Fi values
   and long payloads that force large versions.
6. **Default-state guarantee.** On load and after every content-type switch the
   page shows a valid, decodable code with no user action.
7. **Error boundaries.** Missing required fields, out-of-range coordinates, and
   oversized payloads each produce the specified message and preview state.
8. **Interaction coverage.** Menu, About dialog, modal close by Escape and by
   backdrop click, mobile tab switching, export size clamping, save, and copy.
9. **Zero dependency proof.** A test run records every network request the page
   makes. Any request to an outside host fails the suite.
10. **Browser matrix.** Firefox desktop, Firefox at a phone viewport size,
    WebKit desktop, WebKit at a phone viewport size. Chromium is not part of the
    required matrix.

### 13.2 Isolation rules

- Test dependencies stay in their own isolated environment.
- The app folder contains no test-only file.
- Test output artifacts are excluded from version control.
- The decoder tool must not import or link to app code.

---

## 14. Traceability

| Capability | Owning component |
|---|---|
| Eight content types | Schema registry |
| Live preview | Render pipeline + rendering layer |
| Shape and colour styling | Rendering layer |
| Center overlay | Overlay compositor + error level policy |
| Save PNG and copy | Export service |
| Always valid defaults | Schema registry defaults + state store |
| Clear errors | Error boundaries + feedback surface |
| Mobile and desktop layout | App shell + view switcher |
| Accessibility | Presentation layer + dialog controller |
| Encoder correctness | QR symbol engine + verification tooling |
