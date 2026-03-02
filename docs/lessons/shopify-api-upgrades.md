---
topic: Shopify API Upgrades
tags: [shopify, graphql, api-version, migrations, deprecations]
---

# Shopify API Upgrades

## String literal API version avoids major dependency upgrades
<!-- issue: #18 | pr: #27 -->
- `shopifyApp({ apiVersion })` accepts a plain string. No need to upgrade `@shopify/shopify-api` just to get a new `ApiVersion` enum value.
- Pass `"2026-01"` directly instead of `ApiVersion.January26`. Avoids cascading dep upgrades (shopify-api v11->v12, shopify-app-remix v3->v4).
- When Shopify deprecates a field, check the new field's shape before planning -- `returnReasonDefinition` is an object (`{ handle, name }`), not an enum. This changes the mapping strategy entirely.
- For handle-based mappings, default unknown values to a safe fallback ("Other"). New handles Shopify adds will degrade gracefully.
