---
topic: "GitHub Pages deploy workflow replaces the no-CI rule"
importance: high
category: decision
tags: [ci-cd, github-pages, deployment, actions]
created: 2026-10-07T17:11:11Z
model: kompis/qwen3.8-flash-next-iq3_s
---

The user asked for a Pages publish workflow, overriding the earlier "no
`.github` workflows" rule; `AGENTS.md` now allows only
`.github/workflows/deploy-pages.yml`. It uploads `src/` directly because the
app has no build step, and pins actions to explicit semver tags
(checkout v7.0.1, upload-pages-artifact v5.0.0, deploy-pages v5.0.1).
Tests are not run in CI; run them locally before pushing. Repository setting:
Pages source must be "GitHub Actions".
