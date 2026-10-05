---
topic: "Range slider step must match the blueprint state tree"
importance: medium
category: warning
tags: [qgen, range-input, html, blueprint-drift]
created: 2026-10-05T21:20:10Z
model: kompis/qwen3.8-flash-next-iq3_s
---

A browser snaps a range input's value to its `step` grid before any handler
sees it, so a wrong `step` silently blocks the granularity `BLUEPRINT.md` §4.2
declares. Nothing in the app enforces a step: `clampNumber` in
`src/js/core/state-rules.js` only clamps to min and max. Two sliders shipped a
coarser grid than the blueprint stated and were corrected to 0.01 for
`size_ratio` and 0.1 for `dot_scale`. When a slider changes, compare `min`,
`max`, and `step` in `src/index.html` against §4.2 and `NUMBER_LIMITS`; three
places describe the same setting and no single source holds them.
