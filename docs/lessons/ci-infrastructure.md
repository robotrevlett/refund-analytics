---
topic: CI Infrastructure
tags: [ci, github-actions, eslint, lint, build, workflow]
---

# CI Infrastructure

## Fill gaps in existing CI rather than rebuilding
<!-- issue: #28 | pr: #30 -->
- Before planning "add CI," check if a workflow already exists. The real task was adding lint + build steps, not creating a workflow from scratch.
- ESLint config was missing despite `@remix-run/eslint-config` being installed. Adding `.eslintrc.cjs` (CJS for `"type": "module"` projects) unlocked the existing `npm run lint` script.
- `SHOPIFY_API_KEY=ci-placeholder` is needed for `remix vite:build` in CI -- `shopify.server.js` reads it at build time.
- CI running on its own PR is the gold standard for self-validation. Always structure CI PRs to prove themselves.
