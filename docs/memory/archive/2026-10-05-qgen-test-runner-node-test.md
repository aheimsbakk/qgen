---
topic: "QGen tests run on node:test with Playwright as a library"
importance: high
category: decision
tags: [testing, node-test, playwright, browser-matrix]
created: 2026-10-05T18:12:31Z
model: kompis/qwen3.8-flash-next-iq3_xxs
---

No Playwright Test config exists. `tests/helpers/browser-matrix.js` drives
Firefox and WebKit contexts directly, and `QGEN_MATRIX=webkit-mobile` narrows a
run to one entry. Commands run from `tests/`: `node --test "unit/**/*.test.js"`
and `node --test "e2e/**/*.test.js"`, with
`PLAYWRIGHT_BROWSERS_PATH=/home/opencode/.cache/ms-playwright` for the browser
suites. The zero-dependency guarantee is proven by a static scan in
`tests/unit/dependency-free.test.js`, not by a network listener, because the app
contains no request code to intercept.
