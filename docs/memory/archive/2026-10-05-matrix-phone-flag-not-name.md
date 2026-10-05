---
topic: "Matrix phone checks need a flag, not a name suffix"
importance: medium
category: warning
tags: [testing, browser-matrix, footgun]
created: 2026-10-05T18:12:31Z
model: kompis/qwen3.8-flash-next-iq3_xxs
---

The WebKit phone entry is named `webkit-mobile`, so `name.endsWith('-phone')`
silently skipped phone-only steps and made a layout test look like a product bug.
`openMatrix` now returns a `phone` boolean on every session, and tests read that
flag instead of parsing entry names. Add new matrix entries with the flag set.
