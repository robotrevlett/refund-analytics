# Stack Audit — February 2026

Assessment of our current stack against Shopify's latest best practices, with upgrade recommendations.

## Current Stack vs. Current Best Practice

| Area | Our Stack | Current Best Practice | Status |
|------|-----------|----------------------|--------|
| Framework | Remix + `@shopify/shopify-app-remix` v3 | React Router v7 + `@shopify/shopify-app-react-router` | **Behind** |
| UI | Polaris React v13 (`@shopify/polaris`) | Polaris Web Components (CDN) | **Behind** |
| API Version | GraphQL Admin API `2025-10` | `2026-01` (stable since Jan 2026) | **One behind** |
| App Bridge | CDN (via Shopify template) | CDN (unversioned) | OK |
| Database | PostgreSQL (Neon) + Prisma | PostgreSQL + Prisma | OK |
| Session Storage | `@shopify/shopify-app-session-storage-prisma` v5 | Same (v5.1.2 latest) | OK |
| Auth | Session token exchange | Session token exchange | OK |
| API Style | GraphQL only | GraphQL only (REST is legacy) | OK |
| GDPR Webhooks | Implemented | Required | OK |
| Billing | Beta mode (`BETA_MODE=1`) | Managed Pricing or Billing API | **For launch** |

## Priority 1: API Version → 2026-01

**Impact: HIGH — directly affects our core feature**

The `2026-01` API version introduces a **new Return Reason Definition type** that replaces the Return Reason enum with a richer data model. This directly impacts our return reason ingestion in Phase 3 of the sync.

Other `2026-01` changes:
- Advanced metafield querying (greater than, less than, prefix matching, boolean operators)
- Access to transactions on the Return object
- New `orders/link_requested` webhook topic
- Billing throttling with `throttled` error code
- `orderUpdate` mutation now includes `phone` field

Our `2025-10` version is supported until ~October 2026, so this isn't urgent, but the Return Reason Definition improvement is directly relevant.

**Action**: Test our sync against `2026-01`, update `RETURN_REASON_MAP` if the new Return Reason Definition type changes the enum values, update `shopify.app.toml`.

## Priority 2: Remix → React Router v7

**Impact: MEDIUM — maintenance mode, but works fine today**

