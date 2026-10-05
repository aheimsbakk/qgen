---
topic: "QGen tests: WebKit and Firefox only"
importance: high
category: preference
tags: [testing, playwright, webkit, firefox]
created: 2026-10-05T16:26:51Z
model: kompis/qwen3.8-flash-next-iq3_xxs
---

User excluded Chromium from the required browser matrix. The matrix is Firefox
desktop, Firefox resized to a phone viewport (no Android Firefox profile exists),
WebKit desktop, and WebKit mobile. Decode round-trip tests run at dot size 1.0
only; other dot sizes are verified by drawing checks. Test dependencies stay in
`tests/` with their own manifest so `src/` stays dependency-free.
