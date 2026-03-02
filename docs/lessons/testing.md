---
topic: Testing
tags: [testing, integration, vitest, patterns]
---

# Testing

## Simulate loader logic instead of mocking Remix requests
<!-- issue: #13 | pr: #26 -->
- For server-side route logic, extract the decision path into a test helper that calls the same model functions -- don't mock Remix `Request`/`authenticate`.
- Pattern established in `webhooks.test.js`, reused in `sync-loader-poll.test.js`. Keep using it.
- Mock at the boundary (Shopify `admin.graphql`), test real DB operations and real model functions.

## Pre-existing test failures block pipeline velocity
<!-- issue: #13 | pr: #26 -->
- Polaris Web Components migration (PR #18) broke 3 component test suites. These didn't block #13 (isolated test file) but will block any PR touching UI components.
- Flaky unique constraint test exists -- intermittent failure on `Shop.create` in parallel test runs.
- Resolve broken suites before starting the next feature pipeline run. Don't let test debt compound.
