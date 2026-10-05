---
topic: "QGen v0.1 core architecture decisions"
importance: high
category: decision
tags: [qgen, qr-code, dependencies, architecture]
created: 2026-10-05T16:26:51Z
model: kompis/qwen3.8-flash-next-iq3_xxs
---

The QR encoder is written from scratch in the app; no third-party runtime code
or CDN is allowed, which also rules out Tailwind and qrcode-generator used by
the POC. Production files live in `src/` with `src/index.html` as the landing
page, and tests live in `tests/`. v0.1 persists nothing: no cookies, no local
storage, no IndexedDB. Export is PNG only, to file or clipboard. QR capacity
cannot exceed ISO/IEC 18001:2015: 2953 bytes at level L, 1273 bytes at level H.
