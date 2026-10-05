---
topic: "Whole-pixel module edges keep generated codes scannable"
importance: high
category: pattern
tags: [rendering, canvas, qr-code, scanning]
created: 2026-10-05T18:12:31Z
model: kompis/qwen3.8-flash-next-iq3_xxs
---

Fractional module edges in `src/js/render/surface.js` produced anti-aliased
module borders that OpenCV could not decode. `layoutFor` now returns integer
edges and spans per module, and `paintSymbol` draws whole-pixel rectangles. Keep
this rule for every size path, including the 1024 px export render.
