---
topic: "Render pipeline runs one attempt at a time, no sequence guard"
importance: medium
category: decision
tags: [qgen, render-pipeline, ordering, synchronous]
created: 2026-10-05T21:07:52Z
model: kompis/qwen3.8-flash-next-iq3_s
---

Encoding and painting are synchronous, so `renderNow()` cannot be overtaken by
a newer attempt. The sequence-number guard, `lastResult`, and `lastSymbol` were
removed from `src/js/core/render-pipeline.js` as code that could never run. If
encode or paint ever becomes asynchronous, add an ordering guard back and
update `BLUEPRINT.md` §3.2 in the same change.
`tests/unit/render-pipeline.test.js` pins the one-result-per-attempt order.
