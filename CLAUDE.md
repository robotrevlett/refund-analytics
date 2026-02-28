# CLAUDE.md — Refund & Return Analytics (Shopify App)

## Project Overview

Shopify app that shows merchants their real revenue after refunds. Built with Remix + Shopify CLI template, Polaris UI, Prisma ORM, GraphQL Admin API.

See `SPEC.md` for the full product spec.

## Commands

```bash
# Development
shopify app dev                    # Run locally with Cloudflare tunnel
npm run dev                        # Run Remix dev server only (no Shopify tunnel)

# Database
npx prisma migrate dev             # Run migrations
npx prisma generate                # Regenerate Prisma client after schema changes
npx prisma studio                  # Visual DB inspector

# Testing
npm test                           # Run all tests (vitest)
npx vitest run                     # Run once (CI mode)
npx vitest run tests/unit          # Unit tests only
npx vitest run tests/integration   # Integration tests only
npx vitest run --coverage          # With coverage report

# Test data
node tests/fixtures/generate.js    # Generate test fixtures
node tests/fixtures/seed.js        # Seed test DB with fixtures

# Shopify CLI
shopify app deploy                 # Push config (scopes, webhooks) to Shopify
shopify app generate extension     # Generate an app extension
```

## Architecture

### Directory Layout
```
app/
├── routes/           # Remix routes (file-based routing)
│   ├── app.jsx       # Layout wrapper (App Bridge + Polaris provider)
│   ├── app._index.jsx    # Dashboard page
│   ├── app.products.jsx  # Product breakdown page
│   ├── app.returns.jsx   # Return reason analytics page
│   ├── app.sync.jsx      # Data sync status + trigger
│   ├── app.settings.jsx  # App settings
│   ├── auth.$.jsx        # OAuth catch-all (required by Shopify)
│   └── webhooks.jsx      # Webhook handler (action-only route)
├── models/           # Data access layer (Prisma queries, sync logic)
├── components/       # Shared Polaris-based UI components (AppBanners, BetaBanner, ReviewPrompt, etc.)
├── shopify.server.js # Shopify app config, auth, session storage
└── db.server.js      # Prisma client singleton
```

### Key Patterns

**Route loaders** fetch data, **route actions** handle mutations:
```js
export async function loader({ request }) {
  const { admin } = await authenticate.admin(request);
  // Use admin.graphql() for Shopify API calls
  // Use db for Prisma queries
  return json({ data });
}

export async function action({ request }) {
  const { admin } = await authenticate.admin(request);
  // Handle form submissions, sync triggers, etc.
  return json({ result });
}
```

**GraphQL calls** use the authenticated admin client:
```js
const response = await admin.graphql(`#graphql
  query { shop { name } }
`);
const { data } = await response.json();
```

**Webhook handling** uses authenticate.webhook:
```js
export async function action({ request }) {
  const { topic, shop, payload } = await authenticate.webhook(request);
  // topic is SCREAMING_SNAKE_CASE: "REFUNDS_CREATE", "APP_UNINSTALLED"
}
```

### Data Sync (Critical Constraint)

Shopify Bulk Operations API **cannot nest connections inside list fields**. `Order.refunds` is a list, so `refundLineItems` (a connection) can't be fetched in bulk.

**Three-phase sync**:
1. Bulk query: orders + refund summaries via JSONL
2. Paginated detail: for each refund, fetch line items individually (rate-limited, 4 concurrent)
3. Return reasons: for refunds linked to returns, fetch return line items with structured reasons

This is the core architectural constraint — do not try to fetch refundLineItems in a bulk operation.

### Beta Mode & Go-to-Market

The app supports a **beta mode** (`BETA_MODE=1` env var) for early tester outreach:
- Skips billing checks — all features free (planName defaults to "Pro")
- `BetaBanner` renders on all pages with a feedback survey link
- `ReviewPrompt` renders after 14 days of app usage (based on `Shop.installedAt`)
- ReviewPrompt shows max 3 times (tracked in localStorage), then hides permanently

**Key architectural note**: Banners render inside child routes via `<AppBanners />` component, NOT in the layout `app.jsx`. Shopify's `AppProvider` strips extra siblings of `<ui-nav-menu>` during client-side hydration. The outlet context passes `isBeta` and `installedAt` from the layout loader to child routes.

### Database

- **Prisma** with SQLite (dev) / PostgreSQL (prod)
- Schema at `prisma/schema.prisma`
- Key models: `Session`, `Shop`, `OrderRecord`, `RefundRecord`, `ReturnReasonRecord`
- `Shop.installedAt` tracks when the app was installed (used for ReviewPrompt timing)
- `RefundRecord.refundDate` = the refund's createdAt, NOT the order date. This is the app's core differentiator.
- `RefundRecord.lineItems` is a JSON string — parse with `JSON.parse()` when reading

