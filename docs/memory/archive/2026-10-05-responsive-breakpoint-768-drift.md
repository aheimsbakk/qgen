---
topic: "Responsive breakpoint is 768 px and duplicated in two stylesheets"
importance: medium
category: warning
tags: [responsive, css, breakpoint, drift]
created: 2026-10-05T18:36:39Z
model: kompis/qwen3.8-flash-next-iq3_xxs
---

`BLUEPRINT.md` fixes the pane switch at 768 px, but the shipped CSS used 720 px
until it was corrected. Plain CSS media queries cannot read a custom property,
so the value is written as a literal in `src/css/layout.css` and repeated in
`src/css/states.css`. Change all three occurrences together. `tests/e2e/responsive.test.js`
opens the page at 767 px and 768 px in Firefox and WebKit to catch drift.