Remix merged into React Router v7. Shopify has migrated:
- New template: [`shopify-app-template-react-router`](https://github.com/Shopify/shopify-app-template-react-router)
- New package: `@shopify/shopify-app-react-router` (replaces `@shopify/shopify-app-remix`)
- `@shopify/shopify-app-remix` is at v4.1.1 and in **maintenance mode** — no new features

Migration is straightforward ([guide](https://github.com/Shopify/shopify-app-template-react-router/wiki/Upgrading-from-Remix)):
1. Replace `@shopify/shopify-app-remix` → `@shopify/shopify-app-react-router`, update imports
2. Update Vite config: `remix vite:dev` → `react-router dev`
3. Update `tsconfig` for React Router types

**Key gotchas**:
- REST API support is **removed** in the React Router package (we only use GraphQL, so fine)
- Non-embedded apps are not supported (we're embedded, so fine)
- The React Router template uses Polaris Web Components (see next item)

**Action**: Plan migration. Can be done independently of Polaris migration — just swap the framework package first, keep Polaris React.

## Priority 3: Polaris React → Polaris Web Components

**Impact: MEDIUM — archived but functional**

The `@shopify/polaris` React package:
- Latest version: **13.9.5**
- Repository **archived January 6, 2026** — read-only, maintenance mode only
- No new features or components

The replacement is **Polaris Web Components**:
- GA since October 2025 (API version `2025-10`)
- Delivered via Shopify's CDN — auto-updates, smaller bundles
- Unified across Admin, Checkout, Customer Accounts, and POS
- Used by the new React Router template

Migration can be **gradual** — Web Components work alongside React code. But it's a significant effort since we use Polaris React throughout all routes and components.

**Action**: Not urgent for v1 launch. Plan for post-launch. When we do the React Router migration, consider migrating Polaris at the same time since the new template bundles both.

## Priority 4: Billing Setup (for launch)

**Impact: REQUIRED for App Store**

When exiting beta mode, we need to choose:

**Option A — Managed Pricing** (recommended for simplicity):
- Define plans in the Partner Dashboard, no billing API code needed
- Shopify handles plan selection UI, upgrades, downgrades
- Once opted in, cannot create charges via Billing API

**Option B — Billing API** (more control):
- Programmatic plan creation via `appSubscriptionCreate` mutation
- More flexibility for usage-based or custom pricing
- Note: billing attempts are now throttled in `2026-01` based on trust metrics

**Action**: Decide approach before App Store submission. Managed Pricing is simpler for our two-tier model (Starter/Pro).

## Not Urgent / Already Aligned

### Shopify CLI
Latest: **v3.91.0**. Notable recent additions:
- Dev Console shows all active dev previews
- `shopify app import-custom-data-definitions` for TOML-based metafield management
- Commands for executing queries and bulk operations

### App Bridge
CDN-based (unversioned) is current. Our app loads it via the Shopify template, so we're aligned. The npm `@shopify/app-bridge` package (v3.7.11) is in maintenance mode — don't add it as a dependency.

### Webhooks
No structural changes. New `orders/link_requested` topic in `2026-01` (not relevant to us). Stricter GDPR requirements effective August 2025 — we already comply.

### Session Storage
`@shopify/shopify-app-session-storage-prisma` v5.1.2 is current. We're on v5. No breaking changes.

### Performance Requirements (App Store / Built for Shopify)
- Response times: < 500ms for 95% of requests
- Lighthouse impact: < 10 points
- Built for Shopify (BFS) adds: LCP ≤ 2.5s, CLS ≤ 0.1, INP ≤ 200ms
- GraphQL-only requirement: compliant (since April 2025)

## Shopify Editions Highlights

### Summer '25 (Horizons)
- Local dev without tunnels (instant hot reload)
- Declarative custom data via TOML + CLI deploy
- Polaris Web Components went stable
- Dev MCP Server for AI-assisted development
- Built for Shopify program updates (simplified design requirements)

### Winter '26
- **Scripts → Functions migration deadline: June 30, 2026** (not relevant to us — we don't use Scripts)
- Token expiry and OAuth-compliant refresh
- Enhanced Dev Console
- Shop Minis SDK
- POS Extensions Storage API

## Recommended Upgrade Roadmap

### Before App Store Launch
1. ~~Decimal money math~~ (done — PR #17)
2. Set up billing (Managed Pricing)
3. Test against API version `2026-01` (Return Reason Definition changes)

### Post-Launch (v2 Planning)
4. Migrate Remix → React Router v7
5. Migrate Polaris React → Polaris Web Components
6. Upgrade API version to `2026-01` or `2026-04`

### Sources
- [Shopify Developer Changelog](https://shopify.dev/changelog)
- [React Router template](https://github.com/Shopify/shopify-app-template-react-router)
- [React Router migration guide](https://github.com/Shopify/shopify-app-template-react-router/wiki/Upgrading-from-Remix)
- [Polaris Web Components announcement](https://www.shopify.com/partners/blog/polaris-goes-stable-the-future-of-shopify-app-development-is-here)
- [API versioning](https://shopify.dev/docs/api/usage/versioning)
- [2026-01 release notes](https://shopify.dev/docs/api/release-notes/2026-01)
- [Built for Shopify requirements](https://shopify.dev/docs/apps/launch/built-for-shopify/requirements)
- [Managed Pricing docs](https://shopify.dev/docs/apps/launch/billing/managed-pricing)
- [Summer '25 Edition](https://www.shopify.com/news/summer-25-edition-dev)
- [Winter '26 Edition](https://www.shopify.com/news/winter-26-edition-dev)
