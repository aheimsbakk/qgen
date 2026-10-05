---
topic: "Range slider step must match the blueprint state tree"
importance: medium
category: warning
tags: [qgen, range-input, html, blueprint-drift]
created: 2026-10-05T21:07:52Z
model: kompis/qwen3.8-flash-next-iq3_s
---

A browser snaps a range input's value to its `step` grid, so a wrong `step`
silently blocks the granularity `BLUEPRINT.md` §4.2 declares. The Centre size
slider shipped `step="0.05"` against a declared 0.01 and was fixed in 0.4.0.
`#dotScaleInput` still carries `step="0.05"` while §4.2 declares 0.10; the
mismatch is unresolved and needs a decision about which side to change.