## Shopify API Reference

### Scopes
- `read_orders` — covers orders, refunds, returns, transactions

### Key GraphQL Objects
- `Order.refunds` — list of Refund objects (id, createdAt, totalRefundedSet, note)
- `Refund.refundLineItems` — connection: which items, quantity, restockType, subtotal
- `Refund.orderAdjustments` — structured reason: restock, damage, customer, other
- `Refund.return` — linked Return record if refund came from a return
- `Return.returnLineItems` — items being returned with quantities
- `ReturnReasonDefinition` — new Jan 2026 API for structured return reasons

### Bulk Operations
```graphql
mutation { bulkOperationRunQuery(query: "{ orders { edges { node { ... } } } }") { ... } }
```
- Returns JSONL file with `__parentId` linking children to parents
- Poll via `node(id:)` query or subscribe via `bulk_operations/finish` webhook
- Max 5 concurrent bulk ops per shop

### Webhooks (configured in shopify.app.toml)
- `refunds/create` — new refund created
- `orders/updated` — order state changed (catches refund additions)
- `bulk_operations/finish` — async bulk query completed
- `app/uninstalled` — cleanup
- GDPR: `customers/data_request`, `customers/redact`, `shop/redact`

## Testing

### Unit & Integration (Vitest)
- **Vitest** with singleFork pool (SQLite locking), jsdom environment
- **MSW** for intercepting Shopify GraphQL calls
- SQLite test DB — `global.prismaClient` set in setup.js to share with model imports
- `tests/setup.js` mocks `window.matchMedia` (for Polaris) and `localStorage` (for jsdom)
- 67 tests across 9 files
- Run: `npm test`

### E2E (Playwright)
- **Playwright** with Chromium, testing all pages
- Mock auth via `E2E_TEST=1` env var (bypasses Shopify auth in shopify.server.js)
- Beta mode enabled via `BETA_MODE=1` in test server
- Seed script at `tests/e2e/seed.js` creates realistic test data
- 31 tests across 7 spec files (includes beta mode & review prompt tests)
- Run: `npm run test:e2e`

### Test Data
- Unit fixtures at `tests/fixtures/` — orders, refunds, returns, JSONL samples
- E2E seed at `tests/e2e/seed.js` — 20 orders, 8 refunds, 6 return reasons, shop installed 15 days ago
- Covers edge cases: partial refunds, multi-refunds, $0 restocks, multi-currency, refund date != order date

### Running Tests
Always run `npm test` after making changes. All tests must pass before committing.
Run `npm run test:e2e` for e2e tests (requires the test server or uses webServer config).

### Key Invariants to Assert
1. Net revenue = Gross sales - Total refunds (per date range)
2. Refunds are always grouped by refund date, never order date
3. Per-product refund sums equal total refunds
4. JSONL parser gracefully handles malformed/missing data
5. Webhook payloads correctly map to DB records

## Style Guide

- Use Polaris components for all UI — never raw HTML/CSS
- Use `#graphql` tagged template prefix for GraphQL queries (enables syntax highlighting)
- Server-only code in `.server.js` files (Remix convention)
- Keep route files focused on loader/action/component — extract logic to `models/`
- Use Prisma for all DB access — no raw SQL
- Format currency with `useCurrencyFormatter` hook (locale-aware)
- Dates: store as UTC, display in shop's timezone

## Documentation & Git Practices

- **Docs are first-class artifacts.** `SPEC.md`, `CLAUDE.md`, and plan files live in the repo and are always committed.
- **Keep docs up to date.** When code changes affect architecture, commands, API usage, or conventions, update the relevant doc in the same commit.
- **Docs should be robust yet concise.** Enough detail to act on, no filler. If a section grows stale, trim or rewrite it.
- **Commit plans.** Implementation plans go in `docs/plans/` and are committed before work begins. They serve as decision records.
- **Commit messages matter.** Every commit message explains *why*, not just *what*. Use the body for context when the change isn't obvious.
- **Atomic commits.** Each commit should be a coherent, self-contained change. Don't bundle unrelated work.
- **Never commit without testing.** Run `npm test` before every commit. If tests don't exist yet for the code being changed, write them first.

## Don'ts

- Don't use REST Admin API — it's deprecated (Oct 2024)
- Don't try to fetch refundLineItems in bulk operations (API limitation)
- Don't show refunds by order date — always use refund date
- Don't store sensitive data (access tokens are in Session model, managed by Shopify library)
- Don't skip GDPR webhook handlers — required for app store approval
- Don't use `@shopify/polaris` v11 patterns — we're on v12+ (BlockStack, not Stack)
- Don't render extra components as siblings of `<ui-nav-menu>` in `app.jsx` — Shopify AppProvider strips them during hydration. Use `<AppBanners />` inside child routes instead.
- Don't let docs drift from code — update docs in the same commit as the code change
